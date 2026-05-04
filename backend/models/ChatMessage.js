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

chatMessageSchema.index({ courseId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // auto-delete after 90 days

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
