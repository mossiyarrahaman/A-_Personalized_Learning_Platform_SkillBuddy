import React, { useState, useEffect, useCallback } from 'react';
import { useAppTheme } from '../hooks/useAppTheme';
import api from '../api/axios';
import { onAnalyticsChanged } from '../utils/analyticsEvents';

const SEVERITY_STYLES = {
    critical: {
        bg: 'rgba(239,68,68,0.12)',
        color: '#ef4444',
        border: 'rgba(239,68,68,0.3)',
        label: 'Critical',
    },
    at_risk: {
        bg: 'rgba(251,191,36,0.12)',
        color: '#fbbf24',
        border: 'rgba(251,191,36,0.3)',
        label: 'At Risk',
    },
    needs_followup: null,
};

const AttentionWidget = ({ courseId, onStudentClick = () => {} }) => {
    const { theme, accent } = useAppTheme();
    const [students, setStudents] = useState(null); // null = loading
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        if (!courseId) return;
        try {
            const res = await api.get(`/courses/${courseId}/students-needing-attention`);
            setStudents(res.data.students || []);
            setError(false);
        } catch {
            setError(true);
        }
    }, [courseId]);

    useEffect(() => {
        setStudents(null);
        setError(false);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const refetch = () => fetchData();
        window.addEventListener('focus', refetch);
        const off = onAnalyticsChanged(refetch);
        return () => {
            window.removeEventListener('focus', refetch);
            off();
        };
    }, [fetchData]);

    const aGrad = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;

    return (
        <div style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '18px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 22px 14px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <h3 style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: '15px',
                        fontWeight: 700,
                        color: theme.textPrimary,
                        margin: 0,
                    }}>
                        Who needs your attention this week
                    </h3>
                    {students !== null && !error && (
                        <p style={{ fontSize: '12px', color: theme.textMuted, margin: '3px 0 0' }}>
                            Top {students.length} student{students.length !== 1 ? 's' : ''} based on recent activity
                        </p>
                    )}
                </div>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: `${accent.from}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent.from} strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
            </div>

            {/* Body */}
            <div>
                {/* Loading */}
                {students === null && !error && (
                    <div style={{ padding: '18px 22px', fontSize: '13px', color: theme.textMuted }}>
                        Loading...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ padding: '18px 22px', fontSize: '13px', color: theme.textMuted }}>
                        Couldn't load right now. Refresh to try again.
                    </div>
                )}

                {/* Empty */}
                {students !== null && !error && students.length === 0 && (
                    <div style={{
                        padding: '20px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                    }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <p style={{ fontSize: '13px', color: theme.textSecondary, margin: 0 }}>
                            All students are on track this week. Nice work.
                        </p>
                    </div>
                )}

                {/* Student rows */}
                {students !== null && !error && students.map((student, idx) => {
                    const sev = SEVERITY_STYLES[student.severity];
                    const isLast = idx === students.length - 1;
                    return (
                        <div
                            key={student.studentId}
                            role="button"
                            tabIndex={0}
                            onClick={() => onStudentClick(student.studentId)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStudentClick(student.studentId); } }}
                            style={{
                                padding: '12px 22px',
                                borderBottom: isLast ? 'none' : `1px solid ${theme.border}50`,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                transition: 'background .15s',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: aGrad,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                                marginTop: '1px',
                            }}>
                                {student.name ? student.name[0].toUpperCase() : '?'}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>
                                    {student.name}
                                </div>
                                <div style={{ fontSize: '12.5px', color: theme.textSecondary, marginTop: '2px', lineHeight: 1.4 }}>
                                    {student.reason}
                                </div>
                                <div style={{ fontSize: '11.5px', color: theme.textMuted, marginTop: '3px' }}>
                                    {student.actionHint}
                                </div>
                            </div>

                            {/* Severity pill */}
                            <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    background: sev ? sev.bg : `${theme.surface}`,
                                    color: sev ? sev.color : theme.textMuted,
                                    border: `1px solid ${sev ? sev.border : theme.border}`,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {sev ? sev.label : 'Follow Up'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttentionWidget;
