import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppTheme } from '../hooks/useAppTheme';
import api from '../api/axios';
import { onAnalyticsChanged } from '../utils/analyticsEvents';

function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
}

const ResumeCard = () => {
    const navigate = useNavigate();
    const { theme, accent } = useAppTheme();

    // undefined = loading, null = no data, object = has data
    const [resume, setResume] = useState(undefined);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [hovered, setHovered] = useState(false);

    const fetchResume = useCallback(async () => {
        try {
            const res = await api.get('/courses/resume-target');
            setResume(res.data.resume || null);
        } catch {
            setResume(null);
        }
    }, []);

    useEffect(() => {
        fetchResume();
    }, [fetchResume]);

    // After 200ms of loading, show a subtle skeleton
    useEffect(() => {
        if (resume !== undefined) { setShowSkeleton(false); return; }
        const t = setTimeout(() => setShowSkeleton(true), 200);
        return () => clearTimeout(t);
    }, [resume]);

    useEffect(() => {
        const refetch = () => fetchResume();
        window.addEventListener('focus', refetch);
        const off = onAnalyticsChanged(refetch);
        return () => { window.removeEventListener('focus', refetch); off(); };
    }, [fetchResume]);

    // Loading — render invisible spacer (no layout shift), then skeleton
    if (resume === undefined) {
        if (!showSkeleton) return <div style={{ height: '88px' }} />;
        return (
            <div style={{
                height: '88px',
                borderRadius: '16px',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                animation: 'rc-pulse 1.5s ease-in-out infinite',
            }}>
                <style>{`@keyframes rc-pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
            </div>
        );
    }

    // No data — render nothing
    if (!resume) return null;

    const pct = Math.max(0, Math.min(100, resume.progressPercent || 0));

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(resume.deeplink)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(resume.deeplink); } }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '18px 22px',
                borderRadius: '16px',
                background: hovered ? `${accent.from}08` : theme.surface,
                border: `1px solid ${hovered ? `${accent.from}40` : theme.border}`,
                borderLeft: `4px solid ${accent.from}`,
                cursor: 'pointer',
                transition: 'background .15s, border-color .15s',
                outline: 'none',
            }}
        >
            {/* Left: text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: theme.textMuted,
                    textTransform: 'uppercase',
                    margin: 0,
                }}>
                    Pick up where you left off
                </p>
                <h3 style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '18px',
                    fontWeight: 700,
                    color: theme.textPrimary,
                    margin: '5px 0 3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {resume.topicTitle}
                </h3>
                <p style={{ fontSize: '13px', color: theme.textSecondary, margin: 0 }}>
                    {resume.moduleTitle} · {resume.pathOrCourseTitle}
                </p>
                <p style={{ fontSize: '12px', color: theme.textMuted, margin: '4px 0 0' }}>
                    Last opened {timeAgo(resume.lastTouchedAt)}
                </p>
            </div>

            {/* Right: progress + continue hint */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '80px',
                        height: '6px',
                        borderRadius: '3px',
                        background: `${accent.from}25`,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
                            borderRadius: '3px',
                            transition: 'width .4s',
                        }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: accent.from, minWidth: '30px' }}>
                        {pct}%
                    </span>
                </div>
                {/* Continue hint — always visible on hover, faint otherwise */}
                <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: accent.from,
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity .15s',
                    userSelect: 'none',
                }}>
                    Continue →
                </span>
            </div>
        </div>
    );
};

export default ResumeCard;
