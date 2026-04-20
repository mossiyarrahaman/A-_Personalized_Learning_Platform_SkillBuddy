import React, { useState, useEffect, createContext, useContext } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Area, AreaChart
} from 'recharts';
import {
    Loader, Users, AlertTriangle, Brain, Trophy, Clock,
    ChevronRight, ArrowLeft, TrendingUp, Target,
    BookOpen, HelpCircle, Eye, Activity, Zap,
    CheckCircle, XCircle
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TeacherAnalytics = ({ courses = [] }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const tooltipStyle = {
        contentStyle: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: '12px', color: theme.textPrimary, fontSize: '13px' },
        cursor: { fill: `${accent.from}14` },
    };
    const ctxValue = { theme, accent, aGrad, tooltipStyle };

    const safeCourses = Array.isArray(courses) ? courses : [];
    const [selectedCourse, setSelectedCourse] = useState(safeCourses[0]?._id || '');
    const [activeView, setActiveView] = useState('overview');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedCourse && safeCourses.length > 0) setSelectedCourse(safeCourses[0]._id);
    }, [safeCourses.length]);

    const views = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'topics', label: 'Topics', icon: BookOpen },
        { id: 'quiz-analysis', label: 'Quiz Forensics', icon: Brain },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'at-risk', label: 'At-Risk', icon: AlertTriangle },
        { id: 'engagement', label: 'Engagement', icon: TrendingUp },
    ];

    useEffect(() => {
        if (!selectedCourse) return;
        if (activeView === 'student-detail' && selectedStudentId) {
            fetchData(`/analytics/${selectedCourse}/student/${selectedStudentId}`);
        } else if (activeView !== 'student-detail') {
            const endpoints = {
                overview: `/analytics/${selectedCourse}/overview`,
                topics: `/analytics/${selectedCourse}/topics`,
                'quiz-analysis': `/analytics/${selectedCourse}/quiz-analysis`,
                leaderboard: `/analytics/${selectedCourse}/leaderboard`,
                'at-risk': `/analytics/${selectedCourse}/at-risk`,
                engagement: `/analytics/${selectedCourse}/engagement`,
            };
            fetchData(endpoints[activeView]);
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

    const openStudentDetail = (studentId) => { setSelectedStudentId(studentId); setActiveView('student-detail'); };
    const backFromStudent = () => { setSelectedStudentId(null); setActiveView('overview'); };

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
                            onChange={e => { setSelectedCourse(e.target.value); setActiveView('overview'); setSelectedStudentId(null); }}
                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, minWidth: '200px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                        >
                            {safeCourses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                        </select>
                        {activeView === 'student-detail' && (
                            <button onClick={backFromStudent}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: accent.from, fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}>
                                <ArrowLeft size={16} /> Back to Overview
                            </button>
                        )}
                    </div>

                    {activeView !== 'student-detail' && (
                        <div style={{ display: 'flex', gap: '4px', background: `${theme.surface}80`, border: `1px solid ${theme.border}80`, borderRadius: '12px', padding: '4px', overflowX: 'auto' }}>
                            {views.map(v => {
                                const isActive = activeView === v.id;
                                return (
                                    <button key={v.id} onClick={() => setActiveView(v.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: isActive ? aGrad : 'transparent', color: isActive ? '#fff' : theme.textMuted, boxShadow: isActive ? `0 4px 14px ${accent.glow}` : 'none' }}
                                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = theme.textPrimary; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
                                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'transparent'; } }}
                                    >
                                        <v.icon size={15} />{v.label}
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
                        {activeView === 'overview' && <OverviewView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'topics' && <TopicsView data={data} />}
                        {activeView === 'quiz-analysis' && <QuizForensicsView data={data} />}
                        {activeView === 'leaderboard' && <LeaderboardView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'at-risk' && <AtRiskView data={data} onStudentClick={openStudentDetail} />}
                        {activeView === 'engagement' && <EngagementView data={data} />}
                        {activeView === 'student-detail' && <StudentDetailView data={data} onBack={backFromStudent} />}
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
    const { theme, accent, tooltipStyle } = useT();
    const { summary, riskDistribution, engagementTrend, students } = data;

    const riskData = Object.entries(riskDistribution || {})
        .map(([key, val]) => ({ name: RISK_COLORS[key]?.label || key, value: val, color: RISK_COLORS[key]?.text || '#9ca3af' }))
        .filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard label="Students" value={data.totalStudents} icon={Users} color="#8b5cf6" />
                <KPICard label="Avg Progress" value={`${summary?.avgCompletion || 0}%`} icon={Target} color="#3b82f6" />
                <KPICard label="Avg Quiz Score" value={`${summary?.avgScore || 0}%`} icon={Brain} color="#10b981" />
                <KPICard label="Avg Study Time" value={summary?.avgTimeSpent || '0h'} icon={Clock} color="#f59e0b" />
                <KPICard label="Active (7d)" value={`${summary?.activeRate || 0}%`} icon={Activity} color="#ef4444" subtitle={`${summary?.activeIn7Days || 0} students`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>14-Day Engagement</h3>
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
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>All Students</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: theme.bg }}>
                                {['Student', 'Progress', 'Avg Score', 'Time', 'Status', 'Last Active', ''].map((h, i) => (
                                    <th key={i} style={{ padding: i === 0 ? '12px 24px' : '12px 16px', textAlign: i === 0 ? 'left' : i === 6 ? 'right' : 'center', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(students || []).map(s => {
                                const risk = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                                return (
                                    <tr key={s.studentId} style={{ borderTop: `1px solid ${theme.border}50` }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px 24px' }}>
                                            <div style={{ fontWeight: 500, color: theme.textPrimary }}>{s.name}</div>
                                            <div style={{ fontSize: '11px', color: theme.textMuted }}>{s.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div className="flex items-center gap-2 justify-center">
                                                <div style={{ width: '64px', height: '6px', background: theme.bg, borderRadius: '99px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', borderRadius: '99px', background: accent.from, width: `${s.completionPct}%` }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.textSecondary }}>{s.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 700, color: s.avgQuizScore >= 70 ? '#22c55e' : s.avgQuizScore >= 50 ? '#fbbf24' : '#ef4444' }}>{s.avgQuizScore}%</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: theme.textSecondary }}>{s.totalTimeFormatted}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: theme.textMuted }}>
                                            {s.daysSinceActive === 0 ? 'Today' : `${s.daysSinceActive}d ago`}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2: TOPIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

const TopicsView = ({ data }) => {
    const { theme } = useT();
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
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 3: QUIZ FORENSICS
// ═══════════════════════════════════════════════════════════════════════════════

const QuizForensicsView = ({ data }) => {
    const { theme, tooltipStyle } = useT();
    const { bloomPerformance, mostMissedQuestions } = data;

    const bloomChartData = BLOOM_ORDER
        .filter(bl => bloomPerformance?.[bl])
        .map(bl => ({ name: bl, score: bloomPerformance[bl].percentage, total: bloomPerformance[bl].total }));

    return (
        <div className="space-y-6">
            {bloomChartData.length > 0 && (
                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Class Performance by Bloom's Level</h3>
                    <div style={{ height: '256px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bloomChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 12, fill: theme.textMuted }} />
                                <YAxis stroke={theme.textMuted} domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                                <Tooltip {...tooltipStyle} formatter={val => `${val}%`} />
                                <Bar dataKey="score" name="Score %" radius={[6, 6, 0, 0]} barSize={40}>
                                    {bloomChartData.map((d, i) => <Cell key={i} fill={BLOOM_COLORS[d.name] || '#8b5cf6'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Most Missed Questions (All Students)</h3>
                </div>
                <div>
                    {(mostMissedQuestions || []).map((q, i) => (
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
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{q.missedCount}</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted }}>students missed</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!mostMissedQuestions || mostMissedQuestions.length === 0) && (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>No quiz data available yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 4: LEADERBOARD
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
// VIEW 5: AT-RISK STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

const AtRiskView = ({ data, onStudentClick }) => {
    const { theme, accent } = useT();
    const { alerts, atRiskCount } = data;

    return (
        <div className="space-y-4">
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 20px' }}>
                <span style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 500 }}>{atRiskCount} student{atRiskCount !== 1 ? 's' : ''} flagged — review recommended.</span>
            </div>
            {(alerts || []).map(a => {
                const sev = a.severity === 'critical' ? RISK_COLORS.critical : RISK_COLORS.at_risk;
                return (
                    <div key={a.studentId}
                        style={{ background: theme.surface, border: `1px solid ${sev.border}`, borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => onStudentClick(a.studentId)}
                        onMouseEnter={e => e.currentTarget.style.background = `${theme.bg}`}
                        onMouseLeave={e => e.currentTarget.style.background = theme.surface}>
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', background: sev.bg, color: sev.text }}>{a.severity}</span>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>{a.name}</h3>
                                </div>
                                <p style={{ fontSize: '11px', color: theme.textMuted }}>{a.email}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: theme.textMuted }}>Last active {a.daysSinceActive}d ago</div>
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>Avg: {a.avgQuizScore}% • {a.completionPct}% done</div>
                            </div>
                        </div>
                        <div className="space-y-1 mb-3">
                            {(a.reasons || []).map((r, i) => (
                                <div key={i} className="flex items-center gap-2" style={{ fontSize: '13px', color: theme.textSecondary }}>
                                    <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />{r}
                                </div>
                            ))}
                        </div>
                        <div style={{ background: `${accent.from}10`, borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={14} style={{ color: accent.from }} />
                            <span style={{ fontSize: '13px', color: accent.from }}>{a.suggestedAction}</span>
                        </div>
                    </div>
                );
            })}
            {(!alerts || alerts.length === 0) && <EmptyState message="No at-risk students detected. Great job!" />}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 6: ENGAGEMENT
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
// VIEW 7: STUDENT DEEP-DIVE
// ═══════════════════════════════════════════════════════════════════════════════

const StudentDetailView = ({ data, onBack }) => {
    const { theme, accent, tooltipStyle } = useT();
    const { student, summary, bloomProfile, strengths, weaknesses, topicBreakdown, activityTimeline } = data;

    const bloomRadarData = BLOOM_ORDER.map(bl => ({ level: bl, score: bloomProfile?.[bl]?.percentage || 0 }));
    const activityData = (activityTimeline || []).map(d => ({
        date: d.date?.slice(5),
        minutes: Math.round((d.timeSpent || 0) / 60),
    }));
    const risk = RISK_COLORS[summary?.risk] || RISK_COLORS.on_track;

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
