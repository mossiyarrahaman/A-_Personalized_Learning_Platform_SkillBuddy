const mongoose = require('mongoose');

const topicQuizSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // Optional, mostly for context
    classId: String, // To link with specific class/course string ID if needed
    topic: { type: String, required: true },
    bloomLevel: { type: String, default: 'understand' }, // To differentiate quizzes by complexity

    questions: [{
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
        hint: String,
        difficulty: Number
    }],

    generatedBy: { type: String, default: 'AI' },
    createdAt: { type: Date, default: Date.now }
});

// Index to easily find a quiz for a specific topic and bloom level
topicQuizSchema.index({ topic: 1, bloomLevel: 1 });

module.exports = mongoose.model('TopicQuiz', topicQuizSchema);
