/**
 * utils/extractText.js
 *
 * Extracts raw text from uploaded teaching materials.
 * Supported formats: PDF, DOCX, PPTX — nothing else.
 *
 * Design rationale:
 * ─────────────────
 * Teachers upload course material. That's documents, not videos or images.
 * Supporting fewer formats means fewer dependencies, fewer failure modes,
 * and a pipeline we can actually test and trust.
 *
 * If you need image OCR or audio transcription later, add dedicated
 * extraction functions here — but keep them behind explicit feature flags.
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

// ─── Supported MIME types ────────────────────────────────────────────────────

const SUPPORTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]);

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.ppt']);

/**
 * Check if a file type is supported before attempting extraction.
 * Call this early to fail fast with a clear error message.
 */
function isSupportedFile(mimeType, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_MIMES.has(mimeType) || SUPPORTED_EXTENSIONS.has(ext);
}

// ─── PDF extraction ──────────────────────────────────────────────────────────

async function extractPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new Error(
      'PDF appears to be scanned/image-based — no extractable text found. ' +
      'Please upload a text-based PDF or convert it using OCR first.'
    );
  }

  return data.text;
}

// ─── DOCX extraction ─────────────────────────────────────────────────────────

async function extractDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });

  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX file appears to be empty or contains only images.');
  }

  // Log warnings (e.g., unsupported elements) but don't fail
  if (result.messages.length > 0) {
    console.warn(`⚠️  DOCX extraction warnings for ${path.basename(filePath)}:`);
    result.messages.forEach(m => console.warn(`   - ${m.message}`));
  }

  return result.value;
}

// ─── PPTX extraction ─────────────────────────────────────────────────────────

async function extractPPTX(filePath) {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(filePath, (data, err) => {
      if (err) return reject(new Error(`PPTX parsing failed: ${err.message || err}`));
      if (!data || data.trim().length === 0) {
        return reject(new Error('PPTX file appears to be empty or contains only images/diagrams.'));
      }
      resolve(data);
    });
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * Extract text from a supported document file.
 *
 * @param {string} filePath  - Absolute path to the uploaded file
 * @param {string} mimeType  - MIME type reported by multer
 * @returns {{ text: string, fileType: string }}
 * @throws {Error} if file type is unsupported or extraction fails
 */
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (!isSupportedFile(mimeType, filePath)) {
    throw new Error(
      `Unsupported file type: ${mimeType} (${ext}). ` +
      'Only PDF, DOCX, and PPTX files are supported.'
    );
  }

  // Route to the right extractor
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    return { text: await extractPDF(filePath), fileType: 'pdf' };
  }

  if (mimeType.includes('wordprocessingml') || ext === '.docx') {
    return { text: await extractDOCX(filePath), fileType: 'docx' };
  }

  if (mimeType.includes('presentationml') || mimeType === 'application/vnd.ms-powerpoint' || ['.pptx', '.ppt'].includes(ext)) {
    return { text: await extractPPTX(filePath), fileType: 'pptx' };
  }

  // Should never reach here due to isSupportedFile check, but be safe
  throw new Error(`No extractor available for: ${mimeType} (${ext})`);
}

module.exports = { extractText, isSupportedFile, SUPPORTED_MIMES };