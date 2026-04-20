import React, { useState, useRef } from 'react';
import { X, Mic, Square, Send, Loader } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const DoubtReplyModal = ({ doubt, onClose, onReplySuccess }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [replyContent, setReplyContent] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const [sending, setSending] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState('');

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Microphone access denied or not available.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            let audioUrl = null;
            if (audioBlob) audioUrl = 'https://example.com/audio-ex-' + Date.now() + '.mp3';
            const payload = {
                content: replyContent,
                audioUrl,
                attachments: attachmentUrl ? [{ type: 'link', url: attachmentUrl, name: 'Attachment' }] : []
            };
            await api.post(`/doubts/${doubt._id}/reply`, payload);
            alert('Reply sent successfully!');
            onReplySuccess();
            onClose();
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Failed to send reply.');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const inputStyle = {
        width: '100%', background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '10px', padding: '11px 14px', color: theme.textPrimary,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 60 }}>
            <div style={{ background: theme.surface, borderRadius: '20px', width: '100%', maxWidth: '520px', border: `1px solid ${theme.border}`, boxShadow: `0 0 60px ${accent.glow}`, overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>Reply to Student</h3>
                        <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '3px' }}>Replying to: {doubt.title}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px', borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                    ><X size={18} /></button>
                </div>

                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Original query */}
                    <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: theme.textSecondary, fontStyle: 'italic', lineHeight: 1.6 }}>
                        "{doubt.description}"
                    </div>

                    {/* Text reply */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Your Answer</label>
                        <textarea
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            rows={4}
                            style={{ ...inputStyle, resize: 'none' }}
                            onFocus={e => e.target.style.borderColor = accent.from}
                            onBlur={e => e.target.style.borderColor = theme.border}
                            placeholder="Type your explanation here..."
                        />
                    </div>

                    {/* Audio recorder */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Voice Note (Optional)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!isRecording && !audioBlob && (
                                <button type="button" onClick={startRecording}
                                    style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '7px 14px', color: theme.textSecondary, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                                >
                                    <Mic size={13} /> Record Audio
                                </button>
                            )}
                            {isRecording && (
                                <button type="button" onClick={stopRecording}
                                    style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px', padding: '7px 14px', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                                >
                                    <Square size={13} /> Stop ({formatTime(recordingTime)})
                                </button>
                            )}
                            {audioBlob && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '7px 14px' }}>
                                    <div style={{ width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%' }} />
                                    <span style={{ color: '#22c55e', fontSize: '13px' }}>Audio Recorded</span>
                                    <button onClick={() => setAudioBlob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', marginLeft: '4px' }}><X size={11} /></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resource link */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Resource Link (Optional)</label>
                        <input
                            type="url"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = accent.from}
                            onBlur={e => e.target.style.borderColor = theme.border}
                            placeholder="e.g. https://docs.google.com/..."
                            value={attachmentUrl}
                            onChange={e => setAttachmentUrl(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose}
                        style={{ padding: '10px 18px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.textSecondary, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = theme.borderHover || theme.textMuted}
                        onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                    >Cancel</button>
                    <button onClick={handleSubmit} disabled={sending}
                        style={{ padding: '10px 22px', background: aGrad, border: 'none', borderRadius: '10px', color: '#fff', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', opacity: sending ? 0.7 : 1, boxShadow: `0 4px 14px ${accent.glow}`, fontFamily: 'inherit' }}
                    >
                        {sending ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
                        {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DoubtReplyModal;
