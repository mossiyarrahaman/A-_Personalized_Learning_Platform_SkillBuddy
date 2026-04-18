const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    onboarding: {
        field: String,
        level: String,
        goals: [String],
        learningStyle: String,
        completed: { type: Boolean, default: false }
    },

    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{
        id: String,
        name: String,
        icon: String,
        awardedAt: { type: Date, default: Date.now }
    }],

    stats: {
        hoursStudied: { type: Number, default: 0 },
        coursesCompleted: { type: Number, default: 0 },
        quizzesTaken: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 }
    },

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
                content: String,
                status: { type: String, enum: ['pending', 'unlocked', 'completed'], default: 'pending' },
                // ── NEW: subtopics for roadmap.sh-style breakdown ──
                subtopics: [{
                    id: String,
                    title: String,
                    description: String,
                    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
                }],
                resources: [{
                    type: String,
                    title: String,
                    url: String,
                    duration: String,
                    completed: Boolean
                }],
                plan: {
                    objectives: [String],
                    estimatedTime: String,
                    generatedAt: Date,
                    steps: [{
                        stepNumber: Number,
                        title: String,
                        explanation: String,
                        action: String,
                        estimatedTime: String,
                        completed: { type: Boolean, default: false },
                        resources: [{
                            type: String,
                            title: String,
                            url: String
                        }]
                    }]
                }
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