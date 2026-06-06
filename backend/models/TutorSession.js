'use strict';
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, required: true, maxlength: 8000 },
    mode:      { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

const tutorSessionSchema = new mongoose.Schema({
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  default: null,  index: true },
    pathId:      { type: String, default: null },
    moduleId:    { type: String, required: true },
    topicId:     { type: String, required: true },
    topicTitle:  { type: String, required: true },
    sessionGoal: { type: String, default: null },
    messages:    [messageSchema],
    startedAt:   { type: Date, default: Date.now },
    endedAt:     { type: Date, default: null },
    status:      { type: String, enum: ['active', 'ended'], default: 'active' },
    summary:     { type: String, default: null },
}, { timestamps: true });

tutorSessionSchema.index({ studentId: 1, topicId: 1, status: 1 });
tutorSessionSchema.index({ studentId: 1, startedAt: -1 });

module.exports = mongoose.model('TutorSession', tutorSessionSchema);
