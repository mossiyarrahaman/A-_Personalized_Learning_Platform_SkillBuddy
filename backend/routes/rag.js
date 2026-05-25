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
const rateLimit = require('express-rate-limit');
const router = express.Router();

const auth = require('../middleware/auth');

const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Too many generation requests. Please wait before generating more.' },
});
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const GeneratedQuestion = require('../models/GeneratedQuestion');
const mongoose = require('mongoose');
const { ingestResource, removeFileFromStore } = require('../services/ingestionService');
const { generateQuestions, generatePracticeQuestions, submitPracticeSession } = require('../services/questionGenerationService');
const { getCorpusStats, retrieveRelevantChunks } = require('../services/retrievalService');
const aiService = require('../services/ai-service');
const { bloomToTier, isValidTier } = require('../utils/tierUtils');

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

router.post('/generate', auth, generateLimiter, async (req, res) => {
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
        const { type, approved, difficulty, bloomLevel, topicId, difficultyTier, page = 1, limit = 20 } = req.query;

        const filter = { courseId: req.params.courseId, origin: 'teacher' };
        if (type) filter.questionType = type;
        if (approved !== undefined) filter.approved = approved === 'true';
        if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
        if (bloomLevel && bloomLevel !== 'all') filter.bloomLevel = bloomLevel;
        if (topicId) filter.topicId = topicId;
        if (difficultyTier) filter.difficultyTier = difficultyTier;

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
        const q = await GeneratedQuestion.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Question not found' });
        const course = await Course.findById(q.courseId).select('author').lean();
        if (!course || course.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
        q.approved = true;
        await q.save();
        res.json({ success: true, question: q });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/rag/questions/:id ────────────────────────────────────────────

router.patch('/questions/:id', auth, async (req, res) => {
    try {
        const q = await GeneratedQuestion.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Question not found' });
        const course = await Course.findById(q.courseId).select('author').lean();
        if (!course || course.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        const allowedFields = ['questionText', 'options', 'correctAnswer', 'explanation', 'difficulty', 'bloomLevel', 'approved', 'difficultyTier'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) q[field] = req.body[field];
        }
        await q.save();
        res.json({ success: true, question: q });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/rag/questions/:id ───────────────────────────────────────────

router.delete('/questions/:id', auth, async (req, res) => {
    try {
        const q = await GeneratedQuestion.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Question not found' });
        const course = await Course.findById(q.courseId).select('author').lean();
        if (!course || course.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
        await q.deleteOne();
        res.json({ success: true, message: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/generate-topic-quiz ──────────────────────────────────────
// Teacher generates 10 MCQ for a specific topic with difficulty + Bloom's level.
// Replaces any previous quiz for that topic.
// Body: { courseId, topicId, topicTitle, moduleTitle?, difficulty, bloomLevel }
// difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
// bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' | 'mixed'

const DIFFICULTY_MAP = {
    Beginner: 'easy', beginner: 'easy', easy: 'easy',
    Intermediate: 'medium', intermediate: 'medium', medium: 'medium',
    Advanced: 'hard', advanced: 'hard', hard: 'hard',
};

router.post('/generate-topic-quiz', auth, async (req, res) => {
    try {
        const {
            courseId,
            topicId,
            topicTitle = '',
            moduleTitle = '',
            difficulty = 'Intermediate',
            bloomLevel = 'understand',
            numQuestions: rawNQ,
        } = req.body;
        const numQuestions = Math.min(Math.max(parseInt(rawNQ) || 10, 3), 20);

        if (!courseId) return res.status(400).json({ error: 'courseId is required' });
        if (!topicId)  return res.status(400).json({ error: 'topicId is required' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const dbDifficulty = DIFFICULTY_MAP[difficulty] || 'medium';
        const validBloom = validateBloomLevel(bloomLevel);
        const tierFromDifficulty = difficulty.toLowerCase();
        const difficultyTier = isValidTier(tierFromDifficulty) ? tierFromDifficulty : bloomToTier(validBloom);

        // Retrieve RAG context for this topic
        let contextText = '';
        try {
            const ragQuery = [topicTitle, moduleTitle].filter(Boolean).join(' ');
            const chunks = await retrieveRelevantChunks({ query: ragQuery, courseId, topK: 10 });
            if (chunks.length > 0) {
                contextText = chunks.map(c => `[Source: ${c.source || 'course material'}]\n${c.text}`).join('\n\n---\n\n');
            }
        } catch (_) {}

        const course = ownership.course;
        const questions = await aiService.generateTopicQuiz(
            topicTitle,
            moduleTitle || topicTitle,
            course.title || '',
            course.field || course.title || '',
            difficulty,
            validBloom,
            contextText,
            numQuestions
        );

        // Replace only questions for this tier (so other tiers are preserved)
        const deleteFilter = difficultyTier
            ? { courseId, topicId, origin: 'teacher', difficultyTier }
            : { courseId, topicId, origin: 'teacher' };
        await GeneratedQuestion.deleteMany(deleteFilter);

        // Reset only the tier-specific published flag
        const courseForReset = ownership.course;
        for (const mod of courseForReset.modules) {
            const t = mod.topics.find(t => t.id === topicId || t._id?.toString() === topicId);
            if (t) {
                if (difficultyTier === 'beginner') t.quizPublishedBeginner = false;
                else if (difficultyTier === 'intermediate') t.quizPublishedIntermediate = false;
                else if (difficultyTier === 'advanced') t.quizPublishedAdvanced = false;
                else t.quizPublished = false;
                break;
            }
        }
        await courseForReset.save();

        // Strip "A) " / "B) " prefix the AI sometimes includes in option text
        const stripPrefix = (s) => (typeof s === 'string' ? s.replace(/^[A-Da-d][).]\s*/, '').trim() : s || '');

        // Persist as teacher-approved questions with tier tag
        const docs = questions.map(q => {
            const cleanCorrect = stripPrefix(q.correctAnswer);
            return {
                courseId,
                createdBy: req.user.id,
                topic: topicTitle,
                topicId,
                questionType: 'mcq',
                questionText: q.question || q.questionText || '',
                options: (q.options || []).map((text, i) => {
                    const clean = stripPrefix(text);
                    return {
                        label: String.fromCharCode(65 + i),
                        text: clean,
                        isCorrect: clean === cleanCorrect,
                    };
                }),
                correctAnswer: cleanCorrect,
                explanation: q.explanation || '',
                hint: q.hint || '',
                difficulty: dbDifficulty,
                bloomLevel: validBloom,
                difficultyTier: difficultyTier || null,
                origin: 'teacher',
                approved: true,
            };
        }).filter(d => d.questionText);

        await GeneratedQuestion.insertMany(docs);

        res.json({
            success: true,
            generated: docs.length,
            topicId,
            topicTitle,
            difficulty: dbDifficulty,
            bloomLevel: validBloom,
            difficultyTier: difficultyTier || null,
        });
    } catch (err) {
        console.error('generate-topic-quiz error:', err);
        const msg = (typeof err?.message === 'string' && err.message)
            ? err.message
            : (typeof err === 'string' ? err : 'Quiz generation failed. Please try again.');
        res.status(500).json({ error: msg });
    }
});

// ─── GET /api/rag/topic-quiz/:courseId/:topicId ──────────────────────────────
// Returns teacher-generated quiz questions for a topic (in QuizModal format).

router.get('/topic-quiz/:courseId/:topicId', auth, async (req, res) => {
    try {
        const tier = req.query.tier || null;
        const course = await Course.findById(req.params.courseId).lean();
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const isAuthor = course.author.toString() === req.user.id;

        // Determine published state — tier-specific if tier provided, otherwise generic
        let isPublished = false;
        for (const mod of course.modules || []) {
            const t = (mod.topics || []).find(t => t.id === req.params.topicId);
            if (t) {
                if (tier === 'beginner') isPublished = t.quizPublishedBeginner || false;
                else if (tier === 'intermediate') isPublished = t.quizPublishedIntermediate || false;
                else if (tier === 'advanced') isPublished = t.quizPublishedAdvanced || false;
                else isPublished = t.quizPublished || false;
                break;
            }
        }

        // Students can only see published quizzes; teachers can always preview
        if (!isAuthor && !isPublished) {
            return res.json({ exists: false, published: false, difficultyTier: tier, questions: [] });
        }

        const queryFilter = {
            courseId: req.params.courseId,
            topicId: req.params.topicId,
            origin: 'teacher',
            approved: true,
        };
        if (tier) queryFilter.difficultyTier = tier;

        const questions = await GeneratedQuestion.find(queryFilter)
            .sort({ createdAt: 1 }).limit(50).lean();

        if (!questions.length) {
            return res.json({ exists: false, published: isPublished, difficultyTier: tier, questions: [] });
        }

        const formatted = questions.map(q => ({
            question: q.questionText,
            options: q.options.map(o => o.text),
            correctAnswer: q.options.find(o => o.isCorrect)?.text || q.correctAnswer,
            explanation: q.explanation,
            hint: q.hint || '',
            bloomLevel: q.bloomLevel,
            difficulty: q.difficulty,
            difficultyTier: q.difficultyTier,
        }));

        res.json({
            exists: true,
            published: isPublished,
            difficultyTier: questions[0].difficultyTier || tier,
            questions: formatted,
            bloomLevel: questions[0].bloomLevel,
            difficulty: questions[0].difficulty,
            topicTitle: questions[0].topic,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/rag/topic-quizzes/:courseId ────────────────────────────────────
// Returns a summary of all topics that have teacher-generated quizzes (bulk check).

router.get('/topic-quizzes/:courseId', auth, async (req, res) => {
    try {
        const quizzes = await GeneratedQuestion.aggregate([
            {
                $match: {
                    courseId: new mongoose.Types.ObjectId(req.params.courseId),
                    origin: 'teacher',
                    approved: true,
                    topicId: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: { topicId: '$topicId', difficultyTier: '$difficultyTier' },
                    topicTitle: { $first: '$topic' },
                    bloomLevel: { $first: '$bloomLevel' },
                    difficulty: { $first: '$difficulty' },
                    questionCount: { $sum: 1 },
                    createdAt: { $max: '$createdAt' },
                },
            },
        ]);

        // Build byTopic map with per-tier data
        const byTopic = {};
        for (const q of quizzes) {
            const topicId = q._id.topicId;
            const tier = q._id.difficultyTier || 'default';
            if (!byTopic[topicId]) {
                byTopic[topicId] = { topicTitle: q.topicTitle, tiers: {} };
            }
            byTopic[topicId].tiers[tier] = {
                bloomLevel: q.bloomLevel,
                difficulty: q.difficulty,
                questionCount: q.questionCount,
                createdAt: q.createdAt,
                published: false,
            };
        }

        // Merge tier-specific published state
        const courseData = await Course.findById(req.params.courseId).select('modules').lean();
        if (courseData) {
            for (const mod of courseData.modules || []) {
                for (const t of mod.topics || []) {
                    const key = t.id || t._id?.toString();
                    if (key && byTopic[key]) {
                        if (byTopic[key].tiers.beginner)     byTopic[key].tiers.beginner.published     = t.quizPublishedBeginner || false;
                        if (byTopic[key].tiers.intermediate) byTopic[key].tiers.intermediate.published = t.quizPublishedIntermediate || false;
                        if (byTopic[key].tiers.advanced)     byTopic[key].tiers.advanced.published     = t.quizPublishedAdvanced || false;
                        if (byTopic[key].tiers.default)      byTopic[key].tiers.default.published      = t.quizPublished || false;
                    }
                }
            }
        }

        res.json({ success: true, quizzes: byTopic });
    } catch (err) {
        console.error('topic-quizzes error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/publish-quiz ──────────────────────────────────────────────
// Teacher publishes or unpublishes a topic quiz. Students can only take published quizzes.

router.post('/publish-quiz', auth, async (req, res) => {
    try {
        const { courseId, topicId, published } = req.body;
        if (!courseId || !topicId) return res.status(400).json({ error: 'courseId and topicId are required' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const course = ownership.course;
        let found = false;
        for (const mod of course.modules) {
            const t = mod.topics.find(t => t.id === topicId || t._id?.toString() === topicId);
            if (t) { t.quizPublished = !!published; found = true; break; }
        }
        if (!found) return res.status(404).json({ error: 'Topic not found in this course' });
        await course.save();
        res.json({ success: true, published: !!published });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/publish-quiz-tier ────────────────────────────────────────
// Teacher publishes or unpublishes a specific difficulty tier quiz for a topic.
// Body: { courseId, topicId, tier: 'beginner'|'intermediate'|'advanced', published: boolean }

router.post('/publish-quiz-tier', auth, async (req, res) => {
    try {
        const { courseId, topicId, tier, published } = req.body;
        if (!courseId || !topicId) return res.status(400).json({ error: 'courseId and topicId are required' });
        if (!isValidTier(tier)) return res.status(400).json({ error: 'tier must be beginner, intermediate, or advanced' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const flagKey = tier === 'beginner' ? 'quizPublishedBeginner'
            : tier === 'intermediate' ? 'quizPublishedIntermediate'
            : 'quizPublishedAdvanced';

        const course = ownership.course;
        let found = false;
        for (const mod of course.modules) {
            const t = mod.topics.find(t => t.id === topicId || t._id?.toString() === topicId);
            if (t) { t[flagKey] = !!published; found = true; break; }
        }
        if (!found) return res.status(404).json({ error: 'Topic not found in this course' });
        await course.save();
        res.json({ success: true, tier, published: !!published });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/questions ─────────────────────────────────────────────────
// Teacher adds a custom question to a topic quiz.
// Body: { courseId, topicId, topicTitle, questionText, options, explanation, difficulty, bloomLevel }

router.post('/questions', auth, async (req, res) => {
    try {
        const { courseId, topicId, topicTitle = '', questionText, options, explanation = '', difficulty = 'medium', bloomLevel = 'understand', difficultyTier } = req.body;
        if (!courseId || !topicId) return res.status(400).json({ error: 'courseId and topicId are required' });
        if (!questionText?.trim()) return res.status(400).json({ error: 'questionText is required' });
        if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'At least 2 options required' });
        if (!options.some(o => o.isCorrect)) return res.status(400).json({ error: 'Mark at least one option as correct' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const doc = await GeneratedQuestion.create({
            courseId,
            topicId,
            topic: topicTitle,
            createdBy: req.user.id,
            questionType: 'mcq',
            questionText: questionText.trim(),
            options: options.map((o, i) => ({
                label: o.label || String.fromCharCode(65 + i),
                text: o.text || '',
                isCorrect: !!o.isCorrect,
            })),
            correctAnswer: options.find(o => o.isCorrect)?.text || '',
            explanation: explanation.trim(),
            difficulty: DIFFICULTY_MAP[difficulty] || difficulty || 'medium',
            bloomLevel: VALID_BLOOM_LEVELS.includes(bloomLevel) ? bloomLevel : 'understand',
            difficultyTier: isValidTier(difficultyTier) ? difficultyTier : null,
            origin: 'teacher',
            approved: true,
        });

        res.json({ success: true, question: doc });
    } catch (err) {
        console.error('add-question error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/rag/generate-single-question ───────────────────────────────────
// Teacher generates a single AI question to add to an existing topic quiz.
// Body: { courseId, topicId, topicTitle, difficulty, bloomLevel }

router.post('/generate-single-question', auth, async (req, res) => {
    try {
        const { courseId, topicId, topicTitle = '', difficulty = 'Intermediate', bloomLevel = 'understand' } = req.body;
        if (!courseId || !topicId) return res.status(400).json({ error: 'courseId and topicId are required' });

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const dbDifficulty = DIFFICULTY_MAP[difficulty] || 'medium';
        const validBloom = VALID_BLOOM_LEVELS.includes(bloomLevel) ? bloomLevel : 'understand';

        const questions = await aiService.generateTopicQuiz(
            topicTitle, '', '', '', dbDifficulty, validBloom, '', 1
        );
        if (!questions || questions.length === 0) return res.status(500).json({ error: 'AI failed to generate a question' });

        const q = questions[0];
        const stripPfx = (s) => (typeof s === 'string' ? s.replace(/^[A-Da-d][).]\s*/, '').trim() : s || '');
        const cleanCorrect = stripPfx(q.correctAnswer);
        const doc = await GeneratedQuestion.create({
            courseId,
            topicId,
            topic: topicTitle,
            createdBy: req.user.id,
            questionType: 'mcq',
            questionText: q.question || q.questionText || '',
            options: (q.options || []).map((text, i) => {
                const clean = stripPfx(text);
                return { label: String.fromCharCode(65 + i), text: clean, isCorrect: clean === cleanCorrect };
            }),
            correctAnswer: cleanCorrect,
            explanation: q.explanation || '',
            difficulty: dbDifficulty,
            bloomLevel: validBloom,
            origin: 'teacher',
            approved: true,
        });

        res.json({ success: true, question: doc });
    } catch (err) {
        console.error('generate-single-question error:', err);
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

router.post('/practice/generate', auth, generateLimiter, async (req, res) => {
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

// ─── POST /api/rag/reindex/:courseId ────────────────────────────────────────
// Backfill vector embeddings for existing chunks that predate the embedding
// upgrade. Returns immediately; embedding runs in the background.

router.post('/reindex/:courseId', auth, async (req, res) => {
    try {
        const { courseId } = req.params;

        const ownership = await verifyCourseOwnership(courseId, req.user.id);
        if (ownership.error) return res.status(ownership.status).json({ error: ownership.error });

        const embeddingService = require('../services/embeddingService');
        if (!embeddingService.isAvailable()) {
            return res.status(503).json({ error: 'Embedding API not configured. Add OPENAI_API_KEY to .env.' });
        }

        const ResourceChunk = require('../models/ResourceChunk');
        const chunks = await ResourceChunk.find({
            courseId,
            embeddedAt: null,
        }).select('_id text').lean();

        if (chunks.length === 0) {
            return res.json({ success: true, message: 'All chunks already embedded.', reindexed: 0 });
        }

        res.json({ success: true, message: `Reindexing ${chunks.length} chunks in background.`, chunks: chunks.length });

        setImmediate(async () => {
            try {
                const embeddings = await embeddingService.embedTexts(chunks.map(c => c.text));
                const ops = chunks.map((c, i) => ({
                    updateOne: {
                        filter: { _id: c._id },
                        update: {
                            $set: {
                                embedding: embeddings[i],
                                embeddingModel: embeddingService.MODEL,
                                embeddedAt: new Date(),
                            },
                        },
                    },
                }));
                await ResourceChunk.bulkWrite(ops);
                console.log(`[RAG] Reindexed ${chunks.length} chunks for course ${courseId}`);
            } catch (err) {
                console.error('[RAG] Reindex failed:', err.message);
            }
        });
    } catch (err) {
        console.error('Reindex error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;