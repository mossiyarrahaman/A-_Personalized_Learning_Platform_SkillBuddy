'use strict';

/**
 * detectTutorMode — choose a conversation mode based on the current message and history.
 *
 * Rules applied in order (first match wins):
 *
 * RULE 1 — DROP_SOCRATIC (explicit frustration signals)
 *   Current message contains explicit frustration phrases ("just tell me", "i don't get",
 *   "i'm confused", "this is hard", etc.) OR direct answer-demand phrases ("just answer",
 *   "give me the answer", "tell me the answer", "answer me", etc.) OR meta-statements
 *   about the Socratic flow ("stop asking", "no more questions", "had enough", etc.),
 *   OR the same question has appeared in the last 3 user messages (≥40% overlap on novel
 *   content words — after stripping stopwords, short words, and topic vocabulary already
 *   active in recent messages).
 *
 * RULE 1B — DROP_SOCRATIC (engaged-but-done soft heuristic)
 *   Student has been giving substantive answers (≥50 chars, no trailing ?, no question-word
 *   opener) for the last 4 turns AND the current message is a short (<60 chars) imperative
 *   containing "just"/"tell"/"answer"/"give"/"explain it"/"show me". Fires after RULE 1's
 *   explicit phrases so high-confidence phrase matches win.
 *
 * RULE 2 — PUSH (breezing signals)
 *   The current message is forward-looking ("what if", "when would", etc.) AND either:
 *   (a) prior two user messages were short/affirming, OR
 *   (b) the current message itself starts with an affirming word and asks a probing question
 *       (handles opening-turn "yeah, I think I get this — when would I NOT…" pattern).
 *
 * RULE 3 — ASK_FIRST (bare question, no attempt shown)
 *   Short question (<100 chars) that ends in ? or starts with a question word,
 *   with no attempt-words or code content.
 *
 * RULE 4 — SOCRATIC (default)
 *   Everything else — the student has shown effort/reasoning.
 *
 * @param {{ currentUserMessage: string, recentMessages: Array<{role: string, content: string}> }} opts
 * @returns {'socratic'|'ask_first'|'drop_socratic'|'push'}
 */
function detectTutorMode({ currentUserMessage, recentMessages }) {
    const raw = currentUserMessage || '';
    const msg = raw.toLowerCase();
    const userMessages = (recentMessages || [])
        .filter(m => m.role === 'user')
        .map(m => m.content.toLowerCase());

    // ── RULE 1: DROP_SOCRATIC ──────────────────────────────────────────────────
    const frustrationPhrases = [
        // Existing — confusion / emotional signals
        'just tell me', 'just give me', 'just explain',
        "i don't get", "i don't understand",
        "i'm confused", "i'm lost",
        'this is confusing', 'this is hard',
        'explain it', 'can you explain',
        // Group A — direct answer demands
        'just answer', 'give me the answer', 'give the answer',
        'just give', 'answer me', 'answer the question', 'tell me the answer',
        // Group B — meta-statements about the Socratic flow
        'stop asking', 'no more questions', 'enough questions',
        'had enough', 'too many questions', 'stop with the questions',
    ];
    if (frustrationPhrases.some(p => msg.includes(p))) return 'drop_socratic';

    // Repeated question: same non-topic words appearing in the last 3 user messages.
    // Filter 1 — English stopwords. Filter 2 — words shorter than 4 chars.
    // Filter 3 — words already active in recent prior messages (topic vocabulary that
    // repeats naturally; only truly novel words indicate the student is stuck).
    const STOPWORDS = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'can', 'could', 'may', 'might', 'must',
        'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'by', 'at',
        'from', 'as', 'and', 'or', 'but', 'if', 'then', 'so', 'this',
        'that', 'these', 'those', 'it', 'its', 'them', 'they', 'their',
        'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'she',
        'him', 'her', 'his', 'hers',
    ]);
    const recent3 = userMessages.slice(-3);
    if (recent3.length >= 2) {
        const allCurrentWords = msg.split(/\s+/)
            .map(w => w.replace(/[^a-z0-9-]/g, ''))
            .filter(w => w.length >= 4 && !STOPWORDS.has(w));
        const topicWordSet = new Set(
            allCurrentWords.filter(w => recent3.some(prev => prev.includes(w)))
        );
        const words = allCurrentWords.filter(w => !topicWordSet.has(w));
        if (words.length > 0) {
            const repeats = recent3.filter(prev => {
                const shared = words.filter(w => prev.includes(w));
                return shared.length >= 2 && shared.length >= words.length * 0.4;
            });
            if (repeats.length >= 1) return 'drop_socratic';
        }
    }

    // ── RULE 1B: DROP_SOCRATIC (engaged-but-done) ─────────────────────────────
    // Student has been doing real Socratic work and signals they've earned the answer.
    const questionStarters = /^(what|how|why|when|can|does|is)\b/;
    if (userMessages.length >= 4 && raw.trim().length < 60) {
        const last4 = userMessages.slice(-4);
        const allSubstantive = last4.every(
            prev => prev.length >= 50 && !prev.trim().endsWith('?') && !questionStarters.test(prev.trim()),
        );
        const hasImperative =
            msg.includes('just') || msg.includes('tell') || msg.includes('answer') ||
            msg.includes('give') || msg.includes('explain it') || msg.includes('show me');
        if (allSubstantive && hasImperative) return 'drop_socratic';
    }

    // ── RULE 2: PUSH ──────────────────────────────────────────────────────────
    const affirmingWords = ['yeah', 'right', 'got it', 'makes sense', 'yes', 'ok', 'okay', 'yep', 'yup'];
    const forwardPhrases = [
        'so what about', 'what if', 'is this like', 'does this also',
        'what about when', 'so now', 'when would', 'when should',
        "why wouldn't", 'why not use', 'what happens when', 'what about',
    ];

    const currentForward = forwardPhrases.some(p => msg.includes(p));
    const startsAffirming = affirmingWords.some(a => msg.startsWith(a));
    const isProbing = msg.includes('?') && /\b(when|why|what|how|where)\b/.test(msg);
    // Self-push: opening message that already shows confident-then-probing pattern
    const selfPush = startsAffirming && isProbing;

    const lastTwoUser = userMessages.slice(-2);
    const priorWasEasyOrAffirming = lastTwoUser.length === 0
        ? selfPush   // new session — rely on self-push signal
        : lastTwoUser.every(prev => {
            const isShort = prev.length < 50;
            const isAffirming = affirmingWords.some(a => prev.includes(a));
            return isShort || isAffirming;
        });

    if ((currentForward || selfPush) && priorWasEasyOrAffirming) return 'push';

    // ── RULE 3: ASK_FIRST ─────────────────────────────────────────────────────
    const attemptPhrases = ["i tried", "i think", "is it because", "my guess", "i wrote", "i believe", "i thought"];
    const hasCodeContent = /[`{};=><()[\]]/.test(raw);
    const looksLikeQuestion =
        msg.trim().endsWith('?') ||
        /^(what|how|why|when|can|could|would|does|do|is|are)\b/.test(msg.trim());
    const isShortMsg = raw.trim().length < 100;
    const hasAttempt = attemptPhrases.some(a => msg.includes(a)) || hasCodeContent;

    if (looksLikeQuestion && isShortMsg && !hasAttempt) return 'ask_first';

    // ── RULE 4: SOCRATIC (default) ────────────────────────────────────────────
    return 'socratic';
}

module.exports = { detectTutorMode };
