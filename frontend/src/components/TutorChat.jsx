import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useAppTheme } from '../hooks/useAppTheme';
import MarkdownContent from './MarkdownContent';
import api from '../api/axios';
import { emitAnalyticsChanged } from '../utils/analyticsEvents';

const LOADING_MESSAGES = ['Thinking…', 'Reading what you wrote…', 'Working on it…', 'Just a moment…'];

const TutorChat = ({ isOpen, onClose, sessionId, newSessionContext }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState(null);
    const [showRecap, setShowRecap] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [goalMetTriggered, setGoalMetTriggered] = useState(false);
    const [wrapUpOffered, setWrapUpOffered] = useState(false);
    const [wrapUpLoading, setWrapUpLoading] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setSession(null);
            setMessages([]);
            setInput('');
            setSending(false);
            setEnding(false);
            setError(null);
            setShowRecap(false);
            setLoadError(null);
            setGoalMetTriggered(false);
            setWrapUpOffered(false);
            setWrapUpLoading(false);
            setLoadingMsgIdx(0);
        }
    }, [isOpen]);

    // Load / create session on open
    useEffect(() => {
        if (!isOpen) return;
        if (!sessionId && !newSessionContext) return;

        const load = async () => {
            try {
                if (newSessionContext) {
                    try {
                        const res = await api.post('/tutor/sessions', {
                            moduleId:       newSessionContext.moduleId,
                            topicId:        newSessionContext.topicId,
                            topicTitle:     newSessionContext.topicTitle,
                            courseId:       newSessionContext.courseId  || null,
                            pathId:         newSessionContext.pathId    || null,
                            openingMessage: newSessionContext.openingMessage,
                        });
                        setSession(res.data.session);
                        setMessages(res.data.session.messages);
                    } catch (err) {
                        if (err.response?.status === 409) {
                            const existingId = err.response.data.existingSessionId;
                            const res2 = await api.get(`/tutor/sessions/${existingId}`);
                            setSession(res2.data.session);
                            setMessages(res2.data.session.messages);
                        } else {
                            throw err;
                        }
                    }
                } else {
                    const res = await api.get(`/tutor/sessions/${sessionId}`);
                    setSession(res.data.session);
                    setMessages(res.data.session.messages);
                }
            } catch (err) {
                setLoadError(err.response?.data?.error || 'Failed to load tutor session.');
            }
        };

        load();
    }, [isOpen, sessionId, newSessionContext]);

    // Focus input once session is ready
    useEffect(() => {
        if (isOpen && session?.status === 'active') {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen, session]);

    // Auto-scroll to bottom on new messages / typing indicator
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    // Escape key closes without ending
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Loading message rotation while sending
    useEffect(() => {
        if (!sending) { setLoadingMsgIdx(0); return; }
        const interval = setInterval(() => {
            setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [sending]);

    // Window focus refetch to pick up changes from other tabs/devices
    useEffect(() => {
        const onFocus = () => {
            if (session?._id && session.status === 'active') {
                api.get(`/tutor/sessions/${session._id}`)
                    .then(r => {
                        setSession(r.data.session);
                        setMessages(r.data.session.messages);
                    })
                    .catch(() => {});
            }
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [session]);

    // Textarea auto-grow (max 4 lines)
    const adjustHeight = useCallback(() => {
        const ta = inputRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    }, []);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending || !session || session.status === 'ended') return;

        const optimistic = { role: 'user', content: text, createdAt: new Date().toISOString(), _key: Date.now() };
        setMessages(prev => [...prev, optimistic]);
        setInput('');
        setSending(true);
        setError(null);
        if (inputRef.current) inputRef.current.style.height = 'auto';

        try {
            const res = await api.post(`/tutor/sessions/${session._id}/messages`, { content: text });
            setMessages(prev => [
                ...prev.filter(m => m !== optimistic),
                res.data.userMessage,
                res.data.assistantMessage,
            ]);
            if (res.data.goalMet && !wrapUpOffered) {
                setGoalMetTriggered(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleWrapUp = async () => {
        if (wrapUpLoading || !session) return;
        setGoalMetTriggered(false);
        setWrapUpOffered(true);
        setWrapUpLoading(true);
        setError(null);
        try {
            const res = await api.post(`/tutor/sessions/${session._id}/wrap-up`);
            setMessages(prev => [...prev, res.data.exerciseMessage]);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load practice problem.');
        } finally {
            setWrapUpLoading(false);
        }
    };

    const handleEnd = async () => {
        if (ending || !session) return;
        setEnding(true);
        setError(null);
        try {
            const res = await api.post(`/tutor/sessions/${session._id}/end`);
            setSession(res.data.session);
            setShowRecap(true);
            emitAnalyticsChanged('tutor_session_ended');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to end session.');
        } finally {
            setEnding(false);
        }
    };

    if (!isOpen) return null;
    if (!sessionId && !newSessionContext) return null;

    const isEnded = session?.status === 'ended';
    const canSend = input.trim().length > 0 && !sending && !isEnded;

    // Index of the last assistant message (for goal-met offer button)
    const lastAssistantIdx = messages.reduce((found, m, i) => m.role === 'assistant' ? i : found, -1);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 10100,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <style>{`
                @keyframes tc-pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }
                @keyframes tc-dot { 0%,80%,100%{transform:scale(1);opacity:.35} 40%{transform:scale(1.4);opacity:0.9} }
            `}</style>

            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '720px',
                    height: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                }}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div style={{
                    flexShrink: 0,
                    background: theme.surface,
                    borderBottom: `1px solid ${theme.border}`,
                    padding: '18px 24px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                margin: 0,
                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                                textTransform: 'uppercase', color: accent.from,
                            }}>
                                Tutor · Topic
                            </p>
                            {session ? (
                                <h2 style={{
                                    fontFamily: "'Sora', sans-serif",
                                    fontSize: '18px', fontWeight: 700,
                                    color: theme.textPrimary,
                                    margin: '4px 0 0',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {session.topicTitle}
                                </h2>
                            ) : (
                                <div style={{
                                    height: '24px', marginTop: '4px', width: '200px',
                                    background: theme.surface2, borderRadius: '6px',
                                    animation: 'tc-pulse 1.5s ease-in-out infinite',
                                }} />
                            )}
                            {session?.sessionGoal && (
                                <div style={{
                                    marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '3px 10px', borderRadius: '20px',
                                    background: `${accent.from}14`, border: `1px solid ${accent.from}30`,
                                    fontSize: '11px', color: accent.from, fontWeight: 500,
                                }}>
                                    Today's goal: {session.sessionGoal}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
                            {!isEnded && !showRecap ? (
                                <>
                                    <button
                                        onClick={onClose}
                                        disabled={!session}
                                        style={{
                                            padding: '7px 12px', border: 'none', background: 'none',
                                            color: theme.textMuted, fontSize: '12px', fontWeight: 500,
                                            cursor: !session ? 'not-allowed' : 'pointer',
                                            opacity: !session ? 0.5 : 1,
                                            fontFamily: "'DM Sans', sans-serif",
                                            transition: 'color .15s',
                                        }}
                                        onMouseEnter={e => { if (session) e.currentTarget.style.color = theme.textSecondary; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; }}
                                    >
                                        Save and continue later
                                    </button>
                                    <button
                                        onClick={handleEnd}
                                        disabled={ending || !session}
                                        style={{
                                            padding: '7px 14px', borderRadius: '10px',
                                            border: `1px solid ${theme.border}`,
                                            background: 'none',
                                            color: theme.textSecondary,
                                            fontSize: '12px', fontWeight: 600,
                                            cursor: (ending || !session) ? 'not-allowed' : 'pointer',
                                            opacity: (ending || !session) ? 0.5 : 1,
                                            transition: 'all .15s',
                                            fontFamily: "'DM Sans', sans-serif",
                                        }}
                                        onMouseEnter={e => { if (session && !ending) { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                                    >
                                        {ending ? 'Ending…' : 'End session'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '7px 14px', borderRadius: '10px',
                                        border: 'none',
                                        background: aGrad,
                                        color: '#fff',
                                        fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    Close
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                aria-label="Close tutor"
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    border: `1px solid ${theme.border}`, background: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: theme.textMuted, cursor: 'pointer',
                                    transition: 'all .15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Messages ─────────────────────────────────────────────── */}
                <div
                    aria-live="polite"
                    aria-label="Conversation"
                    style={{
                        flex: 1, overflowY: 'auto',
                        padding: '24px',
                        display: 'flex', flexDirection: 'column',
                        gap: '16px',
                    }}
                >
                    {loadError ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', height: '100%', gap: '12px',
                        }}>
                            <p style={{ fontSize: '14px', color: theme.textMuted }}>{loadError}</p>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px',
                                    border: `1px solid ${theme.border}`, background: 'none',
                                    color: theme.textSecondary, cursor: 'pointer', fontSize: '13px',
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                Close
                            </button>
                        </div>
                    ) : !session ? (
                        // Loading skeleton
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[{ pct: 60, side: 'flex-end' }, { pct: 80, side: 'flex-start' }, { pct: 45, side: 'flex-end' }].map(({ pct, side }, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: side }}>
                                    <div style={{
                                        height: '42px', width: `${pct}%`,
                                        borderRadius: '14px', background: theme.surface,
                                        animation: `tc-pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                                    }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Empty state — brief window before first messages render */}
                            {messages.length === 0 && (
                                <div style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    minHeight: '120px',
                                }}>
                                    <p style={{ fontSize: '14px', color: theme.textMuted, textAlign: 'center' }}>
                                        Type anything about this topic to get started.
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, idx) => {
                                const isWrapUp = msg.mode === 'wrap_up_exercise';
                                const showOfferButton = goalMetTriggered && !wrapUpOffered && !isEnded &&
                                    idx === lastAssistantIdx && !sending;

                                return (
                                    <div key={msg._id || msg._key || idx}>
                                        {isWrapUp && (
                                            <p style={{
                                                fontSize: '11px', fontWeight: 700,
                                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                                color: theme.textMuted,
                                                margin: '0 0 5px 4px',
                                            }}>
                                                🎯 Practice Problem
                                            </p>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        }}>
                                            <div style={{
                                                maxWidth: msg.role === 'user' ? '70%' : '80%',
                                                padding: '12px 16px',
                                                borderRadius: msg.role === 'user'
                                                    ? '18px 18px 4px 18px'
                                                    : '18px 18px 18px 4px',
                                                background: msg.role === 'user' ? aGrad : theme.surface,
                                                color: msg.role === 'user' ? '#fff' : theme.textPrimary,
                                                fontSize: '14px',
                                                lineHeight: 1.6,
                                                borderLeft: isWrapUp ? `3px solid ${accent.from}` : undefined,
                                            }}>
                                                {msg.role === 'user' ? (
                                                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {msg.content}
                                                    </span>
                                                ) : (
                                                    <MarkdownContent content={msg.content} theme={theme} accent={accent} />
                                                )}
                                                {showOfferButton && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        paddingTop: '10px',
                                                        borderTop: `1px solid ${theme.border}`,
                                                    }}>
                                                        <button
                                                            onClick={handleWrapUp}
                                                            disabled={wrapUpLoading}
                                                            style={{
                                                                padding: '6px 14px', borderRadius: '8px',
                                                                border: `1px solid ${accent.from}60`,
                                                                background: `${accent.from}14`,
                                                                color: accent.from,
                                                                fontSize: '12px', fontWeight: 600,
                                                                cursor: wrapUpLoading ? 'wait' : 'pointer',
                                                                fontFamily: "'DM Sans', sans-serif",
                                                                transition: 'all .15s',
                                                            }}
                                                        >
                                                            {wrapUpLoading ? 'Loading…' : '🎯 Try a quick problem'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Typing indicator with rotating message */}
                            {(sending || wrapUpLoading) && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '18px 18px 18px 4px',
                                        background: theme.surface,
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: theme.textMuted,
                                                    animation: `tc-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                                                }} />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '13px', color: theme.textMuted }}>
                                            {LOADING_MESSAGES[loadingMsgIdx]}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Session recap */}
                            {showRecap && (
                                <div style={{
                                    margin: '16px 0', padding: '20px',
                                    borderRadius: '12px',
                                    background: theme.surface,
                                    borderLeft: `4px solid ${accent.from}`,
                                }}>
                                    <p style={{
                                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
                                        textTransform: 'uppercase', color: theme.textMuted,
                                        margin: '0 0 12px',
                                    }}>
                                        Session Recap
                                    </p>
                                    {session?.summary ? (
                                        <p style={{
                                            fontSize: '14px', color: theme.textSecondary,
                                            lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line',
                                        }}>
                                            {session.summary}
                                        </p>
                                    ) : (
                                        <p style={{ fontSize: '13px', color: theme.textMuted, margin: 0 }}>
                                            Session ended. You can start a new conversation on this topic anytime.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Resumed ended session (no recap, just a note) */}
                            {isEnded && !showRecap && (
                                <div style={{
                                    margin: '8px 0', padding: '12px 16px',
                                    borderRadius: '12px', textAlign: 'center',
                                    background: theme.surface, border: `1px solid ${theme.border}`,
                                }}>
                                    <p style={{ fontSize: '13px', color: theme.textMuted, margin: 0 }}>
                                        This session has ended. Start a new one from the topic page.
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Inline send error — stays after messages */}
                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '10px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            fontSize: '13px', color: '#f87171',
                        }}>
                            {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ── Input ─────────────────────────────────────────────────── */}
                <div style={{
                    flexShrink: 0,
                    background: theme.surface,
                    borderTop: `1px solid ${theme.border}`,
                    padding: '16px 20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => { setInput(e.target.value); adjustHeight(); }}
                            onInput={adjustHeight}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (canSend) handleSend();
                                }
                            }}
                            placeholder={isEnded ? 'Session ended.' : 'Ask anything about this topic…'}
                            disabled={isEnded || !session}
                            rows={1}
                            style={{
                                flex: 1,
                                background: theme.bg,
                                border: `1px solid ${theme.border}`,
                                borderRadius: '12px',
                                padding: '10px 14px',
                                fontSize: '14px',
                                color: theme.textPrimary,
                                resize: 'none',
                                outline: 'none',
                                fontFamily: "'DM Sans', sans-serif",
                                lineHeight: '20px',
                                minHeight: '40px',
                                maxHeight: '100px',
                                overflow: 'auto',
                                transition: 'border-color .15s',
                                boxSizing: 'border-box',
                                opacity: isEnded ? 0.5 : 1,
                            }}
                            onFocus={e => e.target.style.borderColor = accent.from}
                            onBlur={e => e.target.style.borderColor = theme.border}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!canSend}
                            aria-label="Send message"
                            style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: canSend ? aGrad : `${accent.from}35`,
                                border: 'none', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: canSend ? 'pointer' : 'not-allowed',
                                transition: 'background .15s',
                            }}
                        >
                            <ArrowRight size={18} style={{ color: '#fff' }} />
                        </button>
                    </div>
                    <p style={{
                        fontSize: '11px', color: theme.textMuted,
                        margin: '6px 0 0', paddingLeft: '2px',
                    }}>
                        Your tutor conversations are private.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TutorChat;
