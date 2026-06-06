// ============================================================================
// SKILLBUDDY AI SERVICE - OpenRouter Integration (FIXED v3)
// backend/services/ai-service.js
// ============================================================================

const axios = require('axios');
const { TEACHER_PERSONA_SYSTEM, buildTopicGuidePrompt } = require('../prompts/teacherPersona');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';
const SITE_NAME = process.env.SITE_NAME || 'SkillBuddy';

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not found in .env file');
}

// Sanitize user-supplied strings before interpolating into prompts.
// Strips control characters and prompt-injection patterns, limits length.
function sanitizePromptInput(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x1F\x7F]/g, ' ') // strip control chars
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, '') // strip common injection tokens
    .trim()
    .slice(0, maxLength);
}

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);
const VALID_BLOOM = new Set(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'mixed']);

// ============================================================================
// cleanJSONResponse
// ============================================================================
function cleanJSONResponse(text) {
  if (!text) throw new Error('Empty response from AI');

  let cleaned = text.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try { JSON.parse(cleaned); return cleaned; } catch (_) { }

  const arrayStart = cleaned.indexOf('[');
  if (arrayStart !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      const repaired = cleaned.substring(arrayStart, lastBrace + 1) + ']';
      try {
        JSON.parse(repaired);
        console.warn('⚠️  JSON truncated — recovered', JSON.parse(repaired).length, 'items');
        return repaired;
      } catch (_) { }
    }
  }

  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    const extracted = cleaned.substring(objStart, objEnd + 1);
    try { JSON.parse(extracted); return extracted; } catch (_) { }
  }

  throw new Error(`Could not parse AI response. First 300 chars: ${cleaned.substring(0, 300)}`);
}

// ============================================================================
// callOpenRouter
// ============================================================================
async function callOpenRouter(prompt, maxTokens = 4000, temperature = 0.7, systemPrompt = null, model = null) {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured.');

  const effectiveModel = model || AI_MODEL;

  try {
    console.log(`🤖 Calling OpenRouter [model: ${effectiveModel}, maxTokens: ${maxTokens}]`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: effectiveModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt ||
              'You are a helpful educational assistant. Always respond with valid JSON only. ' +
              'Do NOT include markdown formatting, code fences, or any text outside the JSON. ' +
              'Keep all string values concise.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    const choice = response.data.choices[0];
    const content = choice?.message?.content;
    if (!content) throw new Error('AI returned empty content');
    if (choice.finish_reason === 'length') {
      console.warn('⚠️  Response truncated (finish_reason: length). Recovery will be attempted.');
    }
    console.log(`✅ OpenRouter OK [${content.length} chars, finish_reason: ${choice.finish_reason}]`);
    return content;

  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`❌ OpenRouter HTTP ${status}:`, JSON.stringify(data, null, 2));
      if (status === 401) throw new Error('Invalid OpenRouter API key');
      if (status === 404) throw new Error(`Model not found: "${effectiveModel}"`);
      if (status === 429) throw new Error('Rate limit hit — try again shortly');
    }
    console.error('❌ OpenRouter call failed:', error.message);
    throw error;
  }
}

