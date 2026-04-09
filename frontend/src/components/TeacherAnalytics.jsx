import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Area, AreaChart
} from 'recharts';
import {
    Loader, Users, AlertTriangle, Brain, Trophy, Clock,
    ChevronRight, ArrowLeft, TrendingUp, TrendingDown, Target,
    BookOpen, HelpCircle, Eye, Activity, Shield, Zap,
    CheckCircle, XCircle, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import api from '../api/axios';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

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

const TOOLTIP_STYLE = {
    contentStyle: { backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '13px' },
    cursor: { fill: 'rgba(139,92,246,0.08)' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TeacherAnalytics = ({ courses = [] }) => {
    const safeCourses = Array.isArray(courses) ? courses : [];
    const [selectedCourse, setSelectedCourse] = useState(safeCourses[0]?._id || '');
    const [activeView, setActiveView] = useState('overview');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Update selected course when courses load after initial render
    useEffect(() => {
        if (!selectedCourse && safeCourses.length > 0) {
            setSelectedCourse(safeCourses[0]._id);
        }
    }, [safeCourses.length]);

    const views = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'topics', label: 'Topics', icon: BookOpen },
        { id: 'quiz-analysis', label: 'Quiz Forensics', icon: Brain },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'at-risk', label: 'At-Risk', icon: AlertTriangle },
        { id: 'engagement', label: 'Engagement', icon: TrendingUp },
    ];

    // Fetch data when course or view changes
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
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(endpoint);
            setData(res.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const openStudentDetail = (studentId) => {
        setSelectedStudentId(studentId);
        setActiveView('student-detail');
    };

    const backFromStudent = () => {
        setSelectedStudentId(null);
        setActiveView('overview');
    };

    if (safeCourses.length === 0) {
        return <EmptyState message="Create a course and enroll students to see analytics." />;
    }

    return (
        <div className="space-y-6">
            {/* Course Selector + View Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <select
                        value={selectedCourse}
                        onChange={(e) => { setSelectedCourse(e.target.value); setActiveView('overview'); setSelectedStudentId(null); }}
                        className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium min-w-[200px]"
                    >
                        {safeCourses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                    </select>

                    {activeView === 'student-detail' && (
                        <button onClick={backFromStudent} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition">
                            <ArrowLeft size={16} /> Back to Overview
                        </button>
                    )}
                </div>

                {activeView !== 'student-detail' && (
                    <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50 overflow-x-auto">
                        {views.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setActiveView(v.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeView === v.id
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <v.icon size={15} />
                                {v.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : error ? (
                <ErrorState message={error} onRetry={() => setActiveView(activeView)} />
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
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1: CLASS OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewView = ({ data, onStudentClick }) => {
    const { summary, riskDistribution, engagementTrend, students } = data;

    const riskData = Object.entries(riskDistribution || {}).map(([key, val]) => ({
        name: RISK_COLORS[key]?.label || key, value: val, color: RISK_COLORS[key]?.text || '#9ca3af',
    })).filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard label="Students" value={data.totalStudents} icon={Users} color="#8b5cf6" />
                <KPICard label="Avg Progress" value={`${summary?.avgCompletion || 0}%`} icon={Target} color="#3b82f6" />
                <KPICard label="Avg Quiz Score" value={`${summary?.avgScore || 0}%`} icon={Brain} color="#10b981" />
                <KPICard label="Avg Study Time" value={summary?.avgTimeSpent || '0h'} icon={Clock} color="#f59e0b" />
                <KPICard label="Active (7d)" value={`${summary?.activeRate || 0}%`} icon={Activity} color="#ef4444"
                    subtitle={`${summary?.activeIn7Days || 0} students`} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Engagement Trend */}
                <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">14-Day Engagement</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementTrend || []}>
                                <defs>
                                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }}
                                    tickFormatter={d => d?.slice(5)} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Area type="monotone" dataKey="activeStudents" stroke="#8b5cf6" strokeWidth={2}
                                    fill="url(#engGrad)" name="Active Students" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Risk Distribution</h3>
                    {riskData.length > 0 ? (
                        <>
                            <div className="h-40 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                            innerRadius={40} outerRadius={65} paddingAngle={3}>
                                            {riskData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip {...TOOLTIP_STYLE} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {riskData.map(d => (
                                    <div key={d.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                            <span className="text-gray-300">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-white">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : <p className="text-gray-500 text-sm text-center mt-8">No data yet</p>}
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">All Students</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-750 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 text-left">Student</th>
                                <th className="px-4 py-3 text-center">Progress</th>
                                <th className="px-4 py-3 text-center">Avg Score</th>
                                <th className="px-4 py-3 text-center">Time</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Last Active</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {(students || []).map(s => {
                                const risk = RISK_COLORS[s.risk] || RISK_COLORS.on_track;
                                return (
                                    <tr key={s.studentId} className="hover:bg-white/[0.02] transition">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-white">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${s.completionPct}%` }} />
                                                </div>
                                                <span className="text-xs font-mono text-gray-300">{s.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-bold ${s.avgQuizScore >= 70 ? 'text-green-400' : s.avgQuizScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {s.avgQuizScore}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-300">{s.totalTimeFormatted}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>
                                                {risk.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                                            {s.daysSinceActive === 0 ? 'Today' : `${s.daysSinceActive}d ago`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => onStudentClick(s.studentId)}
                                                className="p-1.5 rounded-lg hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition">
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
    const { topics, needsAttention } = data;

    return (
        <div className="space-y-6">
            {needsAttention > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
                    <span className="text-red-300 text-sm font-medium">{needsAttention} topic{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention based on student performance.</span>
                </div>
            )}

            <div className="space-y-4">
                {(topics || []).map(topic => {
                    const attn = ATTENTION_STYLES[topic.attention] || ATTENTION_STYLES.ok;
                    const AttnIcon = attn.icon;
                    const bloomData = BLOOM_ORDER
                        .filter(bl => topic.bloomPerformance?.[bl])
                        .map(bl => ({ name: bl, pct: topic.bloomPerformance[bl].percentage, full: 100 }));

                    return (
                        <div key={topic.topicId} className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AttnIcon size={16} style={{ color: attn.text }} />
                                        <h3 className="text-lg font-bold text-white">{topic.title}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500">{topic.moduleTitle} • {topic.totalAttempts} quiz attempts</p>
                                </div>
                                <div className="flex gap-3 text-right">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase">Avg Score</div>
                                        <div className={`text-xl font-bold ${(topic.avgScore || 0) >= 70 ? 'text-green-400' : (topic.avgScore || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {topic.avgScore ?? '—'}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase">Fail Rate</div>
                                        <div className="text-xl font-bold text-gray-300">{topic.failRate}%</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase">Completion</div>
                                        <div className="text-xl font-bold text-gray-300">{topic.completionRate}%</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bloom's Breakdown */}
                                {bloomData.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bloom's Performance</h4>
                                        <div className="space-y-2">
                                            {bloomData.map(b => (
                                                <div key={b.name} className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400 w-20 capitalize">{b.name}</span>
                                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${b.pct}%`, background: BLOOM_COLORS[b.name] }} />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-300 w-10 text-right">{b.pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Most Missed Questions */}
                                {(topic.topWrongQuestions || []).length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Most Missed Questions</h4>
                                        <div className="space-y-2">
                                            {topic.topWrongQuestions.map((q, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-red-400 font-bold text-xs mt-0.5">{q.missedBy}×</span>
                                                    <span className="text-gray-300 line-clamp-2">{q.questionText}</span>
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
    const { bloomPerformance, mostMissedQuestions } = data;

    const bloomChartData = BLOOM_ORDER
        .filter(bl => bloomPerformance?.[bl])
        .map(bl => ({ name: bl, score: bloomPerformance[bl].percentage, total: bloomPerformance[bl].total }));

    return (
        <div className="space-y-6">
            {/* Bloom's Class Performance */}
            {bloomChartData.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Class Performance by Bloom's Level</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bloomChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#6b7280" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(val) => `${val}%`} />
                                <Bar dataKey="score" name="Score %" radius={[6, 6, 0, 0]} barSize={40}>
                                    {bloomChartData.map((d, i) => <Cell key={i} fill={BLOOM_COLORS[d.name] || '#8b5cf6'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Most Missed Questions */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Most Missed Questions (All Students)</h3>
                </div>
                <div className="divide-y divide-gray-700/50">
                    {(mostMissedQuestions || []).map((q, i) => (
                        <div key={i} className="px-6 py-4 hover:bg-white/[0.02]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium mb-2">{q.questionText}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {q.topic && <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{q.topic}</span>}
                                        {q.bloomLevel && <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: `${BLOOM_COLORS[q.bloomLevel]}20`, color: BLOOM_COLORS[q.bloomLevel] }}>{q.bloomLevel}</span>}
                                        {q.difficulty && <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400 capitalize">{q.difficulty}</span>}
                                    </div>
                                    {(q.commonWrongAnswers || []).length > 0 && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Common wrong picks: {q.commonWrongAnswers.map(a => `"${a.answer}" (${a.count}×)`).join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-2xl font-bold text-red-400">{q.missedCount}</div>
                                    <div className="text-xs text-gray-500">students missed</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!mostMissedQuestions || mostMissedQuestions.length === 0) && (
                        <div className="px-6 py-8 text-center text-gray-500 text-sm">No quiz data available yet.</div>
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
    const { leaderboard } = data;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ranked by Composite Score</h3>
                <span className="text-xs text-gray-500">40% completion + 40% quiz + 20% time</span>
            </div>
            <div className="divide-y divide-gray-700/50">
                {(leaderboard || []).map(s => (
                    <div key={s.studentId} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition cursor-pointer"
                        onClick={() => onStudentClick(s.studentId)}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                s.rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                                    s.rank === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        'bg-gray-700 text-gray-400'
                            }`}>
                            {s.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{s.name}</div>
                            <div className="text-xs text-gray-500 truncate">{s.email}</div>
                        </div>
                        <div className="flex gap-6 text-center flex-shrink-0">
                            <div><div className="text-xs text-gray-500">Score</div><div className="font-bold text-purple-400">{s.compositeScore}</div></div>
                            <div><div className="text-xs text-gray-500">Progress</div><div className="font-bold text-white">{s.completionPct}%</div></div>
                            <div><div className="text-xs text-gray-500">Quiz</div><div className="font-bold text-white">{s.avgQuizScore}%</div></div>
                            <div><div className="text-xs text-gray-500">Streak</div><div className="font-bold text-yellow-400">{s.streak}d</div></div>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
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
    const { alerts, atRiskCount } = data;

    return (
        <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
                <span className="text-red-300 text-sm font-medium">{atRiskCount} student{atRiskCount !== 1 ? 's' : ''} flagged — review recommended.</span>
            </div>

            {(alerts || []).map(a => {
                const sev = a.severity === 'critical' ? RISK_COLORS.critical : RISK_COLORS.at_risk;
                return (
                    <div key={a.studentId} className="bg-gray-800 border rounded-2xl p-6 cursor-pointer hover:bg-white/[0.02] transition"
                        style={{ borderColor: sev.border }}
                        onClick={() => onStudentClick(a.studentId)}>
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: sev.bg, color: sev.text }}>
                                        {a.severity}
                                    </span>
                                    <h3 className="text-lg font-bold text-white">{a.name}</h3>
                                </div>
                                <p className="text-xs text-gray-500">{a.email}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400">Last active {a.daysSinceActive}d ago</div>
                                <div className="text-xs text-gray-500">Avg: {a.avgQuizScore}% • {a.completionPct}% done</div>
                            </div>
                        </div>

                        <div className="space-y-1 mb-3">
                            {(a.reasons || []).map((r, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                    <AlertTriangle size={13} className="text-yellow-500 flex-shrink-0" />
                                    {r}
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-900/50 rounded-lg px-4 py-2.5 flex items-center gap-2">
                            <Zap size={14} className="text-purple-400" />
                            <span className="text-sm text-purple-300">{a.suggestedAction}</span>
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
    const { timeDistribution, resourceCompletionRates, avgTotalTime } = data;

    const timeData = Object.entries(timeDistribution || {}).map(([range, count]) => ({ range, count }));

    return (
        <div className="space-y-6">
            <KPICard label="Avg Total Study Time" value={avgTotalTime || '0h'} icon={Clock} color="#8b5cf6" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Time Distribution */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Study Time Distribution</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="range" stroke="#6b7280" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Resource Completion */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resource Completion (Lowest First)</h3>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                        {(resourceCompletionRates || []).map((r, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 w-32 truncate" title={r.title}>{r.title}</span>
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${r.completionRate}%`, background: r.completionRate < 30 ? '#ef4444' : r.completionRate < 60 ? '#f59e0b' : '#10b981' }} />
                                </div>
                                <span className="text-xs font-mono text-gray-300 w-10 text-right">{r.completionRate}%</span>
                            </div>
                        ))}
                        {(!resourceCompletionRates || resourceCompletionRates.length === 0) && <p className="text-gray-500 text-sm">No resource data yet.</p>}
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
    const { student, summary, bloomProfile, strengths, weaknesses, topicBreakdown, activityTimeline } = data;

    const bloomRadarData = BLOOM_ORDER.map(bl => ({
        level: bl,
        score: bloomProfile?.[bl]?.percentage || 0,
    }));

    const activityData = (activityTimeline || []).map(d => ({
        date: d.date?.slice(5),
        minutes: Math.round((d.timeSpent || 0) / 60),
        active: d.active ? 1 : 0,
    }));

    const risk = RISK_COLORS[summary?.risk] || RISK_COLORS.on_track;

    return (
        <div className="space-y-6">
            {/* Student Header */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{student?.name}</h2>
                    <p className="text-sm text-gray-400">{student?.email}</p>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}>
                        {risk.label}
                    </span>
                    <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1">
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard label="Completion" value={`${summary?.completionPct || 0}%`} icon={Target} color="#8b5cf6" />
                <KPICard label="Avg Quiz Score" value={`${summary?.avgQuizScore || 0}%`} icon={Brain} color="#10b981" />
                <KPICard label="Study Time" value={summary?.totalTimeSpent || '0h'} icon={Clock} color="#3b82f6" />
                <KPICard label="Quizzes Taken" value={summary?.quizzesTaken || 0} icon={BookOpen} color="#f59e0b" />
                <KPICard label="Last Active" value={summary?.daysSinceActive === 0 ? 'Today' : `${summary?.daysSinceActive}d ago`} icon={Activity} color="#ef4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bloom's Radar */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Bloom's Proficiency</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={bloomRadarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="#374151" />
                                <PolarAngleAxis dataKey="level" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">30-Day Activity</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Area type="monotone" dataKey="minutes" stroke="#10b981" fill="url(#actGrad)" name="Minutes" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle size={14} /> Strengths
                    </h3>
                    {(strengths || []).length > 0 ? (
                        <div className="space-y-2">
                            {strengths.map((s, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{s.title}</span>
                                    <span className="font-bold text-green-400">{s.score}%</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-gray-500 text-sm">No quiz data yet</p>}
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <XCircle size={14} /> Weaknesses
                    </h3>
                    {(weaknesses || []).length > 0 ? (
                        <div className="space-y-3">
                            {weaknesses.map((w, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-300">{w.title}</span>
                                        <span className="font-bold text-red-400">{w.score}%</span>
                                    </div>
                                    {(w.wrongQuestions || []).map((wq, j) => (
                                        <div key={j} className="text-xs text-gray-500 pl-3 border-l border-gray-700 ml-1 mb-1">
                                            ✗ {wq.questionText?.slice(0, 80)}...
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-gray-500 text-sm">No quiz data yet</p>}
                </div>
            </div>

            {/* Topic-by-Topic Breakdown */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Topic-by-Topic Breakdown</h3>
                </div>
                <div className="divide-y divide-gray-700/50">
                    {(topicBreakdown || []).map(t => (
                        <div key={t.topicId} className="px-6 py-3 flex items-center gap-4 text-sm">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'completed' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-white truncate">{t.title}</div>
                                <div className="text-xs text-gray-500">{t.moduleTitle}</div>
                            </div>
                            <div className="text-center w-16">
                                <div className="text-xs text-gray-500">Best</div>
                                <div className={`font-bold ${(t.bestScore || 0) >= 70 ? 'text-green-400' : 'text-red-400'}`}>{t.bestScore ?? '—'}</div>
                            </div>
                            <div className="text-center w-16">
                                <div className="text-xs text-gray-500">Time</div>
                                <div className="text-gray-300">{t.timeFormatted}</div>
                            </div>
                            <div className="text-center w-16">
                                <div className="text-xs text-gray-500">Res.</div>
                                <div className="text-gray-300">{t.resourcesCompleted}/{t.totalResources}</div>
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

const KPICard = ({ label, value, icon: Icon, color, subtitle }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 relative overflow-hidden">
        <div className="absolute top-[-10px] right-[-10px] w-14 h-14 rounded-full" style={{ background: `${color}12` }} />
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="p-2 rounded-lg" style={{ background: `${color}18`, color }}>
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const EmptyState = ({ message }) => (
    <div className="text-center py-16 text-gray-500">
        <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p>{message}</p>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
        <p className="text-red-400 mb-4">{message}</p>
        <button onClick={onRetry} className="text-sm text-purple-400 hover:text-purple-300 font-medium">Try again</button>
    </div>
);

export default TeacherAnalytics;