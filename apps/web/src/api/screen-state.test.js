// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScreenState } from './screen-state.jsx';

afterEach(cleanup);

describe('shared screen state', () => {
  it.each([
    ['loading', 'status', 'Loading…'],
    ['empty', 'status', 'Nothing to show yet.'],
    ['error', 'alert', 'Could not load this screen. Try again.'],
    ['expired-session', 'alert', 'Your session expired. Log in to continue.'],
    ['catching-up', 'status', 'Catching up on your calendar…'],
    ['offline', 'status', 'You’re offline. Reconnect to try again.'],
  ])(
    'renders the %s label with the appropriate announcement role',
    (state, role, label) => {
      render(createElement(ScreenState, { state }));

      expect(screen.getByRole(role).textContent).toBe(label);
    },
  );
});
