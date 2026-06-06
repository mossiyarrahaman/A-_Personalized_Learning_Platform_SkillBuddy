import React, { useState, useEffect, useRef } from 'react';
import { X, Play, FileText, CheckCircle, Clock, Upload, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ReactPlayer from 'react-player';
import { getClientMeta } from '../utils/clientMeta';
import MarkdownContent from './MarkdownContent';

const ResourcePlayer = ({ resource, moduleId, topicId, onClose, onComplete }) => {

    // Helper to extract YouTube ID
    const getYouTubeId = (url) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtu.be')) {
                return urlObj.pathname.slice(1);
            }
            if (urlObj.hostname.includes('youtube.com')) {
                const params = new URLSearchParams(urlObj.search);
                if (params.has('v')) return params.get('v');
                if (urlObj.pathname.includes('/embed/')) return urlObj.pathname.split('/embed/')[1];
                if (urlObj.pathname.includes('/shorts/')) return urlObj.pathname.split('/shorts/')[1];
                if (urlObj.pathname.includes('/live/')) return urlObj.pathname.split('/live/')[1];
            }
        } catch (e) {
            // Fallback to regex if URL parsing fails
        }
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length >= 11) ? match[2] : null;
    };

    const getResourceType = (res) => {
        if (!res.url) return 'unknown';
        const url = res.url.toLowerCase();

        // explicit type checks first
        if (res.type === 'video') return 'video';

        // url based checks
        // ReactPlayer handles youtube, facebook, twitch, soundcloud, streamable, vimeo, wistia, mixcloud, dailykha, vidyard
        if (ReactPlayer.canPlay(res.url)) return 'youtube'; // treating generic react-player verifiable links as youtube-like wrapper
        if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) return 'video_file';

        // Document checks
        if (res.type === 'pdf' || url.endsWith('.pdf')) return 'pdf';
        if (url.endsWith('.doc') || url.endsWith('.docx') || url.endsWith('.ppt') || url.endsWith('.pptx') || url.endsWith('.xls') || url.endsWith('.xlsx')) return 'document';

        // Default fallbacks
        if (res.type === 'link' || res.type === 'article' || res.type === 'documentation') return 'external_link';

        // If we strictly don't know, treat as external link to be safe
        return 'external_link';
    };

    const resourceType = getResourceType(resource);

    const [timeSpent, setTimeSpent] = useState(0);
    const [isCompleted, setIsCompleted] = useState(resource.completed);

    // Quiz State
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    const generateQuiz = async () => {
        setLoadingQuiz(true);
        try {
            const response = await api.post('/courses/generate-resource-quiz', {
                resourceTitle: resource.title,
                topicTitle: "Topic Context" // Ideally passed props
            });
            setQuizQuestions(response.data.questions);
        } catch (error) {
            console.error("Quiz Gen Failed", error);
        } finally {
            setLoadingQuiz(false);
        }
    };

    // Timer Ref
    const timerRef = useRef(null);
    const lastSyncTime = useRef(0);
    const startTime = useRef(Date.now());

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(timerRef.current);
            syncProgress(resource.completed);
        };
    }, []);

    // Periodic Sync (every 10s)
    useEffect(() => {
        const syncInterval = setInterval(() => {
            const currentSessionTime = Math.floor((Date.now() - startTime.current) / 1000);
            const delta = currentSessionTime - lastSyncTime.current;

            if (delta > 0) {
                api.post('/courses/progress', {
                    moduleId, topicId, resourceId: resource._id || resource.id,
                    progress: isCompleted ? 100 : 0,
                    timeSpent: delta,
                    ...getClientMeta(),
                }).catch(err => console.error("Sync failed", err));
                lastSyncTime.current = currentSessionTime;
            }
        }, 10000);

        return () => clearInterval(syncInterval);
    }, [moduleId, topicId, resource, isCompleted]);


    const syncProgress = async (completedStatus) => {
        const currentSessionTime = Math.floor((Date.now() - startTime.current) / 1000);
        const delta = currentSessionTime - lastSyncTime.current;

        if (delta > 0 || completedStatus) {
            try {
                await api.post('/courses/progress', {
                    moduleId, topicId, resourceId: resource._id || resource.id,
                    progress: completedStatus ? 100 : 0,
                    timeSpent: delta,
                    ...getClientMeta(),
                });
                lastSyncTime.current = currentSessionTime;
            } catch (error) {
                console.error("Final sync failed", error);
            }
        }
    };

    const handleVideoEnded = () => {
        if (!isCompleted) {
            setIsCompleted(true);
            syncProgress(true);
            if (onComplete) onComplete(resource._id || resource.id);
        }
    };

    const handleManualComplete = () => {
        if (!isCompleted) {
            setIsCompleted(true);
            syncProgress(true);
            if (onComplete) onComplete(resource._id || resource.id);
        }
    };

    const isVideoType = resourceType === 'youtube' || resourceType === 'video_file' || resourceType === 'video';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <div className="flex items-center gap-3">
                            {isVideoType ? <Play className="text-purple-400" size={20} /> : <FileText className="text-blue-400" size={20} />}
                            <h2 className="font-bold text-lg text-white truncate max-w-lg">{resource.title}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Open Original Link Button */}
                            {resource.url && (
                                <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white transition mr-2"
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={14} />
                                    Open Original
                                </a>
                            )}

                            <div className="flex items-center text-gray-400 text-sm gap-1 bg-gray-900 px-3 py-1 rounded-full">
                                <Clock size={14} />
                                <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-black flex items-center justify-center relative">
                        {(resourceType === 'youtube' || resourceType === 'video') && (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <ReactPlayer
                                    url={resource.url}
                                    width="100%"
                                    height="100%"
                                    controls={true}
                                    playing={true}
                                    onEnded={handleVideoEnded}
                                    config={{
                                        youtube: {
                                            playerVars: { showinfo: 1 }
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {resourceType === 'video_file' && (
                            <video
                                src={resource.url}
                                controls
                                autoPlay
                                className="max-h-full max-w-full"
                                onEnded={handleVideoEnded}
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}

                        {resourceType === 'pdf' && (
                            <iframe
                                src={resource.url}
                                className="w-full h-full border-none"
                                title="PDF Resource"
                            />
                        )}

                        {resourceType === 'document' && (
                            <>
                                {(resource.url.includes('localhost') || resource.url.includes('127.0.0.1')) ? (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                                        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md">
                                            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FileText className="text-orange-500 w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">Preview Unavailable Locally</h3>
                                            <p className="text-gray-600 mb-6">
                                                This document uses an external viewer which cannot access files on your local computer.
                                            </p>
                                            <a
                                                href={resource.url}
                                                download
                                                className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                                            >
                                                <Upload className="w-5 h-5 rotate-180" />
                                                Download Document
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <iframe
                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(resource.url)}&embedded=true`}
                                        className="w-full h-full border-none"
                                        title="Document Preview"
                                    />
                                )}
                            </>
                        )}

                        {resourceType === 'external_link' && (
                            <div className="w-full h-full bg-gray-100 flex flex-col relative">
                                <iframe
                                    src={resource.url}
                                    className="w-full h-full border-none"
                                    title="External Resource"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                                <div className="absolute bottom-4 right-4 bg-gray-900/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                                    <AlertTriangle size={12} className="text-yellow-400" />
                                    <span>If blank, content cannot be embedded.</span>
                                </div>
                            </div>
                        )}

                        {resourceType === 'unknown' && !resource.url && (
                            <div className="p-8 flex items-center justify-center h-full">
                                <div className="max-w-2xl text-center bg-white p-8 rounded-2xl shadow-lg">
                                    <h1 className="text-2xl font-bold mb-4 text-gray-800">{resource.title}</h1>
                                    <div className="text-left">
                                        {resource.content
                                            ? <MarkdownContent content={resource.content} />
                                            : <p className="text-gray-500">No content available.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {isVideoType ? 'Watch until the end to complete.' : 'Read the material and mark as complete.'}
                        </div>

                        {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-400 font-bold px-6 py-2 bg-green-900/20 rounded-lg border border-green-500/20">
                                <CheckCircle size={20} />
                                <span>Completed</span>
                            </div>
                        ) : (
                            !isVideoType && (
                                <button
                                    onClick={handleManualComplete}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-lg transition"
                                >
                                    <CheckCircle size={20} />
                                    <span>Mark as Completed</span>
                                </button>
                            )
                        )}
                        <button
                            onClick={() => setShowQuiz(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition ml-4"
                        >
                            <FileText size={20} />
                            <span>Generate Quiz</span>
                        </button>
                    </div>

                    {/* Quiz Overlay */}
                    <AnimatePresence>
                        {showQuiz && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="absolute inset-0 bg-gray-900 z-[60] flex flex-col p-6 overflow-hidden"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-bold text-white">Quiz: {resource.title}</h3>
                                    <button onClick={() => setShowQuiz(false)} className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {!quizQuestions ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            {loadingQuiz ? (
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
                                            ) : (
                                                <div className="text-center">
                                                    <p className="text-gray-400 mb-4">Generate 5 questions based on this resource.</p>
                                                    <button
                                                        onClick={generateQuiz}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                                                    >
                                                        Start Generation
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-3xl mx-auto space-y-8 pb-10">
                                            {quizQuestions.map((q, i) => (
                                                <div key={i} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                                    <h4 className="text-lg font-bold text-white mb-4">{i + 1}. {q.question}</h4>
                                                    <div className="space-y-3">
                                                        {q.options.map((opt, optIndex) => (
                                                            <button
                                                                key={optIndex}
                                                                onClick={() => {
                                                                    if (quizSubmitted) return;
                                                                    const newAnswers = { ...userAnswers };
                                                                    newAnswers[i] = opt;
                                                                    setUserAnswers(newAnswers);
                                                                }}
                                                                className={`w-full text-left p-4 rounded-lg border transition-all ${quizSubmitted
                                                                    ? opt === q.correctAnswer
                                                                        ? 'bg-green-900/30 border-green-500 text-green-200'
                                                                        : userAnswers[i] === opt
                                                                            ? 'bg-red-900/30 border-red-500 text-red-200'
                                                                            : 'bg-gray-900 border-gray-700 text-gray-500'
                                                                    : userAnswers[i] === opt
                                                                        ? 'bg-primary-900/30 border-primary-500 text-primary-200 ring-1 ring-primary-500'
                                                                        : 'bg-gray-900 border-gray-700 hover:bg-gray-700 text-gray-300'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span>{opt}</span>
                                                                    {quizSubmitted && opt === q.correctAnswer && <CheckCircle size={16} className="text-green-500" />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {quizSubmitted && (
                                                        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-sm text-gray-400">
                                                            <span className="font-bold text-gray-300">Explanation:</span> {q.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {!quizSubmitted ? (
                                                <button
                                                    onClick={() => setQuizSubmitted(true)}
                                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg"
                                                >
                                                    Submit Quiz
                                                </button>
                                            ) : (
                                                <div className="text-center p-6 bg-gray-800 rounded-xl border border-gray-700">
                                                    <p className="text-2xl font-bold text-white mb-2">
                                                        You scored {quizQuestions.filter((q, i) => userAnswers[i] === q.correctAnswer).length} / {quizQuestions.length}
                                                    </p>
                                                    <button onClick={() => setShowQuiz(false)} className="text-gray-400 hover:text-white underline">
                                                        Close Quiz
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ResourcePlayer;
