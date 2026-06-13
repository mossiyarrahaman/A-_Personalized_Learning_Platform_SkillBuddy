'use strict';

/**
 * walkCurriculumContext
 *
 * Walks a modules array to compute curriculum context for a given topic.
 * Pure function — no I/O, no Mongoose imports.
 *
 * @param {Array}  modules          - Array of module objects, each with _id/id, title, topics[]
 * @param {string} currentModuleId  - ID of the module containing the current topic
 * @param {string} currentTopicId   - ID of the current topic
 *
 * @returns {{ priorTopics: string[], upcomingTopics: string[], moduleTitle: string }}
 *   priorTopics   — topic titles that appear before currentTopicId across all modules
 *   upcomingTopics — topic titles that appear after currentTopicId across all modules
 *   moduleTitle   — title of the module matching currentModuleId, or ''
 *
 * Defensive: if either ID is not found, returns all-empty result. Never throws.
 */
function walkCurriculumContext(modules, currentModuleId, currentTopicId) {
    if (!Array.isArray(modules)) {
        return { priorTopics: [], upcomingTopics: [], moduleTitle: '' };
    }

    const norm = (v) => (v != null ? v.toString() : '');
    const modIdStr = norm(currentModuleId);
    const topicIdStr = norm(currentTopicId);

    // Locate the current module's title
    let moduleTitle = '';
    for (const m of modules) {
        if (norm(m.id || m._id) === modIdStr) {
            moduleTitle = m.title || '';
            break;
        }
    }

    // Walk all topics in curriculum order, split on the current topic
    const priorTopics = [];
    const upcomingTopics = [];
    let foundCurrent = false;

    for (const m of modules) {
        if (!Array.isArray(m.topics)) continue;
        for (const t of m.topics) {
            if (norm(t.id || t._id) === topicIdStr) {
                foundCurrent = true;
            } else if (!foundCurrent) {
                if (t.title) priorTopics.push(t.title);
            } else {
                if (t.title) upcomingTopics.push(t.title);
            }
        }
    }

    // If the topic was never found, return empty (don't return all-prior as context)
    if (!foundCurrent) {
        return { priorTopics: [], upcomingTopics: [], moduleTitle };
    }

    return { priorTopics, upcomingTopics, moduleTitle };
}

module.exports = { walkCurriculumContext };
