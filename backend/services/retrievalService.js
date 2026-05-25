/**
 * services/retrievalService.js
 *
 * Hybrid retrieval: BM25 keyword search + Atlas Vector Search, fused via
 * Reciprocal Rank Fusion (RRF).
 *
 * ── Why hybrid? ──────────────────────────────────────────────────────────────
 * Pure BM25 fails on synonyms and paraphrasing: searching "heap allocation"
 * misses a chunk about "dynamic memory management" even though they mean the
 * same thing.
 * Pure vector search misses exact identifiers: searching "useState hook"
 * against a chunk that literally says "useState" may lose to a semantically
 * closer-but-less-relevant chunk.
 * Hybrid (BM25 + vectors) gives the best of both — this is what production
 * search at Microsoft (ORCAS), Cohere, and Pinecone all ship.
 *
 * ── Reciprocal Rank Fusion (RRF) ─────────────────────────────────────────────
 * For each document d ranked at position r in list L:
 *   score(d, L) += 1 / (k + r)  where k = 60 (Cormack et al., 2009)
 * Sum scores across both lists, re-rank. Simple, parameter-robust, works well.
 *
 * ── Graceful degradation ──────────────────────────────────────────────────────
 * If OPENAI_API_KEY is absent OR a chunk has no embedding yet,
 * the system falls back to pure BM25. Nothing breaks.
 *
 * BM25 parameters (unchanged from original):
 *   k1 = 1.5  (TF saturation)
 *   b  = 0.75 (length normalization — Elasticsearch defaults)
 */

const mongoose = require('mongoose');
const ResourceChunk = require('../models/ResourceChunk');
const embeddingService = require('./embeddingService');
const { tokenize } = require('../utils/chunkText');

// ─── BM25 hyperparameters ────────────────────────────────────────────────────

const K1 = 1.5;
const B = 0.75;

// ─── Token budget ────────────────────────────────────────────────────────────

const MAX_CONTEXT_WORDS = 3000;

// ─── BM25 scoring (pure function) ───────────────────────────────────────────

/**
 * Score all chunks in a corpus against a query using BM25.
 * Returns chunks sorted by score descending.
 *
 * @param {string} query
 * @param {Array}  allChunks  - Lean MongoDB documents with termFrequency, termCount
 * @returns {Array}            - Scored chunks, highest score first
 */
function scoreBM25(query, allChunks) {
    const queryTerms = tokenize(query);

    if (queryTerms.length === 0) {
        return allChunks.map(c => ({ ...c, score: 0 }));
    }

    const N = allChunks.length;
    const avgDl = allChunks.reduce((s, c) => s + (c.termCount || 1), 0) / N;

    // Compute IDF per query term
    const idf = {};
    for (const term of queryTerms) {
        let df = 0;
        for (const chunk of allChunks) {
            const tf = chunk.termFrequency instanceof Map
                ? chunk.termFrequency.get(term)
                : chunk.termFrequency?.[term];
            if (tf && tf > 0) df++;
        }
        idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    }

    const scored = allChunks.map(chunk => {
        let score = 0;
        const dl = chunk.termCount || 1;

        for (const term of queryTerms) {
            const tf = chunk.termFrequency instanceof Map
                ? (chunk.termFrequency.get(term) || 0)
                : (chunk.termFrequency?.[term] || 0);

            if (tf === 0) continue;

            const numerator = tf * (K1 + 1);
            const denominator = tf + K1 * (1 - B + B * (dl / avgDl));
            score += idf[term] * (numerator / denominator);
        }

        return {
            ...chunk,
            score,
            wordCount: chunk.text.split(/\s+/).length,
        };
    });

    return scored.sort((a, b) => b.score - a.score);
}

// ─── Atlas Vector Search ─────────────────────────────────────────────────────

/**
 * Run Atlas $vectorSearch for a query against a course's chunks.
 * Returns up to `topK` chunks ranked by cosine similarity.
 * Returns [] if embeddings aren't available.
 *
 * @param {string} queryText
 * @param {string} courseId
 * @param {number} topK
 * @returns {Promise<Array>}
 */
async function vectorSearch(queryText, courseId, topK) {
    if (!embeddingService.isAvailable()) return [];

    let queryVec;
    try {
        queryVec = await embeddingService.embedQuery(queryText);
    } catch (err) {
        console.warn('[RAG] Embedding query failed, falling back to BM25:', err.message);
        return [];
    }

    const indexName = process.env.ATLAS_VECTOR_INDEX || 'chunk_embedding_index';
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    try {
        const results = await ResourceChunk.aggregate([
            {
                $vectorSearch: {
                    index: indexName,
                    path: 'embedding',
                    queryVector: queryVec,
                    numCandidates: Math.max(topK * 10, 100),  // Atlas-recommended floor
                    limit: topK,
                    filter: { courseId: courseObjectId },
                },
            },
            {
                $project: {
                    text: 1, source: 1, chunkIndex: 1,
                    termFrequency: 1, termCount: 1, fileType: 1,
                    courseId: 1,  // needed for the safety check below
                    score: { $meta: 'vectorSearchScore' },
                },
            },
        ]);

        // ── Safety net: if the Atlas index doesn't declare courseId as a
        // filter field, the $vectorSearch filter is silently ignored and
        // chunks from other courses can be returned. This post-filter is
        // cheap and turns a silent correctness bug into a loud warning.
        const safe = results.filter(r => r.courseId?.toString() === courseId.toString());
        if (safe.length !== results.length) {
            console.warn(
                `[RAG] ⚠️  Atlas vector filter is not active — ` +
                `dropped ${results.length - safe.length}/${results.length} cross-course chunks. ` +
                `Add { "type": "filter", "path": "courseId" } to index "${indexName}".`
            );
        }
        return safe;
    } catch (err) {
        // Atlas Vector Search index may not exist yet (e.g., first deploy before index is created)
        console.warn('[RAG] Vector search failed, falling back to BM25:', err.message);
        return [];
    }
}

