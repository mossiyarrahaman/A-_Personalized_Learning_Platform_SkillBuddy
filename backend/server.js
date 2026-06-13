// ============================================================================
// SKILLBUDDY BACKEND - Entry Point
// ============================================================================
require('dotenv').config();

// Validate required env vars before anything else starts
['JWT_SECRET', 'MONGODB_URI', 'OPENROUTER_API_KEY'].forEach(v => {
    if (!process.env[v]) throw new Error(`FATAL: ${v} environment variable is required`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.io
const io = new Server(server, {
    cors: { origin: ALLOWED_ORIGIN, credentials: true }
});

// Middleware
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
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
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/class-tests', require('./routes/classTestRoutes'));
app.use('/api/tutor', require('./routes/tutorRoutes'));

// Serve Uploads
app.use('/uploads', express.static('uploads'));

// Root
app.get('/', (req, res) => res.json({ message: 'SkillBuddy API is Running' }));

// Health Check
app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ status: 'ok', db: dbState, timestamp: new Date().toISOString() });
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
    socket.on('join_course', async (courseId) => {
        try {
            const course = await Course.findById(courseId).select('author enrolledStudents').lean();
            if (!course) return;
            const isTeacher = course.author.toString() === socket.user.id;
            const isEnrolled = (course.enrolledStudents || []).some(id => id.toString() === socket.user.id);
            if (!isTeacher && !isEnrolled) return socket.emit('error', 'Not enrolled in this course');
            socket.join(`course:${courseId}`);
        } catch { /* ignore invalid courseId */ }
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

// Global error handler — must be registered after all routes
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : (err.message || 'Server error');
    res.status(status).json({ success: false, error: message });
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        mongoose.connection.close().then(() => process.exit(0));
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
