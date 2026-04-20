const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTPEmail, sendPasswordResetEmail } = require('../services/email-service');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

// Helper to create token
const createToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
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
            console.warn("Failed to send email:", emailResult.message);
            // Note: We still registered the user, but they might be stuck if they can't get OTP.
            // In dev mode, maybe log the OTP?
            console.log("DEBUG OTP:", otp);
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

        const token = createToken(user._id);

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
            const token = createToken(user._id);
            return res.status(200).json({ success: true, message: 'Already verified', token, user: { id: user._id, role: user.role } });
        }

        if (user.otp !== otp) {
            user.otpAttempts += 1;
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
        await user.save();

        const token = createToken(user._id);
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
            console.log("DEBUG OTP (Resend):", otp);
        }

        res.json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error resending OTP' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json({ students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching students' });
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
            console.log("DEBUG Forgot Password OTP:", otp);
            // In a real app we might error out, but here let's allow it for dev
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
