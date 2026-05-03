import React, { useState, useEffect, useCallback } from 'react';
import {
    ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';
import { Users, TrendingUp, Target, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const RISK_CONFIG = [
    { key: 'on_track', label: 'On Track', color: '#22c55e' },
    { key: 'at_risk',  label: 'At Risk',  color: '#fbbf24' },
    { key: 'critical', label: 'Critical', color: '#ef4444' },
    { key: 'inactive', label: 'Inactive', color: '#6b7280' },
];

const RISK_SORT = { critical: 0, at_risk: 1, on_track: 2, inactive: 3 };

function relativeTime(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= 13) return `${days}d ago`;
    if (days < 60) return `${Math.round(days / 7)}w ago`;
    return `${Math.round(days / 30)}mo ago`;
}

function scoreColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#fbbf24';
    return '#ef4444';
}

function progressBarColor(pct) {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#fbbf24';
    return '#ef4444';
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────
function KPI({ icon: Icon, label, value, color, pulse, theme }) {
    return (
        <div style={{
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: '14px', padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={18} color={color} />
                </div>
                {pulse && (
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#ef4444', display: 'inline-block',
                        boxShadow: '0 0 0 3px rgba(239,68,68,0.2)',
                        animation: 'pulse 2s infinite',
                    }} />
                )}
            </div>
            <div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: theme.textPrimary, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px', fontWeight: 500 }}>{label}</div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: color, opacity: 0.4 }} />
        </div>
    );
}

// ── Custom Engagement Tooltip ─────────────────────────────────────────────────
function EngagementTooltip({ active, payload, label, theme }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
        }}>
            <div style={{ fontWeight: 700, color: theme.textPrimary, marginBottom: '6px' }}>{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
                    {p.name}: <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TeacherOverview({ courses }) {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [selectedCourseId, setSelectedCourseId] = useState(courses?.[0]?._id || '');
    const [overview, setOverview] = useState(null);
    const [atRisk, setAtRisk] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tick, setTick] = useState(0);

    const fetchData = useCallback(() => {
        if (!selectedCourseId) return;
        setLoading(true);
        Promise.all([
            api.get(`/analytics/${selectedCourseId}/overview`),
            api.get(`/analytics/${selectedCourseId}/at-risk`),
        ]).then(([ovRes, arRes]) => {
            setOverview(ovRes.data);
            setAtRisk(arRes.data.alerts || []);
        }).catch(err => console.error('TeacherOverview fetch error:', err))
          .finally(() => setLoading(false));
    }, [selectedCourseId, tick]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const engagementData = (overview?.engagementTrend || []).map(d => ({
        day: new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
        students: d.activeStudents || 0,
        minutes: Math.round((d.totalTimeSpent || 0) / 60),
    }));
    const hasEngagement = engagementData.some(d => d.students > 0 || d.minutes > 0);

    const pieData = RISK_CONFIG
        .map(r => ({ name: r.label, value: overview?.riskDistribution?.[r.key] || 0, color: r.color, key: r.key }))
        .filter(d => d.value > 0);

    const totalStudents = overview?.totalStudents || 0;

    const sortedStudents = [...(overview?.students || [])].sort((a, b) => {
        const ra = RISK_SORT[a.risk] ?? 99, rb = RISK_SORT[b.risk] ?? 99;
        if (ra !== rb) return ra - rb;
        return b.completionPct - a.completionPct;
    });

    const severityColor = { critical: '#ef4444', at_risk: '#fbbf24' };

    // ── Styles ────────────────────────────────────────────────────────────────
    const cardStyle = {
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: '16px', overflow: 'hidden',
    };
    const sectionLabel = {
        fontSize: '11px', fontWeight: 700, color: theme.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em',
    };

    if (!courses?.length) return (
        <div style={{ padding: '40px', color: theme.textMuted, textAlign: 'center', fontSize: '14px' }}>
            No courses yet. Create a course to see analytics here.
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '28px' }}>

            {/* ── Header row ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    style={{
                        flex: 1, minWidth: '200px', maxWidth: '340px',
                        background: theme.surface, border: `1px solid ${theme.border}`,
                        borderRadius: '10px', padding: '9px 14px', color: theme.textPrimary,
                        fontSize: '14px', fontWeight: 600, outline: 'none',
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}
                >
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
                <button
                    onClick={() => setTick(t => t + 1)}
                    title="Refresh data"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: theme.surface, border: `1px solid ${theme.border}`,
                        borderRadius: '10px', padding: '9px 14px', color: theme.textMuted,
                        fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                        transition: 'color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = accent.from}
                    onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                >
                    <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>

            {/* ── KPI Strip ──────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <KPI icon={Users}         label="Total Students"   value={totalStudents}                                        color="#3b82f6" theme={theme} />
                <KPI icon={TrendingUp}    label="Avg Completion"   value={`${overview?.summary?.avgCompletion ?? 0}%`}           color={accent.from} theme={theme} />
                <KPI icon={Target}        label="Avg Quiz Score"   value={`${overview?.summary?.avgScore ?? 0}%`}                color={scoreColor(overview?.summary?.avgScore ?? 0)} theme={theme} />
                <KPI icon={Clock}         label="Active This Week" value={overview?.summary?.activeIn7Days ?? 0}                 color="#a78bfa" theme={theme} />
                <KPI icon={AlertTriangle} label="At-Risk Students" value={atRisk.length}                                         color="#ef4444" pulse={atRisk.length > 0} theme={theme} />
            </div>

            {/* ── Engagement + Risk row ───────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>

                {/* 7-Day Engagement */}
                <div style={cardStyle}>
                    <div style={{ padding: '18px 20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <span style={sectionLabel}>7-Day Engagement</span>
                        </div>
                    </div>
                    {!hasEngagement ? (
                        <div style={{
                            padding: '40px 24px', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: `${accent.from}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TrendingUp size={22} color={accent.from} />
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.textPrimary }}>No activity in the last 7 days</div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, maxWidth: '280px', lineHeight: 1.6 }}>
                                Consider sending a reminder to students or checking course accessibility.
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '0 12px 16px' }}>
                            <ResponsiveContainer width="100%" height={210}>
                                <ComposedChart data={engagementData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="stuGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={accent.from} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={accent.from} stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border}`} vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: theme.textMuted }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left"  orientation="left"  tick={{ fontSize: 10, fill: theme.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: theme.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<EngagementTooltip theme={theme} />} />
                                    <Area
                                        yAxisId="left" type="monotone" dataKey="students"
                                        name="Active Students" stroke={accent.from} strokeWidth={2.5}
                                        fill="url(#stuGrad)" dot={{ r: 4, fill: accent.from, strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: accent.from }}
                                    />
                                    <Bar
                                        yAxisId="right" dataKey="minutes" name="Minutes Spent"
                                        fill="#a78bfa" opacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={28}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '4px' }}>
                                {[{ color: accent.from, label: 'Active Students' }, { color: '#a78bfa', label: 'Minutes Spent' }].map(l => (
                                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: theme.textMuted }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
                                        {l.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Risk Distribution */}
                <div style={cardStyle}>
                    <div style={{ padding: '18px 20px 0', marginBottom: '4px' }}>
                        <span style={sectionLabel}>Risk Distribution</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px 0' }}>
                        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1, color: theme.border }]}
                                        cx="50%" cy="50%"
                                        innerRadius={54} outerRadius={80}
                                        dataKey="value" stroke="none" paddingAngle={pieData.length > 1 ? 2 : 0}
                                    >
                                        {(pieData.length > 0 ? pieData : [{ color: theme.border }]).map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            {/* center label */}
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center', pointerEvents: 'none',
                            }}>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: theme.textPrimary, lineHeight: 1 }}>{totalStudents}</div>
                                <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '3px' }}>Students</div>
                            </div>
                        </div>

                        {/* Legend — always show all 4 */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0 18px' }}>
                            {RISK_CONFIG.map(r => {
                                const count = overview?.riskDistribution?.[r.key] || 0;
                                const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                                return (
                                    <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: '13px', color: count > 0 ? theme.textPrimary : theme.textMuted, fontWeight: count > 0 ? 600 : 400 }}>
                                            {r.label}
                                        </span>
                                        <span style={{ fontSize: '12px', color: theme.textMuted }}>{pct}%</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: count > 0 ? r.color : theme.textMuted, minWidth: '20px', textAlign: 'right' }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Needs Attention ─────────────────────────────────────────── */}
            {atRisk.length > 0 && (
                <div>
                    <div style={{ ...sectionLabel, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={13} color="#ef4444" />
                        Needs Attention — {atRisk.length} student{atRisk.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '12px' }}>
                        {atRisk.map((s, i) => (
                            <div key={i} style={{
                                background: theme.surface, border: `1px solid ${theme.border}`,
                                borderLeft: `4px solid ${severityColor[s.severity] || '#6b7280'}`,
                                borderRadius: '12px', padding: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '50%',
                                        background: `${severityColor[s.severity] || '#6b7280'}18`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '13px', fontWeight: 700,
                                        color: severityColor[s.severity] || '#6b7280', flexShrink: 0,
                                    }}>
                                        {s.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                                        background: `${severityColor[s.severity] || '#6b7280'}14`,
                                        color: severityColor[s.severity] || '#6b7280',
                                        border: `1px solid ${severityColor[s.severity] || '#6b7280'}30`,
                                        textTransform: 'capitalize', flexShrink: 0,
                                    }}>
                                        {s.severity?.replace('_', ' ')}
                                    </span>
                                </div>
                                <ul style={{ margin: '0 0 10px', padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {(s.reasons || []).map((r, j) => (
                                        <li key={j} style={{ fontSize: '12px', color: theme.textSecondary || theme.textMuted, lineHeight: 1.5 }}>{r}</li>
                                    ))}
                                </ul>
                                <div style={{ fontSize: '12px', color: theme.textMuted, fontStyle: 'italic', borderTop: `1px solid ${theme.border}`, paddingTop: '8px' }}>
                                    → {s.suggestedAction}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    {[
                                        { label: `${s.completionPct}% done`, color: progressBarColor(s.completionPct) },
                                        { label: `${s.avgQuizScore}% score`, color: scoreColor(s.avgQuizScore) },
                                    ].map(chip => (
                                        <span key={chip.label} style={{
                                            fontSize: '11px', fontWeight: 600, padding: '2px 9px',
                                            borderRadius: '99px', background: `${chip.color}14`,
                                            color: chip.color, border: `1px solid ${chip.color}30`,
                                        }}>
                                            {chip.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── All Students Table ──────────────────────────────────────── */}
            {sortedStudents.length > 0 && (
                <div>
                    <div style={{ ...sectionLabel, marginBottom: '12px' }}>All Students — {sortedStudents.length}</div>
                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: `${theme.bg}80` }}>
                                    {['Student', 'Progress', 'Avg Score', 'Status', 'Last Active'].map(h => (
                                        <th key={h} style={{
                                            padding: '11px 16px', textAlign: 'left',
                                            fontSize: '11px', fontWeight: 700, color: theme.textMuted,
                                            textTransform: 'uppercase', letterSpacing: '0.07em',
                                            borderBottom: `1px solid ${theme.border}`,
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((s, i) => {
                                    const rc = RISK_CONFIG.find(r => r.key === s.risk) || RISK_CONFIG[0];
                                    const barColor = progressBarColor(s.completionPct);
                                    return (
                                        <tr key={i}
                                            style={{ borderBottom: i < sortedStudents.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}06`}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: `${rc.color}18`, border: `1px solid ${rc.color}30`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '12px', fontWeight: 700, color: rc.color, flexShrink: 0,
                                                    }}>
                                                        {s.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>{s.name}</div>
                                                        <div style={{ fontSize: '11px', color: theme.textMuted }}>{s.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', minWidth: '120px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: `${barColor}20`, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${s.completionPct}%`, background: barColor, borderRadius: '99px', transition: 'width .4s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: barColor, minWidth: '34px', textAlign: 'right' }}>
                                                        {s.completionPct}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(s.avgQuizScore) }}>
                                                    {s.avgQuizScore}%
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                                                    borderRadius: '99px', background: `${rc.color}14`,
                                                    color: rc.color, border: `1px solid ${rc.color}30`,
                                                }}>
                                                    {rc.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: theme.textMuted }}>
                                                {relativeTime(s.daysSinceActive)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && !overview && (
                <div style={{ padding: '40px', textAlign: 'center', color: theme.textMuted, fontSize: '13px' }}>
                    Select a course to view analytics.
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.2)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0.1)} }
            `}</style>
        </div>
    );
}
