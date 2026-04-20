import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Loader, Brain } from 'lucide-react';
import api from '../api/axios';
import RoadmapTree from '../components/RoadmapTree';
import TopicDetailModal from '../components/TopicDetailModal';
import { useAppTheme } from '../hooks/useAppTheme';

const AIPathCurriculum = () => {
    const navigate = useNavigate();
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [aiProfile, setAiProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);

    useEffect(() => { fetchData(); }, []);

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
            fetchData();
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader style={{ color: accent.from, width: 44, height: 44 }} className="animate-spin" />
        </div>
    );

    if (!aiProfile || !aiProfile.currentPath) {
        return (
            <div style={{ minHeight: '100vh', background: theme.bg, color: theme.textPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: theme.surface, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={24} style={{ color: theme.textMuted }} />
                </div>
                <p style={{ color: theme.textMuted, fontSize: '14px' }}>No learning path found.</p>
                <button
                    onClick={() => navigate('/onboarding')}
                    style={{ background: aGrad, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', boxShadow: `0 4px 16px ${accent.from}35` }}
                >
                    Create New Path
                </button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>

            {selectedTopic && (
                <TopicDetailModal
                    moduleId={selectedTopic.moduleId}
                    topicId={selectedTopic.topicId}
                    onClose={() => setSelectedTopic(null)}
                    onUpdate={fetchData}
                />
            )}

            {/* Sticky Nav */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, background: theme.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}`, padding: '14px 32px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                    <button
                        onClick={() => navigate('/my-courses')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '14px', fontWeight: 500, padding: '4px 0', transition: 'color .15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textSecondary}
                    >
                        <ChevronLeft size={18} /> Back to My Learning
                    </button>
                </div>
            </div>

            {/* Page Content */}
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 64px' }}>

                {/* Hero Card */}
                <div style={{
                    background: `linear-gradient(135deg,${accent.from}18,${accent.to}12)`,
                    border: `1px solid ${accent.from}30`,
                    borderRadius: '20px',
                    padding: '28px 32px',
                    marginBottom: '28px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Accent top bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: aGrad }} />

                    {/* Glow blur */}
                    <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: `${accent.from}12`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Brain size={13} style={{ color: accent.from }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent.from }}>
                                    AI Generated Path
                                </span>
                            </div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.textPrimary, margin: '0 0 12px', lineHeight: 1.2, fontFamily: "'Sora', sans-serif" }}>
                                {aiProfile.onboarding?.field || 'Custom Path'}
                            </h1>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    background: `${accent.from}18`, color: accent.from,
                                    border: `1px solid ${accent.from}35`,
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                                }}>
                                    {aiProfile.onboarding?.level} Level
                                </span>
                                <span style={{
                                    background: theme.surface2, color: theme.textSecondary,
                                    border: `1px solid ${theme.border}`,
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                                }}>
                                    {aiProfile.currentPath.modules.length} Weeks
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }} className="hidden md:block">
                            <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generated on</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textSecondary, fontFamily: 'monospace' }}>
                                {new Date(aiProfile.currentPath.generatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '2px' }}>
                    <BookOpen size={17} style={{ color: accent.from }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Weekly Schedule</h3>
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
