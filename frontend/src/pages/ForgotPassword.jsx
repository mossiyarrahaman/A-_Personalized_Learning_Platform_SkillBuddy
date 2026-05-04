import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Mail, Lock, Key, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { forgotPassword, resetPassword } = useAuth();

    const [step, setStep] = useState(1); // 1: Email, 2: Reset
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining
    const redirectTimerRef = useRef(null);

    // Countdown tick for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // Clean up redirect timer on unmount
    useEffect(() => {
        return () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); };
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (resendCooldown > 0) return;
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await forgotPassword(email);
            setMessage('Reset code sent to your email.');
            setResendCooldown(60);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            await resetPassword(email, otp, newPassword);
            setMessage('Password reset successful! Redirecting...');
            redirectTimerRef.current = setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10"
            >
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium mb-8">
                    <ChevronLeft size={16} /> Back to Login
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">
                        {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                    </h1>
                    <p className="text-gray-400">
                        {step === 1
                            ? "Enter your email and we'll send you a recovery code."
                            : "Enter the code sent to your email and your new password."}
                    </p>
                </div>

                {message && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm font-medium mb-6">
                        {message}
                    </motion.div>
                )}

                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium mb-6">
                        {error}
                    </motion.div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || resendCooldown > 0}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Send Reset Code'}
                            {!loading && resendCooldown === 0 && <ArrowRight size={18} />}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 ml-1">Verification Code</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                    placeholder="Enter 6-digit code"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 ml-1">New Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                    placeholder="New password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>
                )}

            </motion.div>
        </div>
    );
};

export default ForgotPassword;
