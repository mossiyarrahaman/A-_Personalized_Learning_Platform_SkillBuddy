/**
 * services/questionGenerationService.js
 *
 * Generates exam/practice questions from RAG-retrieved document context,
 * shaped by Bloom's Taxonomy cognitive levels.
 *
 * LLM: OpenRouter → Qwen 2.5 7B Instruct (free tier)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOM'S TAXONOMY — PEDAGOGICAL DESIGN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each Bloom's level doesn't just change difficulty — it fundamentally changes
 * WHAT the question asks the student to do:
 *
 *   REMEMBER    → "What is X?" / "List the..." / "Define..."
 *                 Tests: recall of facts, terms, definitions
 *                 Question style: direct, factual, single correct answer
 *
 *   UNDERSTAND  → "Explain why..." / "What is the difference between..."
 *                 Tests: comprehension, paraphrasing, comparing
 *                 Question style: requires rephrasing or summarizing
 *
 *   APPLY       → "Given this scenario, how would you use X to..."
 *                 Tests: using knowledge in new situations
 *                 Question style: scenario-based, problem-solving
 *
 *   ANALYZE     → "What pattern do you see in..." / "Break down..."
 *                 Tests: decomposition, finding relationships, evidence
 *                 Question style: multi-step reasoning, data interpretation
 *
 *   EVALUATE    → "Which approach is better and why?" / "Critique..."
 *                 Tests: judgment, justification, assessment
 *                 Question style: opinion with evidence, trade-off analysis
 *
 *   CREATE      → "Design a..." / "Propose a solution for..."
 *                 Tests: synthesis, original design, combining ideas
 *                 Question style: open-ended, requires novel combination
 *
 * The prompt templates below encode these distinctions explicitly because
 * a 7B model won't infer them from just the level name.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TWO GENERATION MODES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. generateQuestions()  → Teacher mode. Saves to DB. Supports all question
 *      types. Returns persisted GeneratedQuestion documents.
 *
 *   2. generatePracticeQuestions() → Student mode. Returns questions directly
 *      without exposing answers. Saves with origin='student' for analytics.
 *      MCQ-only for instant self-assessment.
 */

