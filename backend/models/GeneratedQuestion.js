/**
 * models/GeneratedQuestion.js
 *
 * Stores AI-generated questions from the RAG pipeline.
 *
 * Key fields:
 *   - bloomLevel:  Bloom's taxonomy level that shaped the question
 *   - origin:      'teacher' (saved to question bank) or 'student' (practice session)
 *   - sessionId:   Groups student practice questions into a single session
 *
 * Bloom's Taxonomy levels (in ascending cognitive complexity):
 *   remember → understand → apply → analyze → evaluate → create
 *
 * Teacher questions live permanently in the question bank for reuse.
 * Student practice questions are ephemeral — they can be auto-purged after
 * 30 days via a TTL index or a scheduled cleanup job.
 */

const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    label: { type: String },     // A, B, C, D
    text: { type: String },
    isCorrect: { type: Boolean },
}, { _id: false });

const generatedQuestionSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ── Content ──────────────────────────────────────────────────────────
        topic: { type: String },
        questionType: {
            type: String,
            enum: ['mcq', 'short_answer', 'true_false', 'fill_in_blank', 'essay'],
            required: true,
        },
        questionText: { type: String, required: true },
        options: [optionSchema],          // MCQ / True-False
        correctAnswer: { type: String },  // All types except MCQ (where isCorrect is on options)
        explanation: { type: String },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },

        // ── Bloom's Taxonomy ─────────────────────────────────────────────────
        bloomLevel: {
            type: String,
            enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'mixed'],
            default: 'understand',
            index: true,
        },

        // ── Topic reference ──────────────────────────────────────────────────
        topicId: { type: String, index: true },   // Course topic ID (for teacher-generated quizzes)

        // ── Origin tracking ──────────────────────────────────────────────────
        origin: {
            type: String,
            enum: ['teacher', 'student'],
            default: 'teacher',
            index: true,
        },
        sessionId: {
            type: String,  // Groups practice questions into one session
            index: true,
        },

        // ── Teacher review ───────────────────────────────────────────────────
        approved: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound indexes for common query patterns
generatedQuestionSchema.index({ courseId: 1, origin: 1, bloomLevel: 1 });
generatedQuestionSchema.index({ courseId: 1, origin: 1, approved: 1 });
generatedQuestionSchema.index({ sessionId: 1, origin: 1 });

// Auto-delete student practice questions after 30 days
generatedQuestionSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 3600, partialFilterExpression: { origin: 'student' } }
);

module.exports = mongoose.model('GeneratedQuestion', generatedQuestionSchema);