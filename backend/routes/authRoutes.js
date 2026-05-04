const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/resend-otp', authLimiter, authController.resendOtp);
router.get('/me', auth, authController.getMe);
router.get('/students', auth, authController.getAllStudents);
router.get('/enrolled-students', auth, authController.getEnrolledStudents);
router.put('/profile', auth, authController.updateProfile);
router.get('/teacher-stats', auth, authController.getTeacherStats);



router.post('/change-password', auth, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
