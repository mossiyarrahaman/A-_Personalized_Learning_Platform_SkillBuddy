import React, { useState, useEffect } from 'react';
import { X, Book, CheckCircle, Play, FileText, ExternalLink, Loader, ArrowRight, Link, Headphones, Video, Eye, Download } from 'lucide-react';
import api from '../api/axios';

const TopicDetailModal = ({ courseId, moduleId, topicId, onClose, onUpdate }) => {
    const [topic, setTopic] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState(null);

    const handlePreview = (resource) => {
        setPreviewFile({
            url: resource.url,
            name: resource.title,
            type: resource.type
        });
    };

    useEffect(() => {
        if (moduleId && topicId) {
            fetchTopicDetails();
            if (courseId) {
                fetchAnalytics();
            }
        }
    }, [courseId, moduleId, topicId]);

    const fetchTopicDetails = async () => {
        try {
            setLoading(true);
            const queryParams = courseId ? `?courseId=${courseId}` : '';
            const res = await api.get(`/courses/module/${moduleId}/topic/${topicId}${queryParams}`);
            setTopic(res.data.topic);
        } catch (error) {
            console.error("Failed to load topic");
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            // Only fetch if we are likely a teacher (teacher view passes courseId)
            const res = await api.get(`/courses/${courseId}/module/${moduleId}/topic/${topicId}/analytics`);
            setAnalytics(res.data.analytics);
        } catch (error) {
            // Silent fail if not authorized (e.g. student view reusing this modal)
            console.log("Analytics not available or unauthorized");
        }
    };

    const toggleResource = async (resourceId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const updatedResources = topic.resources.map(r =>
                (r.id === resourceId || r._id === resourceId) ? { ...r, completed: newStatus } : r
            );
            setTopic({ ...topic, resources: updatedResources });

            await api.post('/courses/progress', {
                moduleId,
                topicId,
                resourceId,
                progress: newStatus ? 100 : 0
            });

            if (onUpdate) onUpdate();

        } catch (error) {
            console.error("Failed to update progress");
        }
    };

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
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Sidebar Drawer */}
            <div className="relative w-full max-w-2xl h-full bg-[#111] border-l border-gray-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-slide-in-right">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-[#151515] flex justify-between items-start sticky top-0 z-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{loading ? 'Loading...' : topic?.title}</h2>
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
                            <p>Curating personalized resources...</p>
                        </div>
                    ) : (
                        <div className="space-y-10">

                            {/* Description */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
                                    <Book className="w-5 h-5 mr-3 text-purple-500" />
                                    Topic Overview
                                </h3>
                                <p className="text-gray-400 leading-relaxed text-lg">
                                    {topic?.description}
                                </p>
                            </div>

                            {/* Detailed Content / Guide */}
                            {topic?.content && (
                                <div className="bg-[#151515] rounded-xl p-6 border border-gray-800 shadow-sm">
                                    <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                                        {topic.content.split('\n').map((line, i) => {
                                            if (line.trim().startsWith('###')) {
                                                return <h4 key={i} className="text-lg font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">{line.replace(/###/g, '').trim()}</h4>;
                                            }
                                            if (line.trim().startsWith('**')) {
                                                return <strong key={i} className="block text-white mt-4 mb-2">{line.replace(/\*\*/g, '')}</strong>;
                                            }
                                            if (line.trim().length === 0) return <br key={i} />;
                                            return <p key={i} className="mb-2 leading-relaxed opacity-90">{line.replace(/\*\*/g, '')}</p>;
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Resources List */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-200 mb-6 flex items-center">
                                    <ExternalLink className="w-5 h-5 mr-3 text-blue-500" />
                                    Recommended Resources
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-4">
                                        {topic?.resources?.map((resource, i) => (
                                            <div
                                                key={i}
                                                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${resource.completed
                                                    ? 'bg-green-900/10 border-green-500/30'
                                                    : 'bg-[#151515] border-gray-800 hover:border-gray-600'
                                                    }`}
                                            >
                                                <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${['youtube', 'video'].includes(resource.type) ? 'bg-red-500/10 text-red-500' :
                                                    resource.type === 'audio' ? 'bg-pink-500/10 text-pink-500' :
                                                        resource.type === 'link' ? 'bg-cyan-500/10 text-cyan-500' :
                                                            'bg-blue-500/10 text-blue-500' // article/document/book default
                                                    }`}>
                                                    {['youtube', 'video'].includes(resource.type) ? <Video size={20} /> :
                                                        resource.type === 'audio' ? <Headphones size={20} /> :
                                                            resource.type === 'link' ? <Link size={20} /> :
                                                                <FileText size={20} />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold text-gray-200 text-lg truncate pr-2">{resource.title}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="capitalize px-2 py-0.5 rounded bg-gray-800">{resource.type === 'article' ? 'Document' : resource.type}</span>
                                                        <span>•</span>
                                                        <span>{resource.duration || 'View Resource'}</span>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <button
                                                            onClick={() => handlePreview(resource)}
                                                            className="flex items-center gap-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
                                                        >
                                                            <Eye size={14} className="text-blue-400" /> Preview
                                                        </button>
                                                        <a
                                                            href={resource.url}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
                                                        >
                                                            <Download size={14} className="text-green-400" /> Download
                                                        </a>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => toggleResource(resource.id || resource._id, resource.completed)}
                                                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${resource.completed
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-600 text-transparent hover:border-green-500'
                                                        }`}
                                                    title="Mark as Done"
                                                >
                                                    <CheckCircle size={16} fill={resource.completed ? "currentColor" : "none"} />
                                                </button>
                                            </div>
                                        ))}

                                        {(!topic?.resources || topic.resources.length === 0) && (
                                            <div className="text-gray-500 text-center py-4 italic">No external links found for this topic.</div>
                                        )}
                                    </div>
                                </div>

                                <AnalyticsSection />


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
            {/* PREVIEW MODAL */}
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
                            {/* Video */}
                            {['video', 'youtube'].includes(previewFile.type) ? (
                                <video controls className="max-w-full max-h-full rounded-lg shadow-lg" src={previewFile.url}>
                                    Your browser does not support the video tag.
                                </video>
                            ) :
                                /* Audio */
                                previewFile.type === 'audio' ? (
                                    <div className="p-12 bg-gray-800 rounded-xl flex flex-col items-center gap-4">
                                        <Headphones size={48} className="text-pink-500" />
                                        <audio controls className="w-96" src={previewFile.url}>
                                            Your browser does not support the audio tag.
                                        </audio>
                                    </div>
                                ) :
                                    /* PDF */
                                    previewFile.url && previewFile.url.endsWith('.pdf') ? (
                                        <iframe src={previewFile.url} className="w-full h-full bg-white" title="PDF Preview" />
                                    ) :
                                        /* Document (try GView or Fallback) */
                                        (
                                            <>
                                                {(previewFile.url && (previewFile.url.includes('localhost') || previewFile.url.includes('127.0.0.1'))) ? (
                                                    <div className="text-center space-y-4">
                                                        <FileText size={48} className="text-gray-600 mx-auto" />
                                                        <div className="text-yellow-500 font-bold text-xl">Preview Unavailable Locally</div>
                                                        <p className="text-gray-400 max-w-md mx-auto">
                                                            Microsoft/Google Viewers cannot preview files hosted on localhost.
                                                            Please download to view.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <iframe
                                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`}
                                                        className="w-full h-full absolute inset-0 bg-white"
                                                        title="Doc Preview"
                                                    />
                                                )}
                                            </>
                                        )}

                            {/* Download Button in Modal */}
                            <a
                                href={previewFile.url}
                                download
                                className="mt-6 absolute bottom-8 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-bold transition-colors shadow-lg backdrop-blur-sm"
                            >
                                <Download className="w-5 h-5" /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicDetailModal;
