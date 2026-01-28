import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Book, CheckCircle, Circle, MessageSquare, Loader } from 'lucide-react';
import api from '../api/axios';
import ResourcePlayer from '../components/ResourcePlayer';

const CourseView = () => {
    const { moduleId, topicId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [topic, setTopic] = useState(null);

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const res = await api.get(`/courses/module/${moduleId}/topic/${topicId}`);
                setTopic(res.data.topic);
            } catch (error) {
                console.error("Failed to fetch topic", error);
            } finally {
                setLoading(false);
            }
        };
        if (moduleId && topicId) fetchTopic();
    }, [moduleId, topicId]);


    const [selectedResource, setSelectedResource] = useState(null);

    const openResource = (resource) => {
        setSelectedResource(resource);
    };

    const handleResourceComplete = (resourceId) => {
        // Optimistic update
        const updatedResources = topic.resources.map(r =>
            (r._id === resourceId || r.id === resourceId) ? { ...r, completed: true } : r
        );
        setTopic({ ...topic, resources: updatedResources });
    };


    const [quizOpen, setQuizOpen] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizLoading, setQuizLoading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);

    const startQuiz = async () => {
        setQuizLoading(true);
        setQuizOpen(true);
        setQuizCompleted(false);
        setScore(0);
        setCurrentQuestion(0);

        try {
            const res = await api.post('/ai-assistant/generate-topic-quiz', {
                topicTitle: topic.title,
                topicContent: topic.content,
                difficulty: 'Intermediate'
            });
            setQuizQuestions(res.data.questions);
        } catch (error) {
            console.error("Failed to generate quiz");
            setQuizOpen(false); // Close if fails
        } finally {
            setQuizLoading(false);
        }
    };

    const handleAnswer = (option) => {
        if (option === quizQuestions[currentQuestion].correctAnswer) {
            setScore(prev => prev + 1);
        }

        if (currentQuestion + 1 < quizQuestions.length) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            setQuizCompleted(true);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
    );

    if (!topic) return <div className="text-white text-center mt-20">Topic not found</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Header */}
            <div className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-800 rounded-lg transition">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{topic.title}</h1>
                        <p className="text-sm text-gray-400">{topic.description}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/doubts')} className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition border border-gray-700">
                        <MessageSquare className="w-4 h-4" />
                        <span>Ask Doubt</span>
                    </button>
                </div>
            </div>

            <div className={`flex-1 p-8 max-w-5xl mx-auto w-full transition ${quizOpen ? 'blur-sm pointer-events-none' : ''}`}>

                {/* AI Detailed Guide */}
                {topic.content && (
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 mb-8 shadow-xl">
                        <div className="flex items-center mb-6">
                            <Book className="w-6 h-6 text-purple-400 mr-3" />
                            <h2 className="text-2xl font-bold text-white">Topic Guide</h2>
                        </div>
                        <div className="prose prose-invert max-w-none prose-purple">
                            {topic.content.split('\\n').map((line, i) => (
                                <p key={i} className="mb-4 text-gray-300 leading-relaxed">
                                    {line.replace(/###/g, '').replace(/\*\*/g, '')}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resources List */}
                <h2 className="text-2xl font-bold mb-6">Learning Resources</h2>
                <div className="grid gap-4">
                    {topic.resources?.map((resource, idx) => (
                        <div
                            key={idx}
                            onClick={() => openResource(resource)}
                            className={`bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center transition hover:border-purple-500/50 cursor-pointer hover:bg-gray-800/80 ${resource.completed ? 'opacity-75' : ''}`}
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-lg ${resource.type === 'video' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {resource.type === 'video' ? <Play className="w-6 h-6" /> : <Book className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{resource.title}</h3>
                                    <span className="text-xs text-gray-500 mt-1 block capitalize">{resource.type} • {resource.duration || '5 mins'}</span>
                                </div>
                            </div>

                            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${resource.completed ? 'text-green-400' : 'text-gray-400'}`}>
                                {resource.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                <span className="text-sm font-medium">{resource.completed ? 'Completed' : 'Start'}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {topic.resources?.length === 0 && (
                    <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                        <p className="text-gray-400">AI is curating resources for this topic...</p>
                    </div>
                )}

                {/* Practice Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Practice & Assessment</h2>
                    <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-8 rounded-2xl border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-2">Ready to test your knowledge?</h3>
                        <p className="text-gray-300 mb-6">Take a quick quiz to verify your understanding of {topic.title}.</p>
                        <button
                            onClick={startQuiz}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-purple-900/40"
                        >
                            Start Quiz
                        </button>
                    </div>
                </div>
            </div>

            {/* Resource Player Modal */}
            {selectedResource && (
                <ResourcePlayer
                    resource={selectedResource}
                    moduleId={moduleId}
                    topicId={topicId}
                    onClose={() => setSelectedResource(null)}
                    onComplete={handleResourceComplete}
                />
            )}

            {/* Quiz Modal Overlay */}
            {quizOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden relative">
                        <button
                            onClick={() => setQuizOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        {quizLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-white">Generating Quiz...</h3>
                                <p className="text-gray-400 mt-2">AI is crafting questions based on this topic.</p>
                            </div>
                        ) : quizCompleted ? (
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={40} />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
                                <p className="text-gray-300 text-lg mb-8">You scored <span className="text-purple-400 font-bold">{score}</span> out of {quizQuestions.length}</p>
                                <button
                                    onClick={() => setQuizOpen(false)}
                                    className="bg-white text-black font-bold py-3 px-8 rounded-xl hover:bg-gray-200 transition"
                                >
                                    Close & Continue Learning
                                </button>
                            </div>
                        ) : (
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-sm font-bold text-purple-400 tracking-wider uppercase">Question {currentQuestion + 1}/{quizQuestions.length}</span>
                                    <span className="text-sm text-gray-500">Topic Quiz</span>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-8 leading-snug">
                                    {quizQuestions[currentQuestion].question}
                                </h3>

                                <div className="space-y-3">
                                    {quizQuestions[currentQuestion].options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(option)}
                                            className="w-full text-left p-4 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all group flex items-center"
                                        >
                                            <span className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500 transition-colors mr-4">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-gray-300 group-hover:text-white text-lg">{option}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export default CourseView;
