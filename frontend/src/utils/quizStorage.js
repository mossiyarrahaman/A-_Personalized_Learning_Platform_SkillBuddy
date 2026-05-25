// ─── Quiz Result Storage ──────────────────────────────────────────────────────
// Pure localStorage — no dynamic imports, no backend dependency.
// Works 100% offline. Backend save is attempted separately from QuizModal.

import api from '../api/axios';

// Decode JWT from localStorage to get the current user's ID for key namespacing
const getUserId = () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return 'anon';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload._id || 'anon';
    } catch { return 'anon'; }
};
const KEY = () => `sb_quiz_results_${getUserId()}`;

// Save one result to localStorage, then attempt backend sync.
// If the backend POST fails, the record is marked syncFailed: true so
// syncPendingResults() can retry it on the next page load.
export const saveQuizResult = (result) => {
    // 1. localStorage — always works, synchronous
    try {
        const prev = getLocalResults();
        const next = [{ ...result, savedAt: new Date().toISOString() }, ...prev].slice(0, 500);
        localStorage.setItem(KEY(), JSON.stringify(next));
        console.log('[QuizStorage] Saved locally:', result.topicTitle, result.pct + '%');
    } catch (e) {
        console.warn('[QuizStorage] localStorage error:', e);
    }

    // 2. Backend — mark syncFailed if this attempt fails, retried on next load
    api.post('/courses/save-quiz-result', result).catch((err) => {
        console.warn('[QuizStorage] Backend save failed, will retry on next load:', err?.message);
        try {
            const prev = getLocalResults();
            const updated = prev.map(r =>
                r.topicTitle === result.topicTitle && r.savedAt === result.savedAt
                    ? { ...r, syncFailed: true }
                    : r
            );
            localStorage.setItem(KEY(), JSON.stringify(updated));
        } catch { /* localStorage unavailable — nothing to do */ }
    });
};

// Retry any records that previously failed to reach the backend.
// Call on analytics page mount so failed results eventually sync.
export const syncPendingResults = async () => {
    let results;
    try { results = getLocalResults(); } catch { return; }
    const pending = results.filter(r => r.syncFailed);
    if (pending.length === 0) return;

    for (const r of pending) {
        try {
            await api.post('/courses/save-quiz-result', r);
            // Clear the syncFailed flag on success
            const current = getLocalResults();
            localStorage.setItem(KEY(), JSON.stringify(
                current.map(x =>
                    x.topicTitle === r.topicTitle && x.savedAt === r.savedAt
                        ? { ...x, syncFailed: false }
                        : x
                )
            ));
        } catch { /* still failing — leave as syncFailed, try next load */ }
    }
};

// Read all results from localStorage
export const getLocalResults = () => {
    try {
        const raw = localStorage.getItem(KEY());
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

// Clear all results (for testing)
export const clearResults = () => {
    try { localStorage.removeItem(KEY()); } catch { }
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
            syncFailed: r.syncFailed || false,
        })));
        return results;
    };
}
