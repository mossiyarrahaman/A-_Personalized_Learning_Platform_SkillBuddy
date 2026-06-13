'use strict';
// backend/scripts/testLearningPath.js
//
// Phase 5 comparison test for the Day 4 persona wiring.
// Run: node backend/scripts/testLearningPath.js
// Requires OPENROUTER_API_KEY in .env (loaded via dotenv).
//
// Outputs full roadmap JSON for each test field + 5 verification checks.
// Same pattern as testTopicGuide.js and testStepPlan.js.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { generateLearningPath } = require('../services/ai-service');

// ── Test cases ─────────────────────────────────────────────────────────────────
const TESTS = [
    {
        label: 'TEST 1',
        field: 'Machine Learning Engineer',
        level: 'intermediate',
        goals: 'Build and deploy ML models in production',
        background: 'Familiar with Python and basic statistics',
        quizResults: null,
    },
    {
        label: 'TEST 2',
        field: 'Frontend Developer',
        level: 'beginner',
        goals: 'Build interactive web apps with React',
        background: '',
        quizResults: null,
    },
    {
        label: 'TEST 3',
        field: 'Backend Developer',
        level: 'intermediate',
        goals: 'Build scalable REST APIs and microservices',
        background: 'Knows JavaScript and basic Node.js',
        quizResults: null,
    },
    {
        label: 'TEST 4',
        field: 'Data Engineer',
        level: 'beginner',
        goals: 'Build data pipelines and work with cloud data warehouses',
        background: '',
        quizResults: null,
    },
];

const HR = '='.repeat(80);

