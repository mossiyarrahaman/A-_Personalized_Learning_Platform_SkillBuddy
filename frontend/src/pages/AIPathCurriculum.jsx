import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Loader } from 'lucide-react';
import api from '../api/axios';
import RoadmapTree from '../components/RoadmapTree';
import TopicDetailModal from '../components/TopicDetailModal';

const AIPathCurriculum = () => {
    const navigate = useNavigate();
    const [aiProfile, setAiProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);

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

    const handleTopicToggle = async (moduleId, topicId, newStatus) => {
        // Optimistic update
        setAiProfile(prev => ({
            ...prev,
            currentPath: {
                ...prev.currentPath,
                modules: prev.currentPath.modules.map(m =>
                    m.id === moduleId
                        ? { ...m, topics: m.topics.map(t => t.id === topicId ? { ...t, status: newStatus } : t) }
                        : m
                )
            }
        }));

        try {
            await api.post('/courses/path/toggle-topic', { moduleId, topicId, status: newStatus });
        } catch (error) {
            console.error("Failed to toggle topic:", error);
            fetchData(); // Revert on failure
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
                <button onClick={() => navigate('/onboarding')} className="bg-purple-600 px-6 py-2 rounded-lg font-bold">
                    Create New Path
                </button>
            </div>
        );
    }

    return (
        // ✅ FIX: min-h-screen with natural scroll — no overflow-hidden anywhere
        <div className="min-h-screen bg-gray-900 text-white font-sans">

            {/* Topic Detail Modal */}
            {selectedTopic && (
                <TopicDetailModal
                    moduleId={selectedTopic.moduleId}
                    topicId={selectedTopic.topicId}
                    onClose={() => setSelectedTopic(null)}
                    onUpdate={fetchData}
                />
            )}

            {/* Sticky Nav */}
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-8 py-4">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => navigate('/my-courses')}
                        className="flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back to My Learning
                    </button>
                </div>
            </div>

            {/* Page Content */}
            <div className="max-w-5xl mx-auto px-8 pb-16 pt-8">

                {/* Hero Card */}
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-8 mb-8 shadow-xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-2 block">
                                AI Generated Path
                            </span>
                            <h1 className="text-4xl font-black text-white mb-3">
                                {aiProfile.onboarding?.field || 'Custom Path'}
                            </h1>
                            <div className="flex gap-3 flex-wrap">
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
                            <div className="text-white font-mono">
                                {new Date(aiProfile.currentPath.generatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ FIX: RoadmapTree is NOT wrapped in a height-constrained box anymore.
                    The old bg-gray-800 rounded-xl with fixed padding was clipping scroll.
                    Now it renders directly in the flow with just a label above it. */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <BookOpen className="text-blue-400 w-5 h-5" />
                    <h3 className="text-xl font-bold text-white">Weekly Schedule</h3>
                </div>

                <RoadmapTree
                    modules={aiProfile.currentPath.modules}
                    onTopicClick={(moduleId, topicId) => setSelectedTopic({ moduleId, topicId })}
                    onTopicToggle={handleTopicToggle}
                />
            </div>
        </div>
    );
};

export default AIPathCurriculum;
