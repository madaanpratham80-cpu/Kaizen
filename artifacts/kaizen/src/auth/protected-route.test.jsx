// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { auth } from './client.js';
import { ProtectedRoute } from './protected-route.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function show() {
  const location = memoryLocation({ path: '/today', record: true });
  render(
    <Router hook={location.hook}>
      <ProtectedRoute>Private screen</ProtectedRoute>
    </Router>,
  );
  return location;
}

it('redirects a deep link when there is no active session', async () => {
  const verify = vi.spyOn(auth, 'session').mockResolvedValue(null);
  const location = show();
  await waitFor(() => expect(location.history).toEqual(['/login']));
  expect(screen.queryByText('Private screen')).toBeNull();
  expect(verify).toHaveBeenCalledWith(expect.any(AbortSignal), {
    allowGuestFallback: false,
  });
});

it('does not expose a protected page when the session endpoint fails', async () => {
  vi.spyOn(auth, 'session').mockRejectedValue(new Error('Unavailable'));
  const location = show();
  await waitFor(() => expect(location.history).toEqual(['/login']));
  expect(screen.queryByText('Private screen')).toBeNull();
});

it('renders the route only after a session is confirmed', async () => {
  const { promise, resolve } = Promise.withResolvers();
  vi.spyOn(auth, 'session').mockReturnValue(promise);
  show();
  expect(screen.queryByText('Private screen')).toBeNull();
  resolve({ feedbackSessionId: 'session' });
  expect(await screen.findByText('Private screen')).toBeTruthy();
});
