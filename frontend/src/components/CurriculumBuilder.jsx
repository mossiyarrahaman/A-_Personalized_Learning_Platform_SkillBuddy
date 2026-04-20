import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, CheckSquare, Square, Upload, X, FileText, Calendar, Check, Edit } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const CurriculumBuilder = ({ courseId, initialModules = [], initialSyllabus = {}, initialTitle = '', initialDescription = '', onClose, onSave }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const standardizeModules = (mods) => mods.map(m => ({
        ...m,
        id: m.id || m._id || Math.random().toString(36).substr(2, 9),
        timePlan: m.timePlan || '',
        topics: m.topics.map(t => ({
            ...t,
            id: t.id || t._id || Math.random().toString(36).substr(2, 9),
            isChecked: t.isChecked || false,
            teacherStatus: t.teacherStatus || 'not_covered'
        }))
    }));

    const [modules, setModules] = useState(standardizeModules(initialModules));
    const [syllabus, setSyllabus] = useState({
        fileUrl: initialSyllabus?.fileUrl || '',
        fileName: initialSyllabus?.fileName || '',
        checklist: initialSyllabus?.checklist || []
    });
    const [courseTitle, setCourseTitle] = useState(initialTitle);
    const [courseDescription, setCourseDescription] = useState(initialDescription);
    const [previewFile, setPreviewFile] = useState(null);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { setCourseTitle(initialTitle); setCourseDescription(initialDescription); }, [initialTitle, initialDescription]);

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem = { id: Math.random().toString(36).substr(2, 9), item: newChecklistItem, isChecked: false };
        setSyllabus({ ...syllabus, checklist: [...syllabus.checklist, newItem] });
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        setSyllabus({ ...syllabus, checklist: syllabus.checklist.map(item => item.id === id ? { ...item, isChecked: !item.isChecked } : item) });
    };

    const deleteChecklistItem = (id) => {
        setSyllabus({ ...syllabus, checklist: syllabus.checklist.filter(item => item.id !== id) });
    };

    const handleAddModule = () => {
        setModules([...modules, { id: Math.random().toString(36).substr(2, 9), title: 'New Module', timePlan: '', topics: [] }]);
    };

    const handleAddTopic = (moduleIndex) => {
        const updatedModules = [...modules];
        updatedModules[moduleIndex].topics.push({ id: Math.random().toString(36).substr(2, 9), title: 'New Topic', teacherStatus: 'not_covered', isChecked: false });
        setModules(updatedModules);
    };

    const handleModuleChange = (index, field, value) => {
        const newModules = [...modules]; newModules[index][field] = value; setModules(newModules);
    };

    const handleTopicChange = (mIndex, tIndex, field, value) => {
        const newModules = [...modules]; newModules[mIndex].topics[tIndex][field] = value; setModules(newModules);
    };

    const handleDeleteModule = (index) => {
        if (confirm('Delete this module and all its topics?')) {
            const newModules = [...modules]; newModules.splice(index, 1); setModules(newModules);
        }
    };

    const handleDeleteTopic = (mIndex, tIndex) => {
        const newModules = [...modules]; newModules[mIndex].topics.splice(tIndex, 1); setModules(newModules);
    };

    const handleAddResource = (mIndex, tIndex) => {
        const newModules = [...modules];
        if (!newModules[mIndex].topics[tIndex].resources) newModules[mIndex].topics[tIndex].resources = [];
        newModules[mIndex].topics[tIndex].resources.push({ type: 'video', title: '', url: '' });
        setModules(newModules);
    };

    const handleResourceChange = (mIndex, tIndex, rIndex, field, value) => {
        const newModules = [...modules]; newModules[mIndex].topics[tIndex].resources[rIndex][field] = value; setModules(newModules);
    };

    const handleDeleteResource = (mIndex, tIndex, rIndex) => {
        const newModules = [...modules]; newModules[mIndex].topics[tIndex].resources.splice(rIndex, 1); setModules(newModules);
    };

    const handleSyllabusUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post('/upload', formData, { headers: { 'Content-Type': null } });
            setSyllabus({ ...syllabus, fileUrl: response.data.url, fileName: file.name });
            alert('Syllabus uploaded successfully!');
        } catch (error) {
            alert('Syllabus upload failed: ' + (error.response?.data?.error || error.message || 'Upload failed'));
        }
    };

    const handleFileUpload = async (e, mIndex, tIndex, rIndex) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post('/upload', formData, { headers: { 'Content-Type': null } });
            const newModules = [...modules];
            const resource = newModules[mIndex].topics[tIndex].resources[rIndex];
            resource.url = response.data.url;
            resource.title = resource.title || file.name;
            if (response.data.type?.startsWith('video')) resource.type = 'video';
            else if (response.data.type?.startsWith('audio')) resource.type = 'audio';
            else if (response.data.type?.includes('pdf') || response.data.type?.includes('officedocument')) resource.type = 'article';
            setModules(newModules);
            alert('File uploaded successfully!');
        } catch (error) {
            alert('Upload failed: ' + (error.response?.data?.error || error.message || 'Upload failed'));
        }
    };

    const saveCurriculum = async () => {
        setSaving(true);
        try {
            await api.put(`/courses/${courseId}/modules`, { modules, syllabus, title: courseTitle, description: courseDescription });
            alert('Curriculum and course details saved successfully!');
            if (onSave) onSave();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const statusColor = (s) => s === 'completed' ? '#22c55e' : s === 'in_progress' ? '#fbbf24' : theme.textMuted;

    const inputBorder = { border: 'none', borderBottom: `1px solid ${theme.border}`, background: 'transparent', outline: 'none' };

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: theme.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>

            {/* Header */}
            <header style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '16px 24px', flexShrink: 0 }}>
                <div style={{ height: '3px', background: aGrad, margin: '-16px -24px 16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <input
                                value={courseTitle}
                                onChange={e => setCourseTitle(e.target.value)}
                                style={{ ...inputBorder, borderColor: 'transparent', fontSize: '22px', fontWeight: 800, color: theme.textPrimary, width: '100%', maxWidth: '480px', fontFamily: "'Sora', sans-serif", padding: '2px 0' }}
                                onFocus={e => e.target.style.borderBottomColor = accent.from}
                                onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                                placeholder="Course Title"
                            />
                            <Edit size={14} style={{ color: theme.textMuted, flexShrink: 0 }} />
                        </div>
                        <textarea
                            value={courseDescription}
                            onChange={e => setCourseDescription(e.target.value)}
                            rows={2}
                            style={{ background: `${theme.bg}80`, color: theme.textSecondary, fontSize: '13px', width: '100%', maxWidth: '640px', borderRadius: '8px', padding: '8px 10px', border: `1px solid transparent`, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                            onFocus={e => e.target.style.borderColor = theme.border}
                            onBlur={e => e.target.style.borderColor = 'transparent'}
                            placeholder="Course Description"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                        <button onClick={onClose}
                            style={{ padding: '9px 16px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.textSecondary, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = theme.textMuted}
                            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                        >Cancel</button>
                        <button onClick={saveCurriculum} disabled={saving}
                            style={{ background: aGrad, border: 'none', color: '#fff', padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `0 4px 14px ${accent.glow}`, fontFamily: 'inherit' }}
                        >
                            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Syllabus section */}
                    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '22px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: "'Sora', sans-serif" }}>
                            <FileText size={15} style={{ color: accent.from }} /> Syllabus & Roadmap
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* File upload */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Upload Syllabus Document</label>
                                <div style={{ border: `2px dashed ${theme.border}`, borderRadius: '12px', padding: '22px', textAlign: 'center', transition: 'border-color .15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}50`}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                >
                                    {syllabus.fileUrl ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.bg, padding: '10px 12px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <FileText size={16} style={{ color: accent.from, flexShrink: 0 }} />
                                                <button onClick={() => setPreviewFile({ url: syllabus.fileUrl, name: syllabus.fileName })}
                                                    style={{ fontSize: '13px', color: theme.textPrimary, background: 'none', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline', fontFamily: 'inherit' }}
                                                >
                                                    {syllabus.fileName || 'Syllabus.pdf'}
                                                </button>
                                            </div>
                                            <button onClick={() => setSyllabus({ ...syllabus, fileUrl: '', fileName: '' })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '2px' }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    ) : (
                                        <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <Upload size={24} style={{ color: theme.textMuted }} />
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: theme.textSecondary }}>Click to upload PDF/Doc</span>
                                            <input type="file" style={{ display: 'none' }} onChange={handleSyllabusUpload} accept=".pdf,.doc,.docx" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Track Progress / Milestones</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                    {syllabus.checklist.map(item => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: theme.bg, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                            <button onClick={() => toggleChecklistItem(item.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.isChecked ? '#22c55e' : theme.textMuted, display: 'flex', flexShrink: 0 }}
                                            >
                                                {item.isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                            <span style={{ flex: 1, fontSize: '13px', color: item.isChecked ? theme.textMuted : theme.textSecondary, textDecoration: item.isChecked ? 'line-through' : 'none' }}>{item.item}</span>
                                            <button onClick={() => deleteChecklistItem(item.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', flexShrink: 0 }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                            ><X size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={newChecklistItem}
                                        onChange={e => setNewChecklistItem(e.target.value)}
                                        placeholder="Add milestone..."
                                        style={{ flex: 1, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: theme.textPrimary, outline: 'none', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderColor = accent.from}
                                        onBlur={e => e.target.style.borderColor = theme.border}
                                        onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                                    />
                                    <button onClick={addChecklistItem}
                                        style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: theme.textSecondary, display: 'flex', transition: 'all .15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = aGrad; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                                    ><Plus size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modules */}
                    {modules.map((module, mIndex) => (
                        <div key={module.id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            {/* Module header */}
                            <div style={{ background: `${theme.bg}80`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: `1px solid ${theme.border}` }}>
                                <GripVertical size={16} style={{ color: theme.textMuted, cursor: 'move', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <input
                                        type="text"
                                        value={module.title}
                                        onChange={e => handleModuleChange(mIndex, 'title', e.target.value)}
                                        style={{ background: 'transparent', fontSize: '15px', fontWeight: 700, color: theme.textPrimary, width: '100%', border: 'none', borderBottom: `1px solid transparent`, outline: 'none', padding: '2px 0', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderBottomColor = accent.from}
                                        onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                                        placeholder="Enter Module Name..."
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '6px 10px' }}>
                                    <Calendar size={13} style={{ color: theme.textMuted, flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        value={module.timePlan || ''}
                                        onChange={e => handleModuleChange(mIndex, 'timePlan', e.target.value)}
                                        placeholder="Week 1"
                                        style={{ background: 'transparent', fontSize: '12px', color: theme.textSecondary, width: '80px', border: 'none', outline: 'none', fontFamily: 'inherit' }}
                                    />
                                </div>
                                <button onClick={() => handleDeleteModule(mIndex)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', flexShrink: 0 }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                ><Trash2 size={15} /></button>
                            </div>

                            {/* Topics */}
                            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {module.topics.map((topic, tIndex) => (
                                    <div key={topic.id} style={{ background: theme.bg, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, transition: 'border-color .15s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = `${accent.from}30`}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button
                                                onClick={() => handleTopicChange(mIndex, tIndex, 'isChecked', !topic.isChecked)}
                                                title="Mark as Covered"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: topic.isChecked ? '#22c55e' : theme.border, display: 'flex', flexShrink: 0 }}
                                            >
                                                {topic.isChecked ? <CheckSquare size={17} /> : <Square size={17} />}
                                            </button>

                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={topic.title}
                                                    onChange={e => handleTopicChange(mIndex, tIndex, 'title', e.target.value)}
                                                    style={{ background: 'transparent', width: '100%', fontSize: '14px', fontWeight: 600, color: topic.isChecked ? theme.textMuted : theme.textPrimary, textDecoration: topic.isChecked ? 'line-through' : 'none', border: 'none', outline: 'none', fontFamily: 'inherit' }}
                                                    placeholder="Topic Title"
                                                />
                                            </div>

                                            <select
                                                value={topic.teacherStatus}
                                                onChange={e => handleTopicChange(mIndex, tIndex, 'teacherStatus', e.target.value)}
                                                style={{ fontSize: '11px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '3px 8px', outline: 'none', cursor: 'pointer', color: statusColor(topic.teacherStatus), fontFamily: 'inherit' }}
                                            >
                                                <option value="not_covered">Not Covered</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>

                                            <button onClick={() => handleDeleteTopic(mIndex, tIndex)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', flexShrink: 0, opacity: 0.6 }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.opacity = '0.6'; }}
                                            ><Trash2 size={14} /></button>
                                        </div>

                                        {/* Resources */}
                                        <div style={{ marginLeft: '28px', borderLeft: `2px solid ${theme.border}`, paddingLeft: '14px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {topic.resources?.map((res, rIndex) => (
                                                <div key={rIndex} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <select
                                                        value={res.type}
                                                        onChange={e => handleResourceChange(mIndex, tIndex, rIndex, 'type', e.target.value)}
                                                        style={{ fontSize: '11px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '4px 8px', outline: 'none', color: theme.textSecondary, fontFamily: 'inherit', width: '100px' }}
                                                    >
                                                        {['video', 'article', 'link', 'audio', 'quiz', 'documentation', 'assignment'].map(t => (
                                                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={res.title}
                                                        onChange={e => handleResourceChange(mIndex, tIndex, rIndex, 'title', e.target.value)}
                                                        placeholder="Resource Title"
                                                        style={{ flex: 1, background: 'transparent', borderBottom: `1px solid ${theme.border}`, border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: theme.border, color: theme.textSecondary, fontSize: '12px', outline: 'none', padding: '3px 0', minWidth: '80px', fontFamily: 'inherit' }}
                                                        onFocus={e => e.target.style.borderBottomColor = accent.from}
                                                        onBlur={e => e.target.style.borderBottomColor = theme.border}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={res.url}
                                                        onChange={e => handleResourceChange(mIndex, tIndex, rIndex, 'url', e.target.value)}
                                                        placeholder={res.type === 'link' ? 'External URL' : 'File URL'}
                                                        style={{ flex: 1, background: 'transparent', borderBottom: `1px solid ${theme.border}`, border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: theme.border, color: theme.textMuted, fontSize: '12px', outline: 'none', padding: '3px 0', minWidth: '80px', fontFamily: 'inherit' }}
                                                        onFocus={e => e.target.style.borderBottomColor = accent.from}
                                                        onBlur={e => e.target.style.borderBottomColor = theme.border}
                                                    />
                                                    {['video', 'article', 'audio'].includes(res.type) && (
                                                        <label style={{ cursor: 'pointer', color: theme.textMuted, display: 'flex' }}
                                                            onMouseEnter={e => e.currentTarget.style.color = accent.from}
                                                            onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                                        >
                                                            <Upload size={14} />
                                                            <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(e, mIndex, tIndex, rIndex)}
                                                                accept={res.type === 'video' ? 'video/*' : res.type === 'audio' ? 'audio/*' : '*'} />
                                                        </label>
                                                    )}
                                                    <button onClick={() => handleDeleteResource(mIndex, tIndex, rIndex)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', flexShrink: 0 }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                                    ><X size={13} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddResource(mIndex, tIndex)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', padding: '2px 0' }}
                                                onMouseEnter={e => e.currentTarget.style.color = accent.from}
                                                onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                                            >
                                                <Plus size={12} /> Add Resource
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button onClick={() => handleAddTopic(mIndex)}
                                    style={{ width: '100%', padding: '9px', border: `2px dashed ${theme.border}`, borderRadius: '8px', background: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', transition: 'all .15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; e.currentTarget.style.background = `${accent.from}06`; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'none'; }}
                                >
                                    <Plus size={14} /> Add Topic
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add Module */}
                    <button onClick={handleAddModule}
                        style={{ width: '100%', padding: '16px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '14px', color: theme.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; e.currentTarget.style.background = `${accent.from}06`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = theme.surface; }}
                    >
                        <Plus size={18} /> Add New Module
                    </button>
                </div>
            </div>

            {/* File Preview Modal */}
            {previewFile && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: theme.surface, width: '100%', maxWidth: '900px', height: '85vh', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewFile.name}</h3>
                            <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}><X size={20} /></button>
                        </div>
                        <div style={{ flex: 1, background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            {previewFile.url.endsWith('.pdf') ? (
                                <iframe src={previewFile.url} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
                            ) : (
                                previewFile.url.includes('localhost') || previewFile.url.includes('127.0.0.1') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#d97706', fontWeight: 700, fontSize: '18px', marginBottom: '10px' }}>Preview Unavailable Locally</div>
                                        <p style={{ color: '#6b7280', maxWidth: '360px' }}>Google Docs Viewer cannot preview files hosted on localhost.</p>
                                    </div>
                                ) : (
                                    <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, border: 'none' }} title="Doc Preview" />
                                )
                            )}
                            {(!previewFile.url.endsWith('.pdf') || previewFile.url.includes('localhost')) && (
                                <a href={previewFile.url} download
                                    style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: aGrad, color: '#fff', padding: '11px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: `0 4px 14px ${accent.glow}`, zIndex: 1 }}
                                >
                                    <Upload style={{ transform: 'rotate(180deg)' }} size={15} /> Download File
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumBuilder;
