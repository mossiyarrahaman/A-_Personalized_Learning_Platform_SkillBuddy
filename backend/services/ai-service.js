// ============================================================================
// SKILLBUDDY AI SERVICE - OpenRouter Integration (FIXED v3)
// backend/services/ai-service.js
// ============================================================================

const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';
const SITE_NAME = process.env.SITE_NAME || 'SkillBuddy';

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not found in .env file');
}

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
async function callOpenRouter(prompt, maxTokens = 4000) {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured.');

  try {
    console.log(`🤖 Calling OpenRouter [model: ${AI_MODEL}, maxTokens: ${maxTokens}]`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful educational assistant. Always respond with valid JSON only. ' +
              'Do NOT include markdown formatting, code fences, or any text outside the JSON. ' +
              'Keep all string values concise.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
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
      if (status === 404) throw new Error(`Model not found: "${AI_MODEL}"`);
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
  const goalsText = Array.isArray(goals) ? goals.join(', ') : goals;

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

  const prompt = `Create an 8-week learning roadmap for a ${level} student learning ${field}.
Goals: ${goalsText}${quizContext}

Return ONLY valid JSON, no markdown, no extra text.

IMPORTANT: Keep ALL descriptions under 12 words. This is critical to avoid truncation.

{
  "modules": [
    {
      "title": "Week 1: Topic Name",
      "description": "One sentence overview of this week.",
      "duration": "1 week",
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

Generate exactly 8 modules. Each module must have exactly 5 topics. Each topic must have exactly 4 subtopics. Field: ${field}, Level: ${level}.`;

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
    // Fallback with proper subtopics structure so UI doesn't break
    return {
      modules: Array.from({ length: 4 }, (_, i) => ({
        title: `Week ${i + 1}: ${field} Foundations`,
        description: `Core ${field} concepts for week ${i + 1}.`,
        duration: '1 week',
        topics: [
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
        ]
      }))
    };
  }
}

// ============================================================================
// generateResourceRecommendations
// ============================================================================
async function generateResourceRecommendations(field, level, weakTopics) {
  const topicsText = Array.isArray(weakTopics) ? weakTopics.join(', ') : 'general concepts';

  const prompt = `As an expert teacher, provide a lesson plan for ${level} ${field}, focusing on: ${topicsText}.

Return ONLY valid JSON. No markdown.

{
  "content": "### Introduction\\nThis topic covers...\\n\\n### Key Concepts\\n1. **Concept A**: ...",
  "recommendations": [
    {
      "type": "youtube",
      "title": "Video Title",
      "url": "https://youtube.com/...",
      "difficulty": "Intermediate",
      "topic": "Concept"
    }
  ]
}

Requirements:
- content: 300-500 word explanatory mini-lesson with sections
- recommendations: 5 high-quality links (YouTube, articles, docs)`;

  try {
    const response = await callOpenRouter(prompt, 4000);
    const cleaned = cleanJSONResponse(response);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ generateResourceRecommendations failed:', error.message);
    return {
      content: `### Overview\nHere is a brief overview of ${topicsText}.\n\n(AI generation failed — please consult external resources.)`,
      recommendations: [{ type: 'article', title: `${field} Documentation`, url: 'https://docs.google.com', difficulty: level, topic: field }]
    };
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
    "explanation": "Brief explanation under 20 words.",
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
async function generateTopicQuiz(topic, className, level, bloomLevel = 'understand', contextText = '') {
  const prompt = `Generate 10 multiple-choice questions on "${topic}" for "${className}" (${level} level, ${bloomLevel} Bloom's level).
Context: ${contextText}
Return ONLY a valid JSON array. No markdown.

[
  {
    "question": "Question text",
    "code": "",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief explanation under 20 words.",
    "hint": "Short hint.",
    "difficulty": 5
  }
]`;

  try {
    const response = await callOpenRouter(prompt, 6000);
    const cleaned = cleanJSONResponse(response);
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error('Not an array');
    console.log(`✅ generateTopicQuiz: got ${questions.length} questions`);
    return questions.map((q, i) => ({
      question: q.question || `Question ${i + 1}`,
      code: q.code || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'A'),
      explanation: q.explanation || 'No explanation provided.',
      hint: q.hint || 'No hint available.',
      difficulty: q.difficulty || 5
    }));
  } catch (error) {
    console.error('❌ generateTopicQuiz failed:', error.message);
    return Array.from({ length: 5 }, (_, i) => ({
      question: `Fallback Q${i + 1}: Key concept in ${topic}?`,
      code: '',
      options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
      correctAnswer: 'Concept A',
      explanation: 'Fallback — AI unavailable.',
      hint: 'Select the first option.',
      difficulty: 1
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
    "explanation": "Brief explanation under 20 words.",
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
// generateTopicStepPlan  ← topic-wise step-by-step learning plan
// ============================================================================
async function generateTopicStepPlan(field, level, topicTitle, moduleTitle, subtopics = []) {
  const subtopicsText = subtopics.map(s => s.title).filter(Boolean).join(', ') || topicTitle;

  const prompt = `Create a detailed step-by-step learning plan for the topic "${topicTitle}" \
(module: "${moduleTitle}") for a ${level} learner studying ${field}.
Subtopics to cover: ${subtopicsText}

Return ONLY valid JSON. No markdown, no extra text.

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
      "title": "Step title (max 8 words)",
      "explanation": "2 sentence explanation of what to learn and why it matters.",
      "action": "Specific action: e.g. Watch the video, Read the docs, Build a mini-project, Complete the exercise.",
      "estimatedTime": "20 min",
      "resources": [
        { "type": "youtube", "title": "Resource title", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { "type": "article", "title": "Resource title", "url": "https://developer.mozilla.org" }
      ]
    }
  ]
}

Requirements:
- Exactly 5 to 6 steps that progress logically from understanding to hands-on practice
- Each step must have exactly 2 resources with real, working URLs (YouTube videos or authoritative articles)
- objectives: exactly 3 clear, actionable learning outcomes starting with "Student will"
- estimatedTime per step: realistic (10-30 min range)
- Keep explanation under 2 sentences
Field: ${field}, Level: ${level}, Topic: ${topicTitle}`;

  try {
    const response = await callOpenRouter(prompt, 5000);
    const cleaned = cleanJSONResponse(response);
    const plan = JSON.parse(cleaned);

    if (!plan.steps || plan.steps.length === 0) throw new Error('No steps in response');

    plan.steps = plan.steps.slice(0, 6).map((s, i) => ({
      stepNumber: i + 1,
      title: s.title || `Step ${i + 1}`,
      explanation: s.explanation || '',
      action: s.action || '',
      estimatedTime: s.estimatedTime || '15 min',
      completed: false,
      resources: Array.isArray(s.resources) ? s.resources.slice(0, 2).map(r => ({
        type: (r.type || 'article').toLowerCase(),
        title: r.title || 'Resource',
        url: r.url || '#'
      })) : []
    }));

    plan.objectives = Array.isArray(plan.objectives) ? plan.objectives.slice(0, 3) : [];
    plan.estimatedTime = plan.estimatedTime || '2 hours';

    console.log(`✅ generateTopicStepPlan: ${plan.steps.length} steps for "${topicTitle}"`);
    return plan;
  } catch (error) {
    console.error('❌ generateTopicStepPlan failed:', error.message);
    return {
      objectives: [
        `Student will be able to explain core concepts of ${topicTitle}`,
        `Student will be able to apply ${topicTitle} in practical scenarios`,
        `Student will understand best practices for ${topicTitle}`
      ],
      estimatedTime: '2 hours',
      steps: [
        {
          stepNumber: 1,
          title: 'Understand the Fundamentals',
          explanation: `Learn the core concepts behind ${topicTitle} and why they matter in ${field}.`,
          action: 'Read the official documentation or an introductory article.',
          estimatedTime: '20 min',
          completed: false,
          resources: [
            { type: 'article', title: `Introduction to ${topicTitle}`, url: 'https://developer.mozilla.org' },
            { type: 'youtube', title: `${topicTitle} Explained`, url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(topicTitle) }
          ]
        },
        {
          stepNumber: 2,
          title: 'Study Key Concepts',
          explanation: `Explore the most important ideas and patterns within ${topicTitle}.`,
          action: 'Watch a tutorial video and take notes on key patterns.',
          estimatedTime: '30 min',
          completed: false,
          resources: [
            { type: 'youtube', title: `${topicTitle} Tutorial`, url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(topicTitle + ' tutorial') },
            { type: 'article', title: `${topicTitle} Guide`, url: 'https://www.freecodecamp.org' }
          ]
        },
        {
          stepNumber: 3,
          title: 'Practice with Examples',
          explanation: `Reinforce your understanding by working through real-world examples.`,
          action: 'Complete 2-3 practice exercises or code challenges.',
          estimatedTime: '40 min',
          completed: false,
          resources: [
            { type: 'article', title: `${topicTitle} Examples`, url: 'https://www.w3schools.com' },
            { type: 'article', title: `${topicTitle} Exercises`, url: 'https://exercism.org' }
          ]
        }
      ]
    };
  }
}

module.exports = {
  generateAssessmentQuestions,
  generateLearningPath,
  generateResourceRecommendations,
  generateTopicStepPlan,
  generateQuizFromContext,
  generateTopicQuiz,
  callOpenRouter
};