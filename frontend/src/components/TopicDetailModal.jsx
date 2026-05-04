import { useState, useEffect, useRef } from 'react';
import { X, Book, BookOpen, CheckCircle, Play, FileText, ExternalLink, Loader, ArrowRight, Link, Headphones, Video, Eye, Download, Brain, RefreshCw, AlertCircle, ChevronRight, XCircle, Target, Clock, Zap, ChevronDown, ChevronUp, Lightbulb, Code, List, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const BLOOMS_LEVELS = [
    { id: 'remember', label: 'Remembering', description: 'Recall facts and basic concepts' },
    { id: 'understand', label: 'Understanding', description: 'Explain ideas or concepts' },
    { id: 'apply', label: 'Applying', description: 'Use information in new situations' },
    { id: 'analyze', label: 'Analyzing', description: 'Draw connections among ideas' },
    { id: 'evaluate', label: 'Evaluating', description: 'Justify a stand or decision' },
    { id: 'create', label: 'Creating', description: 'Produce new or original work' }
];

const resourceIcon = (type) => {
    if (['youtube', 'video'].includes(type)) return <Video size={14} />;
    if (type === 'audio') return <Headphones size={14} />;
    if (type === 'link') return <Link size={14} />;
    if (type === 'practice') return <Code size={14} />;
    if (['reference', 'cheatsheet', 'docs'].includes(type)) return <BookOpen size={14} />;
    return <FileText size={14} />;
};

const resourceColorStyle = (type) => {
    if (['youtube', 'video'].includes(type)) return { color: '#f87171', background: 'rgba(239,68,68,0.1)' };
    if (type === 'audio') return { color: '#f472b6', background: 'rgba(236,72,153,0.1)' };
    if (type === 'link') return { color: '#22d3ee', background: 'rgba(6,182,212,0.1)' };
    if (type === 'practice') return { color: '#34d399', background: 'rgba(16,185,129,0.1)' };
    if (['reference', 'cheatsheet', 'docs'].includes(type)) return { color: '#a78bfa', background: 'rgba(139,92,246,0.1)' };
    return { color: '#60a5fa', background: 'rgba(59,130,246,0.1)' };
};

// ── Step-by-Step Plan Section ──────────────────────────────────────────────
const StepPlanSection = ({ plan, moduleId, topicId, pathId, onStepToggle }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const [expandedStep, setExpandedStep] = useState(0);
    const [steps, setSteps] = useState(plan.steps || []);

    const completedCount = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    const handleToggle = async (stepNumber, currentCompleted) => {
        const newCompleted = !currentCompleted;
        setSteps(prev => prev.map(s => s.stepNumber === stepNumber ? { ...s, completed: newCompleted } : s));
        try {
            const stepBody = { moduleId, topicId, stepNumber, completed: newCompleted };
            if (pathId) stepBody.pathId = pathId;
            await api.post('/courses/path/toggle-step', stepBody);
            if (onStepToggle) onStepToggle(steps.map(s => s.stepNumber === stepNumber ? { ...s, completed: newCompleted } : s));
        } catch {
            setSteps(prev => prev.map(s => s.stepNumber === stepNumber ? { ...s, completed: currentCompleted } : s));
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: aGrad }} />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: theme.textMuted }}>
                    {completedCount}/{totalSteps} subtopics
                </span>
            </div>

            {/* Steps */}
            <div className="space-y-2">
                {steps.map((step, idx) => {
                    const isExpanded = expandedStep === idx;
                    const cardStyle = step.completed
                        ? { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }
                        : isExpanded
                            ? { background: theme.surface2, border: `1px solid ${accent.from}40` }
                            : { background: theme.surface, border: `1px solid ${theme.border}` };
                    return (
                        <div key={step.stepNumber} className="rounded-xl overflow-hidden transition-all duration-200" style={cardStyle}>
                            {/* Step header */}
                            <button
                                className="w-full flex items-center gap-4 p-4 text-left"
                                onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
                                style={{ background: 'none', cursor: 'pointer' }}
                            >
                                <div
                                    className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all"
                                    style={step.completed
                                        ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' }
                                        : { borderColor: theme.border, color: theme.textMuted, background: 'none' }
                                    }
                                >
                                    {step.completed ? <CheckCircle size={15} fill="currentColor" /> : step.stepNumber}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm leading-snug" style={step.completed ? { color: '#22c55e', textDecoration: 'line-through', opacity: 0.7 } : { color: theme.textPrimary }}>
                                        {step.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock size={11} style={{ color: theme.textMuted }} />
                                        <span className="text-xs" style={{ color: theme.textMuted }}>{step.estimatedTime}</span>
                                        {step.resources?.length > 0 && (
                                            <>
                                                <span style={{ color: theme.border }}>•</span>
                                                <span className="text-xs" style={{ color: theme.textMuted }}>{step.resources.length} resources</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggle(step.stepNumber, step.completed); }}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                                        style={step.completed
                                            ? { background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)', color: '#22c55e' }
                                            : { background: theme.bg, borderColor: theme.border, color: theme.textMuted }
                                        }
                                        onMouseEnter={e => { if (!step.completed) { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.45)'; e.currentTarget.style.color = '#22c55e'; } }}
                                        onMouseLeave={e => { if (!step.completed) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; } }}
                                    >
                                        {step.completed ? 'Done ✓' : 'Mark done'}
                                    </button>
                                    {isExpanded
                                        ? <ChevronUp size={15} style={{ color: theme.textMuted }} />
                                        : <ChevronDown size={15} style={{ color: theme.textMuted }} />
                                    }
                                </div>
                            </button>

                            {/* Expanded body */}
                            {isExpanded && (
                                <div className="px-4 pb-6 space-y-5" style={{ borderTop: `1px solid ${theme.border}40` }}>

                                    {/* Explanation */}
                                    {step.explanation && (
                                        <p className="leading-relaxed text-sm pt-4" style={{ color: theme.textSecondary, lineHeight: '1.75' }}>{step.explanation}</p>
                                    )}

                                    {/* Teacher's Note */}
                                    {step.teacherNote && (
                                        <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}>
                                            <Lightbulb size={15} style={{ color: '#eab308', marginTop: '1px', flexShrink: 0 }} />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#eab308' }}>Teacher's Note</p>
                                                <p className="text-sm leading-relaxed" style={{ color: '#fef9c3' }}>{step.teacherNote}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Example */}
                                    {step.exampleCode && (
                                        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                                            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(99,102,241,0.08)', borderBottom: `1px solid ${theme.border}` }}>
                                                <Code size={13} style={{ color: '#818cf8' }} />
                                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#818cf8' }}>Example</span>
                                            </div>
                                            <pre
                                                className="p-4 overflow-x-auto text-sm leading-relaxed"
                                                style={{ background: '#0f0f17', color: '#c4b5fd', fontFamily: "'Fira Code', 'Consolas', monospace", margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                            >{step.exampleCode}</pre>
                                            {step.exampleExplanation && (
                                                <div className="px-4 py-3" style={{ background: 'rgba(99,102,241,0.05)', borderTop: `1px solid ${theme.border}` }}>
                                                    <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>{step.exampleExplanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Key Points */}
                                    {step.keyPoints?.length > 0 && (
                                        <div className="p-3.5 rounded-xl" style={{ background: `${accent.from}07`, border: `1px solid ${accent.from}20` }}>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <List size={13} style={{ color: accent.from }} />
                                                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accent.from }}>Key Points</p>
                                            </div>
                                            <ul className="space-y-1.5">
                                                {step.keyPoints.map((pt, ki) => (
                                                    <li key={ki} className="flex items-start gap-2.5 text-sm" style={{ color: theme.textSecondary }}>
                                                        <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: accent.from }} />
                                                        {pt}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Common Mistake */}
                                    {step.commonMistake && (
                                        <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <AlertTriangle size={15} style={{ color: '#f87171', marginTop: '1px', flexShrink: 0 }} />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#f87171' }}>Common Mistake</p>
                                                <p className="text-sm leading-relaxed" style={{ color: '#fecaca' }}>{step.commonMistake}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action */}
                                    {step.action && (
                                        <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: `${accent.from}08`, border: `1px solid ${accent.from}25` }}>
                                            <Zap size={15} style={{ color: accent.from, marginTop: '1px', flexShrink: 0 }} />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accent.from }}>Your Action</p>
                                                <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>{step.action}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resources */}
                                    {step.resources?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>Resources</p>
                                            {step.resources.map((res, ri) => (
                                                <a
                                                    key={ri}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-start gap-3 p-3 rounded-lg transition-all"
                                                    style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.borderHover; e.currentTarget.style.background = theme.surface; }}
                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.bg; }}
                                                >
                                                    <span style={{ padding: '6px', borderRadius: '6px', flexShrink: 0, display: 'flex', marginTop: '2px', ...resourceColorStyle(res.type) }}>
                                                        {resourceIcon(res.type)}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium block leading-snug" style={{ color: theme.textSecondary }}>{res.title}</span>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-xs font-semibold" style={{ color: resourceColorStyle(res.type).color }}>
                                                                {res.type === 'youtube' ? 'Video Tutorial'
                                                                 : res.type === 'practice' ? 'Practice Exercise'
                                                                 : ['reference', 'cheatsheet'].includes(res.type) ? 'Reference'
                                                                 : res.type === 'docs' ? 'Documentation'
                                                                 : 'Article / Docs'}
                                                            </span>
                                                            {res.platform && <><span style={{ color: theme.border }}>·</span><span className="text-xs" style={{ color: theme.textMuted }}>{res.platform}</span></>}
                                                            {res.duration && <><span style={{ color: theme.border }}>·</span><span className="text-xs" style={{ color: theme.textMuted }}>{res.duration}</span></>}
                                                        </div>
                                                        {res.description && (
                                                            <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>{res.description}</p>
                                                        )}
                                                    </div>
                                                    <ExternalLink size={12} style={{ color: theme.textMuted, flexShrink: 0, marginTop: '4px' }} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────
const TopicDetailModal = ({ courseId, moduleId, topicId, pathId, onClose, onUpdate }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [topic, setTopic] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshingPlan, setRefreshingPlan] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const refreshPlan = async () => {
        setRefreshingPlan(true);
        try {
            const refreshBody = { moduleId, topicId };
            if (pathId) refreshBody.pathId = pathId;
            const res = await api.post('/courses/path/refresh-plan', refreshBody);
            setTopic(res.data.topic);
        } catch (err) {
            console.error('Failed to refresh plan', err);
        } finally {
            setRefreshingPlan(false);
        }
    };

    // Quiz State
    const [quizOpen, setQuizOpen] = useState(false);
    const [quizStep, setQuizStep] = useState('setup');
    const [bloomLevel, setBloomLevel] = useState('understand');
    const [quizData, setQuizData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const scoreRef = useRef(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [quizResult, setQuizResult] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [quizError, setQuizError] = useState(null);


    const isAiPath = !courseId || courseId === 'undefined';

    const handlePreview = (resource) => {
        setPreviewFile({ url: resource.url, name: resource.title, type: resource.type });
    };

    // ── Quiz Logic ─────────────────────────────────────────────────────────
    const startQuizFlow = () => {
        setQuizOpen(true);
        setQuizStep('setup');
        setBloomLevel('understand');
        setQuizError(null);
        scoreRef.current = 0;
    };

    const generateQuiz = async () => {
        if (!moduleId || !topicId) {
            setQuizError('Missing topic information. Please reload and try again.');
            setQuizStep('setup');
            return;
        }
        setQuizStep('loading');
        setQuizError(null);
        try {
            let res;
            if (!isAiPath) {
                res = await api.get(`/courses/${courseId}/module/${moduleId}/topic/${topicId}/quiz?bloomLevel=${bloomLevel}`);
            } else {
                res = await api.post('/assessments/generate-from-context', { courseId: null, moduleId, topicId, bloomLevel });
            }
            const questions = res.data.questions || res.data.quiz?.questions;
            if (questions?.length > 0) {
                setQuizData(questions);
                setQuizStep('quiz');
                setCurrentQuestionIndex(0);
                scoreRef.current = 0;
                setSelectedAnswer(null);
                setShowExplanation(false);
                setShowHint(false);
            } else {
                setQuizError('No questions returned. Please try again.');
                setQuizStep('setup');
            }
        } catch (error) {
            const message = error.response?.data?.error || error.message || 'Unknown error';
            setQuizError(`Failed to generate quiz: ${message}`);
            setQuizStep('setup');
        }
    };

    const handleAnswerSelect = (option) => { if (!showExplanation) setSelectedAnswer(option); };

    const checkAnswer = () => {
        const currentQ = quizData[currentQuestionIndex];
        const isCorrect = selectedAnswer && currentQ.correctAnswer &&
            selectedAnswer.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
        if (isCorrect) { scoreRef.current += 1; }
        setShowExplanation(true);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < quizData.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setShowHint(false);
        } else {
            submitQuiz();
        }
    };

    const submitQuiz = async () => {
        setQuizStep('submitting');
        try {
            const finalScore = scoreRef.current;
            const finalScorePercentage = Math.round((finalScore / quizData.length) * 100);
            if (!isAiPath) {
                const res = await api.post(`/courses/${courseId}/module/${moduleId}/topic/${topicId}/quiz/submit`, {
                    score: finalScorePercentage, totalQuestions: quizData.length, correctAnswers: finalScore
                });
                setQuizResult({ passed: res.data.passed, score: finalScorePercentage, topicCompleted: res.data.topicCompleted });
                if (res.data.topicCompleted) { setTopic(prev => ({ ...prev, status: 'completed' })); if (onUpdate) onUpdate(); }
            } else {
                const passed = finalScorePercentage >= 70;
                setQuizResult({ passed, score: finalScorePercentage, topicCompleted: passed });
                if (passed) { setTopic(prev => ({ ...prev, status: 'completed' })); if (onUpdate) onUpdate(); }
            }
            setQuizStep('result');
        } catch (error) {
            setQuizError('Failed to submit quiz result. Please try again.');
            setQuizStep('setup');
        }
    };

    // ── Data Fetching ──────────────────────────────────────────────────────
    useEffect(() => {
        if (moduleId && topicId) {
            fetchTopicDetails();
            if (!isAiPath) fetchAnalytics();
        }
    }, [courseId, moduleId, topicId]);

    const fetchTopicDetails = async () => {
        try {
            setLoading(true);
            let queryParams = '';
            if (!isAiPath) queryParams = `?courseId=${courseId}`;
            else if (pathId) queryParams = `?pathId=${pathId}`;
            const res = await api.get(`/courses/module/${moduleId}/topic/${topicId}${queryParams}`);
            setTopic(res.data.topic);
        } catch (error) {
            console.error('Failed to load topic', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/courses/${courseId}/module/${moduleId}/topic/${topicId}/analytics`);
            setAnalytics(res.data.analytics);
        } catch { }
    };

    const toggleResource = async (resourceId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const updatedResources = topic.resources.map(r =>
                (r.id === resourceId || r._id === resourceId) ? { ...r, completed: newStatus } : r
            );
            setTopic({ ...topic, resources: updatedResources });
            const progressBody = { moduleId, topicId, resourceId, progress: newStatus ? 100 : 0 };
            if (pathId) progressBody.pathId = pathId;
            await api.post('/courses/progress', progressBody);
            if (onUpdate) onUpdate();
        } catch { console.error('Failed to update progress'); }
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    const allStepsDone = topic?.plan?.steps?.every(s => s.completed) ?? false;
    const allResourcesDone = topic?.resources?.every(r => r.completed) ?? false;
    const canTakeQuiz = isAiPath ? allStepsDone : allResourcesDone;

    const AnalyticsSection = () => {
        if (!analytics || analytics.length === 0) return null;
        return (
            <div className="mt-8 p-6 rounded-xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>Class Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-sm" style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}>
                                <th className="py-2 pl-2">Student</th>
                                <th className="py-2">Time Spent</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.map((student, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary }}>
                                    <td className="py-3 pl-2 font-medium">{student.name}</td>
                                    <td className="py-3 text-sm" style={{ color: theme.textMuted }}>
                                        {Math.floor(student.timeSpent / 60)}m {Math.floor(student.timeSpent % 60)}s
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${student.completed ? 'bg-green-500/20 text-green-400' : ''}`}
                                            style={!student.completed ? { background: theme.bg, color: theme.textMuted } : {}}>
                                            {student.completed ? 'Completed' : `${student.resourcesCompleted}/${student.totalResources} Resources`}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (!topicId) return null;

    const completedSteps = topic?.plan?.steps?.filter(s => s.completed).length ?? 0;
    const totalSteps = topic?.plan?.steps?.length ?? 0;
    const completedResources = topic?.resources?.filter(r => r.completed).length ?? 0;
    const totalResources = topic?.resources?.length ?? 0;
    const progressCount = isAiPath ? completedSteps : completedResources;
    const progressTotal = isAiPath ? totalSteps : totalResources;
    const progressPct = progressTotal > 0 ? Math.round((progressCount / progressTotal) * 100) : 0;

    return (
        <div className="fixed inset-0 flex flex-col" style={{ background: theme.bg, fontFamily: "'DM Sans', sans-serif", zIndex: 9999 }}>

            {/* ── Top Bar ── */}
            <div
                className="flex-shrink-0 flex items-center gap-4 px-6 py-4"
                style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, minHeight: '64px' }}
            >
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm font-medium transition-colors flex-shrink-0"
                    style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textSecondary; }}
                >
                    <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    Back
                </button>

                <div style={{ width: '1px', height: '20px', background: theme.border, flexShrink: 0 }} />

                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <h1 className="text-lg font-bold truncate" style={{ color: theme.textPrimary, fontFamily: "'Sora', sans-serif" }}>
                        {loading ? '—' : topic?.title}
                    </h1>
                    {!loading && topic?.status && (
                        <span
                            className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
                            style={topic.status === 'completed'
                                ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                                : { background: 'rgba(234,179,8,0.12)', color: '#eab308' }
                            }
                        >
                            {topic.status}
                        </span>
                    )}
                </div>

                {!loading && progressTotal > 0 && (
                    <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                        <div style={{ width: '120px', height: '4px', borderRadius: '99px', background: theme.border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progressPct}%`, background: aGrad, borderRadius: '99px', transition: 'width .4s ease' }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{progressPct}%</span>
                    </div>
                )}
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-5">
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: `${accent.from}12`, border: `1px solid ${accent.from}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader style={{ color: accent.from, width: '28px', height: '28px' }} className="animate-spin" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: '16px', color: theme.textPrimary, marginBottom: '6px' }}>Building your learning plan…</p>
                        <p style={{ fontSize: '13px', color: theme.textMuted }}>AI is curating resources for each subtopic</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: accent.from, opacity: 0.4, animation: `tdm-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                    </div>
                    <style>{`@keyframes tdm-pulse{0%,80%,100%{opacity:.4;transform:scale(1)}40%{opacity:1;transform:scale(1.35)}}`}</style>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex">

                    {/* ── Left Sidebar ── */}
                    <aside
                        className="flex-shrink-0 overflow-y-auto custom-scrollbar"
                        style={{ width: '320px', borderRight: `1px solid ${theme.border}`, background: theme.surface, display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="p-6 space-y-6 flex-1">

                            {/* Description */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Book size={14} style={{ color: accent.from }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Overview</span>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>{topic?.description}</p>
                            </div>

                            {/* Estimated time */}
                            {topic?.plan?.estimatedTime && (
                                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                                    <Clock size={14} style={{ color: accent.from }} />
                                    <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>{topic.plan.estimatedTime}</span>
                                </div>
                            )}

                            {/* Learning Objectives */}
                            {topic?.plan?.objectives?.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Target size={14} style={{ color: accent.from }} />
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Objectives</span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {topic.plan.objectives.map((obj, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: theme.textSecondary }}>
                                                <span
                                                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                                                    style={{ background: `${accent.from}18`, border: `1px solid ${accent.from}35`, color: accent.from }}
                                                >{i + 1}</span>
                                                {obj}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Progress */}
                            {progressTotal > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Progress</span>
                                        <span className="text-xs font-semibold" style={{ color: theme.textSecondary }}>{progressCount}/{progressTotal}</span>
                                    </div>
                                    <div style={{ height: '6px', borderRadius: '99px', background: theme.bg, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progressPct}%`, background: aGrad, borderRadius: '99px', transition: 'width .4s ease' }} />
                                    </div>
                                    <p className="text-xs mt-1.5" style={{ color: theme.textMuted }}>
                                        {progressPct === 100 ? 'All done — ready to quiz!' : `${progressTotal - progressCount} remaining`}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar footer: quiz + google */}
                        <div className="p-5 space-y-3 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
                            <button
                                onClick={startQuizFlow}
                                disabled={!canTakeQuiz}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                                style={canTakeQuiz
                                    ? { background: aGrad, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${accent.from}30` }
                                    : { background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}`, cursor: 'not-allowed' }
                                }
                            >
                                <Brain size={16} />
                                {topic?.status === 'completed' ? 'Retake Quiz' : canTakeQuiz ? 'Take Quiz' : 'Complete steps to unlock'}
                            </button>

                            <a
                                href={`https://google.com/search?q=${encodeURIComponent((topic?.title || '') + ' tutorial')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all group"
                                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                                onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.textSecondary; }}
                            >
                                Search on Google <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>
                    </aside>

                    {/* ── Main Content ── */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: theme.bg }}>
                        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 40px 64px' }}>

                            {/* ── AI PATH: Step-by-Step Plan ── */}
                            {isAiPath && topic?.plan?.steps?.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2.5">
                                            <Play size={16} style={{ color: accent.from }} />
                                            <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>Subtopics &amp; Resources</h2>
                                        </div>
                                        <button
                                            onClick={refreshPlan}
                                            disabled={refreshingPlan}
                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: refreshingPlan ? 'default' : 'pointer' }}
                                            onMouseEnter={e => { if (!refreshingPlan) { e.currentTarget.style.borderColor = accent.from + '60'; e.currentTarget.style.color = accent.from; } }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                                        >
                                            <RefreshCw size={12} className={refreshingPlan ? 'animate-spin' : ''} />
                                            {refreshingPlan ? 'Refreshing…' : 'Refresh'}
                                        </button>
                                    </div>
                                    <StepPlanSection
                                        plan={topic.plan}
                                        moduleId={moduleId}
                                        topicId={topicId}
                                        pathId={pathId}
                                        onStepToggle={(updatedSteps) => setTopic(prev => ({ ...prev, plan: { ...prev.plan, steps: updatedSteps } }))}
                                    />
                                </div>
                            )}

                            {/* ── AI PATH: fallback content ── */}
                            {isAiPath && (!topic?.plan?.steps || topic.plan.steps.length === 0) && topic?.content && (
                                <div className="rounded-xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                                    <div className="space-y-2">
                                        {topic.content.split('\n').map((line, i) => {
                                            if (line.trim().startsWith('###')) return <h4 key={i} className="text-base font-bold mt-5 mb-2 pb-2" style={{ color: theme.textPrimary, borderBottom: `1px solid ${theme.border}` }}>{line.replace(/###/g, '').trim()}</h4>;
                                            if (line.trim().startsWith('**')) return <strong key={i} className="block mt-3 mb-1" style={{ color: theme.textPrimary }}>{line.replace(/\*\*/g, '')}</strong>;
                                            if (line.trim().length === 0) return <br key={i} />;
                                            return <p key={i} className="mb-2 leading-relaxed text-sm" style={{ color: theme.textSecondary }}>{line.replace(/\*\*/g, '')}</p>;
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── TEACHER COURSE: resources list ── */}
                            {!isAiPath && (
                                <div>
                                    {topic?.content && (
                                        <div className="rounded-xl p-6 mb-8" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                                            <div className="space-y-2">
                                                {topic.content.split('\n').map((line, i) => {
                                                    if (line.trim().startsWith('###')) return <h4 key={i} className="text-base font-bold mt-5 mb-2 pb-2" style={{ color: theme.textPrimary, borderBottom: `1px solid ${theme.border}` }}>{line.replace(/###/g, '').trim()}</h4>;
                                                    if (line.trim().startsWith('**')) return <strong key={i} className="block mt-3 mb-1" style={{ color: theme.textPrimary }}>{line.replace(/\*\*/g, '')}</strong>;
                                                    if (line.trim().length === 0) return <br key={i} />;
                                                    return <p key={i} className="mb-2 leading-relaxed text-sm" style={{ color: theme.textSecondary }}>{line.replace(/\*\*/g, '')}</p>;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 mb-5">
                                        <ExternalLink size={16} style={{ color: accent.from }} />
                                        <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>Recommended Resources</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {topic?.resources?.map((resource, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-4 p-4 rounded-xl transition-all"
                                                style={resource.completed
                                                    ? { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }
                                                    : { background: theme.surface, border: `1px solid ${theme.border}` }
                                                }
                                                onMouseEnter={e => { if (!resource.completed) e.currentTarget.style.borderColor = theme.borderHover; }}
                                                onMouseLeave={e => { if (!resource.completed) e.currentTarget.style.borderColor = theme.border; }}
                                            >
                                                <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${['youtube', 'video'].includes(resource.type) ? 'bg-red-500/10 text-red-500' : resource.type === 'audio' ? 'bg-pink-500/10 text-pink-500' : resource.type === 'link' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {['youtube', 'video'].includes(resource.type) ? <Video size={18} /> : resource.type === 'audio' ? <Headphones size={18} /> : resource.type === 'link' ? <Link size={18} /> : <FileText size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-base truncate pr-2" style={{ color: theme.textPrimary }}>{resource.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: theme.textMuted }}>
                                                        <span className="capitalize px-2 py-0.5 rounded text-xs" style={{ background: theme.bg }}>{resource.type === 'article' ? 'Document' : resource.type}</span>
                                                        <span>•</span>
                                                        <span>{resource.duration || 'View Resource'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <button
                                                            onClick={() => handlePreview(resource)}
                                                            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                                            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: 'pointer' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = theme.bg; }}
                                                        >
                                                            <Eye size={13} style={{ color: '#60a5fa' }} /> Preview
                                                        </button>
                                                        <a
                                                            href={resource.url} download target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                                            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = theme.bg; }}
                                                        >
                                                            <Download size={13} style={{ color: '#34d399' }} /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleResource(resource.id || resource._id, resource.completed)}
                                                    className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                                                    style={resource.completed
                                                        ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff', cursor: 'pointer' }
                                                        : { background: 'none', borderColor: theme.border, color: 'transparent', cursor: 'pointer' }
                                                    }
                                                    onMouseEnter={e => { if (!resource.completed) e.currentTarget.style.borderColor = '#22c55e'; }}
                                                    onMouseLeave={e => { if (!resource.completed) e.currentTarget.style.borderColor = theme.border; }}
                                                    title="Mark as Done"
                                                >
                                                    <CheckCircle size={15} fill={resource.completed ? 'currentColor' : 'none'} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!topic?.resources || topic.resources.length === 0) && (
                                            <div className="text-center py-4 italic" style={{ color: theme.textMuted }}>No resources for this topic.</div>
                                        )}
                                    </div>
                                    <AnalyticsSection />
                                </div>
                            )}

                        </div>
                    </main>
                </div>
            )}

            {/* ── PREVIEW MODAL ──────────────────────────────────────────────────── */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                        <div className="flex justify-between items-center p-4" style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
                            <h3 className="font-bold truncate flex items-center gap-2" style={{ color: theme.textPrimary }}>
                                <span className="text-xs border px-2 py-0.5 rounded uppercase" style={{ color: accent.from, borderColor: `${accent.from}40` }}>{previewFile.type}</span>
                                {previewFile.name}
                            </h3>
                            <button
                                onClick={() => setPreviewFile(null)}
                                className="p-2 rounded-full transition"
                                style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; e.currentTarget.style.color = theme.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; }}
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="flex-1 relative flex flex-col items-center justify-center p-4" style={{ background: theme.bg }}>
                            {['video', 'youtube'].includes(previewFile.type) ? (
                                <video controls className="max-w-full max-h-full rounded-lg shadow-lg" src={previewFile.url}>Your browser does not support the video tag.</video>
                            ) : previewFile.type === 'audio' ? (
                                <div className="p-12 rounded-xl flex flex-col items-center gap-4" style={{ background: theme.surface }}>
                                    <Headphones size={48} className="text-pink-500" />
                                    <audio controls className="w-96" src={previewFile.url}>Your browser does not support the audio tag.</audio>
                                </div>
                            ) : previewFile.url?.endsWith('.pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-full bg-white" title="PDF Preview" />
                            ) : previewFile.url?.includes('localhost') || previewFile.url?.includes('127.0.0.1') ? (
                                <div className="text-center space-y-4">
                                    <FileText size={48} className="mx-auto" style={{ color: theme.textMuted }} />
                                    <div className="font-bold text-xl text-yellow-500">Preview Unavailable Locally</div>
                                    <p className="max-w-md mx-auto text-sm" style={{ color: theme.textMuted }}>Microsoft/Google Viewers cannot preview files hosted on localhost. Please download to view.</p>
                                </div>
                            ) : (
                                <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} className="w-full h-full absolute inset-0 bg-white" title="Doc Preview" />
                            )}
                            <a
                                href={previewFile.url} download
                                className="mt-6 absolute bottom-8 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-colors shadow-lg"
                                style={{ background: aGrad, color: '#fff' }}
                            >
                                <Download className="w-5 h-5" /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── QUIZ MODAL ────────────────────────────────────────────────────── */}
            {quizOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div
                        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        style={{ background: theme.surface, border: `1px solid ${accent.from}30`, boxShadow: `0 24px 80px rgba(0,0,0,0.6)` }}
                    >
                        <div className="p-5 flex justify-between items-center" style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                                    <Brain size={18} style={{ color: accent.from }} />
                                    Topic Quiz: {topic?.title}
                                </h2>
                                {quizStep === 'quiz' && (
                                    <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: theme.textMuted }}>
                                        Question {currentQuestionIndex + 1} / {quizData.length} • {bloomLevel}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setQuizOpen(false)}
                                style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1" style={{ background: theme.surface }}>
                            {quizStep === 'setup' && (
                                <div className="space-y-5">
                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold mb-2" style={{ color: theme.textPrimary }}>Ready to test your knowledge?</h3>
                                        <p className="text-sm" style={{ color: theme.textSecondary }}>Select a difficulty level to generate your quiz.</p>
                                    </div>
                                    {quizError && (
                                        <div className="p-4 rounded-xl flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                            <span>{quizError}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {BLOOMS_LEVELS.map((level) => (
                                            <button
                                                key={level.id}
                                                onClick={() => setBloomLevel(level.id)}
                                                className="p-4 rounded-xl text-left transition-all"
                                                style={bloomLevel === level.id
                                                    ? { background: aGrad, border: '1px solid transparent', color: '#fff', cursor: 'pointer' }
                                                    : { background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: 'pointer' }
                                                }
                                                onMouseEnter={e => { if (bloomLevel !== level.id) e.currentTarget.style.borderColor = theme.borderHover; }}
                                                onMouseLeave={e => { if (bloomLevel !== level.id) e.currentTarget.style.borderColor = theme.border; }}
                                            >
                                                <div className="font-bold mb-1 text-sm">{level.label}</div>
                                                <div className="text-xs opacity-70">{level.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={generateQuiz}
                                        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-4 transition-opacity hover:opacity-90"
                                        style={{ background: aGrad, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 4px 20px ${accent.from}30` }}
                                    >
                                        Start Quiz <ArrowRight size={18} />
                                    </button>
                                </div>
                            )}

                            {(quizStep === 'loading' || quizStep === 'submitting') && (
                                <div className="flex flex-col items-center justify-center py-12 text-center h-64">
                                    <Loader className="w-10 h-10 animate-spin mb-4" style={{ color: accent.from }} />
                                    <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
                                        {quizStep === 'loading' ? 'Generating Quiz…' : 'Saving your results…'}
                                    </h3>
                                    {quizStep === 'loading' && (
                                        <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
                                            AI is crafting questions at the <span className="font-semibold capitalize" style={{ color: accent.from }}>{bloomLevel}</span> level.
                                        </p>
                                    )}
                                </div>
                            )}

                            {quizStep === 'quiz' && quizData && (
                                <div className="space-y-5">
                                    <h3 className="text-base font-medium leading-relaxed p-4 rounded-xl" style={{ color: theme.textPrimary, background: theme.bg, border: `1px solid ${theme.border}` }}>
                                        {quizData[currentQuestionIndex].question}
                                    </h3>
                                    <div className="space-y-2.5">
                                        {quizData[currentQuestionIndex].options.map((option, idx) => {
                                            const isSelected = selectedAnswer === option;
                                            const isCorrect = option.trim().toLowerCase() === quizData[currentQuestionIndex].correctAnswer?.trim().toLowerCase();
                                            let optStyle = { background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textSecondary };
                                            if (showExplanation) {
                                                if (isCorrect) optStyle = { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.5)', color: '#bbf7d0' };
                                                else if (isSelected && !isCorrect) optStyle = { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' };
                                                else optStyle = { background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textMuted, opacity: 0.5 };
                                            } else if (isSelected) {
                                                optStyle = { background: `${accent.from}18`, border: `1px solid ${accent.from}60`, color: theme.textPrimary };
                                            }
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleAnswerSelect(option)}
                                                    disabled={showExplanation}
                                                    className="w-full p-4 rounded-xl text-left flex items-center justify-between transition-all"
                                                    style={{ ...optStyle, cursor: showExplanation ? 'default' : 'pointer' }}
                                                    onMouseEnter={e => { if (!showExplanation && !isSelected) e.currentTarget.style.borderColor = theme.borderHover; }}
                                                    onMouseLeave={e => { if (!showExplanation && !isSelected) e.currentTarget.style.borderColor = theme.border; }}
                                                >
                                                    <span className="font-medium">{option}</span>
                                                    {showExplanation && isCorrect && <CheckCircle size={18} className="text-green-400" />}
                                                    {showExplanation && isSelected && !isCorrect && <XCircle size={18} className="text-red-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizData[currentQuestionIndex].hint && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => setShowHint(!showHint)}
                                                className="text-sm text-yellow-400 hover:text-yellow-300 underline font-medium flex items-center gap-1"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Brain size={13} /> {showHint ? 'Hide Hint' : 'Show Hint'}
                                            </button>
                                            {showHint && (
                                                <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#fef08a' }}>
                                                    <strong>Hint:</strong> {quizData[currentQuestionIndex].hint}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {showExplanation && (() => {
                                        const isCorrect = selectedAnswer?.trim().toLowerCase() === quizData[currentQuestionIndex].correctAnswer?.trim().toLowerCase();
                                        return (
                                            <div className="mt-3 p-4 rounded-xl flex gap-3" style={isCorrect ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                <AlertCircle style={{ color: isCorrect ? '#22c55e' : '#ef4444', flexShrink: 0, marginTop: '1px' }} size={18} />
                                                <div>
                                                    <h4 className="font-bold mb-1" style={{ color: isCorrect ? '#bbf7d0' : '#fca5a5' }}>{isCorrect ? 'Correct!' : 'Incorrect'}</h4>
                                                    {!isCorrect && <p className="text-sm font-bold text-green-400 mb-1">Correct Answer: {quizData[currentQuestionIndex].correctAnswer}</p>}
                                                    <p className="text-sm leading-relaxed" style={{ color: isCorrect ? '#dcfce7' : '#fee2e2' }}>{quizData[currentQuestionIndex].explanation}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {quizStep === 'result' && quizResult && (
                                <div className="text-center py-8 space-y-5">
                                    <div
                                        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
                                        style={quizResult.passed ? { background: 'rgba(34,197,94,0.12)' } : { background: 'rgba(239,68,68,0.12)' }}
                                    >
                                        {quizResult.passed
                                            ? <CheckCircle size={44} className="text-green-400" />
                                            : <XCircle size={44} className="text-red-400" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>
                                            {quizResult.passed ? 'Topic Completed! 🎉' : 'Keep Practicing'}
                                        </h3>
                                        <p className="text-base" style={{ color: theme.textSecondary }}>
                                            You scored{' '}
                                            <span className="font-bold" style={{ color: quizResult.passed ? '#22c55e' : '#ef4444' }}>{quizResult.score}%</span>{' '}
                                            ({scoreRef.current}/{quizData?.length} correct)
                                        </p>
                                        {!quizResult.passed && <p className="text-sm mt-2" style={{ color: theme.textMuted }}>You need 70% to complete this topic.</p>}
                                    </div>
                                    <div className="flex gap-3 justify-center mt-6">
                                        <button
                                            onClick={() => { setQuizStep('setup'); scoreRef.current = 0; setQuizError(null); }}
                                            className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
                                            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textPrimary, cursor: 'pointer' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = theme.surface2; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = theme.bg; }}
                                        >
                                            <RefreshCw size={16} /> Retry
                                        </button>
                                        <button
                                            onClick={() => setQuizOpen(false)}
                                            className="px-5 py-2.5 rounded-xl font-bold transition"
                                            style={{ background: aGrad, color: '#fff', border: 'none', cursor: 'pointer' }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {quizStep === 'quiz' && (
                            <div className="p-4 flex justify-end" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                                {!showExplanation ? (
                                    <button
                                        onClick={checkAnswer}
                                        disabled={!selectedAnswer}
                                        className="px-5 py-2 rounded-lg font-bold transition"
                                        style={{
                                            background: selectedAnswer ? '#2563eb' : theme.surface,
                                            color: selectedAnswer ? '#fff' : theme.textMuted,
                                            border: `1px solid ${selectedAnswer ? '#2563eb' : theme.border}`,
                                            cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                                            opacity: selectedAnswer ? 1 : 0.6
                                        }}
                                    >
                                        Check Answer
                                    </button>
                                ) : (
                                    <button
                                        onClick={nextQuestion}
                                        className="px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition hover:opacity-90"
                                        style={{ background: aGrad, color: '#fff', border: 'none', cursor: 'pointer' }}
                                    >
                                        {currentQuestionIndex < quizData.length - 1 ? 'Next Question' : 'See Results'} <ChevronRight size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicDetailModal;
