'use strict';
// backend/scripts/testTopicGuide.js
//
// Phase 6 comparison test for the Day 2 persona wiring.
// Run:  node backend/scripts/testTopicGuide.js
// Requires OPENROUTER_API_KEY in .env (loaded via dotenv).
//
// Outputs full generated content for each topic so you can compare
// against Day 1 audit baselines and classify FM1–FM8 for each.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { generateTopicGuide } = require('../services/ai-service');

// ── Test topics ──────────────────────────────────────────────────────────────
// Edit these to match the exact topics from your Day 1 audit.
// priorTopics/upcomingTopics come from the surrounding curriculum context.

const TOPICS = [
    {
        label: 'Topic A',
        field: 'Machine Learning',
        level: 'intermediate',
        topicTitle: 'Activation Functions',
        topicDescription: 'Non-linear transformations applied to neural network layer outputs',
        moduleTitle: 'Neural Networks',
        courseOrPathTitle: 'Machine Learning Learning Path',
        priorTopics: ['Introduction to ML', 'Linear Regression', 'Logistic Regression', 'Neural Network Basics'],
        upcomingTopics: ['Backpropagation', 'Optimizers'],
    },
    {
        label: 'Topic B',
        field: 'Machine Learning',
        level: 'intermediate',
        topicTitle: 'Gradient Descent',
        topicDescription: 'Iterative optimization algorithm for minimizing loss functions',
        moduleTitle: 'Model Training',
        courseOrPathTitle: 'Machine Learning Learning Path',
        priorTopics: ['Loss Functions', 'Neural Networks', 'Activation Functions'],
        upcomingTopics: ['Backpropagation', 'Adam Optimizer', 'Learning Rate Scheduling'],
    },
    {
        label: 'Topic C',
        field: 'Web Development',
        level: 'beginner',
        topicTitle: 'React Hooks',
        topicDescription: 'Functions that let you use state and lifecycle features in functional components',
        moduleTitle: 'React Fundamentals',
        courseOrPathTitle: 'Frontend Development Learning Path',
        priorTopics: ['HTML & CSS', 'JavaScript Basics', 'React Components', 'Props and State'],
        upcomingTopics: ['useEffect', 'Custom Hooks', 'Context API'],
    },
    {
        label: 'Topic D',
        field: 'Backend Development',
        level: 'beginner',
        topicTitle: 'REST API Design',
        topicDescription: 'Principles and conventions for designing HTTP-based APIs',
        moduleTitle: 'API Development',
        courseOrPathTitle: 'Backend Development Learning Path',
        priorTopics: ['HTTP Basics', 'Node.js Introduction', 'Express Setup'],
        upcomingTopics: ['Authentication', 'Database Integration', 'Error Handling'],
    },
];

// ── Separator ─────────────────────────────────────────────────────────────────
const HR = '═'.repeat(80);

// ── FM classifier prompts for manual review ───────────────────────────────────
const FM_CHECKLIST = `
Manual FM classification (check each):
  FM1 (encyclopedia opening) — does the first sentence define the term?
  FM2 (list without decision) — are 3+ options listed without "pick X when Y"?
  FM3 (generic actions) — does the action item work for any topic?
  FM4 (generic warnings) — is the mistake callout topic-specific?
  FM5 (no dependency refs) — does the guide reference prior/next topics?
  FM6 (decoration over teaching) — are callouts used just for visual interest?
  FM7 (no capability anchor) — does the student know what they can DO after?
  FM8 (AI-ish language) — any banned phrases (let's dive in, robust, etc.)?
`;

async function runTest(topic, idx) {
    console.log(`\n${HR}`);
    console.log(`${topic.label} — ${topic.topicTitle}`);
    console.log(HR);
    console.log(`Field: ${topic.field} | Level: ${topic.level}`);
    console.log(`Module: ${topic.moduleTitle}`);
    console.log(`Prior topics (${topic.priorTopics.length}): ${topic.priorTopics.join(', ')}`);
    console.log(`Upcoming topics (${topic.upcomingTopics.length}): ${topic.upcomingTopics.join(', ')}`);
    console.log();

    const start = Date.now();
    let content;
    try {
        content = await generateTopicGuide(
            topic.field,
            topic.level,
            topic.topicTitle,
            topic.topicDescription,
            topic.priorTopics,
            topic.upcomingTopics,
            topic.moduleTitle,
            topic.courseOrPathTitle
        );
    } catch (err) {
        console.error(`❌ Generation failed: ${err.message}`);
        return;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const wordCount = content.trim().split(/\s+/).length;
    const charCount = content.length;

    console.log(`── Output (${wordCount} words, ${charCount} chars, ${elapsed}s) ──`);
    console.log();
    console.log(content);
    console.log();
    console.log(FM_CHECKLIST);
}

(async () => {
    console.log('Topic Guide Quality Test — Day 2 Comparison');
    console.log(`Model: ${process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct'}`);
    console.log(`Running ${TOPICS.length} topics sequentially...`);

    for (let i = 0; i < TOPICS.length; i++) {
        await runTest(TOPICS[i], i);
        // Brief pause between calls to avoid rate-limiting
        if (i < TOPICS.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n${HR}`);
    console.log('All topics complete. Review outputs above and classify FM1–FM8 for each.');
    console.log(HR);
})();
