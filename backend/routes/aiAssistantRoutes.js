const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiAssistant = require('../services/ai-learning-assistant'); // This seems to be a wrapper around ai-service.
const aiService = require('../services/ai-service'); // Import core service directly for the new simple function
const StudentProfile = require('../models/StudentProfile');
const { ActivityLog } = require('../models/Activity');

// ============================================================================
// TASK 1: Resource Recommendation
// ============================================================================
router.post('/recommend-resources', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await StudentProfile.findOne({ userId });

        if (!profile) {
            return res.status(404).json({ error: 'Student profile not found' });
        }

        const studentProfile = {
            student_id: userId,
            learning_level: profile.onboarding.level || 'beginner',
            course: profile.onboarding.field || 'General',
            completed_topics: profile.currentPath?.modules
                .filter(m => m.status === 'completed')
                .map(m => m.title) || [],
            weak_topics: req.body.weak_topics || [],
            average_quiz_score: profile.stats.avgScore || 0
        };

        const recommendations = await aiAssistant.recommendResources(studentProfile);
        res.json(recommendations);

    } catch (error) {
        console.error('Resource recommendation error:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

// ============================================================================
// TASK 2: Quiz Generation
// ============================================================================
router.post('/generate-quiz', auth, async (req, res) => {
    try {
        const { resource, progressPercentage } = req.body;
        const userId = req.user.id;
        const profile = await StudentProfile.findOne({ userId });

        const studentLevel = profile?.onboarding.level || 'beginner';

        const quiz = await aiAssistant.generateQuiz(resource, studentLevel, progressPercentage);

        res.json(quiz);

    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});

// ============================================================================
// TASK 2.1: On-Demand Topic Quiz
// ============================================================================
router.post('/generate-topic-quiz', auth, async (req, res) => {
    try {
        const { topicTitle, topicContent, difficulty } = req.body;
        const quiz = await aiService.generateTopicQuiz(topicTitle, topicContent, difficulty);
        res.json({ questions: quiz });
    } catch (error) {
        console.error('Topic quiz error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// ============================================================================
// TASK 3: Strength Evaluation
// ============================================================================
router.post('/evaluate-strength', auth, async (req, res) => {
    try {
        const { quizResponses } = req.body; // Array of { concept, isCorrect }

        if (!Array.isArray(quizResponses)) {
            return res.status(400).json({ error: 'Invalid quiz responses format' });
        }

        const evaluation = aiAssistant.evaluateStrength(quizResponses);

        // Update student profile with new stats
        const userId = req.user.id;
        const profile = await StudentProfile.findOne({ userId });
        if (profile) {
            profile.stats.avgScore = evaluation.overall_score;
            await profile.save();
        }

        res.json(evaluation);

    } catch (error) {
        console.error('Strength evaluation error:', error);
        res.status(500).json({ error: 'Failed to evaluate strength' });
    }
});

// ============================================================================
// TASK 4: Adaptive Learning Path
// ============================================================================
router.post('/adapt-learning-path', auth, async (req, res) => {
    try {
        const { strengthAnalysis } = req.body;

        const adaptiveAction = aiAssistant.adaptLearningPath(strengthAnalysis);

        res.json(adaptiveAction);

    } catch (error) {
        console.error('Adaptive learning error:', error);
        res.status(500).json({ error: 'Failed to adapt learning path' });
    }
});

// ============================================================================
// TASK 5: Tracking Events
// ============================================================================
router.post('/track-event', auth, async (req, res) => {
    try {
        const { resourceId, eventType } = req.body;
        const userId = req.user.id;

        const trackingEvent = aiAssistant.createTrackingEvent(userId, resourceId, eventType);

        // Save to database
        await ActivityLog.create({
            userId: userId,
            type: eventType,
            description: `Resource ${resourceId}`,
            metadata: trackingEvent.tracking_event
        });

        res.json(trackingEvent);

    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

// ============================================================================
// TASK 6: Teacher Insights
// ============================================================================
router.get('/teacher-insights/:studentId', auth, async (req, res) => {
    try {
        // Check if requester is a teacher
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        const { studentId } = req.params;
        const profile = await StudentProfile.findOne({ userId: studentId });

        if (!profile) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const studentData = {
            student_id: studentId,
            learning_level: profile.onboarding.level,
            course: profile.onboarding.field,
            average_quiz_score: profile.stats.avgScore,
            completed_modules: profile.currentPath?.modules.filter(m => m.status === 'completed').length || 0,
            total_modules: profile.currentPath?.modules.length || 0
        };

        const insights = await aiAssistant.generateTeacherInsights(studentData);

        res.json(insights);

    } catch (error) {
        console.error('Teacher insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

module.exports = router;
