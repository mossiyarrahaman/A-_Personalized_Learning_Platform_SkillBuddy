import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Save, XCircle, Loader, CheckCircle, Plus, Sparkles, PenLine } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'mixed'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyCustomForm = () => ({
    questionText: '',
    options: OPTION_LABELS.map(label => ({ label, text: '', isCorrect: false })),
    explanation: '',
    difficulty: 'medium',
    bloomLevel: 'understand',
});

const bloomColors = {
    remember: '#8b5cf6', understand: '#3b82f6', apply: '#10b981',
    analyze: '#f59e0b', evaluate: '#ef4444', create: '#ec4899', mixed: '#6b7280',
};
const diffColors = { easy: '#22c55e', medium: '#fbbf24', hard: '#ef4444' };

const TeacherQuizEditor = ({ courseId, topicId, topicTitle, onClose, onUpdate }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState({});
    const [deleting, setDeleting] = useState({});
    const [saveSuccess, setSaveSuccess] = useState({});
    const [published, setPublished] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Add-question state
    const [addMode, setAddMode] = useState(null); // null | 'choose' | 'custom' | 'ai'
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
        api.get(`/rag/questions/${courseId}?topicId=${topicId}&origin=teacher&limit=50`)
            .then(r => setQuestions(r.data.questions || []))
            .catch(() => setQuestions([]))
            .finally(() => setLoading(false));
    };

    const fetchPublishedState = () => {
        api.get(`/rag/topic-quizzes/${courseId}`)
            .then(r => {
                const entry = r.data.quizzes?.[topicId];
                if (entry) setPublished(entry.published || false);
            })
            .catch(() => {});
    };

    const handlePublish = async (pub) => {
        setPublishing(true);
        try {
            await api.post('/rag/publish-quiz', { courseId, topicId, published: pub });
            setPublished(pub);
            if (onUpdate) onUpdate(questions.length, pub);
        } catch {
            notify('error', 'Failed to update publish status. Please try again.');
        } finally {
            setPublishing(false);
        }
    };

    const startEdit = (q) => {
        setEditingId(q._id);
        setEditForm({
            questionText: q.questionText || '',
            options: (q.options || []).map(o => ({ label: o.label, text: o.text, isCorrect: o.isCorrect })),
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'medium',
            bloomLevel: q.bloomLevel || 'understand',
        });
    };

    const cancelEdit = () => { setEditingId(null); setEditForm(null); };

    const setCorrectOption = (label) => {
        setEditForm(f => ({ ...f, options: f.options.map(o => ({ ...o, isCorrect: o.label === label })) }));
    };

    const setOptionText = (label, text) => {
        setEditForm(f => ({ ...f, options: f.options.map(o => o.label === label ? { ...o, text } : o) }));
    };

    const saveEdit = async (id) => {
        setSaving(s => ({ ...s, [id]: true }));
        try {
            const res = await api.patch(`/rag/questions/${id}`, {
                questionText: editForm.questionText,
                options: editForm.options,
                explanation: editForm.explanation,
                difficulty: editForm.difficulty,
                bloomLevel: editForm.bloomLevel,
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
    const setCustomCorrect = (label) => {
        setCustomForm(f => ({ ...f, options: f.options.map(o => ({ ...o, isCorrect: o.label === label })) }));
    };
    const setCustomOptionText = (label, text) => {
        setCustomForm(f => ({ ...f, options: f.options.map(o => o.label === label ? { ...o, text } : o) }));
    };

    const addCustomQuestion = async () => {
        if (!customForm.questionText.trim()) { notify('error', 'Question text is required.'); return; }
        if (customForm.options.some(o => !o.text.trim())) { notify('error', 'Fill in all four options.'); return; }
        if (!customForm.options.some(o => o.isCorrect)) { notify('error', 'Select the correct answer.'); return; }
        setAddingSingle(true);
        try {
            const res = await api.post('/rag/questions', {
                courseId, topicId, topicTitle,
                questionText: customForm.questionText,
                options: customForm.options,
                explanation: customForm.explanation,
                difficulty: customForm.difficulty,
                bloomLevel: customForm.bloomLevel,
            });
            const newQs = [...questions, res.data.question];
            setQuestions(newQs);
            if (onUpdate) onUpdate(newQs.length);
            setAddMode(null);
            setCustomForm(emptyCustomForm());
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
                courseId, topicId, topicTitle, difficulty: aiDifficulty, bloomLevel: aiBloom,
            });
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

    const cancelAdd = () => { setAddMode(null); setCustomForm(emptyCustomForm()); };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '720px', background: theme.bg, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.3)' }}>

                {/* Header */}
                <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '16px 24px', flexShrink: 0 }}>
                    <div style={{ height: '3px', background: aGrad, margin: '-16px -24px 16px' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: theme.textPrimary }}>Quiz Editor</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: theme.textMuted }}>{topicTitle}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!loading && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, background: theme.surface, border: `1px solid ${theme.border}`, padding: '4px 10px', borderRadius: '20px' }}>
                                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {!loading && questions.length > 0 && (
                                <button
                                    onClick={() => handlePublish(!published)}
                                    disabled={publishing}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: published ? 'rgba(34,197,94,0.12)' : aGrad, border: published ? '1px solid rgba(34,197,94,0.4)' : 'none', borderRadius: '8px', padding: '6px 14px', cursor: publishing ? 'wait' : 'pointer', color: published ? '#22c55e' : '#fff', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', boxShadow: published ? 'none' : `0 2px 8px ${accent.glow}`, transition: 'all .2s' }}
                                >
                                    {publishing ? '…' : published ? '✓ Published' : 'Publish Quiz'}
                                </button>
                            )}
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div style={{ padding: '10px 24px', background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', borderBottom: `1px solid ${notification.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, fontSize: '13px', fontWeight: 500, color: notification.type === 'error' ? '#ef4444' : '#22c55e', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {notification.type === 'error' ? '✕' : '✓'} {notification.message}
                    </div>
                )}

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', color: theme.textMuted }}>
                            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading questions…
                        </div>
                    ) : (
                        <>
                            {questions.length === 0 && addMode === null && (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: theme.textMuted, fontSize: '14px' }}>
                                    No questions yet. Add one below or generate a quiz from the curriculum builder.
                                </div>
                            )}

                            {questions.map((q, idx) => {
                                const isEditing = editingId === q._id;
                                return (
                                    <div key={q._id} style={{ background: theme.surface, border: `1px solid ${isEditing ? accent.from : theme.border}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                                        {/* Question header */}
                                        <div style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, minWidth: '24px', paddingTop: '2px' }}>Q{idx + 1}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: theme.textPrimary, lineHeight: 1.5 }}>{q.questionText}</p>
                                                {!isEditing && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                                                        {(q.options || []).map(o => (
                                                            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '7px', background: o.isCorrect ? 'rgba(34,197,94,0.1)' : theme.bg, border: `1px solid ${o.isCorrect ? 'rgba(34,197,94,0.3)' : theme.border}` }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, minWidth: '16px' }}>{o.label}</span>
                                                                <span style={{ fontSize: '13px', color: o.isCorrect ? '#22c55e' : theme.textSecondary }}>{o.text}</span>
                                                                {o.isCorrect && <CheckCircle size={13} style={{ color: '#22c55e', marginLeft: 'auto', flexShrink: 0 }} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {q.explanation && !isEditing && (
                                                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: theme.textMuted, fontStyle: 'italic' }}>💡 {q.explanation}</p>
                                                )}
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${bloomColors[q.bloomLevel] || '#6b7280'}20`, color: bloomColors[q.bloomLevel] || '#6b7280', border: `1px solid ${bloomColors[q.bloomLevel] || '#6b7280'}40` }}>{q.bloomLevel}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${diffColors[q.difficulty] || '#9ca3af'}20`, color: diffColors[q.difficulty] || '#9ca3af', border: `1px solid ${diffColors[q.difficulty] || '#9ca3af'}40` }}>{q.difficulty}</span>
                                                    {saveSuccess[q._id] && <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e' }}>✓ Saved</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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

                                        {/* Edit form */}
                                        {isEditing && editForm && (
                                            <div style={{ borderTop: `1px solid ${theme.border}`, padding: '16px', background: theme.bg, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Question Text</label>
                                                    <textarea value={editForm.questionText} onChange={e => setEditForm(f => ({ ...f, questionText: e.target.value }))} rows={3}
                                                        style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Options — click circle to mark correct</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                                        {editForm.options.map(o => (
                                                            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button onClick={() => setCorrectOption(o.label)}
                                                                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${o.isCorrect ? '#22c55e' : theme.border}`, background: o.isCorrect ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                                                    {o.isCorrect && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                                                                </button>
                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, width: '16px' }}>{o.label}</span>
                                                                <input value={o.text} onChange={e => setOptionText(o.label, e.target.value)}
                                                                    style={{ flex: 1, background: theme.surface, border: `1px solid ${o.isCorrect ? '#22c55e80' : theme.border}`, borderRadius: '7px', padding: '7px 10px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Explanation (optional)</label>
                                                    <textarea value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))} rows={2}
                                                        style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Difficulty</label>
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            {DIFFICULTIES.map(d => {
                                                                const active = editForm.difficulty === d;
                                                                return <button key={d} onClick={() => setEditForm(f => ({ ...f, difficulty: d }))}
                                                                    style={{ padding: '4px 12px', borderRadius: '6px', border: `1px solid ${active ? diffColors[d] : theme.border}`, background: active ? `${diffColors[d]}18` : 'none', color: active ? diffColors[d] : theme.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>{d}</button>;
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Bloom's Level</label>
                                                        <select value={editForm.bloomLevel} onChange={e => setEditForm(f => ({ ...f, bloomLevel: e.target.value }))}
                                                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                            {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => saveEdit(q._id)} disabled={saving[q._id]}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: saving[q._id] ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: saving[q._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                                        {saving[q._id] ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                                                        {saving[q._id] ? 'Saving…' : 'Save Changes'}
                                                    </button>
                                                    <button onClick={cancelEdit}
                                                        style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Add Question Panel ─────────────────────────────────── */}
                            {addMode === null && (
                                <button onClick={() => setAddMode('choose')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', width: '100%', padding: '11px', borderRadius: '10px', border: `1.5px dashed ${theme.border}`, background: 'none', color: theme.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}>
                                    <Plus size={15} /> Add Question
                                </button>
                            )}

                            {addMode === 'choose' && (
                                <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>How would you like to add a question?</p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => setAddMode('custom')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '9px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textPrimary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', flex: 1, justifyContent: 'center' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textPrimary; }}>
                                            <PenLine size={15} /> Write Custom Question
                                        </button>
                                        <button onClick={() => setAddMode('ai')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '9px', border: 'none', background: aGrad, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 8px ${accent.glow}`, flex: 1, justifyContent: 'center' }}>
                                            <Sparkles size={15} /> Generate with AI
                                        </button>
                                    </div>
                                    <button onClick={cancelAdd} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end' }}>Cancel</button>
                                </div>
                            )}

                            {addMode === 'ai' && (
                                <div style={{ background: theme.surface, border: `1px solid ${accent.from}40`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>Generate 1 AI Question for "{topicTitle}"</p>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Difficulty</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {DIFFICULTIES.map(d => (
                                                    <button key={d} onClick={() => setAiDifficulty(d)}
                                                        style={{ padding: '4px 12px', borderRadius: '6px', border: `1px solid ${aiDifficulty === d ? diffColors[d] : theme.border}`, background: aiDifficulty === d ? `${diffColors[d]}18` : 'none', color: aiDifficulty === d ? diffColors[d] : theme.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Bloom's Level</label>
                                            <select value={aiBloom} onChange={e => setAiBloom(e.target.value)}
                                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={generateSingleAI} disabled={aiGenerating}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: aiGenerating ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: aiGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                            {aiGenerating ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={13} /> Generate Question</>}
                                        </button>
                                        <button onClick={cancelAdd} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {addMode === 'custom' && (
                                <div style={{ background: theme.surface, border: `1px solid ${accent.from}40`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>Write a Custom Question</p>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Question Text *</label>
                                        <textarea value={customForm.questionText} onChange={e => setCustomForm(f => ({ ...f, questionText: e.target.value }))} rows={3} placeholder="Type your question here…"
                                            style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Options — click circle to mark correct answer *</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                            {customForm.options.map(o => (
                                                <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button onClick={() => setCustomCorrect(o.label)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${o.isCorrect ? '#22c55e' : theme.border}`, background: o.isCorrect ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                                        {o.isCorrect && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                                                    </button>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: o.isCorrect ? '#22c55e' : theme.textMuted, width: '16px' }}>{o.label}</span>
                                                    <input value={o.text} onChange={e => setCustomOptionText(o.label, e.target.value)} placeholder={`Option ${o.label}`}
                                                        style={{ flex: 1, background: theme.bg, border: `1px solid ${o.isCorrect ? '#22c55e80' : theme.border}`, borderRadius: '7px', padding: '7px 10px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Explanation (optional)</label>
                                        <textarea value={customForm.explanation} onChange={e => setCustomForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder="Why is this the correct answer?"
                                            style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Difficulty</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {DIFFICULTIES.map(d => (
                                                    <button key={d} onClick={() => setCustomForm(f => ({ ...f, difficulty: d }))}
                                                        style={{ padding: '4px 12px', borderRadius: '6px', border: `1px solid ${customForm.difficulty === d ? diffColors[d] : theme.border}`, background: customForm.difficulty === d ? `${diffColors[d]}18` : 'none', color: customForm.difficulty === d ? diffColors[d] : theme.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Bloom's Level</label>
                                            <select value={customForm.bloomLevel} onChange={e => setCustomForm(f => ({ ...f, bloomLevel: e.target.value }))}
                                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: theme.textPrimary, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={addCustomQuestion} disabled={addingSingle}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: addingSingle ? theme.border : aGrad, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: addingSingle ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                            {addingSingle ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                                            {addingSingle ? 'Adding…' : 'Add Question'}
                                        </button>
                                        <button onClick={cancelAdd} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && questions.length > 0 && (
                    <div style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: '12px 24px', fontSize: '12px', color: theme.textMuted, flexShrink: 0 }}>
                        {published
                            ? <><span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Published</span> — students can attempt this {questions.length}-question quiz. Scoring ≥ 80% marks the topic complete.</>
                            : <><span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠ Unpublished</span> — students cannot see this quiz yet. Click "Publish Quiz" to release it.</>
                        }
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default TeacherQuizEditor;
