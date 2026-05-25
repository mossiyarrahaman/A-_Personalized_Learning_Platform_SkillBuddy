const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Course = require('../models/Course');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyCourseOwner(courseId, userId) {
    const course = await Course.findById(courseId).select('author enrolledStudents').lean();
    if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
    const isOwner = course.author.toString() === userId;
    return { course, isOwner };
}

// ─── Teacher: Create ──────────────────────────────────────────────────────────

exports.createAssignment = async (req, res) => {
    try {
        const { courseId, topicId, moduleId, title, instructions, dueDate, maxPoints, attachments } = req.body;
        if (!courseId || !title || (!topicId && !moduleId)) {
            return res.status(400).json({ error: 'courseId, title, and either topicId or moduleId are required' });
        }
        const { isOwner } = await verifyCourseOwner(courseId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: 'Only the course teacher can create assignments' });

        const assignment = await Assignment.create({
            courseId,
            topicId: topicId || null,
            moduleId: moduleId || null,
            title,
            instructions: instructions || '',
            dueDate: dueDate || null,
            maxPoints: maxPoints ?? 100,
            attachments: attachments || [],
            createdBy: req.user.id,
        });
        res.status(201).json({ success: true, assignment });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

// ─── Teacher: Update ──────────────────────────────────────────────────────────

exports.updateAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { title, instructions, dueDate, maxPoints, attachments } = req.body;
        if (title !== undefined) assignment.title = title;
        if (instructions !== undefined) assignment.instructions = instructions;
        if (dueDate !== undefined) assignment.dueDate = dueDate || null;
        if (maxPoints !== undefined) assignment.maxPoints = maxPoints;
        if (attachments !== undefined) assignment.attachments = attachments;
        await assignment.save();
        res.json({ success: true, assignment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Teacher: Delete ──────────────────────────────────────────────────────────

exports.deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await AssignmentSubmission.deleteMany({ assignmentId: assignment._id });
        await assignment.deleteOne();
        res.json({ success: true, message: 'Assignment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Teacher: Toggle Publish ──────────────────────────────────────────────────

exports.togglePublish = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { published } = req.body;
        assignment.isPublished = Boolean(published);
        await assignment.save();
        res.json({ success: true, isPublished: assignment.isPublished });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Shared: Get assignments for a topic ─────────────────────────────────────
// Teacher sees all; student sees published only + their submission status

exports.getTopicAssignments = async (req, res) => {
    try {
        const { courseId, topicId } = req.params;
        const { course, isOwner } = await verifyCourseOwner(courseId, req.user.id);

        const isStudent = !isOwner;
        const filter = { courseId, topicId };
        if (isStudent) filter.isPublished = true;

        const assignments = await Assignment.find(filter).sort({ createdAt: 1 }).lean();

        if (isStudent && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a._id);
            const submissions = await AssignmentSubmission.find({
                assignmentId: { $in: assignmentIds },
                studentId: req.user.id,
            }).lean();
            const subMap = {};
            submissions.forEach(s => { subMap[s.assignmentId.toString()] = s; });
            assignments.forEach(a => { a.mySubmission = subMap[a._id.toString()] || null; });
        }

        res.json({ success: true, assignments });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

// ─── Student: Submit Assignment ───────────────────────────────────────────────

exports.submitAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (!assignment.isPublished) return res.status(403).json({ error: 'Assignment is not published' });
        if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({ error: 'Submission deadline has passed' });
        }

        const { textResponse, files } = req.body;
        const now = new Date();

        const existing = await AssignmentSubmission.findOne({
            assignmentId: assignment._id,
            studentId: req.user.id,
        });
        if (existing && (existing.status === 'graded' || existing.status === 'returned')) {
            return res.status(400).json({ error: 'This assignment has already been graded and returned' });
        }

        const submission = await AssignmentSubmission.findOneAndUpdate(
            { assignmentId: assignment._id, studentId: req.user.id },
            {
                $set: {
                    courseId: assignment.courseId,
                    topicId: assignment.topicId,
                    textResponse: textResponse || '',
                    files: files || [],
                    submittedAt: now,
                    lastEditedAt: now,
                    status: 'submitted',
                },
            },
            { upsert: true, new: true }
        );
        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Student: Edit Submission ─────────────────────────────────────────────────

exports.editSubmission = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({ error: 'Submission deadline has passed' });
        }

        const submission = await AssignmentSubmission.findOne({
            assignmentId: assignment._id,
            studentId: req.user.id,
        });
        if (!submission) return res.status(404).json({ error: 'No existing submission found' });
        if (submission.status === 'returned') {
            return res.status(400).json({ error: 'Returned submissions cannot be edited' });
        }

        const { textResponse, files } = req.body;
        submission.textResponse = textResponse ?? submission.textResponse;
        submission.files = files ?? submission.files;
        submission.lastEditedAt = new Date();
        await submission.save();
        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Student: Get My Submission ───────────────────────────────────────────────

exports.getMySubmission = async (req, res) => {
    try {
        const submission = await AssignmentSubmission.findOne({
            assignmentId: req.params.id,
            studentId: req.user.id,
        }).lean();
        res.json({ success: true, submission: submission || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Teacher: Get All Submissions ─────────────────────────────────────────────

exports.getSubmissions = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const submissions = await AssignmentSubmission.find({ assignmentId: assignment._id })
            .populate('studentId', 'name email avatar')
            .sort({ submittedAt: -1 })
            .lean();
        res.json({ success: true, submissions, maxPoints: assignment.maxPoints });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Teacher: Grade Submission ────────────────────────────────────────────────

exports.gradeSubmission = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { grade, feedback } = req.body;
        if (grade === undefined || grade === null || grade < 0 || grade > assignment.maxPoints) {
            return res.status(400).json({ error: `Grade must be between 0 and ${assignment.maxPoints}` });
        }

        const submission = await AssignmentSubmission.findByIdAndUpdate(
            req.params.subId,
            {
                $set: {
                    grade: Number(grade),
                    feedback: feedback || '',
                    gradedBy: req.user.id,
                    gradedAt: new Date(),
                    status: 'returned',
                },
            },
            { new: true }
        ).populate('studentId', 'name email');

        if (!submission) return res.status(404).json({ error: 'Submission not found' });
        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Shared: Get assignments for a module ─────────────────────────────────────

exports.getModuleAssignments = async (req, res) => {
    try {
        const { courseId, moduleId } = req.params;
        const { isOwner } = await verifyCourseOwner(courseId, req.user.id);

        const isStudent = !isOwner;
        const filter = { courseId, moduleId };
        if (isStudent) filter.isPublished = true;

        const assignments = await Assignment.find(filter).sort({ createdAt: 1 }).lean();

        if (isStudent && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a._id);
            const submissions = await AssignmentSubmission.find({
                assignmentId: { $in: assignmentIds },
                studentId: req.user.id,
            }).lean();
            const subMap = {};
            submissions.forEach(s => { subMap[s.assignmentId.toString()] = s; });
            assignments.forEach(a => { a.mySubmission = subMap[a._id.toString()] || null; });
        }

        res.json({ success: true, assignments });
    } catch (err) {
        console.error('assignmentController getModuleAssignments error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Server error' });
    }
};
