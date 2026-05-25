/**
 * services/analyticsService.js
 *
 * The analytics engine for teacher dashboards.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN PHILOSOPHY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A teacher with 20+ years of experience doesn't want vanity metrics.
 * They want answers to specific questions:
 *
 *   1. CLASS HEALTH: "How is my class doing overall? Who needs help RIGHT NOW?"
 *      → classOverview(): risk distribution, completion rate, engagement trend
 *
 *   2. TOPIC DIAGNOSIS: "Which topics are my students struggling with?"
 *      → topicAnalysis(): per-topic avg score, fail rate, hardest questions
 *      This tells the teacher WHAT to re-teach.
 *
 *   3. STUDENT DEEP-DIVE: "Tell me everything about this one student."
 *      → studentDeepDive(): topic-by-topic breakdown, quiz history, time log,
 *        Bloom's performance profile, exact wrong answers, risk assessment
 *      This is what you open before a 1:1 meeting.
 *
 *   4. QUIZ FORENSICS: "Where exactly are students making mistakes?"
 *      → quizAnalysis(): per-question error rate, most-missed questions,
 *        Bloom's level breakdown (are students failing at Apply? Analyze?)
 *      This tells the teacher HOW to re-teach.
 *
 *   5. ENGAGEMENT TRACKING: "Are students actually putting in the hours?"
 *      → engagementAnalysis(): daily active users, time distribution,
 *        resource completion rates, activity heatmap
 *
 *   6. LEADERBOARD: "Who are my top performers?"
 *      → courseLeaderboard(): ranked by a composite score of completion,
 *        quiz performance, and consistency
 *
 *   7. AT-RISK ALERTS: "Who is about to fall through the cracks?"
 *      → atRiskStudents(): sorted by urgency, with specific reasons
 *
 * Every function returns data structured for direct frontend rendering —
 * no further computation needed on the client.
 */