const axios = require('axios');
const crypto = require('crypto');
const { retrieveRelevantChunks, getCorpusStats } = require('./retrievalService');
const GeneratedQuestion = require('../models/GeneratedQuestion');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct';

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CALL
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(systemPrompt, userPrompt, maxTokens = 3000) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set in environment variables.');

    const response = await axios.post(
        OPENROUTER_URL,
        {
            model: OPENROUTER_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.3,
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
                'X-Title': 'SkillBuddy',
            },
            timeout: 120000,
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned empty response');

    if (response.data.choices[0].finish_reason === 'length') {
        console.warn('⚠️  LLM response truncated. Will attempt JSON recovery.');
    }

    return content.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON PARSING WITH AGGRESSIVE REPAIR
// ═══════════════════════════════════════════════════════════════════════════════

function parseJSONSafely(raw) {
    let cleaned = raw
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try { return JSON.parse(cleaned); } catch (_) { /* continue */ }

    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
        try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)); } catch (_) { /* continue */ }
    }

    if (arrStart !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace > arrStart) {
            const repaired = cleaned.slice(arrStart, lastBrace + 1) + ']';
            try {
                const result = JSON.parse(repaired);
                console.warn(`⚠️  Repaired truncated JSON — recovered ${result.length} items`);
                return result;
            } catch (_) { /* continue */ }
        }
    }

    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
        try { return [JSON.parse(cleaned.slice(objStart, objEnd + 1))]; } catch (_) { /* continue */ }
    }

    throw new Error(`Failed to parse JSON. Raw (first 500 chars): ${raw.slice(0, 500)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOOM'S TAXONOMY — COGNITIVE LEVEL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const BLOOM_DEFINITIONS = {
    remember: {
        label: 'Remember (Level 1 — Recall)',
        description: 'Test pure recall of facts, definitions, terms, dates, formulas, and lists from the source material.',
        verbs: 'define, list, name, identify, recall, state, match, label, recognize',
        style: 'Direct factual questions with one unambiguous correct answer. No interpretation needed.',
        exampleStem: '"What is the definition of ___?" / "Which of the following is ___?" / "List the three types of ___"',
    },
    understand: {
        label: 'Understand (Level 2 — Comprehension)',
        description: 'Test whether the student can explain concepts in their own words, summarize, compare, or interpret meaning.',
        verbs: 'explain, describe, summarize, paraphrase, compare, contrast, interpret, classify',
        style: 'Questions requiring rephrasing, summarization, or distinguishing between concepts. Not just recall.',
        exampleStem: '"Explain why ___" / "What is the difference between X and Y?" / "Which best summarizes ___?"',
    },
    apply: {
        label: 'Apply (Level 3 — Application)',
        description: 'Test whether the student can use learned knowledge to solve a new problem or handle an unfamiliar scenario.',
        verbs: 'apply, solve, use, demonstrate, calculate, implement, execute, predict',
        style: 'Scenario-based questions. Present a situation the student hasn\'t seen, and ask them to apply a concept.',
        exampleStem: '"Given this scenario, how would you ___?" / "A company needs to ___. Which approach would you use?"',
    },
    analyze: {
        label: 'Analyze (Level 4 — Analysis)',
        description: 'Test whether the student can break down information, identify patterns, relationships, causes, or evidence.',
        verbs: 'analyze, compare, differentiate, examine, categorize, deconstruct, identify causes, find evidence',
        style: 'Questions requiring multi-step reasoning. Ask WHY something works, HOW parts relate, or what evidence supports a claim.',
        exampleStem: '"What is the relationship between X and Y?" / "Analyze why ___ leads to ___" / "What evidence supports ___?"',
    },
    evaluate: {
        label: 'Evaluate (Level 5 — Evaluation)',
        description: 'Test whether the student can make judgments, critique approaches, justify decisions, and assess trade-offs.',
        verbs: 'evaluate, judge, justify, critique, assess, argue, defend, prioritize, recommend',
        style: 'Questions with multiple defensible answers but requiring justified reasoning. Ask for trade-off analysis.',
        exampleStem: '"Which approach is better for ___ and why?" / "Evaluate the strengths and weaknesses of ___" / "What are the trade-offs?"',
    },
    create: {
        label: 'Create (Level 6 — Synthesis)',
        description: 'Test whether the student can combine ideas to design something new, propose solutions, or hypothesize.',
        verbs: 'design, propose, construct, formulate, hypothesize, plan, compose, invent, combine',
        style: 'Open-ended questions requiring original thought. Ask the student to design, propose, or combine concepts.',
        exampleStem: '"Design a system that ___" / "Propose a solution for ___" / "How would you combine X and Y to achieve ___?"',
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an expert exam question generator for a university-level educational platform.
You specialize in creating questions aligned to Bloom's Taxonomy cognitive levels.

ABSOLUTE RULES:
- Generate questions STRICTLY from the provided source material. No outside knowledge.
- Every question must be answerable using ONLY the source text.
- Match the specified Bloom's Taxonomy level precisely — this is critical.
- Respond with ONLY a valid JSON array. No explanation, no markdown, no preamble.
- Ensure all JSON strings are properly escaped.`;

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildBloomContext(bloomLevel) {
    if (bloomLevel === 'mixed') {
        return `BLOOM'S LEVEL: Mixed — distribute questions across multiple cognitive levels.
For each question, pick the most appropriate level from: remember, understand, apply, analyze, evaluate, create.
Include the chosen level in the "bloomLevel" field of each question.`;
    }

    const bloom = BLOOM_DEFINITIONS[bloomLevel];
    if (!bloom) return `BLOOM'S LEVEL: understand (default)`;

    return `BLOOM'S TAXONOMY LEVEL: ${bloom.label}
WHAT THIS MEANS: ${bloom.description}
ACTION VERBS TO USE: ${bloom.verbs}
QUESTION STYLE: ${bloom.style}
EXAMPLE STEMS: ${bloom.exampleStem}

CRITICAL: Every question MUST target this cognitive level. Do NOT generate simple recall questions if the level is "analyze" or higher.`;
}

const PROMPT_BUILDERS = {
    mcq: (context, topic, count, difficulty, bloomLevel) => {
        const bloomContext = buildBloomContext(bloomLevel);
        return `TASK: Generate exactly ${count} Multiple Choice Questions.
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

${bloomContext}

SOURCE MATERIAL:
${context}

OUTPUT — respond with ONLY this JSON array:
[
  {
    "questionText": "Question aligned to the specified Bloom's level",
    "options": [
      {"label": "A", "text": "Option text", "isCorrect": false},
      {"label": "B", "text": "Option text", "isCorrect": true},
      {"label": "C", "text": "Option text", "isCorrect": false},
      {"label": "D", "text": "Option text", "isCorrect": false}
    ],
    "explanation": "Why the correct answer is right, referencing source material",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "bloomLevel": "${bloomLevel === 'mixed' ? 'understand' : bloomLevel}"
  }
]

RULES:
- Exactly ONE option with "isCorrect": true per question.
- All 4 distractors must be plausible, not obviously wrong.
- ${bloomLevel !== 'remember' && bloomLevel !== 'mixed' ? 'Questions must require more than simple recall. Follow the Bloom\'s level specification above.' : ''}
- Generate exactly ${count} questions.`;
    },

    true_false: (context, topic, count, difficulty, bloomLevel) => {
        const bloomContext = buildBloomContext(bloomLevel);
        return `TASK: Generate exactly ${count} True/False Questions.
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

${bloomContext}

SOURCE MATERIAL:
${context}

OUTPUT — respond with ONLY this JSON array:
[
  {
    "questionText": "A clear statement that is true or false",
    "correctAnswer": "True",
    "explanation": "Why this is true/false based on source material",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "bloomLevel": "${bloomLevel === 'mixed' ? 'understand' : bloomLevel}"
  }
]

RULES:
- Mix True and False answers roughly evenly.
- ${bloomLevel === 'analyze' || bloomLevel === 'evaluate' ? 'Statements should require reasoning to evaluate, not just fact recall.' : ''}
- Generate exactly ${count} questions.`;
    },

    short_answer: (context, topic, count, difficulty, bloomLevel) => {
        const bloomContext = buildBloomContext(bloomLevel);
        return `TASK: Generate exactly ${count} Short Answer Questions.
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

${bloomContext}

SOURCE MATERIAL:
${context}

OUTPUT — respond with ONLY this JSON array:
[
  {
    "questionText": "A question requiring a 1-3 sentence answer",
    "correctAnswer": "Model answer (2-3 sentences) based on source material",
    "explanation": "Key points the answer should cover",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "bloomLevel": "${bloomLevel === 'mixed' ? 'understand' : bloomLevel}"
  }
]

Generate exactly ${count} questions.`;
    },

    fill_in_blank: (context, topic, count, difficulty, bloomLevel) => {
        const bloomContext = buildBloomContext(bloomLevel);
        return `TASK: Generate exactly ${count} Fill in the Blank Questions.
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

${bloomContext}

SOURCE MATERIAL:
${context}

OUTPUT — respond with ONLY this JSON array:
[
  {
    "questionText": "A sentence with exactly one blank shown as ___",
    "correctAnswer": "The exact word or phrase that fills the blank",
    "explanation": "Brief context for the answer",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "bloomLevel": "${bloomLevel === 'mixed' ? 'remember' : bloomLevel}"
  }
]

RULES: The blank must replace a key term, not a trivial word. Generate exactly ${count} questions.`;
    },

    essay: (context, topic, count, difficulty, bloomLevel) => {
        const bloomContext = buildBloomContext(bloomLevel);
        return `TASK: Generate exactly ${count} Essay/Long Answer Questions.
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

${bloomContext}

SOURCE MATERIAL:
${context}

OUTPUT — respond with ONLY this JSON array:
[
  {
    "questionText": "An open-ended question requiring detailed analysis",
    "correctAnswer": "Model answer outline covering 3-5 key points",
    "explanation": "Grading rubric: what a strong answer should include",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "bloomLevel": "${bloomLevel === 'mixed' ? 'evaluate' : bloomLevel}"
  }
]

Generate exactly ${count} questions.`;
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_BLOOM_LEVELS = new Set(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);

function validateQuestion(q, questionType, fallbackBloomLevel) {
    if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.length < 10) {
        return null;
    }

    const base = {
        questionText: q.questionText.trim(),
        explanation: (q.explanation || '').trim(),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        bloomLevel: VALID_BLOOM_LEVELS.has(q.bloomLevel) ? q.bloomLevel : fallbackBloomLevel,
    };

    if (questionType === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) return null;

        const correctCount = q.options.filter(o => o.isCorrect === true).length;
        if (correctCount !== 1) {
            if (q.correctAnswer) {
                q.options.forEach(o => {
                    o.isCorrect = (o.text === q.correctAnswer || o.label === q.correctAnswer);
                });
            } else {
                q.options.forEach((o, i) => { o.isCorrect = (i === 0); });
            }
        }

        base.options = q.options.map((o, i) => ({
            label: o.label || ['A', 'B', 'C', 'D'][i] || String.fromCharCode(65 + i),
            text: (o.text || '').trim(),
            isCorrect: o.isCorrect === true,
        }));
        base.correctAnswer = base.options.find(o => o.isCorrect)?.text || '';
    } else {
        base.correctAnswer = (q.correctAnswer || '').trim();
        if (!base.correctAnswer) return null;
    }

    return base;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED: Retrieve context for a course + topic
// ═══════════════════════════════════════════════════════════════════════════════

async function getContextForCourse(courseId, topic) {
    const stats = await getCorpusStats(courseId);
    if (stats.totalChunks === 0) {
        throw new Error(
            'No course material found. Please upload at least one PDF, DOCX, or PPTX file ' +
            'and run ingestion before generating questions.'
        );
    }

    console.log(`📚 Course has ${stats.totalChunks} chunks across ${stats.totalFiles} files`);

    const chunks = await retrieveRelevantChunks({ query: topic, courseId, topK: 12 });

    if (chunks.length === 0) {
        throw new Error('Could not retrieve relevant content for the given topic.');
    }

    const context = chunks
        .map((c, i) => `[Source: ${c.source}, Excerpt ${i + 1}]\n${c.text}`)
        .join('\n\n---\n\n');

    console.log(`📖 Retrieved ${chunks.length} chunks (${context.split(/\s+/).length} words) for topic: "${topic}"`);
    return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 1: TEACHER GENERATION — saves to question bank
// ═══════════════════════════════════════════════════════════════════════════════

async function generateQuestions({
    courseId,
    createdBy,
    topic = 'all topics covered in this course',
    questionTypes = ['mcq', 'short_answer', 'true_false'],
    countPerType = 3,
    difficulty = 'mixed',
    bloomLevel = 'understand',
}) {
    const context = await getContextForCourse(courseId, topic);

    const allSaved = [];
    const errors = [];

    for (const qType of questionTypes) {
        const promptBuilder = PROMPT_BUILDERS[qType];
        if (!promptBuilder) {
            console.warn(`⚠️  Unknown question type: "${qType}" — skipping`);
            continue;
        }

        console.log(`\n🧠 Generating ${countPerType} ${qType} questions [Bloom's: ${bloomLevel}]...`);

        try {
            const userPrompt = promptBuilder(context, topic, countPerType, difficulty, bloomLevel);
            const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
            const parsed = parseJSONSafely(raw);

            if (!Array.isArray(parsed)) throw new Error(`Expected array, got ${typeof parsed}`);

            let savedCount = 0;
            for (const q of parsed) {
                const validated = validateQuestion(q, qType, bloomLevel === 'mixed' ? 'understand' : bloomLevel);
                if (!validated) continue;

                try {
                    const saved = await GeneratedQuestion.create({
                        courseId,
                        createdBy,
                        topic,
                        questionType: qType,
                        questionText: validated.questionText,
                        options: validated.options || [],
                        correctAnswer: validated.correctAnswer || '',
                        explanation: validated.explanation || '',
                        difficulty: validated.difficulty,
                        bloomLevel: validated.bloomLevel,
                        origin: 'teacher',
                        approved: false,
                    });
                    allSaved.push(saved);
                    savedCount++;
                } catch (dbErr) {
                    console.error(`  ❌ DB save failed: ${dbErr.message}`);
                }
            }

            console.log(`  ✅ Saved ${savedCount}/${parsed.length} ${qType} questions`);

        } catch (err) {
            const errorMsg = `Failed to generate ${qType}: ${err.message}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    if (allSaved.length === 0 && errors.length > 0) {
        throw new Error(
            `All generation attempts failed.\n${errors.join('\n')}\n\n` +
            'Try again shortly or upload more detailed course material.'
        );
    }

    console.log(`\n✅ Teacher generation complete: ${allSaved.length} questions saved`);
    return allSaved;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 2: STUDENT PRACTICE — ephemeral, MCQ-only, answers hidden
// ═══════════════════════════════════════════════════════════════════════════════

async function generatePracticeQuestions({
    courseId,
    studentId,
    topic = 'all topics covered in this course',
    bloomLevel = 'understand',
    count = 5,
    difficulty = 'mixed',
}) {
    const cappedCount = Math.min(Math.max(Number(count) || 5, 1), 10);
    const context = await getContextForCourse(courseId, topic);
    const sessionId = `practice_${studentId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    console.log(`\n🎓 Student practice: ${cappedCount} MCQ [Bloom's: ${bloomLevel}] (session: ${sessionId})`);

    const userPrompt = PROMPT_BUILDERS.mcq(context, topic, cappedCount, difficulty, bloomLevel);
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSONSafely(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Failed to generate practice questions. Please try again.');
    }

    const questions = [];
    for (const q of parsed) {
        const validated = validateQuestion(q, 'mcq', bloomLevel === 'mixed' ? 'understand' : bloomLevel);
        if (!validated) continue;

        try {
            const saved = await GeneratedQuestion.create({
                courseId,
                createdBy: studentId,
                topic,
                questionType: 'mcq',
                questionText: validated.questionText,
                options: validated.options,
                correctAnswer: validated.correctAnswer,
                explanation: validated.explanation,
                difficulty: validated.difficulty,
                bloomLevel: validated.bloomLevel,
                origin: 'student',
                sessionId,
                approved: false,
            });

            // Return questions WITHOUT correct answers — student shouldn't see them yet
            questions.push({
                _id: saved._id,
                questionText: validated.questionText,
                options: validated.options.map(o => ({ label: o.label, text: o.text })),
                difficulty: validated.difficulty,
                bloomLevel: validated.bloomLevel,
            });
        } catch (dbErr) {
            console.error(`  ❌ DB save failed: ${dbErr.message}`);
        }
    }

    if (questions.length === 0) {
        throw new Error('Generated questions failed validation. Try a different topic.');
    }

    console.log(`  ✅ Practice session ready: ${questions.length} questions`);

    return {
        sessionId,
        bloomLevel,
        topic,
        questionCount: questions.length,
        questions,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT PRACTICE SESSION — score + per-Bloom breakdown
// ═══════════════════════════════════════════════════════════════════════════════

async function submitPracticeSession({ sessionId, studentId, answers }) {
    const questions = await GeneratedQuestion.find({
        sessionId,
        createdBy: studentId,
        origin: 'student',
    }).lean();

    if (questions.length === 0) {
        throw new Error('Practice session not found or expired.');
    }

    let correct = 0;
    const results = [];

    for (const q of questions) {
        const answer = answers.find(a => a.questionId === q._id.toString());
        const selectedLabel = answer?.selectedLabel || null;
        const correctOption = q.options.find(o => o.isCorrect);
        const isCorrect = selectedLabel === correctOption?.label;
        if (isCorrect) correct++;

        results.push({
            questionId: q._id,
            questionText: q.questionText,
            selectedLabel,
            correctLabel: correctOption?.label,
            correctText: correctOption?.text,
            isCorrect,
            explanation: q.explanation,
            bloomLevel: q.bloomLevel,
        });
    }

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    // Per-Bloom performance breakdown
    const bloomBreakdown = {};
    for (const r of results) {
        const bl = r.bloomLevel || 'unknown';
        if (!bloomBreakdown[bl]) bloomBreakdown[bl] = { correct: 0, total: 0 };
        bloomBreakdown[bl].total++;
        if (r.isCorrect) bloomBreakdown[bl].correct++;
    }
    for (const bl in bloomBreakdown) {
        bloomBreakdown[bl].percentage = Math.round(
            (bloomBreakdown[bl].correct / bloomBreakdown[bl].total) * 100
        );
    }

    return {
        sessionId,
        score: correct,
        total,
        percentage,
        passed: percentage >= 70,
        bloomLevel: questions[0]?.bloomLevel || 'unknown',
        bloomBreakdown,
        results,
    };
}

module.exports = {
    generateQuestions,
    generatePracticeQuestions,
    submitPracticeSession,
};