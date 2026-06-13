// ============================================================================
// SKILLBUDDY AI SERVICE - OpenRouter Integration (FIXED v3)
// backend/services/ai-service.js
// ============================================================================

const axios = require('axios');
const { TEACHER_PERSONA_SYSTEM } = require('../prompts/teacherPersona');
const { TEACHER_CONTENT_PERSONA_SYSTEM, buildTopicGuideUserPrompt, buildTopicStepPlanUserPrompt, buildLearningPathUserPrompt } = require('../prompts/teacherContentPersona');
const { buildResourceLink } = require('../utils/resourceLinkBuilder');

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
// generateLearningPath
// Generates a full learning roadmap: phases -> modules -> topics -> subtopics.
// Uses TEACHER_CONTENT_PERSONA_SYSTEM for quality and structure discipline.
// Returns { phases: [...] } -- callers flatten to MongoDB format.
// ============================================================================
async function generateLearningPath(field, level, goals, quizResults = null, background = '') {
  const safeField = sanitizePromptInput(field, 100);
  const safeLevel = VALID_LEVELS.has(level) ? level : 'intermediate';

  const goalsStr = Array.isArray(goals)
    ? goals.map(g => sanitizePromptInput(g, 100)).join(', ')
    : sanitizePromptInput(goals || '', 300);

  const safeBackground = sanitizePromptInput(background || '', 300);

  let quizContext = '';
  if (quizResults) {
    const score = quizResults.score || 0;
    const total = quizResults.total || 5;
    const percentage = (score / total) * 100;
    const weakTopics = quizResults.details?.filter(d => !d.isCorrect).map(d => d.topic).join(', ') || 'none';
    let instruction = percentage < 40
      ? 'Student struggled. Phase 1 must cover absolute foundations before anything applied.'
      : percentage > 80
        ? 'Student excelled. Phase 1 can skip trivial basics and focus on intermediate foundations.'
        : `Average performance. Cover weak areas early in Phase 1: ${weakTopics}.`;
    quizContext = '\n\nDIAGNOSTIC: Score ' + score + '/' + total + ' (' + percentage.toFixed(0) + '%). ' + instruction;
  }

  const userMsg = buildLearningPathUserPrompt({
    field: safeField,
    level: safeLevel,
    background: safeBackground || undefined,
    goals: goalsStr ? goalsStr + (quizContext || '') : (quizContext || undefined),
    numPhases: 3,
  });

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    const response = await callOpenRouter(userMsg, 5000, 0.7, TEACHER_CONTENT_PERSONA_SYSTEM);
    const cleaned = cleanJSONResponse(response);
    const roadmap = JSON.parse(cleaned);

    if (!Array.isArray(roadmap.phases) || roadmap.phases.length === 0) {
      throw new Error('No phases in response');
    }
    if (roadmap.phases.length < 3) {
      console.warn(`⚠️  generateLearningPath attempt ${attempt}: got ${roadmap.phases.length} phases, expected 3. ${attempt < 2 ? 'Retrying...' : 'Proceeding with partial output.'}`);
      if (attempt < 2) throw new Error(`Only ${roadmap.phases.length} phases returned, expected 3`);
    }

    // Normalise each phase and its modules
    roadmap.phases = roadmap.phases.map((ph, phIdx) => ({
      phase: ph.phase || phIdx + 1,
      level: ph.level || safeLevel,
      title: ph.title || `Phase ${phIdx + 1}`,
      goal: ph.goal || '',
      modules: (ph.modules || []).map((m) => ({
        title: m.title || 'Untitled Module',
        description: m.description || '',
        topics: (m.topics || []).map((t) => ({
          title: t.title || 'Untitled Topic',
          description: t.description || '',
          subtopics: Array.isArray(t.subtopics)
            ? t.subtopics.map(s => (typeof s === 'string' ? { title: s, description: '' } : s))
            : [],
        })),
        practiceProjects: Array.isArray(m.practiceProjects) ? m.practiceProjects : [],
      })),
    }));

    const totalModules = roadmap.phases.reduce((sum, ph) => sum + ph.modules.length, 0);
    const totalTopics  = roadmap.phases.reduce((sum, ph) =>
      sum + ph.modules.reduce((ms, m) => ms + m.topics.length, 0), 0);
    console.log(`✅ generateLearningPath: ${roadmap.phases.length} phases, ${totalModules} modules, ${totalTopics} topics for "${safeField}"`);
    return roadmap;

  } catch (error) {
    lastError = error;
    console.error(`❌ generateLearningPath attempt ${attempt} failed:`, error.message);
  }
  } // end retry loop
    const error = lastError;
    console.error('❌ generateLearningPath failed after retries:', error?.message);
    const fallbackPhase = (phaseNum, phLevel, title) => ({
      phase: phaseNum,
      level: phLevel,
      title,
      goal: `Build foundational ${safeField} skills.`,
      modules: [
        {
          title: 'Core Concepts',
          description: `Fundamental ${safeField} ideas and terminology.`,
          topics: [
            {
              title: 'Introduction',
              description: 'Overview and context.',
              subtopics: [
                { title: 'What this is', description: 'Overview' },
                { title: 'Why it matters', description: 'Motivation' },
                { title: 'Core vocabulary', description: 'Key terms' },
              ],
            },
            {
              title: 'Hands-on Practice',
              description: 'Apply concepts through exercises.',
              subtopics: [
                { title: 'Guided exercise', description: 'Follow along with examples' },
                { title: 'Mini project', description: 'Build something from scratch' },
                { title: 'Common mistakes', description: 'Pitfalls and how to avoid them' },
              ],
            },
          ],
          practiceProjects: ['Complete the guided starter exercise for this module.'],
        },
      ],
    });
    return {
      phases: [
        fallbackPhase(1, 'beginner',     'Foundations'),
        fallbackPhase(2, 'intermediate', 'Applied Practice'),
        fallbackPhase(3, 'advanced',     'Depth and Mastery'),
      ],
    };
}
// ============================================================================
// generateTopicGuide
// Generates a standalone markdown topic guide using the teacher persona.
// Returns a raw markdown string — no JSON wrapper.
// ============================================================================
async function generateTopicGuide(
  field,
  level,
  topicTitle,
  topicDescription = '',
  priorTopics = [],
  upcomingTopics = [],
  moduleTitle = '',
  courseOrPathTitle = ''
) {
  const userMsg = buildTopicGuideUserPrompt({
    field: field || 'General',
    level: level || 'Intermediate',
    topicTitle,
    topicDescription: topicDescription || '',
    priorTopics,
    upcomingTopics,
    moduleTitle,
    courseOrPathTitle,
  });

  try {
    let response = await callOpenRouter(userMsg, 1800, 0.7, TEACHER_CONTENT_PERSONA_SYSTEM);
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
async function generateTopicStepPlan(
  field,
  level,
  topicTitle,
  moduleTitle,
  subtopics = [],
  priorTopics = [],
  upcomingTopics = [],
  topicDescription = '',
  courseOrPathTitle = ''
) {
  const stepCount = subtopics.length > 0 ? subtopics.length : 4;

  // Build subtopic list for the prompt so the LLM titles steps correctly
  const subtopicListText = subtopics.length > 0
    ? subtopics.map((s, i) => `${i + 1}. "${s.title}"${s.description ? ` — ${s.description}` : ''}`).join('\n')
    : null;

  const basePrompt = buildTopicStepPlanUserPrompt({
    field: field || 'General',
    level: level || 'Intermediate',
    topicTitle,
    topicDescription: topicDescription || '',
    priorTopics,
    upcomingTopics,
    moduleTitle: moduleTitle || '',
    courseOrPathTitle: courseOrPathTitle || '',
    numSteps: stepCount,
  });

  // Prepend the exact subtopic list when subtopics are provided so step titles match exactly
  const userMsg = subtopicListText
    ? `Generate steps using these EXACT subtopic titles (in order):\n${subtopicListText}\n\n${basePrompt}`
    : basePrompt;

  let lastParseError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await callOpenRouter(userMsg, 2800, 0.7, TEACHER_CONTENT_PERSONA_SYSTEM);
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
        url: buildResourceLink({ title: r.title, type: r.type || 'article' }),
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
      lastParseError = error;
      console.error(`❌ generateTopicStepPlan attempt ${attempt} failed:`, error.message);
      if (attempt < 2) console.log('🔄 Retrying step plan generation...');
    }
  }
  // Both attempts failed — use fallback
  {
    const error = lastParseError;
    console.error('❌ generateTopicStepPlan failed after retries:', error?.message);
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
            title: `${sub.title} ${topicTitle} Full Tutorial freeCodeCamp`,
            platform: 'YouTube · freeCodeCamp',
            duration: '~20 min',
            url: buildResourceLink({ title: `${sub.title} ${topicTitle} Full Tutorial freeCodeCamp`, type: 'youtube' }),
            description: `Watch a structured tutorial on ${sub.title} from freeCodeCamp's educational channel.`
          },
          {
            type: 'article',
            title: `${sub.title} ${topicTitle} MDN Web Docs`,
            platform: 'MDN Web Docs',
            duration: '~10 min read',
            url: buildResourceLink({ title: `${sub.title} ${topicTitle} MDN Web Docs`, type: 'article' }),
            description: `Read the official, authoritative documentation for ${sub.title}.`
          },
          {
            type: 'practice',
            title: `Practice ${sub.title} ${topicTitle} freeCodeCamp`,
            platform: 'freeCodeCamp',
            duration: '~30 min',
            url: buildResourceLink({ title: `Practice ${sub.title} ${topicTitle} freeCodeCamp`, type: 'practice' }),
            description: `Complete interactive exercises on ${sub.title} with immediate feedback and certification.`
          },
          {
            type: 'reference',
            title: `${topicTitle} ${sub.title} Quick Reference DevDocs`,
            platform: 'DevDocs.io',
            duration: 'Reference',
            url: buildResourceLink({ title: `${topicTitle} ${sub.title} Quick Reference DevDocs`, type: 'reference' }),
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