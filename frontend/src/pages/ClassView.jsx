import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen, Check, Play, FileText, Brain, GraduationCap, Loader, Target, TrendingUp, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ResourcePlayer from '../components/ResourcePlayer';
import QuizModal from '../components/QuizModal';
import ClassChat from '../components/ClassChat';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../context/AuthContext';

const ClassView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [course, setCourse] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedModule, setExpandedModule] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizTarget, setQuizTarget] = useState(null);
    const [topicQuizStatus, setTopicQuizStatus] = useState({});
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => { fetchClassDetails(); }, [courseId]);

    const fetchClassDetails = async () => {
        try {
            const [classRes, quizStatusRes] = await Promise.all([
                api.get('/courses/student/enrolled-classes'),
                api.get(`/rag/topic-quizzes/${courseId}`).catch(() => ({ data: { quizzes: {} } })),
            ]);
            const foundClass = classRes.data.classes.find(c => c._id === courseId || c.id === courseId);
            if (foundClass) {
                setCourse(foundClass);
                setProgress(foundClass.studentProgress);
                if (foundClass.modules.length > 0) setExpandedModule(prev => prev || foundClass.modules[0]._id);
            }
            const quizzes = quizStatusRes.data.quizzes || {};
            console.log('[ClassView] quiz status from API:', quizzes);
            if (foundClass) {
                foundClass.modules?.forEach(m => m.topics?.forEach(t => {
                    const tKey = t.id || t._id?.toString();
                    console.log(`[ClassView] topic "${t.title}" key="${tKey}" quizStatus=`, quizzes[tKey]);
                }));
            }
            setTopicQuizStatus(quizzes);
        } catch (error) {
            console.error("Failed to load class", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = async (topicId) => {
        const isCompleted = progress.completedTopics.includes(topicId);
        const newCompletedTopics = isCompleted
            ? progress.completedTopics.filter(id => id !== topicId)
            : [...progress.completedTopics, topicId];
        setProgress({ ...progress, completedTopics: newCompletedTopics });
        try {
            await api.post('/courses/class-progress', { courseId, topicId, completed: !isCompleted });
        } catch (error) {
            console.error("Failed to sync progress", error);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <Loader style={{ color: accent.from, width: 36, height: 36 }} className="animate-spin" />
            <span style={{ color: theme.textMuted, fontSize: '14px' }}>Loading class...</span>
        </div>
    );

    if (!course) return (
        <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: theme.surface, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={24} style={{ color: theme.textMuted }} />
            </div>
            <p style={{ color: theme.textMuted, fontSize: '14px' }}>Class not found.</p>
            <button onClick={() => navigate('/my-courses')} style={{ background: aGrad, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Back to My Courses
            </button>
        </div>
    );

    const totalTopics = course.modules.reduce((acc, m) => acc + m.topics.length, 0);
    const completedCount = progress?.completedTopics?.length || 0;
    const overallPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
    const completedMods = course.modules.filter(m => m.topics.every(t => progress?.completedTopics?.includes(t._id))).length;

    const statPills = [
        { icon: TrendingUp, val: `${overallPct}%`, label: 'overall', color: accent.from },
        { icon: Target, val: `${completedCount}/${totalTopics}`, label: 'topics done', color: '#34d399' },
        { icon: BookOpen, val: `${completedMods}/${course.modules.length}`, label: 'modules done', color: '#60a5fa' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>

            {/* Back button — top-left, outside the hero */}
            <div style={{ padding: '20px 24px 0' }}>
                <button
                    onClick={() => navigate('/my-courses')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '14px', fontWeight: 500, padding: 0, transition: 'color .15s', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                    onMouseLeave={e => e.currentTarget.style.color = theme.textSecondary}
                >
                    <ChevronLeft size={18} /> Back to My Learning
                </button>
            </div>

            {/* Hero header */}
            <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '2rem 1rem 1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Top gradient bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(to right, ${accent.from}, ${accent.to}, #22c55e)` }} />
                {/* Glow blob */}
                <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '200px', background: `${accent.from}10`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

                {/* Label */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '8px', position: 'relative' }}>
                    <GraduationCap size={13} style={{ color: accent.from }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent.from }}>Teacher-Led Course</span>
                </div>

                {/* Title */}
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(1.4rem,4vw,2.2rem)', fontWeight: 800, marginBottom: '6px', position: 'relative' }}>
                    <span style={{ background: aGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
                        {course.title}
                    </span>
                </h1>
                <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 auto 1.25rem', lineHeight: 1.6, position: 'relative' }}>
                    {totalTopics} topics · {course.level} · Progress through each module to complete the course.
                </p>

                {/* Stats pills */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '1.25rem', position: 'relative' }}>
                    {statPills.map(({ icon: Icon, val, label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '7px 14px' }}>
                            <Icon size={14} style={{ color }} />
                            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>{val}</span>
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Overall progress bar */}
                <div style={{ maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ height: '6px', background: theme.border, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct === 100 ? '#22c55e' : aGrad, borderRadius: '4px', transition: 'width 1s ease' }} />
                    </div>
                </div>

                {/* Chat button */}
                <div style={{ marginTop: '16px', position: 'relative' }}>
                    <button
                        onClick={() => setChatOpen(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '20px', border: 'none', background: aGrad, color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: `0 4px 14px ${accent.from}40`, fontFamily: 'inherit' }}
                    >
                        <MessageCircle size={15} /> Class Chat
                    </button>
                </div>
            </div>

            {/* Main content */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '40px' }}>
                    {course.modules.map((module, index) => {
                        const modCompleted = module.topics.filter(t => progress?.completedTopics?.includes(t._id)).length;
                        const modTotal = module.topics.length;
                        const modPct = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
                        const isExpanded = expandedModule === module._id;

                        return (
                            <div
                                key={module._id || index}
                                style={{ background: theme.surface, borderRadius: '16px', border: `1px solid ${isExpanded ? `${accent.from}40` : theme.border}`, overflow: 'hidden', transition: 'border-color .2s, box-shadow .2s', boxShadow: isExpanded ? `0 4px 24px ${accent.from}10` : 'none' }}
                            >
                                {/* Accent top bar */}
                                <div style={{ height: '3px', background: modPct === 100 ? '#22c55e' : modPct > 0 ? aGrad : theme.border }} />

                                {/* Module header */}
                                <button
                                    onClick={() => setExpandedModule(isExpanded ? null : module._id)}
                                    style={{ width: '100%', padding: '18px 20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontFamily: 'inherit' }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{module.title}</h3>
                                            {modPct === 100 && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '2px 7px', flexShrink: 0 }}>
                                                    <Check size={9} strokeWidth={3} /> Done
                                                </span>
                                            )}
                                        </div>
                                        {module.description && (
                                            <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 8px', lineHeight: 1.4 }}>{module.description}</p>
                                        )}
                                        {/* Mini progress */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, maxWidth: '120px', height: '3px', background: theme.surface2, borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${modPct}%`, background: modPct === 100 ? '#22c55e' : aGrad, borderRadius: '3px', transition: 'width .4s ease' }} />
                                            </div>
                                            <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600 }}>{modCompleted}/{modTotal}</span>
                                        </div>
                                    </div>
                                    <div style={{ color: theme.textMuted, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {!isExpanded && <span style={{ color: theme.textMuted }}>{modTotal} topics</span>}
                                    </div>
                                </button>

                                {/* Topics */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ borderTop: `1px solid ${theme.border}`, padding: '16px 20px', background: `${theme.bg}80`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {module.topics.map((topic) => {
                                                    const isDone = progress?.completedTopics?.includes(topic._id);
                                                    return (
                                                        <div
                                                            key={topic._id}
                                                            style={{
                                                                display: 'flex', gap: '12px', padding: '14px 16px',
                                                                borderRadius: '12px', border: `1px solid ${isDone ? 'rgba(34,197,94,0.20)' : theme.border}`,
                                                                background: isDone ? 'rgba(34,197,94,0.04)' : theme.surface,
                                                                transition: 'border-color .15s, background .15s',
                                                            }}
                                                            onMouseEnter={e => { if (!isDone) e.currentTarget.style.borderColor = `${accent.from}40`; }}
                                                            onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = theme.border; }}
                                                        >
                                                            {/* Completion toggle */}
                                                            <button
                                                                onClick={() => toggleTopic(topic._id)}
                                                                title={isDone ? 'Mark undone' : 'Mark done'}
                                                                style={{
                                                                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                                                                    border: `2px solid ${isDone ? '#22c55e' : theme.border}`,
                                                                    background: isDone ? '#22c55e' : 'none',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', transition: 'all .2s'
                                                                }}
                                                                onMouseEnter={e => { if (!isDone) e.currentTarget.style.borderColor = '#22c55e'; }}
                                                                onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = theme.border; }}
                                                            >
                                                                <Check size={10} style={{ color: isDone ? '#000' : 'transparent' }} strokeWidth={3} />
                                                            </button>

                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: isDone ? theme.textMuted : theme.textPrimary, textDecoration: isDone ? 'line-through' : 'none', margin: '0 0 4px', lineHeight: 1.3 }}>{topic.title}</h4>
                                                                {topic.description && (
                                                                    <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 10px', lineHeight: 1.5 }}>{topic.description}</p>
                                                                )}

                                                                {/* Resource chips */}
                                                                {topic.resources?.length > 0 && (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                                                        {topic.resources.map((res, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => setSelectedResource({ resource: res, moduleId: module._id, topicId: topic._id })}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                                                    padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                                                    background: `${accent.from}12`, color: accent.from,
                                                                                    border: `1px solid ${accent.from}30`, cursor: 'pointer',
                                                                                    transition: 'all .15s', fontFamily: 'inherit'
                                                                                }}
                                                                                onMouseEnter={e => { e.currentTarget.style.background = `${accent.from}22`; e.currentTarget.style.borderColor = `${accent.from}55`; }}
                                                                                onMouseLeave={e => { e.currentTarget.style.background = `${accent.from}12`; e.currentTarget.style.borderColor = `${accent.from}30`; }}
                                                                            >
                                                                                {res.type === 'video' ? <Play size={11} /> : <FileText size={11} />}
                                                                                {res.title}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Quiz buttons */}
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {(() => { const tKey = topic.id || topic._id?.toString(); return topicQuizStatus[tKey]?.published; })() && (
                                                                    <button
                                                                        onClick={() => { const tKey = topic.id || topic._id?.toString(); setQuizTarget({ moduleId: module._id, topicId: tKey, topicTitle: topic.title }); setQuizModalOpen(true); }}
                                                                        style={{
                                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                                            padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                                            background: `linear-gradient(135deg,${accent.from},${accent.to})`,
                                                                            border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                                                                            boxShadow: `0 2px 8px ${accent.from}35`,
                                                                        }}
                                                                    >
                                                                        📝 Take Test/Quiz
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => { setQuizTarget({ moduleId: module._id, topicId: topic._id || topic.id, topicTitle: topic.title }); setQuizModalOpen(true); }}
                                                                    style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                                        background: 'none', border: `1px solid ${theme.border}`,
                                                                        color: theme.textMuted, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                                                                >
                                                                    <Brain size={12} /> Generate Quiz with AI
                                                                </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </main>

            {selectedResource && (
                <ResourcePlayer
                    resource={selectedResource.resource}
                    moduleId={selectedResource.moduleId}
                    topicId={selectedResource.topicId}
                    onClose={() => setSelectedResource(null)}
                    onComplete={() => {}}
                />
            )}

            <QuizModal
                isOpen={quizModalOpen}
                onClose={() => { setQuizModalOpen(false); fetchClassDetails(); }}
                courseId={courseId}
                moduleId={quizTarget?.moduleId}
                topicId={quizTarget?.topicId}
                topicTitle={quizTarget?.topicTitle || ''}
                onComplete={() => fetchClassDetails()}
            />

            {chatOpen && user && (
                <ClassChat
                    courseId={courseId}
                    currentUser={{ id: user._id || user.id, name: user.name, role: user.role || 'student' }}
                    onClose={() => setChatOpen(false)}
                />
            )}
        </div>
    );
};

export default ClassView;
