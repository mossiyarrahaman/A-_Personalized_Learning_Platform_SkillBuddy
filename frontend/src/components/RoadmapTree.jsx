import React, { useState } from 'react';
import {
    Check, Lock, ChevronDown, ChevronUp, BookOpen,
    ArrowRight, CheckCircle2, Star,
    Target, TrendingUp, Brain,
    Flag, Wrench
} from 'lucide-react';
import { useAppTheme } from '../hooks/useAppTheme';
import QuizModal from './QuizModal';



// ─── Difficulty config ────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
    beginner:     { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.30)',   glow: 'rgba(34,197,94,0.20)',   emoji: '🟢', label: 'Beginner' },
    intermediate: { color: '#eab308', bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.30)',   glow: 'rgba(234,179,8,0.20)',   emoji: '🟡', label: 'Intermediate' },
    advanced:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.30)',  glow: 'rgba(249,115,22,0.20)',  emoji: '🟠', label: 'Advanced' },
    expert:       { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.30)',   glow: 'rgba(239,68,68,0.20)',   emoji: '🔴', label: 'Expert' },
    production:   { color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.30)',  glow: 'rgba(168,85,247,0.20)',  emoji: '🟣', label: 'Production' },
};

const inferDifficulty = (module, index) => {
    if (module.difficultyLevel && DIFFICULTY_CONFIG[module.difficultyLevel]) return module.difficultyLevel;
    if (index <= 1) return 'beginner';
    if (index <= 3) return 'intermediate';
    if (index <= 5) return 'advanced';
    return 'expert';
};

