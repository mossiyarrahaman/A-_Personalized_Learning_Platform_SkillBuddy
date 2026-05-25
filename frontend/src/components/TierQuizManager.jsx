import React, { useState, useEffect, useCallback } from 'react';
import { Brain, ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle, Layers, Pencil, Trash2, Save, X, CheckCircle2, List } from 'lucide-react';
import api from '../api/axios';
import { TIER_CONFIG, TIERS, TIER_DEFAULT_BLOOM } from '../utils/tierUtils';

const BLOOM_OPTIONS = {
    beginner:     [{ value: 'remember', label: 'Remember' }, { value: 'understand', label: 'Understand' }],
    intermediate: [{ value: 'apply', label: 'Apply' }, { value: 'analyze', label: 'Analyze' }],
    advanced:     [{ value: 'evaluate', label: 'Evaluate' }, { value: 'create', label: 'Create' }],
};

const NUM_Q_OPTIONS = [5, 8, 10, 15];
const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

const Spinner = ({ size = 12, color = '#fff' }) => (
    <div style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin .8s linear infinite', flexShrink: 0 }} />
);

const TierQuizManager = ({ courseId, course, theme = {}, accent = {} }) => {
    const [quizData, setQuizData] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedTopics, setExpandedTopics] = useState({});
    const [generating, setGenerating] = useState({});
    const [publishing, setPublishing] = useState({});
    const [selectedBloom, setSelectedBloom] = useState({});
    const [numQuestions, setNumQuestions] = useState({});
    const [error, setError] = useState({});

    // Question view/edit state
    const [activeViewKey, setActiveViewKey] = useState(null);   // 'topicId-tier'
    const [tierQuestions, setTierQuestions] = useState({});      // { key: questions[] }
    const [loadingQ, setLoadingQ] = useState({});
    const [editingQ, setEditingQ] = useState(null);             // { id, questionText, options[], correctIdx, explanation }
    const [savingQ, setSavingQ] = useState({});
    const [deletingQ, setDeletingQ] = useState({});

    const aGrad = `linear-gradient(135deg,${accent.from || '#8b5cf6'},${accent.to || '#3b82f6'})`;

    const fetchQuizData = useCallback(async () => {
        if (!courseId) return;
        try {
            const res = await api.get(`/rag/topic-quizzes/${courseId}`);
            setQuizData(res.data.quizzes || {});
        } catch { /* non-fatal */ } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { fetchQuizData(); }, [fetchQuizData]);

    const getKey = (topicId, tier) => `${topicId}-${tier}`;
    const getBloom = (topicId, tier) => selectedBloom[getKey(topicId, tier)] || TIER_DEFAULT_BLOOM[tier];
    const getNumQ  = (topicId, tier) => numQuestions[getKey(topicId, tier)] || 10;

    const handleGenerate = async (topicId, topicTitle, moduleTitle, tier) => {
        const key = getKey(topicId, tier);
        setGenerating(g => ({ ...g, [key]: true }));
        setError(e => ({ ...e, [key]: null }));
        // Invalidate cached questions for this tier so they reload after generation
        setTierQuestions(q => { const n = { ...q }; delete n[key]; return n; });
        if (activeViewKey === key) setActiveViewKey(null);
        try {
            await api.post('/rag/generate-topic-quiz', {
                courseId, topicId, topicTitle, moduleTitle,
                bloomLevel: getBloom(topicId, tier),
                numQuestions: getNumQ(topicId, tier),
                difficulty: tier === 'beginner' ? 'Beginner' : tier === 'intermediate' ? 'Intermediate' : 'Advanced',
            }, { timeout: 120000 });
            await fetchQuizData();
        } catch (err) {
            setError(e => ({ ...e, [key]: err.response?.data?.error || 'Generation failed' }));
        } finally {
            setGenerating(g => ({ ...g, [key]: false }));
        }
    };

    const handlePublishToggle = async (topicId, tier, currentPublished) => {
        const key = getKey(topicId, tier);
        setPublishing(p => ({ ...p, [key]: true }));
        try {
            await api.post('/rag/publish-quiz-tier', { courseId, topicId, tier, published: !currentPublished });
            await fetchQuizData();
        } catch (err) {
            setError(e => ({ ...e, [key]: err.response?.data?.error || 'Failed to update' }));
        } finally {
            setPublishing(p => ({ ...p, [key]: false }));
        }
    };

    const fetchTierQuestions = async (topicId, tier) => {
        const key = getKey(topicId, tier);
        setLoadingQ(l => ({ ...l, [key]: true }));
        try {
            const res = await api.get(`/rag/questions/${courseId}?topicId=${topicId}&difficultyTier=${tier}&limit=50`);
            setTierQuestions(q => ({ ...q, [key]: res.data.questions || [] }));
        } catch {
            setTierQuestions(q => ({ ...q, [key]: [] }));
        } finally {
            setLoadingQ(l => ({ ...l, [key]: false }));
        }
    };

    const toggleView = async (topicId, tier) => {
        const key = getKey(topicId, tier);
        if (activeViewKey === key) { setActiveViewKey(null); return; }
        setActiveViewKey(key);
        setEditingQ(null);
        if (!tierQuestions[key]) await fetchTierQuestions(topicId, tier);
    };

    const handleDeleteQuestion = async (questionId, key) => {
        if (!window.confirm('Delete this question?')) return;
        setDeletingQ(d => ({ ...d, [questionId]: true }));
        try {
            await api.delete(`/rag/questions/${questionId}`);
            setTierQuestions(prev => ({ ...prev, [key]: prev[key].filter(q => q._id !== questionId) }));
            await fetchQuizData();
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed');
        } finally {
            setDeletingQ(d => ({ ...d, [questionId]: false }));
        }
    };

    const handleSaveQuestion = async (key) => {
        if (!editingQ) return;
        const { id, questionText, options, correctIdx, explanation } = editingQ;
        if (!questionText.trim()) return;
        setSavingQ(s => ({ ...s, [id]: true }));
        try {
            const updatedOptions = options.map((text, i) => ({
                label: String.fromCharCode(65 + i), text, isCorrect: i === correctIdx,
            }));
            await api.patch(`/rag/questions/${id}`, {
                questionText: questionText.trim(),
                options: updatedOptions,
                correctAnswer: options[correctIdx],
                explanation: explanation.trim(),
            });
            setTierQuestions(prev => ({
                ...prev,
                [key]: prev[key].map(q => q._id === id
                    ? { ...q, questionText: questionText.trim(), options: updatedOptions, explanation: explanation.trim() }
                    : q
                ),
            }));
            setEditingQ(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Save failed');
        } finally {
            setSavingQ(s => ({ ...s, [id]: false }));
        }
    };

    const toggleExpand = (topicId) => {
        setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
        setActiveViewKey(null);
        setEditingQ(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3" style={{ color: theme.textMuted }}>
                <Spinner size={20} color={accent.from || '#8b5cf6'} />
                Loading quiz data…
            </div>
        </div>
    );

    const topics = [];
    for (const mod of course?.modules || []) {
        for (const t of mod.topics || []) {
            topics.push({ topicId: t.id || t._id?.toString(), title: t.title, moduleTitle: mod.title });
        }
    }

    if (!topics.length) return (
        <div className="text-center py-8" style={{ color: theme.textMuted }}>
            No topics found. Add topics in the curriculum builder first.
        </div>
    );

    return (
        <div className="space-y-4">
            <style>{SPIN}</style>

            <div className="flex items-center gap-2 mb-6">
                <Layers size={18} style={{ color: accent.from || '#8b5cf6' }} />
                <div>
                    <h2 className="font-bold text-base" style={{ color: theme.textPrimary }}>Bloom's Level Quizzes</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Generate and publish 3-tier quizzes per topic. Students unlock higher tiers by scoring ≥80%.</p>
                </div>
            </div>

            {topics.map(({ topicId, title, moduleTitle }) => {
                const topicQuizData = quizData[topicId] || { tiers: {} };
                const isExpanded = expandedTopics[topicId];
                const totalPublished = TIERS.filter(t => topicQuizData.tiers[t]?.published).length;

                return (
                    <div key={topicId} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>

                        {/* Topic header */}
                        <button
                            onClick={() => toggleExpand(topicId)}
                            className="w-full flex items-center gap-4 p-4 text-left"
                            style={{ background: 'none', cursor: 'pointer', borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none' }}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{title}</span>
                                    {totalPublished > 0 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                                            {totalPublished}/{TIERS.length} published
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs" style={{ color: theme.textMuted }}>{moduleTitle}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {TIERS.map(tier => {
                                    const cfg = TIER_CONFIG[tier];
                                    const td = topicQuizData.tiers[tier];
                                    return (
                                        <span key={tier} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                background: td?.questionCount > 0 ? cfg.bg : 'rgba(255,255,255,0.05)',
                                                color: td?.questionCount > 0 ? cfg.color : theme.textMuted,
                                                border: `1px solid ${td?.questionCount > 0 ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                                            }}
                                        >
                                            {cfg.label.slice(0, 3)}{td?.questionCount > 0 ? ' ✓' : ''}
                                        </span>
                                    );
                                })}
                                {isExpanded ? <ChevronUp size={16} style={{ color: theme.textMuted }} /> : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
                            </div>
                        </button>

                        {/* Tier cards */}
                        {isExpanded && (
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {TIERS.map(tier => {
                                        const config = TIER_CONFIG[tier];
                                        const key = getKey(topicId, tier);
                                        const tierData = topicQuizData.tiers[tier];
                                        const isGen = generating[key];
                                        const isPub = publishing[key];
                                        const hasQuestions = tierData?.questionCount > 0;
                                        const isPublished = tierData?.published || false;
                                        const isViewing = activeViewKey === key;
                                        const errMsg = error[key];

                                        return (
                                            <div key={tier}
                                                style={{
                                                    background: hasQuestions ? config.bg : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isViewing ? config.color : hasQuestions ? config.border : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: '10px', padding: '14px',
                                                    transition: 'border-color .15s',
                                                }}
                                            >
                                                {/* Tier label */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
                                                        <span className="text-sm font-bold" style={{ color: config.color }}>{config.label}</span>
                                                    </div>
                                                    {hasQuestions && (
                                                        <span className="text-xs" style={{ color: isPublished ? '#22c55e' : theme.textMuted }}>
                                                            {isPublished ? 'Published' : 'Unpublished'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Bloom tags */}
                                                <div className="flex gap-1 mb-3">
                                                    {config.bloomLevels.map(bl => (
                                                        <span key={bl} className="text-xs px-1.5 py-0.5 rounded capitalize"
                                                            style={{ background: `${config.color}15`, color: config.color }}
                                                        >{bl}</span>
                                                    ))}
                                                </div>

                                                {/* Question count + View button */}
                                                {hasQuestions && (
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs" style={{ color: theme.textMuted }}>
                                                            {tierData.questionCount} questions{tierData.bloomLevel && ` · ${tierData.bloomLevel}`}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleView(topicId, tier)}
                                                            className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md transition-all"
                                                            style={{
                                                                background: isViewing ? `${config.color}20` : 'rgba(255,255,255,0.06)',
                                                                color: isViewing ? config.color : theme.textMuted,
                                                                border: `1px solid ${isViewing ? config.color + '50' : 'rgba(255,255,255,0.1)'}`,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <List size={10} /> {isViewing ? 'Hide' : 'View/Edit'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Bloom level selector */}
                                                <div className="mb-2">
                                                    <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Bloom Level</label>
                                                    <select value={getBloom(topicId, tier)}
                                                        onChange={e => setSelectedBloom(s => ({ ...s, [key]: e.target.value }))}
                                                        style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: '6px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        {BLOOM_OPTIONS[tier].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                </div>

                                                {/* Num questions selector */}
                                                <div className="mb-3">
                                                    <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Questions</label>
                                                    <select value={getNumQ(topicId, tier)}
                                                        onChange={e => setNumQuestions(n => ({ ...n, [key]: Number(e.target.value) }))}
                                                        style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: '6px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        {NUM_Q_OPTIONS.map(n => <option key={n} value={n}>{n} questions</option>)}
                                                    </select>
                                                </div>

                                                {errMsg && (
                                                    <div className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: '#f87171' }}>
                                                        <AlertCircle size={12} /> {errMsg}
                                                    </div>
                                                )}

                                                {/* Generate button */}
                                                <button
                                                    onClick={() => handleGenerate(topicId, title, moduleTitle, tier)}
                                                    disabled={isGen}
                                                    className="w-full py-2 rounded-lg text-xs font-bold mb-2 flex items-center justify-center gap-1.5"
                                                    style={{
                                                        background: isGen ? 'rgba(255,255,255,0.05)' : aGrad,
                                                        color: isGen ? theme.textMuted : '#fff',
                                                        border: 'none', cursor: isGen ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {isGen ? <><Spinner /> Generating…</> : <><Brain size={12} /> {hasQuestions ? 'Regenerate' : 'Generate'}</>}
                                                </button>

                                                {/* Publish toggle */}
                                                {hasQuestions && (
                                                    <button
                                                        onClick={() => handlePublishToggle(topicId, tier, isPublished)}
                                                        disabled={isPub}
                                                        className="w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                                                        style={{
                                                            background: isPublished ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                                                            color: isPublished ? '#22c55e' : theme.textMuted,
                                                            border: `1px solid ${isPublished ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                            cursor: isPub ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {isPub ? <Spinner size={10} color={theme.textMuted} />
                                                            : isPublished ? <><EyeOff size={11} /> Unpublish</> : <><Eye size={11} /> Publish</>}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Questions panel ── */}
                                {activeViewKey && TIERS.some(t => activeViewKey === getKey(topicId, t)) && (() => {
                                    const key = activeViewKey;
                                    const activeTier = TIERS.find(t => key === getKey(topicId, t));
                                    const config = TIER_CONFIG[activeTier];
                                    const questions = tierQuestions[key] || [];
                                    const isLoadingQ = loadingQ[key];

                                    return (
                                        <div style={{ border: `1px solid ${config.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                                            {/* Panel header */}
                                            <div className="flex items-center justify-between px-4 py-3"
                                                style={{ background: `${config.color}10`, borderBottom: `1px solid ${config.border}` }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
                                                    <span className="text-sm font-bold" style={{ color: config.color }}>{config.label} Questions</span>
                                                    {!isLoadingQ && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{ background: `${config.color}18`, color: config.color }}
                                                        >{questions.length}</span>
                                                    )}
                                                </div>
                                                <button onClick={() => { setActiveViewKey(null); setEditingQ(null); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: 4, borderRadius: 6 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>

                                            {/* Questions list */}
                                            <div style={{ maxHeight: '520px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {isLoadingQ ? (
                                                    <div className="flex items-center justify-center py-8 gap-2" style={{ color: theme.textMuted }}>
                                                        <Spinner size={16} color={config.color} /> Loading questions…
                                                    </div>
                                                ) : questions.length === 0 ? (
                                                    <div className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No questions found.</div>
                                                ) : questions.map((q, idx) => {
                                                    const isEditing = editingQ?.id === q._id;
                                                    const isSaving = savingQ[q._id];
                                                    const isDeleting = deletingQ[q._id];

                                                    return (
                                                        <div key={q._id}
                                                            style={{ background: theme.bg, border: `1px solid ${isEditing ? config.color + '60' : theme.border}`, borderRadius: '8px', padding: '14px', transition: 'border-color .15s' }}
                                                        >
                                                            {isEditing ? (
                                                                /* ── Edit mode ── */
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="text-xs font-semibold block mb-1" style={{ color: theme.textMuted }}>Question</label>
                                                                        <textarea
                                                                            rows={3}
                                                                            value={editingQ.questionText}
                                                                            onChange={e => setEditingQ(q => ({ ...q, questionText: e.target.value }))}
                                                                            style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px', padding: '8px 10px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-semibold block mb-1" style={{ color: theme.textMuted }}>Options (select correct answer)</label>
                                                                        {editingQ.options.map((opt, i) => (
                                                                            <div key={i} className="flex items-center gap-2 mb-1.5">
                                                                                <input type="radio" name={`correct-${q._id}`} checked={editingQ.correctIdx === i}
                                                                                    onChange={() => setEditingQ(eq => ({ ...eq, correctIdx: i }))}
                                                                                    style={{ accentColor: config.color, flexShrink: 0 }}
                                                                                />
                                                                                <span className="text-xs font-bold" style={{ color: config.color, width: 14 }}>{String.fromCharCode(65 + i)}</span>
                                                                                <input type="text" value={opt}
                                                                                    onChange={e => {
                                                                                        const newOpts = [...editingQ.options];
                                                                                        newOpts[i] = e.target.value;
                                                                                        setEditingQ(eq => ({ ...eq, options: newOpts }));
                                                                                    }}
                                                                                    style={{ flex: 1, background: theme.surface, border: `1px solid ${editingQ.correctIdx === i ? config.color + '60' : theme.border}`, color: theme.textPrimary, borderRadius: '5px', padding: '5px 8px', fontSize: '12px', fontFamily: 'inherit' }}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-semibold block mb-1" style={{ color: theme.textMuted }}>Explanation</label>
                                                                        <textarea
                                                                            rows={2}
                                                                            value={editingQ.explanation}
                                                                            onChange={e => setEditingQ(q => ({ ...q, explanation: e.target.value }))}
                                                                            style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px', padding: '8px 10px', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => handleSaveQuestion(key)} disabled={isSaving}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                            style={{ background: isSaving ? 'rgba(255,255,255,0.05)' : config.color, color: isSaving ? theme.textMuted : '#000', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                                                                        >
                                                                            {isSaving ? <Spinner size={10} color={theme.textMuted} /> : <Save size={11} />} Save
                                                                        </button>
                                                                        <button onClick={() => setEditingQ(null)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                                            style={{ background: 'rgba(255,255,255,0.06)', color: theme.textMuted, border: `1px solid ${theme.border}`, cursor: 'pointer' }}
                                                                        >
                                                                            <X size={11} /> Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* ── View mode ── */
                                                                <>
                                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                                        <p className="text-sm font-medium leading-snug" style={{ color: theme.textPrimary }}>
                                                                            <span className="font-bold mr-1.5" style={{ color: config.color }}>Q{idx + 1}.</span>
                                                                            {q.questionText}
                                                                        </p>
                                                                        <div className="flex gap-1.5 flex-shrink-0">
                                                                            <button
                                                                                onClick={() => setEditingQ({
                                                                                    id: q._id,
                                                                                    questionText: q.questionText,
                                                                                    options: q.options.map(o => o.text),
                                                                                    correctIdx: q.options.findIndex(o => o.isCorrect),
                                                                                    explanation: q.explanation || '',
                                                                                })}
                                                                                title="Edit"
                                                                                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}
                                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = config.color; e.currentTarget.style.color = config.color; }}
                                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                                                                            >
                                                                                <Pencil size={12} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteQuestion(q._id, key)}
                                                                                disabled={isDeleting}
                                                                                title="Delete"
                                                                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '4px 7px', cursor: isDeleting ? 'not-allowed' : 'pointer', color: '#ef4444', display: 'flex' }}
                                                                                onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                                                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                                                            >
                                                                                {isDeleting ? <Spinner size={12} color="#ef4444" /> : <Trash2 size={12} />}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Options */}
                                                                    <div className="space-y-1 mb-3">
                                                                        {q.options?.map((opt, i) => (
                                                                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                                                                                style={{
                                                                                    background: opt.isCorrect ? `${config.color}15` : 'rgba(255,255,255,0.03)',
                                                                                    border: `1px solid ${opt.isCorrect ? config.color + '40' : 'rgba(255,255,255,0.06)'}`,
                                                                                }}
                                                                            >
                                                                                <span className="text-xs font-bold flex-shrink-0" style={{ color: opt.isCorrect ? config.color : theme.textMuted }}>
                                                                                    {String.fromCharCode(65 + i)}
                                                                                </span>
                                                                                <span className="text-xs" style={{ color: opt.isCorrect ? theme.textPrimary : theme.textSecondary }}>{opt.text}</span>
                                                                                {opt.isCorrect && <CheckCircle2 size={11} style={{ color: config.color, marginLeft: 'auto', flexShrink: 0 }} />}
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* Explanation */}
                                                                    {q.explanation && (
                                                                        <div className="px-2.5 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${config.color}40` }}>
                                                                            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>{q.explanation}</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TierQuizManager;
