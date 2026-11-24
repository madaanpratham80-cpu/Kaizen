// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HealthBar,
  QuestCard,
  SealBadge,
  StreakBadge,
  XPMeter,
} from './components.jsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HealthBar', () => {
  it.each([
    [0, 'Fading'],
    [39, 'Fading'],
    [40, 'Tired'],
    [69, 'Tired'],
    [70, 'Healthy'],
    [100, 'Healthy'],
  ])('labels %i%% as %s and exposes an accessible meter', (health, label) => {
    render(createElement(HealthBar, { health }));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(`Health ${health}%`)).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Health' }).value).toBe(health);
  });

  it('shows unavailable health without a meter', () => {
    render(createElement(HealthBar));
    expect(screen.getByText('Health percentage unavailable')).toBeTruthy();
    expect(screen.queryByRole('meter')).toBeNull();
  });
});

describe('XPMeter', () => {
  it('labels progress within a level, including a zero after leveling up', () => {
    const { rerender } = render(
      createElement(XPMeter, { level: 1, xpIntoLevel: 99 }),
    );
    expect(screen.getByText('XP · Level 1')).toBeTruthy();
    expect(
      screen.getByRole('meter', { name: 'XP toward next level' }).value,
    ).toBe(99);
    rerender(createElement(XPMeter, { level: 2, xpIntoLevel: 0 }));
    expect(screen.getByText('XP toward next level 0%')).toBeTruthy();
    rerender(createElement(XPMeter, { level: 2 }));
    expect(screen.getByText('XP toward next level unavailable')).toBeTruthy();
  });
});

describe('StreakBadge', () => {
  it('labels the milestone denominator and handles its absence', () => {
    const { rerender } = render(
      createElement(StreakBadge, { days: 7, milestoneDays: 7 }),
    );
    expect(screen.getByText('Streak · 7 days')).toBeTruthy();
    expect(screen.getByText('7-day milestone 100%')).toBeTruthy();
    rerender(createElement(StreakBadge, { days: 1, milestoneDays: 0 }));
    expect(screen.getByText('Streak · 1 day')).toBeTruthy();
    expect(screen.getByText('Streak milestone unavailable')).toBeTruthy();
  });
});

describe('SealBadge', () => {
  it('shows the named seal, earned XP, and binary or milestone percentages', () => {
    const title = 'Iron Will';
    const { rerender } = render(
      createElement(SealBadge, { title, earned: true, bonusXp: 25 }),
    );
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText('Earned · 25 XP')).toBeTruthy();
    expect(screen.getByText('Seal earned 100%')).toBeTruthy();
    rerender(createElement(SealBadge, { title, earned: false }));
    expect(screen.getByText('Seal earned 0%')).toBeTruthy();
    rerender(
      createElement(SealBadge, {
        title,
        earned: false,
        progress: 25,
        threshold: 100,
      }),
    );
    expect(screen.getByText('Seal milestone 25%')).toBeTruthy();
  });
});

describe('QuestCard', () => {
  it('distinguishes measured target progress, binary completion and unavailable values', () => {
    const title = 'Read a chapter';
    const { rerender } = render(
      createElement(QuestCard, {
        title,
        status: 'PENDING',
        target: 10,
        completedCount: 5,
        difficulty: 'EASY',
        rewardXp: 10,
      }),
    );
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText('EASY · 10 XP')).toBeTruthy();
    expect(screen.getByText('Quest target progress 50%')).toBeTruthy();
    rerender(createElement(QuestCard, { title, status: 'COMPLETED' }));
    expect(screen.getByText('Quest completion 100%')).toBeTruthy();
    rerender(createElement(QuestCard, { title }));
    expect(screen.getByText('Quest completion unavailable')).toBeTruthy();
  });
});

it('renders all shared values immediately with reduced motion enabled', () => {
  vi.stubGlobal('matchMedia', (media) => ({
    media,
    matches: media.includes('reduced-motion'),
  }));
  const { container } = render([
    createElement(HealthBar, { key: 'health', health: 70 }),
    createElement(XPMeter, { key: 'xp', xpIntoLevel: 20 }),
    createElement(StreakBadge, { key: 'streak', days: 2, milestoneDays: 4 }),
    createElement(SealBadge, {
      key: 'seal',
      title: 'First seal',
      earned: true,
    }),
    createElement(QuestCard, {
      key: 'quest',
      title: 'First quest',
      status: 'PENDING',
    }),
  ]);
  for (const label of [
    'Health 70%',
    'XP toward next level 20%',
    '4-day milestone 50%',
    'Seal earned 100%',
    'Quest completion 0%',
  ]) {
    expect(screen.getByText(label)).toBeTruthy();
  }
  expect(container.querySelector('[style]')).toBeNull();
});
