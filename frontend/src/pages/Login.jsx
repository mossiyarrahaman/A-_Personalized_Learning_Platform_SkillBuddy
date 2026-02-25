import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, Brain, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, verifyOtp, resendOtp, user, logout } = useAuth(); // Added user, logout

    const [email, setEmail] = useState(location.state?.email || '');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(location.state?.message || '');
    const [loading, setLoading] = useState(false);
    const [requiresOtp, setRequiresOtp] = useState(location.state?.requiresOtp || false);

    // If user is already logged in, show the "Allow switch" UI
    if (user && !requiresOtp) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
                {/* Background Ambience */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
                >
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4">
                            {user.name ? user.name[0] : 'U'}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}</h2>
                        <p className="text-gray-400">You are currently signed in as <span className="text-white font-medium">{user.email}</span></p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            Continue to Dashboard <ArrowRight size={18} />
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-800"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">or</span>
                            <div className="flex-grow border-t border-gray-800"></div>
                        </div>

                        <button
                            onClick={() => {
                                logout();
                                // State will clear automatically, causing re-render to form
                            }}
                            className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-all border border-gray-700 hover:border-gray-600"
                        >
                            Switch Account
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            if (requiresOtp) {
                await verifyOtp(email, otp);
                navigate('/dashboard');
            } else {
                await login(email, password);
                navigate('/dashboard');
            }
        } catch (err) {
            if (err.response?.status === 403 && err.response?.data?.isEmailVerified === false) {
                setRequiresOtp(true);
                setError('Please verify your email with the OTP sent.');

                // Trigger OTP resend
                try {
                    await resendOtp(email);
                } catch (resendError) {
                    console.error("Failed to resend OTP", resendError);
                }
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            setLoading(true); // fast feedback
            await resendOtp(email);
            setSuccess('Verification code resent to your email.');
            setError('');
        } catch (err) {
            setError('Failed to resend OTP. Please try again.');
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
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10"
            >
                <div className="flex justify-between items-center mb-8">
                    <Link to="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                        <ChevronLeft size={16} /> Back
                    </Link>
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                        <span className="font-bold tracking-tight">SkillBuddy</span>
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">{requiresOtp ? 'Verify Access' : 'Welcome Back'}</h1>
                    <p className="text-gray-400">{requiresOtp ? 'Enter the security code sent to your email.' : 'Enter your credentials to access your workspace.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm font-medium"
                        >
                            {success}
                        </motion.div>
                    )}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    {!requiresOtp ? (
                        <>
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

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-400 ml-1">Password</label>
                                    <Link to="/forgot-password" className="text-xs font-semibold text-purple-400 hover:text-purple-300">Forgot?</Link>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                        placeholder="••••••••"
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
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 ml-1">Verification Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                maxLength={6}
                                required
                                placeholder="000000"
                            />
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    className="text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                                    disabled={loading}
                                >
                                    Resend Code
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 focus:ring-4 focus:ring-gray-800 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Processing...' : (requiresOtp ? 'Verify & Continue' : 'Sign In')}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                {!requiresOtp && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            New to SkillBuddy? <Link to="/register" className="text-white font-bold hover:underline">Create an account</Link>
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Login;
