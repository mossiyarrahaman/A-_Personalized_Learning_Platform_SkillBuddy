const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const Course = require('../models/Course');

async function verifyChatAccess(req, res, next) {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ error: 'Course not found' });
        const isTeacher = course.author.toString() === req.user.id;
        const isEnrolled = (course.enrolledStudents || []).some(id => id.toString() === req.user.id);
        if (!isTeacher && !isEnrolled) return res.status(403).json({ error: 'Access denied' });
        req.course = course;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/chat/:courseId/messages — last 100 messages oldest first
router.get('/:courseId/messages', auth, verifyChatAccess, async (req, res) => {
    try {
        const messages = await ChatMessage.find({ courseId: req.params.courseId })
            .sort({ createdAt: -1 }).limit(100).lean();
        res.json({ success: true, messages: messages.reverse() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
