// @vitest-environment jsdom
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form.jsx';

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
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Your account was created',
    );
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check session again' }),
    );
    await screen.findByText('Your account');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/auth/session',
      '/api/v1/auth/register',
      '/api/v1/auth/session',
      '/api/v1/auth/session',
    ]);
  });
  it('refreshes a stale logout proof and asks before signing out the replacement account', async () => {
    const replacement = { ...user, displayName: 'Replacement account' };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        reply({ user, csrfToken: 'old', feedbackSessionId: 'feedback-old' }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token.' } },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        reply({
          user: replacement,
          csrfToken: 'new',
          feedbackSessionId: 'feedback-new',
        }),
      )
      .mockResolvedValueOnce(reply({ success: true }));
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await screen.findByText('Replacement account');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByRole('button', { name: 'Log in' });
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      '/api/v1/auth/logout',
      expect.objectContaining({ headers: { 'X-CSRF-Token': 'new' } }),
    );
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
      )
      .mockResolvedValueOnce(reply({ success: true }));
    vi.stubGlobal('fetch', fetch);
    const write = vi.spyOn(Storage.prototype, 'setItem');
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
    expect(screen.getByLabelText('Time zone')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Your account');
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
          timezone: 'UTC',
        }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByRole('button', { name: 'Create account' });
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      '/api/v1/auth/logout',
      expect.objectContaining({ headers: { 'X-CSRF-Token': 'proof' } }),
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
    const fetch = vi
      .fn()
      .mockResolvedValue(
        reply({
          user,
          csrfToken: 'proof',
          feedbackSessionId: 'feedback-proof',
        }),
      );
    vi.stubGlobal('fetch', fetch);
    render(createElement(AuthForm, { mode: 'login' }));
    await screen.findByText('Your account');
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/auth/session',
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });
});
