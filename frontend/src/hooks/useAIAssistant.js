import { useState } from 'react';
import api from '../api/axios';

/**
 * Custom React Hook for AI Learning Assistant
 * Provides access to all 6 AI tasks from the Master AI Prompt
 */
export const useAIAssistant = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ========================================================================
    // TASK 1: Resource Recommendation
    // ========================================================================
    const getRecommendations = async (weakTopics = []) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai-assistant/recommend-resources', {
                weak_topics: weakTopics
            });
            return res.data;
        } catch (err) {
            console.error('AI recommendation failed:', err);
            setError('Failed to get recommendations');
            return { recommended_resources: [] };
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // TASK 2: Quiz Generation
    // ========================================================================
    const generateQuiz = async (resource, progressPercentage = 0) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai-assistant/generate-quiz', {
                resource,
                progressPercentage
            });
            return res.data;
        } catch (err) {
            console.error('Quiz generation failed:', err);
            setError('Failed to generate quiz');
            return { quiz: { quiz_id: null, questions: [] } };
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // TASK 3: Strength Evaluation
    // ========================================================================
    const evaluateStrength = async (quizResponses) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai-assistant/evaluate-strength', {
                quizResponses
            });
            return res.data;
        } catch (err) {
            console.error('Strength evaluation failed:', err);
            setError('Failed to evaluate strength');
            return { overall_score: 0, strength_analysis: [] };
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // TASK 4: Adaptive Learning Path
    // ========================================================================
    const adaptLearningPath = async (strengthAnalysis) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai-assistant/adapt-learning-path', {
                strengthAnalysis
            });
            return res.data;
        } catch (err) {
            console.error('Adaptive learning failed:', err);
            setError('Failed to adapt learning path');
            return { learning_action: { next_step: 'continue_current_path', reason: 'Error occurred' } };
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // TASK 5: Event Tracking
    // ========================================================================
    const trackEvent = async (resourceId, eventType) => {
        try {
            const res = await api.post('/ai-assistant/track-event', {
                resourceId,
                eventType
            });
            return res.data;
        } catch (err) {
            console.error('Event tracking failed:', err);
            return null;
        }
    };

    // ========================================================================
    // TASK 6: Teacher Insights
    // ========================================================================
    const getTeacherInsights = async (studentId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/ai-assistant/teacher-insights/${studentId}`);
            return res.data;
        } catch (err) {
            console.error('Teacher insights failed:', err);
            setError('Failed to get teacher insights');
            return { teacher_insight: {} };
        } finally {
            setLoading(false);
        }
    };

    return {
        // Functions
        getRecommendations,
        generateQuiz,
        evaluateStrength,
        adaptLearningPath,
        trackEvent,
        getTeacherInsights,

        // State
        loading,
        error
    };
};

export default useAIAssistant;
