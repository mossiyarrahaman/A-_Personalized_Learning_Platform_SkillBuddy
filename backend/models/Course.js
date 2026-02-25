const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If manually created by teacher
    field: String,
    level: String,
    thumbnail: String,
    tags: [String],

    // structured curriculum
    syllabus: {
        fileUrl: String,
        fileName: String,
        checklist: [{
            id: String,
            item: String,
            isChecked: { type: Boolean, default: false }
        }]
    },

    modules: [{
        id: String,
        title: String,
        description: String,
        timePlan: String, // e.g. "Week 1", "2 Hours"
        order: Number,
        topics: [{
            id: String,
            title: String,
            description: String,

            // Teacher Tracking
            teacherStatus: { type: String, enum: ['not_covered', 'in_progress', 'completed'], default: 'not_covered' },
            isChecked: { type: Boolean, default: false }, // Checkbox tracking

            resources: [{
                type: { type: String, enum: ['video', 'article', 'book', 'documentation', 'audio', 'quiz', 'assignment', 'link'] },
                title: String,
                url: String, // Link to file/video/audio
                content: String, // For text-based resources or instructions
                duration: String, // e.g. "10 mins"
                completed: { type: Boolean, default: false }
            }]
        }]
    }],

    // Class Schedule & Capacity
    schedule: {
        startDate: Date,
        endDate: Date,
        days: [String], // e.g. ["Monday", "Wednesday"]
        time: String // e.g. "10:00 AM"
    },
    maxStudents: Number,

    isPublished: { type: Boolean, default: false },
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
