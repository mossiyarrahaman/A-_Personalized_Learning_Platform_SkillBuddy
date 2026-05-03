// ============================================================================
// SKILLBUDDY BACKEND - Entry Point
// ============================================================================
// Force restart
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbuddy')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/doubts', require('./routes/doubtRoutes'));
app.use('/api/gamification', require('./routes/gamificationRoutes'));
app.use('/api/ai-assistant', require('./routes/aiAssistantRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/rag', require('./routes/rag'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Serve Uploads
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/', (req, res) => {
  res.send('SkillBuddy API is Running 🚀');
});

// ── Socket.io chat ────────────────────────────────────────────────────────────
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');
const Course = require('./models/Course');

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    socket.on('join_course', (courseId) => {
        socket.join(`course:${courseId}`);
    });

    socket.on('send_message', async ({ courseId, message }) => {
        if (!message?.trim() || !courseId) return;
        try {
            const user = await User.findById(socket.user.id).select('name role').lean();
            const course = await Course.findById(courseId).select('author enrolledStudents').lean();
            if (!course) return;
            const isTeacher = course.author.toString() === socket.user.id;
            const isEnrolled = (course.enrolledStudents || []).some(id => id.toString() === socket.user.id);
            if (!isTeacher && !isEnrolled) return;

            const doc = await ChatMessage.create({
                courseId,
                sender: { _id: user._id, name: user.name, role: isTeacher ? 'teacher' : 'student' },
                message: message.trim(),
            });
            io.to(`course:${courseId}`).emit('new_message', doc);
        } catch (err) {
            console.error('Socket send_message error:', err);
        }
    });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
