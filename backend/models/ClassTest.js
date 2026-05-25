const mongoose = require('mongoose');

const questionOptionSchema = new mongoose.Schema({
    label:     { type: String },  // 'A', 'B', 'C', 'D'
    text:      { type: String },
    isCorrect: { type: Boolean, default: false },
}, { _id: false });

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options:      [questionOptionSchema],
    explanation:  { type: String, default: '' },
    bloomLevel:   { type: String, default: '' },
    difficulty:   { type: String, default: '' },
}, { _id: false });

const classTestSchema = new mongoose.Schema(
    {
        courseId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
        topicId:           { type: String, default: null, index: true },
        moduleId:          { type: String, default: null, index: true },
        createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title:             { type: String, required: true },
        instructions:      { type: String, default: '' },
        openAt:            { type: Date, default: null },
        closeAt:           { type: Date, default: null },
        timeLimitMinutes:  { type: Number, required: true, default: 30 },
        maxAttempts:       { type: Number, default: 1 },
        isPublished:       { type: Boolean, default: false },
        questionSource:    { type: String, enum: ['ai_generated', 'manual'], default: 'ai_generated' },
        questions:         [questionSchema],
    },
    { timestamps: true }
);

classTestSchema.index({ courseId: 1, topicId: 1, isPublished: 1 });
classTestSchema.index({ courseId: 1, moduleId: 1, isPublished: 1 });
classTestSchema.index({ courseId: 1, closeAt: 1 });

module.exports = mongoose.model('ClassTest', classTestSchema);
