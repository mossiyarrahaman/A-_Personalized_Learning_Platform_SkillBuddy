'use strict';

const TutorSession = require('../models/TutorSession');
const { callOpenRouter } = require('../services/ai-service');
const {
    TUTOR_PERSONA_SYSTEM,
    GOAL_ID_SYSTEM,
    TUTOR_SUMMARY_SYSTEM,
    TUTOR_WRAPUP_SYSTEM,
    buildTutorTurnPrompt,
    buildGoalIdentificationPrompt,
} = require('../prompts/tutorPersona');
const { detectTutorMode } = require('../utils/tutorModeDetector');
const { assembleTutorContext } = require('../services/tutorContextService');

const TUTOR_MODEL = 'anthropic/claude-haiku-4-5';

// ── createSession ─────────────────────────────────────────────────────────────

exports.createSession = async (req, res) => {
    try {
        const { moduleId, topicId, topicTitle, courseId = null, pathId = null, openingMessage } = req.body;

        if (!moduleId || !topicId || !topicTitle) {
            return res.status(400).json({ error: 'moduleId, topicId, and topicTitle are required.' });
        }
        const trimmed = (openingMessage || '').trim();
        if (!trimmed) {
            return res.status(400).json({ error: 'openingMessage is required.' });
        }
        if (trimmed.length > 4000) {
            return res.status(400).json({ error: 'openingMessage must be 4000 characters or fewer.' });
        }

        const existing = await TutorSession.findOne({
            studentId: req.user.id,
            topicId,
            status: 'active',
        }).select('_id').lean();

        if (existing) {
            return res.status(409).json({
                error: 'A session is already active for this topic.',
                existingSessionId: existing._id,
            });
        }

        // Step 1: Goal identification (falls back gracefully on failure)
        let sessionGoal = `Build understanding of ${topicTitle}`;
        try {
            const goalRaw = await callOpenRouter(
                buildGoalIdentificationPrompt({ topicTitle, openingMessage: trimmed }),
                80,
                0.3,
                GOAL_ID_SYSTEM,
                TUTOR_MODEL,
            );
            const candidate = goalRaw.trim();
            if (candidate && candidate.length < 200) {
                sessionGoal = candidate;
            }
        } catch (goalErr) {
            console.warn('[Tutor] Goal identification failed, using fallback:', goalErr.message);
        }

        // Step 2: Generate first assistant response
        const detectedMode = detectTutorMode({ currentUserMessage: trimmed, recentMessages: [] });

        // Assemble per-student, per-topic context (non-fatal)
        let topicGuideExcerpt = null, ragChunks = [], quizMisses = [], ctxTokens = 0, courseContext = null;
        try {
            ({ topicGuideExcerpt, ragChunks, quizMisses, approxTokens: ctxTokens, courseContext } =
                await assembleTutorContext({
                    studentId: req.user.id,
                    topicId,
                    topicTitle,
                    courseId: courseId || null,
                    pathId:   pathId   || null,
                    moduleId,
                    currentUserMessage: trimmed,
                }));
        } catch (ctxErr) {
            console.error('[tutorController.createSession] Context assembly error:', ctxErr.message);
        }

        // Token budget: persona ~2200 + ctx + history ~200 + overhead ~200
        const totalEstimate = 2200 + ctxTokens + 400;
        if (totalEstimate > 4000) {
            if (quizMisses.length > 0) quizMisses = [];
            const recalc = 2200 + Math.ceil(
                ((topicGuideExcerpt?.length || 0) + ragChunks.reduce((s, c) => s + c.text.length, 0)) / 4
            ) + 400;
            if (recalc > 4000 && ragChunks.length > 3) ragChunks = ragChunks.slice(0, 3);
            const recalc2 = 2200 + Math.ceil((topicGuideExcerpt?.length || 0) / 4) + 400;
            if (recalc2 > 4000 && topicGuideExcerpt) {
                const words = topicGuideExcerpt.split(/\s+/);
                topicGuideExcerpt = words.length > 400 ? words.slice(0, 400).join(' ') + '...' : topicGuideExcerpt;
            }
            if (totalEstimate > 4000) {
                console.warn(`[Tutor] createSession prompt estimate ${totalEstimate} > 4000 — proceeding anyway`);
            }
        }

        const userPrompt = buildTutorTurnPrompt({
            topicTitle,
            sessionGoal,
            recentMessages: [],
            currentUserMessage: trimmed,
            detectedMode,
            topicGuideExcerpt,
            ragChunks,
            quizMisses,
            courseContext,
        });

        let assistantContent;
        try {
            assistantContent = await callOpenRouter(
                userPrompt,
                600,
                0.8,
                TUTOR_PERSONA_SYSTEM,
                TUTOR_MODEL,
            );
            assistantContent = assistantContent.trim();
        } catch (llmErr) {
            console.error('[tutorController.createSession] LLM call failed:', llmErr.message);
            return res.status(500).json({ error: 'Tutor is briefly unavailable. Please try again in a moment.' });
        }

        // Step 3: Persist session with both messages in one write
        const now = new Date();
        const session = await TutorSession.create({
            studentId: req.user.id,
            courseId:  courseId || null,
            pathId:    pathId   || null,
            moduleId,
            topicId,
            topicTitle,
            sessionGoal,
            messages: [
                { role: 'user',      content: trimmed,           createdAt: now },
                { role: 'assistant', content: assistantContent,  mode: detectedMode, createdAt: now },
            ],
        });

        const assistantMessage = session.messages[session.messages.length - 1];
        const approxTokens = Math.round((TUTOR_PERSONA_SYSTEM.length + userPrompt.length) / 4);
        console.log(`[Tutor] session=${session._id} mode=${detectedMode} ctx_tokens~${ctxTokens} rag=${ragChunks.length} misses=${quizMisses.length} guide=${topicGuideExcerpt ? 'y' : 'n'} tokens~${approxTokens}`);

        return res.status(201).json({
            success: true,
            session,
            assistantMessage: {
                _id:       assistantMessage._id,
                role:      'assistant',
                content:   assistantContent,
                mode:      detectedMode,
                createdAt: assistantMessage.createdAt,
            },
        });
    } catch (err) {
        console.error('[tutorController.createSession]', err);
        return res.status(500).json({ error: 'Failed to create tutor session.' });
    }
};

