const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
    {
        assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
        studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        topicId:      { type: String },
        textResponse: { type: String, default: '' },
        files:        [{ fileName: String, fileUrl: String, uploadedAt: { type: Date, default: Date.now } }],
        submittedAt:  { type: Date, default: null },
        lastEditedAt: { type: Date, default: null },
        status:       { type: String, enum: ['draft', 'submitted', 'graded', 'returned'], default: 'draft' },
        grade:        { type: Number, default: null },
        feedback:     { type: String, default: '' },
        gradedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        gradedAt:     { type: Date, default: null },
    },
    { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ courseId: 1, assignmentId: 1 });
submissionSchema.index({ studentId: 1, courseId: 1 });

module.exports = mongoose.model('AssignmentSubmission', submissionSchema);
