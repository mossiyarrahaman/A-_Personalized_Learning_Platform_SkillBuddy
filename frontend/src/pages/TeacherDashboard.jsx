import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Users, BookOpen, BarChart, LogOut, Home, Plus, MessageCircle, MessagesSquare, X, ListChecks, User2, Trash2 } from 'lucide-react';
import api from '../api/axios';
import TeacherAnalytics from '../components/TeacherAnalytics';
import TeacherOverview from '../components/TeacherOverview';
import TeacherProfile from '../components/TeacherProfile';
import CurriculumBuilder from '../components/CurriculumBuilder';
import DoubtReplyModal from '../components/DoubtReplyModal';
import ManageStudentsModal from '../components/ManageStudentsModal';
import ClassChat from '../components/ClassChat';
import { useAppTheme } from '../hooks/useAppTheme';

const TeacherDashboard = ({ user, onLogout }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [activeSection, setActiveSection] = useState('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [stats, setStats] = useState({ students: 0, courses: 0, doubts: 0 });
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [replyingDoubt, setReplyingDoubt] = useState(null);
    const [managingStudentsCourse, setManagingStudentsCourse] = useState(null);
    const [removingStudent, setRemovingStudent] = useState(null); // {_id, name, enrolledCourseDetails}
    const [chatCourseId, setChatCourseId] = useState(null); // courseId of open chat panel

    useEffect(() => { fetchOverviewData(); }, []);
    useEffect(() => {
        if (activeSection === 'students') fetchStudents();
        if (activeSection === 'courses') fetchCourses();
        if (activeSection === 'doubts') fetchDoubts();
        if (activeSection === 'chat' && courses.length === 0) fetchCourses();
        if (activeSection !== 'chat') setChatCourseId(null);
    }, [activeSection]);

    const fetchOverviewData = async () => {
        try {
            const [studentsRes, coursesRes, doubtsRes] = await Promise.all([
                api.get('/auth/enrolled-students'),
                api.get('/courses/teacher-courses'),
                api.get('/doubts/all')
            ]);
            setStats({
                students: studentsRes.data.students.length,
                courses: coursesRes.data.courses.length,
                doubts: doubtsRes.data.doubts.filter(d => d.status !== 'answered').length
            });
            setCourses(coursesRes.data.courses);
        } catch (error) {
            console.error('Error fetching overview data:', error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try { const res = await api.get('/auth/enrolled-students'); setStudents(res.data.students); }
        catch (error) { console.error('Error fetching students:', error); }
        finally { setLoading(false); }
    };

    const confirmRemoveStudent = async () => {
        if (!removingStudent) return;
        try {
            const { _id, enrolledCourseDetails = [] } = removingStudent;
            await Promise.all(enrolledCourseDetails.map(c => api.delete(`/courses/${c.courseId}/enroll/${_id}`)));
            setStudents(prev => prev.filter(s => s._id !== _id));
            setStats(prev => ({ ...prev, students: prev.students - 1 }));
        } catch (err) {
            console.error('Remove student error:', err);
        } finally {
            setRemovingStudent(null);
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        try { const res = await api.get('/courses/teacher-courses'); setCourses(res.data.courses); }
        catch (error) { console.error('Error fetching courses:', error); }
        finally { setLoading(false); }
    };

    const fetchDoubts = async () => {
        setLoading(true);
        try { const res = await api.get('/doubts/all'); setDoubts(res.data.doubts); }
        catch (error) { console.error('Error fetching doubts:', error); }
        finally { setLoading(false); }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            field: formData.get('field'),
            level: formData.get('level')
        };
        try {
            await api.post('/courses/create', data);
            setShowCreateModal(false);
            fetchCourses();
            fetchOverviewData();
            alert('Class created successfully!');
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to create course. Please try again.';
            alert(errorMsg);
        }
    };

    const inputStyle = {
        width: '100%', background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '10px', padding: '11px 14px', color: theme.textPrimary,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    };

    const sectionLabel = {
        fontSize: '11px', fontWeight: 700, color: theme.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '20px',
    };

    const renderContent = () => {
        if (loading && activeSection !== 'analytics') return (
            <div style={{ padding: '40px', color: theme.textMuted, textAlign: 'center' }}>Loading...</div>
        );

        switch (activeSection) {
            case 'overview':
                return <TeacherOverview courses={courses} />;

            case 'students':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted }}>
                                {students.length} student{students.length !== 1 ? 's' : ''} enrolled across your courses
                            </p>
                            {courses.length > 0 && (
                                <button onClick={() => setManagingStudentsCourse(courses[0])}
                                    style={{ background: aGrad, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: `0 4px 12px ${accent.glow}`, fontFamily: 'inherit' }}
                                >
                                    <Plus size={13} /> Add Students
                                </button>
                            )}
                        </div>
                        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: `${theme.bg}80` }}>
                                        {['Student', 'Email', 'Enrolled In', ''].map(h => (
                                            <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${theme.border}` }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student._id} style={{ borderBottom: `1px solid ${theme.border}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${accent.from}06`}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '13px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${accent.from}18`, border: `1px solid ${accent.from}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: accent.from, flexShrink: 0 }}>
                                                        {student.name ? student.name[0].toUpperCase() : 'S'}
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: 600, color: theme.textPrimary }}>{student.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 20px', fontSize: '13px', color: theme.textSecondary }}>{student.email}</td>
                                            <td style={{ padding: '13px 20px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {(student.enrolledCourses || []).map((title, idx) => (
                                                        <span key={idx} style={{ fontSize: '11px', fontWeight: 600, color: accent.from, background: `${accent.from}12`, border: `1px solid ${accent.from}25`, borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{title}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => setRemovingStudent(student)}
                                                    title="Remove student"
                                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '5px 7px' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: theme.textMuted, fontSize: '13px' }}>
                                            No enrolled students yet. Add students from a course to see them here.
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'courses':
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {courses.map(course => (
                            <div key={course._id}
                                style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color .2s, box-shadow .2s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent.from}50`; e.currentTarget.style.boxShadow = `0 4px 20px ${accent.from}10`; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ height: '3px', background: aGrad }} />
                                <div style={{ padding: '18px 20px', flex: 1 }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>{course.title}</h3>
                                    <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: accent.from, background: `${accent.from}15`, border: `1px solid ${accent.from}30`, borderRadius: '20px', padding: '3px 10px' }}>{course.level}</span>
                                        <span style={{ fontSize: '11px', color: theme.textMuted }}>{new Date(course.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 16px', display: 'flex', gap: '8px' }}>
                                    {[
                                        { label: 'Curriculum', icon: ListChecks, onClick: () => setEditingCourse(course) },
                                        { label: 'Students', icon: Users, onClick: () => setManagingStudentsCourse(course) },
                                    ].map(({ label, icon: Icon, onClick }) => (
                                        <button key={label} onClick={onClick}
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; e.currentTarget.style.background = `${accent.from}08`; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'none'; }}
                                        >
                                            <Icon size={13} /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Create new card */}
                        <button onClick={() => setShowCreateModal(true)}
                            style={{ background: 'none', border: `2px dashed ${theme.border}`, borderRadius: '16px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: theme.textMuted, cursor: 'pointer', minHeight: '180px', transition: 'all .2s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; e.currentTarget.style.background = `${accent.from}06`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'none'; }}
                        >
                            <Plus size={28} />
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Create New Course</span>
                        </button>
                    </div>
                );

            case 'doubts':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {doubts.map(doubt => (
                            <div key={doubt._id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>{doubt.title}</h3>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                                        background: doubt.status === 'answered' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                                        color: doubt.status === 'answered' ? '#4ade80' : '#fbbf24',
                                        border: `1px solid ${doubt.status === 'answered' ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                    }}>{doubt.status}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>{doubt.description}</p>
                                <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '14px' }}>Answers: {doubt.answers.length}</div>
                                <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '14px' }}>
                                    <button onClick={() => setReplyingDoubt(doubt)}
                                        style={{ fontSize: '13px', fontWeight: 600, color: accent.from, background: `${accent.from}12`, border: `1px solid ${accent.from}30`, borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${accent.from}22`; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = `${accent.from}12`; }}
                                    >Reply to Doubt</button>
                                </div>
                            </div>
                        ))}
                        {doubts.length === 0 && (
                            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '48px', fontSize: '14px' }}>No doubts raised yet.</div>
                        )}
                    </div>
                );

            case 'analytics':
                return <TeacherAnalytics courses={courses} />;

            case 'chat':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted }}>
                            Select a class to open its chat. Each class has its own separate conversation.
                        </p>
                        {courses.length === 0 && (
                            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '48px', fontSize: '14px' }}>No courses yet.</div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                            {courses.map(course => {
                                const isOpen = chatCourseId === course._id;
                                return (
                                    <button key={course._id}
                                        onClick={() => setChatCourseId(isOpen ? null : course._id)}
                                        style={{
                                            background: isOpen ? `${accent.from}12` : theme.surface,
                                            border: `1px solid ${isOpen ? accent.from : theme.border}`,
                                            borderRadius: '14px', padding: '18px 20px', textAlign: 'left',
                                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                                            display: 'flex', flexDirection: 'column', gap: '8px',
                                        }}
                                        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.borderColor = `${accent.from}50`; e.currentTarget.style.boxShadow = `0 4px 16px ${accent.from}12`; } }}
                                        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none'; } }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isOpen ? aGrad : `${accent.from}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <MessagesSquare size={16} color={isOpen ? '#fff' : accent.from} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</div>
                                                <div style={{ fontSize: '11px', color: theme.textMuted }}>{course.level}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: isOpen ? accent.from : theme.textMuted }}>
                                            {isOpen ? '● Chat open' : 'Open chat →'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'profile':
                return <TeacherProfile />;

            default:
                return null;
        }
    };

    const NAV_ITEMS = [
        { icon: Home, label: 'Overview', id: 'overview' },
        { icon: Users, label: 'Students', id: 'students' },
        { icon: BookOpen, label: 'Courses', id: 'courses' },
        { icon: MessageCircle, label: 'Doubts', id: 'doubts' },
        { icon: BarChart, label: 'Analytics', id: 'analytics' },
        { icon: MessagesSquare, label: 'Chat', id: 'chat' },
        { icon: User2, label: 'Profile', id: 'profile' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.textPrimary, overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>

            {/* Sidebar */}
            <aside className="hidden md:flex flex-col" style={{ width: isSidebarCollapsed ? '72px' : '240px', background: theme.surface, borderRight: `1px solid ${theme.border}`, transition: 'width 0.25s ease', flexShrink: 0 }}>
                {/* Logo */}
                <div style={{ padding: isSidebarCollapsed ? '20px 0' : '20px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', minHeight: '72px' }}>
                    {!isSidebarCollapsed && (
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, background: aGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: "'Sora', sans-serif" }}>SkillBuddy</div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: accent.from, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Instructor</div>
                        </Link>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '6px', borderRadius: '8px', marginLeft: isSidebarCollapsed ? 0 : 'auto' }}
                        onMouseEnter={e => e.currentTarget.style.background = `${accent.from}12`}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    ><Menu size={18} /></button>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
                        const isActive = activeSection === id;
                        return (
                            <button key={id} onClick={() => setActiveSection(id)} title={isSidebarCollapsed ? label : ''}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                                    padding: isSidebarCollapsed ? '10px' : '10px 14px',
                                    borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: isActive ? aGrad : 'none',
                                    color: isActive ? '#fff' : theme.textMuted,
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '13px', fontFamily: 'inherit',
                                    transition: 'all .15s',
                                    boxShadow: isActive ? `0 4px 12px ${accent.glow}` : 'none',
                                }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${accent.from}12`; e.currentTarget.style.color = theme.textPrimary; } }}
                                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; } }}
                            >
                                <Icon size={17} style={{ flexShrink: 0 }} />
                                {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div style={{ padding: '10px', borderTop: `1px solid ${theme.border}` }}>
                    <button onClick={onLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '10px' : '10px 14px', width: '100%', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'none', color: theme.textMuted, fontSize: '13px', fontFamily: 'inherit', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; }}
                    >
                        <LogOut size={17} style={{ flexShrink: 0 }} />
                        {!isSidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* Header */}
                <header style={{ background: theme.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}`, padding: '0 28px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 40 }}>
                    <div>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: theme.textPrimary }}>Hello, {user.name} 👋</span>
                        <span style={{ marginLeft: '10px', fontSize: '12px', color: theme.textMuted, textTransform: 'capitalize' }}>{activeSection}</span>
                    </div>
                    <button onClick={() => setShowCreateModal(true)}
                        style={{ background: aGrad, border: 'none', color: '#fff', padding: '9px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', boxShadow: `0 4px 14px ${accent.glow}`, fontFamily: 'inherit' }}
                    >
                        <Plus size={15} /> Create Class
                    </button>
                </header>

                {/* Content */}
                <div style={{ flex: 1, padding: (activeSection === 'profile' || activeSection === 'overview') ? '0' : '28px', overflowY: 'auto' }}>
                    {activeSection !== 'profile' && activeSection !== 'overview' && (
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: theme.textPrimary, margin: '0 0 22px', textTransform: 'capitalize', fontFamily: "'Sora', sans-serif" }}>{activeSection}</h2>
                    )}
                    {renderContent()}
                </div>

                {/* Create Class Modal */}
                {showCreateModal && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
                        <div style={{ background: theme.surface, borderRadius: '20px', width: '100%', maxWidth: '440px', border: `1px solid ${theme.border}`, boxShadow: `0 0 60px ${accent.glow}`, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>Create New Class</h3>
                                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreateClass} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                    { label: 'Class Title', name: 'title', type: 'input', placeholder: 'e.g. Advanced React Patterns', required: true },
                                    { label: 'Description', name: 'description', type: 'textarea', placeholder: 'What will students learn?', required: true },
                                ].map(({ label, name, type, placeholder, required }) => (
                                    <div key={name}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>{label}</label>
                                        {type === 'textarea'
                                            ? <textarea required={required} name={name} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={placeholder}
                                                onFocus={e => e.target.style.borderColor = accent.from}
                                                onBlur={e => e.target.style.borderColor = theme.border} />
                                            : <input required={required} name={name} type="text" style={inputStyle} placeholder={placeholder}
                                                onFocus={e => e.target.style.borderColor = accent.from}
                                                onBlur={e => e.target.style.borderColor = theme.border} />
                                        }
                                    </div>
                                ))}
                                {[
                                    { label: 'Field', name: 'field', options: ['Frontend', 'Backend', 'Fullstack', 'DevOps', 'Data Science'].map(v => ({ value: v, label: `${v} Development` })) },
                                    { label: 'Level', name: 'level', options: ['Beginner', 'Intermediate', 'Advanced'].map(v => ({ value: v, label: v })) },
                                ].map(({ label, name, options }) => (
                                    <div key={name}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>{label}</label>
                                        <select name={name} style={{ ...inputStyle, cursor: 'pointer' }}
                                            onFocus={e => e.target.style.borderColor = accent.from}
                                            onBlur={e => e.target.style.borderColor = theme.border}
                                        >
                                            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <button type="submit"
                                    style={{ width: '100%', background: aGrad, border: 'none', color: '#fff', padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: `0 4px 14px ${accent.glow}`, fontFamily: 'inherit', marginTop: '4px' }}
                                >Create Class</button>
                            </form>
                        </div>
                    </div>
                )}

                {editingCourse && (
                    <CurriculumBuilder
                        courseId={editingCourse._id}
                        initialModules={editingCourse.modules}
                        initialSyllabus={editingCourse.syllabus}
                        initialTitle={editingCourse.title}
                        initialDescription={editingCourse.description}
                        onClose={() => setEditingCourse(null)}
                        onSave={() => { setEditingCourse(null); fetchCourses(); }}
                    />
                )}

                {replyingDoubt && (
                    <DoubtReplyModal
                        doubt={replyingDoubt}
                        onClose={() => setReplyingDoubt(null)}
                        onReplySuccess={() => { fetchDoubts(); fetchOverviewData(); }}
                    />
                )}

                {chatCourseId && user && (() => {
                    const chatCourse = courses.find(c => c._id === chatCourseId);
                    return (
                        <ClassChat
                            courseId={chatCourseId}
                            courseTitle={chatCourse?.title}
                            currentUser={{ id: user._id || user.id, name: user.name, role: user.role || 'teacher' }}
                            onClose={() => setChatCourseId(null)}
                        />
                    );
                })()}

                {managingStudentsCourse && (
                    <ManageStudentsModal
                        course={managingStudentsCourse}
                        onClose={() => setManagingStudentsCourse(null)}
                        onUpdate={() => { fetchCourses(); setManagingStudentsCourse(null); }}
                    />
                )}

                {/* Remove Student Confirmation */}
                {removingStudent && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                        <div style={{ background: theme.surface, borderRadius: '18px', padding: '28px 32px', maxWidth: '420px', width: '90%', border: `1px solid ${theme.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={20} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 8px', fontFamily: "'Sora', sans-serif" }}>Remove Student?</h3>
                            <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 6px' }}>
                                <strong>{removingStudent.name}</strong> will be removed from:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', margin: '10px 0 20px' }}>
                                {(removingStudent.enrolledCourseDetails || []).map(c => (
                                    <span key={c.courseId} style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '3px 10px' }}>{c.title}</span>
                                ))}
                            </div>
                            <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 22px' }}>Their progress data will also be deleted. This cannot be undone.</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => setRemovingStudent(null)} style={{ padding: '9px 22px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                <button onClick={confirmRemoveStudent} style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>Remove Student</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color, theme }) => (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '60px', height: '60px', borderRadius: '50%', background: `${color}12`, pointerEvents: 'none' }} />
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} style={{ color }} />
        </div>
        <div>
            <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 4px', fontWeight: 500 }}>{label}</p>
            <h4 style={{ fontSize: '26px', fontWeight: 800, color: theme.textPrimary, margin: 0, lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>{value}</h4>
        </div>
    </div>
);

export default TeacherDashboard;
