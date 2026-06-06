/**
 * Returns metadata about the client that the backend needs to correctly
 * record time-based events (e.g. daily activity bucketing).
 *
 * tzOffsetMinutes matches JavaScript's Date.prototype.getTimezoneOffset():
 *   positive in UTC-west zones, negative in UTC-east zones.
 *   Example: IST (UTC+5:30) → -330.
 *
 * Spread this into any POST body that triggers a backend recordActivity call:
 *   api.post('/courses/progress', { ...payload, ...getClientMeta() })
 */
export const getClientMeta = () => ({
    tzOffsetMinutes: new Date().getTimezoneOffset(),
});
