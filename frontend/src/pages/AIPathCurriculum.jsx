import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader, Brain } from 'lucide-react'; // Brain kept for empty-state
import api from '../api/axios';
import RoadmapTree from '../components/RoadmapTree';
import TopicDetailModal from '../components/TopicDetailModal';
import { useAppTheme } from '../hooks/useAppTheme';

const AIPathCurriculum = () => {
    const navigate = useNavigate();
    const { pathId } = useParams();
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`; // used in empty-state button

    const [aiProfile, setAiProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);

    useEffect(() => { fetchData(); }, [pathId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (pathId) {
                const res = await api.get(`/courses/paths/${pathId}`);
                setAiProfile({ currentPath: res.data.path, onboarding: res.data.path.onboarding });
            } else {
                const res = await api.get('/courses/dashboard');
                setAiProfile(res.data.profile);
            }
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
            if (pathId) {
                await api.post('/courses/paths/toggle-topic', { pathId, moduleId, topicId, status: newStatus });
            } else {
                await api.post('/courses/path/toggle-topic', { moduleId, topicId, status: newStatus });
            }
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
                    pathId={pathId}
                    onClose={() => setSelectedTopic(null)}
                    onUpdate={fetchData}
                />
            )}

            {/* Back button — pinned to top-left */}
            <div style={{ padding: '24px 24px 0' }}>
                <button
                    onClick={() => navigate('/my-courses')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '14px', fontWeight: 500, padding: '0', transition: 'color .15s', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                    onMouseLeave={e => e.currentTarget.style.color = theme.textSecondary}
                >
                    <ChevronLeft size={18} /> Back to My Learning
                </button>
            </div>

            {/* Single header + roadmap from RoadmapTree */}
            <RoadmapTree
                modules={aiProfile.currentPath.modules}
                courseName={aiProfile.onboarding?.field || ''}
                onTopicClick={(moduleId, topicId) => setSelectedTopic({ moduleId, topicId })}
                onTopicToggle={handleTopicToggle}
            />
        </div>
    );
};

export default AIPathCurriculum;
