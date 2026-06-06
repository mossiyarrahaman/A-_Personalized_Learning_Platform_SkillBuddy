'use strict';
const mongoose = require('mongoose');

const reflectionSchema = new mongoose.Schema({
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  default: null,  index: true },
    pathId:      { type: String, default: null },
    moduleId:    { type: String, required: true },
    topicId:     { type: String, required: true },
    topicTitle:  { type: String, default: '' },
    whatClicked: { type: String, maxlength: 1000, default: '' },
    whatsFuzzy:  { type: String, maxlength: 1000, default: '' },
    whereUseful: { type: String, maxlength: 1000, default: '' },
    submittedAt: { type: Date,   default: Date.now, index: true },
}, { timestamps: true });

reflectionSchema.index({ studentId: 1, submittedAt: -1 });

module.exports = mongoose.model('Reflection', reflectionSchema);
