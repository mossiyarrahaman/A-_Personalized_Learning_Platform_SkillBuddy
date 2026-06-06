import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAppTheme } from '../hooks/useAppTheme';

const TutorPromptInput = ({ topicTitle, topicId, moduleId, courseId, pathId, onOpenTutor }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);

    const canOpen = value.replace(/\s/g, '').length >= 8;

    const handleSubmit = () => {
        if (!canOpen) return;
        onOpenTutor?.({
            topicTitle,
            topicId,
            moduleId,
            courseId:       courseId  || null,
            pathId:         pathId    || null,
            openingMessage: value.trim(),
        });
        setValue('');
        setFocused(false);
    };

    return (
        <div style={{
            background: theme.surface,
            border: `1px solid ${focused ? `${accent.from}50` : theme.border}`,
            borderRadius: '14px',
            padding: '16px',
            transition: 'border-color .2s',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                <MessageCircle size={14} style={{ color: accent.from }} />
                <span style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: accent.from,
                }}>
                    Talk it out
                </span>
            </div>

            <textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && canOpen) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
                rows={focused ? 3 : 1}
                placeholder="What part of this topic feels unclear?"
                style={{
                    width: '100%',
                    background: theme.bg,
                    border: `1px solid ${focused ? `${accent.from}50` : theme.border}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    color: theme.textPrimary,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.55,
                    boxSizing: 'border-box',
                    transition: 'border-color .15s, rows .2s',
                }}
            />

            {(focused || value.length > 0) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={!canOpen}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '10px',
                            background: canOpen ? aGrad : `${accent.from}35`,
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px', fontWeight: 600,
                            cursor: canOpen ? 'pointer' : 'not-allowed',
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'background .15s',
                        }}
                    >
                        Open Tutor →
                    </button>
                </div>
            )}
        </div>
    );
};

export default TutorPromptInput;
