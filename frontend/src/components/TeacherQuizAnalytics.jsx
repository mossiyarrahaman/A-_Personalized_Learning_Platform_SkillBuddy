import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { Brain, AlertTriangle, TrendingUp, Users, Trophy, Target, ChevronDown, ChevronUp, Search } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

// ─── TeacherQuizAnalytics ─────────────────────────────────────────────────────
// Drop inside TeacherDashboard as the 'analytics' case in renderContent()
// Usage: <TeacherQuizAnalytics courses={courses} />

const TeacherQuizAnalytics = ({ courses = [] }) => {
    const { theme, accent } = useAppTheme();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [selected, setSelected] = useState(null); // selected student id
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('class'); // class | student

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/courses/teacher-quiz-analytics');
            setStudents(res.data.students || []);
        } catch {
            // Fallback: fetch student list and their basic progress
            try {
                const [studRes, coursesRes] = await Promise.all([
                    api.get('/auth/students'),
                    api.get('/courses/teacher-courses'),
                ]);
                const allStudents = studRes.data.students || [];
                const allCourses = coursesRes.data.courses || [];

                // Build per-student analytics from enrolled classes
                const enriched = await Promise.all(allStudents.slice(0, 20).map(async (student) => {
                    try {
                        const qRes = await api.get(`/courses/student-quiz-results/${student._id}`).catch(() => ({ data: { results: [] } }));
                        const results = qRes.data.results || [];
                        const avgScore = results.length > 0 ? Math.round(results.reduce((a, r) => a + (r.pct || 0), 0) / results.length) : null;
                        const mistakes = results.reduce((a, r) => a + (r.mistakes?.length || 0), 0);
                        const mistakeTopics = {};
                        results.forEach(r => (r.mistakes || []).forEach(m => { const k = m.topic || r.topicTitle || 'General'; mistakeTopics[k] = (mistakeTopics[k] || 0) + 1; }));
                        return { ...student, quizResults: results, avgScore, totalQuizzes: results.length, totalMistakes: mistakes, mistakeTopics: Object.entries(mistakeTopics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([topic, count]) => ({ topic, count })) };
                    } catch { return { ...student, quizResults: [], avgScore: null, totalQuizzes: 0, totalMistakes: 0, mistakeTopics: [] }; }
                }));
                setStudents(enriched);
            } catch (err) { console.error('Teacher analytics error', err); }
        } finally { setLoading(false); }
    };

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;
    const card = { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px' };

    const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));
    const selectedStudent = students.find(s => s._id === selected);

    // Class-level aggregates
    const studentsWithQuizzes = students.filter(s => s.totalQuizzes > 0);
    const classAvg = studentsWithQuizzes.length > 0 ? Math.round(studentsWithQuizzes.reduce((a, s) => a + (s.avgScore || 0), 0) / studentsWithQuizzes.length) : 0;
    const topPerformers = [...students].filter(s => s.avgScore !== null).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)).slice(0, 5);
    const needsHelp = [...students].filter(s => s.avgScore !== null && s.avgScore < 60).sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0)).slice(0, 5);

    // Aggregate mistake topics across all students
    const globalMistakes = {};
    students.forEach(s => (s.mistakeTopics || []).forEach(({ topic, count }) => { globalMistakes[topic] = (globalMistakes[topic] || 0) + count; }));
    const globalMistakeList = Object.entries(globalMistakes).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, count]) => ({ topic, count }));

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
            <div style={{ width: '36px', height: '36px', border: `3px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: theme.textPrimary }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.2rem', fontWeight: 700, color: theme.textPrimary }}>Quiz Analytics</h2>
                    <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>{students.length} students · {studentsWithQuizzes.length} have taken quizzes</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: theme.surface, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                    {[['class', '📊 Class View'], ['student', '👤 Per Student']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: activeTab === key ? aGrad : 'none', color: activeTab === key ? '#fff' : theme.textSecondary, fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>{label}</button>
                    ))}
                </div>
            </div>

            {/* ── CLASS VIEW ── */}
            {activeTab === 'class' && (
                <>
                    {/* KPI row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.25rem' }}>
                        {[
                            { label: 'Students', value: students.length, color: '#60a5fa', icon: Users },
                            { label: 'Class Avg Score', value: classAvg ? `${classAvg}%` : 'N/A', color: classAvg >= 70 ? '#34d399' : '#f87171', icon: Target },
                            { label: 'Quizzes Taken', value: students.reduce((a, s) => a + s.totalQuizzes, 0), color: accent.from, icon: Brain },
                            { label: 'Need Help (<60%)', value: needsHelp.length, color: '#f87171', icon: AlertTriangle },
                        ].map(({ label, value, color, icon: Icon }) => (
                            <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>{label}</div>
                                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                </div>
                                <Icon size={20} style={{ color, opacity: 0.6 }} />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        {/* Score distribution chart */}
                        <div style={card}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: theme.textPrimary, marginBottom: '4px' }}>Student Score Distribution</div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '14px' }}>Average quiz score per student</div>
                            {topPerformers.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={[...students].filter(s => s.avgScore !== null).slice(0, 12).map(s => ({ name: s.name?.split(' ')[0] || 'Student', score: s.avgScore || 0 }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                                        <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textSecondary }} />
                                        <YAxis domain={[0, 100]} stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}%`} />
                                        <Tooltip contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textPrimary }} />
                                        <Bar dataKey="score" name="Avg Score" radius={[4, 4, 0, 0]} barSize={20}>
                                            {students.filter(s => s.avgScore !== null).slice(0, 12).map((s, i) => (
                                                <Cell key={i} fill={(s.avgScore || 0) >= 80 ? '#34d399' : (s.avgScore || 0) >= 60 ? accent.from : '#f87171'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyState theme={theme} msg="No quiz data yet" />}
                        </div>

                        {/* Global mistake topics */}
                        <div style={card}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: theme.textPrimary, marginBottom: '4px' }}>Class-Wide Weak Topics</div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '14px' }}>Most common mistakes across all students</div>
                            {globalMistakeList.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {globalMistakeList.slice(0, 6).map((m, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12.5px', fontWeight: 500, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{m.topic}</div>
                                                <div style={{ height: '3px', background: theme.border, borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${Math.min((m.count / (globalMistakeList[0]?.count || 1)) * 100, 100)}%`, background: '#f87171', borderRadius: '2px' }} />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{m.count}x</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState theme={theme} msg="No mistake data yet" />}
                        </div>
                    </div>

                    {/* Top performers & needs help */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <div style={card}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: '#34d399', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Trophy size={15} /> Top Performers
                            </div>
                            {topPerformers.length > 0 ? topPerformers.map((s, i) => (
                                <StudentRow key={i} student={s} rank={i + 1} theme={theme} accent={accent} onSelect={() => { setSelected(s._id); setActiveTab('student'); }} />
                            )) : <EmptyState theme={theme} msg="No quiz data yet" />}
                        </div>
                        <div style={card}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: '#f87171', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={15} /> Needs Attention
                            </div>
                            {needsHelp.length > 0 ? needsHelp.map((s, i) => (
                                <StudentRow key={i} student={s} theme={theme} accent={accent} danger onSelect={() => { setSelected(s._id); setActiveTab('student'); }} />
                            )) : <div style={{ fontSize: '13px', color: theme.textMuted, padding: '1rem', textAlign: 'center' }}>🎉 All students scoring 60%+</div>}
                        </div>
                    </div>
                </>
            )}

            {/* ── STUDENT VIEW ── */}
            {activeTab === 'student' && (
                <>
                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." style={{ width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '9px 12px 9px 34px', color: theme.textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: '1.25rem' }}>
                        {/* Student list */}
                        <div style={{ ...card, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '600px', overflowY: 'auto' }}>
                            {filtered.map(s => (
                                <button key={s._id} onClick={() => setSelected(selected === s._id ? null : s._id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${selected === s._id ? accent.from : 'transparent'}`, background: selected === s._id ? `${accent.from}12` : 'none', cursor: 'pointer', textAlign: 'left', transition: 'all .15s', width: '100%' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: s.avgScore === null ? theme.border : (s.avgScore >= 70 ? 'rgba(52,211,153,0.2)' : s.avgScore >= 50 ? `${accent.from}25` : 'rgba(248,113,113,0.2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: s.avgScore === null ? theme.textMuted : (s.avgScore >= 70 ? '#34d399' : s.avgScore >= 50 ? accent.from : '#f87171'), flexShrink: 0 }}>
                                        {s.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                        <div style={{ fontSize: '11px', color: theme.textMuted }}>{s.totalQuizzes} quiz{s.totalQuizzes !== 1 ? 'zes' : ''} · {s.avgScore !== null ? `${s.avgScore}% avg` : 'no data'}</div>
                                    </div>
                                    {s.avgScore !== null && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.avgScore >= 70 ? '#34d399' : s.avgScore >= 50 ? '#fbbf24' : '#f87171', flexShrink: 0 }} />}
                                </button>
                            ))}
                        </div>

                        {/* Student detail */}
                        {selectedStudent && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Student header */}
                                <div style={{ ...card, background: `linear-gradient(135deg,${accent.from}18,${theme.surface})`, border: `1px solid ${accent.from}35` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: aGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                                            {selectedStudent.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '16px', color: theme.textPrimary }}>{selectedStudent.name}</div>
                                            <div style={{ fontSize: '12px', color: theme.textMuted }}>{selectedStudent.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                                        {[
                                            { l: 'Quizzes', v: selectedStudent.totalQuizzes, c: accent.from },
                                            { l: 'Avg Score', v: selectedStudent.avgScore !== null ? `${selectedStudent.avgScore}%` : 'N/A', c: (selectedStudent.avgScore || 0) >= 70 ? '#34d399' : '#f87171' },
                                            { l: 'Mistakes', v: selectedStudent.totalMistakes, c: '#f87171' },
                                            { l: 'Best Score', v: selectedStudent.quizResults?.length > 0 ? `${Math.max(...selectedStudent.quizResults.map(r => r.pct || 0))}%` : 'N/A', c: '#34d399' },
                                        ].map(({ l, v, c }) => (
                                            <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}25`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                                                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.2rem', fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                                                <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Score trend */}
                                {selectedStudent.quizResults?.length > 1 && (
                                    <div style={card}>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: theme.textPrimary, marginBottom: '14px' }}>Score Trend</div>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <LineChart data={selectedStudent.quizResults.slice(-10).map((r, i) => ({ n: `#${i + 1}`, score: Math.round(r.pct || 0), topic: r.topicTitle }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                                                <XAxis dataKey="n" stroke={theme.textMuted} tick={{ fontSize: 11, fill: theme.textSecondary }} />
                                                <YAxis domain={[0, 100]} stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={v => `${v}%`} />
                                                <Tooltip contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textPrimary }} />
                                                <Line type="monotone" dataKey="score" stroke={accent.from} strokeWidth={2} dot={{ fill: accent.from, r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Mistake topics */}
                                {selectedStudent.mistakeTopics?.length > 0 && (
                                    <div style={card}>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: '#f87171', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={14} /> Topics Where {selectedStudent.name?.split(' ')[0]} Struggles
                                        </div>
                                        {selectedStudent.mistakeTopics.map((m, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < selectedStudent.mistakeTopics.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: theme.textPrimary, marginBottom: '4px' }}>{m.topic}</div>
                                                    <div style={{ height: '4px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min((m.count / (selectedStudent.mistakeTopics[0]?.count || 1)) * 100, 100)}%`, background: '#f87171', borderRadius: '3px' }} />
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{m.count} mistakes</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Quiz history table */}
                                {selectedStudent.quizResults?.length > 0 && (
                                    <div style={card}>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: theme.textPrimary, marginBottom: '14px' }}>Quiz History</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                                    {['Topic', 'Difficulty', 'Score', 'Mistakes', 'Date'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedStudent.quizResults.slice().reverse().slice(0, 15).map((r, i) => (
                                                    <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                                        <td style={{ padding: '9px 10px', color: theme.textPrimary, fontWeight: 500 }}>{r.topicTitle || '—'}</td>
                                                        <td style={{ padding: '9px 10px' }}><span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', background: r.difficulty === 'Easy' ? 'rgba(52,211,153,.12)' : r.difficulty === 'Hard' ? 'rgba(248,113,113,.12)' : 'rgba(251,191,36,.12)', color: r.difficulty === 'Easy' ? '#34d399' : r.difficulty === 'Hard' ? '#f87171' : '#fbbf24' }}>{r.difficulty || 'Med'}</span></td>
                                                        <td style={{ padding: '9px 10px' }}><span style={{ fontWeight: 700, color: (r.pct || 0) >= 80 ? '#34d399' : (r.pct || 0) >= 60 ? '#fbbf24' : '#f87171' }}>{Math.round(r.pct || 0)}%</span></td>
                                                        <td style={{ padding: '9px 10px', color: (r.mistakes?.length || 0) > 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{r.mistakes?.length || 0}</td>
                                                        <td style={{ padding: '9px 10px', color: theme.textMuted, fontSize: '12px' }}>{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const StudentRow = ({ student, rank, theme, accent, danger, onSelect }) => {
    const color = danger ? '#f87171' : '#34d399';
    return (
        <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', transition: 'background .15s', marginBottom: '4px' }}
            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}10`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {rank && <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '18px' }}>#{rank}</span>}
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>
                {student.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                <div style={{ fontSize: '11px', color: theme.textMuted }}>{student.totalQuizzes} quizzes</div>
            </div>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 800, color }}>{student.avgScore}%</span>
        </div>
    );
};

const EmptyState = ({ theme, msg }) => (
    <div style={{ textAlign: 'center', padding: '2rem', color: theme.textMuted, fontSize: '13px' }}>{msg}</div>
);

export default TeacherQuizAnalytics;