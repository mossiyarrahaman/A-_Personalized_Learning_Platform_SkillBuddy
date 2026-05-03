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

module.exports = router;