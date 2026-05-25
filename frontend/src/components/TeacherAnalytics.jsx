import React, { useState, useEffect, createContext, useContext } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    CartesianGrid, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Area, AreaChart, LineChart, Line
} from 'recharts';
import {
    Loader, Users, AlertTriangle, Brain, Trophy, Clock,
    ChevronRight, ArrowLeft, TrendingUp, Target,
    BookOpen, HelpCircle, Eye, Activity, Zap,
    CheckCircle, XCircle, Grid, BarChart3, Layers, Lock, ClipboardList
} from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const Ctx = createContext({});
const useT = () => useContext(Ctx);

const RISK_COLORS = {
    on_track: { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', border: 'rgba(34,197,94,0.3)', label: 'On Track' },
    at_risk: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)', label: 'At Risk' },
    critical: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Critical' },
    inactive: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)', label: 'Inactive' },
};

const BLOOM_COLORS = {
    remember: '#60a5fa', understand: '#34d399', apply: '#fbbf24',
    analyze: '#f97316', evaluate: '#f43f5e', create: '#a78bfa',
};

const BLOOM_ORDER = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const ATTENTION_STYLES = {
    critical: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', icon: XCircle },
    needs_review: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24', icon: AlertTriangle },
    ok: { bg: 'rgba(34,197,94,0.1)', text: '#4ade80', icon: CheckCircle },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER QUIZ RESULTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const TeacherQuizView = ({ data }) => {
    const { theme, accent } = useT();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const { topics = [] } = data;

    if (topics.length === 0) return (
        <EmptyState message="No teacher quiz attempts yet. Publish a quiz and have students take it." />
    );

    return (
        <div className="space-y-4">
            {topics.map(t => {
                const passRate = t.attemptedCount > 0 ? Math.round((t.passCount / t.attemptedCount) * 100) : 0;
                const scoreColor = (t.avgScore || 0) >= 80 ? '#22c55e' : (t.avgScore || 0) >= 60 ? '#fbbf24' : '#ef4444';
                return (
                    <div key={t.topicId} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: theme.bg, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>{t.moduleTitle}</div>
                            </div>
                            {[
                                { label: 'Attempted', val: t.attemptedCount, color: accent.from },
                                { label: 'Passed', val: t.passCount, color: '#22c55e' },
                                { label: 'Failed', val: t.failCount, color: '#ef4444' },
                                { label: 'Pass Rate', val: `${passRate}%`, color: passRate >= 80 ? '#22c55e' : passRate >= 60 ? '#fbbf24' : '#ef4444' },
                                { label: 'Avg Score', val: t.avgScore !== null ? `${t.avgScore}%` : '—', color: scoreColor },
                            ].map(chip => (
                                <div key={chip.label} style={{ textAlign: 'center', minWidth: '56px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: chip.color }}>{chip.val}</div>
                                    <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{chip.label}</div>
                                </div>
                            ))}
                        </div>
                        {t.students.length === 0 ? (
                            <div style={{ padding: '14px 18px', fontSize: '13px', color: theme.textMuted, textAlign: 'center' }}>No attempts yet.</div>
                        ) : t.students.map((s, i) => (
                            <div key={String(s.studentId)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderBottom: i < t.students.length - 1 ? `1px solid ${theme.border}40` : 'none' }}>
                                <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: theme.textPrimary }}>{s.name}</div>
                                <span style={{ fontSize: '11px', color: theme.textMuted }}>{s.attempts} attempt{s.attempts !== 1 ? 's' : ''}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: s.bestScore >= 80 ? '#22c55e' : '#ef4444', minWidth: '44px', textAlign: 'right' }}>{s.bestScore}%</span>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    {[
                                        { key: 'beginner',     label: 'B', color: '#34d399' },
                                        { key: 'intermediate', label: 'I', color: '#fbbf24' },
                                        { key: 'advanced',     label: 'A', color: '#f43f5e' },
                                    ].map(tier => {
                                        const td = s.tiers?.[tier.key];
                                        const isPassed = td?.passed;
                                        const isAttempted = td && !isPassed;
                                        return (
                                            <div key={tier.key}
                                                title={`${tier.key}: ${td ? td.bestScore + '% (' + td.attempts + ' attempt' + (td.attempts !== 1 ? 's' : '') + ')' : 'not attempted'}`}
                                                style={{
                                                    width: 22, height: 22, borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background:   isPassed    ? tier.color
                                                                : isAttempted ? 'transparent'
                                                                : 'rgba(255,255,255,0.06)',
                                                    border: `2px solid ${td ? tier.color : 'rgba(255,255,255,0.12)'}`,
                                                    color: isPassed ? '#000' : td ? tier.color : 'rgba(255,255,255,0.25)',
                                                }}>
                                                {tier.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT RESULTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const AssignmentResultsView = ({ data }) => {
    const { theme, accent } = useT();
    const { assignments = [] } = data;

    if (assignments.length === 0) return (
        <EmptyState message="No published assignments yet. Create and publish assignments in the curriculum builder." />
    );

    return (
        <div className="space-y-4">
            {assignments.map(a => {
                const pct = a.maxPoints > 0 && a.avgGrade !== null ? Math.round((a.avgGrade / a.maxPoints) * 100) : null;
                const scoreColor = pct === null ? theme.textMuted : pct >= 80 ? '#22c55e' : pct >= 60 ? '#fbbf24' : '#ef4444';
                return (
                    <div key={String(a.assignmentId)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: theme.bg, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                                {a.dueDate && <div style={{ fontSize: '11px', color: theme.textMuted }}>Due {new Date(a.dueDate).toLocaleDateString()}</div>}
                            </div>
                            {[
                                { label: 'Submissions', val: a.totalSubmissions, color: accent.from },
                                { label: 'Graded', val: a.gradedCount, color: '#22c55e' },
                                { label: 'Max Pts', val: a.maxPoints, color: theme.textMuted },
                                { label: 'Avg Grade', val: a.avgGrade !== null ? `${a.avgGrade}/${a.maxPoints}` : '—', color: scoreColor },
                            ].map(chip => (
                                <div key={chip.label} style={{ textAlign: 'center', minWidth: '56px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: chip.color }}>{chip.val}</div>
                                    <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{chip.label}</div>
                                </div>
                            ))}
                        </div>
                        {a.students.length === 0 ? (
                            <div style={{ padding: '14px 18px', fontSize: '13px', color: theme.textMuted, textAlign: 'center' }}>No submissions yet.</div>
                        ) : a.students.map((s, i) => {
                            const gradePct = s.grade !== null && a.maxPoints > 0 ? Math.round((s.grade / a.maxPoints) * 100) : null;
                            const gc = gradePct === null ? theme.textMuted : gradePct >= 80 ? '#22c55e' : gradePct >= 60 ? '#fbbf24' : '#ef4444';
                            return (
                                <div key={String(s.studentId || i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderBottom: i < a.students.length - 1 ? `1px solid ${theme.border}40` : 'none' }}>
                                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: theme.textPrimary }}>{s.name}</div>
                                    <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: s.status === 'returned' ? 'rgba(34,197,94,0.12)' : s.status === 'submitted' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.06)', color: s.status === 'returned' ? '#22c55e' : s.status === 'submitted' ? '#fbbf24' : theme.textMuted, border: `1px solid ${s.status === 'returned' ? 'rgba(34,197,94,0.3)' : s.status === 'submitted' ? 'rgba(251,191,36,0.3)' : theme.border}` }}>
                                        {s.status === 'returned' ? 'Returned' : s.status === 'submitted' ? 'Submitted' : 'Not submitted'}
                                    </span>
                                    {s.grade !== null ? (
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: gc, minWidth: '60px', textAlign: 'right' }}>
                                            {s.grade}/{a.maxPoints}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: theme.textMuted, minWidth: '60px', textAlign: 'right' }}>Not graded</span>
                                    )}
                                    {gradePct !== null && (
                                        <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                                            <div style={{ height: '100%', width: `${gradePct}%`, background: gc, borderRadius: '99px' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TeacherAnalytics = ({ courses = [] }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const tooltipStyle = {
        contentStyle: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: '12px', color: theme.textPrimary, fontSize: '13px' },
        cursor: { fill: `${accent.from}14` },
    };

    const safeCourses = Array.isArray(courses) ? courses : [];
    const [selectedCourse, setSelectedCourse] = useState(safeCourses[0]?._id || '');
    const [activeView, setActiveView] = useState('overview');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [viewHistory, setViewHistory] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const ctxValue = { theme, accent, aGrad, tooltipStyle, courseId: selectedCourse };

    useEffect(() => {
        if (!selectedCourse && safeCourses.length > 0) setSelectedCourse(safeCourses[0]._id);
    }, [safeCourses.length]);

    const views = [
        { id: 'overview',          label: 'Overview',         icon: Activity       },
        { id: 'topics',            label: 'Topics',           icon: BookOpen       },
        { id: 'students',          label: 'Students',         icon: Users          },
        { id: 'quiz-intelligence', label: 'Quiz / Test Analysis', icon: BarChart3  },
        { id: 'teacher-quiz',      label: 'Test Results',     icon: CheckCircle    },
        { id: 'assignments',       label: 'Assignment Grades',icon: ClipboardList  },
        { id: 'leaderboard',       label: 'Leaderboard',      icon: Trophy         },
    ];

    useEffect(() => {
        if (!selectedCourse) return;
        if (activeView === 'student-detail' && selectedStudentId) {
            fetchData(`/analytics/${selectedCourse}/student/${selectedStudentId}`);
        } else if (activeView !== 'student-detail') {
            const endpoints = {
                overview:            `/analytics/${selectedCourse}/overview`,
                topics:              `/analytics/${selectedCourse}/topics`,
                students:            `/analytics/${selectedCourse}/topic-matrix`,
                'quiz-intelligence': `/analytics/${selectedCourse}/quiz-analysis`,
                'teacher-quiz':      `/analytics/${selectedCourse}/teacher-quiz-results`,
                assignments:         `/analytics/${selectedCourse}/assignment-results`,
                leaderboard:         `/analytics/${selectedCourse}/leaderboard`,
            };
            if (endpoints[activeView]) fetchData(endpoints[activeView]);
        }
    }, [selectedCourse, activeView, selectedStudentId]);

    const fetchData = async (endpoint) => {
        setLoading(true); setError(null);
        try {
            const res = await api.get(endpoint);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (newView, studentId = null) => {
        setViewHistory(h => [...h, { view: activeView, studentId: selectedStudentId }]);
        if (studentId !== null) setSelectedStudentId(studentId);
        setActiveView(newView);
    };
    const goBack = () => {
        if (viewHistory.length === 0) return;
        const prev = viewHistory[viewHistory.length - 1];
        setViewHistory(h => h.slice(0, -1));
        setSelectedStudentId(prev.studentId);
        setActiveView(prev.view);
    };
    const openStudentDetail = (studentId) => navigateTo('student-detail', studentId);
    const backFromStudent = goBack;

    if (safeCourses.length === 0) {
        return <Ctx.Provider value={ctxValue}><EmptyState message="Create a course and enroll students to see analytics." /></Ctx.Provider>;
    }

    return (
        <Ctx.Provider value={ctxValue}>
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedCourse}
                            onChange={e => { setSelectedCourse(e.target.value); setActiveView('overview'); setSelectedStudentId(null); setViewHistory([]); }}
                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, minWidth: '200px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                        >
                            {safeCourses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                        </select>
                    </div>

                    {activeView !== 'student-detail' && (
                        <div style={{ display: 'flex', gap: '4px', background: `${theme.surface}80`, border: `1px solid ${theme.border}80`, borderRadius: '12px', padding: '4px', overflowX: 'auto' }}>
                            {views.map(v => {
                                const isActive = activeView === v.id;
                                return (
                                    <button key={v.id} onClick={() => navigateTo(v.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: isActive ? aGrad : 'transparent', color: isActive ? '#fff' : theme.textMuted, boxShadow: isActive ? `0 4px 14px ${accent.glow}` : 'none' }}
                                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
                                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'transparent'; } }}
                                    >
                                        <v.icon size={14} />{v.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader size={32} style={{ color: accent.from }} className="animate-spin" />
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={() => fetchData(`/analytics/${selectedCourse}/${activeView}`)} />
                ) : data ? (
                    <>
                        {activeView === 'overview'          && <OverviewView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'topics'            && <TopicsView data={data} />}
                        {activeView === 'students'          && <StudentsView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'quiz-intelligence' && <QuizIntelligenceView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'teacher-quiz'      && <TeacherQuizView data={data} />}
                        {activeView === 'assignments'       && <AssignmentResultsView data={data} />}
                        {activeView === 'leaderboard'       && <LeaderboardView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'student-detail'    && <StudentDetailView data={data} onBack={backFromStudent} />}
                    </>
                ) : null}
            </div>
        </Ctx.Provider>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1: CLASS OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewView = ({ data, onStudentClick }) => {
    const { theme, accent, tooltipStyle, courseId } = useT();
    const { summary, riskDistribution, engagementTrend, students } = data;
    const [progressTab, setProgressTab] = useState('class');
    const [perfTab, setPerfTab] = useState('class');
    const [topicsPerf, setTopicsPerf] = useState(null);
    const [engagementData, setEngagementData] = useState(null);
    const [atRiskData, setAtRiskData] = useState(null);
    const [tierMatrix, setTierMatrix] = useState(null);

    useEffect(() => {
        if (!courseId) return;
        setTopicsPerf(null);
        api.get(`/analytics/${courseId}/topics`)
            .then(r => setTopicsPerf(r.data.topics || []))
            .catch(() => setTopicsPerf([]));
    }, [courseId]);

    useEffect(() => {
        if (!courseId) return;
        api.get(`/analytics/${courseId}/engagement`)
            .then(r => setEngagementData(r.data))
            .catch(() => {});
        api.get(`/analytics/${courseId}/at-risk`)
            .then(r => setAtRiskData(r.data))
            .catch(() => {});
        api.get(`/analytics/${courseId}/student-tier-matrix`)
            .then(r => setTierMatrix(r.data))
            .catch(() => {});
    }, [courseId]);

    const [studyTimeDates, setStudyTimeDates] = useState(() => {
        const to = new Date().toISOString().slice(0, 10);
        const f = new Date(); f.setDate(f.getDate() - 29);
        return { from: f.toISOString().slice(0, 10), to };
    });
    const [studyTimeView, setStudyTimeView] = useState('class');
    const [studyTimeData, setStudyTimeData] = useState(null);
    const [studyTimeLoading, setStudyTimeLoading] = useState(false);
    const [granularity, setGranularity] = useState('daily');

    useEffect(() => {
        if (!courseId) return;
        setStudyTimeLoading(true);
        setStudyTimeData(null);
        api.get(`/analytics/${courseId}/study-time?from=${studyTimeDates.from}&to=${studyTimeDates.to}`)
            .then(r => setStudyTimeData(r.data))
            .catch(() => {})
            .finally(() => setStudyTimeLoading(false));
    }, [courseId, studyTimeDates]);

    // Highest Bloom tier per student from tier matrix
    const studentBloomLevel = (tierMatrix?.students || []).reduce((acc, s) => {
        const topicVals = Object.values(s.tiers || {});
        const passedAdv = topicVals.some(t => t.advanced  === 'passed');
        const passedInt = topicVals.some(t => t.intermediate === 'passed');
        const passedBeg = topicVals.some(t => t.beginner  === 'passed');
        const atkAdv    = topicVals.some(t => t.advanced  === 'attempted');
        const atkInt    = topicVals.some(t => t.intermediate === 'attempted');
        const atkBeg    = topicVals.some(t => t.beginner  === 'attempted');
        acc[s.studentId] = { passedAdv, passedInt, passedBeg, atkAdv, atkInt, atkBeg };
        return acc;
    }, {});

    // Class health score (0–100): 30% completion + 30% quiz + 40% not-at-risk
    const totalStudents = students?.length || 0;
    const atRiskPct = totalStudents > 0
        ? ((riskDistribution?.critical || 0) + (riskDistribution?.at_risk || 0)) / totalStudents
        : 0;
    const healthScore = Math.round(
        (summary?.avgCompletion || 0) * 0.30 +
        (summary?.avgScore || 0)      * 0.30 +
        (1 - atRiskPct)               * 100 * 0.40
    );
    const healthGrade = healthScore >= 85 ? { grade: 'A', color: '#22c55e' }
                      : healthScore >= 70 ? { grade: 'B', color: '#4ade80' }
                      : healthScore >= 55 ? { grade: 'C', color: '#fbbf24' }
                      : healthScore >= 40 ? { grade: 'D', color: '#fb923c' }
                      :                     { grade: 'F', color: '#ef4444' };

    // Risk sort order for student table
    const riskOrder = { critical: 0, at_risk: 1, inactive: 2, on_track: 3 };
    const sortedStudents = [...(students || [])].sort((a, b) =>
        (riskOrder[a.risk] ?? 3) - (riskOrder[b.risk] ?? 3)
    );

    const riskData = Object.entries(riskDistribution || {})
        .map(([key, val]) => ({ name: RISK_COLORS[key]?.label || key, value: val, color: RISK_COLORS[key]?.text || '#9ca3af' }))
        .filter(d => d.value > 0);

    function aggregateClassData(data, gran) {
        if (gran === 'daily') return data;
        const buckets = {};
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (const pt of data) {
            let key, label;
            if (gran === 'weekly') {
                const d = new Date(pt.date + 'T00:00:00Z');
                const day = d.getUTCDay();
                const diff = day === 0 ? -6 : 1 - day;
                const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + diff);
                const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
                key = mon.toISOString().slice(0, 10);
                label = `${MONTHS[mon.getUTCMonth()]} ${mon.getUTCDate()}–${sun.getUTCDate()}`;
            } else {
                key = pt.date.slice(0, 7);
                const [, m] = key.split('-');
                label = `${MONTHS[+m - 1]} '${key.slice(2, 4)}`;
            }
            if (!buckets[key]) buckets[key] = { date: key, label, hours: 0, activeStudents: 0 };
            buckets[key].hours = +(buckets[key].hours + pt.hours).toFixed(2);
            if (pt.activeStudents > buckets[key].activeStudents)
                buckets[key].activeStudents = pt.activeStudents;
        }
        return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
    }

    function aggregateStudentData(students, gran) {
        if (gran === 'daily') return students;
        return students.map(s => ({
            ...s,
            dailyData: aggregateClassData(
                s.dailyData.map(d => ({ ...d, activeStudents: d.hours > 0 ? 1 : 0 })),
                gran
            ).map(d => ({ date: d.date, hours: d.hours })),
        }));
    }

    return (
        <div className="space-y-6">
            {/* KPI Strip — 6 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <KPICard label="Students" value={data.totalStudents} icon={Users} color="#8b5cf6" />
                <KPICard label="Avg Progress" value={`${summary?.avgCompletion || 0}%`} icon={Target} color="#3b82f6" />
                <KPICard label="Avg Quiz Score" value={`${summary?.avgScore || 0}%`} icon={Brain} color="#10b981" />
                <KPICard label="Avg Study Time" value={summary?.avgTimeSpent || '0h'} icon={Clock} color="#f59e0b" />
                <KPICard label="Active (7d)" value={`${summary?.activeRate || 0}%`} icon={Activity} color="#ef4444" subtitle={`${summary?.activeIn7Days || 0} students`} />
                {/* Class Health Score */}
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={13} style={{ color: healthGrade.color }} /> Class Health
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 900, color: healthGrade.color, lineHeight: 1 }}>{healthScore}</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: healthGrade.color }}>/ {healthGrade.grade}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${healthScore}%`, background: healthGrade.color, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textMuted }}>30% progress · 30% quiz · 40% engagement</div>
                </div>
            </div>

            {/* ── Needs Immediate Attention panel ─────────────────────────── */}
            {(atRiskData?.alerts || []).length > 0 && (
                <div style={{ background: theme.surface, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '14px 22px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle size={16} style={{ color: '#f87171' }} />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#fca5a5' }}>
                                Needs Immediate Attention
                            </span>
                            <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '99px', padding: '2px 10px', fontWeight: 700 }}>
                                {atRiskData.alerts.filter(a => a.severity === 'critical').length} critical · {atRiskData.alerts.filter(a => a.severity === 'at_risk').length} at-risk
                            </span>
                        </div>
                        <span style={{ fontSize: '11px', color: theme.textMuted }}>Click a student to view detail</span>
                    </div>
                    {/* Student alert cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1px', background: theme.border }}>
                        {[...atRiskData.alerts]
                            .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))
                            .map(a => {
                                const sev = a.severity === 'critical' ? RISK_COLORS.critical : RISK_COLORS.at_risk;
                                const bl = studentBloomLevel[a.studentId] || {};
                                const tierDots = [
                                    { passed: bl.passedBeg, atk: bl.atkBeg, color: '#34d399', label: 'B' },
                                    { passed: bl.passedInt, atk: bl.atkInt, color: '#fbbf24', label: 'I' },
                                    { passed: bl.passedAdv, atk: bl.atkAdv, color: '#f43f5e', label: 'A' },
                                ];
                                return (
                                    <div key={a.studentId}
                                        style={{ background: theme.surface, padding: '18px 20px', cursor: 'pointer', borderLeft: `3px solid ${sev.text}`, transition: 'background 0.12s' }}
                                        onClick={() => onStudentClick(a.studentId)}
                                        onMouseEnter={e => e.currentTarget.style.background = theme.bg}
                                        onMouseLeave={e => e.currentTarget.style.background = theme.surface}>
                                        {/* Row 1: name + severity */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>{a.severity === 'critical' ? '🔴 Critical' : '🟡 At Risk'}</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>{a.name}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>{a.email}</div>
                                            </div>
                                            {/* Bloom tier dots */}
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {tierDots.map((td, i) => (
                                                    <div key={i} title={['Beginner','Intermediate','Advanced'][i]}
                                                        style={{ width: 22, height: 22, borderRadius: '50%', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: td.passed ? td.color : td.atk ? 'transparent' : 'rgba(255,255,255,0.06)',
                                                            border: `2px solid ${td.passed || td.atk ? td.color : 'rgba(255,255,255,0.12)'}`,
                                                            color: td.passed ? '#000' : td.color, opacity: td.passed || td.atk ? 1 : 0.35 }}>
                                                        {td.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Row 2: metric bars */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ fontSize: '10px', color: theme.textMuted }}>Quiz Score</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: a.avgQuizScore < 50 ? '#f87171' : '#fbbf24' }}>{a.avgQuizScore}%</span>
                                                </div>
                                                <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                                    <div style={{ height: '100%', borderRadius: '99px', width: `${a.avgQuizScore}%`, background: a.avgQuizScore < 50 ? '#f87171' : '#fbbf24' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ fontSize: '10px', color: theme.textMuted }}>Completion</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: a.completionPct < 30 ? '#f87171' : '#fbbf24' }}>{a.completionPct}%</span>
                                                </div>
                                                <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                                    <div style={{ height: '100%', borderRadius: '99px', width: `${a.completionPct}%`, background: a.completionPct < 30 ? '#f87171' : '#fbbf24' }} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Row 3: reasons + last active */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                {(a.reasons || []).slice(0, 2).map((r, i) => (
                                                    <div key={i} style={{ fontSize: '11px', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ color: '#fbbf24', fontSize: '10px' }}>▲</span> {r}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: a.daysSinceActive > 7 ? '#f87171' : theme.textMuted }}>
                                                    {a.daysSinceActive === 0 ? 'Active today' : `${a.daysSinceActive}d inactive`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Course Progress Card */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Course Progress</h3>
                    <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
                        {[['class', 'Class View'], ['students', 'Student View']].map(([id, label]) => (
                            <button key={id} onClick={() => setProgressTab(id)}
                                style={{ padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: progressTab === id ? `linear-gradient(135deg,${accent.from},${accent.to})` : 'transparent', color: progressTab === id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {progressTab === 'class' ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                            <div style={{ flex: 1, height: '14px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg,${accent.from},${accent.to})`, width: `${summary?.avgCompletion || 0}%`, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, minWidth: '44px' }}>{summary?.avgCompletion || 0}%</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Avg Progress', value: `${summary?.avgCompletion || 0}%`, color: accent.from },
                                { label: 'Avg Quiz Score', value: `${summary?.avgScore || 0}%`, color: (summary?.avgScore || 0) >= 70 ? '#22c55e' : (summary?.avgScore || 0) >= 50 ? '#fbbf24' : '#ef4444' },
                                { label: 'Active (7d)', value: `${summary?.activeRate || 0}%`, color: '#60a5fa' },
                            ].map(chip => (
                                <div key={chip.label} style={{ flex: 1, minWidth: '90px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '12px 14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: chip.color }}>{chip.value}</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px' }}>{chip.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[...(students || [])].sort((a, b) => b.completionPct - a.completionPct).map(s => {
                            const risk = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                            const scoreColor = s.avgQuizScore >= 70 ? '#22c55e' : s.avgQuizScore >= 50 ? '#fbbf24' : '#ef4444';
                            return (
                                <div key={s.studentId}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <button onClick={() => onStudentClick(s.studentId)}
                                            style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                                            onMouseEnter={e => e.currentTarget.style.color = accent.from}
                                            onMouseLeave={e => e.currentTarget.style.color = theme.textPrimary}>
                                            {s.name}
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor }}>Quiz {s.avgQuizScore}%</span>
                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: theme.textPrimary, minWidth: '36px', textAlign: 'right' }}>{s.completionPct}%</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg,${accent.from},${accent.to})`, width: `${s.completionPct}%`, transition: 'width 0.4s' }} />
                                    </div>
                                </div>
                            );
                        })}
                        {(!students || students.length === 0) && <p style={{ color: theme.textMuted, fontSize: '14px', textAlign: 'center' }}>No students enrolled yet.</p>}
                    </div>
                )}
            </div>

            {/* ── Performance Monitor ───────────────────────────────── */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Performance Monitor</h3>
                    <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
                        {[['class', 'Class View'], ['student', 'Student View']].map(([id, label]) => (
                            <button key={id} onClick={() => setPerfTab(id)}
                                style={{ padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: perfTab === id ? `linear-gradient(135deg,${accent.from},${accent.to})` : 'transparent', color: perfTab === id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {perfTab === 'class' ? (
                    topicsPerf === null ? (
                        <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
                    ) : topicsPerf.filter(t => t.avgScore !== null).length === 0 ? (
                        <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No quiz attempts yet — scores will appear once students take quizzes.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                            {[...topicsPerf]
                                .filter(t => t.avgScore !== null)
                                .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100))
                                .map(t => {
                                    const scoreColor = t.avgScore >= 70 ? '#22c55e' : t.avgScore >= 50 ? '#fbbf24' : '#ef4444';
                                    const attentionLabel = t.attention === 'critical' ? '⚠ Critical' : t.attention === 'needs_review' ? '△ Review' : null;
                                    return (
                                        <div key={t.topicId}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{t.title}</span>
                                                    {attentionLabel && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', flexShrink: 0, background: t.attention === 'critical' ? '#ef444420' : '#fbbf2420', color: t.attention === 'critical' ? '#ef4444' : '#fbbf24', border: `1px solid ${t.attention === 'critical' ? '#ef444440' : '#fbbf2440'}` }}>
                                                            {attentionLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '11px', color: theme.textMuted }}>{t.completionRate}% done</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor, minWidth: '36px', textAlign: 'right' }}>{t.avgScore}%</span>
                                                </div>
                                            </div>
                                            <div style={{ height: '7px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: '99px', background: scoreColor, width: `${t.avgScore}%`, transition: 'width 0.4s' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )
                ) : (
                    (!students || students.length === 0) ? (
                        <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No students enrolled yet.</p>
                    ) : (
                        <div style={{ height: `${Math.max(180, students.length * 52)}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={[...students].sort((a, b) => b.avgQuizScore - a.avgQuizScore).map(s => ({
                                        name: s.name.split(' ')[0],
                                        'Quiz Score': s.avgQuizScore,
                                        'Completion': s.completionPct,
                                    }))}
                                    margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} stroke={theme.textMuted} tickFormatter={v => `${v}%`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: theme.textPrimary }} stroke="none" width={72} />
                                    <Tooltip {...tooltipStyle} formatter={v => `${v}%`} />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: theme.textMuted }} />
                                    <Bar dataKey="Quiz Score" fill={accent.from} radius={[0, 4, 4, 0]} barSize={10} />
                                    <Bar dataKey="Completion" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>7-Day Engagement</h3>
                    <div style={{ height: '224px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementTrend || []}>
                                <defs>
                                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={accent.from} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={accent.from} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                <XAxis dataKey="date" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} tickFormatter={d => d?.slice(5)} />
                                <YAxis stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey="activeStudents" stroke={accent.from} strokeWidth={2} fill="url(#engGrad)" name="Active Students" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Risk Distribution</h3>
                    {riskData.length > 0 ? (
                        <>
                            <div style={{ height: '160px', marginBottom: '16px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                                            {riskData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {riskData.map(d => (
                                    <div key={d.name} className="flex items-center justify-between" style={{ fontSize: '13px' }}>
                                        <div className="flex items-center gap-2">
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                                            <span style={{ color: theme.textSecondary }}>{d.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: theme.textPrimary }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : <p style={{ color: theme.textMuted, fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>No data yet</p>}
                </div>
            </div>

            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>All Students</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                        {Object.entries(riskDistribution || {}).filter(([,v]) => v > 0).map(([k, v]) => (
                            <span key={k} style={{ padding: '2px 10px', borderRadius: '99px', background: RISK_COLORS[k]?.bg, color: RISK_COLORS[k]?.text, border: `1px solid ${RISK_COLORS[k]?.border}`, fontWeight: 600 }}>
                                {v} {RISK_COLORS[k]?.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: theme.bg }}>
                                {['Student', 'Bloom Level', 'Progress', 'Quiz Score', 'Time', 'Status', 'Last Active', ''].map((h, i) => (
                                    <th key={i} style={{ padding: i === 0 ? '12px 24px' : '12px 14px', textAlign: i === 0 ? 'left' : i === 7 ? 'right' : 'center', fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStudents.map(s => {
                                const risk = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                                const bl = studentBloomLevel[s.studentId] || {};
                                const tierDots = [
                                    { passed: bl.passedBeg, atk: bl.atkBeg, color: '#34d399', label: 'B', title: 'Beginner' },
                                    { passed: bl.passedInt, atk: bl.atkInt, color: '#fbbf24', label: 'I', title: 'Intermediate' },
                                    { passed: bl.passedAdv, atk: bl.atkAdv, color: '#f43f5e', label: 'A', title: 'Advanced' },
                                ];
                                // Highest level label for quick text summary
                                const levelLabel = bl.passedAdv ? 'Advanced' : bl.passedInt ? 'Intermediate' : bl.passedBeg ? 'Beginner' : bl.atkAdv ? 'Adv (att.)' : bl.atkInt ? 'Int (att.)' : bl.atkBeg ? 'Beg (att.)' : '—';
                                const levelColor = bl.passedAdv ? '#f43f5e' : bl.passedInt ? '#fbbf24' : bl.passedBeg ? '#34d399' : theme.textMuted;
                                return (
                                    <tr key={s.studentId}
                                        style={{ borderTop: `1px solid ${theme.border}50`, borderLeft: s.risk === 'critical' ? '3px solid #f87171' : s.risk === 'at_risk' ? '3px solid #fbbf24' : '3px solid transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px 24px' }}>
                                            <div style={{ fontWeight: 600, color: theme.textPrimary }}>{s.name}</div>
                                            <div style={{ fontSize: '11px', color: theme.textMuted }}>{s.email}</div>
                                        </td>
                                        {/* Bloom Level column */}
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginBottom: '3px' }}>
                                                {tierDots.map((td, i) => (
                                                    <div key={i} title={td.title}
                                                        style={{ width: 20, height: 20, borderRadius: '50%', fontSize: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: td.passed ? td.color : td.atk ? 'transparent' : 'rgba(255,255,255,0.05)',
                                                            border: `2px solid ${td.passed || td.atk ? td.color : 'rgba(255,255,255,0.1)'}`,
                                                            color: td.passed ? '#000' : td.color, opacity: td.passed || td.atk ? 1 : 0.3 }}>
                                                        {td.label}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '9px', color: levelColor, fontWeight: 600 }}>{levelLabel}</div>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                <div style={{ width: '56px', height: '6px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', borderRadius: '99px', background: accent.from, width: `${s.completionPct}%` }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.textSecondary }}>{s.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 700, color: s.avgQuizScore >= 70 ? '#22c55e' : s.avgQuizScore >= 50 ? '#fbbf24' : '#ef4444' }}>{s.avgQuizScore}%</span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: theme.textSecondary, fontSize: '12px' }}>{s.totalTimeFormatted}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '11px', color: s.daysSinceActive > 7 ? '#f87171' : theme.textMuted, fontWeight: s.daysSinceActive > 7 ? 600 : 400 }}>
                                            {s.daysSinceActive === 0 ? 'Today' : `${s.daysSinceActive}d ago`}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                            <button onClick={() => onStudentClick(s.studentId)}
                                                style={{ padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none', color: theme.textMuted, display: 'flex', alignItems: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = `${accent.from}20`; e.currentTarget.style.color = accent.from; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; }}>
                                                <Eye size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Study Time Trend ─────────────────────────────────────────── */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Study Time</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: theme.bg, borderRadius: '8px', padding: '3px', border: `1px solid ${theme.border}` }}>
                            {[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v, lbl]) => (
                                <button key={v} onClick={() => setGranularity(v)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: granularity === v ? '#8b5cf6' : 'transparent', color: granularity === v ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', background: theme.bg, borderRadius: '8px', padding: '3px', border: `1px solid ${theme.border}` }}>
                            {['class', 'student'].map(v => (
                                <button key={v} onClick={() => setStudyTimeView(v)} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: studyTimeView === v ? '#3b82f6' : 'transparent', color: studyTimeView === v ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                                    {v === 'class' ? 'Class' : 'Per Student'}
                                </button>
                            ))}
                        </div>
                        {granularity === 'monthly' ? (<>
                            <input type="month" value={studyTimeDates.from.slice(0, 7)} max={studyTimeDates.to.slice(0, 7)}
                                onChange={e => { const [y, m] = e.target.value.split('-'); setStudyTimeDates(d => ({ ...d, from: `${y}-${m}-01` })); }}
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textSecondary, cursor: 'pointer', outline: 'none' }} />
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>—</span>
                            <input type="month" value={studyTimeDates.to.slice(0, 7)} min={studyTimeDates.from.slice(0, 7)} max={new Date().toISOString().slice(0, 7)}
                                onChange={e => { const [y, m] = e.target.value.split('-'); const last = new Date(+y, +m, 0).getDate(); setStudyTimeDates(d => ({ ...d, to: `${y}-${m}-${String(last).padStart(2,'0')}` })); }}
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textSecondary, cursor: 'pointer', outline: 'none' }} />
                        </>) : (<>
                            <input type="date" value={studyTimeDates.from} max={studyTimeDates.to}
                                onChange={e => setStudyTimeDates(d => ({ ...d, from: e.target.value }))}
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textSecondary, cursor: 'pointer', outline: 'none' }} />
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>—</span>
                            <input type="date" value={studyTimeDates.to} min={studyTimeDates.from} max={new Date().toISOString().slice(0, 10)}
                                onChange={e => setStudyTimeDates(d => ({ ...d, to: e.target.value }))}
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textSecondary, cursor: 'pointer', outline: 'none' }} />
                        </>)}
                    </div>
                </div>
                {studyTimeLoading && (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, fontSize: '13px' }}>Loading…</div>
                )}
                {!studyTimeLoading && studyTimeData && (() => {
                    const classData = aggregateClassData(studyTimeData.classDailyData || [], granularity);
                    const students = aggregateStudentData(studyTimeData.studentDailyData || [], granularity);
                    const wideData = classData.map(d => {
                        const row = { label: d.label, date: d.date };
                        for (const s of students) {
                            const day = s.dailyData.find(x => x.date === d.date);
                            row[s.name] = day?.hours || 0;
                        }
                        return row;
                    });
                    const tickInterval = Math.max(0, Math.floor(classData.length / 8) - 1);
                    return (
                        <div style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {studyTimeView === 'class' ? (
                                    <AreaChart data={classData}>
                                        <defs>
                                            <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                        <XAxis dataKey="label" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} interval={tickInterval} />
                                        <YAxis stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} tickFormatter={v => `${v}h`} />
                                        <Tooltip {...tooltipStyle} formatter={v => [`${v}h`, 'Class Study Time']} />
                                        <Area type="monotone" dataKey="hours" name="Hours" stroke="#3b82f6" fill="url(#stGrad)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={wideData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                        <XAxis dataKey="label" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} interval={tickInterval} />
                                        <YAxis stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} tickFormatter={v => `${v}h`} />
                                        <Tooltip {...tooltipStyle} formatter={v => [`${v}h`]} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                        {students.map(s => (
                                            <Line key={String(s.studentId)} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} />
                                        ))}
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    );
                })()}
                {!studyTimeLoading && !studyTimeData && (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, fontSize: '13px' }}>No data yet.</div>
                )}
            </div>

            {/* ── Resource Completion ───────────────────────────────────────── */}
            {engagementData && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Resource Completion (Lowest First)</h3>
                    <div style={{ maxHeight: '224px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(engagementData.resourceCompletionRates || []).map((r, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span style={{ fontSize: '11px', color: theme.textMuted, width: '128px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title}>{r.title}</span>
                                <div style={{ flex: 1, height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${r.completionRate}%`, background: r.completionRate < 30 ? '#ef4444' : r.completionRate < 60 ? '#f59e0b' : '#10b981' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.textSecondary, width: '40px', textAlign: 'right' }}>{r.completionRate}%</span>
                            </div>
                        ))}
                        {(!engagementData.resourceCompletionRates || engagementData.resourceCompletionRates.length === 0) && <p style={{ color: theme.textMuted, fontSize: '14px' }}>No resource data yet.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2: TOPIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

const TopicsView = ({ data }) => {
    const { theme, tooltipStyle } = useT();
    const { topics, needsAttention } = data;

    return (
        <div className="space-y-6">
            {needsAttention > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle style={{ color: '#f87171', flexShrink: 0 }} size={18} />
                    <span style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 500 }}>{needsAttention} topic{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention based on student performance.</span>
                </div>
            )}
            <div className="space-y-4">
                {(topics || []).map(topic => {
                    const attn = ATTENTION_STYLES[topic.attention] || ATTENTION_STYLES.ok;
                    const AttnIcon = attn.icon;
                    const bloomData = BLOOM_ORDER
                        .filter(bl => topic.bloomPerformance?.[bl])
                        .map(bl => ({ name: bl, pct: topic.bloomPerformance[bl].percentage }));

                    return (
                        <div key={topic.topicId} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AttnIcon size={16} style={{ color: attn.text }} />
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>{topic.title}</h3>
                                    </div>
                                    <p style={{ fontSize: '11px', color: theme.textMuted }}>{topic.moduleTitle} • {topic.totalAttempts} quiz attempts</p>
                                </div>
                                <div className="flex gap-3 text-right">
                                    <div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Avg Score</div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: (topic.avgScore || 0) >= 70 ? '#22c55e' : (topic.avgScore || 0) >= 50 ? '#fbbf24' : '#ef4444' }}>{topic.avgScore ?? '—'}%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Fail Rate</div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: theme.textSecondary }}>{topic.failRate}%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Completion</div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: theme.textSecondary }}>{topic.completionRate}%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {bloomData.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Bloom's Performance</h4>
                                        <div className="space-y-2">
                                            {bloomData.map(b => (
                                                <div key={b.name} className="flex items-center gap-3">
                                                    <span style={{ fontSize: '11px', color: theme.textMuted, width: '80px', textTransform: 'capitalize' }}>{b.name}</span>
                                                    <div style={{ flex: 1, height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', borderRadius: '99px', width: `${b.pct}%`, background: BLOOM_COLORS[b.name] }} />
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.textSecondary, width: '40px', textAlign: 'right' }}>{b.pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(topic.topWrongQuestions || []).length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Most Missed Questions</h4>
                                        <div className="space-y-2">
                                            {topic.topWrongQuestions.map((q, i) => (
                                                <div key={i} className="flex items-start gap-2" style={{ fontSize: '13px' }}>
                                                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '11px', marginTop: '2px' }}>{q.missedBy}×</span>
                                                    <span style={{ color: theme.textSecondary }}>{q.questionText}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {(!topics || topics.length === 0) && <EmptyState message="No quiz data available yet." />}
            </div>

            {(() => {
                const classBloom = {};
                for (const t of (topics || [])) {
                    for (const [bl, bData] of Object.entries(t.bloomPerformance || {})) {
                        if (!classBloom[bl]) classBloom[bl] = { correct: 0, total: 0 };
                        classBloom[bl].correct += bData.correct || 0;
                        classBloom[bl].total   += bData.total  || 0;
                    }
                }
                const classBloomData = BLOOM_ORDER
                    .filter(bl => classBloom[bl]?.total > 0)
                    .map(bl => ({ name: bl, score: Math.round((classBloom[bl].correct / classBloom[bl].total) * 100) }));
                if (classBloomData.length === 0) return null;
                return (
                    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Class-wide Bloom's Performance</h3>
                        <div style={{ height: '256px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classBloomData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                    <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 12, fill: theme.textMuted }} />
                                    <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                    <Tooltip {...tooltipStyle} formatter={val => `${val}%`} />
                                    <Bar dataKey="score" name="Score %" radius={[6, 6, 0, 0]} barSize={40}>
                                        {classBloomData.map((d, i) => <Cell key={i} fill={BLOOM_COLORS[d.name] || '#8b5cf6'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 3: QUIZ FORENSICS (enhanced with topic filter)
// ═══════════════════════════════════════════════════════════════════════════════

const QuizForensicsView = ({ data }) => {
    const { theme, accent, tooltipStyle, courseId } = useT();
    const { bloomPerformance, mostMissedQuestions } = data;
    const [selectedTopicFilter, setSelectedTopicFilter] = useState('all');
    const [topicsData, setTopicsData] = useState(null);

    const storageKey = `dismissed_missed_${courseId}`;
    const [dismissed, setDismissed] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem(storageKey)) || []); }
        catch { return new Set(); }
    });

    const dismissQuestion = (q) => {
        const key = q.questionId || q.questionText;
        setDismissed(prev => {
            const next = new Set(prev);
            next.add(key);
            localStorage.setItem(storageKey, JSON.stringify([...next]));
            return next;
        });
    };

    const restoreAll = () => {
        setDismissed(new Set());
        localStorage.removeItem(storageKey);
    };

    useEffect(() => {
        if (!courseId) return;
        api.get(`/analytics/${courseId}/topics`)
            .then(r => setTopicsData(r.data))
            .catch(() => {});
    }, [courseId]);

    const selectedTopicObj = selectedTopicFilter !== 'all' && topicsData
        ? (topicsData.topics || []).find(t => t.topicId === selectedTopicFilter)
        : null;

    const activeBloom = selectedTopicObj?.bloomPerformance
        ? BLOOM_ORDER.filter(bl => selectedTopicObj.bloomPerformance[bl])
            .map(bl => ({ name: bl, score: selectedTopicObj.bloomPerformance[bl].percentage, total: selectedTopicObj.bloomPerformance[bl].total }))
        : BLOOM_ORDER.filter(bl => bloomPerformance?.[bl])
            .map(bl => ({ name: bl, score: bloomPerformance[bl].percentage, total: bloomPerformance[bl].total }));

    const filteredQuestions = (selectedTopicFilter === 'all'
        ? (mostMissedQuestions || [])
        : (mostMissedQuestions || []).filter(q => q.topic === selectedTopicObj?.title)
    ).filter(q => !dismissed.has(q.questionId || q.questionText));

    return (
        <div className="space-y-6">
            {/* Topic filter pills */}
            {topicsData?.topics?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[{ topicId: 'all', title: 'All Topics' }, ...(topicsData.topics || [])].map(t => {
                        const isActive = selectedTopicFilter === t.topicId;
                        return (
                            <button key={t.topicId} onClick={() => setSelectedTopicFilter(t.topicId)}
                                style={{ padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, border: `1px solid ${isActive ? accent.from : theme.border}`, background: isActive ? `${accent.from}18` : 'transparent', color: isActive ? accent.from : theme.textMuted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = accent.from; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = theme.border; }}>
                                {t.title}
                            </button>
                        );
                    })}
                </div>
            )}

            {activeBloom.length > 0 && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
                        {selectedTopicObj ? `Bloom's — ${selectedTopicObj.title}` : "Class Performance by Bloom's Level"}
                    </h3>
                    <div style={{ height: '256px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activeBloom}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 12, fill: theme.textMuted }} />
                                <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                <Tooltip {...tooltipStyle} formatter={val => `${val}%`} />
                                <Bar dataKey="score" name="Score %" radius={[6, 6, 0, 0]} barSize={40}>
                                    {activeBloom.map((d, i) => <Cell key={i} fill={BLOOM_COLORS[d.name] || '#8b5cf6'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                        Most Missed Questions {selectedTopicObj ? `— ${selectedTopicObj.title}` : '(All Topics)'}
                    </h3>
                    {dismissed.size > 0 && (
                        <button onClick={restoreAll}
                            style={{ fontSize: '11px', color: accent.from, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
                            Restore {dismissed.size} dismissed
                        </button>
                    )}
                </div>
                <div>
                    {filteredQuestions.map((q, i) => (
                        <div key={i} style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}50` }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div className="flex items-start justify-between gap-4">
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: theme.textPrimary, fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>{q.questionText}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {q.topic && <span style={{ fontSize: '11px', padding: '2px 8px', background: theme.bg, borderRadius: '4px', color: theme.textSecondary }}>{q.topic}</span>}
                                        {q.bloomLevel && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', background: `${BLOOM_COLORS[q.bloomLevel]}20`, color: BLOOM_COLORS[q.bloomLevel] }}>{q.bloomLevel}</span>}
                                        {q.difficulty && <span style={{ fontSize: '11px', padding: '2px 8px', background: theme.bg, borderRadius: '4px', color: theme.textMuted, textTransform: 'capitalize' }}>{q.difficulty}</span>}
                                    </div>
                                    {(q.commonWrongAnswers || []).length > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: theme.textMuted }}>
                                            Common wrong picks: {q.commonWrongAnswers.map(a => `"${a.answer}" (${a.count}×)`).join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                                    <button onClick={() => dismissQuestion(q)} title="Dismiss from list"
                                        style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.textMuted, cursor: 'pointer', fontSize: '12px', padding: '2px 8px', fontFamily: 'inherit', lineHeight: 1.5 }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}>
                                        × Clear
                                    </button>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{q.missedCount}</div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted }}>students missed</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredQuestions.length === 0 && (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                            {selectedTopicObj ? `No missed questions recorded for "${selectedTopicObj.title}" yet.` : 'No quiz data available yet.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 4 (NEW): PERFORMANCE CHARTS — student-wise & class-wise bar charts
// ═══════════════════════════════════════════════════════════════════════════════

const PerformanceChartsView = ({ data }) => {
    const { theme, accent, aGrad, tooltipStyle, courseId } = useT();
    const [chartMode, setChartMode] = useState('students');
    const [topicsData, setTopicsData] = useState(null);
    const [topicsLoading, setTopicsLoading] = useState(false);

    useEffect(() => {
        if (chartMode === 'class' && !topicsData && courseId) {
            setTopicsLoading(true);
            api.get(`/analytics/${courseId}/topics`)
                .then(r => setTopicsData(r.data))
                .catch(() => {})
                .finally(() => setTopicsLoading(false));
        }
    }, [chartMode, courseId]);

    const scoreColor = score => score >= 70 ? '#22c55e' : score >= 50 ? '#fbbf24' : '#ef4444';

    const studentChartData = [...(data?.students || [])]
        .sort((a, b) => b.avgQuizScore - a.avgQuizScore)
        .map(s => ({ name: s.name.split(' ')[0], fullName: s.name, score: s.avgQuizScore, completion: s.completionPct, risk: s.risk }));

    const topicChartData = (topicsData?.topics || []).map(t => ({
        name: t.title.length > 14 ? t.title.slice(0, 14) + '…' : t.title,
        fullName: t.title,
        avgScore: t.avgScore || 0,
        completionRate: t.completionRate || 0,
        failRate: t.failRate || 0,
    }));

    const ModeToggle = () => (
        <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {[{ id: 'students', label: 'By Student' }, { id: 'class', label: 'By Topic' }].map(m => (
                <button key={m.id} onClick={() => setChartMode(m.id)}
                    style={{ padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: chartMode === m.id ? aGrad : 'transparent', color: chartMode === m.id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                    {m.label}
                </button>
            ))}
        </div>
    );

    if (chartMode === 'students') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>Student Performance Comparison</h3>
                    <ModeToggle />
                </div>

                {studentChartData.length === 0 ? <EmptyState message="No student data available yet." /> : (
                    <>
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Quiz Score by Student (sorted by score)</h4>
                            <div style={{ height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentChartData} margin={{ bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                        <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} angle={-30} textAnchor="end" />
                                        <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                        <Tooltip {...tooltipStyle} formatter={(val, name, props) => [`${val}%`, props.payload.fullName]} />
                                        <Bar dataKey="score" name="Quiz Score" radius={[6, 6, 0, 0]} barSize={28}>
                                            {studentChartData.map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Completion % by Student</h4>
                            <div style={{ height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentChartData} margin={{ bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                        <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} angle={-30} textAnchor="end" />
                                        <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                        <Tooltip {...tooltipStyle} formatter={(val, name, props) => [`${val}%`, props.payload.fullName]} />
                                        <Bar dataKey="completion" name="Completion" radius={[6, 6, 0, 0]} barSize={28}>
                                            {studentChartData.map((d, i) => <Cell key={i} fill={accent.from} fillOpacity={0.6 + (d.completion / 200)} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>Topic Performance (Class-wide)</h3>
                <ModeToggle />
            </div>

            {topicsLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader size={28} style={{ color: accent.from }} className="animate-spin" />
                </div>
            ) : topicChartData.length === 0 ? <EmptyState message="No topic data yet." /> : (
                <>
                    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Avg Score & Completion Rate per Topic</h4>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topicChartData} margin={{ bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                    <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} angle={-30} textAnchor="end" />
                                    <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                    <Tooltip {...tooltipStyle} formatter={(val, name, props) => [`${val}%`, name === 'avgScore' ? 'Avg Score' : 'Completion']} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                                    <Bar dataKey="avgScore" name="avgScore" fill={accent.from} radius={[4, 4, 0, 0]} barSize={18} />
                                    <Bar dataKey="completionRate" name="completionRate" fill={`${accent.from}60`} radius={[4, 4, 0, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Fail Rate per Topic (higher = needs attention)</h4>
                        <div style={{ height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topicChartData} margin={{ bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                    <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} angle={-30} textAnchor="end" />
                                    <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                    <Tooltip {...tooltipStyle} formatter={val => [`${val}%`, 'Fail Rate']} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                                    <Bar dataKey="failRate" name="Fail Rate" radius={[4, 4, 0, 0]} barSize={22}>
                                        {topicChartData.map((d, i) => <Cell key={i} fill={d.failRate >= 50 ? '#ef4444' : d.failRate >= 30 ? '#fbbf24' : '#22c55e'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 5 (NEW): TOPIC PROGRESS — student × topic heatmap
// ═══════════════════════════════════════════════════════════════════════════════

const TopicProgressView = ({ data, onStudentClick }) => {
    const { theme, accent, tooltipStyle } = useT();
    const [viewMode, setViewMode] = useState('heatmap');
    const [perfMode, setPerfMode] = useState('class');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const { topics = [], students = [], matrix = {} } = data || {};
    const selStudentId = selectedStudentId || students[0]?.studentId || null;

    const topicsWithStats = topics.map(t => {
        const cells = students.map(s => matrix[t.topicId]?.[s.studentId] || { status: 'not_started', score: null, attempts: 0 });
        const completed = cells.filter(c => c.status === 'completed').length;
        const scores = cells.filter(c => c.score !== null).map(c => c.score);
        return {
            ...t,
            completionRate: students.length > 0 ? Math.round(completed / students.length * 100) : 0,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        };
    });

    const cellColor = status => status === 'completed' ? '#22c55e' : status === 'in_progress' ? '#fbbf24' : null;

    const ModeToggle = () => (
        <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {[{ id: 'heatmap', label: 'Heatmap' }, { id: 'bars', label: 'Completion Bars' }, { id: 'performance', label: 'Performance' }].map(m => (
                <button key={m.id} onClick={() => setViewMode(m.id)}
                    style={{ padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: viewMode === m.id ? `linear-gradient(135deg,${accent.from},${accent.to})` : 'transparent', color: viewMode === m.id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                    {m.label}
                </button>
            ))}
        </div>
    );

    if (topics.length === 0) return <EmptyState message="No topic data available yet." />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Topic Progress</h3>
                    <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>{topics.length} topics · {students.length} students</p>
                </div>
                <ModeToggle />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[{ color: '#22c55e', label: 'Completed' }, { color: '#fbbf24', label: 'In Progress' }, { color: theme.border, label: 'Not Started' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textMuted }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: l.color === theme.border ? `1px solid ${theme.border}` : 'none' }} />
                        {l.label}
                    </div>
                ))}
            </div>

            {viewMode === 'heatmap' && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%' }}>
                        <thead>
                            <tr style={{ background: theme.bg }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '180px', position: 'sticky', left: 0, background: theme.bg, zIndex: 2 }}>Topic</th>
                                {students.map(s => (
                                    <th key={s.studentId} style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 600, color: theme.textMuted, textAlign: 'center', minWidth: '40px', maxWidth: '60px' }}>
                                        <span title={s.name} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '52px' }}>{s.name.split(' ')[0]}</span>
                                    </th>
                                ))}
                                <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textAlign: 'center' }}>Class %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Group by module */}
                            {(() => {
                                const rows = [];
                                let lastModule = null;
                                for (const t of topicsWithStats) {
                                    if (t.moduleTitle !== lastModule) {
                                        lastModule = t.moduleTitle;
                                        rows.push(
                                            <tr key={`mod-${t.moduleTitle}`}>
                                                <td colSpan={students.length + 2} style={{ padding: '8px 16px', background: `${accent.from}08`, fontSize: '11px', fontWeight: 700, color: accent.from, textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: `1px solid ${theme.border}` }}>
                                                    {t.moduleTitle}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    rows.push(
                                        <tr key={t.topicId} style={{ borderTop: `1px solid ${theme.border}30` }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '10px 16px', color: theme.textSecondary, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: theme.surface, zIndex: 1 }}>{t.title}</td>
                                            {students.map(s => {
                                                const cell = matrix[t.topicId]?.[s.studentId] || { status: 'not_started', score: null, attempts: 0 };
                                                const bg = cellColor(cell.status);
                                                return (
                                                    <td key={s.studentId} style={{ padding: '6px', textAlign: 'center' }}>
                                                        <div
                                                            title={`${s.name}: ${cell.status.replace('_', ' ')}${cell.score !== null ? ` (score: ${cell.score}%)` : ''}${cell.attempts ? ` · ${cell.attempts} attempts` : ''}`}
                                                            onClick={() => onStudentClick(s.studentId)}
                                                            style={{ width: '22px', height: '22px', borderRadius: '5px', margin: '0 auto', cursor: 'pointer', background: bg || theme.bg, border: `1px solid ${bg || theme.border}`, opacity: bg ? 1 : 0.4, transition: 'transform 0.1s' }}
                                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: t.completionRate >= 70 ? '#22c55e' : t.completionRate >= 40 ? '#fbbf24' : '#ef4444' }}>
                                                    {t.completionRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }
                                return rows;
                            })()}
                        </tbody>
                    </table>
                </div>
            )}
            {viewMode === 'bars' && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Completion Rate per Topic</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {topicsWithStats.map(t => (
                            <div key={t.topicId}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <div>
                                        <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.title}</span>
                                        <span style={{ fontSize: '11px', color: theme.textMuted, marginLeft: '8px' }}>{t.moduleTitle}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                                        {t.avgScore !== null && <span style={{ color: t.avgScore >= 70 ? '#22c55e' : t.avgScore >= 50 ? '#fbbf24' : '#ef4444', fontWeight: 600 }}>avg {t.avgScore}%</span>}
                                        <span style={{ fontWeight: 700, color: t.completionRate >= 70 ? '#22c55e' : t.completionRate >= 40 ? '#fbbf24' : '#ef4444' }}>{t.completionRate}%</span>
                                    </div>
                                </div>
                                <div style={{ height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${t.completionRate}%`, background: t.completionRate >= 70 ? '#22c55e' : t.completionRate >= 40 ? '#fbbf24' : '#ef4444', transition: 'width 0.4s' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {viewMode === 'performance' && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Topic Performance</h4>
                        <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '3px', gap: '3px' }}>
                            {[['class', 'Class Avg'], ['student', 'By Student']].map(([id, label]) => (
                                <button key={id} onClick={() => setPerfMode(id)}
                                    style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: perfMode === id ? `linear-gradient(135deg,${accent.from},${accent.to})` : 'transparent', color: perfMode === id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {perfMode === 'class' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {topicsWithStats.map(t => (
                                <div key={t.topicId}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <div>
                                            <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.title}</span>
                                            <span style={{ fontSize: '11px', color: theme.textMuted, marginLeft: '8px' }}>{t.moduleTitle}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'center' }}>
                                            <span style={{ color: theme.textMuted }}>Completion: {t.completionRate}%</span>
                                            {t.avgScore !== null
                                                ? <span style={{ fontWeight: 700, color: t.avgScore >= 70 ? '#22c55e' : t.avgScore >= 50 ? '#fbbf24' : '#ef4444' }}>{t.avgScore}%</span>
                                                : <span style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: '11px' }}>No attempts</span>}
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: '99px', width: `${t.avgScore !== null ? t.avgScore : 0}%`, background: t.avgScore === null ? theme.border : t.avgScore >= 70 ? '#22c55e' : t.avgScore >= 50 ? '#fbbf24' : '#ef4444', transition: 'width 0.4s', opacity: t.avgScore === null ? 0.25 : 1 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <select value={selStudentId || ''} onChange={e => setSelectedStudentId(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textPrimary, fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                                    {students.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {topics.map(t => {
                                    const cell = matrix[t.topicId]?.[selStudentId] || { status: 'not_started', score: null, attempts: 0 };
                                    const scoreColor = cell.score === null ? theme.border : cell.score >= 70 ? '#22c55e' : cell.score >= 50 ? '#fbbf24' : '#ef4444';
                                    return (
                                        <div key={t.topicId}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                <div>
                                                    <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.title}</span>
                                                    <span style={{ fontSize: '11px', color: theme.textMuted, marginLeft: '8px' }}>{t.moduleTitle}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                                                    {cell.attempts > 0 && <span style={{ color: theme.textMuted }}>{cell.attempts} attempt{cell.attempts !== 1 ? 's' : ''}</span>}
                                                    {cell.score !== null
                                                        ? <span style={{ fontWeight: 700, color: scoreColor }}>{cell.score}%</span>
                                                        : <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, background: cell.status === 'in_progress' ? 'rgba(251,191,36,0.12)' : `${theme.border}30`, color: cell.status === 'in_progress' ? '#fbbf24' : theme.textMuted, border: `1px solid ${cell.status === 'in_progress' ? 'rgba(251,191,36,0.3)' : theme.border}` }}>
                                                            {cell.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                                        </span>}
                                                </div>
                                            </div>
                                            <div style={{ height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: '99px', width: `${cell.score !== null ? cell.score : cell.status === 'in_progress' ? 15 : 0}%`, background: cell.score === null ? (cell.status === 'in_progress' ? '#fbbf24' : theme.border) : scoreColor, transition: 'width 0.4s', opacity: cell.score === null ? 0.3 : 1 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {students.length === 0 && <p style={{ color: theme.textMuted, fontSize: '14px', textAlign: 'center' }}>No students enrolled yet.</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENTS VIEW — merges Topic Progress, Student Tiers, At-Risk into sub-views
// ═══════════════════════════════════════════════════════════════════════════════

const StudentsView = ({ data, onStudentClick }) => {
    const { theme, accent, courseId } = useT();
    const [subView, setSubView]       = useState('grid');
    const [tierData, setTierData]     = useState(null);
    const [atRiskData, setAtRiskData] = useState(null);
    const [subLoading, setSubLoading] = useState(false);

    useEffect(() => {
        if (subView === 'grid') return;
        if (subView === 'tiers'   && tierData)   return;
        if (subView === 'at-risk' && atRiskData) return;
        const url = subView === 'tiers'
            ? `/analytics/${courseId}/student-tier-matrix`
            : `/analytics/${courseId}/at-risk`;
        setSubLoading(true);
        api.get(url)
           .then(r => { subView === 'tiers' ? setTierData(r.data) : setAtRiskData(r.data); })
           .catch(() => {})
           .finally(() => setSubLoading(false));
    }, [subView, courseId]);

    const subViews = [
        { id: 'grid',    label: 'Grid',    icon: Grid },
        { id: 'tiers',   label: 'Student Tier Level',   icon: Layers },
        { id: 'at-risk', label: 'At-Risk', icon: AlertTriangle },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p style={{ fontSize: '12px', color: theme.textMuted }}>
                    {data?.topics?.length || 0} topics · {data?.students?.length || 0} students
                </p>
                <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
                    {subViews.map(m => (
                        <button key={m.id} onClick={() => setSubView(m.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: subView === m.id ? `linear-gradient(135deg,${accent.from},${accent.to})` : 'transparent', color: subView === m.id ? '#fff' : theme.textMuted, transition: 'all 0.15s' }}>
                            <m.icon size={13} />{m.label}
                        </button>
                    ))}
                </div>
            </div>
            {subLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader size={28} style={{ color: accent.from }} className="animate-spin" />
                </div>
            ) : (
                <>
                    {subView === 'grid'    && <TopicProgressView data={data} onStudentClick={onStudentClick} />}
                    {subView === 'tiers'   && (tierData   ? <StudentTierMatrixView data={tierData} onStudentClick={onStudentClick} /> : <EmptyState message="No tier quiz data yet." />)}
                    {subView === 'at-risk' && (atRiskData ? <AtRiskView data={atRiskData} onStudentClick={onStudentClick} /> : <EmptyState message="No at-risk data yet." />)}
                </>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ / TEST ANALYSIS VIEW — Class insights + Student-by-student scorecard
// ═══════════════════════════════════════════════════════════════════════════════

const DIFF_COLORS = { Easy: '#22c55e', Medium: '#fbbf24', Hard: '#ef4444' };

const scoreColor = (s) => (s || 0) >= 80 ? '#22c55e' : (s || 0) >= 60 ? '#fbbf24' : '#ef4444';

const QuizIntelligenceView = ({ data, onStudentClick }) => {
    const { theme, accent, aGrad, tooltipStyle, courseId } = useT();
    const { bloomPerformance, mostMissedQuestions, difficultyPerformance } = data;

    const [subView, setSubView]       = useState('class');
    const [overviewData, setOverview] = useState(null);
    const [tierDistData, setTierDist] = useState(null);
    const [tierMatrix, setTierMatrix] = useState(null);
    const [filterBy, setFilterBy]     = useState('all');
    const [sortBy, setSortBy]         = useState('score');

    const storageKey = `dismissed_missed_${courseId}`;
    const [dismissed, setDismissed] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem(storageKey)) || []); }
        catch { return new Set(); }
    });

    useEffect(() => {
        if (!courseId) return;
        api.get(`/analytics/${courseId}/overview`).then(r => setOverview(r.data)).catch(() => {});
        api.get(`/analytics/${courseId}/tier-distribution`).then(r => setTierDist(r.data)).catch(() => {});
        api.get(`/analytics/${courseId}/student-tier-matrix`).then(r => setTierMatrix(r.data)).catch(() => {});
    }, [courseId]);

    const dismissQuestion = (q) => {
        const key = q.questionId || q.questionText;
        setDismissed(prev => {
            const next = new Set(prev);
            next.add(key);
            localStorage.setItem(storageKey, JSON.stringify([...next]));
            return next;
        });
    };
    const restoreAll = () => { setDismissed(new Set()); localStorage.removeItem(storageKey); };

    // ── Computed values ──────────────────────────────────────────────────────
    const bloomData = BLOOM_ORDER.filter(bl => bloomPerformance?.[bl])
        .map(bl => ({ name: bl, score: bloomPerformance[bl].percentage, total: bloomPerformance[bl].total }));

    const diffData = ['easy', 'medium', 'hard']
        .map(d => ({ name: d.charAt(0).toUpperCase() + d.slice(1), missed: difficultyPerformance?.[d]?.missedCount || 0 }))
        .filter(d => d.missed > 0);

    const filteredQuestions = (mostMissedQuestions || []).filter(q => !dismissed.has(q.questionId || q.questionText));

    const students = overviewData?.students || [];
    const avgClassScore = students.length
        ? Math.round(students.reduce((s, x) => s + (x.avgQuizScore || 0), 0) / students.length)
        : null;
    const passingCount  = students.filter(s => (s.avgQuizScore || 0) >= 80).length;
    const weakestBloom  = Object.entries(bloomPerformance || {})
        .filter(([, v]) => (v.total || 0) > 0)
        .sort((a, b) => a[1].percentage - b[1].percentage)[0];

    const filteredStudents = students
        .filter(s => filterBy === 'all'         ? true
                   : filterBy === 'passing'     ? (s.avgQuizScore || 0) >= 80
                   : filterBy === 'progressing' ? (s.avgQuizScore || 0) >= 60 && (s.avgQuizScore || 0) < 80
                   :                              (s.avgQuizScore || 0) < 60)
        .sort((a, b) => sortBy === 'name'    ? a.name.localeCompare(b.name)
                      : sortBy === 'quizzes' ? (b.quizzesTaken || 0) - (a.quizzesTaken || 0)
                      :                        (b.avgQuizScore || 0) - (a.avgQuizScore || 0));

    const studentTierSummary = (tierMatrix?.students || []).reduce((acc, s) => {
        const topicVals = Object.values(s.tiers || {});
        acc[s.studentId] = {
            beginner:     topicVals.some(t => t.beginner     === 'passed'),
            intermediate: topicVals.some(t => t.intermediate === 'passed'),
            advanced:     topicVals.some(t => t.advanced     === 'passed'),
            bAttempted:   topicVals.some(t => t.beginner     === 'attempted'),
            iAttempted:   topicVals.some(t => t.intermediate === 'attempted'),
            aAttempted:   topicVals.some(t => t.advanced     === 'attempted'),
        };
        return acc;
    }, {});

    const rankBadge = (rank) => {
        if (rank === 1) return { background: 'rgba(234,179,8,0.18)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.35)' };
        if (rank === 2) return { background: 'rgba(156,163,175,0.18)', color: '#d1d5db', border: '1px solid rgba(156,163,175,0.35)' };
        if (rank === 3) return { background: 'rgba(249,115,22,0.18)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.35)' };
        return { background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` };
    };

    // ── Sub-view toggle ──────────────────────────────────────────────────────
    const SubToggle = () => (
        <div style={{ display: 'inline-flex', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {[{ id: 'class', label: 'Class View' }, { id: 'students', label: 'Student Roster' }].map(m => (
                <button key={m.id} onClick={() => setSubView(m.id)}
                    style={{ padding: '7px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: subView === m.id ? aGrad : 'transparent', color: subView === m.id ? '#fff' : theme.textMuted }}>
                    {m.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-5">
            <SubToggle />

            {/* ── CLASS VIEW ─────────────────────────────────────────────── */}
            {subView === 'class' && (
                <div className="space-y-5">
                    {/* Section A — Insight Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
                        {/* Class Avg Score */}
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '18px 20px' }}>
                            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <BarChart3 size={13} style={{ color: accent.from }} /> Class Avg Score
                            </div>
                            {avgClassScore !== null ? (
                                <>
                                    <div style={{ fontSize: '36px', fontWeight: 800, color: scoreColor(avgClassScore), lineHeight: 1 }}>{avgClassScore}%</div>
                                    <div style={{ marginTop: '8px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                        <div style={{ height: '100%', borderRadius: '99px', width: `${avgClassScore}%`, background: scoreColor(avgClassScore), transition: 'width 0.6s ease' }} />
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '14px', color: theme.textMuted }}>No quiz data yet</div>
                            )}
                        </div>

                        {/* Students Passing */}
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '18px 20px' }}>
                            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={13} style={{ color: '#22c55e' }} /> Students Passing ≥80%
                            </div>
                            {students.length > 0 ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '36px', fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>{passingCount}</span>
                                        <span style={{ fontSize: '14px', color: theme.textMuted }}>/ {students.length}</span>
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '12px', color: theme.textMuted }}>
                                        {Math.round((passingCount / students.length) * 100)}% of class passing
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '14px', color: theme.textMuted }}>No students yet</div>
                            )}
                        </div>

                        {/* Biggest Gap */}
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '18px 20px' }}>
                            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={13} style={{ color: '#f87171' }} /> Weakest Bloom Level
                            </div>
                            {weakestBloom ? (
                                <>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: BLOOM_COLORS[weakestBloom[0]] || '#f87171', textTransform: 'capitalize', lineHeight: 1.2 }}>{weakestBloom[0]}</div>
                                    <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', fontWeight: 600 }}>{weakestBloom[1].percentage}% avg score</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Focus re-teaching here</div>
                                </>
                            ) : (
                                <div style={{ fontSize: '14px', color: theme.textMuted }}>No quiz data yet</div>
                            )}
                        </div>
                    </div>

                    {/* Section B — Two charts side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {bloomData.length > 0 && (
                            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '20px' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Performance by Bloom's Level</h3>
                                <div style={{ height: '220px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bloomData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                            <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                            <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 10, fill: theme.textMuted }} />
                                            <Tooltip {...tooltipStyle} formatter={val => `${val}%`} />
                                            <Bar dataKey="score" name="Class Score %" radius={[5, 5, 0, 0]} barSize={32}>
                                                {bloomData.map((d, i) => <Cell key={i} fill={BLOOM_COLORS[d.name] || '#8b5cf6'} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                        {diffData.length > 0 ? (
                            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '20px' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Wrong Answers by Difficulty</h3>
                                <div style={{ height: '220px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={diffData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                            <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 12, fill: theme.textMuted }} />
                                            <YAxis stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} />
                                            <Tooltip {...tooltipStyle} />
                                            <Bar dataKey="missed" name="Wrong Answers" radius={[5, 5, 0, 0]} barSize={48}>
                                                {diffData.map((d, i) => <Cell key={i} fill={DIFF_COLORS[d.name] || '#8b5cf6'} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : bloomData.length > 0 ? null : (
                            <EmptyState message="No quiz attempts recorded yet." />
                        )}
                    </div>

                    {/* Tier pass rates (lazy) */}
                    {tierDistData && (tierDistData.topics || []).length > 0 && (
                        <TierDistributionView data={tierDistData} />
                    )}

                    {/* Section D — Student Performance Snapshot */}
                    {students.length > 0 && (
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                                    Student Performance Snapshot
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    {/* Tier legend */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: theme.textMuted }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} /> Passed
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #34d399', display: 'inline-block' }} /> Attempted
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)', display: 'inline-block' }} /> Not started
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: theme.textMuted }}>{students.length} students</span>
                                </div>
                            </div>
                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr 160px 130px 60px 60px', alignItems: 'center', gap: '14px', padding: '8px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
                                <span />
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Student</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Quiz Score</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Bloom Level (B / I / A)</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Quizzes</span>
                                <span />
                            </div>
                            {/* Student rows sorted by score desc */}
                            {students
                                .slice()
                                .sort((a, b) => (b.avgQuizScore || 0) - (a.avgQuizScore || 0))
                                .map((s, idx) => {
                                    const sc = s.avgQuizScore || 0;
                                    const col = scoreColor(sc);
                                    const riskDot = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                                    const tiers = studentTierSummary[s.studentId] || {};
                                    const tierDots = [
                                        { key: 'beginner',     atkKey: 'bAttempted', color: '#34d399', label: 'B', title: 'Beginner'     },
                                        { key: 'intermediate', atkKey: 'iAttempted', color: '#fbbf24', label: 'I', title: 'Intermediate'  },
                                        { key: 'advanced',     atkKey: 'aAttempted', color: '#f43f5e', label: 'A', title: 'Advanced'      },
                                    ];
                                    return (
                                        <div key={s.studentId || idx}
                                            style={{ display: 'grid', gridTemplateColumns: '10px 1fr 160px 130px 60px 60px', alignItems: 'center', gap: '14px', padding: '11px 20px', borderBottom: `1px solid ${theme.border}30`, cursor: 'pointer', transition: 'background 0.12s' }}
                                            onClick={() => onStudentClick && onStudentClick(s.studentId)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {/* Risk dot */}
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskDot.text, flexShrink: 0 }} title={riskDot.label} />
                                            {/* Name */}
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                                <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'capitalize' }}>{riskDot.label}</div>
                                            </div>
                                            {/* Score bar */}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 800, color: col, lineHeight: 1 }}>{sc}%</span>
                                                    {sc >= 80 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '1px 5px' }}>Passing</span>}
                                                    {sc >= 60 && sc < 80 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '4px', padding: '1px 5px' }}>Progress</span>}
                                                    {sc < 60 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', padding: '1px 5px' }}>Needs Help</span>}
                                                </div>
                                                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                                                    <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(sc, 100)}%`, background: col, transition: 'width 0.5s ease' }} />
                                                </div>
                                            </div>
                                            {/* Bloom tier dots */}
                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                {tierDots.map(td => (
                                                    <div key={td.key} title={`${td.title}: ${tiers[td.key] ? 'Passed' : tiers[td.atkKey] ? 'Attempted' : 'Not started'}`}
                                                        style={{
                                                            width: 26, height: 26, borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background:   tiers[td.key]    ? td.color : tiers[td.atkKey] ? 'transparent' : 'rgba(255,255,255,0.06)',
                                                            border:       `2px solid ${tiers[td.key] || tiers[td.atkKey] ? td.color : 'rgba(255,255,255,0.12)'}`,
                                                            color:        tiers[td.key]    ? '#000'   : td.color,
                                                            opacity:      tiers[td.key] || tiers[td.atkKey] ? 1 : 0.4,
                                                        }}>
                                                        {td.label}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Quizzes taken */}
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>{s.quizzesTaken || 0}</div>
                                                <div style={{ fontSize: '9px', color: theme.textMuted }}>taken</div>
                                            </div>
                                            {/* View */}
                                            <span style={{ fontSize: '12px', color: accent.from, display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', fontWeight: 600 }}>
                                                View <ChevronRight size={13} />
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* Section C — Most Missed Questions */}
                    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Most Missed Questions</h3>
                            {dismissed.size > 0 && (
                                <button onClick={restoreAll}
                                    style={{ fontSize: '11px', color: accent.from, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
                                    Restore {dismissed.size} dismissed
                                </button>
                            )}
                        </div>
                        <div>
                            {filteredQuestions.map((q, i) => (
                                <div key={i} style={{ padding: '14px 22px', borderBottom: `1px solid ${theme.border}50` }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: theme.textPrimary, fontSize: '14px', fontWeight: 500, marginBottom: '7px' }}>{q.questionText}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {q.topic && <span style={{ fontSize: '11px', padding: '2px 8px', background: theme.bg, borderRadius: '4px', color: theme.textSecondary }}>{q.topic}</span>}
                                                {q.bloomLevel && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', background: `${BLOOM_COLORS[q.bloomLevel]}20`, color: BLOOM_COLORS[q.bloomLevel] }}>{q.bloomLevel}</span>}
                                                {q.difficulty && <span style={{ fontSize: '11px', padding: '2px 8px', background: theme.bg, borderRadius: '4px', color: theme.textMuted, textTransform: 'capitalize' }}>{q.difficulty}</span>}
                                            </div>
                                            {(q.commonWrongAnswers || []).length > 0 && (
                                                <div style={{ marginTop: '7px', fontSize: '11px', color: theme.textMuted }}>
                                                    Common wrong picks: {q.commonWrongAnswers.map(a => `"${a.answer}" (${a.count}×)`).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                                            <button onClick={() => dismissQuestion(q)}
                                                style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.textMuted, cursor: 'pointer', fontSize: '12px', padding: '2px 8px', fontFamily: 'inherit', lineHeight: 1.5 }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}>
                                                × Clear
                                            </button>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{q.missedCount}</div>
                                                <div style={{ fontSize: '11px', color: theme.textMuted }}>students missed</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredQuestions.length === 0 && (
                                <div style={{ padding: '28px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>No quiz data available yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── STUDENT ROSTER VIEW ─────────────────────────────────────── */}
            {subView === 'students' && (
                <div className="space-y-4">
                    {/* Filter + Sort row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        {/* Filter pills */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'all',         label: 'All',             count: students.length },
                                { id: 'passing',     label: 'Passing ≥80%',    count: students.filter(s => (s.avgQuizScore||0) >= 80).length },
                                { id: 'progressing', label: 'Progressing 60–79%', count: students.filter(s => (s.avgQuizScore||0) >= 60 && (s.avgQuizScore||0) < 80).length },
                                { id: 'struggling',  label: 'Struggling <60%', count: students.filter(s => (s.avgQuizScore||0) < 60).length },
                            ].map(f => (
                                <button key={f.id} onClick={() => setFilterBy(f.id)}
                                    style={{ padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, border: `1px solid ${filterBy === f.id ? 'transparent' : theme.border}`, background: filterBy === f.id ? aGrad : 'transparent', color: filterBy === f.id ? '#fff' : theme.textMuted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                    {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
                                </button>
                            ))}
                        </div>
                        {/* Sort */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>Sort:</span>
                            {[
                                { id: 'score',   label: 'Score' },
                                { id: 'name',    label: 'Name' },
                                { id: 'quizzes', label: 'Quizzes' },
                            ].map(s => (
                                <button key={s.id} onClick={() => setSortBy(s.id)}
                                    style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: `1px solid ${sortBy === s.id ? accent.from : theme.border}`, background: sortBy === s.id ? `${accent.from}18` : 'transparent', color: sortBy === s.id ? accent.from : theme.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {s.label}{sortBy === s.id && s.id !== 'name' ? ' ↓' : ''}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Student table */}
                    {filteredStudents.length === 0 ? (
                        <EmptyState message={students.length === 0 ? 'No quiz data yet. Students need to take quizzes first.' : 'No students match this filter.'} />
                    ) : (
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                            {/* Table header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '44px 12px 1fr 160px 80px 80px', alignItems: 'center', gap: '12px', padding: '10px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>#</span>
                                <span />
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Student</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Quiz Score</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Quizzes</span>
                                <span />
                            </div>

                            {filteredStudents.map((s, idx) => {
                                const sc = s.avgQuizScore || 0;
                                const col = scoreColor(sc);
                                const riskDot = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                                return (
                                    <div key={s.studentId || idx}
                                        style={{ display: 'grid', gridTemplateColumns: '44px 12px 1fr 160px 80px 80px', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: `1px solid ${theme.border}40`, transition: 'background 0.12s', cursor: 'pointer' }}
                                        onClick={() => onStudentClick && onStudentClick(s.studentId)}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        {/* Rank */}
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, ...rankBadge(idx + 1) }}>
                                            {idx + 1}
                                        </div>
                                        {/* Risk dot */}
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riskDot.text, flexShrink: 0 }} title={riskDot.label} />
                                        {/* Name */}
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                            <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'capitalize' }}>{riskDot.label}</div>
                                        </div>
                                        {/* Score bar */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: col, lineHeight: 1 }}>{sc}%</span>
                                                {sc >= 80 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Passing</span>}
                                                {sc >= 60 && sc < 80 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Progress</span>}
                                                {sc < 60 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Needs Help</span>}
                                            </div>
                                            <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                                <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(sc, 100)}%`, background: col, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                        {/* Quizzes taken */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary }}>{s.quizzesTaken || 0}</div>
                                            <div style={{ fontSize: '10px', color: theme.textMuted }}>taken</div>
                                        </div>
                                        {/* View button */}
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '12px', color: accent.from, display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', fontWeight: 600 }}>
                                                View <ChevronRight size={13} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 6: LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const LeaderboardView = ({ data, onStudentClick }) => {
    const { theme, accent } = useT();
    const { leaderboard } = data;

    const rankStyle = rank => {
        if (rank === 1) return { background: 'rgba(234,179,8,0.15)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.3)' };
        if (rank === 2) return { background: 'rgba(156,163,175,0.15)', color: '#d1d5db', border: '1px solid rgba(156,163,175,0.3)' };
        if (rank === 3) return { background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' };
        return { background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` };
    };

    return (
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Ranked by Composite Score</h3>
                <span style={{ fontSize: '11px', color: theme.textMuted }}>40% completion + 40% quiz + 20% time</span>
            </div>
            <div>
                {(leaderboard || []).map(s => (
                    <div key={s.studentId}
                        style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}50` }}
                        onClick={() => onStudentClick(s.studentId)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0, ...rankStyle(s.rank) }}>
                            {s.rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                        </div>
                        <div className="flex gap-6 text-center" style={{ flexShrink: 0 }}>
                            <div><div style={{ fontSize: '11px', color: theme.textMuted }}>Score</div><div style={{ fontWeight: 700, color: accent.from }}>{s.compositeScore}</div></div>
                            <div><div style={{ fontSize: '11px', color: theme.textMuted }}>Progress</div><div style={{ fontWeight: 700, color: theme.textPrimary }}>{s.completionPct}%</div></div>
                            <div><div style={{ fontSize: '11px', color: theme.textMuted }}>Quiz</div><div style={{ fontWeight: 700, color: theme.textPrimary }}>{s.avgQuizScore}%</div></div>
                            <div><div style={{ fontSize: '11px', color: theme.textMuted }}>Streak</div><div style={{ fontWeight: 700, color: '#fbbf24' }}>{s.streak}d</div></div>
                        </div>
                        <ChevronRight size={16} style={{ color: theme.textMuted, flexShrink: 0 }} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 7: AT-RISK STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

const AtRiskView = ({ data, onStudentClick }) => {
    const { theme, accent } = useT();
    const { alerts, atRiskCount } = data;

    const critical = (alerts || []).filter(a => a.severity === 'critical');
    const atRisk   = (alerts || []).filter(a => a.severity === 'at_risk');
    const sorted   = [...critical, ...atRisk];

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#f87171', lineHeight: 1 }}>{critical.length}</div>
                    <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Critical</div>
                    <div style={{ fontSize: '10px', color: '#f87171', marginTop: '2px' }}>Immediate action needed</div>
                </div>
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{atRisk.length}</div>
                    <div style={{ fontSize: '11px', color: '#fde68a', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>At Risk</div>
                    <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '2px' }}>Monitor closely</div>
                </div>
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: theme.textPrimary, lineHeight: 1 }}>{atRiskCount}</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Flagged</div>
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '2px' }}>Review recommended</div>
                </div>
            </div>

            {sorted.map(a => {
                const sev = a.severity === 'critical' ? RISK_COLORS.critical : RISK_COLORS.at_risk;
                const urgency = a.daysSinceActive > 14 ? 'High urgency' : a.daysSinceActive > 7 ? 'Moderate urgency' : 'Low urgency';
                const urgencyColor = a.daysSinceActive > 14 ? '#f87171' : a.daysSinceActive > 7 ? '#fbbf24' : theme.textMuted;
                return (
                    <div key={a.studentId}
                        style={{ background: theme.surface, border: `1px solid ${sev.border}`, borderLeft: `4px solid ${sev.text}`, borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => onStudentClick(a.studentId)}
                        onMouseEnter={e => e.currentTarget.style.background = theme.bg}
                        onMouseLeave={e => e.currentTarget.style.background = theme.surface}>
                        {/* Top bar */}
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.border}40` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', textTransform: 'uppercase', background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                                    {a.severity === 'critical' ? '🔴 Critical' : '🟡 At Risk'}
                                </span>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary }}>{a.name}</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted }}>{a.email}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: urgencyColor }}>{urgency}</div>
                                <div style={{ fontSize: '11px', color: a.daysSinceActive > 7 ? '#f87171' : theme.textMuted }}>
                                    {a.daysSinceActive === 0 ? 'Active today' : `${a.daysSinceActive} days inactive`}
                                </div>
                            </div>
                        </div>
                        {/* Metric bars */}
                        <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: `1px solid ${theme.border}40` }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600 }}>Quiz Score</span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: a.avgQuizScore < 50 ? '#f87171' : '#fbbf24' }}>{a.avgQuizScore}%</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${a.avgQuizScore}%`, background: a.avgQuizScore < 50 ? '#f87171' : '#fbbf24', transition: 'width 0.5s' }} />
                                </div>
                                <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '3px' }}>
                                    {a.avgQuizScore < 50 ? 'Below minimum threshold' : 'Struggling — needs support'}
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600 }}>Course Completion</span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: a.completionPct < 30 ? '#f87171' : '#fbbf24' }}>{a.completionPct}%</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${a.completionPct}%`, background: a.completionPct < 30 ? '#f87171' : '#fbbf24', transition: 'width 0.5s' }} />
                                </div>
                                <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '3px' }}>
                                    {a.completionPct < 30 ? 'Significantly behind pace' : 'Behind — needs to catch up'}
                                </div>
                            </div>
                        </div>
                        {/* Reasons + action */}
                        <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {(a.reasons || []).map((r, i) => (
                                    <div key={i} style={{ fontSize: '12px', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={11} style={{ color: '#fbbf24', flexShrink: 0 }} /> {r}
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: `${accent.from}15`, border: `1px solid ${accent.from}30`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, maxWidth: '260px' }}>
                                <Zap size={13} style={{ color: accent.from, flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: accent.from, fontWeight: 600 }}>{a.suggestedAction}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
            {(!alerts || alerts.length === 0) && <EmptyState message="No at-risk students detected — great job keeping everyone on track!" />}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 8: ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const EngagementView = ({ data }) => {
    const { theme, tooltipStyle } = useT();
    const { timeDistribution, resourceCompletionRates, avgTotalTime } = data;
    const timeData = Object.entries(timeDistribution || {}).map(([range, count]) => ({ range, count }));

    return (
        <div className="space-y-6">
            <KPICard label="Avg Total Study Time" value={avgTotalTime || '0h'} icon={Clock} color="#8b5cf6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Study Time Distribution</h3>
                    <div style={{ height: '224px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                <XAxis dataKey="range" stroke={theme.textMuted} tick={{ fontSize: 12, fill: theme.textMuted }} />
                                <YAxis stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Resource Completion (Lowest First)</h3>
                    <div style={{ maxHeight: '224px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(resourceCompletionRates || []).map((r, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span style={{ fontSize: '11px', color: theme.textMuted, width: '128px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title}>{r.title}</span>
                                <div style={{ flex: 1, height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${r.completionRate}%`, background: r.completionRate < 30 ? '#ef4444' : r.completionRate < 60 ? '#f59e0b' : '#10b981' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.textSecondary, width: '40px', textAlign: 'right' }}>{r.completionRate}%</span>
                            </div>
                        ))}
                        {(!resourceCompletionRates || resourceCompletionRates.length === 0) && <p style={{ color: theme.textMuted, fontSize: '14px' }}>No resource data yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 9: STUDENT DEEP-DIVE (enhanced with quiz review panel)
// ═══════════════════════════════════════════════════════════════════════════════

const StudentDetailView = ({ data, onBack }) => {
    const { theme, accent, tooltipStyle } = useT();
    const { student, summary, bloomProfile, strengths, weaknesses, topicBreakdown, activityTimeline } = data;
    const [selectedQuizTopicId, setSelectedQuizTopicId] = useState(null);

    const bloomRadarData = BLOOM_ORDER.map(bl => ({ level: bl, score: bloomProfile?.[bl]?.percentage || 0 }));
    const activityData = (activityTimeline || []).map(d => ({
        date: d.date?.slice(5),
        minutes: Math.round((d.timeSpent || 0) / 60),
    }));
    const risk = RISK_COLORS[summary?.risk] || RISK_COLORS.on_track;

    const topicsWithQuizzes = (topicBreakdown || []).filter(t => t.attempts > 0);
    const selectedQuizTopic = topicsWithQuizzes.find(t => t.topicId === selectedQuizTopicId);

    return (
        <div className="space-y-6">
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.textPrimary, marginBottom: '4px' }}>{student?.name}</h2>
                    <p style={{ fontSize: '14px', color: theme.textMuted }}>{student?.email}</p>
                </div>
                <div className="flex gap-4 items-center">
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                    <button onClick={onBack}
                        style={{ fontSize: '14px', color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard label="Completion" value={`${summary?.completionPct || 0}%`} icon={Target} color="#8b5cf6" />
                <KPICard label="Avg Quiz Score" value={`${summary?.avgQuizScore || 0}%`} icon={Brain} color="#10b981" />
                <KPICard label="Study Time" value={summary?.totalTimeSpent || '0h'} icon={Clock} color="#3b82f6" />
                <KPICard label="Quizzes Taken" value={summary?.quizzesTaken || 0} icon={BookOpen} color="#f59e0b" />
                <KPICard label="Last Active" value={summary?.daysSinceActive === 0 ? 'Today' : `${summary?.daysSinceActive}d ago`} icon={Activity} color="#ef4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Bloom's Proficiency</h3>
                    <div style={{ height: '224px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={bloomRadarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke={theme.border} />
                                <PolarAngleAxis dataKey="level" tick={{ fill: theme.textMuted, fontSize: 11 }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar dataKey="score" stroke={accent.from} fill={accent.from} fillOpacity={0.25} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>30-Day Activity</h3>
                    <div style={{ height: '224px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                <XAxis dataKey="date" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} />
                                <YAxis stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey="minutes" stroke="#10b981" fill="url(#actGrad)" name="Minutes" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={14} /> Strengths
                    </h3>
                    {(strengths || []).length > 0 ? (
                        <div className="space-y-2">
                            {strengths.map((s, i) => (
                                <div key={i} className="flex justify-between" style={{ fontSize: '13px' }}>
                                    <span style={{ color: theme.textSecondary }}>{s.title}</span>
                                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{s.score}%</span>
                                </div>
                            ))}
                        </div>
                    ) : <p style={{ color: theme.textMuted, fontSize: '13px' }}>No quiz data yet</p>}
                </div>
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle size={14} /> Weaknesses
                    </h3>
                    {(weaknesses || []).length > 0 ? (
                        <div className="space-y-3">
                            {weaknesses.map((w, i) => (
                                <div key={i}>
                                    <div className="flex justify-between" style={{ fontSize: '13px', marginBottom: '4px' }}>
                                        <span style={{ color: theme.textSecondary }}>{w.title}</span>
                                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{w.score}%</span>
                                    </div>
                                    {(w.wrongQuestions || []).map((wq, j) => (
                                        <div key={j} style={{ fontSize: '11px', color: theme.textMuted, paddingLeft: '12px', borderLeft: `1px solid ${theme.border}`, marginLeft: '4px', marginBottom: '4px' }}>
                                            ✗ {wq.questionText?.slice(0, 80)}...
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : <p style={{ color: theme.textMuted, fontSize: '13px' }}>No quiz data yet</p>}
                </div>
            </div>

            {/* Quiz Review Panel */}
            {topicsWithQuizzes.length > 0 && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Quiz Answer Review</h3>
                    </div>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {topicsWithQuizzes.map(t => {
                            const isActive = selectedQuizTopicId === t.topicId;
                            return (
                                <button key={t.topicId} onClick={() => setSelectedQuizTopicId(isActive ? null : t.topicId)}
                                    style={{ padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, border: `1px solid ${isActive ? accent.from : theme.border}`, background: isActive ? `${accent.from}18` : 'transparent', color: isActive ? accent.from : theme.textMuted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                    {t.title}
                                    {t.bestScore !== null && <span style={{ marginLeft: '6px', opacity: 0.7 }}>{t.bestScore}%</span>}
                                </button>
                            );
                        })}
                    </div>
                    {selectedQuizTopic ? (
                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
                            {(selectedQuizTopic.wrongQuestions || []).length === 0 ? (
                                <p style={{ color: '#22c55e', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No wrong answers recorded for this topic.</p>
                            ) : (selectedQuizTopic.wrongQuestions || []).map((wq, i) => (
                                <div key={i} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, marginBottom: '10px', lineHeight: 1.5 }}>{wq.questionText}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>Given</span>
                                            <span style={{ fontSize: '13px', color: '#f87171' }}>{wq.studentAnswer || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>Correct</span>
                                            <span style={{ fontSize: '13px', color: '#4ade80' }}>{wq.correctAnswer || '—'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {wq.bloomLevel && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', background: `${BLOOM_COLORS[wq.bloomLevel]}20`, color: BLOOM_COLORS[wq.bloomLevel] }}>{wq.bloomLevel}</span>}
                                        {wq.difficulty && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted }}>{wq.difficulty}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Select a topic above to review the student's quiz answers.</p>
                    )}
                </div>
            )}

            {/* Topic-by-Topic Breakdown */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Topic-by-Topic Breakdown</h3>
                </div>
                <div>
                    {(topicBreakdown || []).map(t => (
                        <div key={t.topicId} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', borderBottom: `1px solid ${theme.border}50` }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: t.status === 'completed' ? '#22c55e' : t.status === 'in_progress' ? '#fbbf24' : theme.textMuted }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>{t.moduleTitle}</div>
                            </div>
                            <div style={{ textAlign: 'center', width: '64px' }}>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Best</div>
                                <div style={{ fontWeight: 700, color: (t.bestScore || 0) >= 70 ? '#22c55e' : '#ef4444' }}>{t.bestScore ?? '—'}</div>
                            </div>
                            <div style={{ textAlign: 'center', width: '64px' }}>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Time</div>
                                <div style={{ color: theme.textSecondary }}>{t.timeFormatted}</div>
                            </div>
                            <div style={{ textAlign: 'center', width: '64px' }}>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Res.</div>
                                <div style={{ color: theme.textSecondary }}>{t.resourcesCompleted}/{t.totalResources}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW: BLOOM LEVELS (TIER DISTRIBUTION)
// ═══════════════════════════════════════════════════════════════════════════════

const TIER_COLORS = {
    beginner:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  label: 'Beginner' },
    intermediate: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Intermediate' },
    advanced:     { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.25)',   label: 'Advanced' },
};
const TIER_ORDER = ['beginner', 'intermediate', 'advanced'];

const TierDistributionView = ({ data }) => {
    const { theme, accent } = useT();
    const { courseWide = {}, topics = [] } = data || {};

    if (!topics.length) return <EmptyState message="No tier quiz data available yet. Generate and publish quizzes for at least one topic." />;

    const kpis = TIER_ORDER.map(tier => {
        const d = courseWide[tier] || {};
        return {
            tier,
            ...TIER_COLORS[tier],
            attempted: d.attempted || 0,
            passed: d.passed || 0,
            passRate: d.passRate ?? null,
            avgScore: d.avgScore ?? null,
        };
    });

    return (
        <div className="space-y-6">
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
                {kpis.map(k => (
                    <div key={k.tier} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: '14px', padding: '18px 20px' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.passRate !== null ? `${k.passRate}%` : '—'}</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Pass Rate</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: theme.textPrimary }}>{k.attempted}</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Attempted</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{k.passed}</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Passed</div>
                            </div>
                            {k.avgScore !== null && (
                                <div>
                                    <div style={{ fontSize: '22px', fontWeight: 700, color: theme.textSecondary }}>{k.avgScore}%</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted }}>Avg Score</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Per-topic breakdown */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, flex: 1 }}>Per-Topic Tier Pass Rates</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {TIER_ORDER.map(t => (
                            <span key={t} className="flex items-center gap-1.5" style={{ fontSize: '11px', color: TIER_COLORS[t].color }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_COLORS[t].color, display: 'inline-block' }} />
                                {TIER_COLORS[t].label}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    {topics.map((t, idx) => (
                        <div key={t.topicId} style={{ padding: '14px 20px', borderBottom: idx < topics.length - 1 ? `1px solid ${theme.border}40` : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>{t.title}</span>
                                <span style={{ fontSize: '11px', color: theme.textMuted }}>{t.moduleTitle}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {TIER_ORDER.map(tier => {
                                    const td = t.tiers?.[tier] || {};
                                    const passRate = td.passRate ?? null;
                                    const cfg = TIER_COLORS[tier];
                                    return (
                                        <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '11px', color: cfg.color, width: '84px', flexShrink: 0 }}>{cfg.label}</span>
                                            <div style={{ flex: 1, height: '8px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: '99px', width: `${passRate ?? 0}%`, background: cfg.color, transition: 'width 0.4s ease' }} />
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: passRate !== null ? cfg.color : theme.textMuted, width: '38px', textAlign: 'right', flexShrink: 0 }}>
                                                {passRate !== null ? `${passRate}%` : '—'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: theme.textMuted, width: '60px', flexShrink: 0 }}>
                                                {td.passed ?? 0}/{td.attempted ?? 0}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW: STUDENT TIERS MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

const StudentTierMatrixView = ({ data, onStudentClick }) => {
    const { theme, accent } = useT();
    const { topics = [], students = [] } = data || {};
    const [expandedStudent, setExpandedStudent] = useState(null);

    if (!topics.length || !students.length) return <EmptyState message="No tier quiz data available yet. Generate and publish tier quizzes and have students attempt them." />;

    const tierDot = (tierData) => {
        if (!tierData) return <span style={{ width: 10, height: 10, borderRadius: '50%', background: `${theme.border}60`, display: 'inline-block' }} title="Not attempted" />;
        if (tierData.status === 'passed') return <span style={{ width: 10, height: 10, borderRadius: '50%', background: TIER_COLORS[tierData.tier]?.color || '#22c55e', display: 'inline-block' }} title={`Passed (${tierData.score}%)`} />;
        return <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', border: '2px solid #fbbf24', display: 'inline-block', opacity: 0.6 }} title={`Attempted (${tierData.score}%)`} />;
    };

    const currentLevel = (cell) => {
        if (cell.advanced?.status === 'passed')     return { label: 'Advanced',     ...TIER_COLORS.advanced,     muted: false };
        if (cell.intermediate?.status === 'passed') return { label: 'Intermediate', ...TIER_COLORS.intermediate, muted: false };
        if (cell.beginner?.status === 'passed')     return { label: 'Beginner',     ...TIER_COLORS.beginner,     muted: false };
        if (cell.advanced?.status === 'attempted')     return { label: 'Advanced',     color: TIER_COLORS.advanced.color,     muted: true };
        if (cell.intermediate?.status === 'attempted') return { label: 'Intermediate', color: TIER_COLORS.intermediate.color, muted: true };
        if (cell.beginner?.status === 'attempted')     return { label: 'Beginner',     color: TIER_COLORS.beginner.color,     muted: true };
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: theme.textMuted, fontWeight: 600 }}>Legend:</span>
                {[
                    { dot: <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />, label: 'Passed' },
                    { dot: <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', opacity: 0.6, display: 'inline-block' }} />, label: 'Attempted' },
                    { dot: <span style={{ width: 10, height: 10, borderRadius: '50%', background: `${theme.border}60`, display: 'inline-block' }} />, label: 'Not started' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5" style={{ fontSize: '11px', color: theme.textMuted }}>
                        {l.dot} {l.label}
                    </div>
                ))}
                <span style={{ fontSize: '11px', color: theme.textMuted, marginLeft: '8px' }}>Dots (left→right): Beginner · Intermediate · Advanced · Badge = current level</span>
            </div>

            {/* Scrollable matrix */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%' }}>
                    <thead>
                        <tr style={{ background: theme.bg }}>
                            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', position: 'sticky', left: 0, background: theme.bg, zIndex: 2, whiteSpace: 'nowrap', minWidth: '180px' }}>Student</th>
                            {topics.map(t => (
                                <th key={t.topicId} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: theme.textMuted, textAlign: 'center', minWidth: '80px', maxWidth: '120px' }}>
                                    <span title={t.title} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{t.title}</span>
                                    <span style={{ fontSize: '9px', color: theme.textMuted, opacity: 0.6, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.moduleTitle}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, si) => {
                            const isExpanded = expandedStudent === student.studentId;
                            return (
                                <React.Fragment key={student.studentId}>
                                    <tr
                                        style={{ borderTop: `1px solid ${theme.border}30`, cursor: 'pointer', transition: 'background 0.15s', background: isExpanded ? `${accent.from}08` : 'transparent' }}
                                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <td
                                            style={{ padding: '10px 18px', position: 'sticky', left: 0, background: isExpanded ? `${accent.from}08` : theme.surface, zIndex: 1, cursor: 'pointer' }}
                                            onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: theme.textPrimary }}>{student.name}</div>
                                            <div style={{ fontSize: '11px', color: theme.textMuted }}>{student.email}</div>
                                        </td>
                                        {topics.map(t => {
                                            const cell = student.tiers?.[t.topicId] || {};
                                            const lvl = currentLevel(cell);
                                            return (
                                                <td key={t.topicId} style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                                        <div
                                                            className="flex items-center justify-center gap-1"
                                                            title={[
                                                                `Beginner: ${cell.beginner ? `${cell.beginner.score}% (${cell.beginner.status})` : 'not attempted'}`,
                                                                `Intermediate: ${cell.intermediate ? `${cell.intermediate.score}% (${cell.intermediate.status})` : 'not attempted'}`,
                                                                `Advanced: ${cell.advanced ? `${cell.advanced.score}% (${cell.advanced.status})` : 'not attempted'}`,
                                                            ].join('\n')}
                                                            onClick={() => onStudentClick(student.studentId)}
                                                        >
                                                            {tierDot(cell.beginner ? { ...cell.beginner, tier: 'beginner' } : null)}
                                                            {tierDot(cell.intermediate ? { ...cell.intermediate, tier: 'intermediate' } : null)}
                                                            {tierDot(cell.advanced ? { ...cell.advanced, tier: 'advanced' } : null)}
                                                        </div>
                                                        {lvl ? (
                                                            <span style={{
                                                                fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                                                                borderRadius: '20px',
                                                                background: lvl.muted ? 'transparent' : `${lvl.color}18`,
                                                                color: lvl.color,
                                                                opacity: lvl.muted ? 0.55 : 1,
                                                                border: `1px solid ${lvl.color}${lvl.muted ? '40' : '30'}`,
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {lvl.label}{!lvl.muted ? ' ✓' : ''}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: '9px', fontWeight: 600, padding: '1px 6px',
                                                                borderRadius: '20px',
                                                                background: `${theme.border}40`,
                                                                color: theme.textMuted,
                                                                border: `1px solid ${theme.border}`,
                                                                whiteSpace: 'nowrap',
                                                                opacity: 0.7,
                                                            }}>Not Attempted</span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {isExpanded && (
                                        <tr style={{ background: `${accent.from}05`, borderBottom: `1px solid ${theme.border}40` }}>
                                            <td colSpan={topics.length + 1} style={{ padding: '12px 18px 16px' }}>
                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    {topics.map(t => {
                                                        const cell = student.tiers?.[t.topicId] || {};
                                                        return (
                                                            <div key={t.topicId} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '10px 14px', minWidth: '160px' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textPrimary, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                                                                {(() => {
                                                                    const lvl = currentLevel(cell);
                                                                    return (
                                                                        <div style={{ fontSize: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                            <span style={{ color: theme.textMuted }}>Current level:</span>
                                                                            {lvl ? (
                                                                                <span style={{ fontWeight: 700, color: lvl.color }}>
                                                                                    {lvl.label}{!lvl.muted ? ' ✓' : ' (in progress)'}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ color: theme.textMuted }}>Not Attempted</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {TIER_ORDER.map(tier => {
                                                                    const td = cell[tier];
                                                                    const cfg = TIER_COLORS[tier];
                                                                    return (
                                                                        <div key={tier} className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                                                                            <span style={{ fontSize: '10px', color: cfg.color, width: '72px', flexShrink: 0 }}>{cfg.label}</span>
                                                                            {td ? (
                                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: td.status === 'passed' ? '#22c55e' : '#fbbf24' }}>
                                                                                    {td.score}%{td.status === 'passed' ? ' ✓' : ''}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ fontSize: '9px', color: theme.textMuted, fontStyle: 'italic' }}>Not Attempted</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const KPICard = ({ label, value, icon: Icon, color, subtitle }) => {
    const { theme } = useT();
    return (
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '56px', height: '56px', borderRadius: '50%', background: `${color}12` }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <div>
                    <p style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: theme.textPrimary }}>{value}</p>
                    {subtitle && <p style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>{subtitle}</p>}
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: `${color}18`, color }}>
                    <Icon size={18} />
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => {
    const { theme } = useT();
    return (
        <div style={{ textAlign: 'center', padding: '64px 0', color: theme.textMuted }}>
            <HelpCircle style={{ width: '40px', height: '40px', margin: '0 auto 12px', color: theme.border }} />
            <p>{message}</p>
        </div>
    );
};

const ErrorState = ({ message, onRetry }) => {
    const { theme, accent } = useT();
    return (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <AlertTriangle style={{ width: '40px', height: '40px', margin: '0 auto 12px', color: '#ef4444' }} />
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>{message}</p>
            <button onClick={onRetry}
                style={{ fontSize: '13px', color: accent.from, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Try again
            </button>
        </div>
    );
};

export default TeacherAnalytics;
