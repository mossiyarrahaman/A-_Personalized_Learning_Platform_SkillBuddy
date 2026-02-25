const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedTopics: [{ type: String }],
    completedResources: [{ type: String }],
    resourceProgress: [{
        resourceId: String,
        type: String,
        timeSpent: { type: Number, default: 0 }, // seconds
        completed: { type: Boolean, default: false },
        lastPosition: { type: Number, default: 0 }
    }],
    topicQuizScores: [{
        topicId: String, // ID from the Course.modules.topics
        topicTitle: String,
        score: Number, // Percentage 0-100
        totalQuestions: Number,
        correctAnswers: Number,
        passed: { type: Boolean, default: false }, // >= 70%
        attempts: { type: Number, default: 0 },
        lastAttemptDate: { type: Date, default: Date.now }
    }],
    grade: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now },
    enrollmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' }
});

// Compound index to ensure a student is enrolled in a course only once
progressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
