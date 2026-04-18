import React, { useState, useEffect, useRef } from 'react';
import { X, Book, CheckCircle, Play, FileText, ExternalLink, Loader, ArrowRight, Link, Headphones, Video, Eye, Download, Brain, RefreshCw, AlertCircle, ChevronRight, XCircle, Target, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';

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
    return <FileText size={14} />;
};

const resourceColor = (type) => {
    if (['youtube', 'video'].includes(type)) return 'text-red-400 bg-red-500/10';
    if (type === 'audio') return 'text-pink-400 bg-pink-500/10';
    if (type === 'link') return 'text-cyan-400 bg-cyan-500/10';
    return 'text-blue-400 bg-blue-500/10';
};

// ── Step-by-Step Plan Section ──────────────────────────────────────────────
const StepPlanSection = ({ plan, moduleId, topicId, onStepToggle }) => {
    const [expandedStep, setExpandedStep] = useState(0);
    const [steps, setSteps] = useState(plan.steps || []);

    const completedCount = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    const handleToggle = async (stepNumber, currentCompleted) => {
        const newCompleted = !currentCompleted;
        setSteps(prev => prev.map(s => s.stepNumber === stepNumber ? { ...s, completed: newCompleted } : s));
        try {
            await api.post('/courses/path/toggle-step', { moduleId, topicId, stepNumber, completed: newCompleted });
            if (onStepToggle) onStepToggle(steps.map(s => s.stepNumber === stepNumber ? { ...s, completed: newCompleted } : s));
        } catch {
            // revert on failure
            setSteps(prev => prev.map(s => s.stepNumber === stepNumber ? { ...s, completed: currentCompleted } : s));
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <span className="text-sm font-bold text-gray-400 whitespace-nowrap">
                    {completedCount}/{totalSteps} steps
                </span>
            </div>

            {/* Steps */}
            <div className="space-y-3">
                {steps.map((step, idx) => {
                    const isExpanded = expandedStep === idx;
                    return (
                        <div
                            key={step.stepNumber}
                            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                                step.completed
                                    ? 'bg-green-900/10 border-green-500/30'
                                    : isExpanded
                                        ? 'bg-[#1a1a2e] border-purple-500/40'
                                        : 'bg-[#151515] border-gray-800 hover:border-gray-700'
                            }`}
                        >
                            {/* Step header */}
                            <button
                                className="w-full flex items-center gap-4 p-4 text-left"
                                onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
                            >
                                {/* Step number / check */}
                                <div
                                    className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                                        step.completed
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-gray-600 text-gray-400'
                                    }`}
                                >
                                    {step.completed ? <CheckCircle size={16} fill="currentColor" /> : step.stepNumber}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-base leading-snug ${step.completed ? 'text-green-300 line-through opacity-70' : 'text-white'}`}>
                                        {step.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock size={12} className="text-gray-500" />
                                        <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                                        {step.resources?.length > 0 && (
                                            <>
                                                <span className="text-gray-700">•</span>
                                                <span className="text-xs text-gray-500">{step.resources.length} resources</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Mark done button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggle(step.stepNumber, step.completed); }}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                            step.completed
                                                ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-500/40 hover:text-green-400'
                                        }`}
                                    >
                                        {step.completed ? 'Done ✓' : 'Mark done'}
                                    </button>
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                </div>
                            </button>

                            {/* Expanded body */}
                            {isExpanded && (
                                <div className="px-4 pb-5 space-y-4 border-t border-gray-800/60">
                                    {/* Explanation */}
                                    {step.explanation && (
                                        <p className="text-gray-300 leading-relaxed text-sm pt-4">{step.explanation}</p>
                                    )}

                                    {/* Action */}
                                    {step.action && (
                                        <div className="flex items-start gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                            <Zap size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Action</p>
                                                <p className="text-gray-300 text-sm">{step.action}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resources */}
                                    {step.resources?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resources</p>
                                            {step.resources.map((res, ri) => (
                                                <a
                                                    key={ri}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-lg transition-all group"
                                                >
                                                    <span className={`p-1.5 rounded-md flex-shrink-0 ${resourceColor(res.type)}`}>
                                                        {resourceIcon(res.type)}
                                                    </span>
                                                    <span className="flex-1 text-sm text-gray-300 group-hover:text-white truncate">{res.title}</span>
                                                    <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
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
const TopicDetailModal = ({ courseId, moduleId, topicId, onClose, onUpdate }) => {
    const [topic, setTopic] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState(null);

    // Quiz State
    const [quizOpen, setQuizOpen] = useState(false);
    const [quizStep, setQuizStep] = useState('setup');
    const [bloomLevel, setBloomLevel] = useState('understand');
    const [quizData, setQuizData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const scoreRef = useRef(0);
    const [scoreDisplay, setScoreDisplay] = useState(0);
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
        setScoreDisplay(0);
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
                setScoreDisplay(0);
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
        if (isCorrect) { scoreRef.current += 1; setScoreDisplay(scoreRef.current); }
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
            const queryParams = !isAiPath ? `?courseId=${courseId}` : '';
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
            await api.post('/courses/progress', { moduleId, topicId, resourceId, progress: newStatus ? 100 : 0 });
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
            <div className="mt-8 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold text-gray-200 mb-4">Class Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700 text-sm">
                                <th className="py-2 pl-2">Student</th>
                                <th className="py-2">Time Spent</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.map((student, idx) => (
                                <tr key={idx} className="border-b border-gray-800 text-gray-300">
                                    <td className="py-3 pl-2 font-medium">{student.name}</td>
                                    <td className="py-3 text-sm text-gray-400">
                                        {Math.floor(student.timeSpent / 60)}m {Math.floor(student.timeSpent % 60)}s
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${student.completed ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
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

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Sidebar Drawer */}
            <div className="relative w-full max-w-2xl h-full bg-[#111] border-l border-gray-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-slide-in-right">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-[#151515] flex justify-between items-start sticky top-0 z-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                            {loading ? 'Loading...' : topic?.title}
                        </h2>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${topic?.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {topic?.status || 'Pending'}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0a0a0a]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                            <p className="font-medium">Building your learning plan...</p>
                            <p className="text-sm mt-1 text-gray-600">AI is curating step-by-step content</p>
                        </div>
                    ) : (
                        <div className="space-y-10">

                            {/* Topic Overview */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-200 mb-3 flex items-center">
                                    <Book className="w-5 h-5 mr-3 text-purple-500" />
                                    Topic Overview
                                </h3>
                                <p className="text-gray-400 leading-relaxed text-lg">{topic?.description}</p>
                            </div>

                            {/* ── AI PATH: Step-by-Step Plan ── */}
                            {isAiPath && topic?.plan?.steps?.length > 0 && (
                                <div>
                                    {/* Learning Objectives */}
                                    {topic.plan.objectives?.length > 0 && (
                                        <div className="mb-6 p-5 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Target size={18} className="text-purple-400" />
                                                <h4 className="font-bold text-white">Learning Objectives</h4>
                                                <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Clock size={12} />
                                                    {topic.plan.estimatedTime}
                                                </span>
                                            </div>
                                            <ul className="space-y-2">
                                                {topic.plan.objectives.map((obj, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                        <span className="mt-0.5 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                                                        {obj}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Steps */}
                                    <h3 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
                                        <Play className="w-5 h-5 mr-3 text-blue-500" />
                                        Step-by-Step Plan
                                    </h3>
                                    <StepPlanSection
                                        plan={topic.plan}
                                        moduleId={moduleId}
                                        topicId={topicId}
                                        onStepToggle={(updatedSteps) => setTopic(prev => ({ ...prev, plan: { ...prev.plan, steps: updatedSteps } }))}
                                    />
                                </div>
                            )}

                            {/* ── AI PATH: fallback if plan not yet generated ── */}
                            {isAiPath && (!topic?.plan?.steps || topic.plan.steps.length === 0) && topic?.content && (
                                <div className="bg-[#151515] rounded-xl p-6 border border-gray-800 shadow-sm">
                                    <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                                        {topic.content.split('\n').map((line, i) => {
                                            if (line.trim().startsWith('###')) return <h4 key={i} className="text-lg font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">{line.replace(/###/g, '').trim()}</h4>;
                                            if (line.trim().startsWith('**')) return <strong key={i} className="block text-white mt-4 mb-2">{line.replace(/\*\*/g, '')}</strong>;
                                            if (line.trim().length === 0) return <br key={i} />;
                                            return <p key={i} className="mb-2 leading-relaxed opacity-90">{line.replace(/\*\*/g, '')}</p>;
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── TEACHER COURSE: resources list ── */}
                            {!isAiPath && (
                                <div>
                                    {topic?.content && (
                                        <div className="bg-[#151515] rounded-xl p-6 border border-gray-800 shadow-sm mb-8">
                                            <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                                                {topic.content.split('\n').map((line, i) => {
                                                    if (line.trim().startsWith('###')) return <h4 key={i} className="text-lg font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">{line.replace(/###/g, '').trim()}</h4>;
                                                    if (line.trim().startsWith('**')) return <strong key={i} className="block text-white mt-4 mb-2">{line.replace(/\*\*/g, '')}</strong>;
                                                    if (line.trim().length === 0) return <br key={i} />;
                                                    return <p key={i} className="mb-2 leading-relaxed opacity-90">{line.replace(/\*\*/g, '')}</p>;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold text-gray-200 mb-6 flex items-center">
                                        <ExternalLink className="w-5 h-5 mr-3 text-blue-500" />
                                        Recommended Resources
                                    </h3>
                                    <div className="space-y-4">
                                        {topic?.resources?.map((resource, i) => (
                                            <div key={i} className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${resource.completed ? 'bg-green-900/10 border-green-500/30' : 'bg-[#151515] border-gray-800 hover:border-gray-600'}`}>
                                                <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${['youtube', 'video'].includes(resource.type) ? 'bg-red-500/10 text-red-500' : resource.type === 'audio' ? 'bg-pink-500/10 text-pink-500' : resource.type === 'link' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {['youtube', 'video'].includes(resource.type) ? <Video size={20} /> : resource.type === 'audio' ? <Headphones size={20} /> : resource.type === 'link' ? <Link size={20} /> : <FileText size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-200 text-lg truncate pr-2">{resource.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="capitalize px-2 py-0.5 rounded bg-gray-800">{resource.type === 'article' ? 'Document' : resource.type}</span>
                                                        <span>•</span>
                                                        <span>{resource.duration || 'View Resource'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <button onClick={() => handlePreview(resource)} className="flex items-center gap-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors">
                                                            <Eye size={14} className="text-blue-400" /> Preview
                                                        </button>
                                                        <a href={resource.url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors">
                                                            <Download size={14} className="text-green-400" /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                                <button onClick={() => toggleResource(resource.id || resource._id, resource.completed)} className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${resource.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-600 text-transparent hover:border-green-500'}`} title="Mark as Done">
                                                    <CheckCircle size={16} fill={resource.completed ? 'currentColor' : 'none'} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!topic?.resources || topic.resources.length === 0) && (
                                            <div className="text-gray-500 text-center py-4 italic">No resources for this topic.</div>
                                        )}
                                    </div>
                                    <AnalyticsSection />
                                </div>
                            )}

                            {/* Quiz Section */}
                            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 p-8 rounded-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">Topic Mastery Quiz</h3>
                                    <p className="text-gray-400 mb-6 max-w-lg">
                                        {isAiPath
                                            ? 'Complete all steps above to unlock the quiz. Pass with 70% or higher to complete this topic.'
                                            : 'Complete all resources above to unlock the quiz. Pass with 70% or higher to complete this topic.'
                                        }
                                    </p>
                                    <button
                                        onClick={startQuizFlow}
                                        disabled={!canTakeQuiz}
                                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canTakeQuiz
                                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 cursor-pointer'
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                        }`}
                                    >
                                        <Brain size={20} />
                                        {topic?.status === 'completed' ? 'Retake Quiz' : 'Take Topic Quiz'}
                                    </button>
                                </div>
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#151515] sticky bottom-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                    <a
                        href={`https://google.com/search?q=${topic?.title} ${topic?.description} tutorial`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all group border border-gray-700 hover:border-gray-600"
                    >
                        Search More on Google <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition" />
                    </a>
                </div>
            </div>

            {/* ── PREVIEW MODAL ──────────────────────────────────────────────────── */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-gray-700 shadow-2xl relative">
                        <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
                            <h3 className="text-white font-bold truncate flex items-center gap-2">
                                <span className="text-blue-400 uppercase text-xs border border-blue-400/30 px-2 py-0.5 rounded">{previewFile.type}</span>
                                {previewFile.name}
                            </h3>
                            <button onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-full transition">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-4">
                            {['video', 'youtube'].includes(previewFile.type) ? (
                                <video controls className="max-w-full max-h-full rounded-lg shadow-lg" src={previewFile.url}>Your browser does not support the video tag.</video>
                            ) : previewFile.type === 'audio' ? (
                                <div className="p-12 bg-gray-800 rounded-xl flex flex-col items-center gap-4">
                                    <Headphones size={48} className="text-pink-500" />
                                    <audio controls className="w-96" src={previewFile.url}>Your browser does not support the audio tag.</audio>
                                </div>
                            ) : previewFile.url?.endsWith('.pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-full bg-white" title="PDF Preview" />
                            ) : previewFile.url?.includes('localhost') || previewFile.url?.includes('127.0.0.1') ? (
                                <div className="text-center space-y-4">
                                    <FileText size={48} className="text-gray-600 mx-auto" />
                                    <div className="text-yellow-500 font-bold text-xl">Preview Unavailable Locally</div>
                                    <p className="text-gray-400 max-w-md mx-auto">Microsoft/Google Viewers cannot preview files hosted on localhost. Please download to view.</p>
                                </div>
                            ) : (
                                <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} className="w-full h-full absolute inset-0 bg-white" title="Doc Preview" />
                            )}
                            <a href={previewFile.url} download className="mt-6 absolute bottom-8 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-bold transition-colors shadow-lg backdrop-blur-sm">
                                <Download className="w-5 h-5" /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── QUIZ MODAL ────────────────────────────────────────────────────── */}
            {quizOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Brain className="text-purple-500" />
                                    Topic Quiz: {topic?.title}
                                </h2>
                                {quizStep === 'quiz' && (
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
                                        Question {currentQuestionIndex + 1} / {quizData.length} • {bloomLevel}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setQuizOpen(false)} className="text-gray-500 hover:text-white transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {quizStep === 'setup' && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-white mb-2">Ready to test your knowledge?</h3>
                                        <p className="text-gray-400">Select a difficulty level to generate your quiz.</p>
                                    </div>
                                    {quizError && (
                                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start gap-2">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                            <span>{quizError}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {BLOOMS_LEVELS.map((level) => (
                                            <button key={level.id} onClick={() => setBloomLevel(level.id)} className={`p-4 rounded-xl border text-left transition-all ${bloomLevel === level.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                                                <div className="font-bold mb-1">{level.label}</div>
                                                <div className="text-xs opacity-70">{level.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={generateQuiz} className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 mt-4">
                                        Start Quiz <ArrowRight size={20} />
                                    </button>
                                </div>
                            )}

                            {(quizStep === 'loading' || quizStep === 'submitting') && (
                                <div className="flex flex-col items-center justify-center py-12 text-center h-64">
                                    <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-white">{quizStep === 'loading' ? 'Generating Quiz...' : 'Saving your results...'}</h3>
                                    {quizStep === 'loading' && <p className="text-gray-400 mt-2">AI is crafting questions at the <span className="text-purple-400 capitalize">{bloomLevel}</span> level.</p>}
                                </div>
                            )}

                            {quizStep === 'quiz' && quizData && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-medium text-white leading-relaxed p-4 bg-gray-800 rounded-xl border border-gray-700">
                                        {quizData[currentQuestionIndex].question}
                                    </h3>
                                    <div className="space-y-3">
                                        {quizData[currentQuestionIndex].options.map((option, idx) => {
                                            const isSelected = selectedAnswer === option;
                                            const isCorrect = option.trim().toLowerCase() === quizData[currentQuestionIndex].correctAnswer?.trim().toLowerCase();
                                            let style = 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-gray-300';
                                            if (showExplanation) {
                                                if (isCorrect) style = 'bg-green-500/20 border-green-500 text-green-200';
                                                else if (isSelected && !isCorrect) style = 'bg-red-500/20 border-red-500 text-red-200';
                                                else style = 'bg-gray-800 border-gray-700 opacity-50';
                                            } else if (isSelected) { style = 'bg-blue-600 border-blue-500 text-white'; }
                                            return (
                                                <button key={idx} onClick={() => handleAnswerSelect(option)} disabled={showExplanation} className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${style}`}>
                                                    <span className="font-medium text-lg">{option}</span>
                                                    {showExplanation && isCorrect && <CheckCircle size={20} className="text-green-500" />}
                                                    {showExplanation && isSelected && !isCorrect && <XCircle size={20} className="text-red-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizData[currentQuestionIndex].hint && (
                                        <div className="mt-4">
                                            <button onClick={() => setShowHint(!showHint)} className="text-sm text-yellow-400 hover:text-yellow-300 underline font-medium flex items-center gap-1">
                                                <Brain size={14} /> {showHint ? 'Hide Hint' : 'Show Hint'}
                                            </button>
                                            {showHint && <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm animate-fade-in"><strong>Hint:</strong> {quizData[currentQuestionIndex].hint}</div>}
                                        </div>
                                    )}
                                    {showExplanation && (() => {
                                        const isCorrect = selectedAnswer?.trim().toLowerCase() === quizData[currentQuestionIndex].correctAnswer?.trim().toLowerCase();
                                        return (
                                            <div className={`mt-4 border p-4 rounded-xl flex gap-3 animate-fade-in ${isCorrect ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                                                <AlertCircle className={`${isCorrect ? 'text-green-400' : 'text-red-400'} shrink-0 mt-0.5`} size={20} />
                                                <div>
                                                    <h4 className={`font-bold mb-1 ${isCorrect ? 'text-green-100' : 'text-red-100'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</h4>
                                                    {!isCorrect && <p className="text-sm font-bold text-green-400 mb-1">Correct Answer: {quizData[currentQuestionIndex].correctAnswer}</p>}
                                                    <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-200' : 'text-red-200'}`}>{quizData[currentQuestionIndex].explanation}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {quizStep === 'result' && quizResult && (
                                <div className="text-center py-8 space-y-6">
                                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full shadow-xl mb-2 ${quizResult.passed ? 'bg-green-500/20 shadow-green-900/20' : 'bg-red-500/20 shadow-red-900/20'}`}>
                                        {quizResult.passed ? <CheckCircle size={48} className="text-green-500" /> : <XCircle size={48} className="text-red-500" />}
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2">{quizResult.passed ? 'Topic Completed! 🎉' : 'Keep Practicing'}</h3>
                                        <p className="text-gray-400 text-lg">
                                            You scored <span className={`font-bold ${quizResult.passed ? 'text-green-400' : 'text-red-400'}`}>{quizResult.score}%</span>{' '}
                                            ({scoreRef.current}/{quizData?.length} correct)
                                        </p>
                                        {!quizResult.passed && <p className="text-sm text-gray-500 mt-2">You need 70% to complete this topic.</p>}
                                    </div>
                                    <div className="flex gap-3 justify-center mt-8">
                                        <button onClick={() => { setQuizStep('setup'); scoreRef.current = 0; setScoreDisplay(0); setQuizError(null); }} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-white transition flex items-center gap-2 border border-gray-700">
                                            <RefreshCw size={18} /> Retry
                                        </button>
                                        <button onClick={() => setQuizOpen(false)} className="px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition flex items-center gap-2">Close</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {quizStep === 'quiz' && (
                            <div className="p-4 border-t border-gray-800 bg-gray-800/50 flex justify-end">
                                {!showExplanation ? (
                                    <button onClick={checkAnswer} disabled={!selectedAnswer} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition">Check Answer</button>
                                ) : (
                                    <button onClick={nextQuestion} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition flex items-center gap-2">
                                        {currentQuestionIndex < quizData.length - 1 ? 'Next Question' : 'See Results'} <ChevronRight size={18} />
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
