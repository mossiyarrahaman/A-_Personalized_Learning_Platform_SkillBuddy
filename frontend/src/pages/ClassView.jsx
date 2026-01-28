
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, CheckCircle, Circle, Play, FileText, Download, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ResourcePlayer from '../components/ResourcePlayer';
import QuizGenerationModal from '../components/QuizGenerationModal';

const ClassView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedModule, setExpandedModule] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizTarget, setQuizTarget] = useState(null); // { moduleId, topicId, topicTitle }


    useEffect(() => {
        fetchClassDetails();
    }, [courseId]);

    const fetchClassDetails = async () => {
        try {
            // We can reuse getEnrolledClasses and filter on client, or make a new endpoint. 
            // Better: reuse getEnrolledClasses returns all, finding one is cheap if list is small.
            // Ideally: api.get(`/courses/${courseId}`)

            const res = await api.get('/courses/student/enrolled-classes');
            const foundClass = res.data.classes.find(c => c._id === courseId || c.id === courseId);

            if (foundClass) {
                setCourse(foundClass);
                setProgress(foundClass.studentProgress);
                if (foundClass.modules.length > 0) setExpandedModule(foundClass.modules[0]._id);
            }
        } catch (error) {
            console.error("Failed to load class", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = async (topicId) => {
        // Toggle status locally first
        const isCompleted = progress.completedTopics.includes(topicId);
        const newCompletedTopics = isCompleted
            ? progress.completedTopics.filter(id => id !== topicId)
            : [...progress.completedTopics, topicId];

        setProgress({ ...progress, completedTopics: newCompletedTopics });

        try {
            await api.post('/courses/class-progress', { courseId, topicId, completed: !isCompleted });
        } catch (error) {
            console.error("Failed to sync progress", error);
            // Revert on error?
        }
    };

    const openResource = (resource, moduleId, topicId) => {
        setSelectedResource({ resource, moduleId, topicId });
    };

    const openQuiz = (moduleId, topic) => {
        setQuizTarget({ moduleId, topicId: topic._id || topic.id, topicTitle: topic.title });
        setQuizModalOpen(true);
    };

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Class...</div>;
    if (!course) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Class not found</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            {/* Header */}
            <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-6 sticky top-0 z-50 transition-all">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <button onClick={() => navigate('/my-courses')} className="p-2 hover:bg-gray-800 rounded-lg transition">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{course.title}</h1>
                        <p className="text-sm text-gray-400">{course.modules.reduce((acc, m) => acc + m.topics.length, 0)} Topics • {course.level}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6">
                <div className="grid grid-cols-1 gap-6">
                    {course.modules.map((module, index) => (
                        <div key={module._id || index} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                            <button
                                onClick={() => setExpandedModule(expandedModule === module._id ? null : module._id)}
                                className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-750 transition"
                            >
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{module.title}</h3>
                                    <p className="text-sm text-gray-400">{module.description}</p>
                                </div>
                                <div className={`transform transition-transform ${expandedModule === module._id ? 'rotate-180' : ''}`}>
                                    <ChevronLeft className="-rotate-90" />
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedModule === module._id && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 pt-0 border-t border-gray-700 bg-gray-900/30">
                                            <div className="space-y-4 pt-4">
                                                {module.topics.map((topic) => {
                                                    const isDone = progress?.completedTopics?.includes(topic._id);
                                                    return (
                                                        <div key={topic._id} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-gray-700">
                                                            <button
                                                                onClick={() => toggleTopic(topic._id)}
                                                                className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 text-transparent hover:border-purple-400'}`}
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <div className="flex-1">
                                                                <h4 className={`text-lg font-medium mb-2 ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>{topic.title}</h4>
                                                                <p className="text-gray-400 text-sm mb-4">{topic.description}</p>

                                                                {/* Teacher Resources */}
                                                                {topic.resources && topic.resources.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {topic.resources.map((res, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => openResource(res, module._id, topic._id)}
                                                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-bold text-blue-400 border border-gray-700 hover:border-blue-500 transition hover:bg-white/5"
                                                                            >
                                                                                {res.type === 'video' ? <Play size={12} /> : <FileText size={12} />}
                                                                                {res.title}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <button
                                                                    onClick={() => openQuiz(module._id, topic)}
                                                                    className="mt-3 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition font-medium"
                                                                >
                                                                    <Brain size={16} />
                                                                    generate quiz with AI
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </main>

            {/* Resource Player Modal */}
            {selectedResource && (
                <ResourcePlayer
                    resource={selectedResource.resource}
                    moduleId={selectedResource.moduleId}
                    topicId={selectedResource.topicId}
                    onClose={() => setSelectedResource(null)}
                    onComplete={() => {
                        // Optional: Auto-mark topic as complete or update UI to show resource completed
                        // For now we just sync time.
                    }}
                />
            )}

            <QuizGenerationModal
                isOpen={quizModalOpen}
                onClose={() => setQuizModalOpen(false)}
                courseId={courseId}
                moduleId={quizTarget?.moduleId}
                topicId={quizTarget?.topicId}
                topicTitle={quizTarget?.topicTitle}
            />
        </div>
    );
};

export default ClassView;
