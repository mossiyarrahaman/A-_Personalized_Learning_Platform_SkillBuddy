import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, CheckCircle, XCircle, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const BLOOMS_LEVELS = [
    { id: 'remember', label: 'Remembering', description: 'Recall facts and basic concepts' },
    { id: 'understand', label: 'Understanding', description: 'Explain ideas or concepts' },
    { id: 'apply', label: 'Applying', description: 'Use information in new situations' },
    { id: 'analyze', label: 'Analyzing', description: 'Draw connections among ideas' },
    { id: 'evaluate', label: 'Evaluating', description: 'Justify a stand or decision' },
    { id: 'create', label: 'Creating', description: 'Produce new or original work' }
];

const QuizGenerationModal = ({ isOpen, onClose, courseId, moduleId, topicId, topicTitle }) => {
    const [step, setStep] = useState('setup'); // setup, loading, quiz, result
    const [bloomLevel, setBloomLevel] = useState('understand');
    const [quizData, setQuizData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswerChecking, setIsAnswerChecking] = useState(false); // To show immediate feedback state
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    const generateQuiz = async () => {
        setStep('loading');
        try {
            const res = await api.post('/assessments/generate-from-context', {
                courseId,
                moduleId,
                topicId,
                bloomLevel
            });

            if (res.data && res.data.quiz && res.data.quiz.questions.length > 0) {
                setQuizData(res.data.quiz);
                setStep('quiz');
                setCurrentQuestionIndex(0);
                setScore(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
            } else {
                alert("AI could not generate questions from the available resources.");
                setStep('setup');
            }
        } catch (error) {
            console.error("Failed to generate quiz", error);
            alert("Failed to generate quiz. Please try again.");
            setStep('setup');
        }
    };

    const handleAnswerSelect = (option) => {
        if (showExplanation) return; // Prevent changing after answer
        setSelectedAnswer(option);
    };

    const checkAnswer = () => {
        const currentQuestion = quizData.questions[currentQuestionIndex];
        const isCorrect = selectedAnswer === currentQuestion.correct_answer;

        if (isCorrect) setScore(score + 1);
        setShowExplanation(true);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < quizData.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
        } else {
            setStep('result');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Brain className="text-purple-500" />
                            {step === 'setup' ? 'Generate Custom Quiz' : `Quiz: ${topicTitle}`}
                        </h2>
                        {step === 'quiz' && (
                            <p className="text-sm text-gray-400 mt-1">
                                Question {currentQuestionIndex + 1} of {quizData.questions.length} • {bloomLevel.charAt(0).toUpperCase() + bloomLevel.slice(1)} Level
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* STEP 1: SETUP */}
                    {step === 'setup' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-200">
                                <p className="text-sm">
                                    Create a personalized quiz based on the resources in this topic.
                                    Select a difficulty level based on Bloom's Taxonomy.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider">Select Complexity Level</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {BLOOMS_LEVELS.map((level) => (
                                        <button
                                            key={level.id}
                                            onClick={() => setBloomLevel(level.id)}
                                            className={`p-4 rounded-xl border text-left transition-all ${bloomLevel === level.id
                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                                                }`}
                                        >
                                            <div className="font-bold mb-1">{level.label}</div>
                                            <div className="text-xs opacity-70">{level.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={generateQuiz}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                            >
                                <Brain size={20} />
                                Generate AI Quiz
                            </button>
                        </div>
                    )}

                    {/* STEP 2: LOADING */}
                    {step === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-bold text-white mb-2">Analyzing Resources...</h3>
                            <p className="text-gray-400 max-w-xs mx-auto">
                                Our AI is reading the topic materials and crafting questions at the <span className="text-purple-400 font-bold">{bloomLevel}</span> level.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: QUIZ */}
                    {step === 'quiz' && quizData && (
                        <div className="space-y-6">
                            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 min-h-[150px] flex items-center justify-center text-center">
                                <h3 className="text-xl font-medium text-white leading-relaxed">
                                    {quizData.questions[currentQuestionIndex].question}
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {quizData.questions[currentQuestionIndex].options.map((option, idx) => {
                                    const currentQ = quizData.questions[currentQuestionIndex];
                                    const isSelected = selectedAnswer === option;
                                    const isCorrect = option === currentQ.correct_answer;

                                    let buttonStyle = "bg-gray-800 border-gray-700 hover:bg-gray-750";
                                    if (showExplanation) {
                                        if (isCorrect) buttonStyle = "bg-green-500/20 border-green-500 text-green-200";
                                        else if (isSelected && !isCorrect) buttonStyle = "bg-red-500/20 border-red-500 text-red-200";
                                        else buttonStyle = "bg-gray-800 border-gray-700 opacity-50";
                                    } else if (isSelected) {
                                        buttonStyle = "bg-blue-600 border-blue-500 text-white";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(option)}
                                            disabled={showExplanation}
                                            className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${buttonStyle}`}
                                        >
                                            <span className="font-medium">{option}</span>
                                            {showExplanation && isCorrect && <CheckCircle size={20} className="text-green-500" />}
                                            {showExplanation && isSelected && !isCorrect && <XCircle size={20} className="text-red-500" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation Section */}
                            <AnimatePresence>
                                {showExplanation && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl"
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="font-bold text-blue-100 mb-1">Explanation</h4>
                                                <p className="text-sm text-blue-200 leading-relaxed">
                                                    {quizData.questions[currentQuestionIndex].explanation}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* STEP 4: RESULT */}
                    {step === 'result' && (
                        <div className="text-center py-8 space-y-6">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 shadow-xl shadow-green-900/20 mb-2">
                                <span className="text-4xl font-bold text-white">{Math.round((score / quizData.questions.length) * 100)}%</span>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h3>
                                <p className="text-gray-400">
                                    You accepted the challenge at the <span className="text-white font-bold">{bloomLevel}</span> level.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Correct</div>
                                    <div className="text-2xl font-bold text-green-400">{score}</div>
                                </div>
                                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Total Questions</div>
                                    <div className="text-2xl font-bold text-white">{quizData.questions.length}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('setup')}
                                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition flex items-center gap-2 mx-auto"
                            >
                                <RefreshCw size={18} />
                                Try Another Level
                            </button>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                {step === 'quiz' && (
                    <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
                        {!showExplanation ? (
                            <button
                                onClick={checkAnswer}
                                disabled={!selectedAnswer}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition"
                            >
                                Check Answer
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition flex items-center gap-2"
                            >
                                {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default QuizGenerationModal;
