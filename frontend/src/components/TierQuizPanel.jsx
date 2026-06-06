import React, { useState, useCallback } from 'react';
import { Lock, CheckCircle, ChevronRight, Trophy } from 'lucide-react';
import { TIER_CONFIG, TIERS, computeTierUnlocks, getTierStatus } from '../utils/tierUtils';
import QuizModal from './QuizModal';
import api from '../api/axios';
import { emitAnalyticsChanged } from '../utils/analyticsEvents';

const TierQuizPanel = ({
    courseId,
    moduleId,
    topicId,
    topicTitle,
    tierAvailability,   // from parent: byTopic[topicId].tiers
    topicScores = [],   // from parent: byTopic[topicId] array of { difficultyTier, score, isTeacherAssessment }
    onScoresRefresh,    // callback to re-fetch tier scores after quiz
    theme = {},
}) => {
    const [activeTier, setActiveTier] = useState(null);

    const unlocks = computeTierUnlocks(topicScores);

    const handleQuizClose = useCallback(async () => {
        setActiveTier(null);
        emitAnalyticsChanged('quiz_submitted');
        if (onScoresRefresh) await onScoresRefresh();
    }, [onScoresRefresh]);

    const tierHasQuestions = (tier) => {
        return tierAvailability?.[tier]?.questionCount > 0;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} style={{ color: '#a78bfa' }} />
                <span className="text-sm font-semibold" style={{ color: theme.textSecondary || '#d1d5db' }}>
                    Bloom's Level Progression
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TIERS.map((tier, idx) => {
                    const config = TIER_CONFIG[tier];
                    const tierUnlock = unlocks[tier];
                    const status = getTierStatus(tierUnlock);
                    const hasQuestions = tierHasQuestions(tier);
                    const nextTier = idx < TIERS.length - 1 ? TIER_CONFIG[TIERS[idx + 1]] : null;

                    return (
                        <div
                            key={tier}
                            style={{
                                background: status === 'locked'
                                    ? 'rgba(255,255,255,0.03)'
                                    : config.bg,
                                border: `1px solid ${status === 'locked' ? 'rgba(255,255,255,0.08)' : config.border}`,
                                borderRadius: '12px',
                                padding: '16px',
                                opacity: status === 'locked' ? 0.6 : 1,
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: status === 'locked' ? '#4b5563' : config.color,
                                            display: 'inline-block',
                                        }}
                                    />
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: status === 'locked' ? '#6b7280' : config.color }}
                                    >
                                        {config.label}
                                    </span>
                                </div>
                                {status === 'locked' && <Lock size={14} style={{ color: '#6b7280' }} />}
                                {status === 'passed' && <CheckCircle size={14} style={{ color: config.color }} />}
                                {status === 'attempted' && <ChevronRight size={14} style={{ color: config.color }} />}
                                {status === 'unlocked' && <ChevronRight size={14} style={{ color: config.color }} />}
                            </div>

                            {/* Bloom's tags */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {config.bloomLevels.map(bl => (
                                    <span
                                        key={bl}
                                        className="text-xs px-2 py-0.5 rounded-full capitalize"
                                        style={{
                                            background: status === 'locked' ? 'rgba(255,255,255,0.05)' : `${config.color}18`,
                                            color: status === 'locked' ? '#6b7280' : config.color,
                                            border: `1px solid ${status === 'locked' ? 'rgba(255,255,255,0.08)' : `${config.color}30`}`,
                                        }}
                                    >
                                        {bl}
                                    </span>
                                ))}
                            </div>

                            {/* Best score */}
                            {tierUnlock.bestScore !== null && (
                                <div className="mb-3">
                                    <div
                                        className="text-xs font-medium"
                                        style={{ color: tierUnlock.passed ? config.color : '#fbbf24' }}
                                    >
                                        Best: {tierUnlock.bestScore}%
                                        {tierUnlock.passed ? ' ✓' : ` (need 80%)`}
                                    </div>
                                    <div
                                        className="mt-1 h-1.5 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.1)' }}
                                    >
                                        <div
                                            className="h-1.5 rounded-full"
                                            style={{
                                                width: `${Math.min(tierUnlock.bestScore, 100)}%`,
                                                background: tierUnlock.passed ? config.color : '#fbbf24',
                                                transition: 'width 0.5s ease',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Locked hint */}
                            {status === 'locked' && idx > 0 && (
                                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
                                    Pass {TIER_CONFIG[TIERS[idx - 1]].label} (≥80%) to unlock
                                </p>
                            )}

                            {/* CTA */}
                            <button
                                disabled={status === 'locked'}
                                onClick={() => setActiveTier(tier)}
                                className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                                style={{
                                    background: status === 'locked'
                                        ? 'rgba(255,255,255,0.05)'
                                        : status === 'passed'
                                            ? `${config.color}20`
                                            : config.color,
                                    color: status === 'locked'
                                        ? '#4b5563'
                                        : status === 'passed'
                                            ? config.color
                                            : '#000',
                                    cursor: status === 'locked' ? 'not-allowed' : 'pointer',
                                    border: status === 'passed' ? `1px solid ${config.color}40` : 'none',
                                }}
                            >
                                {status === 'locked' ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                        <Lock size={12} /> Locked
                                    </span>
                                ) : status === 'passed' ? 'Retake Quiz' : 'Start Quiz'}
                            </button>

                            {/* Unlock indicator for next tier */}
                            {status === 'passed' && nextTier && (
                                <p className="text-xs mt-2 text-center" style={{ color: nextTier.color }}>
                                    {nextTier.label} unlocked!
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {activeTier && (
                <QuizModal
                    isOpen={!!activeTier}
                    onClose={handleQuizClose}
                    courseId={courseId}
                    moduleId={moduleId}
                    topicId={topicId}
                    topicTitle={topicTitle}
                    tierMode={true}
                    difficultyTier={activeTier}
                    existingUnlocks={unlocks}
                />
            )}
        </div>
    );
};

export default TierQuizPanel;
