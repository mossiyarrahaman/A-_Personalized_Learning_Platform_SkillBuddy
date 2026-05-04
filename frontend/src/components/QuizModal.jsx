import React, { useState, useEffect, useRef } from 'react';
import {
    X, Brain, CheckCircle, XCircle, ChevronRight,
    RotateCcw, Clock, Loader, BookOpen, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';
import { saveQuizResult } from '../utils/quizStorage';

const BLOOM_LEVELS = [
    { key: 'remember',   label: 'Remember',   desc: 'Recall facts & definitions' },
    { key: 'understand', label: 'Understand',  desc: 'Explain in own words' },
    { key: 'apply',      label: 'Apply',       desc: 'Solve problems with code' },
    { key: 'analyze',    label: 'Analyze',     desc: 'Compare & break down' },
    { key: 'evaluate',   label: 'Evaluate',    desc: 'Judge & justify choices' },
    { key: 'create',     label: 'Create',      desc: 'Design & build solutions' },
];
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const QuizModal = ({
    isOpen, onClose,
    topicTitle = 'General Knowledge',
    topicId, moduleId, courseId,
    difficulty: initDiff = 'Intermediate',
    onComplete,
}) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    // Stage: config | loading | active | results
    const [stage, setStage] = useState('config');
    const [bloomLevel, setBloomLevel] = useState('understand');
    const [numQs, setNumQs] = useState(5);
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});   // { idx: selectedOption }
    const [revealed, setRevealed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [genError, setGenError] = useState(null);

    // Teacher quiz state
    const [teacherQuiz, setTeacherQuiz] = useState(null);       // { questions, bloomLevel, difficulty } or null
    const [checkingTeacher, setCheckingTeacher] = useState(false);
    const [isTeacherAssessment, setIsTeacherAssessment] = useState(false);

    // Use refs so timer callback always sees fresh values
    const answersRef = useRef({});
    const questionsRef = useRef([]);
    const startRef = useRef(null);
    const bloomRef = useRef(bloomLevel);
    bloomRef.current = bloomLevel;
    const submittingRef = useRef(false); // guard against double-submit

    // Check for teacher-generated quiz on open
    useEffect(() => {
        if (!isOpen || !topicId || !courseId) { setTeacherQuiz(null); return; }
        setCheckingTeacher(true);
        api.get(`/rag/topic-quiz/${courseId}/${topicId}`)
            .then(res => {
                if (res.data.exists && res.data.questions?.length) {
                    setTeacherQuiz({ questions: res.data.questions, bloomLevel: res.data.bloomLevel, difficulty: res.data.difficulty });
                } else {
                    setTeacherQuiz(null);
                }
            })
            .catch(() => setTeacherQuiz(null))
            .finally(() => setCheckingTeacher(false));
    }, [isOpen, topicId, courseId]);

    // Sync answers ref
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);

    // Timer
    useEffect(() => {
        if (stage !== 'active') return;
        const total = numQs * 30;
        setTimeLeft(total);
        const id = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(id);
                    // Use refs to avoid stale closure
                    submitQuiz(answersRef.current, questionsRef.current, startRef.current, bloomRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [stage]);

    const startTeacherAssessment = () => {
        if (!teacherQuiz) return;
        const qs = teacherQuiz.questions;
        setQuestions(qs);
        questionsRef.current = qs;
        setNumQs(qs.length);
        setBloomLevel(teacherQuiz.bloomLevel || 'understand');
        bloomRef.current = teacherQuiz.bloomLevel || 'understand';
        setAnswers({});
        answersRef.current = {};
        setCurrent(0);
        setRevealed(false);
        setIsTeacherAssessment(true);
        startRef.current = Date.now();
        setStage('active');
    };

    const startQuiz = async () => {
        setStage('loading');
        setGenError(null);
        setAnswers({});
        answersRef.current = {};
        setCurrent(0);
        setRevealed(false);
        startRef.current = Date.now();

        try {
            const res = await api.post('/ai-assistant/generate-topic-quiz', {
                topicTitle,
                bloomLevel,
                numQuestions: numQs,
                ...(courseId && { courseId }),
                ...(moduleId && { moduleId }),
                ...(topicId && { topicId }),
            });
            const qs = res.data.questions || [];
            if (!qs.length) throw new Error('No questions');
            setQuestions(qs);
            questionsRef.current = qs;
            setStage('active');
        } catch (err) {
            console.error('Quiz gen failed', err);
            setStage('config');
            setGenError('Failed to generate quiz. Check your connection and try again.');
        }
    };

    const selectAnswer = (opt) => {
        if (answers[current] !== undefined) return;
        const newAnswers = { ...answers, [current]: opt };
        setAnswers(newAnswers);
        answersRef.current = newAnswers;
        setRevealed(true);
    };

    const nextQuestion = () => {
        setRevealed(false);
        if (current + 1 < questions.length) {
            setCurrent(c => c + 1);
        } else {
            submitQuiz(answersRef.current, questionsRef.current, startRef.current, bloomRef.current);
        }
    };

    // Core submit — uses passed params (not state) to avoid stale closures
    const submitQuiz = (finalAnswers, qs, startTime, bloom) => {
        if (!qs || qs.length === 0) return;
        if (submittingRef.current) return;
        submittingRef.current = true;

        const taken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

        let correct = 0;
        const mistakes = [];

        qs.forEach((q, i) => {
            const userAns = finalAnswers[i] ?? null;
            if (userAns === q.correctAnswer) {
                correct++;
            } else {
                mistakes.push({
                    question: q.question,
                    userAnswer: userAns || 'Not answered',
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    topic: topicTitle,
                    bloomLevel: q.bloomLevel || bloom,
                    difficulty: q.difficulty || 'medium',
                });
            }
        });

        const pct = Math.round((correct / qs.length) * 100);
        const resultData = {
            topicTitle,
            topicId,
            moduleId,
            courseId,
            score: correct,
            total: qs.length,
            pct,
            bloomLevel: bloom,
            timeTaken: taken,
            mistakes,
            completedAt: new Date().toISOString(),
        };

        setResult(resultData);
        setStage('results');

        // Save to localStorage
        setSaving(true);
        try { saveQuizResult(resultData); } catch (e) { console.error('[QuizModal] LocalStorage save error:', e); } finally { setSaving(false); }

        // Save to backend (async — don't block UI)
        if (topicId && moduleId && courseId) {
            api.post(`/courses/${courseId}/module/${moduleId}/topic/${topicId}/quiz/submit`, {
                score: pct,
                totalQuestions: qs.length,
                correctAnswers: correct,
                bloomLevel: bloom,
                topicTitle,
                isTeacherAssessment,
                wrongQuestions: mistakes.map(m => ({
                    questionText: m.question,
                    studentAnswer: m.userAnswer,
                    correctAnswer: m.correctAnswer,
                    bloomLevel: m.bloomLevel || bloom,
                    difficulty: m.difficulty || 'medium',
                })),
            }).then(res => {
                if (res.data?.pointsAwarded > 0) {
                    window.dispatchEvent(new CustomEvent('points-updated', { detail: { points: res.data.pointsAwarded } }));
                }
            }).catch(err => console.warn('[QuizModal] Backend save failed:', err.message));
        }

        // Notify analytics page to reload
        window.dispatchEvent(new StorageEvent('storage', { key: 'sb_quiz_results' }));

        onComplete?.(resultData);
    };

    const reset = () => {
        submittingRef.current = false;
        setStage('config');
        setBloomLevel('understand');
        setQuestions([]);
        setAnswers({});
        answersRef.current = {};
        setCurrent(0);
        setRevealed(false);
        setResult(null);
        setIsTeacherAssessment(false);
    };

    if (!isOpen) return null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: `0 0 60px ${accent.glow}` }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                    @keyframes spin{to{transform:rotate(360deg)}}
                `}</style>

                {/* ── CONFIG ── */}
                {stage === 'config' && (<>
                    <div style={{ padding: '20px 22px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${accent.from}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Brain size={18} style={{ color: accent.from }} />
                            </div>
                            <div>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: theme.textPrimary }}>Quiz</div>
                                <div style={{ fontSize: '12px', color: theme.textMuted, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topicTitle}</div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '6px', cursor: 'pointer', color: theme.textSecondary, display: 'flex' }}><X size={15} /></button>
                    </div>

                    <div style={{ padding: '22px', overflowY: 'auto' }}>

                        {genError && (
                            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '13px', color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {genError}
                            </div>
                        )}

                        {/* Teacher Assessment — PRIMARY */}
                        {checkingTeacher && (
                            <div style={{ padding: '10px 14px', background: `${accent.from}08`, border: `1px solid ${accent.from}20`, borderRadius: '10px', fontSize: '12px', color: theme.textMuted, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '14px', height: '14px', border: `2px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0, animation: 'spin .8s linear infinite' }} />
                                Checking for teacher quiz…
                            </div>
                        )}

                        {!checkingTeacher && teacherQuiz && (
                            <div style={{ background: `linear-gradient(135deg,${accent.from}14,${accent.to}0a)`, border: `2px solid ${accent.from}40`, borderRadius: '14px', padding: '18px 18px 16px', marginBottom: '22px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: `radial-gradient(circle,${accent.from}15 0%,transparent 70%)`, pointerEvents: 'none' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: aGrad, padding: '3px 10px', borderRadius: '99px' }}>Assigned Quiz</span>
                                    <CheckCircle size={14} style={{ color: '#22c55e' }} />
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, marginBottom: '8px', fontFamily: "'Sora',sans-serif" }}>
                                    Teacher Quiz — {topicTitle}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                    {[
                                        { label: `${teacherQuiz.questions.length} Questions` },
                                        { label: `Bloom's: ${(teacherQuiz.bloomLevel || 'mixed').charAt(0).toUpperCase() + (teacherQuiz.bloomLevel || 'mixed').slice(1)}` },
                                        { label: `${(teacherQuiz.difficulty || 'Intermediate')}` },
                                        { label: `~${Math.ceil(teacherQuiz.questions.length * 0.5)} min` },
                                    ].map(chip => (
                                        <span key={chip.label} style={{ fontSize: '12px', fontWeight: 600, color: theme.textSecondary, background: theme.surface, border: `1px solid ${theme.border}`, padding: '3px 10px', borderRadius: '99px' }}>{chip.label}</span>
                                    ))}
                                </div>
                                <button onClick={startTeacherAssessment} style={{ width: '100%', padding: '13px', borderRadius: '10px', background: aGrad, border: 'none', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: `0 4px 18px ${accent.glow}`, fontFamily: "'DM Sans',sans-serif" }}>
                                    <Brain size={16} /> Start Teacher Quiz
                                </button>
                            </div>
                        )}

                        {/* Practice Mode — SECONDARY when teacher quiz exists */}
                        {!checkingTeacher && (
                            <>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                                    {teacherQuiz ? 'Or Practice with AI' : 'Choose Quiz Settings'}
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                                        Bloom's Level
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px' }}>
                                        {BLOOM_LEVELS.map(b => {
                                            const active = bloomLevel === b.key;
                                            return (
                                                <button key={b.key} onClick={() => setBloomLevel(b.key)} style={{ padding: '9px 6px', borderRadius: '10px', border: `2px solid ${active ? accent.from : theme.border}`, background: active ? `${accent.from}18` : 'none', color: active ? accent.from : theme.textSecondary, fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif", textAlign: 'center', lineHeight: 1.3 }}>
                                                    {b.label}
                                                    <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.75, marginTop: '2px', color: active ? accent.from : theme.textMuted }}>{b.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                                        Questions: <span style={{ color: accent.from }}>{numQs}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            onClick={() => setNumQs(n => Math.max(3, n - 1))}
                                            disabled={numQs <= 3}
                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: numQs <= 3 ? 'none' : `${accent.from}15`, color: numQs <= 3 ? theme.textMuted : accent.from, fontWeight: 700, fontSize: '16px', cursor: numQs <= 3 ? 'default' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                        >−</button>
                                        <input type="range" min={3} max={15} step={1} value={numQs} onChange={e => setNumQs(Number(e.target.value))} style={{ flex: 1, accentColor: accent.from }} />
                                        <button
                                            onClick={() => setNumQs(n => Math.min(15, n + 1))}
                                            disabled={numQs >= 15}
                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: numQs >= 15 ? 'none' : `${accent.from}15`, color: numQs >= 15 ? theme.textMuted : accent.from, fontWeight: 700, fontSize: '16px', cursor: numQs >= 15 ? 'default' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                        >+</button>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}><span>3 — Quick</span><span>15 — Full</span></div>
                                </div>

                                <div style={{ background: `${accent.from}10`, border: `1px solid ${accent.from}25`, borderRadius: '12px', padding: '12px 14px', marginBottom: '22px', display: 'flex', gap: '10px' }}>
                                    <AlertCircle size={15} style={{ color: accent.from, flexShrink: 0, marginTop: '1px' }} />
                                    <div style={{ fontSize: '12.5px', color: theme.textSecondary, lineHeight: 1.6 }}>
                                        Time limit: <strong style={{ color: theme.textPrimary }}>{fmt(numQs * 30)}</strong> · Results auto-saved to your analytics
                                    </div>
                                </div>

                                <button onClick={startQuiz} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: teacherQuiz ? 'none' : aGrad, border: teacherQuiz ? `1px solid ${theme.border}` : 'none', color: teacherQuiz ? theme.textSecondary : '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: teacherQuiz ? 'none' : `0 4px 20px ${accent.glow}`, fontFamily: "'DM Sans',sans-serif" }}>
                                    <Brain size={17} /> {teacherQuiz ? 'Start Practice Quiz' : 'Start Quiz'}
                                </button>
                            </>
                        )}
                    </div>
                </>)}

                {/* ── LOADING ── */}
                {stage === 'loading' && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: theme.textPrimary }}>
                        <div style={{ width: '48px', height: '48px', border: `3px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin .8s linear infinite' }} />
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Generating Quiz…</div>
                        <div style={{ fontSize: '13px', color: theme.textMuted }}>AI crafting {numQs} questions · {BLOOM_LEVELS.find(b => b.key === bloomLevel)?.label} level · <em>{topicTitle}</em></div>
                    </div>
                )}

                {/* ── ACTIVE ── */}
                {stage === 'active' && questions[current] && (<>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: accent.from }}>Q {current + 1} / {questions.length}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: timeLeft < 30 ? '#ef4444' : theme.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {fmt(timeLeft)}
                                </span>
                            </div>
                            <div style={{ height: '4px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${((current + 1) / questions.length) * 100}%`, background: aGrad, borderRadius: '3px', transition: 'width .3s' }} />
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px' }}><X size={15} /></button>
                    </div>

                    <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
                        {timeLeft > 0 && timeLeft <= 30 && (
                            <div style={{ marginBottom: '14px', padding: '9px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', fontSize: '12.5px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={14} style={{ flexShrink: 0 }} /> {timeLeft}s remaining — quiz will auto-submit!
                            </div>
                        )}
                        <div style={{ display: 'inline-block', background: isTeacherAssessment ? 'rgba(34,197,94,0.12)' : `${accent.from}18`, border: `1px solid ${isTeacherAssessment ? 'rgba(34,197,94,0.3)' : `${accent.from}35`}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: isTeacherAssessment ? '#22c55e' : accent.from, marginBottom: '14px' }}>
                            {isTeacherAssessment ? '✓ Teacher Assessment · ' : ''}{BLOOM_LEVELS.find(b => b.key === bloomLevel)?.label} · {topicTitle}
                        </div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '16px', fontWeight: 700, color: theme.textPrimary, lineHeight: 1.55, marginBottom: '18px' }}>
                            {questions[current].question}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            {questions[current].options.map((opt, i) => {
                                const sel = answers[current] === opt;
                                const correct = revealed && opt === questions[current].correctAnswer;
                                const wrong = revealed && sel && !correct;
                                let bg = theme.surface, brd = theme.border, col = theme.textPrimary;
                                if (correct) { bg = 'rgba(34,197,94,0.12)'; brd = '#22c55e55'; col = '#22c55e'; }
                                if (wrong) { bg = 'rgba(239,68,68,0.12)'; brd = '#ef444455'; col = '#ef4444'; }
                                if (sel && !revealed) { bg = `${accent.from}15`; brd = accent.from; }
                                return (
                                    <button key={i} onClick={() => selectAnswer(opt)} disabled={answers[current] !== undefined} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${brd}`, background: bg, color: col, cursor: answers[current] !== undefined ? 'default' : 'pointer', textAlign: 'left', transition: 'all .18s', fontFamily: "'DM Sans',sans-serif" }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${brd}`, background: correct ? '#22c55e' : wrong ? '#ef4444' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: (correct || wrong) ? '#fff' : col }}>
                                            {correct ? '✓' : wrong ? '✗' : String.fromCharCode(65 + i)}
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{opt}</span>
                                        {correct && <CheckCircle size={15} style={{ marginLeft: 'auto', color: '#22c55e', flexShrink: 0 }} />}
                                        {wrong && <XCircle size={15} style={{ marginLeft: 'auto', color: '#ef4444', flexShrink: 0 }} />}
                                    </button>
                                );
                            })}
                        </div>

                        {revealed && questions[current].explanation && (
                            <div style={{ marginTop: '14px', padding: '12px 14px', background: `${accent.from}10`, border: `1px solid ${accent.from}25`, borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: accent.from, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Explanation</div>
                                <div style={{ fontSize: '13px', color: theme.textSecondary, lineHeight: 1.6 }}>{questions[current].explanation}</div>
                            </div>
                        )}
                    </div>

                    {revealed && (
                        <div style={{ padding: '14px 18px', borderTop: `1px solid ${theme.border}` }}>
                            <button onClick={nextQuestion} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: aGrad, border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'DM Sans',sans-serif" }}>
                                {current + 1 === questions.length ? '🎯 Finish & Save' : 'Next →'}
                            </button>
                        </div>
                    )}
                </>)}

                {/* ── RESULTS ── */}
                {stage === 'results' && result && (<>
                    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: theme.textPrimary }}>Quiz Complete</div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}><X size={15} /></button>
                    </div>

                    <div style={{ overflowY: 'auto', padding: '22px' }}>
                        {/* Score circle */}
                        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: aGrad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: `0 0 36px ${accent.glow}` }}>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{result.pct}%</div>
                            </div>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '17px', fontWeight: 700, color: theme.textPrimary, marginBottom: '4px' }}>
                                {result.pct >= 80 ? '🏆 Excellent!' : result.pct >= 60 ? '👍 Good Job!' : '📖 Keep Practicing!'}
                            </div>
                            <div style={{ fontSize: '13px', color: theme.textSecondary }}>{result.score}/{result.total} correct · {fmt(result.timeTaken)}</div>
                            {saving
                                ? <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Loader size={11} style={{ animation: 'spin .8s linear infinite' }} /> Saving…</div>
                                : <div style={{ fontSize: '11px', color: '#34d399', marginTop: '6px' }}>✓ Saved to analytics</div>
                            }
                        </div>

                        {/* Teacher quiz completion banner */}
                        {isTeacherAssessment && result.pct >= 80 && (
                            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</div>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>Topic Completed!</div>
                                <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px', lineHeight: 1.5 }}>
                                    You scored {result.pct}% on the teacher quiz — this topic is now marked complete.
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
                            {[['Correct', result.score, '#22c55e'], ['Wrong', result.total - result.score, '#ef4444'], ['Score', `${result.pct}%`, accent.from]].map(([l, v, c]) => (
                                <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}25`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                                </div>
                            ))}
                        </div>

                        {/* Mistakes */}
                        {result.mistakes.length > 0 && (
                            <div style={{ marginBottom: '18px' }}>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '13px', fontWeight: 700, color: theme.textPrimary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <XCircle size={14} style={{ color: '#ef4444' }} /> Mistakes ({result.mistakes.length})
                                </div>
                                {result.mistakes.map((m, i) => (
                                    <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, marginBottom: '7px', lineHeight: 1.4 }}>{m.question}</div>
                                        <div style={{ fontSize: '12px', marginBottom: '3px' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>✗ </span><span style={{ color: theme.textSecondary }}>{m.userAnswer}</span></div>
                                        <div style={{ fontSize: '12px', marginBottom: m.explanation ? '7px' : 0 }}><span style={{ color: '#22c55e', fontWeight: 600 }}>✓ </span><span style={{ color: theme.textSecondary }}>{m.correctAnswer}</span></div>
                                        {m.explanation && <div style={{ fontSize: '12px', color: theme.textMuted, background: theme.surface, borderRadius: '7px', padding: '7px 10px', lineHeight: 1.6 }}>💡 {m.explanation}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={reset} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'none', border: `1px solid ${theme.border}`, color: theme.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'DM Sans',sans-serif" }}>
                                <RotateCcw size={13} /> Retake
                            </button>
                            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: aGrad, border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'DM Sans',sans-serif" }}>
                                <BookOpen size={13} /> Continue Learning
                            </button>
                        </div>
                    </div>
                </>)}
            </div>
        </div>
    );
};

export default QuizModal;