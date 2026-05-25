const ClassTest = require('../models/ClassTest');
const ClassTestAttempt = require('../models/ClassTestAttempt');
const Course = require('../models/Course');
const GeneratedQuestion = require('../models/GeneratedQuestion');
const aiService = require('../services/ai-service');
const { retrieveRelevantChunks } = require('../services/retrievalService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyCourseOwner(courseId, userId) {
    const course = await Course.findById(courseId).select('author enrolledStudents title field').lean();
    if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
    const isOwner = course.author.toString() === userId;
    return { course, isOwner };
}

// ─── Teacher: Create Test ─────────────────────────────────────────────────────

exports.createTest = async (req, res) => {
    try {
        const { courseId, topicId, moduleId, title, instructions, openAt, closeAt, timeLimitMinutes, maxAttempts, questionSource, questions } = req.body;
        if (!courseId || !title || !timeLimitMinutes || (!topicId && !moduleId)) {
            return res.status(400).json({ error: 'courseId, title, timeLimitMinutes, and either topicId or moduleId are required' });
        }
        const { isOwner } = await verifyCourseOwner(courseId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: 'Only the course teacher can create tests' });

        const test = await ClassTest.create({
            courseId,
            topicId: topicId || null,
            moduleId: moduleId || null,
            title,
            instructions: instructions || '',
            openAt: openAt || null,
            closeAt: closeAt || null,
            timeLimitMinutes: Number(timeLimitMinutes),
            maxAttempts: maxAttempts || 1,
            questionSource: questionSource || 'ai_generated',
            questions: questions || [],
            createdBy: req.user.id,
        });
        res.status(201).json({ success: true, test });
    } catch (err) {
        console.error('classTestController createTest error:', err);
        const msg = err.errors ? Object.values(err.errors).map(e => e.message).join(', ') : (err.message || 'Server error');
        res.status(err.status || 500).json({ error: msg });
    }
};

// ─── Teacher: Update Test ─────────────────────────────────────────────────────

exports.updateTest = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.createdBy.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const { title, instructions, openAt, closeAt, timeLimitMinutes, maxAttempts, questions, questionSource } = req.body;
        if (title !== undefined)             test.title = title;
        if (instructions !== undefined)      test.instructions = instructions;
        if (openAt !== undefined)            test.openAt = openAt || null;
        if (closeAt !== undefined)           test.closeAt = closeAt || null;
        if (timeLimitMinutes !== undefined)  test.timeLimitMinutes = Number(timeLimitMinutes);
        if (maxAttempts !== undefined)       test.maxAttempts = maxAttempts;
        if (questionSource !== undefined)    test.questionSource = questionSource;
        if (questions !== undefined)         test.questions = questions;

        await test.save();
        res.json({ success: true, test });
    } catch (err) {
        console.error('classTestController updateTest error:', err);
        const msg = err.errors ? Object.values(err.errors).map(e => e.message).join(', ') : (err.message || 'Server error');
        res.status(err.status || 500).json({ error: msg });
    }
};

// ─── Teacher: Delete Test ─────────────────────────────────────────────────────

