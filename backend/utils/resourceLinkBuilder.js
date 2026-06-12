/**
 * Constructs a deterministic search-redirect URL for a resource given its title and type.
 * Used post-LLM-generation so no hallucinated watch?v= IDs ever reach the database.
 *
 * Returns null when title is empty/undefined — caller decides how to handle (skip rendering).
 */
function buildResourceLink({ title, type } = {}) {
    if (!title || typeof title !== 'string') return null;
    const q = encodeURIComponent(title.trim());
    switch ((type || '').toLowerCase()) {
        case 'video':
        case 'youtube':
            return `https://www.youtube.com/results?search_query=${q}`;
        case 'article':
            return `https://www.google.com/search?q=${q}`;
        case 'docs':
        case 'documentation':
            return `https://www.google.com/search?q=${q}+documentation`;
        case 'interactive':
        case 'practice':
            return `https://www.google.com/search?q=${q}+interactive+tutorial`;
        case 'book':
            return `https://www.google.com/search?q=${q}&tbm=bks`;
        case 'reference':
        case 'cheatsheet':
            return `https://www.google.com/search?q=${q}+documentation`;
        default:
            return `https://www.google.com/search?q=${q}`;
    }
}

module.exports = { buildResourceLink };
