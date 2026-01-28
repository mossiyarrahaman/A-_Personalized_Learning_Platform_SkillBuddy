const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // Optional
    moduleId: String,
    topicId: String,

    title: { type: String, required: true },
    description: { type: String, required: true },
    codeSnippet: String,
    imageUrl: String,

    status: { type: String, enum: ['open', 'answered', 'resolved'], default: 'open' },
    isImportant: { type: Boolean, default: false },
    isFAQ: { type: Boolean, default: false },

    answers: [{
        responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Teacher or AI
        responderName: String, // "AI Assistant" or Teacher Name
        content: String,
        audioUrl: String, // Voice explanation
        attachments: [{
            type: { type: String, enum: ['image', 'file', 'code'] },
            url: String,
            name: String
        }],
        isAccepted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],

    tags: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doubt', doubtSchema);
