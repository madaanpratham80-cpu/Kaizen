// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, it } from 'vitest';
import NotFound from './not-found.jsx';

afterEach(cleanup);

it('renders the 404 incident panel with all five recovery destinations', () => {
  render(createElement(NotFound));

  expect(
    screen.getByRole('heading', { name: '404 Record not found' }),
  ).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(5);
  for (const [name, href] of [
    ['Return to Today’s Ledger', '/today'],
    ['Quests', '/quests'],
    ['Habits', '/habits'],
    ['Progress', '/progress'],
    ['Profile', '/profile'],
  ]) {
    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  }
});