// ─── Topic List Item ──────────────────────────────────────────────────────────
const TopicListItem = ({ topic, moduleId, moduleStatus, diffConfig, onTopicClick, onTopicToggle, onQuizComplete, theme, index }) => {
    const [quizOpen, setQuizOpen] = useState(false);

    // Locked only if the parent module is locked; pending topics in unlocked modules are accessible
    const isLocked = moduleStatus === 'locked';
    const isDone = topic.status === 'completed';

    const openDetail = () => { if (!isLocked) onTopicClick?.(moduleId, topic.id || topic._id); };

    return (
        <>
            <div style={{
                borderRadius: '10px',
                border: `1px solid ${isDone ? '#22c55e30' : isLocked ? theme.border : diffConfig.border}`,
                background: isDone ? 'rgba(34,197,94,0.05)' : isLocked ? 'transparent' : diffConfig.bg,
                padding: '12px 14px',
                opacity: isLocked ? 0.55 : 1,
                transition: 'border-color .2s, box-shadow .2s',
            }}
                onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.borderColor = diffConfig.color + '60'; e.currentTarget.style.boxShadow = `0 2px 12px ${diffConfig.glow}`; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDone ? '#22c55e30' : isLocked ? theme.border : diffConfig.border; e.currentTarget.style.boxShadow = 'none'; }}
            >
                {/* Header row: number + status icon + title + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Index number */}
                    <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        background: isLocked ? `${theme.border}40` : isDone ? 'rgba(34,197,94,0.15)' : diffConfig.bg,
                        border: `1px solid ${isLocked ? theme.border : isDone ? '#22c55e50' : diffConfig.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700,
                        color: isLocked ? theme.textMuted : isDone ? '#22c55e' : diffConfig.color,
                    }}>
                        {isDone ? <Check size={10} strokeWidth={3} /> : index + 1}
                    </div>

                    {/* Title */}
                    <div
                        onClick={openDetail}
                        style={{
                            flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 600,
                            color: isDone ? theme.textMuted : theme.textPrimary,
                            textDecoration: isDone ? 'line-through' : 'none',
                            cursor: isLocked ? 'default' : 'pointer',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {topic.title}
                        </div>
                        {topic.description && (
                            <div style={{ fontSize: '11px', fontWeight: 400, color: theme.textMuted, marginTop: '1px', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {topic.description}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    {!isLocked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                                onClick={e => { e.stopPropagation(); setQuizOpen(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    padding: '3px 7px', borderRadius: '6px',
                                    border: `1px solid ${theme.border}`, background: 'none',
                                    color: theme.textMuted, cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                                    transition: 'all .15s', whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = diffConfig.color; e.currentTarget.style.color = diffConfig.color; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                            >
                                <Brain size={10} /> Quiz
                            </button>
                            <button
                                onClick={openDetail}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    padding: '3px 7px', borderRadius: '6px',
                                    border: `1px solid ${diffConfig.border}`, background: diffConfig.bg,
                                    color: diffConfig.color, cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                                    transition: 'all .15s', whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = diffConfig.color + '20'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = diffConfig.bg; }}
                            >
                                View <ArrowRight size={10} />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onTopicToggle?.(moduleId, topic.id || topic._id, isDone ? 'pending' : 'completed'); }}
                                title={isDone ? 'Mark undone' : 'Mark done'}
                                style={{
                                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${isDone ? '#22c55e' : theme.border}`,
                                    background: isDone ? '#22c55e' : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all .2s'
                                }}
                                onMouseEnter={e => { if (!isDone) e.currentTarget.style.borderColor = '#22c55e'; }}
                                onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = theme.border; }}
                            >
                                <Check size={10} style={{ color: isDone ? '#000' : 'transparent' }} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Subtopics list */}
                {topic.subtopics?.length > 0 && (
                    <div style={{
                        marginTop: '10px', paddingLeft: '32px',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        {topic.subtopics.map((sub, si) => (
                            <div key={si} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '7px',
                                fontSize: '11.5px', color: theme.textSecondary, lineHeight: 1.45,
                            }}>
                                <div style={{
                                    width: '5px', height: '5px', borderRadius: '50%', marginTop: '5px',
                                    background: isLocked ? theme.textMuted : diffConfig.color,
                                    flexShrink: 0, opacity: 0.6
                                }} />
                                <span>
                                    <strong style={{ color: isLocked ? theme.textMuted : theme.textSecondary }}>{sub.title}</strong>
                                    {sub.description && (
                                        <span style={{ color: theme.textMuted }}> — {sub.description}</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {quizOpen && (
                <QuizModal
                    isOpen={quizOpen}
                    onClose={() => setQuizOpen(false)}
                    topicTitle={topic.title}
                    topicId={topic.id || topic._id}
                    moduleId={moduleId}
                    onComplete={(result) => {
                        setQuizOpen(false);
                        if (result.pct >= 70) {
                            onTopicToggle?.(moduleId, topic.id || topic._id, 'completed');
                        }
                        onQuizComplete?.(result, moduleId, topic.id || topic._id);
                    }}
                />
            )}
        </>
    );
};

// ─── Phase Card ───────────────────────────────────────────────────────────────
const PhaseCard = ({ module, index, phaseNumber, onTopicClick, onTopicToggle, onQuizComplete, theme }) => {
    const diffKey = inferDifficulty(module, index);
    const diff = DIFFICULTY_CONFIG[diffKey];
    const [expanded, setExpanded] = useState(
        module.status === 'unlocked' || module.status === 'completed' || index === 0
    );

    const totalT = module.topics?.length || 0;
    const doneT = module.topics?.filter(t => t.status === 'completed').length || 0;
    const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;
    const isLocked = module.status === 'locked';

    return (
        <div style={{
            width: '100%',
            borderRadius: '18px',
            border: `1px solid ${isLocked ? theme.border : diff.border}`,
            background: theme.surface,
            overflow: 'hidden',
            boxShadow: isLocked ? 'none' : `0 4px 24px ${diff.glow}`,
            opacity: isLocked ? 0.6 : 1,
            transition: 'all .3s',
            marginBottom: '0',
        }}>
            {/* Colored top bar */}
            <div style={{ height: '3px', background: isLocked ? theme.border : diff.color, opacity: isLocked ? 0.4 : 1 }} />

            <div style={{ padding: '20px 22px' }}>
                {/* Phase header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Badges row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                                padding: '3px 9px', borderRadius: '20px',
                                background: isLocked ? `${theme.border}50` : diff.bg,
                                color: isLocked ? theme.textMuted : diff.color,
                                border: `1px solid ${isLocked ? theme.border : diff.border}`,
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                {diff.emoji} {diff.label}
                            </span>
                            <span style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 600 }}>
                                Phase {phaseNumber}
                            </span>
                            {module.status === 'completed' && (
                                <span style={{ fontSize: '10px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                    <Star size={9} fill="currentColor" /> Complete
                                </span>
                            )}
                            {isLocked && (
                                <Lock size={11} style={{ color: theme.textMuted }} />
                            )}
                        </div>

                        {/* Title */}
                        <h3 style={{
                            fontFamily: "'Sora',sans-serif", fontSize: '15px', fontWeight: 700,
                            color: theme.textPrimary, lineHeight: 1.3, margin: 0
                        }}>
                            {module.title}
                        </h3>

                        {/* Goal statement */}
                        {module.goalStatement && (
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: '6px',
                                marginTop: '6px', padding: '7px 10px', borderRadius: '8px',
                                background: isLocked ? `${theme.border}30` : diff.bg,
                                border: `1px solid ${isLocked ? theme.border : diff.border}`,
                            }}>
                                <Flag size={11} style={{ color: diff.color, flexShrink: 0, marginTop: '1px' }} />
                                <span style={{ fontSize: '11.5px', color: theme.textSecondary, lineHeight: 1.45 }}>
                                    <strong style={{ color: diff.color }}>Goal: </strong>{module.goalStatement}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Expand/collapse */}
                    {!isLocked && (
                        <button
                            onClick={() => setExpanded(p => !p)}
                            style={{
                                background: 'none', border: `1px solid ${theme.border}`, cursor: 'pointer',
                                color: theme.textMuted, padding: '5px 8px', borderRadius: '8px',
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '11px', fontWeight: 600, transition: 'all .15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = diff.color; e.currentTarget.style.color = diff.color; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {expanded ? 'Collapse' : `${totalT} topics`}
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                {!isLocked && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: theme.textMuted, marginBottom: '5px' }}>
                            <span>{doneT}/{totalT} topics completed</span>
                            <span style={{ fontWeight: 700, color: pct === 100 ? '#22c55e' : diff.color }}>{pct}%</span>
                        </div>
                        <div style={{ height: '5px', background: theme.border, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`,
                                background: pct === 100 ? '#22c55e' : diff.color,
                                borderRadius: '4px', transition: 'width .6s ease'
                            }} />
                        </div>
                    </div>
                )}

                {/* Topic list */}
                {!isLocked && expanded && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        marginBottom: module.practiceProjects?.length > 0 ? '18px' : '0'
                    }}>
                        {module.topics?.length > 0
                            ? module.topics.map((topic, ti) => (
                                <TopicListItem
                                    key={topic.id || topic._id || ti}
                                    topic={topic}
                                    index={ti}
                                    moduleId={module.id || module._id}
                                    moduleStatus={module.status}
                                    diffConfig={diff}
                                    onTopicClick={onTopicClick}
                                    onTopicToggle={onTopicToggle}
                                    onQuizComplete={onQuizComplete}
                                    theme={theme}
                                />
                            ))
                            : <div style={{ fontSize: '12px', color: theme.textMuted, fontStyle: 'italic' }}>No topics yet</div>
                        }
                    </div>
                )}

                {/* Collapsed hint */}
                {!isLocked && !expanded && totalT > 0 && (
                    <button
                        onClick={() => setExpanded(true)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '5px', fontSize: '11px', color: theme.textMuted,
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            borderRadius: '6px', transition: 'color .15s', marginBottom: '4px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = diff.color}
                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                    >
                        <BookOpen size={11} /> {totalT} topics <ChevronDown size={11} />
                    </button>
                )}

                {/* Practice projects */}
                {!isLocked && module.practiceProjects?.length > 0 && expanded && (
                    <div style={{
                        borderTop: `1px solid ${theme.border}`, paddingTop: '14px',
                        marginTop: module.topics?.length > 0 ? '0' : '4px'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '11px', fontWeight: 700, color: diff.color,
                            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px'
                        }}>
                            <Wrench size={12} /> Practice Projects
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {module.practiceProjects.map((project, pi) => (
                                <div key={pi} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    fontSize: '12.5px', color: theme.textSecondary, lineHeight: 1.4
                                }}>
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                        background: diff.bg, border: `1px solid ${diff.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '9px', fontWeight: 700, color: diff.color, marginTop: '1px'
                                    }}>
                                        {pi + 1}
                                    </div>
                                    {project}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Phase Connector ──────────────────────────────────────────────────────────
const PhaseConnector = ({ nextDiffKey }) => {
    const diff = DIFFICULTY_CONFIG[nextDiffKey] || DIFFICULTY_CONFIG.beginner;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
            <div style={{ width: '1px', height: '14px', background: diff.color, opacity: 0.3 }} />
            <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: diff.bg, border: `1px solid ${diff.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <ChevronDown size={14} style={{ color: diff.color }} />
            </div>
            <div style={{ width: '1px', height: '14px', background: diff.color, opacity: 0.3 }} />
        </div>
    );
};

// ─── Main RoadmapTree ─────────────────────────────────────────────────────────
const RoadmapTree = ({ modules = [], courseName = '', showHeader = true, onTopicClick, onTopicToggle, onQuizComplete }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const totalTopics = modules.reduce((s, m) => s + (m.topics?.length || 0), 0);
    const completedTopics = modules.reduce((s, m) => s + (m.topics?.filter(t => t.status === 'completed').length || 0), 0);
    const completedMods = modules.filter(m => m.status === 'completed').length;
    const overall = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <div style={{ width: '100%', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans',sans-serif", transition: 'background .3s' }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

            {/* Header — hidden when parent already provides a title */}
            {showHeader && (
            <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '2.5rem 1rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(to right, ${accent.from}, ${accent.to}, #22c55e)` }} />
                <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '200px', background: `${accent.from}10`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: 800, color: theme.textPrimary, marginBottom: '8px', position: 'relative' }}>
                    Learning Roadmap for{' '}
                    <span style={{ background: aGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>{courseName || 'Your Course'}</span>
                </h1>
                <p style={{ fontSize: '13px', color: theme.textSecondary, maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                    Progress through each phase to master your field. Click any topic to start learning.
                </p>

                {/* Stats pills */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {[
                        { icon: TrendingUp, val: `${overall}%`, label: 'overall', color: accent.from },
                        { icon: Target, val: `${completedTopics}/${totalTopics}`, label: 'topics done', color: '#34d399' },
                        { icon: CheckCircle2, val: `${completedMods}/${modules.length}`, label: 'phases done', color: '#60a5fa' },
                    ].map(({ icon: Icon, val, label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '7px 14px' }}>
                            <Icon size={14} style={{ color }} />
                            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>{val}</span>
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Overall progress bar */}
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div style={{ height: '6px', background: theme.border, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                        <div style={{ height: '100%', width: `${overall}%`, background: aGrad, borderRadius: '4px', transition: 'width 1s ease' }} />
                    </div>
                </div>
            </div>
            )}

            {/* Roadmap canvas */}
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
                {modules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: theme.textMuted }}>
                        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
                        <p style={{ fontSize: '15px', fontWeight: 500 }}>No phases yet</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>Your learning path will appear here once generated.</p>
                    </div>
                ) : (
                    modules.map((module, i) => (
                        <React.Fragment key={module.id || module._id || i}>
                            <PhaseCard
                                module={module}
                                index={i}
                                phaseNumber={i + 1}
                                onTopicClick={onTopicClick}
                                onTopicToggle={onTopicToggle}
                                onQuizComplete={onQuizComplete}
                                theme={theme}
                            />
                            {/* Connector between phases */}
                            {i < modules.length - 1 && (
                                <PhaseConnector
                                    nextDiffKey={inferDifficulty(modules[i + 1], i + 1)}
                                />
                            )}
                        </React.Fragment>
                    ))
                )}

                {/* Goal marker */}
                {modules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem' }}>
                        <div style={{ width: '1px', height: '2rem', background: theme.border }} />
                        <div style={{
                            padding: '8px 20px', borderRadius: '20px',
                            border: `2px solid ${overall === 100 ? '#22c55e' : theme.border}`,
                            color: overall === 100 ? '#22c55e' : theme.textMuted,
                            background: overall === 100 ? 'rgba(34,197,94,0.08)' : theme.surface,
                            fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            {overall === 100
                                ? <><Star size={12} fill="currentColor" /> Goal Reached!</>
                                : <><Target size={12} /> {100 - overall}% remaining</>
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoadmapTree;
