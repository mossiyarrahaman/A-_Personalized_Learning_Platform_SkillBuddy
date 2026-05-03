
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Loader, Brain, Users, BookOpen, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const MyCourses = () => {
    const navigate = useNavigate();
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [activeTab, setActiveTab] = useState('ai-path');
    const [aiProfile, setAiProfile] = useState(null);
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [enrollingId, setEnrollingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, classesRes, availableRes] = await Promise.all([
                api.get('/courses/dashboard'),
                api.get('/courses/student/enrolled-classes'),
                api.get('/courses/student/available-courses')
            ]);
            setAiProfile(profileRes.data.profile);
            setEnrolledClasses(classesRes.data.classes);
            setAvailableCourses(availableRes.data.courses || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelfEnroll = async (courseId) => {
        setEnrollingId(courseId);
        try {
            await api.post(`/courses/student/self-enroll/${courseId}`);
            await fetchData();
        } catch (error) {
            console.error('Enroll failed:', error);
        } finally {
            setEnrollingId(null);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader style={{ color: accent.from, width: 44, height: 44 }} className="animate-spin" />
        </div>
    );

    const hasAIPath = aiProfile && aiProfile.currentPath;

    const getAIProgress = () => {
        if (!hasAIPath) return 0;
        const modules = aiProfile.currentPath.modules || [];
        const totalTopics = modules.reduce((acc, m) => acc + (m.topics || []).length, 0);
        const completedTopics = modules.reduce((acc, m) => acc + (m.topics || []).filter(t => t.status === 'completed').length, 0);
        return totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
    };

    const aiProgress = getAIProgress();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 50, background: theme.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}`, padding: '24px 32px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h1 style={{ fontSize: '26px', fontWeight: 800, color: theme.textPrimary, margin: 0, lineHeight: 1.2 }}>My Learning</h1>
                            <p style={{ fontSize: '14px', color: theme.textMuted, marginTop: '4px' }}>Manage your personalized path and enrolled classes.</p>
                        </div>

                        {/* Tab switcher */}
                        <div style={{ display: 'flex', background: theme.surface, padding: '4px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                            {[['ai-path', 'AI Learning Path'], ['classes', 'Enrolled Classes']].map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    style={{
                                        padding: '8px 22px', borderRadius: '9px', fontWeight: 700, fontSize: '13.5px',
                                        border: 'none', cursor: 'pointer', transition: 'all .18s',
                                        background: activeTab === key ? aGrad : 'transparent',
                                        color: activeTab === key ? '#fff' : theme.textMuted,
                                        boxShadow: activeTab === key ? `0 2px 12px ${accent.from}35` : 'none',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

                    {/* AI Path Tab */}
                    {activeTab === 'ai-path' && (
                        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <Brain size={18} style={{ color: accent.from }} />
                                    Personalized AI Paths
                                </h2>
                                <button
                                    onClick={() => navigate('/onboarding?mode=add')}
                                    style={{ background: aGrad, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: `0 4px 12px ${accent.from}35` }}
                                >
                                    + Add New Course
                                </button>
                            </div>

                            {hasAIPath || (aiProfile?.paths || []).length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                    {/* Primary currentPath card */}
                                    {hasAIPath && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                                            style={{ background: theme.surface, borderRadius: '18px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: `0 2px 16px rgba(0,0,0,0.18)`, cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'border-color .18s' }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}60`}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                            onClick={() => navigate('/ai-path')}
                                        >
                                            <div style={{ height: '148px', background: `linear-gradient(135deg,${accent.from}70,${accent.to}55)`, position: 'relative', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                                <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}>
                                                    <Brain size={11} /> AI Generated
                                                </div>
                                                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>{aiProfile.onboarding?.field}</h3>
                                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontWeight: 500 }}>{aiProfile.onboarding?.level} Level</p>
                                            </div>
                                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                        <span>Progress</span><span>{Math.round(aiProgress)}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: theme.surface2, borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                                                        <div style={{ height: '100%', width: `${aiProgress}%`, background: aGrad, borderRadius: '4px', transition: 'width .6s ease' }} />
                                                    </div>
                                                    <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>{aiProfile.currentPath.modules.length} Modules · Personalized Curriculum</p>
                                                </div>
                                                <button
                                                    style={{ width: '100%', padding: '11px', background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.textPrimary, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .18s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = aGrad; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.borderColor = theme.border; }}
                                                >
                                                    Continue Path <ArrowRight size={15} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Extra paths from paths[] array */}
                                    {(aiProfile?.paths || []).map(path => {
                                        const mods = path.modules || [];
                                        const totalT = mods.reduce((a, m) => a + (m.topics || []).length, 0);
                                        const doneT = mods.reduce((a, m) => a + (m.topics || []).filter(t => t.status === 'completed').length, 0);
                                        const pct = totalT > 0 ? (doneT / totalT) * 100 : 0;
                                        return (
                                            <motion.div
                                                key={path._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                                                style={{ background: theme.surface, borderRadius: '18px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: `0 2px 16px rgba(0,0,0,0.18)`, cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'border-color .18s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}60`}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                                onClick={() => navigate(`/ai-path/${path._id}`)}
                                            >
                                                <div style={{ height: '148px', background: `linear-gradient(135deg,${accent.from}70,${accent.to}55)`, position: 'relative', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}>
                                                        <Brain size={11} /> AI Generated
                                                    </div>
                                                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>{path.onboarding?.field}</h3>
                                                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontWeight: 500 }}>{path.onboarding?.level} Level</p>
                                                </div>
                                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                            <span>Progress</span><span>{Math.round(pct)}%</span>
                                                        </div>
                                                        <div style={{ height: '6px', background: theme.surface2, borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: aGrad, borderRadius: '4px', transition: 'width .6s ease' }} />
                                                        </div>
                                                        <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>{mods.length} Modules · Personalized Curriculum</p>
                                                    </div>
                                                    <button
                                                        style={{ width: '100%', padding: '11px', background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.textPrimary, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .18s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = aGrad; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.borderColor = theme.border; }}
                                                    >
                                                        Continue Path <ArrowRight size={15} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ background: theme.surface, border: `1px dashed ${theme.border}`, borderRadius: '14px', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                    <p style={{ color: theme.textMuted, marginBottom: '16px', fontSize: '14px' }}>You don't have an active AI Learning Path.</p>
                                    <button
                                        onClick={() => navigate('/onboarding')}
                                        style={{ background: aGrad, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', boxShadow: `0 4px 16px ${accent.from}35` }}
                                    >
                                        Create New Path
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Classes Tab */}
                    {activeTab === 'classes' && (
                        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>

                            {/* Enrolled section */}
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GraduationCap size={18} style={{ color: accent.from }} />
                                Enrolled Classes
                            </h2>

                            {enrolledClasses.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                                    {enrolledClasses.map(course => {
                                        const completed = course.studentProgress?.completedTopics?.length || 0;
                                        const totalTopics = course.modules.reduce((acc, m) => acc + m.topics.length, 0);
                                        const progressPercent = totalTopics > 0 ? (completed / totalTopics) * 100 : 0;
                                        return (
                                            <motion.div
                                                key={course._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                                                style={{ background: theme.surface, borderRadius: '18px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: `0 2px 16px rgba(0,0,0,0.18)`, cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'border-color .18s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}60`}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                                onClick={() => navigate(`/class/${course._id}`)}
                                            >
                                                <div style={{ height: '148px', background: `linear-gradient(135deg,${theme.surface2},${theme.bg})`, position: 'relative', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderBottom: `1px solid ${theme.border}` }}>
                                                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: `1px solid ${theme.border}`, color: theme.textSecondary }}>
                                                        Teacher Led
                                                    </div>
                                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: theme.textPrimary, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</h3>
                                                    <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '4px 0 0', fontWeight: 500 }}>{course.level}</p>
                                                </div>
                                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                            <span>Progress</span><span>{Math.round(progressPercent)}%</span>
                                                        </div>
                                                        <div style={{ height: '6px', background: theme.surface2, borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                                                            <div style={{ height: '100%', width: `${progressPercent}%`, background: aGrad, borderRadius: '4px', transition: 'width .6s ease' }} />
                                                        </div>
                                                        <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{course.description}</p>
                                                    </div>
                                                    <button
                                                        style={{ width: '100%', padding: '11px', background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.textPrimary, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .18s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = aGrad; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.borderColor = theme.border; }}
                                                    >
                                                        Go to Class <ArrowRight size={15} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ background: theme.surface, border: `1px dashed ${theme.border}`, borderRadius: '14px', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '40px' }}>
                                    <p style={{ color: theme.textMuted, marginBottom: '4px', fontSize: '14px' }}>You haven't enrolled in any classes yet.</p>
                                    <p style={{ color: theme.textMuted, fontSize: '13px', opacity: 0.7 }}>Browse available courses below to get started.</p>
                                </div>
                            )}

                            {/* Available courses section */}
                            {availableCourses.length > 0 && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <BookOpen size={18} style={{ color: accent.from }} />
                                            Browse Available Courses
                                        </h2>
                                        <span style={{ background: `${accent.from}22`, color: accent.from, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${accent.from}40` }}>
                                            {availableCourses.length} open
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                        {availableCourses.map(course => (
                                            <motion.div
                                                key={course._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                                                style={{ background: theme.surface, borderRadius: '18px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: `0 2px 16px rgba(0,0,0,0.18)`, display: 'flex', flexDirection: 'column', transition: 'border-color .18s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}60`}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                            >
                                                <div style={{ height: '120px', background: `linear-gradient(135deg,${accent.from}30,${accent.to}20)`, position: 'relative', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderBottom: `1px solid ${theme.border}` }}>
                                                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: `${accent.from}25`, backdropFilter: 'blur(6px)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: `1px solid ${accent.from}40`, color: accent.from }}>
                                                        Open
                                                    </div>
                                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme.textPrimary, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</h3>
                                                    <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '3px 0 0', fontWeight: 500 }}>{course.level} · by {course.teacherName}</p>
                                                </div>

                                                <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                                                            {course.description || 'No description provided.'}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: theme.textMuted }}>
                                                                <BookOpen size={12} /> {course.topicCount} topics
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: theme.textMuted }}>
                                                                <Users size={12} /> {course.enrolledCount} enrolled
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSelfEnroll(course._id)}
                                                        disabled={enrollingId === course._id}
                                                        style={{ width: '100%', padding: '10px', background: enrollingId === course._id ? theme.surface2 : aGrad, border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: enrollingId === course._id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'opacity .18s', opacity: enrollingId === course._id ? 0.6 : 1 }}
                                                    >
                                                        {enrollingId === course._id ? (
                                                            <Loader style={{ width: 15, height: 15 }} className="animate-spin" />
                                                        ) : (
                                                            <><Plus size={15} /> Enroll Now</>
                                                        )}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyCourses;
