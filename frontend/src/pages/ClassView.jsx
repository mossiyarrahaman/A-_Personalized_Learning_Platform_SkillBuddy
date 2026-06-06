import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen, Check, Play, FileText, Brain, GraduationCap, Loader, Target, TrendingUp, MessageCircle, ClipboardList, Timer, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ResourcePlayer from '../components/ResourcePlayer';
import QuizModal from '../components/QuizModal';
import ClassChat from '../components/ClassChat';
import TierQuizPanel from '../components/TierQuizPanel';
import TutorPromptInput from '../components/TutorPromptInput';
import TutorChat from '../components/TutorChat';
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
    const [tierScores, setTierScores] = useState({});
    const [expandedTierTopic, setExpandedTierTopic] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [tutorCtx, setTutorCtx] = useState(null);

    // Module-level tests + assignments
    const [moduleTests, setModuleTests] = useState({});
    const [moduleAssignments, setModuleAssignments] = useState({});
    const [subDraft, setSubDraft] = useState({});         // { [assignmentId]: { text, files[] } }
    const [submittingAssignment, setSubmittingAssignment] = useState({});
    // Module test overlay
    const [activeModuleTest, setActiveModuleTest] = useState(null);  // { test, attemptId, questions }
    const [moduleTestAnswers, setModuleTestAnswers] = useState({});
    const moduleTestAnswersRef = useRef({});
    const [moduleTestTimeLeft, setModuleTestTimeLeft] = useState(0);
    const [moduleTestResult, setModuleTestResult] = useState(null);
    const submittingModuleTestRef = useRef(false);

    useEffect(() => { fetchClassDetails(); }, [courseId]);

    const fetchClassDetails = async () => {
        try {
            const [classRes, quizStatusRes, tierScoresRes] = await Promise.all([
                api.get('/courses/student/enrolled-classes'),
                api.get(`/rag/topic-quizzes/${courseId}`).catch(() => ({ data: { quizzes: {} } })),
                api.get(`/courses/${courseId}/my-tier-scores`).catch(() => ({ data: { byTopic: {} } })),
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
            setTierScores(tierScoresRes.data.byTopic || {});
        } catch (error) {
            console.error("Failed to load class", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshTierScores = async () => {
        try {
            const res = await api.get(`/courses/${courseId}/my-tier-scores`);
            setTierScores(res.data.byTopic || {});
        } catch {}
    };

    const fetchModuleContent = async (moduleId) => {
        try {
            const [tRes, aRes] = await Promise.allSettled([
                api.get(`/class-tests/module/${courseId}/${moduleId}`),
                api.get(`/assignments/module/${courseId}/${moduleId}`),
            ]);
            setModuleTests(prev => ({ ...prev, [moduleId]: tRes.status === 'fulfilled' ? (tRes.value.data.tests || []) : [] }));
            setModuleAssignments(prev => ({ ...prev, [moduleId]: aRes.status === 'fulfilled' ? (aRes.value.data.assignments || []) : [] }));
        } catch {}
    };

    // Module test timer
    useEffect(() => {
        if (!activeModuleTest || moduleTestResult) return;
        if (moduleTestTimeLeft <= 0) {
            if (submittingModuleTestRef.current) return;
            submittingModuleTestRef.current = true;
            const answers = activeModuleTest.questions.map((q, i) => ({ questionIndex: i, selectedLabel: moduleTestAnswersRef.current[i] || null }));
            api.post(`/class-tests/${activeModuleTest.test._id}/submit`, { attemptId: activeModuleTest.attemptId, answers })
                .then(res => setModuleTestResult({ score: res.data.score, passed: res.data.passed, correctCount: res.data.correctCount, totalQuestions: res.data.totalQuestions }))
                .catch(() => {});
            return;
        }
        const t = setTimeout(() => setModuleTestTimeLeft(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [activeModuleTest, moduleTestTimeLeft, moduleTestResult]);

    const startModuleTest = async (test) => {
        try {
            const res = await api.post(`/class-tests/${test._id}/start`, {});
            const { attemptId, questions, timeLimitMinutes, startedAt } = res.data;
            const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
            const remaining = Math.max(0, timeLimitMinutes * 60 - elapsed);
            submittingModuleTestRef.current = false;
            setModuleTestAnswers({});
            moduleTestAnswersRef.current = {};
            setModuleTestResult(null);
            setModuleTestTimeLeft(remaining);
            setActiveModuleTest({ test, attemptId, questions });
        } catch (err) {
            alert(err.response?.data?.error || 'Could not start test');
        }
    };

    const submitModuleTest = async () => {
        if (submittingModuleTestRef.current) return;
        submittingModuleTestRef.current = true;
        const answers = activeModuleTest.questions.map((q, i) => ({ questionIndex: i, selectedLabel: moduleTestAnswersRef.current[i] || null }));
        try {
            const res = await api.post(`/class-tests/${activeModuleTest.test._id}/submit`, { attemptId: activeModuleTest.attemptId, answers });
            setModuleTestResult({ score: res.data.score, passed: res.data.passed, correctCount: res.data.correctCount, totalQuestions: res.data.totalQuestions });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to submit test');
            submittingModuleTestRef.current = false;
        }
    };

    const submitModuleAssignment = async (assignmentId, courseId) => {
        const draft = subDraft[assignmentId] || {};
        if (!draft.text?.trim() && !(draft.files?.length)) {
            alert('Please write a response or attach a file'); return;
        }
        setSubmittingAssignment(s => ({ ...s, [assignmentId]: true }));
        try {
            await api.post(`/assignments/${assignmentId}/submit`, { textResponse: draft.text || '', files: draft.files || [] });
            setSubDraft(d => ({ ...d, [assignmentId]: {} }));
            fetchModuleContent(expandedModule);
        } catch (err) {
            alert(err.response?.data?.error || 'Submission failed');
        } finally {
            setSubmittingAssignment(s => ({ ...s, [assignmentId]: false }));
        }
    };

    const fmtCountdown = (sec) => {
        const m = Math.floor(sec / 60); const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
        <div style={{ minHeight: '100vh', width: '100%', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>

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
            <main style={{ padding: '24px' }}>
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
                                    onClick={() => { const next = isExpanded ? null : module._id; setExpandedModule(next); if (next) fetchModuleContent(next); }}
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

                                                {/* Module-level Tests */}
                                                {(moduleTests[module._id] || []).length > 0 && (
                                                    <div style={{ marginBottom: '6px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Timer size={11} /> Module Tests
                                                        </div>
                                                        {(moduleTests[module._id] || []).map(t => {
                                                            const now = new Date();
                                                            const isOpen = (!t.openAt || now >= new Date(t.openAt)) && (!t.closeAt || now <= new Date(t.closeAt));
                                                            const isUpcoming = t.openAt && now < new Date(t.openAt);
                                                            const isClosed = t.closeAt && now > new Date(t.closeAt);
                                                            const statusLabel = isUpcoming ? 'Upcoming' : isClosed ? 'Closed' : 'Open Now';
                                                            const statusColor = isUpcoming ? '#f59e0b' : isClosed ? theme.textMuted : '#22c55e';
                                                            return (
                                                                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '6px' }}>
                                                                    <Timer size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>{t.title}</div>
                                                                        <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>⏱ {t.timeLimitMinutes} min · ❓ {t.questions?.length || 0} questions</div>
                                                                    </div>
                                                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', color: statusColor, border: `1px solid ${isOpen ? 'rgba(34,197,94,0.3)' : theme.border}`, flexShrink: 0 }}>
                                                                        {statusLabel}
                                                                    </span>
                                                                    {isOpen && (
                                                                        <button onClick={() => startModuleTest(t)}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.85)', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                                                        >Start Test</button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Module-level Assignments */}
                                                {(moduleAssignments[module._id] || []).length > 0 && (
                                                    <div style={{ marginBottom: '6px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <ClipboardList size={11} /> Module Assignments
                                                        </div>
                                                        {(moduleAssignments[module._id] || []).map(a => {
                                                            const sub = a.mySubmission;
                                                            const isReturned = sub?.status === 'returned';
                                                            const isSubmitted = sub?.status === 'submitted';
                                                            const isPastDue = a.dueDate && new Date() > new Date(a.dueDate);
                                                            const draft = subDraft[a._id] || {};
                                                            return (
                                                                <div key={a._id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                        <ClipboardList size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>{a.title}</div>
                                                                            {a.dueDate && <div style={{ fontSize: '11px', color: isPastDue ? '#ef4444' : theme.textMuted }}>Due: {new Date(a.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>}
                                                                        </div>
                                                                        {isReturned && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', flexShrink: 0 }}>✓ {sub.grade}/{a.maxPoints}</span>}
                                                                        {isSubmitted && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.3)', flexShrink: 0 }}>Submitted</span>}
                                                                    </div>
                                                                    {isReturned && sub.feedback && (
                                                                        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '7px', padding: '8px 10px', fontSize: '12px', color: theme.textSecondary, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                                                                            💬 {sub.feedback}
                                                                        </div>
                                                                    )}
                                                                    {!isReturned && !isPastDue && (
                                                                        <>
                                                                            <textarea
                                                                                placeholder="Your response…"
                                                                                value={draft.text || ''}
                                                                                onChange={e => setSubDraft(d => ({ ...d, [a._id]: { ...d[a._id], text: e.target.value } }))}
                                                                                rows={3}
                                                                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '7px', padding: '8px 10px', fontSize: '12px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box', marginBottom: '8px' }}
                                                                            />
                                                                            <button onClick={() => submitModuleAssignment(a._id)} disabled={submittingAssignment[a._id]}
                                                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(251,191,36,0.85)', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: '#fff', fontWeight: 700, cursor: submittingAssignment[a._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submittingAssignment[a._id] ? 0.6 : 1 }}
                                                                            ><Send size={12} /> {submittingAssignment[a._id] ? 'Submitting…' : isSubmitted ? 'Resubmit' : 'Submit'}</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

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
                                                                {(() => {
                                                                    const tKey = topic.id || topic._id?.toString();
                                                                    const quizStatus = topicQuizStatus[tKey];
                                                                    const hasTierQuiz = quizStatus?.tiers && Object.values(quizStatus.tiers).some(t => t?.published);
                                                                    const isExpanded = expandedTierTopic === tKey;
                                                                    return (
                                                                        <>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                {/* Tier Tests button — shown when teacher published any tier */}
                                                                                {hasTierQuiz && (
                                                                                    <button
                                                                                        onClick={() => setExpandedTierTopic(prev => prev === tKey ? null : tKey)}
                                                                                        style={{
                                                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                                                            padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                                                            background: isExpanded ? `${accent.from}22` : `linear-gradient(135deg,${accent.from},${accent.to})`,
                                                                                            border: isExpanded ? `1px solid ${accent.from}` : 'none',
                                                                                            color: isExpanded ? accent.from : '#fff',
                                                                                            cursor: 'pointer', fontFamily: 'inherit',
                                                                                            boxShadow: isExpanded ? 'none' : `0 2px 8px ${accent.from}35`,
                                                                                            transition: 'all .15s',
                                                                                        }}
                                                                                    >
                                                                                        🎯 {isExpanded ? 'Hide Tests' : 'Take Test'}
                                                                                    </button>
                                                                                )}
                                                                                {/* Generic teacher quiz button (non-tiered) */}
                                                                                {quizStatus?.published && !hasTierQuiz && (
                                                                                    <button
                                                                                        onClick={() => { setQuizTarget({ moduleId: module._id, topicId: tKey, topicTitle: topic.title }); setQuizModalOpen(true); }}
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
                                                                                    <Brain size={12} /> Practice with AI
                                                                                </button>
                                                                            </div>
                                                                            {/* Tier quiz panel — expands below buttons */}
                                                                            {hasTierQuiz && isExpanded && (
                                                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
                                                                                    <TierQuizPanel
                                                                                        courseId={courseId}
                                                                                        moduleId={module._id}
                                                                                        topicId={tKey}
                                                                                        topicTitle={topic.title}
                                                                                        tierAvailability={quizStatus}
                                                                                        topicScores={tierScores[tKey] || []}
                                                                                        onScoresRefresh={refreshTierScores}
                                                                                        theme={theme}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}

                                                                {/* Tutor entry point */}
                                                                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${theme.border}` }}>
                                                                    <TutorPromptInput
                                                                        topicTitle={topic.title || ''}
                                                                        topicId={topic._id || topic.id}
                                                                        moduleId={module._id}
                                                                        courseId={courseId}
                                                                        pathId={null}
                                                                        onOpenTutor={(ctx) => setTutorCtx(ctx)}
                                                                    />
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

            {/* Module Test Overlay */}
            {activeModuleTest && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: theme.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
                    {/* Top bar */}
                    <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Timer size={18} style={{ color: '#6366f1' }} />
                            <span style={{ fontWeight: 700, fontSize: '15px', color: theme.textPrimary }}>{activeModuleTest.test.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={15} style={{ color: moduleTestTimeLeft < 300 ? '#ef4444' : theme.textMuted }} />
                            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: moduleTestTimeLeft < 300 ? '#ef4444' : theme.textPrimary, minWidth: '52px', textAlign: 'right' }}>
                                {fmtCountdown(moduleTestTimeLeft)}
                            </span>
                        </div>
                    </div>

                    {moduleTestResult ? (
                        /* Result screen */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px 24px' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: moduleTestResult.passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `2px solid ${moduleTestResult.passed ? '#22c55e' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {moduleTestResult.passed ? <CheckCircle size={36} style={{ color: '#22c55e' }} /> : <XCircle size={36} style={{ color: '#ef4444' }} />}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 800, color: moduleTestResult.passed ? '#22c55e' : '#ef4444', marginBottom: '6px' }}>
                                    {moduleTestResult.score}%
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: theme.textPrimary, marginBottom: '4px' }}>
                                    {moduleTestResult.passed ? 'Test Passed!' : 'Test Not Passed'}
                                </div>
                                <div style={{ fontSize: '13px', color: theme.textMuted }}>
                                    {moduleTestResult.correctCount} / {moduleTestResult.totalQuestions} correct
                                </div>
                            </div>
                            <button
                                onClick={() => { setActiveModuleTest(null); setModuleTestResult(null); setModuleTestAnswers({}); moduleTestAnswersRef.current = {}; fetchModuleContent(expandedModule); }}
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 32px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >Done</button>
                        </div>
                    ) : (
                        /* Questions */
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                            {activeModuleTest.questions.map((q, qi) => (
                                <div key={qi} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '18px 20px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: theme.textPrimary, marginBottom: '14px', lineHeight: 1.5 }}>
                                        <span style={{ color: '#6366f1', fontWeight: 700 }}>{qi + 1}.</span> {q.question}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {q.options.map((opt, oi) => {
                                            const label = opt.label || String.fromCharCode(65 + oi);
                                            const isSelected = moduleTestAnswers[qi] === label;
                                            return (
                                                <button
                                                    key={oi}
                                                    onClick={() => {
                                                        setModuleTestAnswers(a => ({ ...a, [qi]: label }));
                                                        moduleTestAnswersRef.current = { ...moduleTestAnswersRef.current, [qi]: label };
                                                    }}
                                                    style={{
                                                        textAlign: 'left', padding: '10px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: isSelected ? 700 : 500,
                                                        background: isSelected ? 'rgba(99,102,241,0.15)' : theme.bg,
                                                        border: `1.5px solid ${isSelected ? '#6366f1' : theme.border}`,
                                                        color: isSelected ? '#6366f1' : theme.textPrimary,
                                                        cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 700, marginRight: '8px' }}>{label}.</span>{opt.text}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={submitModuleTest}
                                style={{ alignSelf: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 40px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', marginTop: '8px', marginBottom: '40px' }}
                            >
                                Submit Test
                            </button>
                        </div>
                    )}
                </div>
            )}

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

            <TutorChat
                isOpen={!!tutorCtx}
                onClose={() => setTutorCtx(null)}
                newSessionContext={tutorCtx}
                sessionId={null}
            />
        </div>
    );
};

export default ClassView;
