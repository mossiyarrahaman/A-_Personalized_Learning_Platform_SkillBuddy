const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    field: String, // Global if null
    period: { type: String, enum: ['weekly', 'monthly', 'all-time'], default: 'weekly' },
    entries: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        avatar: String,
        points: Number,
        rank: Number
    }],
    lastUpdated: { type: Date, default: Date.now }
});

const activityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // 'login', 'quiz_complete', 'module_unlock', 'doubt_ask'
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

module.exports = {
    Leaderboard: mongoose.model('Leaderboard', leaderboardSchema),
    ActivityLog: mongoose.model('ActivityLog', activityLogSchema)
};