const mongoose = require('mongoose');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const GeneratedQuestion = require('../models/GeneratedQuestion');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function daysBetween(d1, d2) {
    return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function getTotalTopics(course) {
    let count = 0;
    (course.modules || []).forEach(m => { count += (m.topics || []).length; });
    return count;
}

function buildTopicMap(course) {
    const map = {}; // { topicId: { title, moduleId, moduleTitle } }
    (course.modules || []).forEach(m => {
        (m.topics || []).forEach(t => {
            const tid = t.id || t._id?.toString();
            map[tid] = {
                title: t.title,
                moduleId: m.id || m._id?.toString(),
                moduleTitle: m.title,
                resourceCount: (t.resources || []).length,
            };
        });
    });
    return map;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CLASS OVERVIEW — the teacher's home screen
// ═══════════════════════════════════════════════════════════════════════════════

async function classOverview(courseId) {
    const course = await Course.findById(courseId).populate('enrolledStudents', 'name email').lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId }).populate('student', 'name email').lean();
    const totalTopics = getTotalTopics(course);
    const now = new Date();

    // ── Risk distribution ────────────────────────────────────────────────────
    const riskCounts = { on_track: 0, at_risk: 0, critical: 0, inactive: 0 };
    const studentSummaries = [];

    for (const p of progressRecords) {
        if (!p.student) continue;

        const daysSince = daysBetween(now, new Date(p.lastAccessed));
        const completionPct = totalTopics > 0 ? Math.min(Math.round((p.completedTopics.length / totalTopics) * 100), 100) : 0;

        // Trust the stored riskFlag (set by computeRiskFlag on each quiz submission).
        // Only escalate for time-based staleness — never downgrade score/fail dimensions.
        let risk = p.riskFlag || 'on_track';
        if (daysSince > 14) risk = 'inactive';
        else if (daysSince > 7 && risk !== 'inactive') risk = 'critical';

        riskCounts[risk]++;

        studentSummaries.push({
            studentId: p.student._id,
            name: p.student.name,
            email: p.student.email,
            completionPct,
            completedTopics: Math.min(p.completedTopics.length, totalTopics),
            avgQuizScore: Math.round(p.avgQuizScore || 0),
            totalTimeSpent: p.totalTimeSpent || 0,
            totalTimeFormatted: formatTime(p.totalTimeSpent || 0),
            lastAccessed: p.lastAccessed,
            daysSinceActive: daysSince,
            risk,
            quizzesTaken: (p.topicQuizScores || []).length,
        });
    }

    // ── Class-level aggregates ────────────────────────────────────────────────
    const totalStudents = studentSummaries.length;
    const avgCompletion = totalStudents > 0 ? Math.round(studentSummaries.reduce((s, st) => s + st.completionPct, 0) / totalStudents) : 0;
    const avgScore = totalStudents > 0 ? Math.round(studentSummaries.reduce((s, st) => s + st.avgQuizScore, 0) / totalStudents) : 0;
    const avgTimeSpent = totalStudents > 0 ? Math.round(studentSummaries.reduce((s, st) => s + st.totalTimeSpent, 0) / totalStudents) : 0;
    const activeIn7Days = studentSummaries.filter(s => s.daysSinceActive <= 7).length;

    // ── Daily engagement trend (last 14 days) ────────────────────────────────
    const engagementTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        let activeCount = 0;
        let totalTime = 0;

        for (const p of progressRecords) {
            const entry = (p.dailyActivity || []).find(a => a.date === dateStr);
            if (entry) {
                activeCount++;
                totalTime += entry.timeSpent || 0;
            }
        }
        engagementTrend.push({ date: dateStr, activeStudents: activeCount, totalTimeSpent: totalTime });
    }

    return {
        courseTitle: course.title,
        totalStudents,
        totalTopics,
        summary: {
            avgCompletion,
            avgScore,
            avgTimeSpent: formatTime(avgTimeSpent),
            activeIn7Days,
            activeRate: totalStudents > 0 ? Math.round((activeIn7Days / totalStudents) * 100) : 0,
        },
        riskDistribution: riskCounts,
        engagementTrend,
        students: studentSummaries.sort((a, b) => {
            // Sort: critical first, then at_risk, then by completion descending
            const riskOrder = { critical: 0, inactive: 0, at_risk: 1, on_track: 2 };
            if (riskOrder[a.risk] !== riskOrder[b.risk]) return riskOrder[a.risk] - riskOrder[b.risk];
            return b.completionPct - a.completionPct;
        }),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TOPIC ANALYSIS — "which topics need re-teaching?"
// ═══════════════════════════════════════════════════════════════════════════════

async function topicAnalysis(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId }).lean();
    const topicMap = buildTopicMap(course);
    const totalStudents = progressRecords.length;

    // ── Aggregate quiz performance per topic ─────────────────────────────────
    const topicStats = {};

    for (const tid in topicMap) {
        topicStats[tid] = {
            topicId: tid,
            title: topicMap[tid].title,
            moduleTitle: topicMap[tid].moduleTitle,
            resourceCount: topicMap[tid].resourceCount,
            studentsCompleted: 0,
            studentsAttempted: 0,
            totalAttempts: 0,
            totalScore: 0,
            passCount: 0,
            failCount: 0,
            avgTimeSpent: 0,
            totalTimeSpent: 0,
            bloomBreakdown: {},        // { 'remember': { correct: N, total: N }, ... }
            wrongQuestions: {},        // { 'questionText': count }
        };
    }

    for (const p of progressRecords) {
        // Mark topic completions
        for (const tid of (p.completedTopics || [])) {
            if (topicStats[tid]) topicStats[tid].studentsCompleted++;
        }

        // Quiz scores
        for (const quiz of (p.topicQuizScores || [])) {
            const stat = topicStats[quiz.topicId];
            if (!stat) continue;

            stat.studentsAttempted++;
            stat.totalAttempts++;
            stat.totalScore += quiz.score || 0;
            if (quiz.passed) stat.passCount++;
            else stat.failCount++;

            // Bloom's breakdown
            const bl = quiz.bloomLevel || 'understand';
            if (!stat.bloomBreakdown[bl]) stat.bloomBreakdown[bl] = { correct: 0, total: 0 };
            stat.bloomBreakdown[bl].total += quiz.totalQuestions || 0;
            stat.bloomBreakdown[bl].correct += quiz.correctAnswers || 0;

            // Wrong questions
            for (const wq of (quiz.wrongQuestions || [])) {
                const key = wq.questionText || 'Unknown';
                stat.wrongQuestions[key] = (stat.wrongQuestions[key] || 0) + 1;
            }
        }

        // Time spent per topic
        for (const rp of (p.resourceProgress || [])) {
            const tid = rp.topicId;
            if (tid && topicStats[tid]) {
                topicStats[tid].totalTimeSpent += rp.timeSpent || 0;
            }
        }
    }

    // ── Compute derived metrics ──────────────────────────────────────────────
    const topics = Object.values(topicStats).map(t => {
        const avgScore = t.totalAttempts > 0 ? Math.round(t.totalScore / t.totalAttempts) : null;
        const failRate = t.totalAttempts > 0 ? Math.round((t.failCount / t.totalAttempts) * 100) : 0;
        const completionRate = totalStudents > 0 ? Math.round((t.studentsCompleted / totalStudents) * 100) : 0;
        const avgTime = t.studentsAttempted > 0 ? Math.round(t.totalTimeSpent / t.studentsAttempted) : 0;

        // Bloom's percentages
        const bloomPerformance = {};
        for (const bl in t.bloomBreakdown) {
            const b = t.bloomBreakdown[bl];
            bloomPerformance[bl] = {
                correct: b.correct,
                total: b.total,
                percentage: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
            };
        }

        // Top wrong questions
        const topWrongQuestions = Object.entries(t.wrongQuestions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ questionText: text, missedBy: count }));

        // Needs attention flag
        let attention = 'ok';
        if (avgScore !== null && avgScore < 50) attention = 'critical';
        else if (avgScore !== null && avgScore < 65) attention = 'needs_review';
        else if (failRate > 50) attention = 'needs_review';

        return {
            topicId: t.topicId,
            title: t.title,
            moduleTitle: t.moduleTitle,
            avgScore,
            failRate,
            completionRate,
            totalAttempts: t.totalAttempts,
            avgTimeSpent: formatTime(avgTime),
            avgTimeSpentSeconds: avgTime,
            bloomPerformance,
            topWrongQuestions,
            attention,
        };
    });

    // Sort: critical first, then needs_review, then by avgScore ascending
    const attentionOrder = { critical: 0, needs_review: 1, ok: 2 };
    topics.sort((a, b) => {
        if (attentionOrder[a.attention] !== attentionOrder[b.attention]) {
            return attentionOrder[a.attention] - attentionOrder[b.attention];
        }
        return (a.avgScore || 0) - (b.avgScore || 0);
    });

    return {
        courseTitle: course.title,
        totalStudents,
        totalTopics: topics.length,
        needsAttention: topics.filter(t => t.attention !== 'ok').length,
        topics,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STUDENT DEEP-DIVE — everything about one student
// ═══════════════════════════════════════════════════════════════════════════════

async function studentDeepDive(courseId, studentId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progress = await Progress.findOne({ course: courseId, student: studentId })
        .populate('student', 'name email')
        .lean();
    if (!progress) throw new Error('Student progress not found');

    const topicMap = buildTopicMap(course);
    const totalTopics = getTotalTopics(course);

    // ── Topic-by-topic breakdown ─────────────────────────────────────────────
    const topicBreakdown = [];
    for (const mod of (course.modules || [])) {
        for (const topic of (mod.topics || [])) {
            const tid = topic.id || topic._id?.toString();
            const completed = (progress.completedTopics || []).includes(tid);

            // Quiz history for this topic
            const quizzes = (progress.topicQuizScores || [])
                .filter(q => q.topicId === tid)
                .sort((a, b) => new Date(b.attemptDate) - new Date(a.attemptDate));

            const bestScore = quizzes.length > 0 ? Math.max(...quizzes.map(q => q.score)) : null;
            const latestScore = quizzes.length > 0 ? quizzes[0].score : null;
            const attempts = quizzes.length;

            // Time on this topic's resources
            const topicResources = (progress.resourceProgress || []).filter(rp => rp.topicId === tid);
            const timeOnTopic = topicResources.reduce((s, r) => s + (r.timeSpent || 0), 0);
            const resourcesCompleted = topicResources.filter(r => r.completed).length;
            const totalResources = (topic.resources || []).length;

            // All wrong questions for this topic
            const wrongQs = quizzes.flatMap(q => (q.wrongQuestions || []).map(wq => ({
                ...wq,
                attemptDate: q.attemptDate,
                quizScore: q.score,
            })));

            topicBreakdown.push({
                topicId: tid,
                title: topic.title,
                moduleTitle: mod.title,
                completed,
                bestScore,
                latestScore,
                attempts,
                timeSpent: timeOnTopic,
                timeFormatted: formatTime(timeOnTopic),
                resourcesCompleted,
                totalResources,
                bloomLevelsAttempted: [...new Set(quizzes.map(q => q.bloomLevel).filter(Boolean))],
                wrongQuestions: wrongQs.slice(0, 10), // Last 10 wrong answers
                status: completed ? 'completed' : (attempts > 0 ? 'in_progress' : 'not_started'),
            });
        }
    }

    // ── Bloom's proficiency profile ──────────────────────────────────────────
    const bloomProfile = {};
    for (const quiz of (progress.topicQuizScores || [])) {
        const bl = quiz.bloomLevel || 'understand';
        if (!bloomProfile[bl]) bloomProfile[bl] = { correct: 0, total: 0, quizzes: 0 };
        bloomProfile[bl].correct += quiz.correctAnswers || 0;
        bloomProfile[bl].total += quiz.totalQuestions || 0;
        bloomProfile[bl].quizzes++;
    }
    for (const bl in bloomProfile) {
        bloomProfile[bl].percentage = bloomProfile[bl].total > 0
            ? Math.round((bloomProfile[bl].correct / bloomProfile[bl].total) * 100) : 0;
    }

    // ── Activity timeline (last 30 days) ─────────────────────────────────────
    const activityTimeline = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const entry = (progress.dailyActivity || []).find(a => a.date === dateStr);
        activityTimeline.push({
            date: dateStr,
            timeSpent: entry?.timeSpent || 0,
            resourcesCompleted: entry?.resourcesCompleted || 0,
            quizzesTaken: entry?.quizzesTaken || 0,
            active: !!entry,
        });
    }

    // ── Strengths and weaknesses ─────────────────────────────────────────────
    const scoredTopics = topicBreakdown.filter(t => t.latestScore !== null);
    const strengths = scoredTopics.filter(t => t.bestScore >= 70).sort((a, b) => b.bestScore - a.bestScore).slice(0, 5);
    const weaknesses = scoredTopics.filter(t => t.bestScore < 70).sort((a, b) => a.bestScore - b.bestScore).slice(0, 5);

    // ── Compute risk ─────────────────────────────────────────────────────────
    const daysSince = daysBetween(now, new Date(progress.lastAccessed));
    // Trust stored riskFlag; only escalate for time — don't downgrade score/fail dimensions.
    let risk = progress.riskFlag || 'on_track';
    if (daysSince > 14) risk = 'inactive';
    else if (daysSince > 7 && risk !== 'inactive') risk = 'critical';

    return {
        student: {
            id: progress.student._id,
            name: progress.student.name,
            email: progress.student.email,
        },
        courseTitle: course.title,
        summary: {
            completionPct: totalTopics > 0 ? Math.min(Math.round((progress.completedTopics.length / totalTopics) * 100), 100) : 0,
            completedTopics: progress.completedTopics.length,
            totalTopics,
            avgQuizScore: Math.round(progress.avgQuizScore || 0),
            totalTimeSpent: formatTime(progress.totalTimeSpent || 0),
            totalTimeSeconds: progress.totalTimeSpent || 0,
            quizzesTaken: (progress.topicQuizScores || []).length,
            lastAccessed: progress.lastAccessed,
            daysSinceActive: daysSince,
            enrollmentDate: progress.enrollmentDate,
            risk,
        },
        bloomProfile,
        strengths: strengths.map(t => ({ title: t.title, score: t.bestScore })),
        weaknesses: weaknesses.map(t => ({ title: t.title, score: t.bestScore, wrongQuestions: t.wrongQuestions.slice(0, 3) })),
        topicBreakdown,
        activityTimeline,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. QUIZ FORENSICS — where exactly are mistakes happening?
// ═══════════════════════════════════════════════════════════════════════════════

async function quizAnalysis(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId }).lean();

    // Aggregate wrong questions across ALL students
    const questionErrors = {};   // { questionText: { count, topic, bloomLevel, difficulty, studentAnswers: {} } }
    const bloomAggregates = {};  // { bloomLevel: { correct, total } }
    const difficultyAggregates = {};  // { difficulty: { correct, total } }

    for (const p of progressRecords) {
        for (const quiz of (p.topicQuizScores || [])) {
            // Bloom's aggregate
            const bl = quiz.bloomLevel || 'understand';
            if (!bloomAggregates[bl]) bloomAggregates[bl] = { correct: 0, total: 0 };
            bloomAggregates[bl].correct += quiz.correctAnswers || 0;
            bloomAggregates[bl].total += quiz.totalQuestions || 0;

            // Wrong questions
            for (const wq of (quiz.wrongQuestions || [])) {
                const key = wq.questionText || 'Unknown';
                if (!questionErrors[key]) {
                    questionErrors[key] = {
                        questionText: wq.questionText,
                        topic: wq.topic || quiz.topicTitle,
                        bloomLevel: wq.bloomLevel || bl,
                        difficulty: wq.difficulty || 'medium',
                        missedCount: 0,
                        commonWrongAnswers: {},
                    };
                }
                questionErrors[key].missedCount++;

                // Track what students are picking instead
                if (wq.studentAnswer) {
                    questionErrors[key].commonWrongAnswers[wq.studentAnswer] =
                        (questionErrors[key].commonWrongAnswers[wq.studentAnswer] || 0) + 1;
                }

                // Difficulty aggregate
                const diff = wq.difficulty || 'medium';
                if (!difficultyAggregates[diff]) difficultyAggregates[diff] = { correct: 0, total: 0 };
                difficultyAggregates[diff].total++;
            }
        }
    }

    // Sort by most missed
    const mostMissedQuestions = Object.values(questionErrors)
        .sort((a, b) => b.missedCount - a.missedCount)
        .slice(0, 20)
        .map(q => ({
            ...q,
            commonWrongAnswers: Object.entries(q.commonWrongAnswers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([answer, count]) => ({ answer, count })),
        }));

    // Bloom's performance
    const bloomPerformance = {};
    const bloomOrder = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    for (const bl of bloomOrder) {
        const data = bloomAggregates[bl];
        if (data) {
            bloomPerformance[bl] = {
                correct: data.correct,
                total: data.total,
                percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
            };
        }
    }

    // Difficulty performance
    const difficultyPerformance = {};
    for (const diff of ['easy', 'medium', 'hard']) {
        const data = difficultyAggregates[diff];
        if (data) {
            difficultyPerformance[diff] = {
                total: data.total,
                // Note: We're counting missed questions, so higher = worse
                missedCount: data.total,
            };
        }
    }

    return {
        courseTitle: course.title,
        totalStudents: progressRecords.length,
        bloomPerformance,
        difficultyPerformance,
        mostMissedQuestions,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COURSE LEADERBOARD — ranked by composite score
// ═══════════════════════════════════════════════════════════════════════════════

async function courseLeaderboard(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email')
        .lean();

    const totalTopics = getTotalTopics(course);

    const leaderboard = progressRecords
        .filter(p => p.student)
        .map(p => {
            const completionPct = totalTopics > 0 ? Math.min((p.completedTopics.length / totalTopics) * 100, 100) : 0;
            const quizScore = Math.min(p.avgQuizScore || 0, 100);
            const timeScore = Math.min((p.totalTimeSpent || 0) / 3600, 50); // Cap at 50 hours

            // Composite score: 40% completion + 40% quiz performance + 20% time invested
            const compositeScore = Math.round(
                (completionPct * 0.4) + (quizScore * 0.4) + (timeScore * 0.2)
            );

            // Streak: count consecutive days with activity in last 30 days
            let streak = 0;
            const now = new Date();
            for (let i = 0; i < 30; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(0, 10);
                const hasActivity = (p.dailyActivity || []).some(a => a.date === dateStr);
                if (hasActivity) streak++;
                else if (i > 0) break; // Break on first gap (for consecutive streak)
            }

            return {
                studentId: p.student._id,
                name: p.student.name,
                email: p.student.email,
                compositeScore,
                completionPct: Math.round(completionPct),
                avgQuizScore: Math.round(quizScore),
                totalTimeSpent: formatTime(p.totalTimeSpent || 0),
                streak,
                quizzesTaken: (p.topicQuizScores || []).length,
                topicsCompleted: Math.min(p.completedTopics.length, totalTopics),
            };
        })
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .map((entry, index) => ({ rank: index + 1, ...entry }));

    return {
        courseTitle: course.title,
        totalStudents: leaderboard.length,
        leaderboard,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AT-RISK STUDENTS — actionable alert list
// ═══════════════════════════════════════════════════════════════════════════════

async function atRiskStudents(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email')
        .lean();

    const totalTopics = getTotalTopics(course);
    const now = new Date();

    const alerts = [];

    for (const p of progressRecords) {
        if (!p.student) continue;

        const daysSince = daysBetween(now, new Date(p.lastAccessed));
        const completionPct = totalTopics > 0 ? Math.min(Math.round((p.completedTopics.length / totalTopics) * 100), 100) : 0;
        const avgScore = Math.round(p.avgQuizScore || 0);
        const recentQuizzes = (p.topicQuizScores || []).slice(-5);
        const recentFailures = recentQuizzes.filter(q => !q.passed);
        const reasons = [];

        // Determine risk reasons
        if (daysSince > 14) reasons.push(`No activity in ${daysSince} days`);
        else if (daysSince > 7) reasons.push(`Last active ${daysSince} days ago`);

        if (avgScore > 0 && avgScore < 50) reasons.push(`Low avg quiz score: ${avgScore}%`);
        if (recentFailures.length >= 3) {
            const failedTopics = recentFailures.map(q => q.topicTitle).filter(Boolean).slice(0, 3);
            reasons.push(`Failed ${recentFailures.length} of last 5 quizzes${failedTopics.length ? ': ' + failedTopics.join(', ') : ''}`);
        }
        if (completionPct < 20 && daysSince > 5) reasons.push(`Only ${completionPct}% complete`);

        if (reasons.length === 0) continue;

        let severity = 'at_risk';
        if (daysSince > 14 || avgScore < 30 || recentFailures.length >= 4) severity = 'critical';

        // Suggested action
        let suggestedAction = 'Check in with student';
        if (daysSince > 14) suggestedAction = 'Reach out urgently — student may have disengaged';
        else if (recentFailures.length >= 3) suggestedAction = 'Schedule 1:1 to review weak topics';
        else if (avgScore < 50) suggestedAction = 'Recommend foundational resources for struggling topics';

        alerts.push({
            studentId: p.student._id,
            name: p.student.name,
            email: p.student.email,
            severity,
            reasons,
            suggestedAction,
            completionPct,
            avgQuizScore: avgScore,
            daysSinceActive: daysSince,
            lastAccessed: p.lastAccessed,
        });
    }

    // Sort: critical first
    alerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
        return b.daysSinceActive - a.daysSinceActive;
    });

    return {
        courseTitle: course.title,
        totalStudents: progressRecords.length,
        atRiskCount: alerts.length,
        alerts,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ENGAGEMENT ANALYSIS — time and activity patterns
// ═══════════════════════════════════════════════════════════════════════════════

async function engagementAnalysis(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email')
        .lean();

    const totalStudents = progressRecords.length;

    // ── Time distribution buckets ────────────────────────────────────────────
    const timeBuckets = { '0-1h': 0, '1-5h': 0, '5-10h': 0, '10-20h': 0, '20h+': 0 };
    for (const p of progressRecords) {
        const hours = (p.totalTimeSpent || 0) / 3600;
        if (hours < 1) timeBuckets['0-1h']++;
        else if (hours < 5) timeBuckets['1-5h']++;
        else if (hours < 10) timeBuckets['5-10h']++;
        else if (hours < 20) timeBuckets['10-20h']++;
        else timeBuckets['20h+']++;
    }

    // ── Resource completion rates ────────────────────────────────────────────
    const resourceStats = {};
    for (const p of progressRecords) {
        for (const rp of (p.resourceProgress || [])) {
            const key = rp.resourceTitle || rp.resourceId;
            if (!resourceStats[key]) {
                resourceStats[key] = { title: rp.resourceTitle || rp.resourceId, type: rp.type, completed: 0, started: 0, avgTime: 0, totalTime: 0 };
            }
            resourceStats[key].started++;
            if (rp.completed) resourceStats[key].completed++;
            resourceStats[key].totalTime += rp.timeSpent || 0;
        }
    }

    const resourceCompletionRates = Object.values(resourceStats).map(r => ({
        ...r,
        completionRate: r.started > 0 ? Math.round((r.completed / r.started) * 100) : 0,
        avgTime: formatTime(r.started > 0 ? Math.round(r.totalTime / r.started) : 0),
    })).sort((a, b) => a.completionRate - b.completionRate); // Lowest completion first

    return {
        courseTitle: course.title,
        totalStudents,
        timeDistribution: timeBuckets,
        avgTotalTime: formatTime(totalStudents > 0
            ? Math.round(progressRecords.reduce((s, p) => s + (p.totalTimeSpent || 0), 0) / totalStudents)
            : 0
        ),
        resourceCompletionRates: resourceCompletionRates.slice(0, 20),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TOPIC PROGRESS MATRIX — student × topic completion grid
// ═══════════════════════════════════════════════════════════════════════════════

async function topicProgressMatrix(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email')
        .lean();

    // Build ordered topic list
    const topics = [];
    for (const mod of course.modules || []) {
        for (const t of mod.topics || []) {
            const topicId = t.id || t._id?.toString();
            topics.push({ topicId, title: t.title, moduleTitle: mod.title });
        }
    }

    const students = progressRecords
        .filter(p => p.student)
        .map(p => ({ studentId: p.student._id.toString(), name: p.student.name, email: p.student.email }));

    // matrix[topicId][studentId] = { status, score, attempts }
    const matrix = {};
    for (const { topicId } of topics) {
        matrix[topicId] = {};
        for (const p of progressRecords) {
            if (!p.student) continue;
            const sid = p.student._id.toString();
            const completed = (p.completedTopics || []).includes(topicId);
            const quizzes = (p.topicQuizScores || []).filter(q => q.topicId === topicId);
            const bestScore = quizzes.length ? Math.max(...quizzes.map(q => q.score)) : null;
            const inProgress = !completed && (p.resourceProgress || []).some(r => r.topicId === topicId && r.timeSpent > 0);
            matrix[topicId][sid] = {
                status: completed ? 'completed' : inProgress ? 'in_progress' : 'not_started',
                score: bestScore !== null ? Math.round(bestScore) : null,
                attempts: quizzes.length,
            };
        }
    }

    return { topics, students, matrix };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. TEACHER QUIZ RESULTS — per-topic pass/fail per student
// ═══════════════════════════════════════════════════════════════════════════════

async function teacherQuizResults(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email')
        .lean();

    const topicMap = buildTopicMap(course);

    const topicResults = {};
    for (const tid in topicMap) {
        topicResults[tid] = {
            topicId: tid,
            title: topicMap[tid].title,
            moduleTitle: topicMap[tid].moduleTitle,
            students: [],
        };
    }

    for (const p of progressRecords) {
        if (!p.student) continue;
        const teacherAttempts = (p.topicQuizScores || []).filter(q => q.isTeacherAssessment);
        for (const q of teacherAttempts) {
            if (!topicResults[q.topicId]) continue;
            const sid = p.student._id.toString();
            let existing = topicResults[q.topicId].students.find(s => s.studentId.toString() === sid);
            if (!existing) {
                existing = {
                    studentId: p.student._id,
                    name: p.student.name,
                    bestScore: q.score,
                    passed: q.score >= 80,
                    attempts: 0,
                    tiers: { beginner: null, intermediate: null, advanced: null },
                };
                topicResults[q.topicId].students.push(existing);
            }
            existing.attempts++;
            if (q.score > existing.bestScore) {
                existing.bestScore = q.score;
                existing.passed = q.score >= 80;
            }
            const tier = q.difficultyTier;
            if (tier && tier in existing.tiers) {
                const t = existing.tiers[tier];
                if (!t || q.score > t.bestScore) {
                    existing.tiers[tier] = { bestScore: q.score, passed: q.score >= 80, attempts: (t?.attempts || 0) + 1 };
                } else {
                    t.attempts++;
                }
            }
        }
    }

    const topics = Object.values(topicResults)
        .filter(t => t.students.length > 0)
        .map(t => ({
            ...t,
            passCount: t.students.filter(s => s.passed).length,
            failCount: t.students.filter(s => !s.passed).length,
            avgScore: t.students.length > 0
                ? Math.round(t.students.reduce((a, s) => a + s.bestScore, 0) / t.students.length)
                : null,
            attemptedCount: t.students.length,
        }));

    return { courseTitle: course.title, totalStudents: progressRecords.length, topics };
}

// ─── Tier distribution ───────────────────────────────────────────────────────
// Returns how many students attempted / passed each difficulty tier per topic.

async function tierDistribution(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const progressRecords = await Progress.find({ course: courseId }).lean();

    // Collect all unique topic ids/titles from the course
    const topicMeta = {};
    for (const mod of course.modules || []) {
        for (const t of mod.topics || []) {
            const key = t.id || t._id?.toString();
            if (key) topicMeta[key] = { title: t.title, moduleTitle: mod.title };
        }
    }

    const TIERS = ['beginner', 'intermediate', 'advanced'];

    // Build per-topic, per-tier accumulators
    const topicStats = {}; // topicId → { tier → { attempted, passed, totalScore } }

    for (const progress of progressRecords) {
        for (const s of (progress.topicQuizScores || [])) {
            if (!s.difficultyTier || !s.isTeacherAssessment) continue;
            const tid = s.topicId;
            if (!topicStats[tid]) topicStats[tid] = {};
            if (!topicStats[tid][s.difficultyTier]) {
                topicStats[tid][s.difficultyTier] = { attempted: 0, passed: 0, totalScore: 0 };
            }
            const stat = topicStats[tid][s.difficultyTier];
            stat.attempted++;
            stat.totalScore += s.score;
            if (s.score >= 80) stat.passed++;
        }
    }

    // Course-wide aggregates
    const courseWide = {};
    for (const tier of TIERS) courseWide[tier] = { attempted: 0, passed: 0, avgScore: 0, totalScore: 0 };

    const topics = Object.keys(topicStats).map(topicId => {
        const meta = topicMeta[topicId] || { title: topicId, moduleTitle: '' };
        const tiers = {};
        for (const tier of TIERS) {
            const raw = topicStats[topicId][tier];
            if (raw) {
                const passRate = raw.attempted > 0 ? Math.round((raw.passed / raw.attempted) * 100) : 0;
                const avgScore = raw.attempted > 0 ? Math.round(raw.totalScore / raw.attempted) : 0;
                tiers[tier] = { attempted: raw.attempted, passed: raw.passed, passRate, avgScore };
                courseWide[tier].attempted += raw.attempted;
                courseWide[tier].passed += raw.passed;
                courseWide[tier].totalScore += raw.totalScore;
            } else {
                tiers[tier] = { attempted: 0, passed: 0, passRate: 0, avgScore: 0 };
            }
        }
        return { topicId, title: meta.title, moduleTitle: meta.moduleTitle, tiers };
    });

    for (const tier of TIERS) {
        const cw = courseWide[tier];
        cw.passRate = cw.attempted > 0 ? Math.round((cw.passed / cw.attempted) * 100) : 0;
        cw.avgScore = cw.attempted > 0 ? Math.round(cw.totalScore / cw.attempted) : 0;
        delete cw.totalScore;
    }

    return {
        courseTitle: course.title,
        totalStudents: progressRecords.length,
        courseWide,
        topics,
    };
}

// ─── Student tier matrix ─────────────────────────────────────────────────────
// Returns a grid: students (rows) × topics (columns), each cell showing tier pass status.

async function studentTierMatrix(courseId) {
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    // Ordered topic list from course structure
    const topicList = [];
    for (const mod of course.modules || []) {
        for (const t of mod.topics || []) {
            const key = t.id || t._id?.toString();
            if (key) topicList.push({ topicId: key, title: t.title, moduleTitle: mod.title });
        }
    }

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name email').lean();

    const TIERS = ['beginner', 'intermediate', 'advanced'];

    const students = progressRecords.map(progress => {
        // For each topic, find best score per tier
        const tiersByTopic = {};

        for (const s of (progress.topicQuizScores || [])) {
            if (!s.difficultyTier || !s.isTeacherAssessment) continue;
            if (!tiersByTopic[s.topicId]) tiersByTopic[s.topicId] = {};
            const existing = tiersByTopic[s.topicId][s.difficultyTier];
            if (!existing || s.score > existing.score) {
                tiersByTopic[s.topicId][s.difficultyTier] = { score: s.score, passed: s.score >= 80 };
            }
        }

        // Map to display format
        const tiers = {};
        for (const { topicId } of topicList) {
            tiers[topicId] = {};
            for (const tier of TIERS) {
                const entry = tiersByTopic[topicId]?.[tier];
                if (!entry) {
                    tiers[topicId][tier] = null;
                } else if (entry.passed) {
                    tiers[topicId][tier] = { status: 'passed', score: entry.score };
                } else {
                    tiers[topicId][tier] = { status: 'attempted', score: entry.score };
                }
            }
        }

        return {
            studentId: progress.student?._id || progress.student,
            name: progress.student?.name || 'Unknown',
            email: progress.student?.email || '',
            tiers,
        };
    });

    return { topics: topicList, students };
}

async function studyTimeTrend(courseId, fromDate, toDate) {
    const from = new Date(fromDate + 'T00:00:00Z');
    const to = new Date(toDate + 'T23:59:59Z');

    // Build date array, max 90 days
    const dates = [];
    for (let d = new Date(from); d <= to && dates.length < 90; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
    }

    const progressRecords = await Progress.find({ course: courseId })
        .populate('student', 'name')
        .select('student dailyActivity totalTimeSpent')
        .lean();

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const toLabel = (s) => { const [,m,d] = s.split('-'); return `${MONTHS[+m-1]} ${+d}`; };

    const classDailyData = dates.map(date => {
        let totalSeconds = 0, active = 0;
        for (const p of progressRecords) {
            const e = (p.dailyActivity || []).find(a => a.date === date);
            if (e?.timeSpent > 0) { totalSeconds += e.timeSpent; active++; }
        }
        return { date, label: toLabel(date), hours: +(totalSeconds / 3600).toFixed(2), activeStudents: active };
    });

    const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];
    const studentDailyData = progressRecords
        .filter(p => p.student)
        .map((p, i) => ({
            studentId: p.student._id,
            name: p.student.name,
            color: COLORS[i % COLORS.length],
            dailyData: dates.map(date => {
                const e = (p.dailyActivity || []).find(a => a.date === date);
                return { date, hours: +((e?.timeSpent || 0) / 3600).toFixed(2) };
            }),
            totalHours: +((p.totalTimeSpent || 0) / 3600).toFixed(1),
        }));

    return { classDailyData, studentDailyData, dateRange: { from: fromDate, to: toDate } };
}

module.exports = {
    classOverview,
    topicAnalysis,
    studentDeepDive,
    quizAnalysis,
    courseLeaderboard,
    atRiskStudents,
    engagementAnalysis,
    topicProgressMatrix,
    teacherQuizResults,
    tierDistribution,
    studentTierMatrix,
    studyTimeTrend,
};