const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const StudentProfile = require('../models/StudentProfile');
const aiService = require('../services/ai-service');

// ============================================================================
// Generate Assessment (Onboarding / Practice)
// ============================================================================
exports.generateAssessment = async (req, res) => {
    try {
        const { field, level, count, type, topic } = req.body;

        const questions = await aiService.generateAssessmentQuestions(field, level, count || 5);

        const sanitizedQuestions = questions.map(q => {
            const { correctAnswer, ...rest } = q;
            return rest; // Don't send correct answer to client
        });

        const assessment = new Assessment({
            userId: req.user.id,
            type: type || 'practice',
            field,
            level,
            topic,
            questions: questions.map(q => ({
                questionJson: q, // Store full Q with answer server-side
                userAnswer: null
            }))
        });

        await assessment.save();

        res.json({ assessmentId: assessment._id, questions: sanitizedQuestions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error generating assessment' });
    }
};

// ============================================================================
// Generate Context Quiz
// Supports BOTH teacher courses (courseId provided) and AI learning path (no courseId)
// ============================================================================
exports.generateContextQuiz = async (req, res) => {
    try {
        const { courseId, moduleId, topicId, bloomLevel } = req.body;

        if (!moduleId || !topicId || !bloomLevel) {
            return res.status(400).json({ error: 'moduleId, topicId and bloomLevel are required' });
        }

        // ── Case 1: AI Learning Path (no courseId) ───────────────────────────
        if (!courseId) {
            const profile = await StudentProfile.findOne({ userId: req.user.id });
            if (!profile) {
                return res.status(404).json({ error: 'Student profile not found' });
            }

            const moduleDoc = profile.currentPath?.modules.find(
                m => m.id === moduleId || m._id?.toString() === moduleId
            );
            if (!moduleDoc) {
                return res.status(404).json({ error: 'Module not found in learning path' });
            }

            const topic = moduleDoc.topics.find(
                t => t.id === topicId || t._id?.toString() === topicId
            );
            if (!topic) {
                return res.status(404).json({ error: 'Topic not found in learning path' });
            }

            const questions = await aiService.generateTopicQuiz(
                topic.title,
                profile.onboarding.field || 'General',
                profile.onboarding.level || 'Intermediate',
                bloomLevel,
                topic.description || ''
            );

            return res.json({ quiz: { questions } });
        }

        // ── Case 2: Teacher Course (courseId provided) ───────────────────────
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const module = course.modules.find(
            m => m._id.toString() === moduleId || m.id === moduleId
        );
        if (!module) return res.status(404).json({ error: 'Module not found' });

        const topic = module.topics.find(
            t => t._id.toString() === topicId || t.id === topicId
        );
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        const questions = await aiService.generateTopicQuiz(
            topic.title,
            course.title,
            course.level || 'Intermediate',
            bloomLevel,
            topic.description || ''
        );

        res.json({ quiz: { questions } });

    } catch (error) {
        console.error('Context Quiz Error:', error);
        res.status(500).json({ error: 'Failed to generate context quiz' });
    }
};

// ============================================================================
// Submit Assessment
// ============================================================================
exports.submitAssessment = async (req, res) => {
    try {
        const { assessmentId, answers } = req.body; // answers: [{ questionIndex: 0, answer: "Option A" }]

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

        if (assessment.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let score = 0;

        answers.forEach(ans => {
            const qIndex = ans.questionIndex;
            if (assessment.questions[qIndex]) {
                assessment.questions[qIndex].userAnswer = ans.answer;
                const correct = assessment.questions[qIndex].questionJson.correctAnswer;
                const isCorrect = ans.answer === correct;
                assessment.questions[qIndex].isCorrect = isCorrect;
                if (isCorrect) score++;
            }
        });

        assessment.score = score;
        assessment.totalQuestions = assessment.questions.length;
        assessment.percentage = (score / assessment.totalQuestions) * 100;
        assessment.completedAt = Date.now();

        await assessment.save();

        res.json({
            score,
            total: assessment.totalQuestions,
            percentage: assessment.percentage,
            results: assessment.questions.map(q => ({
                question: q.questionJson.question,
                userAnswer: q.userAnswer,
                correctAnswer: q.questionJson.correctAnswer,
                isCorrect: q.isCorrect,
                explanation: q.questionJson.explanation
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error submitting assessment' });
    }
};