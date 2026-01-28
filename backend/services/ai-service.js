// ============================================================================
// SKILLBUDDY AI SERVICE - OpenRouter Integration
// backend/services/ai-service.js
// ============================================================================

const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';
const SITE_NAME = process.env.SITE_NAME || 'SkillBuddy';

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️ OPENROUTER_API_KEY not found in .env file');
}

// Helper function to clean AI responses
function cleanJSONResponse(text) {
  // Remove markdown code blocks
  let cleaned = text.trim()
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find JSON array or object in the response
  const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  const objectMatch = cleaned.match(/\{\s*"[\s\S]*\}/);

  if (arrayMatch) {
    cleaned = arrayMatch[0];
  } else if (objectMatch) {
    cleaned = objectMatch[0];
  }

  return cleaned;
}

async function callOpenRouter(prompt, maxTokens = 3000) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  try {
    console.log('🤖 Calling OpenRouter AI...');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful educational assistant. Always respond with valid JSON only, no markdown formatting or explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
          'Content-Type': 'application/json',
        },
        timeout: 45000 // Increased timeout for larger models
      }
    );

    const content = response.data.choices[0]?.message?.content;
    console.log('✅ OpenRouter response received, length:', content?.length);
    return content;
  } catch (error) {
    console.error('❌ OpenRouter API Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

async function generateAssessmentQuestions(field, level, count = 5) {
  const prompt = `Generate exactly ${count} multiple-choice questions for a ${level} level assessment in ${field}.

CRITICAL: Return ONLY valid JSON array, no markdown.

Format:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Why it is correct",
    "hint": "Helpful hint",
    "bloomLevel": "understand",
    "topic": "Specific topic"
  }
]

Requirements:
- Exactly ${count} questions
- correctAnswer must match one option exactly
- bloomLevel: remember, understand, apply, analyze, evaluate, or create`;

  try {
    const response = await callOpenRouter(prompt);
    const cleaned = cleanJSONResponse(response);
    const questions = JSON.parse(cleaned);

    // Validation
    if (!Array.isArray(questions)) throw new Error('Not an array');

    // Normalize
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
    console.error('AI Gen Questions Failed:', error);
    // Return fallback
    return Array.from({ length: count }, (_, i) => ({
      question: `Fallback Question ${i + 1} for ${field}`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      explanation: 'Fallback',
      hint: 'Fallback',
      bloomLevel: 'remember',
      topic: field
    }));
  }
}

async function generateLearningPath(field, level, goals, quizResults = null) {
  const goalsText = Array.isArray(goals) ? goals.join(', ') : goals;

  let quizContext = "";
  if (quizResults) {
    const score = quizResults.score || 0;
    const total = quizResults.total || 5;
    const percentage = (score / total) * 100;
    const weakTopics = quizResults.details?.filter(d => !d.isCorrect).map(d => d.topic).join(', ') || "none";

    let adaptationInstruction = "";
    if (percentage < 40) {
      adaptationInstruction = "CRITICAL: The student struggled with the diagnostic (Score < 40%). You MUST include a dedicated 'Foundations & Review' module as Week 1 to bridge gaps, even if the requested level is higher.";
    } else if (percentage > 80) {
      adaptationInstruction = "CRITICAL: The student performed excellently (Score > 80%). You MUST skip generic basics and focus on advanced concepts, case studies, and complex applications immediately.";
    } else {
      adaptationInstruction = `The student has an average grasp. Ensure to specifically cover these weak topics in early modules: ${weakTopics}.`;
    }

    quizContext = `
    DIAGNOSTIC RESULTS:
    - Score: ${score}/${total}
    - Weak Topics: ${weakTopics}
    - ADAPTATION INSTRUCTION: ${adaptationInstruction}
    `;
  }

  const prompt = `Create a comprehensive 8-week personalized learning roadmap for a ${level} level student in ${field}.
  Student goals: ${goalsText}
  ${quizContext}
  
  CRITICAL: Return ONLY valid JSON, no markdown.
  
  Instructions:
  1. Act as an expert PERSONAL TUTOR. Write in an encouraging, instructional tone (e.g., "Start by...", "I want you to...").
  2. Break down the course into 8 Modules (one per Week).
  3. Inside each module, provide 3-5 concrete Topics/Tasks.
  4. Prefix Topic titles with a timeline (e.g., "Day 1-2: [Topic]").
  5. The 'description' must be a detailed, step-by-step guide on WHAT to do.
  
  Format:
  {
    "modules": [
      {
        "title": "Week 1: [Module Name]",
        "description": "In this first week, we will focus on establishing your foundation...",
        "duration": "1 week",
        "topics": [
          {
            "title": "Day 1-2: [Topic Title]",
            "description": "First, download VS Code. Then, create a new file called index.html. I want you to practice writing standard HTML5 boilerplate..."
          }
        ]
      }
    ]
  }
  
  Generate 8 modules.`;

  try {
    const response = await callOpenRouter(prompt, 3500);
    const cleaned = cleanJSONResponse(response);
    let learningPath = JSON.parse(cleaned);

    if (!learningPath.modules) throw new Error('No modules found');

    return learningPath;
  } catch (error) {
    console.error('AI Path Gen Failed:', error);
    return {
      modules: Array.from({ length: 4 }, (_, i) => ({
        title: `Module ${i + 1}: ${field} Basics`,
        description: 'Fallback module content',
        duration: '1 week',
        topics: [
          { title: 'Intro', description: 'Basics' },
          { title: 'Practice', description: 'Hands on' }
        ]
      }))
    };
  }
}

async function generateResourceRecommendations(field, level, weakTopics) {
  const topicsText = Array.isArray(weakTopics) ? weakTopics.join(', ') : 'general concepts';

  const prompt = `As an expert teacher, provide a comprehensive lesson plan for ${level} ${field}, focusing on: ${topicsText}.
    
    CRITICAL: Return ONLY valid JSON.
    
    Requirements:
    1. **Content**: A detailed, 300-500 word explanatory guide/mini-lesson on the topic. Use clear sections (Introduction, Key Concepts, Examples, Summary).
    2. **Resources**: 5 high-quality links (YouTube, Books, Web).
    
    Format:
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
    }`;

  try {
    const response = await callOpenRouter(prompt);
    const cleaned = cleanJSONResponse(response);
    const res = JSON.parse(cleaned);
    return res;
  } catch (error) {
    console.error('AI Resource/Content Gen Failed:', error);
    return {
      content: `### Overview\nHere is a brief overview of ${topicsText}.\n\n(AI generation failed, please consult resources)`,
      recommendations: [
        { type: 'article', title: `${field} Documentation`, url: 'https://docs.google.com', difficulty: level, topic: field }
      ]
    };
  }
}

module.exports = {
  generateAssessmentQuestions,
  generateLearningPath,
  generateResourceRecommendations,
  callOpenRouter
};