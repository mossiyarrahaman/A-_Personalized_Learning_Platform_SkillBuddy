
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Loader } from 'lucide-react';
import api from '../api/axios';
import RoadmapTree from '../components/RoadmapTree';

const AIPathCurriculum = () => {
    const navigate = useNavigate();
    const [aiProfile, setAiProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/courses/dashboard');
            setAiProfile(res.data.profile);
        } catch (error) {
            console.error("Error fetching AI profile:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
    );

    if (!aiProfile || !aiProfile.currentPath) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                <p className="text-gray-400 mb-4">Path not found.</p>
                <button
                    onClick={() => navigate('/onboarding')}
                    className="bg-purple-600 px-6 py-2 rounded-lg font-bold"
                >
                    Create New Path
                </button>
            </div>
        );
    }

    const handleTopicToggle = async (moduleId, topicId, newStatus) => {
        // Optimistic Update
        const updatedModules = aiProfile.currentPath.modules.map(m => {
            if (m.id === moduleId) {
                return {
                    ...m,
                    topics: m.topics.map(t =>
                        t.id === topicId ? { ...t, status: newStatus } : t
                    )
                };
            }
            return m;
        });

        setAiProfile(prev => ({
            ...prev,
            currentPath: {
                ...prev.currentPath,
                modules: updatedModules
            }
        }));

        try {
            await api.post('/courses/path/toggle-topic', {
                moduleId,
                topicId,
                status: newStatus
            });
        } catch (error) {
            console.error("Failed to toggle topic:", error);
            // Revert on failure (could refetch or rollback state)
            fetchData();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-8 py-4 mb-6">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => navigate('/my-courses')}
                        className="flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back to My Learning
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 pb-8">

                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-8 mb-8 shadow-xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-2 block">AI Generated Path</span>
                            <h1 className="text-4xl font-black text-white mb-3">{aiProfile.onboarding?.field || 'Custom Path'}</h1>
                            <div className="flex gap-3">
                                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
                                    {aiProfile.onboarding?.level} Level
                                </span>
                                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30">
                                    {aiProfile.currentPath.modules.length} Weeks
                                </span>
                            </div>
                        </div>
                        <div className="text-right hidden md:block">
                            <div className="text-sm text-gray-400 mb-1">Generated on</div>
                            <div className="text-white font-mono">{new Date(aiProfile.currentPath.generatedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
                        <BookOpen className="text-blue-400" /> Weekly Schedule
                    </h3>
                    <RoadmapTree
                        modules={aiProfile.currentPath.modules}
                        onTopicClick={(moduleId, topicId) => navigate(`/ai-course/module/${moduleId}/topic/${topicId}`)}
                        onTopicToggle={handleTopicToggle}
                    />
                </div>
            </div>
        </div>
    );
};

export default AIPathCurriculum;
