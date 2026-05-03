const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    sender: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        role: { type: String, enum: ['student', 'teacher'], required: true },
    },
    message: { type: String, required: true, maxlength: 2000 },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
