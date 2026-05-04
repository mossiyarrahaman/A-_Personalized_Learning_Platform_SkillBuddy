import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, Clock, Search, Bell, User } from 'lucide-react';
import RoadmapTree from '../components/RoadmapTree';
import TopicDetailModal from '../components/TopicDetailModal';
import { useAppTheme } from '../hooks/Useapptheme';
import api from '../api/axios';

const StudentDashboard = ({ user, profile, onLogout, fetchProfile }) => {
    const navigate = useNavigate();
    const { theme, accent } = useAppTheme();
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const aGrad = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;

    const handleTopicToggle = async (moduleId, topicId, status) => {
        try {
            await api.post('/courses/path/toggle-topic', { moduleId, topicId, status });
            await fetchProfile();
        } catch (err) {
            console.error('Error toggling topic:', err);
        }
    };

    const handleQuizComplete = async (result, moduleId, topicId) => {
        try {
            await api.post('/courses/path/submit-ai-quiz', {
                moduleId,
                topicId,
                topicTitle: result.topicTitle,
                score: result.pct,
                totalQuestions: result.total,
                correctAnswers: result.score,
            });
            await fetchProfile();
        } catch (err) {
            console.error('Error submitting quiz result:', err);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif", transition: 'background .3s, color .3s' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .sd-stat:hover { transform: translateY(-3px); border-color: ${accent.from}50 !important; }
                .sd-stat { transition: transform .2s, border-color .2s; }
                .sb-grad-text { background: linear-gradient(135deg, var(--g-from), var(--g-to)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; }
            `}</style>

            {selectedTopic && (
                <TopicDetailModal moduleId={selectedTopic.moduleId} topicId={selectedTopic.topicId}
                    onClose={() => setSelectedTopic(null)} onUpdate={() => fetchProfile()} />
            )}

            {/* Header */}
            <header style={{ height: '70px', background: theme.headerBg, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: theme.textPrimary }}>
                    Welcome back,{' '}
                    <span className="sb-grad-text" style={{ '--g-from': accent.from, '--g-to': accent.to, fontWeight: 700 }}>{user.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {[Search, Bell].map((Icon, i) => (
                        <button key={i} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '7px', borderRadius: '8px', display: 'flex', transition: 'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.background = theme.surface; }}
                            onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'none'; }}>
                            <Icon size={20} />
                        </button>
                    ))}

                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowProfileMenu(p => !p)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: aGrad, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', outline: showProfileMenu ? `2px solid ${accent.from}` : 'none', outlineOffset: '2px' }}>
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                        </button>

                        {showProfileMenu && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowProfileMenu(false)} />
                                <div style={{ position: 'absolute', right: 0, top: '46px', zIndex: 50, width: '215px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}` }}>
                                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                        <div style={{ fontSize: '11.5px', color: theme.textMuted, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                    </div>
                                    <div style={{ padding: '6px' }}>
                                        <button onClick={() => { navigate('/profile'); setShowProfileMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `${accent.from}15`; e.currentTarget.style.color = accent.from; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textSecondary; }}>
                                            <User size={14} /> Profile & Settings
                                        </button>
                                    </div>
                                    <div style={{ borderTop: `1px solid ${theme.border}`, padding: '6px' }}>
                                        <button onClick={() => { onLogout(); setShowProfileMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'background .15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                    <StatCard title="Hours Studied" value={profile?.stats?.hoursStudied || 0} icon={Clock} iconColor="#60a5fa" theme={theme} />
                    <StatCard title="Courses Completed" value={profile?.stats?.coursesCompleted || 0} icon={BookOpen} iconColor="#34d399" theme={theme} />
                    <StatCard title="Current Streak" value={`${profile?.streak || 0} Days`} icon={Trophy} iconColor="#fbbf24" theme={theme} />
                </div>

                <div style={{ background: theme.surface2, borderRadius: '1.5rem', border: `1px solid ${theme.border}`, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '180px', background: `radial-gradient(ellipse at top, ${accent.from}12, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

                    {profile?.currentPath ? (
                        <RoadmapTree
                            modules={profile.currentPath.modules}
                            courseName={profile.onboarding?.field || ''}
                            onTopicClick={(moduleId, topicId) => setSelectedTopic({ moduleId, topicId })}
                            onTopicToggle={handleTopicToggle}
                            onQuizComplete={handleQuizComplete}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', margin: '0 2rem 2rem', background: theme.surface, borderRadius: '1rem', border: `1px dashed ${theme.border}`, position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
                            <p style={{ color: theme.textSecondary, fontSize: '1rem', marginBottom: '1.25rem' }}>No learning path generated yet.</p>
                            <button onClick={() => navigate('/onboarding')} style={{ background: aGrad, border: 'none', borderRadius: '8px', padding: '9px 22px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                                Go to Onboarding
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, iconColor, theme }) => (
    <div className="sd-stat" style={{ background: theme.surface, padding: '1.5rem', borderRadius: '1.25rem', border: `1px solid ${theme.border}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-16px', right: '-16px', width: '80px', height: '80px', background: `${iconColor}10`, borderRadius: '50%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
                <p style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{title}</p>
                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '2rem', fontWeight: 700, color: theme.textPrimary, lineHeight: 1 }}>{value}</h3>
            </div>
            <div style={{ padding: '10px', borderRadius: '12px', background: `${iconColor}18`, color: iconColor, flexShrink: 0 }}>
                <Icon size={22} />
            </div>
        </div>
    </div>
);

export default StudentDashboard;