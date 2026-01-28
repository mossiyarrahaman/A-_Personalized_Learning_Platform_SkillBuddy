import React, { useState, useEffect, useRef } from 'react';
import { X, Play, FileText, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const ResourcePlayer = ({ resource, moduleId, topicId, onClose, onComplete }) => {

    // Helper to extract YouTube ID
    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const [timeSpent, setTimeSpent] = useState(0);
    const [isCompleted, setIsCompleted] = useState(resource.completed);
    const [loading, setLoading] = useState(false);

    // Timer Ref
    const timerRef = useRef(null);
    const lastSyncTime = useRef(0);
    const startTime = useRef(Date.now());

    useEffect(() => {
        // Start Timer for Text resources or if it's just open
        // For Video, we might use onTimeUpdate, but a global timer is also good for total "open" time
        timerRef.current = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(timerRef.current);
            // Sync on close
            syncProgress(resource.completed); // use latest state if possible, but state inside cleanup is stale usually
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
                    timeSpent: delta
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
                    timeSpent: delta
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

    const isVideo = resource.type === 'video';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <div className="flex items-center gap-3">
                            {isVideo ? <Play className="text-purple-400" size={20} /> : <FileText className="text-blue-400" size={20} />}
                            <h2 className="font-bold text-lg text-white truncate max-w-lg">{resource.title}</h2>
                        </div>
                        <div className="flex items-center gap-4">
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
                        {isVideo ? (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                {resource.url.includes('youtube.com') || resource.url.includes('youtu.be') ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYouTubeId(resource.url)}?autoplay=1`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                    ></iframe>
                                ) : (
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
                            </div>
                        ) : (
                            <div className="w-full h-full bg-white flex flex-col">
                                {resource.url ? (
                                    <iframe
                                        src={resource.url}
                                        className="w-full h-full border-none"
                                        title="External Resource"
                                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    />
                                ) : (
                                    <div className="p-8 flex items-center justify-center h-full">
                                        <div className="max-w-2xl text-center">
                                            <h1 className="text-2xl font-bold mb-4">{resource.title}</h1>
                                            <p className="text-gray-700 whitespace-pre-wrap">{resource.content || "No content available."}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {isVideo ? 'Watch until the end to complete.' : 'Read the material and mark as complete.'}
                        </div>

                        {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-400 font-bold px-6 py-2 bg-green-900/20 rounded-lg border border-green-500/20">
                                <CheckCircle size={20} />
                                <span>Completed</span>
                            </div>
                        ) : (
                            !isVideo && (
                                <button
                                    onClick={handleManualComplete}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-lg transition"
                                >
                                    <CheckCircle size={20} />
                                    <span>Mark as Completed</span>
                                </button>
                            )
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ResourcePlayer;
