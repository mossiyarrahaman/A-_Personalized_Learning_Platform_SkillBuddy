import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Book, BookOpen, CheckCircle, Play, FileText, ExternalLink, Loader, ArrowRight, Link, Headphones, Video, Eye, Download, Brain, RefreshCw, AlertCircle, ChevronRight, XCircle, Target, Clock, Zap, ChevronDown, ChevronUp, Lightbulb, Code, List, AlertTriangle, ClipboardList, Timer, Upload, Send } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';
import TierQuizPanel from './TierQuizPanel';

// Theme-aware markdown renderer. Handles: ## h2, ### h3, > blockquote, ``` code blocks,
// **bold**, `inline code`, - bullet lists, 1. ordered lists.
// Also normalises content stored with literal \n escape sequences.
function renderTopicContent(content, theme) {
    if (!content) return null;
    const lines = content.replace(/\\n/g, '\n').split('\n');
    const els = [];
    let i = 0;

    const inlineFmt = (text) => {
        const parts = [];
        const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
        let last = 0, m;
        while ((m = re.exec(text)) !== null) {
            if (m.index > last) parts.push(text.slice(last, m.index));
            const tok = m[0];
            if (tok.startsWith('**')) {
                parts.push(<strong key={m.index} style={{ color: theme.textPrimary, fontWeight: 600 }}>{tok.slice(2, -2)}</strong>);
            } else {
                parts.push(<code key={m.index} style={{ background: theme.bg, color: '#86efac', padding: '1px 6px', borderRadius: 4, fontSize: '0.8em', fontFamily: 'monospace' }}>{tok.slice(1, -1)}</code>);
            }
            last = m.index + tok.length;
        }
        if (last < text.length) parts.push(text.slice(last));
        return parts.length > 0 ? parts : text;
    };

    while (i < lines.length) {
        const line = lines[i];
        const t = line.trim();

        if (t.startsWith('```')) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
            i++;
            els.push(
                <pre key={els.length} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '12px 16px', margin: '12px 0', overflowX: 'auto' }}>
                    <code style={{ color: '#86efac', fontSize: '0.8em', fontFamily: 'monospace', lineHeight: 1.6 }}>{codeLines.join('\n')}</code>
                </pre>
            );
            continue;
        }
        if (/^## /.test(t)) {
            els.push(<h2 key={els.length} style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '1.1em', marginTop: 24, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${theme.border}` }}>{inlineFmt(t.slice(3))}</h2>);
            i++; continue;
        }
        if (/^### /.test(t)) {
            els.push(<h3 key={els.length} style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '0.95em', marginTop: 16, marginBottom: 6 }}>{inlineFmt(t.slice(4))}</h3>);
            i++; continue;
        }
        if (t.startsWith('> ')) {
            const qLines = [];
            while (i < lines.length && lines[i].trim().startsWith('> ')) { qLines.push(lines[i].trim().slice(2)); i++; }
            els.push(
                <blockquote key={els.length} style={{ borderLeft: '3px solid #a855f7', background: 'rgba(168,85,247,0.08)', paddingLeft: 12, paddingRight: 10, paddingTop: 6, paddingBottom: 6, margin: '10px 0', borderRadius: '0 6px 6px 0' }}>
                    {qLines.map((ql, qi) => <p key={qi} style={{ color: theme.textSecondary, fontSize: '0.875em', lineHeight: 1.6, margin: 0 }}>{inlineFmt(ql)}</p>)}
                </blockquote>
            );
            continue;
        }
        if (/^[-•] /.test(t)) {
            const items = [];
            while (i < lines.length && /^[-•] /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-•] /, '')); i++; }
            els.push(
                <ul key={els.length} style={{ paddingLeft: 20, margin: '8px 0' }}>
                    {items.map((it, ii) => <li key={ii} style={{ color: theme.textSecondary, fontSize: '0.875em', lineHeight: 1.7, listStyleType: 'disc' }}>{inlineFmt(it)}</li>)}
                </ul>
            );
            continue;
        }
        if (/^\d+\. /.test(t)) {
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\. /, '')); i++; }
            els.push(
                <ol key={els.length} style={{ paddingLeft: 20, margin: '8px 0' }}>
                    {items.map((it, ii) => <li key={ii} style={{ color: theme.textSecondary, fontSize: '0.875em', lineHeight: 1.7, listStyleType: 'decimal' }}>{inlineFmt(it)}</li>)}
                </ol>
            );
            continue;
        }
        if (t.length === 0) { i++; continue; }
        els.push(<p key={els.length} style={{ color: theme.textSecondary, fontSize: '0.875em', lineHeight: 1.7, marginBottom: 8 }}>{inlineFmt(t)}</p>);
        i++;
    }
    return els;
}

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

    // Assignments state
    const [assignments, setAssignments] = useState([]);
    const [submissionMap, setSubmissionMap] = useState({});
    const [expandedAssignment, setExpandedAssignment] = useState(null);
    const [subDraft, setSubDraft] = useState({});
    const [submitting, setSubmitting] = useState({});
    const [uploadingSubFile, setUploadingSubFile] = useState({});

    // Class tests state
    const [classTests, setClassTests] = useState([]);
    const [activeTest, setActiveTest] = useState(null);
    const [testAnswers, setTestAnswers] = useState({});
    const testAnswersRef = useRef({});
    const [testTimeLeft, setTestTimeLeft] = useState(0);
    const [testSubmitting, setTestSubmitting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const submittingTestRef = useRef(false);

    const isAiPath = !courseId || courseId === 'undefined';

    // Tier quiz state (teacher courses only)
    const [tierAvailability, setTierAvailability] = useState(null); // byTopic map from topic-quizzes endpoint
    const [tierScores, setTierScores] = useState({});               // byTopic map from my-tier-scores endpoint

    const fetchTierData = useCallback(async () => {
        if (isAiPath || !courseId) return;
        try {
            const [quizzesRes, scoresRes] = await Promise.allSettled([
                api.get(`/rag/topic-quizzes/${courseId}`),
                api.get(`/courses/${courseId}/my-tier-scores`),
            ]);
            if (quizzesRes.status === 'fulfilled') setTierAvailability(quizzesRes.value.data.quizzes || {});
            if (scoresRes.status === 'fulfilled') setTierScores(scoresRes.value.data.byTopic || {});
        } catch { /* non-fatal */ }
    }, [courseId, isAiPath]);

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

    // ── Class Test Timer ────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeTest || testResult) return;
        if (testTimeLeft <= 0) {
            if (submittingTestRef.current) return;
            submittingTestRef.current = true;
            const answers = activeTest.questions.map((q, i) => ({
                questionIndex: i, selectedLabel: testAnswersRef.current[i] || null,
            }));
            api.post(`/class-tests/${activeTest._id}/submit`, { answers })
                .then(res => setTestResult({ score: res.data.score, passed: res.data.passed, correctCount: res.data.correctCount, totalQuestions: res.data.totalQuestions }))
                .catch(() => {});
            return;
        }
        const timer = setTimeout(() => setTestTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [activeTest, testTimeLeft, testResult]);

    // ── Data Fetching ──────────────────────────────────────────────────────
    useEffect(() => {
        if (moduleId && topicId) {
            fetchTopicDetails();
            if (!isAiPath) { fetchAnalytics(); fetchTierData(); fetchAssignmentsAndTests(); }
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

    const fetchAssignmentsAndTests = useCallback(async () => {
        if (isAiPath || !courseId || !topicId) return;
        try {
            const [aRes, tRes] = await Promise.allSettled([
                api.get(`/assignments/topic/${courseId}/${topicId}`),
                api.get(`/class-tests/topic/${courseId}/${topicId}`),
            ]);
            if (aRes.status === 'fulfilled') {
                const list = aRes.value.data.assignments || [];
                setAssignments(list);
                const smap = {};
                list.forEach(a => { if (a.mySubmission) smap[a._id] = a.mySubmission; });
                setSubmissionMap(smap);
            }
            if (tRes.status === 'fulfilled') {
                const tests = (tRes.value.data.tests || []).filter(t => t.isPublished);
                setClassTests(tests);
            }
        } catch { /* non-fatal */ }
    }, [courseId, topicId, isAiPath]);

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
                            {/* Tier Quiz Panel — shown for teacher courses with tier quizzes */}
                            {!isAiPath && tierAvailability && topicId && tierAvailability[topicId]?.tiers
                                && Object.values(tierAvailability[topicId].tiers).some(t => t?.questionCount > 0)
                                ? (
                                    <TierQuizPanel
                                        courseId={courseId}
                                        moduleId={moduleId}
                                        topicId={topicId}
                                        topicTitle={topic?.title || ''}
                                        tierAvailability={tierAvailability[topicId]?.tiers || {}}
                                        topicScores={tierScores[topicId] || []}
                                        onScoresRefresh={fetchTierData}
                                        theme={theme}
                                    />
                                ) : (
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
                                )
                            }

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
                                    {renderTopicContent(topic.content, theme)}
                                </div>
                            )}

                            {/* ── TEACHER COURSE: resources list ── */}
                            {!isAiPath && (
                                <div>
                                    {topic?.content && (
                                        <div className="rounded-xl p-6 mb-8" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                                            {renderTopicContent(topic.content, theme)}
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

                                    {/* ── ASSIGNMENTS SECTION ── */}
                                    {assignments.length > 0 && (
                                        <div style={{ marginTop: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                                <ClipboardList size={16} style={{ color: '#fbbf24' }} />
                                                <h2 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>Assignments</h2>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {assignments.map(a => {
                                                    const sub = submissionMap[a._id];
                                                    const isDue = a.dueDate && new Date(a.dueDate) < new Date();
                                                    const canSubmit = !isDue && sub?.status !== 'returned';
                                                    const isExp = expandedAssignment === a._id;
                                                    return (
                                                        <div key={a._id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                                                            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedAssignment(isExp ? null : a._id)}>
                                                                <ClipboardList size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                                                                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
                                                                        {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'No due date'} · {a.maxPoints} pts
                                                                    </div>
                                                                </div>
                                                                {sub?.status === 'returned' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', flexShrink: 0 }}>{sub.grade}/{a.maxPoints} pts</span>}
                                                                {sub?.status === 'submitted' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', flexShrink: 0 }}>Submitted</span>}
                                                                {isDue && !sub && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', flexShrink: 0 }}>Past Due</span>}
                                                                {isExp ? <ChevronUp size={15} style={{ color: theme.textMuted, flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: theme.textMuted, flexShrink: 0 }} />}
                                                            </div>
                                                            {isExp && (
                                                                <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${theme.border}` }}>
                                                                    {a.instructions && (
                                                                        <div style={{ padding: '12px', background: theme.bg, borderRadius: '8px', fontSize: '13px', color: theme.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '12px 0', border: `1px solid ${theme.border}` }}>
                                                                            {a.instructions}
                                                                        </div>
                                                                    )}
                                                                    {a.attachments?.length > 0 && (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                                                            {a.attachments.map((f, i) => (
                                                                                <a key={i} href={f.fileUrl} download target="_blank" rel="noreferrer"
                                                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', color: theme.textSecondary, textDecoration: 'none' }}>
                                                                                    <FileText size={11} /> {f.fileName} <Download size={10} />
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {sub?.status === 'returned' && (
                                                                        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>Grade: {sub.grade}/{a.maxPoints} pts</div>
                                                                            {sub.feedback && <div style={{ fontSize: '13px', color: theme.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{sub.feedback}</div>}
                                                                        </div>
                                                                    )}
                                                                    {sub?.textResponse && sub.status !== 'returned' && (
                                                                        <div style={{ padding: '10px 12px', background: theme.bg, borderRadius: '8px', fontSize: '13px', color: theme.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.55, marginBottom: '12px', border: `1px solid ${theme.border}` }}>
                                                                            {sub.textResponse}
                                                                        </div>
                                                                    )}
                                                                    {canSubmit && (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                            <textarea
                                                                                value={subDraft[a._id]?.text ?? sub?.textResponse ?? ''}
                                                                                onChange={e => setSubDraft(d => ({ ...d, [a._id]: { ...d[a._id], text: e.target.value } }))}
                                                                                rows={4}
                                                                                placeholder="Type your answer here…"
                                                                                style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                                                            />
                                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: theme.textSecondary, cursor: 'pointer' }}>
                                                                                    <Upload size={11} />
                                                                                    {uploadingSubFile[a._id] ? 'Uploading…' : 'Attach File'}
                                                                                    <input type="file" style={{ display: 'none' }} disabled={!!uploadingSubFile[a._id]} onChange={async e => {
                                                                                        const file = e.target.files?.[0]; if (!file) return;
                                                                                        setUploadingSubFile(u => ({ ...u, [a._id]: true }));
                                                                                        try {
                                                                                            const fd = new FormData(); fd.append('file', file);
                                                                                            const res = await api.post('/upload', fd);
                                                                                            setSubDraft(d => ({ ...d, [a._id]: { ...d[a._id], files: [...(d[a._id]?.files || []), { fileName: file.name, fileUrl: res.data.fileUrl }] } }));
                                                                                        } catch { alert('File upload failed'); }
                                                                                        finally { setUploadingSubFile(u => ({ ...u, [a._id]: false })); }
                                                                                    }} />
                                                                                </label>
                                                                                {(subDraft[a._id]?.files || []).map((f, i) => (
                                                                                    <span key={i} style={{ fontSize: '11px', color: theme.textMuted, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '3px 9px' }}>{f.fileName}</span>
                                                                                ))}
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        setSubmitting(s => ({ ...s, [a._id]: true }));
                                                                                        try {
                                                                                            const draft = subDraft[a._id] || {};
                                                                                            const res = await api.post(`/assignments/${a._id}/submit`, { textResponse: draft.text || '', files: draft.files || [] });
                                                                                            setSubmissionMap(m => ({ ...m, [a._id]: res.data.submission }));
                                                                                            setSubDraft(d => { const n = { ...d }; delete n[a._id]; return n; });
                                                                                        } catch (err) { alert(err.response?.data?.error || 'Submission failed'); }
                                                                                        finally { setSubmitting(s => ({ ...s, [a._id]: false })); }
                                                                                    }}
                                                                                    disabled={submitting[a._id] || uploadingSubFile[a._id]}
                                                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: aGrad, border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', color: '#fff', fontWeight: 700, cursor: submitting[a._id] ? 'not-allowed' : 'pointer', opacity: submitting[a._id] ? 0.6 : 1, marginLeft: 'auto', fontFamily: 'inherit' }}
                                                                                >
                                                                                    <Send size={13} />
                                                                                    {submitting[a._id] ? 'Submitting…' : sub?.status === 'submitted' ? 'Update' : 'Submit'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── CLASS TESTS SECTION ── */}
                                    {classTests.length > 0 && (
                                        <div style={{ marginTop: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                                <Timer size={16} style={{ color: '#6366f1' }} />
                                                <h2 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>Class Tests</h2>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {classTests.map(t => {
                                                    const now = new Date();
                                                    const open = t.openAt ? new Date(t.openAt) : null;
                                                    const close = t.closeAt ? new Date(t.closeAt) : null;
                                                    const isOpen = open && close && now >= open && now <= close;
                                                    const isUpcoming = open && now < open;
                                                    const isClosed = close && now > close;

                                                    let statusChip;
                                                    if (isClosed) statusChip = { label: 'Closed', bg: 'rgba(255,255,255,0.06)', color: theme.textMuted, border: theme.border };
                                                    else if (isOpen) statusChip = { label: 'Open Now', bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' };
                                                    else if (isUpcoming) statusChip = { label: 'Upcoming', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' };
                                                    else statusChip = { label: 'Scheduled', bg: 'rgba(255,255,255,0.06)', color: theme.textMuted, border: theme.border };

                                                    return (
                                                        <div key={t._id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                            <Timer size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
                                                            <div style={{ flex: 1, minWidth: '120px' }}>
                                                                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>{t.title}</div>
                                                                <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span>{t.timeLimitMinutes} min</span>
                                                                    {t.questions?.length > 0 && <span>· {t.questions.length} questions</span>}
                                                                    {open && <span>· Opens {open.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                                                </div>
                                                            </div>
                                                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: statusChip.bg, color: statusChip.color, border: `1px solid ${statusChip.border}`, flexShrink: 0 }}>{statusChip.label}</span>
                                                            {isOpen && (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await api.post(`/class-tests/${t._id}/start`);
                                                                            testAnswersRef.current = {};
                                                                            setTestAnswers({});
                                                                            setTestTimeLeft(t.timeLimitMinutes * 60);
                                                                            setTestResult(null);
                                                                            submittingTestRef.current = false;
                                                                            setActiveTest({ ...t, questions: res.data.questions, attemptId: res.data.attemptId });
                                                                        } catch (err) { alert(err.response?.data?.error || 'Failed to start test'); }
                                                                    }}
                                                                    style={{ background: 'rgba(99,102,241,0.85)', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                                                                >
                                                                    Start Test
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
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

            {/* ── CLASS TEST OVERLAY ────────────────────────────────────────────── */}
            {activeTest && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
                    {/* Header */}
                    <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTest.title}</h2>
                            {!testResult && (
                                <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                                    {Object.keys(testAnswers).length}/{activeTest.questions.length} answered
                                </div>
                            )}
                        </div>
                        {!testResult && (
                            <div style={{ fontSize: '22px', fontWeight: 800, color: testTimeLeft < 300 ? '#ef4444' : '#22c55e', fontFamily: "'Sora', sans-serif", minWidth: '80px', textAlign: 'right', transition: 'color .5s' }}>
                                {Math.floor(testTimeLeft / 60)}:{String(testTimeLeft % 60).padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {testResult ? (
                            <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '40px' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{testResult.passed ? '🎉' : '😔'}</div>
                                <h2 style={{ fontSize: '28px', fontWeight: 800, color: theme.textPrimary, marginBottom: '8px', fontFamily: "'Sora', sans-serif" }}>{testResult.score}%</h2>
                                <p style={{ fontSize: '16px', fontWeight: 700, color: testResult.passed ? '#22c55e' : '#ef4444', marginBottom: '12px' }}>
                                    {testResult.passed ? 'You Passed!' : 'Not Passed'}
                                </p>
                                <p style={{ color: theme.textMuted, marginBottom: '32px' }}>{testResult.correctCount}/{testResult.totalQuestions} correct</p>
                                <button
                                    onClick={() => { setActiveTest(null); setTestResult(null); fetchAssignmentsAndTests(); }}
                                    style={{ background: aGrad, border: 'none', borderRadius: '12px', padding: '14px 40px', fontSize: '15px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div style={{ maxWidth: '660px', width: '100%' }}>
                                {activeTest.instructions && (
                                    <div style={{ padding: '12px 16px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', fontSize: '13px', color: theme.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
                                        {activeTest.instructions}
                                    </div>
                                )}
                                {activeTest.questions.map((q, qIdx) => (
                                    <div key={qIdx} style={{ marginBottom: '24px', background: theme.surface, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${theme.border}` }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Question {qIdx + 1}</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: theme.textPrimary, lineHeight: 1.55, marginBottom: '16px' }}>{q.questionText}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => {
                                                        testAnswersRef.current = { ...testAnswersRef.current, [qIdx]: opt.label };
                                                        setTestAnswers({ ...testAnswersRef.current });
                                                    }}
                                                    style={{
                                                        textAlign: 'left', padding: '11px 15px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                                                        background: testAnswers[qIdx] === opt.label ? `${accent.from}18` : theme.bg,
                                                        border: `1px solid ${testAnswers[qIdx] === opt.label ? accent.from : theme.border}`,
                                                        color: testAnswers[qIdx] === opt.label ? accent.from : theme.textSecondary,
                                                        transition: 'all .12s',
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 700, marginRight: '8px' }}>{opt.label}.</span>{opt.text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={async () => {
                                        if (submittingTestRef.current) return;
                                        submittingTestRef.current = true;
                                        setTestSubmitting(true);
                                        try {
                                            const answers = activeTest.questions.map((q, i) => ({
                                                questionIndex: i, selectedLabel: testAnswersRef.current[i] || null,
                                            }));
                                            const res = await api.post(`/class-tests/${activeTest._id}/submit`, { answers });
                                            setTestResult({ score: res.data.score, passed: res.data.passed, correctCount: res.data.correctCount, totalQuestions: res.data.totalQuestions });
                                        } catch (err) {
                                            alert(err.response?.data?.error || 'Submission failed');
                                            submittingTestRef.current = false;
                                        } finally { setTestSubmitting(false); }
                                    }}
                                    disabled={testSubmitting}
                                    style={{ width: '100%', background: aGrad, border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', color: '#fff', fontWeight: 700, cursor: testSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: testSubmitting ? 0.7 : 1, marginTop: '8px' }}
                                >
                                    {testSubmitting ? 'Submitting…' : 'Submit Test'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicDetailModal;
