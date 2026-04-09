// ─── Quiz Result Storage ──────────────────────────────────────────────────────
// Pure localStorage — no dynamic imports, no backend dependency.
// Works 100% offline. Backend save is attempted separately from QuizModal.

import api from '../api/axios';

const KEY = 'sb_quiz_results';

// Save one result to localStorage (and try backend)
export const saveQuizResult = (result) => {
    // 1. localStorage — always works, synchronous
    try {
        const prev = getLocalResults();
        const next = [{ ...result, savedAt: new Date().toISOString() }, ...prev].slice(0, 500);
        localStorage.setItem(KEY, JSON.stringify(next));
        console.log('[QuizStorage] Saved locally:', result.topicTitle, result.pct + '%');
    } catch (e) {
        console.warn('[QuizStorage] localStorage error:', e);
    }

    // 2. Backend — fire and forget, don't await
    api.post('/courses/save-quiz-result', result).catch(() => {
        // Backend endpoint not set up yet — that's fine, localStorage has it
    });
};

// Read all results from localStorage
export const getLocalResults = () => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

// Clear all results (for testing)
export const clearResults = () => {
    try { localStorage.removeItem(KEY); } catch { }
};

// Debug helper — call from browser console: window.debugQuiz()
if (typeof window !== 'undefined') {
    window.debugQuiz = () => {
        const results = getLocalResults();
        console.table(results.map(r => ({
            topic: r.topicTitle,
            score: r.pct + '%',
            correct: `${r.score}/${r.total}`,
            difficulty: r.difficulty,
            mistakes: r.mistakes?.length || 0,
            when: r.completedAt,
        })));
        return results;
    };
}