/**
 * services/ingestionService.js
 *
 * Full ingestion pipeline: file → extract text → chunk → compute TF → store.
 * Called when a teacher uploads a resource to a course.
 *
 * Design notes:
 * ─────────────
 * This is intentionally simple. The pipeline is:
 *   1. Validate the file type (PDF, DOCX, PPTX only)
 *   2. Extract raw text
 *   3. Validate we got enough text to be useful
 *   4. Chunk with sentence-aware splitting + overlap
 *   5. Bulk-insert chunks into MongoDB with pre-computed term frequencies
 *
 * No embeddings, no external ML services, no async queues.
 * For a teaching platform with <50 documents per course, this runs in
 * seconds and is easy to debug when something goes wrong.
 *
 * Error handling philosophy: fail loud and clear. If a PDF is scanned
 * (no text layer), tell the teacher exactly what happened and what to do.
 * Don't silently store empty chunks that produce garbage questions later.
 */

const { extractText, isSupportedFile } = require('../utils/extractText');
const { chunkText } = require('../utils/chunkText');
const ResourceChunk = require('../models/ResourceChunk');
const crypto = require('crypto');

// Minimum extractable text to consider a document useful (in characters)
const MIN_TEXT_LENGTH = 100;

/**
 * Ingest a single uploaded file into the chunk store.
 *
 * @param {Object} params
 * @param {string} params.filePath  - Absolute path to the uploaded file on disk
 * @param {string} params.mimeType  - MIME type reported by multer
 * @param {string} params.fileName  - Original filename (for display/debugging)
 * @param {string} params.courseId   - MongoDB ObjectId of the course
 * @returns {{ fileId: string, chunksStored: number, fileType: string, wordCount: number }}
 */
async function ingestResource({ filePath, mimeType, fileName, courseId }) {
    console.log(`\n📥 Ingesting: ${fileName} (${mimeType})`);

    // ── Step 1: Validate file type ───────────────────────────────────────────
    if (!isSupportedFile(mimeType, filePath)) {
        throw new Error(
            `Unsupported file type: ${mimeType}. ` +
            'Only PDF, DOCX, and PPTX files are supported for question generation.'
        );
    }

    // ── Step 2: Extract text ─────────────────────────────────────────────────
    console.log('  → Extracting text...');
    const { text, fileType } = await extractText(filePath, mimeType);

    if (!text || text.trim().length < MIN_TEXT_LENGTH) {
        throw new Error(
            `Could not extract enough text from "${fileName}" ` +
            `(got ${text ? text.trim().length : 0} characters, need at least ${MIN_TEXT_LENGTH}). ` +
            'The file may be empty, image-only, or corrupted.'
        );
    }

    const wordCount = text.split(/\s+/).length;
    console.log(`  ✅ Extracted ${wordCount} words`);

    // ── Step 3: Chunk text ───────────────────────────────────────────────────
    console.log('  → Chunking...');
    const chunks = chunkText(text);

    if (chunks.length === 0) {
        throw new Error(`Chunking produced no results for "${fileName}". The extracted text may be too short or malformed.`);
    }
    console.log(`  ✅ Created ${chunks.length} chunks`);

    // ── Step 4: Generate a unique file ID ────────────────────────────────────
    // Used to group chunks from the same upload (for deletion/re-ingestion)
    const fileId = `${courseId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // ── Step 5: Remove any previous chunks for this exact file name + course
    // (handles re-uploads of the same document)
    const deleted = await ResourceChunk.deleteMany({ courseId, source: fileName });
    if (deleted.deletedCount > 0) {
        console.log(`  🔄 Replaced ${deleted.deletedCount} existing chunks for "${fileName}"`);
    }

    // ── Step 6: Bulk insert ──────────────────────────────────────────────────
    console.log('  → Storing chunks...');
    const documents = chunks.map((chunk, index) => ({
        courseId,
        fileId,
        text: chunk.text,
        termFrequency: chunk.termFrequency,
        termCount: chunk.termCount,
        chunkIndex: index,
        source: fileName,
        fileType,
    }));

    await ResourceChunk.insertMany(documents);
    console.log(`  ✅ Stored ${documents.length} chunks for "${fileName}"\n`);

    return {
        fileId,
        chunksStored: documents.length,
        fileType,
        wordCount,
    };
}

/**
 * Remove all chunks for a specific file from the store.
 *
 * @param {string} fileId - The fileId returned during ingestion
 */
async function removeFileFromStore(fileId) {
    const result = await ResourceChunk.deleteMany({ fileId });
    console.log(`🗑️  Removed ${result.deletedCount} chunks (fileId: ${fileId})`);
    return { deletedCount: result.deletedCount };
}

/**
 * Remove all chunks for an entire course (e.g., when a course is deleted).
 *
 * @param {string} courseId - MongoDB ObjectId of the course
 */
async function removeCourseFromStore(courseId) {
    const result = await ResourceChunk.deleteMany({ courseId });
    console.log(`🗑️  Removed ${result.deletedCount} chunks for course ${courseId}`);
    return { deletedCount: result.deletedCount };
}

module.exports = { ingestResource, removeFileFromStore, removeCourseFromStore };