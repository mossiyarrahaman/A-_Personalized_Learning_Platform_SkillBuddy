import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit, Trash2, Save, XCircle, Loader, CheckCircle, Plus, Sparkles, PenLine } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'mixed'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const TIERS = ['beginner', 'intermediate', 'advanced'];
const TIER_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const TIER_COLOR = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#ef4444' };

const bloomColors = {
    remember: '#8b5cf6', understand: '#3b82f6', apply: '#10b981',
    analyze: '#f59e0b', evaluate: '#ef4444', create: '#ec4899', mixed: '#6b7280',
};
const diffColors = { easy: '#22c55e', medium: '#fbbf24', hard: '#ef4444' };

const stripOptPrefix = (s) => (typeof s === 'string' ? s.replace(/^[A-Da-d][).]\s*/, '').trim() : s || '');

const emptyCustomForm = (tier = 'beginner') => ({
    questionText: '',
    options: OPTION_LABELS.map(label => ({ label, text: '', isCorrect: false })),
    explanation: '',
    difficulty: 'medium',
    bloomLevel: 'understand',
    difficultyTier: tier,
});

const TeacherQuizEditor = ({ courseId, topicId, topicTitle, onClose, onUpdate }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTier, setActiveTier] = useState('beginner');
    const [tierPublished, setTierPublished] = useState({ beginner: false, intermediate: false, advanced: false });
    const [publishing, setPublishing] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState({});
    const [deleting, setDeleting] = useState({});
    const [saveSuccess, setSaveSuccess] = useState({});

    const [addMode, setAddMode] = useState(null);
    const [customForm, setCustomForm] = useState(emptyCustomForm());
    const [addingSingle, setAddingSingle] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiDifficulty, setAiDifficulty] = useState('medium');
    const [aiBloom, setAiBloom] = useState('understand');
    const [notification, setNotification] = useState(null);

    const notify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchQuestions();
        fetchPublishedState();
    }, [courseId, topicId]);

    const fetchQuestions = () => {
        setLoading(true);
        api.get(`/rag/questions/${courseId}?topicId=${topicId}&limit=100`)
            .then(r => setQuestions(r.data.questions || []))
            .catch(() => setQuestions([]))
            .finally(() => setLoading(false));
    };

    const fetchPublishedState = () => {
        api.get(`/rag/topic-quizzes/${courseId}`)
            .then(r => {
                const entry = r.data.quizzes?.[topicId];
                if (entry?.tiers) {
                    setTierPublished({
                        beginner:     entry.tiers.beginner?.published     || false,
                        intermediate: entry.tiers.intermediate?.published || false,
                        advanced:     entry.tiers.advanced?.published     || false,
                    });
                }
            })
            .catch(() => {});
    };

    const handlePublishTier = async (tier, pub) => {
        setPublishing(true);
        try {
            await api.post('/rag/publish-quiz-tier', { courseId, topicId, tier, published: pub });
            setTierPublished(prev => ({ ...prev, [tier]: pub }));
            if (onUpdate) onUpdate(questions.length, pub);
        } catch {
            notify('error', 'Failed to update publish status. Please try again.');
        } finally {
            setPublishing(false);
        }
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const tierCounts = useMemo(() => ({
        beginner:     questions.filter(q => q.difficultyTier === 'beginner').length,
        intermediate: questions.filter(q => q.difficultyTier === 'intermediate').length,
        advanced:     questions.filter(q => q.difficultyTier === 'advanced').length,
    }), [questions]);

    const displayedQuestions = useMemo(() =>
        questions.filter(q => q.difficultyTier === activeTier),
        [questions, activeTier]
    );

    // ── Edit ──────────────────────────────────────────────────────────────────
    const startEdit = (q) => {
        setEditingId(q._id);
        setEditForm({
            questionText:  q.questionText || '',
            options: (q.options || []).map((o, i) => ({
                label: o.label || String.fromCharCode(65 + i),
                text: stripOptPrefix(o.text),
                isCorrect: o.isCorrect,
            })),
            explanation:   q.explanation   || '',
            difficulty:    q.difficulty    || 'medium',
            bloomLevel:    q.bloomLevel    || 'understand',
            difficultyTier: q.difficultyTier || 'beginner',
        });
    };
    const cancelEdit = () => { setEditingId(null); setEditForm(null); };
    const setCorrectOption = (label) =>
        setEditForm(f => ({ ...f, options: f.options.map(o => ({ ...o, isCorrect: o.label === label })) }));
    const setOptionText = (label, text) =>
        setEditForm(f => ({ ...f, options: f.options.map(o => o.label === label ? { ...o, text } : o) }));

    const saveEdit = async (id) => {
        setSaving(s => ({ ...s, [id]: true }));
        try {
            const res = await api.patch(`/rag/questions/${id}`, {
                questionText:   editForm.questionText,
                options:        editForm.options,
                explanation:    editForm.explanation,
                difficulty:     editForm.difficulty,
                bloomLevel:     editForm.bloomLevel,
                difficultyTier: editForm.difficultyTier,
            });
            setQuestions(qs => qs.map(q => q._id === id ? res.data.question : q));
            setEditingId(null);
            setEditForm(null);
            setSaveSuccess(s => ({ ...s, [id]: true }));
            setTimeout(() => setSaveSuccess(s => ({ ...s, [id]: false })), 2000);
        } catch (err) {
            notify('error', err.response?.data?.error || 'Failed to save question.');
        } finally {
            setSaving(s => ({ ...s, [id]: false }));
        }
    };

    const deleteQuestion = async (id) => {
        if (!confirm('Delete this question? This cannot be undone.')) return;
        setDeleting(d => ({ ...d, [id]: true }));
        try {
            await api.delete(`/rag/questions/${id}`);
            const newQs = questions.filter(q => q._id !== id);
            setQuestions(newQs);
            if (onUpdate) onUpdate(newQs.length);
        } catch (err) {
            notify('error', err.response?.data?.error || 'Failed to delete question.');
        } finally {
            setDeleting(d => ({ ...d, [id]: false }));
        }
    };

    // ── Add custom question ───────────────────────────────────────────────────
    const resetCustomForm = () =>
        setCustomForm(emptyCustomForm(activeTier));

    const setCustomCorrect = (label) =>
        setCustomForm(f => ({ ...f, options: f.options.map(o => ({ ...o, isCorrect: o.label === label })) }));
    const setCustomOptionText = (label, text) =>
        setCustomForm(f => ({ ...f, options: f.options.map(o => o.label === label ? { ...o, text } : o) }));

    const openAddMode = (mode) => {
        setAddMode(mode);
        setCustomForm(emptyCustomForm(activeTier));
    };
    const cancelAdd = () => { setAddMode(null); resetCustomForm(); };

    const addCustomQuestion = async () => {
        if (!customForm.questionText.trim()) { notify('error', 'Question text is required.'); return; }
        if (customForm.options.some(o => !o.text.trim())) { notify('error', 'Fill in all four options.'); return; }
        if (!customForm.options.some(o => o.isCorrect)) { notify('error', 'Select the correct answer.'); return; }
        setAddingSingle(true);
        try {
            const res = await api.post('/rag/questions', {
                courseId, topicId, topicTitle,
                questionText:   customForm.questionText,
                options:        customForm.options,
                explanation:    customForm.explanation,
                difficulty:     customForm.difficulty,
                bloomLevel:     customForm.bloomLevel,
                difficultyTier: customForm.difficultyTier,
            });
            const newQs = [...questions, res.data.question];
            setQuestions(newQs);
            if (onUpdate) onUpdate(newQs.length);
            setAddMode(null);
            resetCustomForm();
        } catch (err) {
            notify('error', err.response?.data?.error || 'Failed to add question.');
        } finally {
            setAddingSingle(false);
        }
    };

    // ── Generate single AI question ───────────────────────────────────────────
    const generateSingleAI = async () => {
        setAiGenerating(true);
        try {
            const res = await api.post('/rag/generate-single-question', {
                courseId, topicId, topicTitle,
                difficulty: aiDifficulty,
                bloomLevel: aiBloom,
            }, { timeout: 60000 });
            const newQs = [...questions, res.data.question];
            setQuestions(newQs);
            if (onUpdate) onUpdate(newQs.length);
            setAddMode(null);
        } catch (err) {
            notify('error', err.response?.data?.error || 'Failed to generate question.');
        } finally {
            setAiGenerating(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const activeColor = TIER_COLOR[activeTier];
    const isActiveTierPublished = tierPublished[activeTier];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '760px', background: theme.bg, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.3)' }}>

                {/* ── Header ── */}
                <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '14px 20px', flexShrink: 0 }}>
                    <div style={{ height: '3px', background: aGrad, margin: '-14px -20px 14px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: theme.textPrimary }}>Quiz Editor</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: theme.textMuted }}>{topicTitle}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!loading && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, background: theme.bg, border: `1px solid ${theme.border}`, padding: '3px 10px', borderRadius: '20px' }}>
                                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Tier tabs ── */}
                <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '0', flexShrink: 0, overflowX: 'auto' }}>
                    {TIERS.map(tier => {
                        const isActive = activeTier === tier;
                        const tc = TIER_COLOR[tier];
                        return (
                            <button
                                key={tier}
                                onClick={() => setActiveTier(tier)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: isActive ? `2px solid ${tc}` : '2px solid transparent',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    color: isActive ? tc : theme.textMuted,
                                    fontSize: '12px',
                                    fontWeight: isActive ? 700 : 500,
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap',
                                    transition: 'all .15s',
                                    marginBottom: '-1px',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = tc; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = theme.textMuted; }}
                            >
                                {TIER_LABEL[tier]}
                                <span style={{ fontSize: '10px', fontWeight: 700, background: isActive ? `${tc}22` : 'transparent', color: isActive ? tc : theme.textMuted, padding: '1px 6px', borderRadius: '10px', border: isActive ? `1px solid ${tc}44` : '1px solid transparent' }}>
                                    {tierCounts[tier]}
                                </span>
                                {tierPublished[tier] && <span style={{ fontSize: '10px', color: tc }}>✓</span>}
                            </button>
                        );
                    })}

                    {/* Per-tier publish button */}
                    {tierCounts[activeTier] > 0 && (
                        <button
                            onClick={() => handlePublishTier(activeTier, !isActiveTierPublished)}
                            disabled={publishing}
                            style={{
                                marginLeft: 'auto',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                background: isActiveTierPublished ? `${TIER_COLOR[activeTier]}15` : aGrad,
                                border: isActiveTierPublished ? `1px solid ${TIER_COLOR[activeTier]}50` : 'none',
                                borderRadius: '7px',
                                padding: '5px 12px',
                                cursor: publishing ? 'wait' : 'pointer',
                                color: isActiveTierPublished ? TIER_COLOR[activeTier] : '#fff',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                boxShadow: isActiveTierPublished ? 'none' : `0 2px 8px ${accent.glow}`,
                                transition: 'all .2s',
                                flexShrink: 0,
                                marginTop: '1px',
                                marginBottom: '1px',
                            }}
                        >
                            {publishing ? '…' : isActiveTierPublished ? `✓ ${TIER_LABEL[activeTier]} Published` : `Publish ${TIER_LABEL[activeTier]}`}
                        </button>
                    )}
                </div>

                {/* ── Notification ── */}
                {notification && (
                    <div style={{ padding: '9px 20px', background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', borderBottom: `1px solid ${notification.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, fontSize: '13px', fontWeight: 500, color: notification.type === 'error' ? '#ef4444' : '#22c55e', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {notification.type === 'error' ? '✕' : '✓'} {notification.message}
                    </div>
                )}

                {/* ── Body ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', color: theme.textMuted }}>
                            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading questions…
                        </div>
                    ) : (
                        <>
                            {displayedQuestions.length === 0 && addMode === null && (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: theme.textMuted, fontSize: '14px' }}>
                                    {`No ${TIER_LABEL[activeTier]} questions yet. Generate a ${TIER_LABEL[activeTier]} quiz or add one below.`}
                                </div>
                            )}

                            {displayedQuestions.map((q, idx) => {
                                const isEditing = editingId === q._id;
                                const tierC = TIER_COLOR[q.difficultyTier] || theme.textMuted;
                                const globalIdx = questions.indexOf(q);
                                return (
                                    <div key={q._id} style={{ background: theme.surface, border: `1.5px solid ${isEditing ? accent.from : theme.border}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                                        {/* Question header row */}
                                        <div style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, minWidth: '26px', paddingTop: '1px', flexShrink: 0 }}>Q{globalIdx + 1}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Question text */}
                                                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: theme.textPrimary, lineHeight: 1.55, wordBreak: 'break-word' }}>
                                                    {q.questionText
                                                        ? q.questionText
                                                        : <em style={{ color: theme.textMuted, fontStyle: 'italic' }}>Question text unavailable</em>
                                                    }
                                                </p>

                                                {/* Options (view mode) */}
                                                {!isEditing && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                                                        {(q.options || []).map((o, oi) => {
                                                            const text = stripOptPrefix(o.text) || o.text || '';
                                                            const label = o.label || String.fromCharCode(65 + oi);
                                                            return (
                                                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '7px', background: o.isCorrect ? 'rgba(34,197,94,0.1)' : theme.bg, border: `1px solid ${o.isCorrect ? 'rgba(34,197,94,0.3)' : theme.border}` }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, minWidth: '16px', flexShrink: 0 }}>{label}</span>
                                                                    <span style={{ fontSize: '13px', color: o.isCorrect ? '#22c55e' : theme.textSecondary, flex: 1, wordBreak: 'break-word' }}>{text}</span>
                                                                    {o.isCorrect && <CheckCircle size={13} style={{ color: '#22c55e', flexShrink: 0 }} />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Explanation */}
                                                {q.explanation && !isEditing && (
                                                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: theme.textMuted, fontStyle: 'italic', wordBreak: 'break-word' }}>💡 {q.explanation}</p>
                                                )}

                                                {/* Badges */}
                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {q.difficultyTier && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${tierC}18`, color: tierC, border: `1px solid ${tierC}40` }}>
                                                            {TIER_LABEL[q.difficultyTier] || q.difficultyTier}
                                                        </span>
                                                    )}
                                                    {q.bloomLevel && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${bloomColors[q.bloomLevel] || '#6b7280'}20`, color: bloomColors[q.bloomLevel] || '#6b7280', border: `1px solid ${bloomColors[q.bloomLevel] || '#6b7280'}40` }}>
                                                            {q.bloomLevel}
                                                        </span>
                                                    )}
                                                    {q.difficulty && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${diffColors[q.difficulty] || '#9ca3af'}20`, color: diffColors[q.difficulty] || '#9ca3af', border: `1px solid ${diffColors[q.difficulty] || '#9ca3af'}40` }}>
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                    {saveSuccess[q._id] && <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e' }}>✓ Saved</span>}
                                                </div>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                                                <button onClick={() => isEditing ? cancelEdit() : startEdit(q)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: isEditing ? theme.textMuted : accent.from, fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' }}>
                                                    {isEditing ? <><XCircle size={12} /> Cancel</> : <><Edit size={12} /> Edit</>}
                                                </button>
                                                <button onClick={() => deleteQuestion(q._id)} disabled={deleting[q._id]}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 10px', cursor: deleting[q._id] ? 'not-allowed' : 'pointer', color: '#ef4444', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', opacity: deleting[q._id] ? 0.5 : 1 }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── Edit form ── */}
                                        {isEditing && editForm && (
                                            <div style={{ borderTop: `1px solid ${theme.border}`, padding: '14px', background: theme.bg, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* Question Text */}
                                                <div>
                                                    <label style={labelStyle}>Question Text</label>
                                                    <textarea value={editForm.questionText} onChange={e => setEditForm(f => ({ ...f, questionText: e.target.value }))} rows={3}
                                                        style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px 11px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                </div>

                                                {/* Options */}
                                                <div>
                                                    <label style={labelStyle}>Options — click circle to mark correct</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {editForm.options.map(o => (
                                                            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button onClick={() => setCorrectOption(o.label)}
                                                                    style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${o.isCorrect ? '#22c55e' : theme.border}`, background: o.isCorrect ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                                                    {o.isCorrect && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                                                                </button>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, width: '14px' }}>{o.label}</span>
                                                                <input value={o.text} onChange={e => setOptionText(o.label, e.target.value)}
                                                                    style={{ flex: 1, background: theme.surface, border: `1px solid ${o.isCorrect ? '#22c55e80' : theme.border}`, borderRadius: '7px', padding: '6px 10px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Explanation */}
                                                <div>
                                                    <label style={labelStyle}>Explanation (optional)</label>
                                                    <textarea value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))} rows={2}
                                                        style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px 11px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                </div>

                                                {/* Tier + Difficulty + Bloom row */}
                                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <label style={labelStyle}>Tier</label>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {TIERS.map(t => {
                                                                const active = editForm.difficultyTier === t;
                                                                return (
                                                                    <button key={t} onClick={() => setEditForm(f => ({ ...f, difficultyTier: t }))}
                                                                        style={{ padding: '4px 11px', borderRadius: '6px', border: `1px solid ${active ? TIER_COLOR[t] : theme.border}`, background: active ? `${TIER_COLOR[t]}18` : 'none', color: active ? TIER_COLOR[t] : theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                                                                        {TIER_LABEL[t]}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>Difficulty</label>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {DIFFICULTIES.map(d => {
                                                                const active = editForm.difficulty === d;
                                                                return (
                                                                    <button key={d} onClick={() => setEditForm(f => ({ ...f, difficulty: d }))}
                                                                        style={{ padding: '4px 11px', borderRadius: '6px', border: `1px solid ${active ? diffColors[d] : theme.border}`, background: active ? `${diffColors[d]}18` : 'none', color: active ? diffColors[d] : theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>
                                                                        {d}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>Bloom's Level</label>
                                                        <select value={editForm.bloomLevel} onChange={e => setEditForm(f => ({ ...f, bloomLevel: e.target.value }))}
                                                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 9px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                            {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Save / Cancel */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => saveEdit(q._id)} disabled={saving[q._id]}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: saving[q._id] ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: saving[q._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                                        {saving[q._id] ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                                                        {saving[q._id] ? 'Saving…' : 'Save Changes'}
                                                    </button>
                                                    <button onClick={cancelEdit}
                                                        style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Add Question ── */}
                            {addMode === null && (
                                <button onClick={() => openAddMode('choose')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px dashed ${theme.border}`, background: 'none', color: theme.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}>
                                    <Plus size={15} /> Add Question ({TIER_LABEL[activeTier]})
                                </button>
                            )}

                            {addMode === 'choose' && (
                                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>How would you like to add a question?</p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openAddMode('custom')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '9px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textPrimary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', flex: 1, justifyContent: 'center' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textPrimary; }}>
                                            <PenLine size={15} /> Write Custom Question
                                        </button>
                                        <button onClick={() => openAddMode('ai')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: aGrad, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 8px ${accent.glow}`, flex: 1, justifyContent: 'center' }}>
                                            <Sparkles size={15} /> Generate with AI
                                        </button>
                                    </div>
                                    <button onClick={cancelAdd} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end' }}>Cancel</button>
                                </div>
                            )}

                            {addMode === 'ai' && (
                                <div style={{ background: theme.surface, border: `1px solid ${accent.from}40`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>Generate 1 AI Question for "{topicTitle}"</p>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={labelStyle}>Difficulty</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {DIFFICULTIES.map(d => (
                                                    <button key={d} onClick={() => setAiDifficulty(d)}
                                                        style={{ padding: '4px 11px', borderRadius: '6px', border: `1px solid ${aiDifficulty === d ? diffColors[d] : theme.border}`, background: aiDifficulty === d ? `${diffColors[d]}18` : 'none', color: aiDifficulty === d ? diffColors[d] : theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Bloom's Level</label>
                                            <select value={aiBloom} onChange={e => setAiBloom(e.target.value)}
                                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 9px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={generateSingleAI} disabled={aiGenerating}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: aiGenerating ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: aiGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                            {aiGenerating ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={13} /> Generate Question</>}
                                        </button>
                                        <button onClick={cancelAdd} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {addMode === 'custom' && (
                                <div style={{ background: theme.surface, border: `1px solid ${accent.from}40`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>Write a Custom Question</p>

                                    <div>
                                        <label style={labelStyle}>Question Text *</label>
                                        <textarea value={customForm.questionText} onChange={e => setCustomForm(f => ({ ...f, questionText: e.target.value }))} rows={3} placeholder="Type your question here…"
                                            style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px 11px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                    </div>

                                    <div>
                                        <label style={labelStyle}>Options — click circle to mark correct answer *</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {customForm.options.map(o => (
                                                <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button onClick={() => setCustomCorrect(o.label)}
                                                        style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${o.isCorrect ? '#22c55e' : theme.border}`, background: o.isCorrect ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                                        {o.isCorrect && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                                                    </button>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, width: '14px' }}>{o.label}</span>
                                                    <input value={o.text} onChange={e => setCustomOptionText(o.label, e.target.value)} placeholder={`Option ${o.label}`}
                                                        style={{ flex: 1, background: theme.bg, border: `1px solid ${o.isCorrect ? '#22c55e80' : theme.border}`, borderRadius: '7px', padding: '6px 10px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={labelStyle}>Explanation (optional)</label>
                                        <textarea value={customForm.explanation} onChange={e => setCustomForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder="Why is this the correct answer?"
                                            style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px 11px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={labelStyle}>Tier</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {TIERS.map(t => {
                                                    const active = customForm.difficultyTier === t;
                                                    return (
                                                        <button key={t} onClick={() => setCustomForm(f => ({ ...f, difficultyTier: t }))}
                                                            style={{ padding: '4px 11px', borderRadius: '6px', border: `1px solid ${active ? TIER_COLOR[t] : theme.border}`, background: active ? `${TIER_COLOR[t]}18` : 'none', color: active ? TIER_COLOR[t] : theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                                                            {TIER_LABEL[t]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Difficulty</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {DIFFICULTIES.map(d => (
                                                    <button key={d} onClick={() => setCustomForm(f => ({ ...f, difficulty: d }))}
                                                        style={{ padding: '4px 11px', borderRadius: '6px', border: `1px solid ${customForm.difficulty === d ? diffColors[d] : theme.border}`, background: customForm.difficulty === d ? `${diffColors[d]}18` : 'none', color: customForm.difficulty === d ? diffColors[d] : theme.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Bloom's Level</label>
                                            <select value={customForm.bloomLevel} onChange={e => setCustomForm(f => ({ ...f, bloomLevel: e.target.value }))}
                                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '5px 9px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={addCustomQuestion} disabled={addingSingle}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: addingSingle ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: addingSingle ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                            {addingSingle ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                                            {addingSingle ? 'Adding…' : 'Add Question'}
                                        </button>
                                        <button onClick={cancelAdd} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                {!loading && questions.length > 0 && (
                    <div style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: '10px 20px', fontSize: '12px', color: theme.textMuted, flexShrink: 0 }}>
                        {isActiveTierPublished
                            ? <><span style={{ color: '#22c55e', fontWeight: 700 }}>✓ {TIER_LABEL[activeTier]} Published</span> — students can attempt this {tierCounts[activeTier]}-question quiz.</>
                            : <><span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠ {TIER_LABEL[activeTier]} Unpublished</span> — click "Publish {TIER_LABEL[activeTier]}" above to release it.</>
                        }
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

const labelStyle = {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#9b97b8',
    display: 'block',
    marginBottom: '5px',
};

export default TeacherQuizEditor;
