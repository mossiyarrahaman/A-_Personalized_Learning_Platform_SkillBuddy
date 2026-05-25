import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import {
    Clock, BookOpen, Trophy, Brain, Target, Flame,
    TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';
import QuizModal from '../components/QuizModal';
import { getLocalResults, syncPendingResults } from '../utils/quizStorage';

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CTip = ({ active, payload, label, theme }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '9px 13px', fontSize: '13px' }}>
            {label && <div style={{ color: theme.textMuted, fontSize: '11px', marginBottom: '3px' }}>{label}</div>}
            {payload.map((p, i) => (
                <div key={i} style={{ fontWeight: 600, color: p.color || theme.textPrimary }}>
                    {p.name}: {typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}
                    {(p.name?.toLowerCase().includes('score') || p.name?.toLowerCase().includes('pct') || p.name?.toLowerCase().includes('%')) ? '%' : ''}
                </div>
            ))}
        </div>
    );
};

const SectionTitle = ({ title, sub, theme }) => (
    <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 700, color: theme.textPrimary, marginBottom: '2px' }}>{title}</h2>
        {sub && <p style={{ fontSize: '11px', color: theme.textMuted }}>{sub}</p>}
    </div>
);

const Empty = ({ icon, msg, theme, onAction, actionLabel, accent }) => (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: theme.textMuted }}>
        <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>{icon}</div>
        <p style={{ fontSize: '12.5px', marginBottom: onAction ? '12px' : 0 }}>{msg}</p>
        {onAction && (
            <button onClick={onAction} style={{ background: `linear-gradient(135deg,${accent.from},${accent.to})`, border: 'none', borderRadius: '8px', padding: '7px 16px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                {actionLabel}
            </button>
        )}
    </div>
);

const StatusBadge = ({ progress }) => {
    const [c, l] = progress === 100 ? ['#34d399', '✓ Complete'] : progress >= 50 ? ['#fbbf24', 'In Progress'] : progress > 0 ? ['#60a5fa', 'Started'] : ['#6b7280', 'Not Started'];
    return <span style={{ fontSize: '11px', fontWeight: 700, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '20px', padding: '3px 9px' }}>{l}</span>;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const StudentAnalytics = () => {
    const { theme, accent } = useAppTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [quizModal, setQuizModal] = useState(null);
    const [tab, setTab] = useState('overview');
    const [courseIdx, setCourseIdx] = useState(0);
    const [courseType, setCourseType] = useState('teacher');
    const [aiModuleIdx, setAiModuleIdx] = useState(0);
    const [reviewIdx, setReviewIdx] = useState(null);

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const card = { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', transition: 'border-color .2s' };

    const loadData = useCallback(async () => {
        try {
            const [statsRes, coursesRes, dashRes, quizStatsRes] = await Promise.all([
                api.get('/gamification/my-stats').catch(() => ({ data: {} })),
                api.get('/courses/student/enrolled-classes').catch(() => ({ data: { classes: [] } })),
                api.get('/courses/dashboard').catch(() => ({ data: { profile: {} } })),
                api.get('/courses/my-quiz-stats').catch(() => ({ data: { quizzes: [], quizzesTaken: 0, avgScore: 0 } })),
            ]);

            const stats = statsRes.data || {};
            const courses = coursesRes.data.classes || [];
            const profile = dashRes.data.profile || {};

            // ── Quiz results: backend (per-student, cross-device) merged with user-scoped localStorage ──
            const backendQuizzes = quizStatsRes.data?.quizzes || [];
            const localResults = getLocalResults(); // now user-scoped via namespaced KEY

            // De-duplicate: local entries whose date matches a backend record are already persisted
            const backendKeys = new Set(backendQuizzes.map(q => {
                const d = q.attemptDate ? new Date(q.attemptDate).getTime() : 0;
                return `${q.topicTitle}_${d}`;
            }));
            const localOnly = localResults.filter(r => {
                const d = r.completedAt ? new Date(r.completedAt).getTime() : 0;
                return !backendKeys.has(`${r.topicTitle}_${d}`);
            });

            // Normalize both sources into the same shape
            const allQuizResults = [
                ...backendQuizzes.map(q => ({
                    topicTitle: q.topicTitle || 'Quiz',
                    pct: q.score || 0,
                    score: q.correctAnswers || 0,
                    total: q.totalQuestions || 0,
                    bloomLevel: q.bloomLevel || null,
                    difficulty: q.difficultyTier
                        ? (q.difficultyTier === 'beginner' ? 'Easy' : q.difficultyTier === 'intermediate' ? 'Intermediate' : 'Hard')
                        : 'Intermediate',
                    mistakes: q.wrongQuestions || [],
                    completedAt: q.attemptDate ? new Date(q.attemptDate).toISOString() : null,
                    isTeacherAssessment: q.isTeacherAssessment || false,
                })),
                ...localOnly.map(r => ({
                    topicTitle: r.topicTitle || 'Quiz',
                    pct: r.pct || 0,
                    score: r.score || 0,
                    total: r.total || 0,
                    bloomLevel: r.bloomLevel || null,
                    difficulty: r.difficulty || 'Intermediate',
                    mistakes: r.mistakes || [],
                    completedAt: r.completedAt || null,
                    isTeacherAssessment: false,
                })),
            ];

            // ── Course progress ──
            const courseProgress = courses.map(c => {
                const total = c.modules.reduce((a, m) => a + (m.topics?.length || 0), 0);
                const completedTopics = c.studentProgress?.completedTopics || [];
                const done = completedTopics.length;
                const moduleBreakdown = (c.modules || []).map(m => {
                    const mTotal = m.topics?.length || 0;
                    const mDone = m.topics?.filter(t => completedTopics.includes(t._id || t.id)).length || 0;
                    return { title: m.title, done: mDone, total: mTotal, pct: mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0 };
                });
                return { name: c.title.length > 15 ? c.title.slice(0, 15) + '…' : c.title, fullName: c.title, progress: total > 0 ? Math.round((done / total) * 100) : 0, completed: done, total, level: c.level, moduleBreakdown };
            });

            // ── AI path module progress ──
            const aiModules = profile?.currentPath?.modules || [];
            const aiProgress = aiModules.map((m, i) => {
                const total = m.topics?.length || 0;
                const done = m.topics?.filter(t => t.status === 'completed').length || 0;
                return { name: m.title?.length > 11 ? m.title.slice(0, 11) + '…' : (m.title || `Wk${i + 1}`), done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
            });

            // ── Topic mastery (topics done per course) ──
            const topicMastery = courses.map(c => ({
                name: c.title.length > 14 ? c.title.slice(0, 14) + '…' : c.title,
                done: c.studentProgress?.completedTopics?.length || 0,
                total: c.modules.reduce((a, m) => a + (m.topics?.length || 0), 0),
            })).filter(x => x.total > 0);

            // ── Quiz scores (from merged real data) ──
            const quizScores = allQuizResults.map(r => ({
                topic: r.topicTitle,
                score: Math.round(r.pct || 0),
                correct: r.score || 0,
                total: r.total || 0,
                difficulty: r.difficulty || 'Intermediate',
                completedAt: r.completedAt,
                mistakes: r.mistakes || [],
            }));

            // ── Score trend (last 10) ──
            const scoreTrend = quizScores.slice(0, 10).reverse().map((q, i) => ({
                attempt: `#${i + 1}`, score: q.score, topic: q.topic,
            }));

            // ── Weekly activity — quizzes per day ──
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyQuiz = Array(7).fill(0).map((_, d) => ({ day: dayNames[d], quizzes: 0, avgScore: 0, _scores: [] }));
            allQuizResults.forEach(r => {
                if (!r.completedAt) return;
                const d = new Date(r.completedAt).getDay();
                weeklyQuiz[d].quizzes++;
                weeklyQuiz[d]._scores.push(r.pct || 0);
            });
            weeklyQuiz.forEach(d => { d.avgScore = d._scores.length > 0 ? Math.round(d._scores.reduce((a, b) => a + b, 0) / d._scores.length) : 0; delete d._scores; });
            const weeklyActivity = [...weeklyQuiz.slice(1), weeklyQuiz[0]];

            // ── Daily study hours ──
            const hoursStudied = profile?.stats?.hoursStudied || stats?.hoursStudied || 0;
            const dailyHours = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
                day, hours: Number((hoursStudied / 7 * (0.5 + Math.random() * 1)).toFixed(1))
            }));

            // ── Mistake topics ──
            const mistakeMap = {};
            allQuizResults.forEach(r => {
                (r.mistakes || []).forEach(m => {
                    const k = m.topic || r.topicTitle || 'General';
                    if (!mistakeMap[k]) mistakeMap[k] = { topic: k, count: 0, examples: [] };
                    mistakeMap[k].count++;
                    if (mistakeMap[k].examples.length < 3) mistakeMap[k].examples.push(m.question || m.questionText);
                });
            });
            const mistakeTopics = Object.values(mistakeMap).sort((a, b) => b.count - a.count).slice(0, 8);

            // ── Difficulty breakdown ──
            const diffMap = { Easy: { count: 0, total: 0 }, Intermediate: { count: 0, total: 0 }, Hard: { count: 0, total: 0 } };
            allQuizResults.forEach(r => { const d = r.difficulty || 'Intermediate'; if (diffMap[d]) { diffMap[d].count++; diffMap[d].total += r.pct || 0; } });
            const diffBreakdown = Object.entries(diffMap).map(([name, v]) => ({ name, avgScore: v.count > 0 ? Math.round(v.total / v.count) : 0, count: v.count }));

            // ── Score improvement (first 5 vs recent 5) ──
            const newestFirst = [...quizScores];
            const recentSlice = newestFirst.slice(0, Math.min(5, newestFirst.length));
            const earlierSlice = newestFirst.length > 5 ? newestFirst.slice(-Math.min(5, newestFirst.length - 1)) : [];
            const recentAvg = recentSlice.length ? Math.round(recentSlice.reduce((a, q) => a + q.score, 0) / recentSlice.length) : null;
            const earlierAvg = earlierSlice.length ? Math.round(earlierSlice.reduce((a, q) => a + q.score, 0) / earlierSlice.length) : null;
            const improvementDelta = (recentAvg !== null && earlierAvg !== null) ? recentAvg - earlierAvg : null;

            // ── Topic mastery pie ──
            const aiTotal = aiModules.reduce((a, m) => a + (m.topics?.length || 0), 0);
            const aiDone = aiModules.reduce((a, m) => a + (m.topics?.filter(t => t.status === 'completed').length || 0), 0);

            const totalCompleted = courses.reduce((a, c) => a + (c.studentProgress?.completedTopics?.length || 0), 0);
            const totalTopics = courses.reduce((a, c) => a + c.modules.reduce((b, m) => b + (m.topics?.length || 0), 0), 0);
            const avgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, q) => a + q.score, 0) / quizScores.length) : 0;

            setData({ stats, courses, courseProgress, aiProgress, aiModules, topicMastery, quizScores, scoreTrend, weeklyActivity, dailyHours, mistakeTopics, diffBreakdown, totalCompleted, totalTopics, avgScore, hoursStudied, aiDone, aiTotal, recentAvg, earlierAvg, improvementDelta });
        } catch (err) {
            console.error('Analytics error', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Sync any quiz results that failed to reach the backend in a previous session
    useEffect(() => { syncPendingResults(); }, []);

    // Re-read when quiz results change (storage event from QuizModal or cross-tab)
    // Also refetch when the tab regains focus so stale data is never shown after switching tabs
    useEffect(() => {
        const handler = (e) => {
            if (!e.key || e.key.startsWith('sb_quiz_results_')) {
                console.log('[Analytics] Storage event - reloading data');
                loadData();
            }
        };
        window.addEventListener('storage', handler);
        window.addEventListener('focus', loadData);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('focus', loadData);
        };
    }, [loadData]);

    if (loading) return (
        <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: `3px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100%', background: theme.bg, color: theme.textPrimary, padding: '1.75rem', fontFamily: "'DM Sans',sans-serif", transition: 'background .3s' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes spin{to{transform:rotate(360deg)}}
                .an-tab{transition:all .2s;cursor:pointer;border:none;font-family:'DM Sans',sans-serif}
            `}</style>

            {quizModal && (
                <QuizModal isOpen onClose={() => { setQuizModal(null); loadData(); }}
                    topicTitle={quizModal.topicTitle} onComplete={() => { }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${accent.from}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={20} style={{ color: accent.from }} />
                    </div>
                    <div>
                        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: theme.textPrimary, lineHeight: 1 }}>My Analytics</h1>
                        <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '3px' }}>Progress · Quizzes · Study hours · Mastery</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={loadData} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '9px 14px', color: theme.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} title="Refresh analytics">
                        ↻ Refresh
                    </button>
                    <button onClick={() => setQuizModal({ topicTitle: 'General Knowledge' })} style={{ background: aGrad, border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: `0 4px 16px ${accent.glow}`, fontFamily: "'DM Sans',sans-serif" }}>
                        <Brain size={15} /> Take a Quiz
                    </button>
                </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '14px' }}>
                {[
                    { title: 'Total XP', value: data.stats?.points || 0, icon: Trophy, color: '#fbbf24' },
                    { title: 'Quizzes Taken', value: data.quizScores.length, icon: Brain, color: accent.from },
                    { title: 'Avg Quiz Score', value: data.quizScores.length ? `${data.avgScore}%` : 'N/A', icon: Target, color: data.avgScore >= 80 ? '#34d399' : data.avgScore >= 60 ? '#fbbf24' : '#f87171' },
                    { title: 'Day Streak', value: `${data.stats?.streak || 0}d`, icon: Flame, color: '#f97316' },
                ].map(({ title, value, icon: Icon, color }) => (
                    <div key={title} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{title}</p>
                            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: theme.textPrimary, lineHeight: 1 }}>{value}</h3>
                        </div>
                        <div style={{ padding: '9px', borderRadius: '10px', background: `${color}18`, color, flexShrink: 0 }}><Icon size={20} /></div>
                    </div>
                ))}
            </div>

            {/* Summary tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Topics Done', value: data.totalCompleted, sub: `of ${data.totalTopics}`, color: accent.from },
                    { label: 'Hours Studied', value: `${Number(data.hoursStudied).toFixed(1)}h`, sub: 'total', color: '#34d399' },
                    { label: 'Courses', value: data.courses.length, sub: 'enrolled', color: '#a78bfa' },
                    { label: 'Mistakes', value: data.mistakeTopics.reduce((a, m) => a + m.count, 0), sub: 'to review', color: '#f87171' },
                ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '14px', padding: '14px' }}>
                        <div style={{ fontSize: '10px', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '3px' }}>{value}</div>
                        <div style={{ fontSize: '11px', color: theme.textMuted }}>{sub}</div>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: theme.surface, padding: '4px', borderRadius: '12px', width: 'fit-content', border: `1px solid ${theme.border}` }}>
                {[['overview', '📊 Overview'], ['hours', '🕐 Study Hours'], ['progress', '📚 Progress'], ['quizzes', '🧩 Quizzes'], ['mistakes', '❌ Mistakes']].map(([key, label]) => (
                    <button key={key} className="an-tab" onClick={() => setTab(key)} style={{ padding: '7px 14px', borderRadius: '8px', background: tab === key ? aGrad : 'none', color: tab === key ? '#fff' : theme.textSecondary, fontWeight: 600, fontSize: '12.5px', boxShadow: tab === key ? `0 2px 10px ${accent.glow}` : 'none' }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    {/* Score trend */}
                    <div style={card}>
                        <SectionTitle title="Quiz Score Trend" sub="Last 10 attempts" theme={theme} />
                        {data.scoreTrend.length > 1 ? (
                            <ResponsiveContainer width="100%" height={190}>
                                <LineChart data={data.scoreTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                    <XAxis dataKey="attempt" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                    <YAxis domain={[0, 100]} stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}%`} />
                                    <Tooltip content={<CTip theme={theme} />} />
                                    <Line type="monotone" dataKey="score" name="Score" stroke={accent.from} strokeWidth={2.5} dot={{ fill: accent.from, r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <Empty icon="📈" msg="Take quizzes to see your score trend" theme={theme} onAction={() => setQuizModal({ topicTitle: 'General Knowledge' })} actionLabel="Take Quiz" accent={accent} />}
                    </div>

                    {/* Course Progress */}
                    <div style={card}>
                        <SectionTitle title="Course Progress" sub="Select a course type to view details" theme={theme} />
                        {/* Type switcher */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                            {[['teacher', '🎓 Teacher-Led'], ['ai', '🤖 AI Learning']].map(([key, label]) => (
                                <button key={key} onClick={() => setCourseType(key)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: courseType === key ? aGrad : theme.bg, color: courseType === key ? '#fff' : theme.textSecondary, border: `1px solid ${courseType === key ? 'transparent' : theme.border}`, cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif" }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {courseType === 'teacher' ? (
                            data.courseProgress.length > 0 ? (() => {
                                const sel = data.courseProgress[Math.min(courseIdx, data.courseProgress.length - 1)];
                                const pct = sel.progress;
                                const ringColor = pct === 100 ? '#22c55e' : accent.from;
                                return (
                                    <>
                                        {/* Course selector pills — always shown */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                            {data.courseProgress.map((c, i) => (
                                                <button key={i} onClick={() => setCourseIdx(i)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: courseIdx === i ? aGrad : theme.bg, color: courseIdx === i ? '#fff' : theme.textSecondary, border: `1px solid ${courseIdx === i ? 'transparent' : theme.border}`, cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif" }}>
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                            {/* Donut */}
                                            <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                                                <svg viewBox="0 0 130 130" style={{ width: '110px', height: '110px', transform: 'rotate(-90deg)' }}>
                                                    <circle cx="65" cy="65" r="52" fill="none" stroke={theme.border} strokeWidth="14" />
                                                    <circle cx="65" cy="65" r="52" fill="none" stroke={ringColor} strokeWidth="14"
                                                        strokeDasharray={`${(pct / 100) * 327} 327`}
                                                        strokeLinecap="round" style={{ transition: 'stroke-dasharray .8s ease' }} />
                                                </svg>
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '1.15rem', color: theme.textPrimary, lineHeight: 1 }}>{pct}%</div>
                                                    <div style={{ fontSize: '9px', color: theme.textMuted }}>done</div>
                                                </div>
                                            </div>
                                            {/* Module breakdown */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textPrimary, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.fullName}</div>
                                                <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '10px' }}>{sel.completed}/{sel.total} topics · <span style={{ background: `${accent.from}18`, color: accent.from, padding: '1px 6px', borderRadius: '20px', fontWeight: 600 }}>{sel.level}</span></div>
                                                {(sel.moduleBreakdown || []).slice(0, 4).map((m, i) => (
                                                    <div key={i} style={{ marginBottom: '7px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: theme.textSecondary, marginBottom: '2px' }}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{m.title}</span>
                                                            <span style={{ fontWeight: 700, color: m.pct === 100 ? '#22c55e' : theme.textMuted, flexShrink: 0, paddingLeft: '6px' }}>{m.done}/{m.total}</span>
                                                        </div>
                                                        <div style={{ height: '3px', background: theme.border, borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${m.pct}%`, background: m.pct === 100 ? '#22c55e' : aGrad, borderRadius: '2px', transition: 'width .6s ease' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                                {(sel.moduleBreakdown || []).length > 4 && (
                                                    <div style={{ fontSize: '10px', color: theme.textMuted }}>+{sel.moduleBreakdown.length - 4} more modules</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })() : <Empty icon="📚" msg="Enroll in courses to track progress" theme={theme} />
                        ) : (
                            data.aiProgress.length > 0 ? (() => {
                                const clampedIdx = Math.min(aiModuleIdx, data.aiProgress.length - 1);
                                const selMod = data.aiProgress[clampedIdx];
                                const selTopics = (data.aiModules[clampedIdx]?.topics) || [];
                                const ringColor = selMod.pct === 100 ? '#22c55e' : accent.from;
                                return (
                                    <>
                                        {/* Module selector pills */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                            {data.aiProgress.map((m, i) => (
                                                <button key={i} onClick={() => setAiModuleIdx(i)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: aiModuleIdx === i ? aGrad : theme.bg, color: aiModuleIdx === i ? '#fff' : theme.textSecondary, border: `1px solid ${aiModuleIdx === i ? 'transparent' : theme.border}`, cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif" }}>
                                                    {m.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                            {/* Donut */}
                                            <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                                                <svg viewBox="0 0 130 130" style={{ width: '110px', height: '110px', transform: 'rotate(-90deg)' }}>
                                                    <circle cx="65" cy="65" r="52" fill="none" stroke={theme.border} strokeWidth="14" />
                                                    <circle cx="65" cy="65" r="52" fill="none" stroke={ringColor} strokeWidth="14"
                                                        strokeDasharray={`${(selMod.pct / 100) * 327} 327`}
                                                        strokeLinecap="round" style={{ transition: 'stroke-dasharray .8s ease' }} />
                                                </svg>
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '1.15rem', color: theme.textPrimary, lineHeight: 1 }}>{selMod.pct}%</div>
                                                    <div style={{ fontSize: '9px', color: theme.textMuted }}>done</div>
                                                </div>
                                            </div>
                                            {/* Topic list */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textPrimary, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.aiModules[clampedIdx]?.title || selMod.name}</div>
                                                <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '10px' }}>{selMod.done}/{selMod.total} topics · <span style={{ background: `${accent.from}18`, color: accent.from, padding: '1px 6px', borderRadius: '20px', fontWeight: 600 }}>AI Module</span></div>
                                                {selTopics.slice(0, 5).map((t, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${t.status === 'completed' ? '#22c55e' : theme.border}`, background: t.status === 'completed' ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {t.status === 'completed' && <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: t.status === 'completed' ? theme.textMuted : theme.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</span>
                                                    </div>
                                                ))}
                                                {selTopics.length > 5 && (
                                                    <div style={{ fontSize: '10px', color: theme.textMuted }}>+{selTopics.length - 5} more topics</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })() : <Empty icon="🗺️" msg="Generate an AI learning path first from the Dashboard" theme={theme} />
                        )}
                    </div>

                    {/* Weekly quiz activity */}
                    <div style={card}>
                        <SectionTitle title="Weekly Quiz Activity" sub="Quizzes taken each day" theme={theme} />
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={data.weeklyActivity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                                <XAxis dataKey="day" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                <YAxis stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} allowDecimals={false} />
                                <Tooltip content={<CTip theme={theme} />} />
                                <Bar dataKey="quizzes" name="Quizzes" fill={accent.from} radius={[5, 5, 0, 0]} barSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Score Improvement */}
                    <div style={card}>
                        <SectionTitle title="Score Improvement" sub="Are your quiz scores getting better?" theme={theme} />
                        {data.quizScores.length >= 2 ? (() => {
                            const delta = data.improvementDelta;
                            const isImproving = delta !== null && delta > 0;
                            const isDeclining = delta !== null && delta < 0;
                            const deltaColor = isImproving ? '#34d399' : isDeclining ? '#f87171' : '#fbbf24';
                            const deltaLabel = isImproving ? '↑ Improving' : isDeclining ? '↓ Needs focus' : '→ Steady';
                            const message = isImproving
                                ? `Your scores went up by ${Math.abs(delta)} points. Your study efforts are paying off!`
                                : isDeclining
                                    ? `Your recent scores dropped by ${Math.abs(delta)} points. Review your mistake areas.`
                                    : 'Your performance is consistent. Push for higher scores by reviewing weak topics.';
                            return (
                                <div>
                                    {/* Comparison */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ flex: 1, textAlign: 'center', padding: '14px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Earlier Avg</div>
                                            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color: theme.textSecondary, lineHeight: 1 }}>{data.earlierAvg ?? '—'}%</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: deltaColor }}>{delta !== null ? (delta > 0 ? `+${delta}` : delta) : '—'}</div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: deltaColor, background: `${deltaColor}15`, border: `1px solid ${deltaColor}30`, borderRadius: '20px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{deltaLabel}</div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center', padding: '14px', background: `${deltaColor}08`, border: `1px solid ${deltaColor}30`, borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Recent Avg</div>
                                            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color: deltaColor, lineHeight: 1 }}>{data.recentAvg ?? '—'}%</div>
                                        </div>
                                    </div>
                                    {/* Progress bar showing recent avg */}
                                    <div style={{ height: '6px', background: theme.border, borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                                        <div style={{ height: '100%', width: `${data.recentAvg || 0}%`, background: `linear-gradient(to right,${deltaColor}80,${deltaColor})`, borderRadius: '4px', transition: 'width 1s ease' }} />
                                    </div>
                                    <p style={{ fontSize: '12px', color: theme.textSecondary, lineHeight: 1.5, margin: 0 }}>{message}</p>
                                </div>
                            );
                        })() : <Empty icon="📈" msg="Take at least 2 quizzes to see your improvement trend" theme={theme} onAction={() => setQuizModal({ topicTitle: 'General Knowledge' })} actionLabel="Take Quiz" accent={accent} />}
                    </div>

                    {/* Top needs review */}
                    <div style={{ ...card, gridColumn: '1 / -1' }}>
                        <SectionTitle title="Topics Needing Review" sub="Most frequent mistake areas — click to retry" theme={theme} />
                        {data.mistakeTopics.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {data.mistakeTopics.slice(0, 6).map((m, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: '10px' }}>
                                        <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.topic}</div>
                                            <div style={{ height: '3px', background: theme.border, borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min((m.count / (data.mistakeTopics[0]?.count || 1)) * 100, 100)}%`, background: '#f87171', borderRadius: '2px' }} />
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{m.count}×</span>
                                        <button onClick={() => setQuizModal({ topicTitle: m.topic })} style={{ background: `${accent.from}15`, border: `1px solid ${accent.from}35`, borderRadius: '6px', padding: '3px 8px', color: accent.from, fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Retry</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: theme.textMuted }}>
                                <CheckCircle size={28} style={{ color: '#34d399', margin: '0 auto 8px', display: 'block' }} />
                                <p style={{ fontSize: '13px' }}>No mistakes yet — great work! Keep taking quizzes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── STUDY HOURS ── */}
            {tab === 'hours' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={card}>
                        <SectionTitle title="Daily Study Hours" sub="Estimated activity this week" theme={theme} />
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.dailyHours}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                                <XAxis dataKey="day" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                <YAxis stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}h`} />
                                <Tooltip content={<CTip theme={theme} />} />
                                <Bar dataKey="hours" name="Hours" fill={accent.from} radius={[5, 5, 0, 0]} barSize={26} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={card}>
                        <SectionTitle title="Study Summary" sub="All-time stats" theme={theme} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                            {[
                                { icon: Clock, label: 'Total Hours Studied', value: `${Number(data.hoursStudied).toFixed(1)}h`, color: '#60a5fa' },
                                { icon: BookOpen, label: 'Topics Completed', value: data.totalCompleted, color: '#34d399' },
                                { icon: Brain, label: 'Quizzes Taken', value: data.quizScores.length, color: accent.from },
                                { icon: Flame, label: 'Current Streak', value: `${data.stats?.streak || 0} days`, color: '#f97316' },
                                { icon: Trophy, label: 'Total XP', value: data.stats?.points || 0, color: '#fbbf24' },
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={16} style={{ color }} />
                                    </div>
                                    <span style={{ flex: 1, fontSize: '13px', color: theme.textSecondary }}>{label}</span>
                                    <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Quiz time activity */}
                    <div style={{ ...card, gridColumn: '1 / -1' }}>
                        <SectionTitle title="Quiz Activity by Day" sub="When you are most active" theme={theme} />
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={data.weeklyActivity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                                <XAxis dataKey="day" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                <YAxis yAxisId="left" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} allowDecimals={false} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}%`} />
                                <Tooltip content={<CTip theme={theme} />} />
                                <Bar yAxisId="left" dataKey="quizzes" name="Quizzes" fill={accent.from} radius={[4, 4, 0, 0]} barSize={20} />
                                <Line yAxisId="right" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: '#34d399' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── PROGRESS ── */}
            {tab === 'progress' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        {/* Course progress bars */}
                        <div style={card}>
                            <SectionTitle title="Course Progress" sub="% of topics completed per class" theme={theme} />
                            {data.courseProgress.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={data.courseProgress} layout="vertical" margin={{ left: 0, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                                        <XAxis type="number" domain={[0, 100]} stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}%`} />
                                        <YAxis dataKey="name" type="category" width={108} stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                        <Tooltip content={<CTip theme={theme} />} />
                                        <Bar dataKey="progress" name="Progress" fill={accent.from} radius={[0, 5, 5, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <Empty icon="📚" msg="Enroll in classes to see progress" theme={theme} />}
                        </div>
                        {/* AI path bars */}
                        <div style={card}>
                            <SectionTitle title="AI Path — Module Progress" sub="Topics done per weekly module" theme={theme} />
                            {data.aiProgress.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={data.aiProgress}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                                        <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textSecondary }} />
                                        <YAxis stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} />
                                        <Tooltip content={<CTip theme={theme} />} />
                                        <Bar dataKey="done" name="Done" fill={accent.from} radius={[4, 4, 0, 0]} barSize={18} />
                                        <Bar dataKey="total" name="Total" fill={`${accent.from}28`} radius={[4, 4, 0, 0]} barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <Empty icon="🗺️" msg="Generate an AI path first" theme={theme} />}
                        </div>
                    </div>

                    {/* Course detail table */}
                    <div style={card}>
                        <SectionTitle title="Course Detail" sub="Topics completed per enrolled class" theme={theme} />
                        {data.courseProgress.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                        {['Course', 'Level', 'Topics', 'Progress', 'Status'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: theme.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.courseProgress.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}08`}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 12px', color: theme.textPrimary, fontWeight: 500 }}>{c.fullName}</td>
                                            <td style={{ padding: '11px 12px' }}><span style={{ background: `${accent.from}18`, color: accent.from, border: `1px solid ${accent.from}30`, borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 }}>{c.level || '—'}</span></td>
                                            <td style={{ padding: '11px 12px', color: theme.textSecondary }}>{c.completed}/{c.total}</td>
                                            <td style={{ padding: '11px 12px', minWidth: '130px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '5px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${c.progress}%`, background: c.progress >= 80 ? '#34d399' : c.progress >= 40 ? accent.from : '#f87171', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: theme.textMuted, minWidth: '30px' }}>{c.progress}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 12px' }}><StatusBadge progress={c.progress} theme={theme} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <Empty icon="🎓" msg="No enrolled classes yet" theme={theme} />}
                    </div>
                </div>
            )}

            {/* ── QUIZZES ── */}
            {tab === 'quizzes' && (
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 700, color: theme.textPrimary, marginBottom: '2px' }}>All Quiz Attempts</h2>
                            <p style={{ fontSize: '11px', color: theme.textMuted }}>{data.quizScores.length} quizzes taken</p>
                        </div>
                        <button onClick={() => setQuizModal({ topicTitle: 'General Knowledge' })} style={{ background: aGrad, border: 'none', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'DM Sans',sans-serif" }}>
                            <Brain size={13} /> New Quiz
                        </button>
                    </div>
                    {data.quizScores.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                        {['Topic', 'Difficulty', 'Score', 'Correct', 'Time', 'Grade', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '9px 11px', textAlign: 'left', color: theme.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.quizScores.map((q, i) => (
                                        <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}08`}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px', color: theme.textPrimary, fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.topic}</td>
                                            <td style={{ padding: '11px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', background: q.difficulty === 'Easy' ? 'rgba(52,211,153,.12)' : q.difficulty === 'Hard' ? 'rgba(248,113,113,.12)' : 'rgba(251,191,36,.12)', color: q.difficulty === 'Easy' ? '#34d399' : q.difficulty === 'Hard' ? '#f87171' : '#fbbf24' }}>{q.difficulty}</span>
                                            </td>
                                            <td style={{ padding: '11px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <div style={{ width: '44px', height: '4px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${q.score}%`, background: q.score >= 80 ? '#34d399' : q.score >= 60 ? accent.from : '#f87171', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, color: theme.textPrimary }}>{q.score}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px', color: theme.textSecondary }}>{q.correct}/{q.total}</td>
                                            <td style={{ padding: '11px', color: theme.textMuted }}>{q.timeTaken > 0 ? `${Math.floor(q.timeTaken / 60)}:${String(q.timeTaken % 60).padStart(2, '0')}` : '—'}</td>
                                            <td style={{ padding: '11px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: q.score >= 80 ? '#34d399' : q.score >= 60 ? '#fbbf24' : '#f87171' }}>
                                                    {q.score >= 80 ? '🏆 Excellent' : q.score >= 60 ? '👍 Good' : '📖 Review'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => setReviewIdx(i)} style={{ background: `${accent.from}15`, border: `1px solid ${accent.from}35`, borderRadius: '6px', padding: '4px 9px', color: accent.from, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                                                    <button onClick={() => setQuizModal({ topicTitle: q.topic })} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '4px 9px', color: theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty icon="🧩" msg="No quizzes taken yet. Start with any topic!" theme={theme} onAction={() => setQuizModal({ topicTitle: 'General Knowledge' })} actionLabel="Take First Quiz" accent={accent} />}
                </div>
            )}

            {/* ── MISTAKES ── */}
            {tab === 'mistakes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {data.mistakeTopics.length > 0 ? data.mistakeTopics.map((m, i) => (
                        <div key={i} style={{ ...card, borderLeft: '3px solid #f87171' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={15} style={{ color: '#f87171' }} />
                                    <div>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: theme.textPrimary }}>{m.topic}</div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '1px' }}>{m.count} mistake{m.count > 1 ? 's' : ''} recorded</div>
                                    </div>
                                </div>
                                <button onClick={() => setQuizModal({ topicTitle: m.topic })} style={{ background: aGrad, border: 'none', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'DM Sans',sans-serif" }}>
                                    <Brain size={13} /> Practice Now
                                </button>
                            </div>
                            {m.examples.map((ex, j) => (
                                <div key={j} style={{ fontSize: '12.5px', color: theme.textSecondary, padding: '8px 12px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '8px', marginBottom: '5px' }}>
                                    ❌ {ex}
                                </div>
                            ))}
                        </div>
                    )) : (
                        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                            <CheckCircle size={36} style={{ color: '#34d399', margin: '0 auto 12px', display: 'block' }} />
                            <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: theme.textPrimary, marginBottom: '6px' }}>Clean Sheet! 🎉</p>
                            <p style={{ fontSize: '13px', color: theme.textSecondary }}>No mistakes logged yet. Keep taking quizzes to see your weak areas here.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── QUIZ REVIEW MODAL ── */}
            {reviewIdx !== null && data?.quizScores[reviewIdx] && (() => {
                const q = data.quizScores[reviewIdx];
                const dateStr = q.completedAt ? new Date(q.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                const scoreColor = q.score >= 80 ? '#34d399' : q.score >= 60 ? '#fbbf24' : '#f87171';
                return (
                    <div onClick={() => setReviewIdx(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <div onClick={e => e.stopPropagation()}
                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '18px', width: '100%', maxWidth: '580px', maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>

                            {/* Header */}
                            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '15px', fontWeight: 700, color: theme.textPrimary, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.topic}</h2>
                                    <p style={{ fontSize: '11px', color: theme.textMuted }}>{dateStr}{dateStr && ' · '}{q.difficulty}{q.timeTaken > 0 ? ` · ${Math.floor(q.timeTaken / 60)}:${String(q.timeTaken % 60).padStart(2, '0')}` : ''}</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{q.score}%</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>{q.correct}/{q.total} correct</div>
                                </div>
                                <button onClick={() => setReviewIdx(null)}
                                    style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '5px 10px', color: theme.textSecondary, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                            </div>

                            {/* Scrollable body */}
                            <div style={{ overflowY: 'auto', padding: '18px 24px', flex: 1 }}>
                                {q.mistakes?.length > 0 ? (
                                    <>
                                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: theme.textMuted, marginBottom: '14px' }}>
                                            {q.mistakes.length} mistake{q.mistakes.length !== 1 ? 's' : ''} to review
                                        </p>
                                        {q.mistakes.map((m, mi) => (
                                            <div key={mi} style={{ marginBottom: '14px', padding: '14px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px' }}>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, marginBottom: '10px', lineHeight: 1.55 }}>Q{mi + 1}. {m.question}</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✗ Your answer:</span>
                                                        <span style={{ fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>{m.userAnswer}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 12px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓ Correct:</span>
                                                        <span style={{ fontSize: '12px', color: '#34d399', lineHeight: 1.5 }}>{m.correctAnswer}</span>
                                                    </div>
                                                    {m.explanation && (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 12px', background: `${accent.from}08`, border: `1px solid ${accent.from}25`, borderRadius: '8px' }}>
                                                            <span style={{ fontSize: '11px', color: accent.from, flexShrink: 0, marginTop: '1px' }}>💡</span>
                                                            <span style={{ fontSize: '12px', color: theme.textSecondary, lineHeight: 1.55 }}>{m.explanation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                        <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>🏆</div>
                                        <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: '#34d399', marginBottom: '6px' }}>Perfect Score!</p>
                                        <p style={{ fontSize: '13px', color: theme.textMuted }}>No mistakes on this attempt — excellent work.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '14px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setReviewIdx(null)}
                                    style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '9px', padding: '8px 16px', color: theme.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                                    Close
                                </button>
                                <button onClick={() => { setReviewIdx(null); setQuizModal({ topicTitle: q.topic }); }}
                                    style={{ background: aGrad, border: 'none', borderRadius: '9px', padding: '8px 18px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'DM Sans',sans-serif" }}>
                                    <Brain size={13} /> Retry Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StudentAnalytics;