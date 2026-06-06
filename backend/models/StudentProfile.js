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
        // CROSS-COURSE aggregated average. Recomputed from all Progress.topicQuizScores
        // in quizRecorderService (and the submitTopicQuiz / submitAiPathQuiz paths in
        // courseController). Do not write this from any other path.
        avgScore: { type: Number, default: 0 }
    },

    currentPath: {
        generatedAt: Date,
        modules: [{
            id: String,
            title: String,
            description: String,
            duration: String,
            difficultyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert', 'production'], default: 'beginner' },
            goalStatement: { type: String, default: '' },
            practiceProjects: [{ type: String }],
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
                        teacherNote: String,
                        exampleCode: String,
                        exampleExplanation: String,
                        keyPoints: [String],
                        commonMistake: String,
                        action: String,
                        estimatedTime: String,
                        completed: { type: Boolean, default: false },
                        resources: [{
                            type: { type: String },
                            title: String,
                            url: String
                        }]
                    }]
                }
            }]
        }]
    },

    paths: [{
        onboarding: { field: String, level: String, goals: [String] },
        generatedAt: { type: Date, default: Date.now },
        completedAt: Date,
        modules: [{
            id: String, title: String, description: String, duration: String,
            difficultyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert', 'production'], default: 'beginner' },
            goalStatement: { type: String, default: '' },
            practiceProjects: [{ type: String }],
            status: { type: String, enum: ['locked', 'unlocked', 'completed'], default: 'locked' },
            topics: [{
                id: String, title: String, description: String, content: String,
                status: { type: String, enum: ['pending', 'unlocked', 'completed'], default: 'pending' },
                subtopics: [{ id: String, title: String, description: String, status: { type: String, enum: ['pending', 'completed'], default: 'pending' } }],
                resources: [{ type: String, title: String, url: String, duration: String, completed: Boolean }],
                plan: {
                    objectives: [String], estimatedTime: String, generatedAt: Date,
                    steps: [{
                        stepNumber: Number, title: String, explanation: String, teacherNote: String,
                        exampleCode: String, exampleExplanation: String, keyPoints: [String],
                        commonMistake: String, action: String, estimatedTime: String,
                        completed: { type: Boolean, default: false },
                        resources: [{ type: { type: String }, title: String, url: String }]
                    }]
                }
            }]
        }]
    }],

    quizHistory: [{
        topicTitle: { type: String, default: '' },
        score: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        bloomLevel: { type: String, default: '' },
        difficulty: { type: String, default: '' },
        wrongQuestions: { type: mongoose.Schema.Types.Mixed, default: [] },
        timeTaken: { type: Number, default: 0 },
        attemptDate: { type: Date, default: Date.now },
    }],

    streakHistory: [{
        date: Date,
        active: Boolean
    }],
    lastActiveDate: { type: Date, default: Date.now }
});

studentProfileSchema.index({ points: -1, _id: 1 }); // leaderboard sort

module.exports = mongoose.model('StudentProfile', studentProfileSchema);