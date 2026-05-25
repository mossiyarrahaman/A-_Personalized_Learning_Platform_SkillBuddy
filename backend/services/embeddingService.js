/**
 * services/embeddingService.js
 *
 * Generates dense vector embeddings via OpenAI text-embedding-3-small.
 * Uses Matryoshka representation learning (MRL) — setting `dimensions: 512`
 * gives ~3x storage savings with <1% quality loss vs full 1536-dim vectors
 * on BEIR benchmarks.
 *
 * Graceful degradation: if OPENAI_API_KEY is absent, isAvailable() returns
 * false and all callers fall back to BM25-only retrieval. Nothing breaks.
 *
 * Setup:
 *   1. Add OPENAI_API_KEY to backend/.env
 *   2. Optionally set EMBEDDING_MODEL and EMBEDDING_DIMS
 *   3. Create Atlas Vector Search index (see plan doc)
 */

const OpenAI = require('openai');

const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const DIMS  = parseInt(process.env.EMBEDDING_DIMS || '512', 10);
const BATCH = 100;  // OpenAI max batch size for embeddings

let _client = null;

function getClient() {
    if (!_client) {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
        _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _client;
}

/**
 * Returns true if the embedding API is configured and usable.
 * Callers use this to decide whether to attempt vector search.
 */
function isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Embed an array of texts. Returns one embedding vector per input text.
 * Automatically batches requests to stay within OpenAI's batch size limit.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>}  One Float32 array per input text
 */
async function embedTexts(texts) {
    const client = getClient();
    const safe = texts.map(t => (t || '').trim().slice(0, 8000) || ' ');
    const out = [];

    for (let i = 0; i < safe.length; i += BATCH) {
        const batch = safe.slice(i, i + BATCH);
        const resp = await client.embeddings.create({
            model: MODEL,
            input: batch,
            dimensions: DIMS,
        });
        out.push(...resp.data.map(e => e.embedding));
    }

    return out;
}

/**
 * Embed a single query string. Used at retrieval time.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedQuery(text) {
    const [vec] = await embedTexts([text]);
    return vec;
}

module.exports = { isAvailable, embedTexts, embedQuery, DIMS, MODEL };
