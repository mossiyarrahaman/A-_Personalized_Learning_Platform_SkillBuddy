import { useState, useEffect } from 'react';
import { X, Download, FileText, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import api from '../api/axios';

const AssignmentReviewPanel = ({ assignmentId, maxPoints, title, onClose, theme, accent }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gradeInputs, setGradeInputs] = useState({});  // { [subId]: { grade, feedback } }
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});

    useEffect(() => {
        api.get(`/assignments/${assignmentId}/submissions`)
            .then(res => {
                setSubmissions(res.data.submissions || []);
                const inputs = {};
                (res.data.submissions || []).forEach(s => {
                    inputs[s._id] = { grade: s.grade ?? '', feedback: s.feedback || '' };
                });
                setGradeInputs(inputs);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [assignmentId]);

    const handleReturn = async (subId) => {
        const input = gradeInputs[subId];
        const gradeNum = Number(input?.grade);
        if (input?.grade === '' || isNaN(gradeNum) || gradeNum < 0 || gradeNum > maxPoints) {
            alert(`Please enter a grade between 0 and ${maxPoints}`);
            return;
        }
        setSaving(s => ({ ...s, [subId]: true }));
        try {
            const res = await api.patch(`/assignments/${assignmentId}/submissions/${subId}/grade`, {
                grade: gradeNum,
                feedback: input.feedback || '',
            });
            setSubmissions(prev => prev.map(s => s._id === subId ? res.data.submission : s));
            setSaved(v => ({ ...v, [subId]: true }));
            setTimeout(() => setSaved(v => ({ ...v, [subId]: false })), 3000);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save grade');
        } finally {
            setSaving(s => ({ ...s, [subId]: false }));
        }
    };

    const statusColor = (status) => {
        if (status === 'returned') return '#22c55e';
        if (status === 'submitted') return '#fbbf24';
        return theme.textMuted;
    };

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: theme.surface, width: '100%', maxWidth: '760px', height: '88vh', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', border: `1px solid ${theme.border}`, fontFamily: "'DM Sans', sans-serif" }}>

                {/* Header */}
                <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Sora', sans-serif" }}>
                            {title}
                        </h2>
                        <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} · Max: {maxPoints} points
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                    ><X size={20} /></button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {loading && (
                        <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px', fontSize: '14px' }}>Loading submissions…</div>
                    )}
                    {!loading && submissions.length === 0 && (
                        <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px', fontSize: '14px' }}>No submissions yet.</div>
                    )}
                    {submissions.map(sub => (
                        <div key={sub._id} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Student header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: aGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                    {(sub.studentId?.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>{sub.studentId?.name || 'Unknown'}</div>
                                    {sub.submittedAt && (
                                        <div style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={10} /> Submitted {new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    )}
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: sub.status === 'returned' ? 'rgba(34,197,94,0.12)' : sub.status === 'submitted' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.06)', color: statusColor(sub.status), border: `1px solid ${sub.status === 'returned' ? 'rgba(34,197,94,0.3)' : sub.status === 'submitted' ? 'rgba(251,191,36,0.3)' : theme.border}` }}>
                                    {sub.status === 'returned' ? `✓ Returned · ${sub.grade}/${maxPoints}` : sub.status === 'submitted' ? 'Submitted' : 'Not submitted'}
                                </span>
                            </div>

                            {/* Text response */}
                            {sub.textResponse && (
                                <div style={{ background: theme.surface, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.55, maxHeight: '120px', overflowY: 'auto', border: `1px solid ${theme.border}` }}>
                                    {sub.textResponse}
                                </div>
                            )}

                            {/* Files */}
                            {sub.files?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {sub.files.map((f, i) => (
                                        <a key={i} href={f.fileUrl} download target="_blank" rel="noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', color: theme.textSecondary, textDecoration: 'none', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                                        >
                                            <FileText size={11} /> {f.fileName} <Download size={10} />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Grading row */}
                            {(sub.status === 'submitted' || sub.status === 'returned') && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', borderTop: `1px solid ${theme.border}`, paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px', flexShrink: 0 }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grade</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number" min="0" max={maxPoints}
                                                value={gradeInputs[sub._id]?.grade ?? ''}
                                                onChange={e => setGradeInputs(g => ({ ...g, [sub._id]: { ...g[sub._id], grade: e.target.value } }))}
                                                style={{ width: '60px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 7px', fontSize: '13px', fontWeight: 700, color: theme.textPrimary, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
                                            />
                                            <span style={{ fontSize: '12px', color: theme.textMuted }}>/ {maxPoints}</span>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MessageSquare size={10} /> Feedback
                                        </label>
                                        <textarea
                                            value={gradeInputs[sub._id]?.feedback ?? ''}
                                            onChange={e => setGradeInputs(g => ({ ...g, [sub._id]: { ...g[sub._id], feedback: e.target.value } }))}
                                            rows={2}
                                            placeholder="Optional feedback for student…"
                                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 9px', fontSize: '12px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                        <button onClick={() => handleReturn(sub._id)} disabled={saving[sub._id]}
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: saved[sub._id] ? 'rgba(34,197,94,0.85)' : aGrad, border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '12px', color: '#fff', fontWeight: 700, cursor: saving[sub._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving[sub._id] ? 0.6 : 1, whiteSpace: 'nowrap' }}
                                        >
                                            <CheckCircle size={13} />
                                            {saving[sub._id] ? 'Saving…' : saved[sub._id] ? 'Returned!' : sub.status === 'returned' ? 'Update' : 'Return to Student'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssignmentReviewPanel;
