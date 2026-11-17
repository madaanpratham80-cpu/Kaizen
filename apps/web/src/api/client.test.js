import { afterEach, describe, expect, it, vi } from 'vitest';
import { screenApi } from './client.js';

const base = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
const requestId = '09d5a188-cc9f-47d4-8e1e-848c51b51e86';
const reply = (data, options) => Response.json({ data, requestId }, options);
const catchUp = (seconds, header) =>
  reply(
    { status: 'catching-up', retryAfterSeconds: seconds },
    { status: 202, headers: header ? { 'Retry-After': header } : {} },
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('screen API', () => {
  it('uses the authentication transport with credentials and no-store', async () => {
    const data = { quests: [], nextCursor: null };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(data)));

    await expect(
      screenApi.quests({ category: 'Academic', archived: false }),
    ).resolves.toEqual(data);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${base}/quests?category=Academic&archived=false`,
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    );
  });

  it('rejects an entire response containing a malformed quest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        reply({
          quests: [{ title: 'Incomplete quest' }],
          nextCursor: null,
        }),
      ),
    );

    await expect(screenApi.quests()).rejects.toMatchObject({
      name: 'ZodError',
    });
  });

  it('respects Retry-After and stops after four attempts', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => catchUp(1, '2')),
    );
    const onCatchUp = vi.fn();
    const { signal } = new AbortController();
    const pending = screenApi.syncCalendar('csrf-proof', { signal, onCatchUp });

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onCatchUp).toHaveBeenCalledWith(2);
    expect(fetch).toHaveBeenCalledWith(
      `${base}/calendar/sync`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-CSRF-Token': 'csrf-proof' },
        signal,
      }),
    );
    await vi.advanceTimersByTimeAsync(4001);
    await expect(pending).resolves.toMatchObject({ status: 'catching-up' });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back to the response body and cancels its wait on abort', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => catchUp(1)),
    );
    const onCatchUp = vi.fn();
    const controller = new AbortController();
    const failure = expect(
      screenApi.syncCalendar('csrf-proof', {
        signal: controller.signal,
        onCatchUp,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(0);
    expect(onCatchUp).toHaveBeenCalledWith(1);
    controller.abort();

    await failure;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
