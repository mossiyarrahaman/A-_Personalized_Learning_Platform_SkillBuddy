const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
        topicId:      { type: String, default: null, index: true },
        moduleId:     { type: String, default: null, index: true },
        createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title:        { type: String, required: true },
        instructions: { type: String, default: '' },
        dueDate:      { type: Date, default: null },
        maxPoints:    { type: Number, default: 100 },
        attachments:  [{ fileName: String, fileUrl: String }],
        isPublished:  { type: Boolean, default: false },
    },
    { timestamps: true }
);

assignmentSchema.index({ courseId: 1, topicId: 1 });
assignmentSchema.index({ courseId: 1, moduleId: 1 });
assignmentSchema.index({ courseId: 1, isPublished: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
