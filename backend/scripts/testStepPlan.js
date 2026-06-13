'use strict';
// backend/scripts/testStepPlan.js
//
// Phase 7 comparison test for the Day 3 persona wiring.
// Run: node backend/scripts/testStepPlan.js
// Requires OPENROUTER_API_KEY in .env (loaded via dotenv).
//
// Outputs full step plan JSON for each topic + FM1-FM8 checklist.
// Same 4 topics as testTopicGuide.js for side-by-side comparison.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { generateTopicStepPlan } = require('../services/ai-service');

// ── Test topics ───────────────────────────────────────────────────────────────
// Same 4 audit topics as testTopicGuide.js.
// subtopics drive step count and step titles when provided.

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
        subtopics: [
            { title: 'Why Non-linearity Matters', description: 'The problem with stacked linear layers' },
            { title: 'The Common Activation Functions', description: 'ReLU, Sigmoid, Tanh — when to use each' },
            { title: 'Choosing an Activation Function', description: 'Decision guide for hidden vs output layers' },
            { title: 'Implementing and Testing', description: 'Swap activation functions and observe effects' },
        ],
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
        subtopics: [
            { title: 'The Loss Landscape', description: 'What gradient descent is trying to do' },
            { title: 'The Update Rule', description: 'How parameters move in the direction of the gradient' },
            { title: 'Learning Rate and Convergence', description: 'Too fast vs too slow — and how to diagnose' },
            { title: 'Variants: Batch, Mini-batch, Stochastic', description: 'When to use which' },
        ],
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
        subtopics: [
            { title: 'Why Hooks Exist', description: 'What class components got wrong' },
            { title: 'useState in Practice', description: 'Reading and updating component state' },
            { title: 'Rules of Hooks', description: 'The two rules and why they exist' },
            { title: 'Your First Custom Hook', description: 'Extract logic into a reusable function' },
        ],
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
        subtopics: [
            { title: 'Resources and URLs', description: 'Naming conventions and URL structure' },
            { title: 'HTTP Methods', description: 'GET, POST, PUT, PATCH, DELETE — which to use when' },
            { title: 'Status Codes', description: 'The ones you actually need to know' },
            { title: 'Request and Response Shape', description: 'JSON structure, error envelopes, pagination' },
        ],
    },
];

// ── Separator ─────────────────────────────────────────────────────────────────
const HR = '═'.repeat(80);

// ── FM checklist for manual review ───────────────────────────────────────────
const FM_CHECKLIST = `
Manual FM classification (check each step's explanation, teacherNote, commonMistake, action):
  FM1 (encyclopedia opening)  — does explanation[0] open with a definition?
  FM2 (list without decision) — are 3+ options listed in any step without a pick-X-when-Y guide?
  FM3 (generic action)        — does any action pass the swap-test (works for any topic)?
  FM4 (generic warning)       — is any commonMistake just "be careful with X"?
  FM5 (no dependency refs)    — do any steps reference prior/upcoming topics from the context?
  FM6 (decoration not teaching) — are callout-style elements used without sharpening the point?
  FM7 (no capability anchor)  — does the last step leave a working artifact or demonstrable skill?
  FM8 (AI-ish language)       — any banned phrases (let's dive in, robust, empower, etc.)?
`;

async function runTest(topic) {
    console.log(`\n${HR}`);
    console.log(`${topic.label} — ${topic.topicTitle}`);
    console.log(HR);
    console.log(`Field: ${topic.field} | Level: ${topic.level}`);
    console.log(`Module: ${topic.moduleTitle}`);
    console.log(`Prior  (${topic.priorTopics.length}): ${topic.priorTopics.join(', ')}`);
    console.log(`Upcoming (${topic.upcomingTopics.length}): ${topic.upcomingTopics.join(', ')}`);
    console.log(`Subtopics (${topic.subtopics.length}): ${topic.subtopics.map(s => s.title).join(', ')}`);
    console.log();

    const start = Date.now();
    let plan;
    try {
        plan = await generateTopicStepPlan(
            topic.field,
            topic.level,
            topic.topicTitle,
            topic.moduleTitle,
            topic.subtopics,
            topic.priorTopics,
            topic.upcomingTopics,
            topic.topicDescription,
            topic.courseOrPathTitle
        );
    } catch (err) {
        console.error(`❌ Generation failed: ${err.message}`);
        return;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const stepCount = plan.steps ? plan.steps.length : 0;
    const totalChars = JSON.stringify(plan).length;

    console.log(`── Output (${stepCount} steps, ${totalChars} chars, ${elapsed}s) ──`);
    console.log();
    console.log(JSON.stringify(plan, null, 2));
    console.log();
    console.log(FM_CHECKLIST);
}

(async () => {
    console.log('Step Plan Quality Test — Day 3 Comparison');
    console.log(`Model: ${process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct'}`);
    console.log(`Running ${TOPICS.length} topics sequentially...`);

    for (let i = 0; i < TOPICS.length; i++) {
        await runTest(TOPICS[i]);
        if (i < TOPICS.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n${HR}`);
    console.log('All topics complete. Review outputs above and classify FM1–FM8 for each.');
    console.log(HR);
})();
