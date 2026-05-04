import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { X, Send, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const ClassChat = ({ courseId, courseTitle, currentUser, onClose }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const bottomRef = useRef(null);

    // Fetch history
    useEffect(() => {
        api.get(`/chat/${courseId}/messages`)
            .then(res => setMessages(res.data.messages || []))
            .catch(() => {});
    }, [courseId]);

    // Socket connection
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('join_course', courseId);
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('new_message', msg => {
            setMessages(prev => {
                // Deduplicate by _id in case optimistic update already added it
                if (prev.some(m => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
        });

        return () => socket.disconnect();
    }, [courseId]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = useCallback(() => {
        const text = input.trim();
        if (!text || !socketRef.current) return;
        setInput('');
        socketRef.current.emit('send_message', { courseId, message: text });
    }, [input, courseId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isOwn = (msg) => msg.sender?._id?.toString() === currentUser.id?.toString();

    return (
        <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '340px',
            background: theme.surface, borderLeft: `1px solid ${theme.border}`,
            display: 'flex', flexDirection: 'column', zIndex: 100,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
        }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.border}`, background: theme.bg, display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: aGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={16} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {courseTitle ? courseTitle : 'Class Chat'}
                    </div>
                    <div style={{ fontSize: '11px', color: connected ? '#22c55e' : theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#22c55e' : theme.textMuted, display: 'inline-block' }} />
                        {connected ? 'Connected' : 'Connecting...'}
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: '13px', marginTop: '40px' }}>
                        No messages yet. Start the conversation!
                    </div>
                )}
                {messages.map((msg) => {
                    const own = isOwn(msg);
                    const isTeacher = msg.sender?.role === 'teacher';
                    return (
                        <div key={msg._id} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                            {/* Sender name + badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                                {!own && (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted }}>{msg.sender?.name}</span>
                                )}
                                {isTeacher && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: `${accent.from}20`, color: accent.from, border: `1px solid ${accent.from}30` }}>
                                        Teacher
                                    </span>
                                )}
                            </div>
                            {/* Bubble */}
                            <div style={{
                                maxWidth: '80%', padding: '9px 13px', borderRadius: own ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: own ? aGrad : theme.bg,
                                border: own ? 'none' : `1px solid ${theme.border}`,
                                color: own ? '#fff' : theme.textPrimary,
                                fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word',
                                boxShadow: own ? `0 2px 8px ${accent.from}30` : 'none',
                            }}>
                                {msg.message}
                            </div>
                            <span style={{ fontSize: '10px', color: theme.textMuted, marginTop: '3px' }}>{formatTime(msg.createdAt)}</span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${theme.border}`, background: theme.bg, display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    style={{
                        flex: 1, resize: 'none', border: `1px solid ${theme.border}`, borderRadius: '12px',
                        background: theme.surface, color: theme.textPrimary, fontSize: '13px',
                        padding: '9px 12px', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                        maxHeight: '100px', overflowY: 'auto',
                    }}
                    onFocus={e => e.target.style.borderColor = accent.from}
                    onBlur={e => e.target.style.borderColor = theme.border}
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    style={{
                        width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                        background: input.trim() ? aGrad : theme.border,
                        color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: input.trim() ? `0 2px 8px ${accent.from}40` : 'none',
                        transition: 'background .2s',
                    }}
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};

export default ClassChat;
