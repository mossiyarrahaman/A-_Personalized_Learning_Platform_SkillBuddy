export const TIER_CONFIG = {
    beginner: {
        label: 'Beginner',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.1)',
        border: 'rgba(52,211,153,0.25)',
        bloomLevels: ['remember', 'understand'],
        bloomLabel: 'Remember · Understand',
    },
    intermediate: {
        label: 'Intermediate',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.1)',
        border: 'rgba(251,191,36,0.25)',
        bloomLevels: ['apply', 'analyze'],
        bloomLabel: 'Apply · Analyze',
    },
    advanced: {
        label: 'Advanced',
        color: '#f43f5e',
        bg: 'rgba(244,63,94,0.1)',
        border: 'rgba(244,63,94,0.25)',
        bloomLevels: ['evaluate', 'create'],
        bloomLabel: 'Evaluate · Create',
    },
};

export const TIERS = ['beginner', 'intermediate', 'advanced'];

export const TIER_DEFAULT_BLOOM = {
    beginner: 'remember',
    intermediate: 'apply',
    advanced: 'evaluate',
};

/**
 * Given a student's topicQuizScores array for ONE specific topic,
 * compute unlock status for each of the 3 tiers.
 * Beginner is always unlocked.
 * Intermediate unlocks when beginner best score >= 80.
 * Advanced unlocks when intermediate best score >= 80.
 */
export function computeTierUnlocks(topicQuizScores = []) {
    const best = { beginner: null, intermediate: null, advanced: null };

    for (const s of topicQuizScores) {
        if (!s.difficultyTier || !s.isTeacherAssessment) continue;
        const tier = s.difficultyTier;
        if (best[tier] === null || s.score > best[tier]) {
            best[tier] = s.score;
        }
    }

    return {
        beginner: {
            unlocked: true,
            bestScore: best.beginner,
            passed: (best.beginner ?? 0) >= 80,
        },
        intermediate: {
            unlocked: (best.beginner ?? 0) >= 80,
            bestScore: best.intermediate,
            passed: (best.intermediate ?? 0) >= 80,
        },
        advanced: {
            unlocked: (best.intermediate ?? 0) >= 80,
            bestScore: best.advanced,
            passed: (best.advanced ?? 0) >= 80,
        },
    };
}

export function getTierStatus(tierUnlock) {
    if (tierUnlock.passed) return 'passed';
    if (tierUnlock.bestScore !== null) return 'attempted';
    if (tierUnlock.unlocked) return 'unlocked';
    return 'locked';
}