async function runTest(t) {
    console.log(`\n${HR}`);
    console.log(`${t.label} — ${t.field} (${t.level})`);
    console.log(HR);
    if (t.background) console.log(`Background: ${t.background}`);
    if (t.goals)      console.log(`Goals: ${t.goals}`);
    console.log();

    const start = Date.now();
    let roadmap;
    try {
        roadmap = await generateLearningPath(
            t.field,
            t.level,
            t.goals,
            t.quizResults,
            t.background
        );
    } catch (err) {
        console.error(`❌ Generation failed: ${err.message}`);
        return;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    // ── Stats ──────────────────────────────────────────────────────────────────
    const phases      = roadmap.phases || [];
    const totalMods   = phases.reduce((s, ph) => s + (ph.modules || []).length, 0);
    const totalTopics = phases.reduce((s, ph) =>
        s + (ph.modules || []).reduce((ms, m) => ms + (m.topics || []).length, 0), 0);
    const totalProjects = phases.reduce((s, ph) =>
        s + (ph.modules || []).reduce((ms, m) => ms + (m.practiceProjects || []).length, 0), 0);
    const rawJson    = JSON.stringify(roadmap);
    const wordCount  = rawJson.replace(/[^a-z ]/gi, ' ').trim().split(/\s+/).length;

    console.log(`── Stats: ${phases.length} phases | ${totalMods} modules | ${totalTopics} topics | ${totalProjects} projects | ${rawJson.length} chars | ${wordCount} words | ${elapsed}s ──`);
    console.log();
    console.log(JSON.stringify(roadmap, null, 2));

    // ── Verification checks ────────────────────────────────────────────────────
    console.log(`\n── Verification checks ──`);

    // CHECK 1: Phase goals are specific
    console.log('\nCHECK 1 — Phase goals specificity:');
    phases.forEach((ph, i) => {
        const goal = ph.goal || '(empty)';
        const vague = /master|learn|understand|explore|overview|introduction/i.test(goal) && goal.length < 80;
        console.log(`  Phase ${ph.phase || i+1} "${ph.title}": ${vague ? '❌ VAGUE' : '✅ specific'}`);
        console.log(`    "${goal}"`);
    });

    // CHECK 2: Module 2+ bridges from previous module (within each phase)
    console.log('\nCHECK 2 — Module dependency bridging (Module 2+ within each phase):');
    phases.forEach((ph) => {
        const mods = ph.modules || [];
        if (mods.length < 2) {
            console.log(`  Phase ${ph.phase} "${ph.title}": only 1 module, skip`);
            return;
        }
        for (let i = 1; i < mods.length; i++) {
            const desc = mods[i].description || '';
            // Heuristic: does it reference "module 1", "previous", "built", "now that", etc.?
            const bridges = /now that|building on|previous|module \d|after|having|you (have|built|learned|covered)/i.test(desc);
            console.log(`  Phase ${ph.phase} Mod ${i+1} "${mods[i].title}": ${bridges ? '✅ bridges' : '❌ no bridge'}`);
            console.log(`    "${desc.slice(0, 120)}"`);
        }
    });

    // CHECK 3: Practice projects swap-test (pick 1 per phase)
    console.log('\nCHECK 3 — Practice project specificity (1 per phase):');
    phases.forEach((ph) => {
        const mods = ph.modules || [];
        for (const m of mods) {
            const projs = m.practiceProjects || [];
            if (projs.length > 0) {
                const proj = projs[0];
                const generic = /apply what|build a project|practice (these|this|the)|implement an example/i.test(proj);
                const hasSuccessCriterion = /success|criterion|pass|verify|test|check|accuracy|result/i.test(proj);
                console.log(`  Phase ${ph.phase} "${m.title}": ${generic ? '❌ generic' : '✅ specific'} | success criterion: ${hasSuccessCriterion ? '✅' : '❌'}`);
                console.log(`    "${proj.slice(0, 150)}"`);
                break;
            }
        }
    });

    // CHECK 4: No vocabulary bleed (ML terms in non-ML topics)
    console.log('\nCHECK 4 — No vocabulary bleed:');
    const fieldLower = t.field.toLowerCase();
    const isML = /machine learning|ml|data science/i.test(fieldLower);
    const mlTerms = ['mnist', 'neural network', 'pytorch', 'tensorflow', 'training loss', 'test accuracy', 'epoch', 'gradient'];
    if (!isML) {
        let bleeds = [];
        const allText = rawJson.toLowerCase();
        for (const term of mlTerms) {
            if (allText.includes(term)) bleeds.push(term);
        }
        if (bleeds.length === 0) {
            console.log('  ✅ No ML vocabulary found in non-ML roadmap');
        } else {
            console.log(`  ❌ ML vocabulary found in non-ML roadmap: ${bleeds.join(', ')}`);
        }
    } else {
        console.log('  ✅ ML field — skipping bleed check');
    }

    // CHECK 5: FM5 (dependency refs) — any phase goal or module desc mention field-specific tools by name?
    console.log('\nCHECK 5 — Concrete tool/library references in phase goals:');
    phases.forEach((ph) => {
        const goal = ph.goal || '';
        // Heuristic: does it name a specific library, tool, or concrete artifact?
        const concretePattern = /\b(numpy|pytorch|tensorflow|react|express|fastapi|prisma|postgres|spark|airflow|dbt|kafka|docker|aws|gcp|api|sql|pandas|sklearn|scikit|next\.?js|vue|angular|node\.?js|flask|django|redis|mongodb)\b/i;
        const hasConcrete = concretePattern.test(goal);
        console.log(`  Phase ${ph.phase} "${ph.title}": ${hasConcrete ? '✅ names tools' : '⚠️  no specific tools named'}`);
        if (goal) console.log(`    "${goal.slice(0, 120)}"`);
    });
}

(async () => {
    const RUN = TESTS.filter(t => t.label === 'TEST 3'); // Day 5: single-field bridge check
    console.log('Learning Path Quality Test — Day 5 (bridge check)');
    console.log(`Model: ${process.env.AI_MODEL || 'qwen/qwen-2.5-7b-instruct'}`);
    console.log(`Running ${RUN.length} test(s)...`);

    for (let i = 0; i < RUN.length; i++) {
        await runTest(RUN[i]);
    }

    console.log(`\n${HR}`);
    console.log('Test complete. Review bridge sentences above (CHECK 2).');
    console.log(HR);
})();
