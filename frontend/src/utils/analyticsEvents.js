/**
 * Lightweight broadcast for analytics-affecting events.
 * Fired after any action that should cause analytics pages to refetch:
 *   quiz submitted, resource completed, topic toggled.
 *
 * Uses window CustomEvent so it works in-page (same tab) and does not
 * require any state library. For cross-tab freshness, window.focus
 * handles the case where the user switches back to a stale tab.
 */

const EVENT_NAME = 'sb-analytics-changed';

export const emitAnalyticsChanged = (reason = 'unknown') => {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { reason, at: Date.now() },
    }));
};

/**
 * Subscribe to analytics-change events.
 * Returns a cleanup function — call it in a useEffect return.
 *
 *   useEffect(() => onAnalyticsChanged(() => fetchData()), [fetchData]);
 */
export const onAnalyticsChanged = (handler) => {
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
};
