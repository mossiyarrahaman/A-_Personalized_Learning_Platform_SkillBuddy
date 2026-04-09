// ============================================================================
// SKILLBUDDY BACKEND - Entry Point
// ============================================================================
// Force restart
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Serve Uploads
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/', (req, res) => {
  res.send('SkillBuddy API is Running 🚀');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});