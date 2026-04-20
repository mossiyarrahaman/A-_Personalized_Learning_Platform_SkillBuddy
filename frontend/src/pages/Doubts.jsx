import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Send, Bot, Tag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const Doubts = () => {
    const navigate = useNavigate();
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDoubt, setNewDoubt] = useState({ title: '', description: '', tags: '' });
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const inputStyle = {
        width: '100%', background: theme.surface2, border: `1px solid ${theme.border}`,
        borderRadius: '10px', padding: '10px 14px', color: theme.textPrimary,
        fontSize: '14px', outline: 'none', transition: 'border .2s', boxSizing: 'border-box',
        fontFamily: 'inherit',
    };

    useEffect(() => { fetchDoubts(); }, []);

    const fetchDoubts = async () => {
        try {
            const res = await api.get('/doubts/my');
            setDoubts(res.data.doubts);
        } catch {
            console.error('Failed to fetch doubts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/doubts', {
                ...newDoubt,
                tags: newDoubt.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setNewDoubt({ title: '', description: '', tags: '' });
            setShowForm(false);
            fetchDoubts();
        } catch {
            alert('Failed to post doubt');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>

            {/* Header */}
            <div style={{ background: theme.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{ padding: '7px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textSecondary, cursor: 'pointer', display: 'flex', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.color = theme.textPrimary; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Doubt Resolution</h1>
                </div>
                <button
                    onClick={() => setShowForm(s => !s)}
                    style={{ background: showForm ? theme.surface : aGrad, border: showForm ? `1px solid ${theme.border}` : 'none', borderRadius: '10px', padding: '9px 18px', color: showForm ? theme.textSecondary : '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .18s', boxShadow: showForm ? 'none' : `0 4px 16px ${accent.from}35` }}
                >
                    {showForm ? 'Cancel' : <><Plus size={15} /> Ask Question</>}
                </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                    {/* Ask form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                                style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px', marginBottom: '28px' }}
                            >
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, marginBottom: '18px' }}>Ask a Question</h2>
                                <form onSubmit={handleSubmit}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Title</label>
                                        <input
                                            type="text" value={newDoubt.title}
                                            onChange={e => setNewDoubt({ ...newDoubt, title: e.target.value })}
                                            style={inputStyle} required placeholder="e.g. How does useEffect work?"
                                            onFocus={e => e.target.style.borderColor = accent.from}
                                            onBlur={e => e.target.style.borderColor = theme.border}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Description</label>
                                        <textarea
                                            value={newDoubt.description}
                                            onChange={e => setNewDoubt({ ...newDoubt, description: e.target.value })}
                                            style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }} required
                                            placeholder="Describe your doubt in detail..."
                                            onFocus={e => e.target.style.borderColor = accent.from}
                                            onBlur={e => e.target.style.borderColor = theme.border}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Tags <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma separated)</span></label>
                                        <input
                                            type="text" value={newDoubt.tags}
                                            onChange={e => setNewDoubt({ ...newDoubt, tags: e.target.value })}
                                            style={inputStyle} placeholder="react, hooks, javascript"
                                            onFocus={e => e.target.style.borderColor = accent.from}
                                            onBlur={e => e.target.style.borderColor = theme.border}
                                        />
                                    </div>
                                    <button
                                        type="submit" disabled={submitting}
                                        style={{ background: aGrad, border: 'none', borderRadius: '10px', padding: '10px 22px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 16px ${accent.from}30` }}
                                    >
                                        <Send size={14} /> {submitting ? 'Posting...' : 'Post Doubt'}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Doubts list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {doubts.map(doubt => (
                            <motion.div
                                key={doubt._id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                style={{ background: theme.surface, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}
                            >
                                <div style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
                                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: theme.textPrimary, margin: 0, flex: 1 }}>{doubt.title}</h3>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
                                            background: doubt.status === 'answered' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                                            color: doubt.status === 'answered' ? '#22c55e' : '#eab308'
                                        }}>
                                            {doubt.status}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    {doubt.tags?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                            {doubt.tags.map((tag, i) => (
                                                <span key={i} style={{ background: `${accent.from}15`, color: accent.from, border: `1px solid ${accent.from}30`, borderRadius: '20px', padding: '3px 9px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Tag size={9} />#{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p style={{ fontSize: '14px', color: theme.textSecondary, lineHeight: 1.6, marginBottom: doubt.answers?.length > 0 ? '16px' : 0 }}>{doubt.description}</p>

                                    {/* AI Answer */}
                                    {doubt.answers?.length > 0 && (
                                        <div style={{ background: theme.bg, borderRadius: '10px', padding: '14px', border: `1px solid ${theme.border}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${accent.from}20`, border: `1px solid ${accent.from}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Bot size={13} style={{ color: accent.from }} />
                                                </div>
                                                <span style={{ fontWeight: 700, fontSize: '13px', color: accent.from }}>AI Assistant</span>
                                            </div>
                                            <p style={{ fontSize: '13.5px', color: theme.textSecondary, lineHeight: 1.65, margin: 0 }}>{doubt.answers[0].content}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {doubts.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', padding: '60px 24px', color: theme.textMuted, fontSize: '14px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: theme.surface, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <Bot size={24} style={{ color: theme.textMuted }} />
                                </div>
                                No doubts asked yet.
                                <p style={{ fontSize: '13px', color: theme.textMuted, marginTop: '6px', opacity: 0.7 }}>Click "Ask Question" to get AI-powered help.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Doubts;
