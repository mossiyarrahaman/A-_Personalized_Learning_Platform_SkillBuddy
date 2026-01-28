import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, CheckSquare, Square, Upload, X, FileText, Calendar, Check, Edit } from 'lucide-react';
import api from '../api/axios';

const CurriculumBuilder = ({ courseId, initialModules = [], initialSyllabus = {}, initialTitle = '', initialDescription = '', onClose, onSave }) => {
    // Standardize modules structure on load
    const standardizeModules = (mods) => {
        return mods.map(m => ({
            ...m,
            // Ensure ID exists (for new or existing)
            id: m.id || m._id || Math.random().toString(36).substr(2, 9),
            timePlan: m.timePlan || '',
            topics: m.topics.map(t => ({
                ...t,
                id: t.id || t._id || Math.random().toString(36).substr(2, 9),
                isChecked: t.isChecked || false,
                teacherStatus: t.teacherStatus || 'not_covered'
            }))
        }));
    };

    const [modules, setModules] = useState(standardizeModules(initialModules));
    const [syllabus, setSyllabus] = useState({
        fileUrl: initialSyllabus?.fileUrl || '',
        fileName: initialSyllabus?.fileName || '',
        checklist: initialSyllabus?.checklist || []
    });

    // Course Details State
    const [courseTitle, setCourseTitle] = useState(initialTitle);
    const [courseDescription, setCourseDescription] = useState(initialDescription);
    const [previewFile, setPreviewFile] = useState(null);

    useEffect(() => {
        setCourseTitle(initialTitle);
        setCourseDescription(initialDescription);
    }, [initialTitle, initialDescription]);

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [saving, setSaving] = useState(false);



    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            item: newChecklistItem,
            isChecked: false
        };
        setSyllabus({ ...syllabus, checklist: [...syllabus.checklist, newItem] });
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        const updatedList = syllabus.checklist.map(item =>
            item.id === id ? { ...item, isChecked: !item.isChecked } : item
        );
        setSyllabus({ ...syllabus, checklist: updatedList });
    };

    const deleteChecklistItem = (id) => {
        const updatedList = syllabus.checklist.filter(item => item.id !== id);
        setSyllabus({ ...syllabus, checklist: updatedList });
    };

    const handleAddModule = () => {
        setModules([...modules, {
            id: Math.random().toString(36).substr(2, 9),
            title: "New Module",
            timePlan: "",
            topics: []
        }]);
    };

    const handleAddTopic = (moduleIndex) => {
        const updatedModules = [...modules];
        updatedModules[moduleIndex].topics.push({
            id: Math.random().toString(36).substr(2, 9),
            title: "New Topic",
            teacherStatus: 'not_covered',
            isChecked: false
        });
        setModules(updatedModules);
    };

    const handleModuleChange = (index, field, value) => {
        const newModules = [...modules];
        newModules[index][field] = value;
        setModules(newModules);
    };

    const handleTopicChange = (mIndex, tIndex, field, value) => {
        const newModules = [...modules];
        newModules[mIndex].topics[tIndex][field] = value;
        setModules(newModules);
    };

    const handleDeleteModule = (index) => {
        if (confirm("Delete this module and all its topics?")) {
            const newModules = [...modules];
            newModules.splice(index, 1);
            setModules(newModules);
        }
    };

    const handleDeleteTopic = (mIndex, tIndex) => {
        const newModules = [...modules];
        newModules[mIndex].topics.splice(tIndex, 1);
        setModules(newModules);
    };


    const handleAddResource = (mIndex, tIndex) => {
        const newModules = [...modules];
        if (!newModules[mIndex].topics[tIndex].resources) {
            newModules[mIndex].topics[tIndex].resources = [];
        }
        newModules[mIndex].topics[tIndex].resources.push({
            type: 'video',
            title: '',
            url: ''
        });
        setModules(newModules);
    };

    const handleResourceChange = (mIndex, tIndex, rIndex, field, value) => {
        const newModules = [...modules];
        newModules[mIndex].topics[tIndex].resources[rIndex][field] = value;
        setModules(newModules);
    };

    const handleDeleteResource = (mIndex, tIndex, rIndex) => {
        const newModules = [...modules];
        newModules[mIndex].topics[tIndex].resources.splice(rIndex, 1);
        setModules(newModules);
    };

    const handleSyllabusUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSyllabus({
                ...syllabus,
                fileUrl: response.data.url,
                fileName: file.name
            });
            alert('Syllabus uploaded successfully!');
        } catch (error) {
            console.error(error);
            alert('Syllabus upload failed.');
        }
    };

    const handleFileUpload = async (e, mIndex, tIndex, rIndex) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Optimistic UI update or loader could go here
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newModules = [...modules];
            const resource = newModules[mIndex].topics[tIndex].resources[rIndex];

            resource.url = response.data.url;
            resource.title = resource.title || file.name; // Auto-fill title if empty

            // Auto-detect type
            if (response.data.type?.startsWith('video')) resource.type = 'video';
            else if (response.data.type?.startsWith('audio')) resource.type = 'audio';
            else if (response.data.type?.includes('pdf') || response.data.type?.includes('officedocument')) resource.type = 'article';

            setModules(newModules);
            alert('File uploaded successfully!');
        } catch (error) {
            console.error(error);
            alert('Upload failed.');
        }
    };

    const saveCurriculum = async () => {
        setSaving(true);
        try {
            // Clean up IDs before sending if needed, but keeping them is fine mostly
            await api.put(`/courses/${courseId}/modules`, {
                modules,
                syllabus,
                title: courseTitle,
                description: courseDescription
            });
            alert("Curriculum and course details saved successfully!");
            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-gray-900 absolute inset-0 z-50 flex flex-col">
            <header className="bg-gray-800 border-b border-gray-700 p-4 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        {/* Title Editing */}
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                value={courseTitle}
                                onChange={(e) => setCourseTitle(e.target.value)}
                                className="bg-transparent text-2xl font-bold text-white focus:outline-none focus:border-b-2 border-purple-500 placeholder-gray-500 transition-all w-full md:w-1/2"
                                placeholder="Course Title"
                            />
                            <Edit size={16} className="text-gray-500" />
                        </div>
                        {/* Description Editing */}
                        <textarea
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            className="bg-gray-900/50 text-sm text-gray-300 w-full rounded-lg p-2 border border-transparent focus:border-gray-600 focus:outline-none resize-none"
                            rows={2}
                            placeholder="Course Description"
                        />
                    </div>

                    <div className="flex space-x-3 items-start">
                        <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button
                            onClick={saveCurriculum}
                            disabled={saving}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* SYLLABUS & ROADMAP SECTION */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-purple-500" /> Syllabus & Roadmap
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* File Upload */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-400">Upload Syllabus Document</label>
                                <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:bg-gray-700/30 transition-colors">
                                    {syllabus.fileUrl ? (
                                        <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="text-blue-400 flex-shrink-0" size={20} />
                                                <button
                                                    onClick={() => setPreviewFile({ url: syllabus.fileUrl, name: syllabus.fileName })}
                                                    className="text-sm text-white truncate hover:text-blue-400 underline focus:outline-none text-left"
                                                >
                                                    {syllabus.fileName || 'Syllabus.pdf'}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setSyllabus({ ...syllabus, fileUrl: '', fileName: '' })}
                                                className="text-gray-400 hover:text-red-400 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center gap-2">
                                            <Upload className="text-gray-400 w-8 h-8" />
                                            <span className="text-gray-300 text-sm font-medium">Click to upload PDF/Doc</span>
                                            <input type="file" className="hidden" onChange={handleSyllabusUpload} accept=".pdf,.doc,.docx" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Checklist / Roadmap */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-400">Track Progress / Milestones</label>
                                <div className="space-y-2">
                                    {syllabus.checklist.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                                            <button
                                                onClick={() => toggleChecklistItem(item.id)}
                                                className={item.isChecked ? "text-green-500" : "text-gray-500 hover:text-gray-300"}
                                            >
                                                {item.isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${item.isChecked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                                {item.item}
                                            </span>
                                            <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-600 hover:text-red-400">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newChecklistItem}
                                        onChange={(e) => setNewChecklistItem(e.target.value)}
                                        placeholder="Add milestone..."
                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                        onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                    />
                                    <button
                                        onClick={addChecklistItem}
                                        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {modules.map((module, mIndex) => (
                        <div key={module.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                            {/* Module Header */}
                            <div className="bg-gray-700/50 p-4 flex items-center gap-4 flex-wrap">
                                <GripVertical className="text-gray-500 cursor-move" />
                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        value={module.title}
                                        onChange={(e) => handleModuleChange(mIndex, 'title', e.target.value)}
                                        className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:border-b-2 border-purple-500 placeholder-gray-500 transition-all px-2 py-1 rounded hover:bg-white/5"
                                        placeholder="Enter Module Name..."
                                    />
                                </div>

                                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-600">
                                    <Calendar size={14} className="text-gray-400" />
                                    <input
                                        type="text"
                                        value={module.timePlan || ''}
                                        onChange={(e) => handleModuleChange(mIndex, 'timePlan', e.target.value)}
                                        placeholder="Time Plan (e.g. Week 1)"
                                        className="bg-transparent text-sm text-gray-300 w-32 focus:outline-none placeholder-gray-600"
                                    />
                                </div>

                                <button onClick={() => handleDeleteModule(mIndex)} className="text-gray-500 hover:text-red-400 ml-2">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Topics List */}
                            <div className="p-4 space-y-3">
                                {module.topics.map((topic, tIndex) => (
                                    <div key={topic.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleTopicChange(mIndex, tIndex, 'isChecked', !topic.isChecked)}
                                                className={`flex-shrink-0 transition-colors ${topic.isChecked ? 'text-green-500' : 'text-gray-600 hover:text-gray-400'}`}
                                                title="Mark as Covered"
                                            >
                                                {topic.isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                            </button>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={topic.title}
                                                    onChange={(e) => handleTopicChange(mIndex, tIndex, 'title', e.target.value)}
                                                    className={`bg-transparent w-full text-base font-semibold focus:outline-none ${topic.isChecked ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                                                    placeholder="Topic Title"
                                                />
                                            </div>

                                            <select
                                                value={topic.teacherStatus}
                                                onChange={(e) => handleTopicChange(mIndex, tIndex, 'teacherStatus', e.target.value)}
                                                className={`text-xs bg-gray-800 border-none rounded px-2 py-1 outline-none cursor-pointer ${topic.teacherStatus === 'completed' ? 'text-green-400' :
                                                    topic.teacherStatus === 'in_progress' ? 'text-yellow-400' :
                                                        'text-gray-500'
                                                    }`}
                                            >
                                                <option value="not_covered">Not Covered</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>

                                            <button onClick={() => handleDeleteTopic(mIndex, tIndex)} className="text-gray-600 hover:text-red-400 opacity-60 hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Resources Section */}
                                        <div className="ml-8 border-l-2 border-gray-700 pl-4 space-y-2">
                                            {topic.resources && topic.resources.map((res, rIndex) => (
                                                <div key={rIndex} className="flex gap-2 items-center text-sm">
                                                    <select
                                                        value={res.type}
                                                        onChange={(e) => handleResourceChange(mIndex, tIndex, rIndex, 'type', e.target.value)}
                                                        className="bg-gray-800 text-gray-400 rounded px-2 py-1 border border-gray-700 outline-none w-28"
                                                    >
                                                        <option value="video">Video</option>
                                                        <option value="article">Document</option>
                                                        <option value="link">Link</option>
                                                        <option value="audio">Audio</option>
                                                        <option value="quiz">Quiz</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={res.title}
                                                        onChange={(e) => handleResourceChange(mIndex, tIndex, rIndex, 'title', e.target.value)}
                                                        placeholder="Resource Title"
                                                        className="bg-transparent border-b border-gray-700 text-gray-300 w-1/3 focus:border-purple-500 outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={res.url}
                                                        onChange={(e) => handleResourceChange(mIndex, tIndex, rIndex, 'url', e.target.value)}
                                                        placeholder={res.type === 'link' ? "External URL" : "File URL or Upload"}
                                                        className="bg-transparent border-b border-gray-700 text-gray-500 w-1/3 focus:border-purple-500 outline-none"
                                                    />

                                                    {/* Upload Button - Hide for Links/Quizzes */}
                                                    {['video', 'article', 'audio'].includes(res.type) && (
                                                        <label className="cursor-pointer text-gray-500 hover:text-purple-400 p-1">
                                                            <Upload className="w-4 h-4" />
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                onChange={(e) => handleFileUpload(e, mIndex, tIndex, rIndex)}
                                                                accept={
                                                                    res.type === 'video' ? 'video/*' :
                                                                        res.type === 'audio' ? 'audio/*' :
                                                                            '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'
                                                                }
                                                            />
                                                        </label>
                                                    )}

                                                    <button onClick={() => handleDeleteResource(mIndex, tIndex, rIndex)} className="text-gray-600 hover:text-red-400 p-1">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => handleAddResource(mIndex, tIndex)}
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add Resource
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => handleAddTopic(mIndex)}
                                    className="w-full py-2 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-gray-800 transition-all text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Topic
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddModule}
                        className="w-full py-4 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all font-bold flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Add New Module
                    </button>
                </div>
            </div>
            {/* File Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
                            <h3 className="text-white font-bold truncate">{previewFile.name}</h3>
                            <button onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-white relative flex flex-col items-center justify-center p-4">
                            {previewFile.url.endsWith('.pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-full" title="PDF Preview" />
                            ) : (
                                <>
                                    {previewFile.url.includes('localhost') || previewFile.url.includes('127.0.0.1') ? (
                                        <div className="text-center space-y-4">
                                            <div className="text-yellow-600 font-bold text-xl">Preview Unavailable Locally</div>
                                            <p className="text-gray-600 max-w-md mx-auto">
                                                Google Docs Viewer cannot preview files hosted on <b>localhost</b>.
                                                This feature will work automatically when deployed to a public server.
                                            </p>
                                        </div>
                                    ) : (
                                        <iframe
                                            src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`}
                                            className="w-full h-full absolute inset-0"
                                            title="Doc Preview"
                                        />
                                    )}
                                </>
                            )}

                            {(!previewFile.url.endsWith('.pdf') || previewFile.url.includes('localhost')) && (
                                <a
                                    href={previewFile.url}
                                    download
                                    className="mt-6 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg"
                                >
                                    <Upload className="rotate-180 w-5 h-5" /> Download File
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