// ============================================================================
// generateLearningPath  ← KEY FIX: better prompt + 8000 tokens + subtopics
// ============================================================================
async function generateLearningPath(field, level, goals, quizResults = null) {
  const safeField = sanitizePromptInput(field, 100);
  const safeLevel = VALID_LEVELS.has(level) ? level : 'intermediate';
  const safeGoals = Array.isArray(goals)
    ? goals.map(g => sanitizePromptInput(g, 100)).join(', ')
    : sanitizePromptInput(goals, 300);
  const goalsText = safeGoals;

  let quizContext = '';
  if (quizResults) {
    const score = quizResults.score || 0;
    const total = quizResults.total || 5;
    const percentage = (score / total) * 100;
    const weakTopics = quizResults.details?.filter(d => !d.isCorrect).map(d => d.topic).join(', ') || 'none';
    let instruction = percentage < 40
      ? 'Student struggled. Include a Foundations module as Week 1.'
      : percentage > 80
        ? 'Student excelled. Skip basics, focus on advanced topics.'
        : `Average performance. Cover weak topics early: ${weakTopics}.`;
    quizContext = `\nDIAGNOSTIC: Score ${score}/${total} (${percentage.toFixed(0)}%). ${instruction}`;
  }

  const prompt = `Create a learning roadmap for a ${safeLevel} student learning ${safeField}.
Goals: ${goalsText}${quizContext}

Return ONLY valid JSON, no markdown, no extra text.
IMPORTANT: Keep ALL descriptions under 12 words. Critical to avoid truncation.

{
  "modules": [
    {
      "title": "Phase Name (NO Week prefix — e.g. Foundation, Core Concepts, Advanced Patterns)",
      "description": "One sentence overview under 12 words.",
      "duration": "Estimated time e.g. 2 weeks",
      "difficultyLevel": "beginner",
      "goalStatement": "One sentence: what the student achieves in this phase.",
      "practiceProjects": [
        "Build a simple starter project",
        "Complete a guided hands-on exercise"
      ],
      "topics": [
        {
          "title": "Short Topic Title",
          "description": "What this topic covers in 10 words.",
          "subtopics": [
            { "title": "Subtopic Name", "description": "Brief 8-word description" },
            { "title": "Subtopic Name", "description": "Brief 8-word description" },
            { "title": "Subtopic Name", "description": "Brief 8-word description" },
            { "title": "Subtopic Name", "description": "Brief 8-word description" }
          ]
        }
      ]
    }
  ]
}

Rules:
- Generate 5 to 7 phases progressing in difficulty.
- difficultyLevel must be one of: beginner, intermediate, advanced, expert, production.
- Phase titles must NOT start with "Week". Use descriptive names.
- Each phase must have 5 to 8 topics. Each topic must have exactly 4 subtopics.
- practiceProjects must have 2 to 3 short project ideas per phase.
- goalStatement is one sentence describing what the student achieves.
Field: ${safeField}, Level: ${safeLevel}.`;

  try {
    const response = await callOpenRouter(prompt, 8000);
    const cleaned = cleanJSONResponse(response);
    const learningPath = JSON.parse(cleaned);

    if (!learningPath.modules || learningPath.modules.length === 0) {
      throw new Error('No modules in response');
    }

    console.log(`✅ generateLearningPath: ${learningPath.modules.length} modules, first module has ${learningPath.modules[0].topics?.length} topics`);
    return learningPath;

  } catch (error) {
    console.error('❌ generateLearningPath failed:', error.message);
    // Fallback with phase-based structure so UI doesn't break
    const fallbackTopics = (label) => ([
      {
        title: 'Core Concepts',
        description: 'Fundamental ideas and terminology.',
        subtopics: [
          { title: 'Introduction', description: 'Overview and context' },
          { title: 'Key Terms', description: 'Essential vocabulary to know' },
          { title: 'Core Principles', description: 'Foundational rules and patterns' },
          { title: 'Quick Reference', description: 'Summary and cheat sheet' }
        ]
      },
      {
        title: 'Hands-on Practice',
        description: 'Apply concepts through exercises.',
        subtopics: [
          { title: 'Guided Exercise', description: 'Follow along with examples' },
          { title: 'Mini Project', description: 'Build something from scratch' },
          { title: 'Common Mistakes', description: 'Pitfalls and how to avoid them' },
          { title: 'Self Assessment', description: 'Check your understanding' }
        ]
      }
    ]);
    return {
      modules: [
        {
          title: 'Foundation',
          description: `Core ${field} fundamentals and setup.`,
          duration: '2 weeks',
          difficultyLevel: 'beginner',
          goalStatement: `Understand the basics of ${field} and set up your environment.`,
          practiceProjects: ['Build a starter project', 'Complete a guided exercise'],
          topics: fallbackTopics('foundation')
        },
        {
          title: 'Core Concepts',
          description: `Essential ${field} patterns and principles.`,
          duration: '2 weeks',
          difficultyLevel: 'intermediate',
          goalStatement: `Apply core ${field} patterns with confidence.`,
          practiceProjects: ['Build an intermediate project', 'Solve practice exercises'],
          topics: fallbackTopics('core')
        },
        {
          title: 'Advanced Application',
          description: `Advanced ${field} techniques and real projects.`,
          duration: '2 weeks',
          difficultyLevel: 'advanced',
          goalStatement: `Build production-ready ${field} projects independently.`,
          practiceProjects: ['Build a real-world project', 'Code review and refactor'],
          topics: fallbackTopics('advanced')
        }
      ]
    };
  }
}

