import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Brain, CheckCircle, XCircle, ChevronRight,
    RotateCcw, Clock, Target, Loader, BookOpen, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';
import { saveQuizResult } from '../utils/quizStorage';

const DIFFICULTIES = ['Easy', 'Intermediate', 'Hard'];

const QuizModal = ({
    isOpen, onClose,
    topicTitle = '', topicId, moduleId, courseId,
    difficulty: initDiff = 'Intermediate',
    onComplete
}) => {
    const { theme, accent } = useAppTheme();

    const [stage, setStage] = useState('config');
    const [difficulty, setDifficulty] = useState(initDiff);
    const [numQuestions, setNumQs] = useState(5);
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [revealed, setRevealed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const panelBg = theme.bg === '#f5f4ff' ? '#ffffff' : '#13102a';

    // Timer
    useEffect(() => {
        if (stage !== 'active') return;
        const total = numQuestions * 30;
        setTimeLeft(total);
        const id = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(id); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [stage]);

    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const startQuiz = async () => {
        setStage('loading');
        setAnswers({});
        setCurrent(0);
        setRevealed(false);
        setStartTime(Date.now());
        try {
            const res = await api.post('/ai-assistant/generate-topic-quiz', {
                topicTitle, difficulty, numQuestions, includeExplanations: true,
            });
            const qs = res.data.questions || [];
            if (qs.length === 0) throw new Error('No questions returned');
            setQuestions(qs);
            setStage('active');
        } catch (err) {
            console.error('Quiz gen failed', err);
            setStage('config');
            alert('Failed to generate quiz. Please try again.');
        }
    };

    const selectAnswer = (option) => {
        if (answers[current] !== undefined) return;
        setAnswers(prev => ({ ...prev, [current]: option }));
        setRevealed(true);
    };

    const nextQuestion = () => {
        setRevealed(false);
        if (current + 1 < questions.length) {
            setCurrent(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = useCallback(async () => {
        const taken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        const finalAnswers = { ...answers };
        questions.forEach((_, i) => { if (finalAnswers[i] === undefined) finalAnswers[i] = null; });

        let correct = 0;
        const mistakes = [];
        questions.forEach((q, i) => {
            const userAns = finalAnswers[i];
            if (userAns === q.correctAnswer) {
                correct++;
            } else {
                mistakes.push({
                    question: q.question,
                    userAnswer: userAns || 'Not answered',
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    topic: topicTitle,
                });
            }
        });

        const pct = Math.round((correct / questions.length) * 100);
        const resultData = {
            topicTitle,
            topicId,
            moduleId,
            courseId,
            score: correct,
            total: questions.length,
            pct,
            difficulty,
            timeTaken: taken,
            mistakes,
            completedAt: new Date().toISOString(),
        };

        setResult(resultData);
        setStage('results');

        // Save — localStorage first (always works), then API
        setSaving(true);
        try {
            await saveQuizResult(resultData);
        } catch (e) {
            console.warn('Save failed', e);
        } finally {
            setSaving(false);
        }

        onComplete?.(resultData);
        // Fire storage event so analytics page re-reads immediately
        window.dispatchEvent(new StorageEvent('storage', { key: 'sb_quiz_results' }));
    }, [answers, questions, startTime, topicTitle, topicId, moduleId, courseId, difficulty]);

    const reset = () => {
        setStage('config'); setQuestions([]); setAnswers({});
        setCurrent(0); setRevealed(false); setResult(null);
    };

    if (!isOpen) return null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: panelBg, border: `1px solid ${theme.border}`, borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: `0 0 60px ${accent.glow}` }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ── CONFIG ── */}
                {stage === 'config' && (
                    <>
                        <div style={{ padding: '22px 22px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${accent.from}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={18} style={{ color: accent.from }} />
                                </div>
                                <div>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: theme.textPrimary }}>Quick Quiz</div>
                                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '1px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topicTitle || 'General Knowledge'}</div>
                                </div>
                            </div>
                            <button onClick={onClose} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '6px', cursor: 'pointer', color: theme.textSecondary, display: 'flex' }}><X size={15} /></button>
                        </div>
                        <div style={{ padding: '22px', overflowY: 'auto' }}>
                            {/* Difficulty */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Difficulty</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {DIFFICULTIES.map(d => (
                                        <button key={d} onClick={() => setDifficulty(d)} style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: `2px solid ${difficulty === d ? accent.from : theme.border}`, background: difficulty === d ? `${accent.from}15` : 'none', color: difficulty === d ? accent.from : theme.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif" }}>{d}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Questions slider */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                                    Questions: <span style={{ color: accent.from }}>{numQuestions}</span>
                                </div>
                                <input type="range" min={3} max={15} step={1} value={numQuestions} onChange={e => setNumQs(Number(e.target.value))} style={{ width: '100%', accentColor: accent.from }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}><span>3 — Quick</span><span>15 — Full</span></div>
                            </div>
                            {/* Info banner */}
                            <div style={{ background: `${accent.from}10`, border: `1px solid ${accent.from}25`, borderRadius: '12px', padding: '12px 14px', marginBottom: '22px', display: 'flex', gap: '10px' }}>
                                <AlertCircle size={15} style={{ color: accent.from, flexShrink: 0, marginTop: '1px' }} />
                                <div style={{ fontSize: '12.5px', color: theme.textSecondary, lineHeight: 1.6 }}>
                                    <strong style={{ color: theme.textPrimary }}>{fmt(numQuestions * 30)}</strong> time limit · Results saved to your analytics automatically
                                </div>
                            </div>
                            <button onClick={startQuiz} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: aGrad, border: 'none', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: `0 4px 20px ${accent.glow}`, fontFamily: "'DM Sans',sans-serif" }}>
                                <Brain size={17} /> Start Quiz
                            </button>
                        </div>
                    </>
                )}

                {/* ── LOADING ── */}
                {stage === 'loading' && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: theme.textPrimary }}>
                        <div style={{ width: '48px', height: '48px', border: `3px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin .8s linear infinite' }} />
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Generating Quiz…</div>
                        <div style={{ fontSize: '13px', color: theme.textMuted }}>AI crafting {numQuestions} questions on <em>{topicTitle || 'this topic'}</em></div>
                    </div>
                )}

                {/* ── ACTIVE ── */}
                {stage === 'active' && questions[current] && (
                    <>
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
                            <div style={{ display: 'inline-block', background: `${accent.from}18`, border: `1px solid ${accent.from}35`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: accent.from, marginBottom: '14px' }}>
                                {difficulty} · {topicTitle || 'General'}
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
                                    {current + 1 === questions.length ? '🎯 Finish Quiz' : 'Next →'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── RESULTS ── */}
                {stage === 'results' && result && (
                    <>
                        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: theme.textPrimary }}>Quiz Complete</div>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}><X size={15} /></button>
                        </div>
                        <div style={{ overflowY: 'auto', padding: '22px' }}>
                            {/* Score circle */}
                            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                                <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: aGrad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: `0 0 32px ${accent.glow}` }}>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{result.pct}%</div>
                                </div>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '17px', fontWeight: 700, color: theme.textPrimary, marginBottom: '4px' }}>
                                    {result.pct >= 80 ? '🏆 Excellent!' : result.pct >= 60 ? '👍 Good Job!' : '📖 Keep Practicing!'}
                                </div>
                                <div style={{ fontSize: '13px', color: theme.textSecondary }}>{result.score}/{result.total} correct · {fmt(result.timeTaken)}</div>
                                {saving && <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Loader size={11} style={{ animation: 'spin .8s linear infinite' }} /> Saving…</div>}
                                {!saving && <div style={{ fontSize: '11px', color: '#34d399', marginTop: '6px' }}>✓ Saved to your analytics</div>}
                            </div>
                            {/* Stats row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '22px' }}>
                                {[['Correct', result.score, '#22c55e'], ['Wrong', result.total - result.score, '#ef4444'], ['Score', `${result.pct}%`, accent.from]].map(([l, v, c]) => (
                                    <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}25`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Mistakes */}
                            {result.mistakes.length > 0 && (
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '13px', fontWeight: 700, color: theme.textPrimary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <XCircle size={14} style={{ color: '#ef4444' }} /> Mistakes to Review ({result.mistakes.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {result.mistakes.map((m, i) => (
                                            <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '12px 14px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, marginBottom: '7px', lineHeight: 1.4 }}>{m.question}</div>
                                                <div style={{ fontSize: '12px', marginBottom: '3px' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>✗ </span><span style={{ color: theme.textSecondary }}>{m.userAnswer}</span></div>
                                                <div style={{ fontSize: '12px', marginBottom: m.explanation ? '7px' : 0 }}><span style={{ color: '#22c55e', fontWeight: 600 }}>✓ </span><span style={{ color: theme.textSecondary }}>{m.correctAnswer}</span></div>
                                                {m.explanation && <div style={{ fontSize: '12px', color: theme.textMuted, background: theme.surface, borderRadius: '7px', padding: '7px 10px', lineHeight: 1.6 }}>💡 {m.explanation}</div>}
                                            </div>
                                        ))}
                                    </div>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default QuizModal;