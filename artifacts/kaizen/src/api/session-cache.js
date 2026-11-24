let activeIdentity = null;
/** @type {Map<string, unknown>} */
const entries = new Map();
let lifetime = new AbortController();

export const sessionCache = {
  /** @param {string | null} identity Opaque identity from the session endpoint. */
  setIdentity(identity) {
    if (identity === activeIdentity) return;
    activeIdentity = identity;
    this.clear();
  },

  /** Empty the cache and invalidate any previously issued scope. */
  clear() {
    const previous = lifetime;
    lifetime = new AbortController();
    entries.clear();
    previous.abort();
  },

  /** @param {string} identity Opaque identity from the session endpoint. */
  forSession(identity) {
    if (!identity || identity !== activeIdentity) return null;
    const { signal } = lifetime;
    return {
      signal,
      /** @param {string} key */
      get: (key) => (signal.aborted ? undefined : entries.get(key)),
      /**
       * @param {string} key
       * @param {unknown} value
       */
      set(key, value) {
        if (!signal.aborted) entries.set(key, value);
      },
    };
  },
};
