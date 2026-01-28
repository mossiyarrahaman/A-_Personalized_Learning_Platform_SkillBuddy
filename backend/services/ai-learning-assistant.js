// ============================================================================
// AI LEARNING ASSISTANT - Master Service
// Implements the 6-Task AI System from AI_SYSTEM_PROMPT.md
// ============================================================================

const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

// Load the Master AI Prompt
const MASTER_SYSTEM_PROMPT = `
You are an AI Learning Assistant integrated into an AI-based personalized e-learning platform.

Your responsibilities:
1. Recommend learning resources (videos, web articles, PDFs)
2. Track student interactions with those resources
3. Generate quizzes/questions during and after learning
4. Evaluate student strength & weakness
5. Adapt future learning paths automatically
6. Provide analytics-ready outputs for teachers

IMPORTANT CONSTRAINTS:
- Do NOT hallucinate facts
- Keep language simple & academic
- Be concise but structured
- Ensure JSON outputs are valid
- Maintain student privacy
- Avoid repetitive questions
`;

// Helper: Call OpenRouter with Master Prompt
async function callAI(userPrompt, maxTokens = 2000) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: AI_MODEL,
                messages: [
                    { role: 'system', content: MASTER_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 45000
            }
        );

        return response.data.choices[0]?.message?.content;
    } catch (error) {
        console.error('❌ AI Assistant Error:', error.message);
        throw error;
    }
}

// Helper: Clean JSON from AI response
function parseJSON(text) {
    const cleaned = text.trim()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const match = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : cleaned);
}

// ============================================================================
// TASK 1: RESOURCE RECOMMENDATION
// ============================================================================
async function recommendResources(studentProfile) {
    const prompt = `
TASK: Resource Recommendation

Student Profile:
${JSON.stringify(studentProfile, null, 2)}

Recommend 3-5 high-quality learning resources that match:
- Student level
- Topic relevance
- Previous progress
- Identified weaknesses

Rules:
- Prefer beginner-friendly resources if student score < 50%
- Avoid recommending already completed resources
- Rank by: Relevance, Difficulty match, Popularity

Output Format (JSON only):
{
  "recommended_resources": [
    {
      "title": "Resource Title",
      "type": "video | article | pdf",
      "url": "https://...",
      "difficulty": "beginner | intermediate | advanced",
      "reason": "Why this resource is recommended"
    }
  ]
}`;

    try {
        const response = await callAI(prompt);
        return parseJSON(response);
    } catch (error) {
        console.error('Resource recommendation failed:', error);
        return { recommended_resources: [] };
    }
}

// ============================================================================
// TASK 2: QUIZ / QUESTION GENERATION
// ============================================================================
async function generateQuiz(resource, studentLevel, progressPercentage) {
    const prompt = `
TASK: Quiz Generation

Learning Resource:
${JSON.stringify(resource, null, 2)}

Student Level: ${studentLevel}
Current Progress: ${progressPercentage}%

Generate 3-5 context-aware questions from the learning content.

Rules:
- Match difficulty with student level
- Align questions with Bloom's Taxonomy
- Question types: MCQ, True/False, Short-answer

Output Format (JSON only):
{
  "quiz": {
    "quiz_id": "Q_${Date.now()}",
    "questions": [
      {
        "type": "MCQ",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "difficulty": "beginner",
        "concept": "Topic name",
        "bloom_level": "understand"
      }
    ]
  }
}`;

    try {
        const response = await callAI(prompt);
        return parseJSON(response);
    } catch (error) {
        console.error('Quiz generation failed:', error);
        return { quiz: { quiz_id: `Q_${Date.now()}`, questions: [] } };
    }
}

// ============================================================================
// TASK 2.5: CONTEXT-AWARE QUIZ GENERATION (USER REQUESTED)
// ============================================================================
async function generateContextAwareQuiz(topic, resources, bloomLevel) {
    const prompt = `
TASK: Context-Aware Quiz Generation based on Bloom's Taxonomy

Topic: ${topic.title}
Description: ${topic.description}

Available Resources Content:
${resources.map(r => `- [${r.type}] ${r.title}: ${r.content || r.description || 'No text content available'}`).join('\n')}

Bloom's Taxonomy Level: ${bloomLevel}

Generate 5 high-quality quiz questions based ONLY on the provided resources and topic.
The questions must align with the specified Bloom's Taxonomy level (${bloomLevel}).

Requirements:
- Questions must be relevant to the context.
- Provide a clear, educational explanation for the correct answer.
- Question types: MCQ (Multiple Choice).
- Ensure distractors (wrong answers) are plausible.

Output Format (JSON only):
{
  "quiz": {
    "topic": "${topic.title}",
    "bloom_level": "${bloomLevel}",
    "questions": [
      {
        "type": "MCQ",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Detailed explanation of why A is correct and how it relates to the concept."
      }
    ]
  }
}`;

    try {
        const response = await callAI(prompt);
        return parseJSON(response);
    } catch (error) {
        console.error('Context-aware quiz generation failed:', error);
        return { quiz: { topic: topic.title, questions: [] } };
    }
}

