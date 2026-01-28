import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Mail, User, Lock, Eye, EyeOff, Brain, ArrowRight, GraduationCap, School } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(formData.name, formData.email, formData.password, formData.role);
            // Ideally navigate to a verification pending page or auto-login flow if implemented
            navigate('/login');
        } catch (err) {
            if (err.response?.data?.error === 'Email already registered') {
                setError('Email already registered. Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(err.response?.data?.error || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10"
            >
                <div className="flex justify-between items-center mb-6">
                    <Link to="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                        <ChevronLeft size={16} /> Back
                    </Link>
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                        <span className="font-bold tracking-tight">SkillBuddy</span>
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Create Account</h1>
                    <p className="text-gray-400">Join the platform building the future of learning.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'student' })}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.role === 'student' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                        >
                            <GraduationCap size={24} />
                            <span className="font-bold text-sm">Student</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'teacher' })}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.role === 'teacher' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                        >
                            <School size={24} />
                            <span className="font-bold text-sm">Teacher</span>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 ml-1">Full Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-gray-800 focus:ring-1 focus:ring-purple-500 transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 focus:ring-4 focus:ring-gray-800 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Creating...' : 'Create Account'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Already have an account? <Link to="/login" className="text-white font-bold hover:underline">Log in</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
