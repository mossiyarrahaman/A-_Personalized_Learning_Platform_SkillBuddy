/**
 * services/embeddingService.js
 * Handles:
 *   1. Generating embeddings via Ollama (nomic-embed-text) — FREE, runs locally
 *   2. Storing chunks + embeddings in MongoDB
 *   3. Retrieving relevant chunks via Atlas Vector Search
 *
 * nomic-embed-text produces 768-dim embeddings.
 * Make sure Ollama is running: `ollama serve`
 * Pull the model first: `ollama pull nomic-embed-text`
 */

const axios = require('axios');
const ResourceChunk = require('../models/ResourceChunk');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';
const BATCH_SIZE = 10;

// ─── Generate a single embedding via Ollama ──────────────────────────────────

async function getEmbedding(text) {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
        model: EMBEDDING_MODEL,
        prompt: text.slice(0, 4000),
    });

    if (!response.data?.embedding) {
        throw new Error('Ollama did not return an embedding. Is `ollama serve` running?');
    }

    return response.data.embedding;
}

// ─── Embed all chunks and save to MongoDB ────────────────────────────────────

async function embedAndStore({ chunks, courseId, resourceId, source, fileType }) {
    const savedIds = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        for (let j = 0; j < batch.length; j++) {
            const embedding = await getEmbedding(batch[j]);

            const doc = await ResourceChunk.create({
                courseId,
                resourceId,
                text: batch[j],
                embedding,
                chunkIndex: i + j,
                source,
                fileType,
            });

            savedIds.push(doc._id);
        }

        console.log(`✅ Embedded chunks ${i + 1}–${Math.min(i + BATCH_SIZE, chunks.length)} of ${chunks.length}`);
    }

    return savedIds;
}

// ─── Retrieve top-K relevant chunks via Atlas Vector Search ──────────────────

async function retrieveRelevantChunks({ query, courseId, topK = 6 }) {
    const queryEmbedding = await getEmbedding(query);

    const results = await ResourceChunk.aggregate([
        {
            $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: topK * 10,
                limit: topK,
                filter: { courseId: { $eq: courseId } },
            },
        },
        {
            $project: {
                _id: 1,
                text: 1,
                source: 1,
                fileType: 1,
                score: { $meta: 'vectorSearchScore' },
            },
        },
    ]);

    return results;
}

// ─── Delete all chunks for a resource ────────────────────────────────────────

async function deleteResourceChunks(resourceId) {
    await ResourceChunk.deleteMany({ resourceId });
}

module.exports = { getEmbedding, embedAndStore, retrieveRelevantChunks, deleteResourceChunks };