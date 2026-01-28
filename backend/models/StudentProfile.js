const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Onboarding Data
    onboarding: {
        field: String, // e.g., "Web Development"
        level: String, // e.g., "Beginner"
        goals: [String], // e.g., ["Career Change", "Freelancing"]
        learningStyle: String, // e.g., "Visual", "Hands-on"
        completed: { type: Boolean, default: false }
    },

    // Gamification
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{
        id: String,
        name: String,
        icon: String,
        awardedAt: { type: Date, default: Date.now }
    }],

    // Stats
    stats: {
        hoursStudied: { type: Number, default: 0 },
        coursesCompleted: { type: Number, default: 0 },
        quizzesTaken: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 }
    },

    // Learning Path
    currentPath: {
        generatedAt: Date,
        modules: [{
            id: String,
            title: String,
            description: String,
            duration: String,
            status: { type: String, enum: ['locked', 'unlocked', 'completed'], default: 'locked' },
            topics: [{
                id: String,
                title: String,
                description: String,
                content: String, // Full detailed breakdown/guide
                status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
                resources: [{
                    type: String,
                    title: String,
                    url: String,
                    duration: String,
                    completed: Boolean
                }]
            }]
        }]
    },

    streakHistory: [{
        date: Date,
        active: Boolean
    }],
    lastActiveDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
