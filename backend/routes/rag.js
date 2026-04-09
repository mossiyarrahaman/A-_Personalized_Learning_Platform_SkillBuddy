/**
 * routes/rag.js
 *
 * RAG-powered question generation API for both teachers and students.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEACHER ENDPOINTS (course owner only)
 * ═══════════════════════════════════════════════════════════════════════════
 *   POST   /api/rag/ingest                    Upload & ingest a document
 *   POST   /api/rag/generate                  Generate questions (Bloom's-aware)
 *   GET    /api/rag/questions/:courseId        List question bank
 *   GET    /api/rag/stats/:courseId            Corpus stats
 *   PATCH  /api/rag/questions/:id/approve      Approve a question
 *   PATCH  /api/rag/questions/:id              Edit a question
 *   DELETE /api/rag/questions/:id              Delete a question
 *   DELETE /api/rag/file/:fileId              Remove ingested file
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STUDENT ENDPOINTS (enrolled students)
 * ═══════════════════════════════════════════════════════════════════════════
 *   POST   /api/rag/practice/generate         Generate practice quiz (Bloom's)
 *   POST   /api/rag/practice/submit           Submit answers & get results
 *   GET    /api/rag/practice/history           Past practice sessions
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOM'S TAXONOMY LEVELS (param: bloomLevel)
 * ═══════════════════════════════════════════════════════════════════════════
 *   remember | understand | apply | analyze | evaluate | create | mixed
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const GeneratedQuestion = require('../models/GeneratedQuestion');
const { ingestResource, removeFileFromStore } = require('../services/ingestionService');
const { generateQuestions, generatePracticeQuestions, submitPracticeSession } = require('../services/questionGenerationService');
const { getCorpusStats } = require('../services/retrievalService');

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'mixed'];
const VALID_QUESTION_TYPES = ['mcq', 'short_answer', 'true_false', 'fill_in_blank', 'essay'];

// ─── Multer configuration ────────────────────────────────────────────────────

const ALLOWED_MIMES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.ppt']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/rag');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
            return cb(null, true);
        }
        cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, DOCX, and PPTX accepted.`));
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyCourseOwnership(courseId, userId) {
    const course = await Course.findById(courseId);
    if (!course) return { error: 'Course not found', status: 404 };
    if (course.author.toString() !== userId) {
        return { error: 'You are not authorized to modify this course', status: 403 };
    }
    return { course };
}

async function verifyEnrollment(courseId, userId) {
    const course = await Course.findById(courseId);
    if (!course) return { error: 'Course not found', status: 404 };

    // Allow course author too (teachers can also practice)
    const isAuthor = course.author.toString() === userId;
    const isEnrolled = course.enrolledStudents.some(id => id.toString() === userId);

    if (!isAuthor && !isEnrolled) {
        return { error: 'You are not enrolled in this course', status: 403 };
    }
    return { course };
}

function validateBloomLevel(bloomLevel) {
    if (!bloomLevel) return 'understand';
    return VALID_BLOOM_LEVELS.includes(bloomLevel) ? bloomLevel : 'understand';
}

// ═══════════════════════════════════════════════════════════════════════════════
//
//  TEACHER ENDPOINTS
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/rag/ingest ────────────────────────────────────────────────────

router.post('/ingest', auth, upload.single('resource'), async (req, res) => {
    try {
        const { courseId } = req.body;

        if (!courseId) return res.status(400).json({ error: 'courseId is required' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded. Upload a PDF, DOCX, or PPTX.' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const result = await ingestResource({
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            courseId,
        });

        res.json({
            success: true,
            message: `Successfully ingested "${req.file.originalname}"`,
            ...result,
        });
    } catch (err) {
        console.error('Ingestion error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/generate ─────────────────────────────────────────────────
// Teacher generates questions for their question bank.
// Accepts bloomLevel to shape the cognitive level of questions.

router.post('/generate', auth, async (req, res) => {
    try {
        const {
            courseId,
            topic = 'all topics covered in this course',
            questionTypes = ['mcq', 'short_answer', 'true_false'],
            countPerType = 3,
            difficulty = 'mixed',
            bloomLevel = 'understand',
        } = req.body;

        if (!courseId) return res.status(400).json({ error: 'courseId is required' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const cappedCount = Math.min(Math.max(Number(countPerType) || 3, 1), 10);
        const filteredTypes = questionTypes.filter(t => VALID_QUESTION_TYPES.includes(t));

        if (filteredTypes.length === 0) {
            return res.status(400).json({ error: `Invalid question types. Supported: ${VALID_QUESTION_TYPES.join(', ')}` });
        }

        const questions = await generateQuestions({
            courseId,
            createdBy: req.user.id,
            topic,
            questionTypes: filteredTypes,
            countPerType: cappedCount,
            difficulty,
            bloomLevel: validateBloomLevel(bloomLevel),
        });

        res.json({
            success: true,
            generated: questions.length,
            bloomLevel: validateBloomLevel(bloomLevel),
            questions,
        });
    } catch (err) {
        console.error('Generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/rag/questions/:courseId ─────────────────────────────────────────

router.get('/questions/:courseId', auth, async (req, res) => {
    try {
        const { type, approved, difficulty, bloomLevel, page = 1, limit = 20 } = req.query;

        const filter = { courseId: req.params.courseId, origin: 'teacher' };
        if (type) filter.questionType = type;
        if (approved !== undefined) filter.approved = approved === 'true';
        if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
        if (bloomLevel && bloomLevel !== 'all') filter.bloomLevel = bloomLevel;

        const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);
        const lim = Math.min(Number(limit) || 20, 100);

        const [questions, total] = await Promise.all([
            GeneratedQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
            GeneratedQuestion.countDocuments(filter),
        ]);

        res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / lim), questions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/rag/stats/:courseId ────────────────────────────────────────────

router.get('/stats/:courseId', auth, async (req, res) => {
    try {
        const stats = await getCorpusStats(req.params.courseId);

        // Also return question bank stats
        const questionStats = await GeneratedQuestion.aggregate([
            { $match: { courseId: require('mongoose').Types.ObjectId(req.params.courseId), origin: 'teacher' } },
            {
                $group: {
                    _id: { type: '$questionType', bloom: '$bloomLevel' },
                    count: { $sum: 1 },
                    approved: { $sum: { $cond: ['$approved', 1, 0] } },
                },
            },
        ]);

        res.json({ success: true, corpus: stats, questionBank: questionStats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/rag/questions/:id/approve ────────────────────────────────────

router.patch('/questions/:id/approve', auth, async (req, res) => {
    try {
        const q = await GeneratedQuestion.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        if (!q) return res.status(404).json({ error: 'Question not found' });
        res.json({ success: true, question: q });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/rag/questions/:id ────────────────────────────────────────────

router.patch('/questions/:id', auth, async (req, res) => {
    try {
        const allowedFields = ['questionText', 'options', 'correctAnswer', 'explanation', 'difficulty', 'bloomLevel', 'approved'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const q = await GeneratedQuestion.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!q) return res.status(404).json({ error: 'Question not found' });
        res.json({ success: true, question: q });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/rag/questions/:id ───────────────────────────────────────────

router.delete('/questions/:id', auth, async (req, res) => {
    try {
        const q = await GeneratedQuestion.findByIdAndDelete(req.params.id);
        if (!q) return res.status(404).json({ error: 'Question not found' });
        res.json({ success: true, message: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/rag/file/:fileId ────────────────────────────────────────────

router.delete('/file/:fileId', auth, async (req, res) => {
    try {
        const result = await removeFileFromStore(req.params.fileId);
        res.json({ success: true, message: 'File removed from knowledge base', ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//
//  STUDENT ENDPOINTS
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/rag/practice/generate ─────────────────────────────────────────
// Student picks a course, topic, and Bloom's level → gets a practice quiz.
// Answers are NOT included in the response (they submit separately).

router.post('/practice/generate', auth, async (req, res) => {
    try {
        const {
            courseId,
            topic = 'all topics',
            bloomLevel = 'understand',
            count = 5,
            difficulty = 'mixed',
        } = req.body;

        if (!courseId) return res.status(400).json({ error: 'courseId is required' });

        // Verify student is enrolled (or is the teacher)
        const enrollment = await verifyEnrollment(courseId, req.user.id);
        if (enrollment.error) return res.status(enrollment.status).json({ error: enrollment.error });

        const result = await generatePracticeQuestions({
            courseId,
            studentId: req.user.id,
            topic,
            bloomLevel: validateBloomLevel(bloomLevel),
            count: Math.min(Math.max(Number(count) || 5, 1), 10),
            difficulty,
        });

        res.json({ success: true, ...result });

    } catch (err) {
        console.error('Practice generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/practice/submit ───────────────────────────────────────────
// Student submits answers for a practice session.
// Returns: score, per-question results, Bloom's level breakdown.
//
// Body: { sessionId, answers: [{ questionId, selectedLabel }] }

router.post('/practice/submit', auth, async (req, res) => {
    try {
        const { sessionId, answers } = req.body;

        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
        if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

        const result = await submitPracticeSession({
            sessionId,
            studentId: req.user.id,
            answers,
        });

        res.json({ success: true, ...result });

    } catch (err) {
        console.error('Practice submission error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/rag/practice/history ───────────────────────────────────────────
// Returns the student's past practice sessions with scores and Bloom's breakdown.

router.get('/practice/history', auth, async (req, res) => {
    try {
        const { courseId, page = 1, limit = 20 } = req.query;

        const matchFilter = {
            createdBy: require('mongoose').Types.ObjectId(req.user.id),
            origin: 'student',
            sessionId: { $exists: true, $ne: null },
        };
        if (courseId) matchFilter.courseId = require('mongoose').Types.ObjectId(courseId);

        const sessions = await GeneratedQuestion.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$sessionId',
                    courseId: { $first: '$courseId' },
                    topic: { $first: '$topic' },
                    bloomLevel: { $first: '$bloomLevel' },
                    questionCount: { $sum: 1 },
                    createdAt: { $first: '$createdAt' },
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: (Math.max(Number(page), 1) - 1) * Number(limit) },
            { $limit: Math.min(Number(limit) || 20, 100) },
        ]);

        res.json({ success: true, sessions });

    } catch (err) {
        console.error('Practice history error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;