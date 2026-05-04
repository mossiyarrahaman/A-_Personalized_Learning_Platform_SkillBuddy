import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Mail, RefreshCw, Check } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const ManageStudentsModal = ({ course, onClose, onUpdate }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentsData, setStudentsData] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingId, setLoadingId] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const notify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchStudentProgress = async () => {
        try {
            const response = await api.get(`/courses/${course._id}/analytics`);
            if (response.data.students) setStudentsData(response.data.students);
        } catch (error) {
            console.error('Failed to fetch student progress', error);
        }
    };

    const fetchAvailableStudents = async () => {
        setRefreshing(true);
        try {
            const response = await api.get('/auth/students');
            const allStudents = response.data.students || [];
            const shuffled = allStudents.sort(() => 0.5 - Math.random());
            setAvailableStudents(shuffled.slice(0, 20));
        } catch (error) {
            console.error('Failed to fetch available students', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStudentProgress();
        fetchAvailableStudents();
    }, [course._id]);

    const handleAddStudent = async (e, specificEmail = null) => {
        if (e) e.preventDefault();
        const emailToAdd = specificEmail || identifier;
        if (!emailToAdd) return;
        if (specificEmail) setLoadingId(specificEmail);
        else setLoading(true);
        try {
            await api.post(`/courses/${course._id}/enroll`, { identifier: emailToAdd });
            if (!specificEmail) { notify('success', 'Student added successfully!'); setIdentifier(''); }
            onUpdate();
            fetchStudentProgress();
            fetchAvailableStudents();
        } catch (error) {
            notify('error', error.response?.data?.error || 'Failed to add student');
        } finally {
            setLoading(false);
            setLoadingId(null);
        }
    };

    const toggleSelection = (email) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(email)) newSelection.delete(email);
        else newSelection.add(email);
        setSelectedStudents(newSelection);
    };

    const handleBulkAdd = async () => {
        if (selectedStudents.size === 0) return;
        setBulkLoading(true);
        try {
            const identifiers = Array.from(selectedStudents);
            const response = await api.post(`/courses/${course._id}/enroll`, { identifiers });
            const { results } = response.data;
            let msg = `Added ${results.added.length} students.`;
            if (results.failed.length > 0) msg += ` Failed: ${results.failed.length}.`;
            if (results.alreadyEnrolled.length > 0) msg += ` Already in: ${results.alreadyEnrolled.length}.`;
            notify(results.failed.length > 0 ? 'error' : 'success', msg);
            setSelectedStudents(new Set());
            onUpdate();
            fetchStudentProgress();
            fetchAvailableStudents();
        } catch (error) {
            notify('error', error.response?.data?.error || 'Failed to add students');
        } finally {
            setBulkLoading(false);
        }
    };

    const isEnrolled = (email) => studentsData.some(s => s.email === email);

    const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
            <div style={{ background: theme.surface, borderRadius: '20px', width: '100%', maxWidth: '860px', border: `1px solid ${theme.border}`, boxShadow: `0 0 60px ${accent.glow}`, overflow: 'hidden', display: 'flex', flexDirection: 'row', maxHeight: '90vh', fontFamily: "'DM Sans', sans-serif" }}>

                {/* LEFT — Enrolled Students */}
                <div style={{ flex: 1, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ padding: '20px 22px', borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}80` }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 3px', fontFamily: "'Sora', sans-serif" }}>Enrolled Students</h3>
                        <p style={{ fontSize: '12px', color: theme.textMuted, margin: 0 }}>{course.title} · {studentsData.length} students</p>
                    </div>
                    <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
                        {studentsData.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {studentsData.map(student => (
                                    <div key={student.studentId || student._id}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: theme.bg, borderRadius: '10px', border: `1px solid ${theme.border}` }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${accent.from}18`, border: `1px solid ${accent.from}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: accent.from, flexShrink: 0 }}>
                                                {student.name ? student.name[0].toUpperCase() : 'S'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name || 'Unknown'}</div>
                                                <div style={{ fontSize: '11px', color: theme.textMuted, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{student.percentage || 0}%</div>
                                            <div style={{ width: '60px', height: '3px', background: theme.border, borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${student.percentage || 0}%`, background: '#22c55e', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textMuted, fontSize: '13px', border: `1px dashed ${theme.border}`, borderRadius: '12px', margin: '8px' }}>
                                No students enrolled yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Add Students */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ padding: '20px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${theme.bg}50` }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 3px', fontFamily: "'Sora', sans-serif" }}>Add Students</h3>
                            <p style={{ fontSize: '12px', color: theme.textMuted, margin: 0 }}>Invite new learners</p>
                        </div>
                        <button onClick={onClose}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px', borderRadius: '6px' }}
                            onMouseEnter={e => e.currentTarget.style.color = theme.textPrimary}
                            onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                        ><X size={18} /></button>
                    </div>

                    <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {notification && (
                            <div style={{ padding: '10px 14px', background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${notification.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '8px', fontSize: '13px', color: notification.type === 'error' ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                                {notification.message}
                            </div>
                        )}
                        {/* Manual Search */}
                        <form onSubmit={handleAddStudent}>
                            <label style={labelStyle}>Add by Email / Username</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        value={identifier}
                                        onChange={e => setIdentifier(e.target.value)}
                                        placeholder="email@example.com"
                                        style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', color: theme.textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderColor = accent.from}
                                        onBlur={e => e.target.style.borderColor = theme.border}
                                    />
                                </div>
                                <button type="submit" disabled={loading || !identifier}
                                    style={{ background: aGrad, border: 'none', borderRadius: '10px', padding: '0 16px', color: '#fff', cursor: loading || !identifier ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: loading || !identifier ? 0.5 : 1, boxShadow: `0 4px 12px ${accent.glow}` }}
                                >
                                    {loading ? <RefreshCw size={15} className="animate-spin" /> : <UserPlus size={15} />}
                                </button>
                            </div>
                        </form>

                        {/* Quick Add List */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Quick Add (Suggestions)</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {selectedStudents.size > 0 && (
                                        <button onClick={handleBulkAdd} disabled={bulkLoading}
                                            style={{ fontSize: '12px', background: aGrad, border: 'none', borderRadius: '8px', padding: '5px 12px', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', opacity: bulkLoading ? 0.6 : 1 }}
                                        >
                                            {bulkLoading ? <RefreshCw size={11} className="animate-spin" /> : <UserPlus size={11} />}
                                            Add Selected ({selectedStudents.size})
                                        </button>
                                    )}
                                    <button onClick={fetchAvailableStudents} disabled={refreshing}
                                        style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: accent.from, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                    >
                                        <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {availableStudents.map(student => {
                                    const alreadyEnrolled = isEnrolled(student.email);
                                    const isSelected = selectedStudents.has(student.email);
                                    const isAdding = loadingId === student.email;

                                    return (
                                        <div key={student._id}
                                            onClick={() => !alreadyEnrolled && toggleSelection(student.email)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 12px', borderRadius: '10px',
                                                border: `1px solid ${isSelected ? `${accent.from}50` : theme.border}`,
                                                background: isSelected ? `${accent.from}10` : theme.bg,
                                                cursor: alreadyEnrolled ? 'default' : 'pointer',
                                                transition: 'all .15s',
                                            }}
                                            onMouseEnter={e => { if (!alreadyEnrolled && !isSelected) e.currentTarget.style.borderColor = `${accent.from}30`; }}
                                            onMouseLeave={e => { if (!alreadyEnrolled && !isSelected) e.currentTarget.style.borderColor = theme.border; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                {!alreadyEnrolled && (
                                                    <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isSelected ? accent.from : theme.border}`, background: isSelected ? accent.from : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                                        {isSelected && <Check size={11} style={{ color: '#fff' }} />}
                                                    </div>
                                                )}
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: theme.surface, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: theme.textSecondary, flexShrink: 0 }}>
                                                    {student.name ? student.name[0].toUpperCase() : 'U'}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                                                    <div style={{ fontSize: '11px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
                                                </div>
                                            </div>

                                            {alreadyEnrolled ? (
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                    <Check size={10} /> Added
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleAddStudent(null, student.email); }}
                                                    disabled={isAdding}
                                                    style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: theme.textMuted, display: 'flex', flexShrink: 0 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = aGrad; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                                                >
                                                    {isAdding ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {availableStudents.length === 0 && (
                                    <div style={{ textAlign: 'center', fontSize: '13px', color: theme.textMuted, padding: '20px' }}>No suggestions available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageStudentsModal;
