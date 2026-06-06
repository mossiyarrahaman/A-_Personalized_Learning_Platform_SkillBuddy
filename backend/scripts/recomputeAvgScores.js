'use strict';
/**
 * scripts/recomputeAvgScores.js
 *
 * One-time migration: recomputes avgQuizScore on every Progress doc and
 * recomputes stats.avgScore on every StudentProfile from scratch.
 * stats.avgScore is merged from BOTH Progress.topicQuizScores (teacher-course
 * quizzes) AND StudentProfile.quizHistory (AI-path quizzes).
 *
 * Run ONCE after deploying the Phase-2 / quizHistory fix code changes:
 *   node backend/scripts/recomputeAvgScores.js
 *
 * Safe to re-run — it overwrites with the same result each time.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Progress = require('../models/Progress');
const StudentProfile = require('../models/StudentProfile');

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('No MONGODB_URI / MONGO_URI in environment. Aborting.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // ── Step 1: recompute Progress.avgQuizScore ───────────────────────────────
    const progressDocs = await Progress.find({}).select('topicQuizScores avgQuizScore').lean();
    console.log(`Recomputing avgQuizScore for ${progressDocs.length} Progress docs…`);

    let progressFixed = 0;
    for (const doc of progressDocs) {
        const scores = (doc.topicQuizScores || []).map(q => q.score);
        const computed = scores.length
            ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
            : 0;
        if (computed !== doc.avgQuizScore) {
            await Progress.updateOne({ _id: doc._id }, { $set: { avgQuizScore: computed } });
            progressFixed++;
        }
    }
    console.log(`  → ${progressFixed} Progress docs updated.`);

    // ── Step 2: recompute StudentProfile.stats.avgScore ───────────────────────
    // Merge teacher-course scores (Progress.topicQuizScores) with AI-path
    // scores (StudentProfile.quizHistory) — mirrors the read-side merge in
    // getMyQuizStats so the persisted value matches what students see.
    const profiles = await StudentProfile.find({}).select('userId stats quizHistory').lean();
    console.log(`Recomputing stats.avgScore for ${profiles.length} StudentProfile docs…`);

    let profilesFixed = 0;
    for (const profile of profiles) {
        const allProgressDocs = await Progress.find({ student: profile.userId })
            .select('topicQuizScores').lean();
        const courseScores = allProgressDocs.flatMap(p => (p.topicQuizScores || []).map(q => q.score));
        const aiPathScores = (profile.quizHistory || []).map(q => q.score);
        const allScores = [...courseScores, ...aiPathScores];
        const computed = allScores.length
            ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
            : 0;
        const existing = profile.stats?.avgScore ?? 0;
        if (computed !== existing) {
            await StudentProfile.updateOne(
                { _id: profile._id },
                { $set: { 'stats.avgScore': computed } }
            );
            profilesFixed++;
        }
    }
    console.log(`  → ${profilesFixed} StudentProfile docs updated.`);

    console.log('Migration complete.');
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
