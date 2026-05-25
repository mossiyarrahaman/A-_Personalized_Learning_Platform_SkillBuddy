/**
 * routes/analyticsRoutes.js
 *
 * Teacher analytics API — comprehensive class and student monitoring.
 *
 * All endpoints require authentication and verify the teacher owns the course.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * GET /api/analytics/:courseId/overview          Class overview + risk distribution
 * GET /api/analytics/:courseId/topics             Topic-by-topic analysis (what to re-teach)
 * GET /api/analytics/:courseId/student/:studentId  Student deep-dive (for 1:1 meetings)
 * GET /api/analytics/:courseId/quiz-analysis       Quiz forensics (most missed questions)
 * GET /api/analytics/:courseId/leaderboard         Ranked student leaderboard
 * GET /api/analytics/:courseId/at-risk             At-risk student alerts
 * GET /api/analytics/:courseId/engagement          Time & activity patterns
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const analytics = require('../services/analyticsService');

// ─── Middleware: verify teacher owns the course ──────────────────────────────

async function verifyCourseTeacher(req, res, next) {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (course.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied. Only the course teacher can view analytics.' });
        }

        req.course = course;
        next();
    } catch (err) {
        console.error('Course verification error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/overview
// ═══════════════════════════════════════════════════════════════════════════════
// The teacher's home screen: class health at a glance.
// Returns: risk distribution, engagement trend, student summary table.

router.get('/:courseId/overview', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.classOverview(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Overview analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/topics
// ═══════════════════════════════════════════════════════════════════════════════
// Topic diagnosis: which topics need re-teaching?
// Returns: per-topic avg score, fail rate, Bloom's breakdown, top wrong questions.

router.get('/:courseId/topics', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.topicAnalysis(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Topic analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/student/:studentId
// ═══════════════════════════════════════════════════════════════════════════════
// Deep-dive into a single student.
// Returns: topic breakdown, Bloom's profile, activity timeline, strengths/weaknesses.

router.get('/:courseId/student/:studentId', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.studentDeepDive(req.params.courseId, req.params.studentId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Student analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/quiz-analysis
// ═══════════════════════════════════════════════════════════════════════════════
// Quiz forensics: where exactly are students making mistakes?
// Returns: most missed questions, Bloom's level performance, difficulty breakdown.

router.get('/:courseId/quiz-analysis', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.quizAnalysis(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Quiz analysis error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/leaderboard
// ═══════════════════════════════════════════════════════════════════════════════
// Ranked leaderboard based on composite score (completion + quiz + time).

router.get('/:courseId/leaderboard', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.courseLeaderboard(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/at-risk
// ═══════════════════════════════════════════════════════════════════════════════
// At-risk student alerts with severity, reasons, and suggested actions.

router.get('/:courseId/at-risk', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.atRiskStudents(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('At-risk analysis error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/engagement
// ═══════════════════════════════════════════════════════════════════════════════
// Engagement patterns: time distribution, resource completion rates.

router.get('/:courseId/engagement', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.engagementAnalysis(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Engagement analysis error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/topic-matrix
// ═══════════════════════════════════════════════════════════════════════════════
// Student × topic completion matrix for the progress heatmap view.

router.get('/:courseId/topic-matrix', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.topicProgressMatrix(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Topic matrix error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/teacher-quiz-results
// ═══════════════════════════════════════════════════════════════════════════════
// Per-topic teacher quiz pass/fail rates with individual student results.

router.get('/:courseId/teacher-quiz-results', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.teacherQuizResults(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Teacher quiz results error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/tier-distribution
// ═══════════════════════════════════════════════════════════════════════════════
// Bloom's tier pass rates per topic and course-wide.
// Used by TeacherAnalytics "Bloom Levels" tab.

router.get('/:courseId/tier-distribution', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.tierDistribution(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Tier distribution error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/student-tier-matrix
// ═══════════════════════════════════════════════════════════════════════════════
// Student × topic grid with per-tier pass/attempt status.
// Used by TeacherAnalytics "Student Tiers" tab.

router.get('/:courseId/student-tier-matrix', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const data = await analytics.studentTierMatrix(req.params.courseId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Student tier matrix error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/study-time?from=YYYY-MM-DD&to=YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════════════════════
// Per-student and class-wide daily study time for a given date range.

router.get('/:courseId/study-time', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const to = req.query.to || new Date().toISOString().slice(0, 10);
        const from = req.query.from || (() => {
            const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10);
        })();
        const data = await analytics.studyTimeTrend(req.params.courseId, from, to);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Study time trend error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:courseId/assignment-results
// ═══════════════════════════════════════════════════════════════════════════════
// Per-assignment grade summary for the Assignment Grades analytics tab.

router.get('/:courseId/assignment-results', auth, verifyCourseTeacher, async (req, res) => {
    try {
        const Assignment = require('../models/Assignment');
        const AssignmentSubmission = require('../models/AssignmentSubmission');

        const assignments = await Assignment.find({
            courseId: req.params.courseId,
            isPublished: true,
        }).sort({ createdAt: 1 }).lean();

        const results = await Promise.all(assignments.map(async (a) => {
            const subs = await AssignmentSubmission.find({ assignmentId: a._id })
                .populate('studentId', 'name email')
                .lean();
            const graded = subs.filter(s => s.status === 'returned' && s.grade !== null);
            const avgGrade = graded.length
                ? Math.round(graded.reduce((sum, s) => sum + s.grade, 0) / graded.length)
                : null;
            return {
                assignmentId: a._id,
                title: a.title,
                topicId: a.topicId,
                dueDate: a.dueDate,
                maxPoints: a.maxPoints,
                totalSubmissions: subs.length,
                gradedCount: graded.length,
                avgGrade,
                students: subs.map(s => ({
                    studentId: s.studentId?._id,
                    name: s.studentId?.name || 'Unknown',
                    grade: s.grade,
                    maxPoints: a.maxPoints,
                    status: s.status,
                    submittedAt: s.submittedAt,
                })),
            };
        }));

        res.json({ success: true, assignments: results });
    } catch (err) {
        console.error('Assignment results analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;