// ============================================================================
// generateTopicGuide
// Generates a standalone markdown topic guide using the teacher persona.
// Returns a raw markdown string — no JSON wrapper.
// ============================================================================
async function generateTopicGuide(field, level, topicTitle, topicDescription = '', priorTopics = [], contextChunks = '') {
  const userMsg = buildTopicGuidePrompt({
    topicTitle,
    topicDescription: topicDescription || `Introduction to ${topicTitle}`,
    field: field || 'General',
    level: level || 'Intermediate',
    priorTopics,
    contextChunks,
  });

  try {
    let response = await callOpenRouter(userMsg, 1400, 0.78, TEACHER_PERSONA_SYSTEM);
    // Strip <think> reasoning blocks some models emit before the real answer
    response = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return response;
  } catch (error) {
    console.error('❌ generateTopicGuide failed:', error.message);
    return `## ${topicTitle}\n\n${topicDescription || ''}\n\n*(Topic guide generation failed — please consult your learning resources.)*`;
  }
}

// ============================================================================
// generateQuizFromContext
// ============================================================================
async function generateQuizFromContext(topic, contextText, count = 5) {
  const prompt = `Generate exactly ${count} multiple-choice questions about: "${topic}".
Context: "${contextText}".
Return ONLY a valid JSON array. No markdown.

[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "2-3 sentences: explain simply for a student, then give a real-life analogy or everyday example to make it click.",
    "hint": "Helpful hint."
  }
]`;

  try {
    const response = await callOpenRouter(prompt, 5000);
    const cleaned = cleanJSONResponse(response);
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error('Not an array');
    return questions.slice(0, count).map((q, i) => ({
      question: q.question || `Question ${i + 1}`,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'A'),
      explanation: q.explanation || 'No explanation provided.',
      hint: q.hint || 'No hint available.'
    }));
  } catch (error) {
    console.error('❌ generateQuizFromContext failed:', error.message);
    return [{ question: `What is a key concept in ${topic}?`, options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'], correctAnswer: 'Concept A', explanation: 'Fallback question.', hint: 'Pick the first option.' }];
  }
}

// ============================================================================
// generateTopicQuiz
// ============================================================================
const BLOOM_DESCRIPTIONS = {
  remember:   'recall facts, definitions, and basic concepts — "What is...?", "List...", "Define..."',
  understand: 'explain ideas in own words, summarize, classify — "Explain...", "What does X mean?", "How does X work?"',
  apply:      'use knowledge to solve problems — "Write code that...", "Implement...", "How would you fix...?"',
  analyze:    'break down concepts, compare, distinguish — "Why does X happen?", "What is the difference between X and Y?", "Identify the problem in..."',
  evaluate:   'judge, critique, justify choices — "Which approach is better and why?", "What are the trade-offs of...?"',
  create:     'design or construct something new — "Design a...", "How would you architect...?", "Write a solution for..."'
};

const BLOOM_STEMS = {
  remember:  { allowed: ['What is', 'Define', 'Which of the following', 'Name', 'List', 'Identify'],
               forbidden: ['design', 'create', 'evaluate', 'compare', 'write code'] },
  understand:{ allowed: ['Explain', 'What does', 'How does', 'Describe', 'What is meant by', 'Summarize'],
               forbidden: ['design', 'create', 'write code', 'evaluate', 'which is better'] },
  apply:     { allowed: ['How would you use', 'Which approach', 'Write code to', 'Implement', 'Calculate', 'Solve'],
               forbidden: ['What is the definition', 'Define', 'Name', 'List'] },
  analyze:   { allowed: ['Why does', 'What is the difference between', 'Identify the issue', 'Compare', 'What causes', 'Which of the following is NOT'],
               forbidden: ['Define', 'Name', 'Write code', 'Design'] },
  evaluate:  { allowed: ['Which approach is better and why', 'What are the trade-offs', 'Should you use', 'What is the best reason', 'Justify'],
               forbidden: ['Define', 'Name', 'Write code', 'Design'] },
  create:    { allowed: ['Design a', 'How would you architect', 'What would you build', 'Propose a solution', 'Construct'],
               forbidden: ['What is', 'Define', 'Name', 'List'] },
};

async function generateTopicQuiz(topic, moduleName, className, subjectField, level, bloomLevel = 'understand', contextText = '', numQuestions = 10) {
  const safeTopic = sanitizePromptInput(topic, 150);
  const safeModule = sanitizePromptInput(moduleName, 100);
  const safeClass = sanitizePromptInput(className, 100);
  const safeSubject = sanitizePromptInput(subjectField, 100);
  const safeBloom = VALID_BLOOM.has(bloomLevel) ? bloomLevel : 'understand';
  const bloomDesc = BLOOM_DESCRIPTIONS[safeBloom] || BLOOM_DESCRIPTIONS.understand;
  const stems = BLOOM_STEMS[safeBloom] || BLOOM_STEMS.understand;
  const hasContext = contextText && contextText.trim().length > 50;
  const askFor = numQuestions + 3;

  const contextSection = hasContext
    ? `\n\nCOURSE MATERIAL CONTEXT (use this as the primary source for question content):\n"""\n${contextText.substring(0, 3000)}\n"""`
    : '';

  const prompt = `You are an expert quiz writer. Generate ${askFor} multiple-choice questions about the EXACT topic below, then I will take the best ${numQuestions}.

SUBJECT: ${safeSubject}
COURSE: ${safeClass}
MODULE: ${safeModule}
TOPIC: ${safeTopic}
BLOOM LEVEL: ${safeBloom} — ${bloomDesc}${contextSection}

RULES (follow every one strictly):
1. TOPIC LOCK: Every question must be answerable only by knowing about "${safeTopic}" specifically. If a question could be answered without knowing "${safeTopic}", rewrite it.
2. BLOOM LOCK: Every question must be at the "${safeBloom}" cognitive level.
   ALLOWED question starters: ${stems.allowed.join(', ')}.
   FORBIDDEN words/phrases in questions: ${stems.forbidden.join(', ')}.
3. No question may start with the literal word "${safeTopic}" — rephrase so the subject is clear from context.
4. 4 answer options each; exactly one is unambiguously correct.
5. DISTINCT OPTIONS: ALL 4 options must be completely different from each other. No two options may have identical or near-identical text. Each wrong answer must be a plausible but clearly distinct distractor.
6. CODE OPTIONS: If the question involves code snippets as answer options, put each complete code snippet inside the option string itself. Use single-line format with semicolons — do NOT use actual newlines inside option strings. The "code" field is for a code snippet shown AS PART OF THE QUESTION (context code), leave it empty string if the question text alone is sufficient.
7. Return ONLY a valid JSON array of exactly ${numQuestions} objects — no markdown, no text outside the JSON array.

JSON format (return EXACTLY ${numQuestions} elements):
[
  {
    "question": "...",
    "code": "",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "explanation": "2-3 sentences: explain simply for a student, then give a real-life analogy or everyday example to make it click.",
    "hint": "Short hint.",
    "bloomLevel": "${safeBloom}",
    "difficulty": 5
  }
]`;

  try {
    const response = await callOpenRouter(prompt, 6000, 0.4);
    const cleaned = cleanJSONResponse(response);
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error('Not an array');
    const sliced = questions.slice(0, numQuestions);
    console.log(`✅ generateTopicQuiz: got ${questions.length} questions (returning ${sliced.length})`);
    return sliced.map((q, i) => {
      const rawOpts = Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'];
      // Deduplicate: drop options with identical text to an earlier one
      const seen = new Set();
      const uniqueOpts = rawOpts.filter(o => {
        const key = o.replace(/^[A-D]\)\s*/i, '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        question: q.question || `Question ${i + 1}`,
        code: q.code || '',
        options: uniqueOpts,
        correctAnswer: q.correctAnswer || rawOpts[0] || 'A',
        explanation: q.explanation || 'No explanation provided.',
        hint: q.hint || 'No hint available.',
        bloomLevel: q.bloomLevel || bloomLevel,
        difficulty: q.difficulty || 5
      };
    });
  } catch (error) {
    console.error('❌ generateTopicQuiz failed:', error.message);
    return Array.from({ length: numQuestions }, (_, i) => ({
      question: `Question ${i + 1}: What is an important aspect of ${topic}?`,
      code: '',
      options: ['Review your course material', 'Check the module resources', 'Ask your instructor', 'Research further'],
      correctAnswer: 'Review your course material',
      explanation: `Quiz generation failed — review ${topic} in your course materials.`,
      hint: `Refer to the ${topic} section of your course.`,
      bloomLevel: bloomLevel,
      difficulty: 3
    }));
  }
}

// ============================================================================
// generateAssessmentQuestions
// ============================================================================
async function generateAssessmentQuestions(field, level, count = 5) {
  const prompt = `Generate exactly ${count} multiple-choice questions for a ${level} level assessment in ${field}.
Return ONLY a valid JSON array. No markdown.

[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "2-3 sentences: explain simply for a student, then give a real-life analogy or everyday example to make it click.",
    "hint": "One short hint.",
    "bloomLevel": "remember",
    "topic": "Topic name"
  }
]

correctAnswer must exactly match one of the 4 options.`;

  try {
    const response = await callOpenRouter(prompt, 5000);
    const cleaned = cleanJSONResponse(response);
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid response');
    console.log(`✅ Generated ${questions.length}/${count} questions`);
    return questions.slice(0, count).map((q, i) => ({
      question: q.question || `Question ${i + 1}`,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'A'),
      explanation: q.explanation || 'No explanation provided.',
      hint: q.hint || 'No hint available.',
      bloomLevel: q.bloomLevel || 'understand',
      topic: q.topic || field
    }));
  } catch (error) {
    console.error('❌ generateAssessmentQuestions failed:', error.message);
    return getAssessmentFallback();
  }
}

function getAssessmentFallback() {
  return [
    { question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Mark Language', 'Home Tool Markup Language'], correctAnswer: 'Hyper Text Markup Language', explanation: 'HTML is the standard markup language for Web pages.', hint: "Standard markup language.", bloomLevel: 'remember', topic: 'Web Fundamentals' },
    { question: 'Which CSS property changes text color?', options: ['text-color', 'color', 'font-color', 'fg-color'], correctAnswer: 'color', explanation: 'The color property specifies text color.', hint: "It's just the word for color.", bloomLevel: 'remember', topic: 'CSS' },
    { question: 'Which symbol starts a JS single-line comment?', options: ['//', '<!--', '#', '**'], correctAnswer: '//', explanation: 'Double slashes start single-line comments.', hint: 'Same as C++ and Java.', bloomLevel: 'remember', topic: 'JavaScript' },
    { question: "What is a database's primary function?", options: ['Style web pages', 'Store and manage data', 'Execute Python code', 'Create user interfaces'], correctAnswer: 'Store and manage data', explanation: 'Databases store organized collections of data.', hint: "Think 'Data' base.", bloomLevel: 'understand', topic: 'Databases' },
    { question: 'Which is a version control system?', options: ['Node.js', 'React', 'Git', 'Docker'], correctAnswer: 'Git', explanation: 'Git is a distributed version control system.', hint: "Used by GitHub.", bloomLevel: 'understand', topic: 'Tools' }
  ];
}

// ============================================================================
// generateTopicStepPlan  ← topic-wise step-by-step learning plan (teacher-grade)
// ============================================================================
async function generateTopicStepPlan(field, level, topicTitle, moduleTitle, subtopics = []) {
  const subtopicList = subtopics.length > 0
    ? subtopics.map((s, i) => `${i + 1}. "${s.title}"${s.description ? ` — ${s.description}` : ''}`).join('\n')
    : `1. "${topicTitle} Basics"\n2. "Key Concepts"\n3. "Practical Application"\n4. "Best Practices"`;

  const stepCount = subtopics.length > 0 ? subtopics.length : 4;

  const systemMsg = TEACHER_PERSONA_SYSTEM + `

OUTPUT FORMAT: Respond with ONLY valid JSON following the exact schema in the user message.
Apply the teacher voice to all "explanation" and "teacherNote" string fields within the JSON.
Use callout patterns (💡 Intuition: / 🔧 In practice: / ⚠️ Common mistake: / 🎯 Quick check:) inside explanation strings where they fit naturally.
Represent line breaks inside JSON string values as \\n.`;

  const prompt = `You're writing a structured lesson on "${topicTitle}" (module: "${moduleTitle}") for a ${level} learner in ${field}.

Generate EXACTLY ${stepCount} steps — one per subtopic listed:
${subtopicList}

Return ONLY valid JSON. No text before or after the JSON object.

{
  "objectives": [
    "Student will be able to explain...",
    "Student will be able to build...",
    "Student will understand..."
  ],
  "estimatedTime": "2-3 hours",
  "steps": [
    {
      "stepNumber": 1,
      "title": "EXACT subtopic title from the list",
      "explanation": "2-3 short paragraphs in teacher voice. Open with an everyday analogy (> 💡 Intuition:) BEFORE the formal definition. Then at least one of: > 🔧 In practice: (real scenario), > ⚠️ Common mistake: (trap). Build directly from the prior step. Use \\n for line breaks.",
      "teacherNote": "One human aside — the kind of thing a teacher says out loud in class. Start with 'I tell my students…' or 'The thing to remember here…' Warm and specific.",
      "exampleCode": "A minimal, self-contained code snippet demonstrating this concept. Use empty string if not code-related.",
      "exampleExplanation": "2-3 sentences walking through what the example shows and why it was written that way.",
      "keyPoints": [
        "First key concept or fact to remember",
        "Second key concept or fact to remember",
        "Third key concept or fact to remember"
      ],
      "commonMistake": "The one mistake students make at THIS step specifically — not the overall topic. One or two sentences, specific enough to be actionable.",
      "action": "What the student should do right now to lock this in — write code, sketch a diagram, predict an output, or explain it to themselves out loud. Be specific about exactly what to do.",
      "estimatedTime": "25 min",
      "resources": [
        {
          "type": "youtube",
          "title": "Specific video title that actually exists on this channel",
          "platform": "YouTube · Traversy Media",
          "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID",
          "duration": "12 min",
          "description": "One sentence: exactly what concept this video teaches and why it helps at this step."
        },
        {
          "type": "article",
          "title": "Specific documentation page or authoritative article title",
          "platform": "MDN Web Docs",
          "url": "https://developer.mozilla.org/en-US/docs/SPECIFIC_PAGE",
          "duration": "8 min read",
          "description": "One sentence: what the student will specifically learn from reading this."
        },
        {
          "type": "practice",
          "title": "Specific interactive exercise or challenge title",
          "platform": "freeCodeCamp",
          "url": "https://www.freecodecamp.org/learn/SPECIFIC_SECTION",
          "duration": "30 min",
          "description": "One sentence: what the student will build or practice in this exercise."
        },
        {
          "type": "reference",
          "title": "Quick reference guide or cheatsheet title",
          "platform": "DevDocs.io",
          "url": "https://devdocs.io/TECHNOLOGY",
          "duration": "Reference",
          "description": "One sentence: what this cheatsheet covers for quick lookup while coding."
        }
      ]
    }
  ]
}

Rules:
- Exactly ${stepCount} steps, one per subtopic, in order.
- Each step title must match the subtopic title exactly.
- explanation: 3-4 sentences, specific and concrete — not generic filler.
- teacherNote: one sentence of genuine practitioner wisdom.
- exampleCode: real minimal code (empty string if non-code topic).
- exampleExplanation: 2-3 sentences explaining the example.
- keyPoints: exactly 3 short bullet facts.
- commonMistake: one actionable sentence.
- resources: exactly 4 — (1) youtube: real video from a reputable educational channel like Traversy Media, Fireship, The Net Ninja, Kevin Powell, Academind, CS50, or freeCodeCamp — use a real watch?v= URL not a search URL; (2) article: direct link to official docs or a trusted guide like MDN, CSS-Tricks, web.dev, Real Python, or official language/framework docs — use a specific page URL not a homepage; (3) practice: interactive exercise from freeCodeCamp, Exercism, JavaScript30, CodePen, or Scrimba — use a specific section URL not a homepage; (4) reference: cheatsheet or quick-reference from DevDocs, QuickRef.ME, or CSS-Tricks — for fast syntax lookup while coding. Each resource must include platform, duration, and description fields. Choose resources appropriate for a ${level} learner.
- objectives: exactly 3 outcomes starting with "Student will".
Field: ${field}, Level: ${level}, Topic: ${topicTitle}`;

  try {
    const response = await callOpenRouter(prompt, 8000, 0.77, systemMsg);
    const cleaned = cleanJSONResponse(response);
    const plan = JSON.parse(cleaned);

    if (!plan.steps || plan.steps.length === 0) throw new Error('No steps in response');

    plan.steps = plan.steps.map((s, i) => ({
      stepNumber: i + 1,
      title: s.title || (subtopics[i]?.title) || `Subtopic ${i + 1}`,
      explanation: s.explanation || '',
      teacherNote: s.teacherNote || '',
      exampleCode: s.exampleCode || '',
      exampleExplanation: s.exampleExplanation || '',
      keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.slice(0, 3) : [],
      commonMistake: s.commonMistake || '',
      action: s.action || '',
      estimatedTime: s.estimatedTime || '25 min',
      completed: false,
      resources: Array.isArray(s.resources) ? s.resources.slice(0, 4).map(r => ({
        type: (r.type || 'article').toLowerCase(),
        title: r.title || 'Resource',
        url: r.url || '#',
        platform: r.platform || '',
        duration: r.duration || '',
        description: r.description || ''
      })) : []
    }));

    plan.objectives = Array.isArray(plan.objectives) ? plan.objectives.slice(0, 3) : [];
    plan.estimatedTime = plan.estimatedTime || `${stepCount * 25} min`;

    console.log(`✅ generateTopicStepPlan: ${plan.steps.length} subtopic steps for "${topicTitle}"`);
    return plan;
  } catch (error) {
    console.error('❌ generateTopicStepPlan failed:', error.message);
    const fallbackSubtopics = subtopics.length > 0 ? subtopics : [
      { title: 'Introduction', description: 'Overview and context' },
      { title: 'Core Concepts', description: 'Key ideas and terminology' },
      { title: 'Practical Application', description: 'Hands-on exercises' },
      { title: 'Best Practices', description: 'Tips and common patterns' }
    ];
    return {
      objectives: [
        `Student will be able to explain core concepts of ${topicTitle}`,
        `Student will be able to apply ${topicTitle} in practical scenarios`,
        `Student will understand best practices for ${topicTitle}`
      ],
      estimatedTime: `${fallbackSubtopics.length * 25} min`,
      steps: fallbackSubtopics.map((sub, i) => ({
        stepNumber: i + 1,
        title: sub.title,
        explanation: `${sub.description || `Learn about ${sub.title} within the context of ${topicTitle}.`} This is a key part of mastering ${topicTitle} in ${field}. Understanding this well will directly improve your ability to write production-quality code.`,
        teacherNote: `Pro tip: Always connect what you learn here back to a real project. Abstract knowledge without application fades quickly.`,
        exampleCode: '',
        exampleExplanation: `This example illustrates the core idea behind ${sub.title}. Study it carefully before attempting the action step.`,
        keyPoints: [
          `${sub.title} is foundational for understanding ${topicTitle}`,
          `Apply this concept in small experiments before using it in larger projects`,
          `Review official documentation alongside tutorials for accurate mental models`
        ],
        commonMistake: `Beginners often skip practicing ${sub.title} hands-on — passive reading is not enough; you must write code to internalize it.`,
        action: `Build a minimal example demonstrating ${sub.title} from scratch without copying — then explain it back in your own words.`,
        estimatedTime: '25 min',
        completed: false,
        resources: [
          {
            type: 'youtube',
            title: `${sub.title} – Full Tutorial`,
            platform: 'YouTube · freeCodeCamp',
            duration: '~20 min',
            url: 'https://www.youtube.com/@freecodecamp/search?query=' + encodeURIComponent(`${sub.title} ${topicTitle}`),
            description: `Watch a structured tutorial on ${sub.title} from freeCodeCamp's educational channel.`
          },
          {
            type: 'article',
            title: `${sub.title} — MDN Web Docs`,
            platform: 'MDN Web Docs',
            duration: '~10 min read',
            url: 'https://developer.mozilla.org/en-US/search?q=' + encodeURIComponent(`${sub.title} ${topicTitle}`),
            description: `Read the official, authoritative documentation for ${sub.title}.`
          },
          {
            type: 'practice',
            title: `Practice ${sub.title} — freeCodeCamp`,
            platform: 'freeCodeCamp',
            duration: '~30 min',
            url: 'https://www.freecodecamp.org/learn',
            description: `Complete interactive exercises on ${sub.title} with immediate feedback and certification.`
          },
          {
            type: 'reference',
            title: `${topicTitle} Quick Reference — DevDocs`,
            platform: 'DevDocs.io',
            duration: 'Reference',
            url: 'https://devdocs.io',
            description: `Use DevDocs as a fast offline-capable API reference for ${topicTitle} syntax and methods.`
          }
        ]
      }))
    };
  }
}

module.exports = {
  generateAssessmentQuestions,
  generateLearningPath,
  generateTopicGuide,
  generateTopicStepPlan,
  generateQuizFromContext,
  generateTopicQuiz,
  callOpenRouter
};