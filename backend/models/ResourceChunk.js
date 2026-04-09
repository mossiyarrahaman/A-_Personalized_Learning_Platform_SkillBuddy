/**
 * models/ResourceChunk.js
 *
 * Stores chunked text from teacher-uploaded resources.
 *
 * Design notes (for future maintainers):
 * ──────────────────────────────────────
 * We deliberately avoid vector embeddings here. The reasons:
 *   1. Embedding APIs add cost, latency, and an external dependency.
 *   2. Atlas Vector Search requires a paid cluster + index setup.
 *   3. For typical course material (≤50 documents, ≤500 chunks) keyword-based
 *      retrieval (BM25) performs comparably to cosine similarity and is free.
 *
 * Each chunk stores a pre-computed `termFrequency` map — a plain object where
 * keys are stemmed/lowercased tokens and values are occurrence counts.
 * At query time the retrieval service scores chunks using BM25 against the
 * query terms, entirely in application code.
 *
 * If the platform scales to thousands of documents per course, swap in a
 * vector search layer at that point. The rest of the pipeline stays the same.
 */

const mongoose = require('mongoose');

const resourceChunkSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },

        // Identifier for the uploaded file (so we can delete all chunks for a file)
        fileId: {
            type: String,
            required: true,
            index: true,
        },

        // The actual text content of this chunk
        text: {
            type: String,
            required: true,
        },

        // Pre-computed term frequency map for BM25 scoring
        // Example: { "machine": 3, "learn": 5, "neural": 2 }
        termFrequency: {
            type: Map,
            of: Number,
            default: {},
        },

        // Total number of terms in this chunk (denominator for TF normalization)
        termCount: {
            type: Number,
            default: 0,
        },

        // Position in the original document (for ordering context sensibly)
        chunkIndex: {
            type: Number,
            required: true,
        },

        // Metadata
        source: { type: String },    // original filename
        fileType: { type: String },   // pdf | docx | pptx
    },
    { timestamps: true }
);

// Compound index for fast retrieval by course
resourceChunkSchema.index({ courseId: 1, fileId: 1 });

module.exports = mongoose.model('ResourceChunk', resourceChunkSchema);