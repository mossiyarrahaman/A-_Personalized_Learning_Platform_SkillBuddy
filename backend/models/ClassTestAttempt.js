const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionIndex: { type: Number },
    selectedLabel: { type: String },   // 'A' | 'B' | 'C' | 'D'
    isCorrect:     { type: Boolean },
}, { _id: false });

const classTestAttemptSchema = new mongoose.Schema(
    {
        testId:            { type: mongoose.Schema.Types.ObjectId, ref: 'ClassTest', required: true },
        studentId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        courseId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        topicId:           { type: String },
        attemptNumber:     { type: Number, default: 1 },
        startedAt:         { type: Date, default: null },
        submittedAt:       { type: Date, default: null },
        timeTakenSeconds:  { type: Number, default: null },
        answers:           [answerSchema],
        score:             { type: Number, default: null },   // percentage 0-100
        correctCount:      { type: Number, default: 0 },
        totalQuestions:    { type: Number, default: 0 },
        passed:            { type: Boolean, default: false },
        status:            { type: String, enum: ['in_progress', 'submitted', 'timed_out'], default: 'in_progress' },
    },
    { timestamps: true }
);

classTestAttemptSchema.index({ testId: 1, studentId: 1 });
classTestAttemptSchema.index({ courseId: 1, testId: 1 });
classTestAttemptSchema.index({ studentId: 1, courseId: 1 });

module.exports = mongoose.model('ClassTestAttempt', classTestAttemptSchema);
