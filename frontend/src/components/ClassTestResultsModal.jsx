import { useState, useEffect } from 'react';
import { X, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axios';

const fmtTime = (sec) => {
    if (!sec && sec !== 0) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const ClassTestResultsModal = ({ testId, testTitle, onClose, theme, accent }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/class-tests/${testId}/results`)
            .then(res => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [testId]);

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const rankStyle = (rank) => {
        if (rank === 1) return { bg: 'rgba(255,215,0,0.15)', color: '#ffd700', border: 'rgba(255,215,0,0.35)', icon: '🥇' };
        if (rank === 2) return { bg: 'rgba(192,192,192,0.12)', color: '#c0c0c0', border: 'rgba(192,192,192,0.3)', icon: '🥈' };
        if (rank === 3) return { bg: 'rgba(205,127,50,0.12)', color: '#cd7f32', border: 'rgba(205,127,50,0.3)', icon: '🥉' };
        return { bg: 'transparent', color: theme.textMuted, border: theme.border, icon: `#${rank}` };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: theme.surface, width: '100%', maxWidth: '640px', maxHeight: '85vh', borderRadius: '20px', display: 'flex', flexDirection: 'column', border: `1px solid ${theme.border}`, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <Trophy size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Sora', sans-serif" }}>
                            {testTitle} — Results
                        </h2>
                        {data?.test && (
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                                {data.test.totalQuestions} questions · {data.test.timeLimitMinutes} min limit
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                    ><X size={20} /></button>
                </div>

                {/* Stats chips */}
                {data?.stats && (
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: `1px solid ${theme.border}`, flexWrap: 'wrap', flexShrink: 0 }}>
                        {[
                            { label: 'Attempts', value: data.stats.total },
                            { label: 'Pass Rate', value: `${data.stats.passRate}%` },
                            { label: 'Avg Score', value: `${data.stats.avgScore}%` },
                            { label: 'Avg Time', value: fmtTime(data.stats.avgTimeSec) },
                        ].map(stat => (
                            <div key={stat.label} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary, fontFamily: "'Sora', sans-serif" }}>{stat.value}</div>
                                <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Results list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading && <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px', fontSize: '14px' }}>Loading results…</div>}
                    {!loading && (!data?.students || data.students.length === 0) && (
                        <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px', fontSize: '14px' }}>No attempts yet.</div>
                    )}
                    {(data?.students || []).map(s => {
                        const r = rankStyle(s.rank);
                        return (
                            <div key={s.studentId} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto auto auto', alignItems: 'center', gap: '12px', background: r.bg || theme.bg, border: `1px solid ${r.border || theme.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                                {/* Rank */}
                                <div style={{ fontSize: s.rank <= 3 ? '18px' : '13px', fontWeight: 700, color: r.color, textAlign: 'center' }}>
                                    {s.rank <= 3 ? r.icon : `#${s.rank}`}
                                </div>
                                {/* Name */}
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>{s.studentName}</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={9} /> {fmtTime(s.timeTakenSeconds)}
                                    </div>
                                </div>
                                {/* Score bar */}
                                <div style={{ width: '90px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#fbbf24' : '#ef4444' }}>{s.score}%</span>
                                        <span style={{ fontSize: '11px', color: theme.textMuted }}>{s.correctCount}/{s.totalQuestions}</span>
                                    </div>
                                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                                        <div style={{ height: '100%', width: `${Math.min(s.score, 100)}%`, background: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#fbbf24' : '#ef4444', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                    </div>
                                </div>
                                {/* Pass/fail */}
                                <div>
                                    {s.passed
                                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#22c55e' }}><CheckCircle size={13} /> Pass</span>
                                        : <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}><XCircle size={13} /> Fail</span>
                                    }
                                </div>
                                {/* Attempt # */}
                                <div style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                                    {s.attemptNumber > 1 ? `Attempt ${s.attemptNumber}` : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ClassTestResultsModal;
