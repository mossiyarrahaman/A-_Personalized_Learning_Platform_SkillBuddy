const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const aiService = require('../services/ai-service');

exports.generateAssessment = async (req, res) => {
    try {
        const { field, level, count, type, topic } = req.body;

        // Logic to check if user needs to pay or has limits? (Skip for now)

        const questions = await aiService.generateAssessmentQuestions(field, level, count || 5);

        // Return questions to frontend (don't save yet, or save as "draft" assessment?)
        // Usually we send questions, user answers, then we submit.
        // To be secure, maybe we don't send the `correctAnswer` in the response?

        const sanitizedQuestions = questions.map(q => {
            const { correctAnswer, ...rest } = q;
            return rest; // Remove answer from client response
        });

        // We might want to cache the correct answers in session or db
        // For simplicity, let's assume we trust the client or we store it in a temp collection.
        // Better approach: Store the assessment as 'pending' in DB.

        const assessment = new Assessment({
            userId: req.user.id,
            type: type || 'practice',
            field,
            level,
            topic,
            questions: questions.map(q => ({
                questionJson: q, // Store full Q with Answer
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

exports.generateContextQuiz = async (req, res) => {
    try {
        const { courseId, moduleId, topicId, bloomLevel } = req.body;

        if (!courseId || !moduleId || !topicId || !bloomLevel) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const module = course.modules.find(m => m._id.toString() === moduleId || m.id === moduleId);
        if (!module) return res.status(404).json({ error: 'Module not found' });

        const topic = module.topics.find(t => t._id.toString() === topicId || t.id === topicId);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        // Call AI Service - Use the robust Topic Quiz generation
        // Requirement: "just on the topic"
        const questions = await aiService.generateTopicQuiz(
            topic.title,
            course.title,
            course.level || 'Intermediate',
            bloomLevel,
            topic.description || '' // Minimal context
        );

        // Format for frontend (QuizGenerationModal expects { quiz: { questions: ... } })
        res.json({ quiz: { questions } });

    } catch (error) {
        console.error('Context Quiz Error:', error);
        res.status(500).json({ error: 'Failed to generate context quiz' });
    }
};

exports.submitAssessment = async (req, res) => {
    try {
        const { assessmentId, answers } = req.body; // answers: [{ questionIndex: 0, answer: "Option A" }, ...]

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

        if (assessment.userId.toString() !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

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

        // Update user stats (optional calls to other services/models)

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
