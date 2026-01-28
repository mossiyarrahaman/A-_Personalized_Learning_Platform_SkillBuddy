
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Loader, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';

const MyCourses = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ai-path'); // 'ai-path' or 'classes'
    const [aiProfile, setAiProfile] = useState(null);
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, classesRes] = await Promise.all([
                api.get('/courses/dashboard'), // Gets AI profile
                api.get('/courses/student/enrolled-classes')
            ]);

            setAiProfile(profileRes.data.profile);
            setEnrolledClasses(classesRes.data.classes);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
    );

    const hasAIPath = aiProfile && aiProfile.currentPath;

    // Helper to calculate AI progress
    const getAIProgress = () => {
        if (!hasAIPath) return 0;
        const modules = aiProfile.currentPath.modules || [];
        const totalTopics = modules.reduce((acc, m) => acc + (m.topics || []).length, 0);
        const completedTopics = modules.reduce((acc, m) => acc + (m.topics || []).filter(t => t.status === 'completed').length, 0);
        return totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
    };

    const aiProgress = getAIProgress();

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                    <div>
                        <h1 className="text-3xl font-black mb-1">My Learning</h1>
                        <p className="text-gray-400">Manage your personalized path and enrolled classes.</p>
                    </div>

                    <div className="flex bg-gray-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('ai-path')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'ai-path' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            AI Learning Path
                        </button>
                        <button
                            onClick={() => setActiveTab('classes')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'classes' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Enrolled Classes
                        </button>
                    </div>
                </header>

                <div className="px-8 pb-8">
                    {activeTab === 'ai-path' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Brain className="text-purple-400" />
                                Personalized AI Path
                            </h2>
                            {hasAIPath ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -5 }}
                                        className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-purple-500 transition-all shadow-lg group cursor-pointer flex flex-col"
                                        onClick={() => navigate('/ai-path')}
                                    >
                                        <div className="h-40 bg-gradient-to-br from-purple-900 to-indigo-900 relative p-6 flex flex-col justify-end">
                                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1">
                                                <Brain size={12} className="text-purple-300" /> AI Generated
                                            </div>
                                            <h3 className="text-2xl font-bold text-white leading-tight">{aiProfile.onboarding?.field}</h3>
                                            <p className="text-purple-200 text-sm font-medium">{aiProfile.onboarding?.level} Level</p>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                                    <span>Progress</span>
                                                    <span>{Math.round(aiProgress)}%</span>
                                                </div>
                                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                                        style={{ width: `${aiProgress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-gray-400 text-sm mb-6">
                                                    {aiProfile.currentPath.modules.length} Modules • Personalized Curriculum
                                                </p>
                                            </div>

                                            <button
                                                className="w-full py-3 bg-gray-700 group-hover:bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-auto"
                                            >
                                                Continue Path <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                    <p className="text-gray-400 mb-4">You don't have an active AI Learning Path.</p>
                                    <button
                                        onClick={() => navigate('/onboarding')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition"
                                    >
                                        Create New Path
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'classes' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <GraduationCap className="text-blue-400" />
                                Enrolled Classes
                            </h2>
                            {enrolledClasses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {enrolledClasses.map(course => {
                                        const completed = course.studentProgress?.completedTopics?.length || 0;
                                        const totalTopics = course.modules.reduce((acc, m) => acc + m.topics.length, 0);
                                        const progressPercent = totalTopics > 0 ? (completed / totalTopics) * 100 : 0;

                                        return (
                                            <motion.div
                                                key={course._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ y: -5 }}
                                                className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-blue-500 transition-all shadow-lg group cursor-pointer flex flex-col"
                                                onClick={() => navigate(`/class/${course._id}`)}
                                            >
                                                <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-800 relative p-6 flex flex-col justify-end">
                                                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                                        Teacher Led
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white leading-tight truncate">{course.title}</h3>
                                                    <p className="text-gray-300 text-sm font-medium">{course.level}</p>
                                                </div>

                                                <div className="p-6 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                                            <span>Progress</span>
                                                            <span>{Math.round(progressPercent)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                                style={{ width: `${progressPercent}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-gray-400 text-sm mb-6 line-clamp-2 h-10">
                                                            {course.description}
                                                        </p>
                                                    </div>

                                                    <button
                                                        className="w-full py-3 bg-gray-700 group-hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-auto"
                                                    >
                                                        Go to Class <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                    <p className="text-gray-400">You haven't enrolled in any classes yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">Ask your instructor for an invite.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyCourses;
