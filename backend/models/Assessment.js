const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['initial', 'practice', 'formal', 'speed', 'certification'], required: true },
    field: String,
    level: String,
    topic: String, // Specific topic if applicable

    questions: [{
        questionJson: mongoose.Schema.Types.Mixed, // Store the full JSON from AI
        userAnswer: String,
        isCorrect: Boolean,
        timeTaken: Number // in seconds
    }],

    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    // Analytics
    weakAreas: [String], // Topics where user failed
    bloomStats: {
        remember: Number,
        understand: Number,
        apply: Number,
        analyze: Number,
        evaluate: Number,
        create: Number
    },

    completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
