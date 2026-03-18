// ─── Quiz Result Storage ──────────────────────────────────────────────────────
// Saves quiz results to localStorage as primary store (works without backend)
// and also POSTs to API when available.
// Both QuizModal and StudentAnalytics use this module.

const STORAGE_KEY = 'sb_quiz_results';

export const saveQuizResult = async (result) => {
    // 1. Always save to localStorage immediately
    try {
        const existing = getLocalResults();
        const updated = [result, ...existing].slice(0, 200); // keep last 200
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn('localStorage save failed', e);
    }

    // 2. Also try to save to backend (non-blocking)
    try {
        const api = (await import('../api/axios')).default;
        await api.post('/courses/save-quiz-result', result);
    } catch {
        // Backend not ready — localStorage already has it, that's fine
    }
};

export const getLocalResults = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const getAllResults = async () => {
    // Try backend first, fall back to localStorage
    try {
        const api = (await import('../api/axios')).default;
        const res = await api.get('/courses/quiz-results');
        const backendResults = res.data.results || [];
        if (backendResults.length > 0) return backendResults;
    } catch { }
    return getLocalResults();
};

export const clearResults = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { }
};