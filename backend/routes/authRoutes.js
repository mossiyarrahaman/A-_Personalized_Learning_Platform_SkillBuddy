const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.get('/me', auth, authController.getMe);
router.get('/students', auth, authController.getAllStudents);
router.get('/enrolled-students', auth, authController.getEnrolledStudents);
router.put('/profile', auth, authController.updateProfile);
router.get('/teacher-stats', auth, authController.getTeacherStats);



router.post('/change-password', auth, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