// ============================================================================
// TASK 3: REAL-TIME STRENGTH EVALUATION
// ============================================================================
function evaluateStrength(quizResponses) {
    const totalQuestions = quizResponses.length;
    const correctAnswers = quizResponses.filter(r => r.isCorrect).length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Group by concept/topic
    const conceptScores = {};
    quizResponses.forEach(r => {
        const concept = r.concept || 'General';
        if (!conceptScores[concept]) {
            conceptScores[concept] = { correct: 0, total: 0 };
        }
        conceptScores[concept].total++;
        if (r.isCorrect) conceptScores[concept].correct++;
    });

    const strengthAnalysis = Object.entries(conceptScores).map(([topic, data]) => ({
        topic,
        score: Math.round((data.correct / data.total) * 100),
        status: (data.correct / data.total) >= 0.7 ? 'strong' : (data.correct / data.total) >= 0.5 ? 'moderate' : 'weak'
    }));

    return {
        overall_score: score,
        strength_analysis: strengthAnalysis
    };
}

// ============================================================================
// TASK 4: ADAPTIVE LEARNING LOGIC
// ============================================================================
function adaptLearningPath(strengthAnalysis) {
    const overallScore = strengthAnalysis.overall_score;
    const weakTopics = strengthAnalysis.strength_analysis
        .filter(s => s.status === 'weak')
        .map(s => s.topic);

    let nextStep, reason;

    if (overallScore < 50) {
        nextStep = 'recommend_basic_resources';
        reason = 'Low quiz score detected. Recommending foundational content.';
    } else if (overallScore >= 80) {
        nextStep = 'unlock_advanced_content';
        reason = 'High performance. Unlocking advanced modules.';
    } else {
        nextStep = 'continue_current_path';
        reason = 'Moderate performance. Continue with current learning path.';
    }

    return {
        learning_action: {
            next_step: nextStep,
            reason: reason,
            weak_topics: weakTopics,
            recommended_interventions: weakTopics.length > 0 ?
                ['Additional practice quizzes', 'Simplified resources', 'Peer discussion'] :
                ['Continue progress', 'Challenge exercises']
        }
    };
}

// ============================================================================
// TASK 5: TRACKING & MONITORING
// ============================================================================
function createTrackingEvent(studentId, resourceId, eventType) {
    return {
        tracking_event: {
            student_id: studentId,
            resource_id: resourceId,
            event: eventType, // resource_view_start, resource_view_end, quiz_started, quiz_completed, resource_completed
            timestamp: new Date().toISOString()
        }
    };
}

// ============================================================================
// TASK 6: TEACHER ANALYTICS SUPPORT
// ============================================================================
async function generateTeacherInsights(studentData) {
    const prompt = `
TASK: Teacher Analytics

Student Data:
${JSON.stringify(studentData, null, 2)}

Provide structured insights for the teacher dashboard.

Output Format (JSON only):
{
  "teacher_insight": {
    "student_id": "${studentData.student_id}",
    "weak_topics": ["Topic1", "Topic2"],
    "strong_topics": ["Topic3"],
    "engagement_level": "high | medium | low",
    "recommended_intervention": "Specific action for teacher",
    "risk_level": "none | low | medium | high"
  }
}`;

    try {
        const response = await callAI(prompt);
        return parseJSON(response);
    } catch (error) {
        console.error('Teacher insights generation failed:', error);
        return {
            teacher_insight: {
                student_id: studentData.student_id,
                weak_topics: [],
                recommended_intervention: 'Manual review needed'
            }
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
    recommendResources,          // Task 1
    generateQuiz,                // Task 2
    evaluateStrength,            // Task 3
    adaptLearningPath,           // Task 4
    createTrackingEvent,         // Task 5
    generateTeacherInsights,      // Task 6
    generateContextAwareQuiz     // Task 2.5
};