// ─── Reciprocal Rank Fusion ──────────────────────────────────────────────────

/**
 * Merge two ranked lists using RRF (Cormack et al., 2009).
 * Documents appearing in both lists get boosted significantly.
 *
 * @param {Array} vectorRanked  - Chunks from vector search (best first)
 * @param {Array} bm25Ranked    - Chunks from BM25 (best first)
 * @param {number} k             - Smoothing constant (60 is standard)
 * @returns {Array}              - Merged chunks, best first, with wordCount set
 */
function reciprocalRankFusion(vectorRanked, bm25Ranked, k = 60) {
    const scores = new Map();
    const docs = new Map();

    const addList = (list) => {
        list.forEach((doc, rank) => {
            const id = doc._id.toString();
            scores.set(id, (scores.get(id) || 0) + 1 / (k + rank + 1));
            if (!docs.has(id)) {
                docs.set(id, {
                    ...doc,
                    wordCount: doc.wordCount || doc.text.split(/\s+/).length,
                });
            }
        });
    };

    addList(vectorRanked);
    addList(bm25Ranked);

    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))  // stable tiebreaker on _id
        .map(([id]) => docs.get(id));
}

// ─── Token budget selection ──────────────────────────────────────────────────

/**
 * Select the top-K chunks from a ranked list while respecting the
 * MAX_CONTEXT_WORDS token budget. Re-sorts the final selection by
 * document order for coherent context.
 *
 * @param {Array}  rankedChunks  - Chunks in descending relevance order
 * @param {number} topK
 * @returns {Array}
 */
function selectByTokenBudget(rankedChunks, topK) {
    const selected = [];
    let totalWords = 0;

    for (const chunk of rankedChunks) {
        if (selected.length >= topK) break;
        const wc = chunk.wordCount || chunk.text.split(/\s+/).length;
        if (totalWords + wc > MAX_CONTEXT_WORDS) continue;
        selected.push({ ...chunk, wordCount: wc });
        totalWords += wc;
    }

    // Re-sort by document order for coherent reading by the LLM
    return selected.sort((a, b) => {
        if (a.source !== b.source) return (a.source || '').localeCompare(b.source || '');
        return a.chunkIndex - b.chunkIndex;
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant chunks for a query within a course.
 * Uses hybrid retrieval (vector + BM25 via RRF) when embeddings are available,
 * falls back to pure BM25 otherwise.
 *
 * @param {Object} params
 * @param {string} params.query    - The topic or question to search for
 * @param {string} params.courseId - MongoDB ObjectId of the course
 * @param {number} [params.topK=10]
 * @returns {Promise<Array<{ text, source, score, chunkIndex }>>}
 */
async function retrieveRelevantChunks({ query, courseId, topK = 10 }) {
    const fetchK = topK * 2;  // Fetch more from each source before merging

    // Load all chunks for BM25 + as a fallback document map for RRF
    const [allChunks, vectorResults] = await Promise.all([
        ResourceChunk.find({ courseId })
            .select('text termFrequency termCount chunkIndex source fileType')
            .lean(),
        vectorSearch(query, courseId, fetchK),
    ]);

    if (allChunks.length === 0) return [];

    const queryTerms = tokenize(query);

    // If no meaningful query terms, return first N chunks by document order
    if (queryTerms.length === 0) {
        return allChunks
            .sort((a, b) => a.chunkIndex - b.chunkIndex)
            .slice(0, topK)
            .map(c => ({
                text: c.text, source: c.source, score: 0, chunkIndex: c.chunkIndex,
            }));
    }

    const bm25Results = scoreBM25(query, allChunks);

    // Hybrid path: RRF merge
    if (vectorResults.length > 0) {
        const merged = reciprocalRankFusion(vectorResults, bm25Results);
        const selected = selectByTokenBudget(merged, topK);
        console.log(`[RAG] Hybrid retrieval: ${selected.length} chunks (vector: ${vectorResults.length}, bm25 corpus: ${allChunks.length})`);
        return selected.map(c => ({
            text: c.text, source: c.source,
            score: c.score || 0, chunkIndex: c.chunkIndex,
            wordCount: c.wordCount,
        }));
    }

    // BM25-only fallback
    const selected = selectByTokenBudget(bm25Results, topK);
    console.log(`[RAG] BM25-only retrieval: ${selected.length} chunks (corpus: ${allChunks.length})`);
    return selected.map(c => ({
        text: c.text, source: c.source,
        score: c.score, chunkIndex: c.chunkIndex,
        wordCount: c.wordCount,
    }));
}

/**
 * Get corpus statistics for a course (useful for debugging/analytics).
 */
async function getCorpusStats(courseId) {
    const chunks = await ResourceChunk.find({ courseId })
        .select('fileId source termCount embeddedAt')
        .lean();

    const files = {};
    for (const c of chunks) {
        if (!files[c.fileId]) {
            files[c.fileId] = { source: c.source, chunks: 0, totalTerms: 0, embedded: 0 };
        }
        files[c.fileId].chunks++;
        files[c.fileId].totalTerms += c.termCount || 0;
        if (c.embeddedAt) files[c.fileId].embedded++;
    }

    const totalEmbedded = chunks.filter(c => c.embeddedAt).length;

    return {
        totalChunks: chunks.length,
        totalFiles: Object.keys(files).length,
        embeddedChunks: totalEmbedded,
        hybridReady: totalEmbedded > 0 && embeddingService.isAvailable(),
        files: Object.values(files),
    };
}

module.exports = { retrieveRelevantChunks, getCorpusStats };