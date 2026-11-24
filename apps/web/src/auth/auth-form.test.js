// @vitest-environment jsdom
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form.jsx';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
beforeEach(() => router.replace.mockReset());

const user = {
  id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
  email: 'user@example.com',
  displayName: 'Student',
  timezone: 'UTC',
};
const reply = (data, status = 200) =>
  Response.json({ data, requestId: 'test' }, { status });
const failure = (message, status) =>
  Response.json({ error: { message }, requestId: 'test' }, { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('auth-web-form-component', () => {
  it('recovers a committed registration by retrying only the session read', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure('Invalid session.', 401))
      .mockResolvedValueOnce(reply({ user }, 201))
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValueOnce(
        reply({
          user,
          csrfToken: 'proof',
          feedbackSessionId: 'feedback-proof',
        }),
      );
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'register' }));
    fireEvent.change(await screen.findByLabelText('Display name'), {
      target: { value: user.displayName },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'valid test password' },
    });
    fireEvent.change(screen.getByLabelText('Gender'), {
      target: { value: 'female' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Your account was created',
    );
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check session again' }),
    );
    await screen.findByText('Opening Today…');
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/today');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/auth/session',
      '/api/v1/auth/register',
      '/api/v1/auth/session',
      '/api/v1/auth/session',
    ]);
  });
  it('opens Today after login verifies the session', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure('Invalid session.', 401))
      .mockResolvedValueOnce(reply({ user }))
      .mockResolvedValueOnce(
        reply({
          user,
          csrfToken: 'proof',
          feedbackSessionId: 'feedback-proof',
        }),
      );
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'valid test password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByText('Opening Today…');
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/today');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/auth/session',
      '/api/v1/auth/login',
      '/api/v1/auth/session',
    ]);
    expect(screen.queryByRole('heading', { name: 'Your account' })).toBeNull();
  });
  it('registers with labelled fields, retains password spaces, and keeps credentials out of browser storage', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure('Invalid session.', 401))
      .mockResolvedValueOnce(reply({ user }, 201))
      .mockResolvedValueOnce(
        reply({
          user,
          csrfToken: 'proof',
          feedbackSessionId: 'feedback-proof',
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const browserOptions = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...browserOptions,
      timeZone: 'America/New_York',
    });
    render(createElement(AuthForm, { mode: 'register' }));
    fireEvent.change(await screen.findByLabelText('Display name'), {
      target: { value: user.displayName },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: '  valid password  ' },
    });
    expect(screen.queryByLabelText('Time zone')).toBeNull();
    const gender = screen.getByLabelText('Gender');
    expect(gender.validity.valueMissing).toBe(true);
    fireEvent.change(gender, {
      target: { value: 'male' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Opening Today…');
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/today');
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/register',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          password: '  valid password  ',
          gender: 'male',
          timezone: 'America/New_York',
        }),
      }),
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('shows the login pending state and the API error', async () => {
    const { promise: pending, resolve: finish } = Promise.withResolvers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure('Invalid session.', 401))
      .mockReturnValueOnce(pending);
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    const button = await screen.findByRole('button', { name: 'Logging in…' });
    expect(button.closest('fieldset')?.disabled).toBe(true);
    finish(failure('Invalid email or password.', 401));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Invalid email or password.',
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/login',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('restores the account on mount from the cookie-backed session', async () => {
    const fetch = vi.fn().mockResolvedValue(
      reply({
        user,
        csrfToken: 'proof',
        feedbackSessionId: 'feedback-proof',
      }),
    );
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    await screen.findByText('Opening Today…');
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/today');
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/auth/session',
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });
  it('opens the evaluation guest for the demo credentials without calling login', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(failure('Invalid session.', 401));
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /auto-fill demo credentials/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByText('Opening Today…');
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/today');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/v1/auth/session']);
    window.localStorage.removeItem('kaizen_guest_mode');
    document.cookie = 'kaizen_guest=; path=/; max-age=0';
  });
});
