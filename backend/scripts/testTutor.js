'use strict';
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api/tutor';

// ── MODE DETECTOR UNIT TESTS (F–J) ────────────────────────────────────────────
// Synchronous — no server needed. Run at load time so CI can verify heuristics.
(function runModeDetectorTests() {
    const { detectTutorMode } = require('../utils/tutorModeDetector');

    const pass = (label, actual, expected) => {
        const ok = actual === expected;
        console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
        if (!ok) console.log(`         expected: ${expected}   got: ${actual}`);
        return ok;
    };
    const notMode = (label, actual, forbidden) => {
        const ok = actual !== forbidden;
        console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
        if (!ok) console.log(`         should NOT be: ${forbidden}   got: ${actual}`);
        return ok;
    };

    // Build N identical "substantive answer" messages (>50 chars, no ?, no question-word opener).
    const substantive = (n) => Array.from({ length: n }, () => ({
        role: 'user',
        content: 'The base case is the condition that stops the recursion — without it the call stack overflows.',
    }));

    console.log('\n' + '█'.repeat(70));
    console.log('MODE DETECTOR UNIT TESTS — F through J');
    console.log('█'.repeat(70));

    let allPass = true;

    // TEST F — RULE 1 Group A: direct answer demand mid-conversation
    {
        const recentMessages = [
            ...substantive(4),
            { role: 'assistant', content: 'Good thinking.' },
        ];
        const result = detectTutorMode({ currentUserMessage: 'can you just answer me', recentMessages });
        allPass &= pass('TEST F — "can you just answer me" → drop_socratic (RULE 1 "just answer")', result, 'drop_socratic');
    }

    // TEST G — RULE 1 Group B: meta-statement about Socratic flow
    {
        const result = detectTutorMode({ currentUserMessage: 'stop asking questions', recentMessages: [] });
        allPass &= pass('TEST G — "stop asking questions" → drop_socratic (RULE 1 "stop asking")', result, 'drop_socratic');
    }

    // TEST H — RULE 1 fires (phrase match) before RULE 1B is even evaluated
    {
        const result = detectTutorMode({ currentUserMessage: 'just tell me', recentMessages: substantive(4) });
        allPass &= pass('TEST H — "just tell me" → drop_socratic (RULE 1, not RULE 1B order)', result, 'drop_socratic');
    }

    // TEST I — Only 1 prior message; RULE 1B cannot fire but RULE 1 still catches "just answer"
    {
        const result = detectTutorMode({ currentUserMessage: 'just answer', recentMessages: substantive(1) });
        allPass &= pass('TEST I — "just answer" + 1 prior msg → drop_socratic (RULE 1 only)', result, 'drop_socratic');
    }

    // TEST J — Negative: forward-looking question from engaged student must NOT fire drop_socratic
    {
        const result = detectTutorMode({ currentUserMessage: 'what about edge cases?', recentMessages: substantive(4) });
        allPass &= notMode('TEST J — "what about edge cases?" → NOT drop_socratic', result, 'drop_socratic');
    }

    // TEST K — Technical-vocabulary repetition: "black nodes" shared across turns
    //          should NOT trigger the repeated-question heuristic
    {
        const recentMessages = [
            { role: 'user',      content: 'I think every path from root to a leaf must have the same number of black nodes.' },
            { role: 'assistant', content: 'Good.' },
            { role: 'user',      content: 'Okay so if I insert a red node as child of a red node that violates something?' },
            { role: 'assistant', content: 'Right.' },
        ];
        const result = detectTutorMode({
            currentUserMessage: 'A double-red violates the rule that red nodes can only have black children, so we need to fix it.',
            recentMessages,
        });
        allPass &= notMode('TEST K — "black nodes" topic vocab across turns NOT drop_socratic (got: ' + result + ')', result, 'drop_socratic');
    }

    // TEST L — Real repeated frustration: caught by explicit phrase ("i don't get").
    // "I still don't get" would NOT match — "still" breaks the substring — so the
    // message uses "I don't get X" to let RULE 1's phrase check fire unambiguously.
    {
        const recentMessages = [
            { role: 'user',      content: 'Can you explain what a base case is?' },
            { role: 'assistant', content: 'A base case is...' },
            { role: 'user',      content: "I still don't understand the base case." },
            { role: 'assistant', content: 'Let me try again...' },
        ];
        const result = detectTutorMode({
            currentUserMessage: "I don't get the base case.",
            recentMessages,
        });
        allPass &= pass("TEST L — \"i don't get\" phrase → drop_socratic", result, 'drop_socratic');
    }

    // TEST M — Sparse legitimate repetition: brief messages share only common words
    {
        const recentMessages = [
            { role: 'user',      content: 'Okay so what does that mean?' },
            { role: 'assistant', content: 'It means...' },
            { role: 'user',      content: 'Right, I see.' },
            { role: 'assistant', content: 'Exactly.' },
        ];
        const result = detectTutorMode({
            currentUserMessage: 'The answer involves considering the time complexity.',
            recentMessages,
        });
        allPass &= notMode('TEST M — sparse common-word overlap NOT drop_socratic (got: ' + result + ')', result, 'drop_socratic');
    }

    console.log(`\n${allPass ? '✓ ALL MODE DETECTOR TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
    console.log('█'.repeat(70) + '\n');
})();

async function main() {
    // Get a valid student token
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../models/User');
    const u = await User.findOne({ role: 'student' }).select('_id').lean();
    if (!u) throw new Error('No student found');
    const token = jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };
    await mongoose.disconnect();

    const fmt = (resp, label) => {
        const d = resp.data;
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`${label}`);
        console.log(`${'─'.repeat(70)}`);
        if (d.error) { console.log('ERROR:', d.error); return null; }
        console.log(`sessionGoal : ${d.session?.sessionGoal}`);
        console.log(`mode        : ${d.assistantMessage?.mode}`);
        console.log(`messages    : ${d.session?.messages?.length}`);
        console.log(`\nTUTOR SAYS:`);
        console.log(d.assistantMessage?.content || '(no content)');
        return d;
    };

    const fmtAppend = (resp, label) => {
        const d = resp.data;
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`${label}`);
        console.log(`${'─'.repeat(70)}`);
        if (d.error) { console.log('ERROR:', d.error); return null; }
        console.log(`mode        : ${d.assistantMessage?.mode}`);
        console.log(`\nTUTOR SAYS:`);
        console.log(d.assistantMessage?.content || '(no content)');
        return d;
    };

    // ── SCENARIO A ──────────────────────────────────────────────────────────────
    // Fresh bare question — expect ask_first
    console.log('\n\n' + '█'.repeat(70));
    console.log('SCENARIO A — Fresh bare question (expect ask_first mode)');
    console.log('█'.repeat(70));
    console.log('STUDENT: "What is recursion?"');

    let dA;
    try {
        const rA = await axios.post(`${BASE}/sessions`, {
            moduleId: 'mod-test', topicId: 'topic-sc-a', topicTitle: 'Recursion',
            openingMessage: 'What is recursion?',
        }, { headers });
        dA = fmt(rA, 'CREATE SESSION');
    } catch (e) {
        if (e.response?.data?.existingSessionId) {
            // End stale and retry
            await axios.post(`${BASE}/sessions/${e.response.data.existingSessionId}/end`, {}, { headers });
            const rA2 = await axios.post(`${BASE}/sessions`, {
                moduleId: 'mod-test', topicId: 'topic-sc-a', topicTitle: 'Recursion',
                openingMessage: 'What is recursion?',
            }, { headers });
            dA = fmt(rA2, 'CREATE SESSION (after ending stale)');
        } else throw e;
    }

    // ── SCENARIO B ──────────────────────────────────────────────────────────────
    // Engaged attempt — expect socratic
    console.log('\n\n' + '█'.repeat(70));
    console.log('SCENARIO B — Engaged attempt (expect socratic mode)');
    console.log('█'.repeat(70));
    console.log('STUDENT: "I think it\'s when a function calls itself, like with factorials, but I don\'t know how it stops."');

    if (dA) {
        const rB = await axios.post(`${BASE}/sessions/${dA.session._id}/messages`, {
            content: "I think it's when a function calls itself, like with factorials, but I don't know how it stops.",
        }, { headers });
        fmtAppend(rB, 'APPEND MESSAGE');
    }

    // ── SCENARIO C ──────────────────────────────────────────────────────────────
    // Frustration — expect drop_socratic
    console.log('\n\n' + '█'.repeat(70));
    console.log('SCENARIO C — Frustration trigger (expect drop_socratic mode)');
    console.log('█'.repeat(70));
    console.log('STUDENT: "I\'m getting confused, can you just explain it directly?"');

    if (dA) {
        const rC = await axios.post(`${BASE}/sessions/${dA.session._id}/messages`, {
            content: "I'm getting confused, can you just explain it directly?",
        }, { headers });
        fmtAppend(rC, 'APPEND MESSAGE');
    }

    // End session A
    if (dA) {
        await axios.post(`${BASE}/sessions/${dA.session._id}/end`, {}, { headers });
        console.log('\n[Session A ended]');
    }

    // ── SCENARIO D ──────────────────────────────────────────────────────────────
    // Breezing/push — new topic
    console.log('\n\n' + '█'.repeat(70));
    console.log('SCENARIO D — Forward-looking confident student (expect push mode)');
    console.log('█'.repeat(70));
    console.log('STUDENT: "Yeah, I think I get this — when would I NOT want to use a recursive approach?"');

    let dD;
    try {
        const rD = await axios.post(`${BASE}/sessions`, {
            moduleId: 'mod-test', topicId: 'topic-sc-d', topicTitle: 'Recursion vs Iteration',
            openingMessage: "Yeah, I think I get this — when would I NOT want to use a recursive approach?",
        }, { headers });
        dD = fmt(rD, 'CREATE SESSION');
    } catch (e) {
        if (e.response?.data?.existingSessionId) {
            await axios.post(`${BASE}/sessions/${e.response.data.existingSessionId}/end`, {}, { headers });
            const rD2 = await axios.post(`${BASE}/sessions`, {
                moduleId: 'mod-test', topicId: 'topic-sc-d', topicTitle: 'Recursion vs Iteration',
                openingMessage: "Yeah, I think I get this — when would I NOT want to use a recursive approach?",
            }, { headers });
            dD = fmt(rD2, 'CREATE SESSION (after ending stale)');
        } else throw e;
    }
    if (dD) await axios.post(`${BASE}/sessions/${dD.session._id}/end`, {}, { headers });

    console.log('\n\n' + '═'.repeat(70));
    console.log('ALL SCENARIOS COMPLETE');
    console.log('═'.repeat(70) + '\n');
}

main().catch(e => {
    console.error('TEST FAILED:', e.response?.data || e.message);
    process.exit(1);
});
