/**
 * utils/chunkText.js
 *
 * Splits extracted document text into overlapping chunks and computes
 * term frequency maps for each chunk (used by BM25 retrieval).
 *
 * Design notes:
 * ─────────────
 * 1. We chunk by sentences, not raw word count. This preserves meaning
 *    at chunk boundaries — a sentence split mid-way produces garbage context.
 *
 * 2. Each chunk targets ~300 words with ~2 sentence overlap. This balances
 *    context richness against the tight token budget of a 7B model (~6K
 *    usable tokens after prompt + response reservation).
 *
 * 3. Term frequency is computed with basic normalization: lowercase, strip
 *    punctuation, remove common English stopwords. No stemming library —
 *    we keep dependencies at zero. The BM25 scoring in retrievalService
 *    handles the rest.
 *
 * 4. Why not use a chunking library? Because the logic is 60 lines and
 *    we control exactly what happens. Libraries add CVE surface area for
 *    something this simple.
 */

// ─── English stopwords (top ~170, covers >99% of common noise) ──────────────

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they',
  'we', 'you', 'i', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'if', 'then', 'also', 'about', 'up',
  'out', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'once', 'here',
  'there', 'any', 'many', 'much', 'get', 'got', 'like', 'make', 'made',
  'new', 'now', 'even', 'back', 'still', 'well', 'also', 'use', 'used',
  'one', 'two', 'first', 'way', 'because', 'however', 'while', 'since',
]);

// ─── Tokenize text into meaningful terms ─────────────────────────────────────

/**
 * Convert text to an array of normalized tokens suitable for TF computation.
 * Strips punctuation, lowercases, removes stopwords and short tokens.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
    .split(/\s+/)                     // split on whitespace
    .filter(t => t.length > 2 && !STOPWORDS.has(t));  // drop noise
}

/**
 * Compute term frequency map from text.
 * Returns { term: count } and the total term count.
 */
function computeTermFrequency(text) {
  const tokens = tokenize(text);
  const freq = {};

  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }

  return { termFrequency: freq, termCount: tokens.length };
}

// ─── Sentence-aware chunking ─────────────────────────────────────────────────

/**
 * Split text into sentences using a regex that handles common abbreviations
 * and avoids splitting on decimal numbers or initials.
 */
function splitSentences(text) {
  // Normalize whitespace first
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Split on sentence-ending punctuation followed by space + uppercase
  // or newline patterns that indicate paragraph breaks
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?:\n\s*\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Chunk text into overlapping segments, respecting sentence boundaries.
 *
 * @param {string} text             - Full extracted document text
 * @param {number} targetWords      - Target words per chunk (default: 300)
 * @param {number} overlapSentences - Number of sentences to overlap (default: 2)
 * @returns {Array<{ text: string, termFrequency: object, termCount: number }>}
 */
function chunkText(text, targetWords = 300, overlapSentences = 2) {
  const sentences = splitSentences(text);

  if (sentences.length === 0) return [];

  const chunks = [];
  let startIdx = 0;

  while (startIdx < sentences.length) {
    let wordCount = 0;
    let endIdx = startIdx;

    // Accumulate sentences until we hit the target word count
    while (endIdx < sentences.length && wordCount < targetWords) {
      wordCount += sentences[endIdx].split(/\s+/).length;
      endIdx++;
    }

    // Build the chunk text
    const chunkSentences = sentences.slice(startIdx, endIdx);
    const chunkText = chunkSentences.join(' ');

    if (chunkText.trim().length > 0) {
      const { termFrequency, termCount } = computeTermFrequency(chunkText);
      chunks.push({ text: chunkText, termFrequency, termCount });
    }

    // Advance start, overlapping by N sentences
    const advance = Math.max(1, endIdx - startIdx - overlapSentences);
    startIdx += advance;

    // Safety: if we haven't moved, force advance to prevent infinite loop
    if (startIdx <= chunks.length - 1 && endIdx >= sentences.length) break;
  }

  return chunks;
}

module.exports = { chunkText, tokenize, computeTermFrequency, STOPWORDS };