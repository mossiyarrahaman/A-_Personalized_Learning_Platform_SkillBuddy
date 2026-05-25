const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTPEmail, sendPasswordResetEmail } = require('../services/email-service');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to create token
const createToken = (id, role = '') => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

        // Create User
        const user = new User({
            name,
            email,
            password,
            role,
            otp,
            otpExpiry,
            isEmailVerified: false
        });

        await user.save();

        // Send OTP Email
        const emailResult = await sendOTPEmail(email, name, otp);

        if (!emailResult.success) {
            console.warn("Failed to send OTP email during registration:", emailResult.message);
        }

        // Create empty profile if student
        if (role === 'student') {
            const profile = new StudentProfile({ userId: user._id });
            await profile.save();
        }

        res.status(201).json({ message: 'User registered. Please verify email.', userId: user._id, requiresOTP: true });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (!user.isEmailVerified) {
            // Check if this is a "legacy" user or just unverified
            // If Unverified, trigger OTP verify flow on frontend
            // We might want to resend OTP here automatically?
            return res.status(403).json({ error: 'Email not verified', isEmailVerified: false, email });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = createToken(user._id, user.role);

        // Update daily streak for students
        if (user.role === 'student') {
            try {
                const StudentProfile = require('../models/StudentProfile');
                const profile = await StudentProfile.findOne({ userId: user._id });
                if (profile) {
                    const now = new Date();
                    const last = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;
                    const daysDiff = last
                        ? Math.floor((now.setHours(0,0,0,0) - new Date(last).setHours(0,0,0,0)) / 86400000)
                        : 1;
                    if (daysDiff === 1) {
                        profile.streak = (profile.streak || 0) + 1;
                    } else if (daysDiff > 1) {
                        profile.streak = 1;
                    }
                    profile.lastActiveDate = new Date();
                    await profile.save();
                }
            } catch (e) { /* don't fail login on streak error */ }
        }

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: 'User not found' });

        if (user.isEmailVerified) {
            const token = createToken(user._id, user.role);
            return res.status(200).json({ success: true, message: 'Already verified', token, user: { id: user._id, role: user.role } });
        }

        // Check lockout
        if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
            const secondsLeft = Math.ceil((user.otpLockUntil - Date.now()) / 1000);
            return res.status(429).json({ error: `Too many failed attempts. Try again in ${secondsLeft} seconds.` });
        }

        if (user.otp !== otp) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            if (user.otpAttempts >= 5) {
                user.otpLockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock 15 mins
                user.otpAttempts = 0;
            }
            await user.save();
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.otpAttempts = 0;
        user.otpLockUntil = undefined;
        await user.save();

        const token = createToken(user._id, user.role);
        res.json({ success: true, message: 'Email verified successfully', token, user: { id: user._id, role: user.role } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error verifying OTP' });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const emailResult = await sendOTPEmail(email, user.name, otp);
        if (!emailResult.success) {
            console.warn("Failed to resend OTP email:", emailResult.message);
        }

        res.json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error resending OTP' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp -otpExpiry -otpAttempts -otpLockUntil');
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
        const students = await User.find({ role: 'student' }).select('-password -otp -otpExpiry -otpAttempts -otpLockUntil');
        res.json({ students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching students' });
    }
};

exports.getEnrolledStudents = async (req, res) => {
    try {
        const Course = require('../models/Course');
        const courses = await Course.find({ author: req.user.id }).select('enrolledStudents title').lean();

        const studentCourses = {};
        for (const course of courses) {
            for (const sid of (course.enrolledStudents || [])) {
                const key = sid.toString();
                if (!studentCourses[key]) studentCourses[key] = [];
                studentCourses[key].push({ courseId: course._id.toString(), title: course.title });
            }
        }

        const studentIds = Object.keys(studentCourses);
        if (studentIds.length === 0) return res.json({ students: [] });

        const users = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('-password -otp -otpExpiry -otpAttempts').lean();
        const result = users.map(u => ({
            ...u,
            enrolledCourseDetails: studentCourses[u._id.toString()] || [],
            enrolledCourses: (studentCourses[u._id.toString()] || []).map(c => c.title),
        }));
        res.json({ students: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching enrolled students' });
    }
};


exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // For security, don't reveal that the user doesn't exist.
            // But for detailed frontend handling we might want to return 404 in dev or generic success in prod.
            // Let's stick to standard practice: 
            return res.status(404).json({ error: 'User with this email does not exist' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const emailResult = await sendPasswordResetEmail(email, user.name, otp);

        if (!emailResult.success) {
            console.warn("Failed to send password reset email:", emailResult.message);
        }

        res.json({ message: 'Password reset OTP sent to email' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error processing forgot password' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: 'Both current and new password are required.' });
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters.' });
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const match = await user.comparePassword(currentPassword);
        if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });
        user.password = newPassword; // pre-save hook will hash it
        await user.save();
        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, title, bio, location, institution, website, skills, tags, avatarGradIdx } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { name: name.trim(), title, bio, location, institution, website, skills, tags, avatarGradIdx, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-password -otp -otpExpiry -otpAttempts');
        res.json({ user: updated });
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.getTeacherStats = async (req, res) => {
    try {
        const Course = require('../models/Course');
        const Doubt = require('../models/Doubt');
        const courses = await Course.find({ author: req.user.id }).select('enrolledStudents').lean();
        const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0);
        const doubtsAnswered = await Doubt.countDocuments({ 'answers.responderId': req.user.id });
        const user = await User.findById(req.user.id).select('createdAt').lean();
        res.json({ totalCourses: courses.length, totalStudents, doubtsAnswered, memberSince: user.createdAt });
    } catch (err) {
        console.error('getTeacherStats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        user.password = newPassword; // Will be hashed by pre-save hook
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.otpAttempts = 0;
        user.isEmailVerified = true; // Auto-verify if they can reset password via email
        await user.save();

        res.json({ success: true, message: 'Password reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error resetting password' });
    }
};
