import React, { useState, useEffect, useRef } from 'react';
import { useAppTheme } from '../hooks/useAppTheme';
import api from '../api/axios';

const PROMPTS = [
    {
        key: 'whatClicked',
        label: "What clicked?",
        helper: "The one idea that finally made sense.",
    },
    {
        key: 'whatsFuzzy',
        label: "What's still fuzzy?",
        helper: "Something you'd want to ask a teacher about.",
    },
    {
        key: 'whereUseful',
        label: "Where will you use this?",
        helper: "A real scenario where this would matter.",
    },
];

const ReflectionModal = ({ isOpen, onClose, topicTitle, context }) => {
    const { theme, accent } = useAppTheme();
    const firstRef = useRef(null);

    const [values, setValues] = useState({ whatClicked: '', whatsFuzzy: '', whereUseful: '' });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValues({ whatClicked: '', whatsFuzzy: '', whereUseful: '' });
            setSaving(false);
            setSaved(false);
            setError('');
            setTimeout(() => firstRef.current?.focus(), 60);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const allEmpty = !values.whatClicked.trim() && !values.whatsFuzzy.trim() && !values.whereUseful.trim();

    const handleSubmit = async () => {
        if (allEmpty) return;
        setSaving(true);
        setError('');
        try {
            await api.post('/courses/reflections', {
                courseId:    context?.courseId   || null,
                pathId:      context?.pathId     || null,
                moduleId:    context?.moduleId   || '',
                topicId:     context?.topicId    || '',
                topicTitle:  topicTitle          || '',
                whatClicked: values.whatClicked.trim(),
                whatsFuzzy:  values.whatsFuzzy.trim(),
                whereUseful: values.whereUseful.trim(),
            });
            setSaved(true);
            setTimeout(() => onClose(), 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const aGrad = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '460px',
                    padding: '24px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                {/* Error strip */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: '#ef4444',
                    }}>
                        {error}
                    </div>
                )}

                {/* Heading */}
                <div>
                    <h2 style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: '18px',
                        fontWeight: 700,
                        color: theme.textPrimary,
                        margin: 0,
                    }}>
                        🎓 Quick reflection
                    </h2>
                    <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '8px 0 0', lineHeight: 1.5 }}>
                        You just finished <strong style={{ color: theme.textPrimary }}>{topicTitle}</strong>. Two minutes of reflection now will make this stick.
                    </p>
                </div>

                {/* Textareas */}
                {PROMPTS.map((p, i) => (
                    <div key={p.key}>
                        <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: theme.textMuted,
                            marginBottom: '5px',
                        }}>
                            {p.label}
                        </label>
                        <textarea
                            ref={i === 0 ? firstRef : null}
                            rows={3}
                            value={values[p.key]}
                            onChange={e => setValues(v => ({ ...v, [p.key]: e.target.value }))}
                            placeholder={p.helper}
                            style={{
                                width: '100%',
                                background: theme.bg || theme.surface2 || '#0f172a',
                                border: `1px solid ${theme.border}`,
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontSize: '13px',
                                color: theme.textPrimary,
                                resize: 'vertical',
                                fontFamily: "'DM Sans', sans-serif",
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color .15s',
                            }}
                            onFocus={e => e.target.style.borderColor = accent.from}
                            onBlur={e => e.target.style.borderColor = theme.border}
                        />
                        <p style={{ fontSize: '11.5px', color: theme.textMuted, margin: '3px 0 0' }}>
                            {p.helper}
                        </p>
                    </div>
                ))}

                {/* Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: theme.textMuted,
                            padding: '8px 12px',
                        }}
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={allEmpty || saving || saved}
                        style={{
                            background: (allEmpty || saving) ? `${accent.from}60` : aGrad,
                            border: 'none',
                            borderRadius: '10px',
                            padding: '9px 22px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#fff',
                            cursor: allEmpty || saving ? 'not-allowed' : 'pointer',
                            transition: 'background .15s, opacity .15s',
                            opacity: saving ? 0.8 : 1,
                            minWidth: '120px',
                        }}
                    >
                        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save reflection'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReflectionModal;
