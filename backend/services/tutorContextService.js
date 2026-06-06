'use strict';

const Course = require('../models/Course');
const StudentProfile = require('../models/StudentProfile');
const Progress = require('../models/Progress');
const { retrieveRelevantChunks } = require('./retrievalService');

/**
 * Assemble per-turn context for the tutor: topic guide excerpt, RAG chunks,
 * and the student's recent quiz misses on this topic.
 *
 * Each source is independent — failure of one does not block the others.
 *
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.topicId
 * @param {string} params.topicTitle
 * @param {string|null} params.courseId
 * @param {string|null} params.pathId
 * @param {string} params.moduleId
 * @param {string} params.currentUserMessage  — used as the RAG query
 * @returns {{ topicGuideExcerpt, ragChunks, quizMisses, approxTokens }}
 */
async function assembleTutorContext({
    studentId,
    topicId,
    topicTitle,
    courseId,
    pathId,
    moduleId,
    currentUserMessage,
}) {
    let topicGuideExcerpt = null;
    let ragChunks = [];
    let quizMisses = [];
    let courseContext = { courseTitle: null, courseField: null, moduleTitle: null, pathField: null, pathLevel: null };

    // ── 2.1 Topic guide + course context ─────────────────────────────────────
    try {
        let content = null;

        if (courseId) {
            // Teacher course — Course.modules[].topics[].content
            // Note: current Course schema has no topic.content field;
            // this will safely return null for all teacher courses.
            const course = await Course.findById(courseId).select('modules title field').lean();
            if (course) {
                const mod = (course.modules || []).find(m => m.id === moduleId);
                const topic = (mod?.topics || []).find(t => t.id === topicId);
                content = topic?.content || null;
                courseContext = {
                    courseTitle: course.title || null,
                    courseField: course.field || null,
                    moduleTitle: mod?.title || null,
                    pathField: null,
                    pathLevel: null,
                };
            }
        } else {
            // AI path — StudentProfile
            const profile = await StudentProfile.findOne({ userId: studentId })
                .select('currentPath paths onboarding')
                .lean();

            if (profile) {
                let mod;
                if (pathId) {
                    const path = (profile.paths || []).find(
                        p => p._id?.toString() === pathId || p.id === pathId,
                    );
                    mod = (path?.modules || []).find(m => m.id === moduleId);
                    const topic = (mod?.topics || []).find(t => t.id === topicId);
                    content = topic?.content || null;
                    courseContext = {
                        courseTitle: null,
                        courseField: null,
                        moduleTitle: mod?.title || null,
                        pathField: path?.onboarding?.field || null,
                        pathLevel: path?.onboarding?.level || null,
                    };
                } else {
                    mod = (profile.currentPath?.modules || []).find(m => m.id === moduleId);
                    const topic = (mod?.topics || []).find(t => t.id === topicId);
                    content = topic?.content || null;
                    courseContext = {
                        courseTitle: null,
                        courseField: null,
                        moduleTitle: mod?.title || null,
                        pathField: profile.onboarding?.field || null,
                        pathLevel: profile.onboarding?.level || null,
                    };
                }
            }
        }

        if (content && content.trim()) {
            const words = content.trim().split(/\s+/);
            topicGuideExcerpt = words.length > 800
                ? words.slice(0, 800).join(' ') + '...'
                : content;
        }
    } catch (guideErr) {
        console.warn('[TutorContext] Topic guide load failed:', guideErr.message);
    }

    // ── 2.2 RAG retrieval (teacher courses only) ──────────────────────────────
    if (courseId) {
        try {
            const chunks = await retrieveRelevantChunks({
                query: currentUserMessage,
                courseId: courseId.toString(),
                topK: 5,
            });

            ragChunks = chunks
                .filter(c => c.text && c.text.trim().length >= 30)
                .map(c => ({
                    text: c.text.length > 600 ? c.text.slice(0, 597) + '...' : c.text,
                    source: c.source || 'Unknown',
                }));
        } catch (ragErr) {
            console.warn('[TutorContext] RAG retrieval failed:', ragErr.message);
        }
    }

    // ── 2.3 Quiz misses ───────────────────────────────────────────────────────
    try {
        const misses = [];
        const titleLower = topicTitle.toLowerCase();

        // Source 1: Progress (teacher-course quizzes)
        // Progress.wrongQuestions shape: { questionText, studentAnswer, correctAnswer, topic }
        try {
            const progressDocs = await Progress.find({ student: studentId })
                .select('topicQuizScores')
                .lean();

            for (const doc of progressDocs) {
                for (const entry of (doc.topicQuizScores || [])) {
                    const matchId    = entry.topicId === topicId;
                    const matchTitle = entry.topicTitle?.toLowerCase() === titleLower;
                    if (!matchId && !matchTitle) continue;

                    for (const q of (entry.wrongQuestions || [])) {
                        misses.push({
                            question:      q.questionText || q.question || '',
                            studentAnswer: q.studentAnswer || q.userAnswer || '',
                            correctAnswer: q.correctAnswer || '',
                            topic:         q.topic || entry.topicTitle || topicTitle,
                            attemptDate:   entry.attemptDate || null,
                        });
                    }
                }
            }
        } catch (progressErr) {
            console.warn('[TutorContext] Progress quiz misses failed:', progressErr.message);
        }

        // Source 2: StudentProfile (AI-path quizzes)
        // StudentProfile.quizHistory.wrongQuestions shape: { question, userAnswer, correctAnswer }
        try {
            const profile = await StudentProfile.findOne({ userId: studentId })
                .select('quizHistory')
                .lean();

            for (const entry of (profile?.quizHistory || [])) {
                if (entry.topicTitle?.toLowerCase() !== titleLower) continue;

                const wq = Array.isArray(entry.wrongQuestions) ? entry.wrongQuestions : [];
                for (const q of wq) {
                    misses.push({
                        question:      q.question || q.questionText || '',
                        studentAnswer: q.userAnswer || q.studentAnswer || '',
                        correctAnswer: q.correctAnswer || '',
                        topic:         q.topic || entry.topicTitle || topicTitle,
                        attemptDate:   entry.attemptDate || null,
                    });
                }
            }
        } catch (profileErr) {
            console.warn('[TutorContext] StudentProfile quiz misses failed:', profileErr.message);
        }

        // Sort most-recent first, take last 5, strip empty questions, drop attemptDate
        misses.sort((a, b) => {
            if (a.attemptDate && b.attemptDate) {
                return new Date(b.attemptDate) - new Date(a.attemptDate);
            }
            return 0;
        });

        quizMisses = misses
            .filter(m => m.question)
            .slice(0, 5)
            .map(({ question, studentAnswer, correctAnswer, topic }) => ({
                question, studentAnswer, correctAnswer, topic,
            }));
    } catch (missErr) {
        console.warn('[TutorContext] Quiz misses assembly failed:', missErr.message);
    }

    // ── 2.4 Approximate token count ───────────────────────────────────────────
    const courseContextChars =
        (courseContext.courseTitle?.length || 0) +
        (courseContext.courseField?.length || 0) +
        (courseContext.moduleTitle?.length || 0) +
        (courseContext.pathField?.length || 0) +
        (courseContext.pathLevel?.length || 0);
    const charCount =
        (topicGuideExcerpt?.length || 0) +
        ragChunks.reduce((s, c) => s + c.text.length, 0) +
        quizMisses.reduce((s, m) =>
            s + (m.question?.length || 0) + (m.studentAnswer?.length || 0) + (m.correctAnswer?.length || 0),
        0) + courseContextChars;
    const approxTokens = Math.ceil(charCount / 4);

    return { topicGuideExcerpt, ragChunks, quizMisses, approxTokens, courseContext };
}

module.exports = { assembleTutorContext };