// ── getSession ────────────────────────────────────────────────────────────────

exports.getSession = async (req, res) => {
    try {
        const session = await TutorSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found.' });
        if (session.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

        return res.json({ success: true, session });
    } catch (err) {
        console.error('[tutorController.getSession]', err);
        return res.status(500).json({ error: 'Failed to fetch session.' });
    }
};

// ── appendMessage ─────────────────────────────────────────────────────────────

exports.appendMessage = async (req, res) => {
    try {
        const trimmed = (req.body.content || '').trim();
        if (!trimmed) return res.status(400).json({ error: 'content is required.' });
        if (trimmed.length > 4000) return res.status(400).json({ error: 'content must be 4000 characters or fewer.' });

        const session = await TutorSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found.' });
        if (session.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
        if (session.status === 'ended') return res.status(400).json({ error: 'This session has ended. Start a new one.' });

        // Capture context BEFORE pushing the new message
        const recentMessages = session.messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
        const detectedMode = detectTutorMode({ currentUserMessage: trimmed, recentMessages });

        // Assemble per-student, per-topic context (non-fatal)
        let topicGuideExcerpt = null, ragChunks = [], quizMisses = [], ctxTokens = 0, courseContext = null;
        try {
            ({ topicGuideExcerpt, ragChunks, quizMisses, approxTokens: ctxTokens, courseContext } =
                await assembleTutorContext({
                    studentId: req.user.id,
                    topicId:   session.topicId,
                    topicTitle: session.topicTitle,
                    courseId:  session.courseId  || null,
                    pathId:    session.pathId    || null,
                    moduleId:  session.moduleId,
                    currentUserMessage: trimmed,
                }));
        } catch (ctxErr) {
            console.error('[tutorController.appendMessage] Context assembly error:', ctxErr.message);
        }

        // Token budget: persona ~2200 + ctx + history ~200 + overhead ~200
        const totalEstimate = 2200 + ctxTokens + 400;
        if (totalEstimate > 4000) {
            if (quizMisses.length > 0) quizMisses = [];
            const recalc = 2200 + Math.ceil(
                ((topicGuideExcerpt?.length || 0) + ragChunks.reduce((s, c) => s + c.text.length, 0)) / 4
            ) + 400;
            if (recalc > 4000 && ragChunks.length > 3) ragChunks = ragChunks.slice(0, 3);
            const recalc2 = 2200 + Math.ceil((topicGuideExcerpt?.length || 0) / 4) + 400;
            if (recalc2 > 4000 && topicGuideExcerpt) {
                const words = topicGuideExcerpt.split(/\s+/);
                topicGuideExcerpt = words.length > 400 ? words.slice(0, 400).join(' ') + '...' : topicGuideExcerpt;
            }
            if (totalEstimate > 4000) {
                console.warn(`[Tutor] appendMessage prompt estimate ${totalEstimate} > 4000 — proceeding anyway`);
            }
        }

        const userPrompt = buildTutorTurnPrompt({
            topicTitle:          session.topicTitle,
            sessionGoal:         session.sessionGoal || `Build understanding of ${session.topicTitle}`,
            recentMessages,
            currentUserMessage:  trimmed,
            detectedMode,
            topicGuideExcerpt,
            ragChunks,
            quizMisses,
            courseContext,
        });

        // Push user message (not saved yet — rolls back if LLM fails)
        session.messages.push({ role: 'user', content: trimmed });
        const userMessage = session.messages[session.messages.length - 1];

        // LLM call
        let assistantContent;
        try {
            assistantContent = await callOpenRouter(
                userPrompt,
                600,
                0.8,
                TUTOR_PERSONA_SYSTEM,
                TUTOR_MODEL,
            );
            assistantContent = assistantContent.trim();
        } catch (llmErr) {
            console.error('[tutorController.appendMessage] LLM call failed:', llmErr.message);
            session.messages.pop(); // rollback — don't save
            return res.status(500).json({ error: 'Tutor is briefly unavailable. Please try again in a moment.' });
        }

        // Detect and strip [GOAL_MET] marker
        let goalMet = false;
        if (assistantContent.endsWith('[GOAL_MET]')) {
            goalMet = true;
            assistantContent = assistantContent.replace(/\[GOAL_MET\]\s*$/, '').trim();
        }

        // Push assistant message and persist both in one save
        const now = new Date();
        session.messages.push({ role: 'assistant', content: assistantContent, mode: detectedMode, createdAt: now });
        await session.save();

        const assistantMessage = session.messages[session.messages.length - 1];
        const approxTokens = Math.round((TUTOR_PERSONA_SYSTEM.length + userPrompt.length) / 4);
        console.log(`[Tutor] session=${session._id} mode=${detectedMode} ctx_tokens~${ctxTokens} rag=${ragChunks.length} misses=${quizMisses.length} guide=${topicGuideExcerpt ? 'y' : 'n'} tokens~${approxTokens}`);

        return res.json({
            success: true,
            userMessage,
            assistantMessage: {
                _id:       assistantMessage._id,
                role:      'assistant',
                content:   assistantContent,
                mode:      detectedMode,
                createdAt: assistantMessage.createdAt,
            },
            goalMet,
        });
    } catch (err) {
        console.error('[tutorController.appendMessage]', err);
        return res.status(500).json({ error: 'Failed to append message.' });
    }
};

// ── endSession ────────────────────────────────────────────────────────────────

exports.endSession = async (req, res) => {
    try {
        const session = await TutorSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found.' });
        if (session.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

        if (session.status === 'ended') {
            return res.json({ success: true, session });
        }

        // Generate summary if conversation has enough turns (threshold: 4+ messages = 2+ turns)
        if (session.messages.length >= 4) {
            try {
                const conversationLines = session.messages
                    .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
                    .join('\n');
                const summaryPrompt = `TOPIC: ${session.topicTitle}
SESSION GOAL: ${session.sessionGoal || `Build understanding of ${session.topicTitle}`}

CONVERSATION:
${conversationLines}

Generate the structured three-sentence summary.`;
                const rawSummary = await callOpenRouter(
                    summaryPrompt,
                    300,
                    0.4,
                    TUTOR_SUMMARY_SYSTEM,
                    TUTOR_MODEL,
                );
                session.summary = rawSummary.trim();
            } catch (summaryErr) {
                console.error('[tutorController.endSession] Summary generation failed:', summaryErr.message);
                // Non-fatal — proceed with null summary
            }
        }

        session.status  = 'ended';
        session.endedAt = new Date();
        await session.save();

        return res.json({ success: true, session });
    } catch (err) {
        console.error('[tutorController.endSession]', err);
        return res.status(500).json({ error: 'Failed to end session.' });
    }
};

// ── wrapUpExercise ────────────────────────────────────────────────────────────

exports.wrapUpExercise = async (req, res) => {
    try {
        const session = await TutorSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found.' });
        if (session.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
        if (session.status === 'ended') return res.status(400).json({ error: 'This session has ended.' });

        const { topicId, topicTitle, courseId, pathId, moduleId, sessionGoal, messages } = session;
        const recentMessages = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

        // Assemble context for grounding (non-fatal)
        let topicGuideExcerpt = null, courseContext = null;
        try {
            ({ topicGuideExcerpt, courseContext } = await assembleTutorContext({
                studentId:          req.user.id,
                topicId,
                topicTitle,
                courseId:           courseId || null,
                pathId:             pathId   || null,
                moduleId,
                currentUserMessage: `Practice problem for ${topicTitle}`,
            }));
        } catch (ctxErr) {
            console.warn('[tutorController.wrapUpExercise] Context assembly error:', ctxErr.message);
        }

        // Build course/path anchor (same logic as buildTutorTurnPrompt Phase 0)
        let courseAnchor = '';
        if (courseContext?.courseTitle) {
            const titleLine = [courseContext.courseTitle, courseContext.courseField].filter(Boolean).join(' · ');
            courseAnchor = `\n\nCOURSE: ${titleLine}`;
            if (courseContext.moduleTitle) courseAnchor += `\nMODULE: ${courseContext.moduleTitle}`;
        } else if (courseContext?.pathField) {
            const pathLine = [courseContext.pathField, courseContext.pathLevel].filter(Boolean).join(' · ');
            courseAnchor = `\n\nLEARNING PATH: ${pathLine}`;
            if (courseContext.moduleTitle) courseAnchor += `\nMODULE: ${courseContext.moduleTitle}`;
        }

        const historyText = recentMessages.length > 0
            ? recentMessages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')
            : '(no conversation history)';

        const guideSection = topicGuideExcerpt
            ? `\n\nWHAT THE STUDENT HAS BEEN TAUGHT:\n${topicGuideExcerpt}`
            : '';

        const wrapUpPrompt = `TOPIC: ${topicTitle}${courseAnchor}
SESSION GOAL: ${sessionGoal || `Build understanding of ${topicTitle}`}

RECENT CONVERSATION (last 6 turns):
${historyText}${guideSection}

Generate one short practice problem that would verify the student has met the goal. One problem. Conversational tone.`;

        let exerciseContent;
        try {
            exerciseContent = await callOpenRouter(
                wrapUpPrompt,
                250,
                0.6,
                TUTOR_WRAPUP_SYSTEM,
                TUTOR_MODEL,
            );
            exerciseContent = exerciseContent.trim();
        } catch (llmErr) {
            console.error('[tutorController.wrapUpExercise] LLM call failed:', llmErr.message);
            return res.status(500).json({ error: 'Could not generate practice problem. Please try again.' });
        }

        const now = new Date();
        session.messages.push({ role: 'assistant', content: exerciseContent, mode: 'wrap_up_exercise', createdAt: now });
        await session.save();

        const exerciseMessage = session.messages[session.messages.length - 1];
        console.log(`[Tutor] wrapUp session=${session._id} topicTitle=${topicTitle}`);

        return res.json({
            success: true,
            exerciseMessage: {
                _id:       exerciseMessage._id,
                role:      'assistant',
                content:   exerciseContent,
                mode:      'wrap_up_exercise',
                createdAt: exerciseMessage.createdAt,
            },
        });
    } catch (err) {
        console.error('[tutorController.wrapUpExercise]', err);
        return res.status(500).json({ error: 'Failed to generate practice problem.' });
    }
};
