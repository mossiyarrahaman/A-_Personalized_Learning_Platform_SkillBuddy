/**
 * models/Progress.js
 *
 * Tracks a student's journey through a teacher-created course.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT A TEACHER NEEDS TO KNOW (and where the data lives)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "Is this student keeping up?"
 *   → completedTopics.length / course.totalTopics
 *   → lastAccessed (staleness)
 *   → dailyActivity (engagement trend)
 *
 * "Where exactly are they struggling?"
 *   → topicQuizScores: per-topic quiz history with Bloom's level
 *   → quizAttemptDetails: per-question right/wrong with the exact question
 *   → weakTopics(): computed from repeated failures
 *
 * "Are they actually spending time, or just clicking through?"
 *   → resourceProgress: per-resource time tracking + completion
 *   → totalTimeSpent: aggregated across all resources
 *
 * "How does this student compare to the class?"
 *   → All Progress records for a course can be aggregated
 *   → Leaderboard: sorted by completedTopics + avgQuizScore
 *
 * "Which topics need re-teaching?"
 *   → Aggregate topicQuizScores across ALL students
 *   → Topics with avgScore < 60% or failRate > 40% = needs attention
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SCHEMA CHANGES FROM PREVIOUS VERSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Added:
 *   - topicQuizScores.bloomLevel          → Bloom's taxonomy tracking
 *   - topicQuizScores.wrongQuestions      → Exact questions answered wrong
 *   - dailyActivity[]                     → Day-by-day engagement history
 *   - totalTimeSpent                      → Pre-computed aggregate (avoids N+1)
 *   - riskFlag                            → Teacher-actionable risk indicator
 *
 * The wrongQuestions array is the key insight: it lets the teacher see not
 * just "student scored 60% on Topic X" but "student consistently gets
 * questions about recursion wrong at the Apply level". That's actionable.
 */

const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const wrongQuestionSchema = new mongoose.Schema({
    questionText: String,
    studentAnswer: String,      // What the student picked
    correctAnswer: String,      // What was right
    bloomLevel: String,         // At which cognitive level they failed
    difficulty: String,         // easy/medium/hard
    topic: String,              // Specific sub-topic
}, { _id: false });

const quizScoreSchema = new mongoose.Schema({
    topicId: { type: String, required: true },
    topicTitle: String,
    moduleId: String,
    moduleTitle: String,
    score: Number,              // Percentage 0-100
    totalQuestions: Number,
    correctAnswers: Number,
    passed: { type: Boolean, default: false },
    bloomLevel: { type: String, default: 'understand' },
    difficultyTier: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: null },
    isTeacherAssessment: { type: Boolean, default: false },
    attempts: { type: Number, default: 1 },
    wrongQuestions: [wrongQuestionSchema],
    attemptDate: { type: Date, default: Date.now },
}, { _id: true });

const resourceProgressSchema = new mongoose.Schema({
    resourceId: String,
    resourceTitle: String,
    type: String,               // video, article, pdf, etc.
    timeSpent: { type: Number, default: 0 },    // seconds
    completed: { type: Boolean, default: false },
    completedAt: Date,
    lastPosition: { type: Number, default: 0 },  // for video/audio seek
    topicId: String,            // Which topic this resource belongs to
}, { _id: false });

const dailyActivitySchema = new mongoose.Schema({
    date: { type: String, required: true },     // 'YYYY-MM-DD' format for easy grouping
    timeSpent: { type: Number, default: 0 },    // seconds
    resourcesCompleted: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    topicsCompleted: { type: Number, default: 0 },
}, { _id: false });

// ─── Main schema ─────────────────────────────────────────────────────────────

const progressSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    // ── Topic completion tracking ────────────────────────────────────────────
    completedTopics: [{ type: String }],
    completedResources: [{ type: String }],

    // ── Per-resource tracking (time, completion, position) ───────────────────
    resourceProgress: [resourceProgressSchema],

    // ── Quiz history with answer-level detail ────────────────────────────────
    topicQuizScores: [quizScoreSchema],

    // ── Daily engagement log ─────────────────────────────────────────────────
    dailyActivity: [dailyActivitySchema],

    // ── Aggregated metrics (updated on each interaction) ─────────────────────
    totalTimeSpent: { type: Number, default: 0 },       // Total seconds across all resources
    // PER-COURSE average. Recomputed from this doc's topicQuizScores array in
    // courseController (submitTopicQuiz). Single source of truth for course-level
    // analytics. Do not update this with a running-average formula.
    avgQuizScore: { type: Number, default: 0 },
    grade: { type: Number, default: 0 },                 // Computed overall grade

    // ── Risk assessment ──────────────────────────────────────────────────────
    // Computed by the analytics service based on rules:
    //   'on_track'   → completing on schedule, scores > 60%
    //   'at_risk'    → falling behind OR low scores on multiple topics
    //   'critical'   → no activity in 7+ days OR failing majority of quizzes
    //   'inactive'   → no activity in 14+ days
    riskFlag: {
        type: String,
        enum: ['on_track', 'at_risk', 'critical', 'inactive'],
        default: 'on_track',
    },

    // ── Metadata ─────────────────────────────────────────────────────────────
    lastAccessed: { type: Date, default: Date.now },
    enrollmentDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['active', 'completed', 'dropped'],
        default: 'active',
    },
});

// ── Indexes ──────────────────────────────────────────────────────────────────

progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ course: 1, riskFlag: 1 });
progressSchema.index({ course: 1, avgQuizScore: 1 });

// ── Helper: get today's date string ──────────────────────────────────────────

// tzOffsetMinutes is the value returned by the browser's
// new Date().getTimezoneOffset() — positive for UTC-west, negative for UTC-east.
// For IST (UTC+5:30) that value is -330.
// JS's getTimezoneOffset() gives: offset = UTC_minutes - local_minutes,
// so  local_time = UTC - offset_minutes.
// Subtracting it from now.getTime() shifts the UTC timestamp to the local
// wall-clock value, then .toISOString().slice(0,10) gives the local date.
function localDateStr(tzOffsetMinutes = 0) {
    const now = new Date();
    const local = new Date(now.getTime() - tzOffsetMinutes * 60000);
    return local.toISOString().slice(0, 10);
}

// ── Instance method: record daily activity ───────────────────────────────────

progressSchema.methods.recordActivity = function ({ timeSpent = 0, resourceCompleted = false, quizTaken = false, topicCompleted = false, tzOffsetMinutes = 0 }) {
    const today = localDateStr(tzOffsetMinutes);
    let entry = this.dailyActivity.find(d => d.date === today);

    if (!entry) {
        this.dailyActivity.push({ date: today, timeSpent: 0, resourcesCompleted: 0, quizzesTaken: 0, topicsCompleted: 0 });
        entry = this.dailyActivity[this.dailyActivity.length - 1];
    }

    entry.timeSpent += timeSpent;
    if (resourceCompleted) entry.resourcesCompleted += 1;
    if (quizTaken) entry.quizzesTaken += 1;
    if (topicCompleted) entry.topicsCompleted += 1;

    this.totalTimeSpent += timeSpent;
    this.lastAccessed = new Date();
};

// ── Instance method: compute risk flag ───────────────────────────────────────

progressSchema.methods.computeRiskFlag = function (totalTopicsInCourse) {
    const daysSinceActive = (Date.now() - new Date(this.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActive > 14) {
        this.riskFlag = 'inactive';
        return;
    }
    if (daysSinceActive > 7) {
        this.riskFlag = 'critical';
        return;
    }

    // Check quiz performance
    const recentQuizzes = this.topicQuizScores.slice(-10);
    const failCount = recentQuizzes.filter(q => !q.passed).length;
    const avgScore = this.avgQuizScore;

    // Check progress pace
    const completionRate = totalTopicsInCourse > 0
        ? this.completedTopics.length / totalTopicsInCourse
        : 0;

    if (failCount >= 5 || avgScore < 40) {
        this.riskFlag = 'critical';
    } else if (failCount >= 3 || avgScore < 55 || (daysSinceActive > 4 && completionRate < 0.3)) {
        this.riskFlag = 'at_risk';
    } else {
        this.riskFlag = 'on_track';
    }
};

progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ course: 1, riskFlag: 1 });
progressSchema.index({ course: 1, lastAccessed: -1 });
progressSchema.index({ course: 1, 'topicQuizScores.difficultyTier': 1 });

module.exports = mongoose.model('Progress', progressSchema);