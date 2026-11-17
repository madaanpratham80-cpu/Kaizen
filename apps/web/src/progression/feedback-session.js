const PREFIX = 'kaizen.feedback.';
let activeSession = null;
let seen = new Set();

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * @param {string | null} sessionId Public presentation scope from the session response.
 * @returns {void}
 */
export function setFeedbackSession(sessionId) {
  if (activeSession === sessionId && sessionId !== null) return;
  activeSession = sessionId;
  seen = new Set();
  const backing = storage();
  if (!backing) return;
  const key = sessionId && PREFIX + sessionId;
  try {
    for (let index = backing.length - 1; index >= 0; index -= 1) {
      const existing = backing.key(index);
      if (existing?.startsWith(PREFIX) && existing !== key)
        backing.removeItem(existing);
    }
    if (key) {
      const stored = JSON.parse(backing.getItem(key) ?? '[]');
      if (Array.isArray(stored))
        seen = new Set(stored.filter((id) => typeof id === 'string'));
    }
  } catch {
    // The in-memory set still covers navigation if browser storage is blocked.
  }
}

/**
 * @param {string} sessionId
 * @param {string[]} eventIds
 * @returns {Set<string>}
 */
export function claimFeedbackEvents(sessionId, eventIds) {
  setFeedbackSession(sessionId);
  const fresh = new Set();
  for (const eventId of eventIds) {
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    fresh.add(eventId);
  }
  if (fresh.size) {
    try {
      storage()?.setItem(PREFIX + sessionId, JSON.stringify([...seen]));
    } catch {
      // Disabled or full storage can only deduplicate within the current page lifetime.
    }
  }
  return fresh;
}
