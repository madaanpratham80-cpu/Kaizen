import {
  calendarSyncResponseSchema,
  habitsResponseSchema,
  profileResponseSchema,
  progressResponseSchema,
  questsResponseSchema,
  todayResponseSchema,
} from '@kaizen/contracts';
import { requestApi } from '../auth/client.js';

const MAX_SYNC_ATTEMPTS = 4;
const MAX_RETRY_SECONDS = 10;
const MS_PER_SECOND = 1000;

/**
 * @template T
 * @param {string} path
 * @param {import('@kaizen/contracts').z.ZodType<{data: T}>} schema
 * @param {AbortSignal} [signal]
 * @returns {Promise<T>}
 */
async function read(path, schema, signal) {
  const { body } = await requestApi(path, schema, { signal });
  return body.data;
}

/** @param {Record<string, string | number | boolean | undefined>} query */
function search(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.size ? `?${params}` : '';
}

/**
 * @param {number} milliseconds
 * @param {AbortSignal} signal
 * @returns {Promise<void>}
 */
function waitForRetry(milliseconds, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export const screenApi = {
  /** @param {AbortSignal} [signal] */
  today: (signal) => read('today', todayResponseSchema, signal),
  /**
   * @param {{after?: string, limit?: number, category?: 'Academic' | 'Physical' | 'Productivity' | 'Language', archived?: boolean}} [query]
   * @param {AbortSignal} [signal]
   */
  quests: (query = {}, signal) =>
    read(`quests${search(query)}`, questsResponseSchema, signal),
  /**
   * @param {string} week First local date of the week.
   * @param {AbortSignal} [signal]
   */
  habits: (week, signal) =>
    read(`habits${search({ week })}`, habitsResponseSchema, signal),
  /**
   * @param {{from?: string, to?: string, limit?: number, cursor?: string}} [query]
   * @param {AbortSignal} [signal]
   */
  progress: (query = {}, signal) =>
    read(`progress${search(query)}`, progressResponseSchema, signal),
  /** @param {AbortSignal} [signal] */
  profile: (signal) => read('profile', profileResponseSchema, signal),
  /**
   * @param {string} csrfToken Session-bound CSRF proof.
   * @param {{signal: AbortSignal, onCatchUp?: (seconds: number) => void}} options
   */
  async syncCalendar(csrfToken, { signal, onCatchUp }) {
    for (let attempt = 1; ; attempt += 1) {
      signal.throwIfAborted();
      const { body, retryAfter } = await requestApi(
        'calendar/sync',
        calendarSyncResponseSchema,
        { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, signal },
      );
      signal.throwIfAborted();
      const { data } = body;
      if (data.status === 'ready') return data;

      // Cross-origin localhost responses expose the wait in the body.
      const seconds = /^[1-9]\d*$/.test(retryAfter ?? '')
        ? Number(retryAfter)
        : data.retryAfterSeconds;
      onCatchUp?.(seconds);
      if (attempt === MAX_SYNC_ATTEMPTS || seconds > MAX_RETRY_SECONDS)
        return data;
      await waitForRetry(seconds * MS_PER_SECOND, signal);
    }
  },
};