exports.deleteTest = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.createdBy.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        await ClassTestAttempt.deleteMany({ testId: test._id });
        await test.deleteOne();
        res.json({ success: true, message: 'Test deleted' });
    } catch (err) {
        console.error('classTestController deleteTest error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Teacher: Toggle Publish ──────────────────────────────────────────────────

exports.togglePublish = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.createdBy.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const { published } = req.body;
        if (published) {
            if (test.questions.length === 0) return res.status(400).json({ error: 'Add questions before publishing' });
            if (!test.openAt || !test.closeAt) return res.status(400).json({ error: 'Set open and close dates before publishing' });
            if (!test.timeLimitMinutes) return res.status(400).json({ error: 'Set a time limit before publishing' });
        }
        test.isPublished = Boolean(published);
        await test.save();
        res.json({ success: true, isPublished: test.isPublished });
    } catch (err) {
        console.error('classTestController togglePublish error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Teacher: Generate Questions via AI ──────────────────────────────────────

exports.generateQuestions = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.createdBy.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (test.isPublished) return res.status(400).json({ error: 'Cannot regenerate questions for a published test' });

        const { bloomLevel = 'understand', difficulty = 'Intermediate', numQuestions = 10, topicTitle = '' } = req.body;
        const { course } = await verifyCourseOwner(test.courseId.toString(), req.user.id);

        let contextText = '';
        try {
            const chunks = await retrieveRelevantChunks({ query: topicTitle || test.title, courseId: test.courseId.toString(), topK: 10 });
            if (chunks.length > 0) {
                contextText = chunks.map(c => `[Source: ${c.source || 'course material'}]\n${c.text}`).join('\n\n---\n\n');
            }
        } catch (_) {}

        const questions = await aiService.generateTopicQuiz(
            topicTitle || test.title,
            topicTitle || test.title,
            course.title || '',
            course.field || course.title || '',
            difficulty,
            bloomLevel,
            contextText,
            Math.min(Math.max(parseInt(numQuestions) || 10, 3), 20)
        );

        const formatted = questions.map(q => ({
            questionText: q.question || q.questionText || '',
            options: (q.options || []).map((text, i) => ({
                label: String.fromCharCode(65 + i),
                text,
                isCorrect: text === q.correctAnswer,
            })),
            explanation: q.explanation || '',
            bloomLevel,
            difficulty: difficulty.toLowerCase(),
        }));

        test.questions = formatted;
        test.questionSource = 'ai_generated';
        await test.save();

        res.json({ success: true, questions: formatted.length, test });
    } catch (err) {
        console.error('classTest generateQuestions error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Shared: Get tests for a topic ───────────────────────────────────────────

exports.getTopicTests = async (req, res) => {
    try {
        const { courseId, topicId } = req.params;
        const { isOwner } = await verifyCourseOwner(courseId, req.user.id);

        const filter = { courseId, topicId };
        if (!isOwner) filter.isPublished = true;

        const tests = await ClassTest.find(filter).sort({ createdAt: -1 }).lean();

        // Strip isCorrect from options for students
        if (!isOwner) {
            tests.forEach(t => {
                t.questions = t.questions.map(q => ({
                    ...q,
                    options: q.options.map(o => ({ label: o.label, text: o.text })),
                }));
            });
        }

        res.json({ success: true, tests });
    } catch (err) {
        console.error('classTestController getTopicTests error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Teacher: Get Results ─────────────────────────────────────────────────────

exports.getTestResults = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id).lean();
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.createdBy.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const attempts = await ClassTestAttempt.find({ testId: test._id, status: 'submitted' })
            .populate('studentId', 'name email')
            .sort({ score: -1 })
            .lean();

        const ranked = attempts.map((a, i) => ({
            rank: i + 1,
            studentName: a.studentId?.name || 'Unknown',
            studentId: a.studentId?._id,
            score: a.score,
            correctCount: a.correctCount,
            totalQuestions: a.totalQuestions,
            timeTakenSeconds: a.timeTakenSeconds,
            passed: a.passed,
            attemptNumber: a.attemptNumber,
            submittedAt: a.submittedAt,
        }));

        const passCount = ranked.filter(r => r.passed).length;
        const avgScore = ranked.length
            ? Math.round(ranked.reduce((s, r) => s + (r.score || 0), 0) / ranked.length)
            : 0;
        const avgTimeSec = ranked.length
            ? Math.round(ranked.reduce((s, r) => s + (r.timeTakenSeconds || 0), 0) / ranked.length)
            : 0;

        res.json({
            success: true,
            test: { title: test.title, totalQuestions: test.questions.length, timeLimitMinutes: test.timeLimitMinutes },
            students: ranked,
            stats: { total: ranked.length, passCount, passRate: ranked.length ? Math.round((passCount / ranked.length) * 100) : 0, avgScore, avgTimeSec },
        });
    } catch (err) {
        console.error('classTestController getTestResults error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Student: Start Attempt ───────────────────────────────────────────────────

exports.startAttempt = async (req, res) => {
    try {
        const test = await ClassTest.findById(req.params.id).lean();
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (!test.isPublished) return res.status(403).json({ error: 'Test is not published' });

        const now = new Date();
        if (test.openAt && now < new Date(test.openAt)) return res.status(400).json({ error: 'Test has not started yet' });
        if (test.closeAt && now > new Date(test.closeAt)) return res.status(400).json({ error: 'Test window has closed' });
        if (test.questions.length === 0) return res.status(400).json({ error: 'Test has no questions' });

        // Check attempt count
        const existingAttempts = await ClassTestAttempt.countDocuments({ testId: test._id, studentId: req.user.id });
        if (existingAttempts >= test.maxAttempts) {
            return res.status(400).json({ error: `Maximum attempts (${test.maxAttempts}) reached` });
        }

        // Check if there's an in-progress attempt (resume it)
        const inProgress = await ClassTestAttempt.findOne({ testId: test._id, studentId: req.user.id, status: 'in_progress' });
        if (inProgress) {
            const safeQuestions = test.questions.map(q => ({
                questionText: q.questionText,
                options: q.options.map(o => ({ label: o.label, text: o.text })),
                bloomLevel: q.bloomLevel,
                difficulty: q.difficulty,
            }));
            return res.json({ success: true, attemptId: inProgress._id, questions: safeQuestions, timeLimitMinutes: test.timeLimitMinutes, startedAt: inProgress.startedAt });
        }

        const attempt = await ClassTestAttempt.create({
            testId: test._id,
            studentId: req.user.id,
            courseId: test.courseId,
            topicId: test.topicId,
            attemptNumber: existingAttempts + 1,
            startedAt: now,
            status: 'in_progress',
        });

        // Strip isCorrect before sending to student
        const safeQuestions = test.questions.map(q => ({
            questionText: q.questionText,
            options: q.options.map(o => ({ label: o.label, text: o.text })),
            bloomLevel: q.bloomLevel,
            difficulty: q.difficulty,
        }));

        res.json({ success: true, attemptId: attempt._id, questions: safeQuestions, timeLimitMinutes: test.timeLimitMinutes, startedAt: attempt.startedAt });
    } catch (err) {
        console.error('classTestController startAttempt error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Student: Submit Attempt ──────────────────────────────────────────────────

exports.submitAttempt = async (req, res) => {
    try {
        const { attemptId, answers } = req.body;
        if (!attemptId) return res.status(400).json({ error: 'attemptId is required' });

        const attempt = await ClassTestAttempt.findById(attemptId);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
        if (attempt.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (attempt.status !== 'in_progress') return res.status(400).json({ error: 'Attempt already submitted' });

        const test = await ClassTest.findById(attempt.testId).lean();
        if (!test) return res.status(404).json({ error: 'Test not found' });

        const now = new Date();
        const timeTaken = Math.round((now - new Date(attempt.startedAt)) / 1000);

        // Auto-grade: match answer labels against isCorrect flag in question snapshot
        const gradedAnswers = (answers || []).map(a => {
            const q = test.questions[a.questionIndex];
            if (!q) return { ...a, isCorrect: false };
            const correctOption = q.options.find(o => o.isCorrect);
            return {
                questionIndex: a.questionIndex,
                selectedLabel: a.selectedLabel || '',
                isCorrect: correctOption ? a.selectedLabel === correctOption.label : false,
            };
        });

        const correctCount = gradedAnswers.filter(a => a.isCorrect).length;
        const totalQuestions = test.questions.length;
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        attempt.answers = gradedAnswers;
        attempt.score = score;
        attempt.correctCount = correctCount;
        attempt.totalQuestions = totalQuestions;
        attempt.passed = score >= 70;
        attempt.submittedAt = now;
        attempt.timeTakenSeconds = timeTaken;
        attempt.status = 'submitted';
        await attempt.save();

        res.json({
            success: true,
            score,
            correctCount,
            totalQuestions,
            passed: attempt.passed,
            timeTakenSeconds: timeTaken,
        });
    } catch (err) {
        console.error('classTestController submitAttempt error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Student: Get My Attempts ─────────────────────────────────────────────────

exports.getMyAttempts = async (req, res) => {
    try {
        const attempts = await ClassTestAttempt.find({
            testId: req.params.id,
            studentId: req.user.id,
        }).sort({ attemptNumber: 1 }).lean();
        res.json({ success: true, attempts });
    } catch (err) {
        console.error('classTestController getMyAttempts error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};

// ─── Shared: Get tests for a module ──────────────────────────────────────────

exports.getModuleTests = async (req, res) => {
    try {
        const { courseId, moduleId } = req.params;
        const { isOwner } = await verifyCourseOwner(courseId, req.user.id);

        const filter = { courseId, moduleId };
        if (!isOwner) filter.isPublished = true;

        const tests = await ClassTest.find(filter).sort({ createdAt: -1 }).lean();

        if (!isOwner) {
            tests.forEach(t => {
                t.questions = t.questions.map(q => ({
                    ...q,
                    options: q.options.map(o => ({ label: o.label, text: o.text })),
                }));
            });
        }

        res.json({ success: true, tests });
    } catch (err) {
        console.error('classTestController getModuleTests error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};
