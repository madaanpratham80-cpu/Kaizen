// @vitest-environment jsdom
import { createElement, StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterFeedback } from './character-feedback.jsx';
import { setFeedbackSession } from './feedback-session.js';

const gsap = vi.hoisted(() => ({ set: vi.fn(), timeline: vi.fn() }));
vi.mock('gsap', () => ({ gsap }));

const snapshot = (stateVersion, health, totalXp) => ({
  stateVersion,
  health,
  totalXp,
});
const start = snapshot(0, 71, 70);
const seal = (code) => ({ code, ruleVersion: 1, bonusXp: 25 });
function commit(stateVersion, health, totalXp, seals = []) {
  return {
    ...snapshot(stateVersion, health, totalXp),
    status: 'completed',
    seals,
    eventIds: [
      `completion-${stateVersion}`,
      ...seals.map(({ code }) => `event-${code}`),
    ],
  };
}
const props = { sessionId: 'session-one', snapshot: start };
const element = ({ completion, ...overrides } = {}) =>
  createElement(CharacterFeedback, {
    ...props,
    ...overrides,
    completion: completion && {
      sessionId: props.sessionId,
      result: completion,
    },
  });
let media;
let timelines;

beforeEach(() => {
  vi.clearAllMocks();
  setFeedbackSession(null);
  const listeners = new Set();
  media = {
    matches: false,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    change(next) {
      this.matches = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
  vi.stubGlobal('matchMedia', () => media);
  timelines = [];
  gsap.timeline.mockImplementation(() => {
    const timeline = { to: vi.fn(), kill: vi.fn() };
    timeline.to.mockReturnValue(timeline);
    timelines.push(timeline);
    return timeline;
  });
});
afterEach(() => {
  cleanup();
  setFeedbackSession(null);
  vi.unstubAllGlobals();
});

describe('character feedback', () => {
  it('changes health bands in both directions and leaves ordinary refetches static', () => {
    const { rerender, container } = render(element());
    for (const [version, health, label] of [
      [1, 70, 'Healthy'],
      [2, 69, 'Tired'],
      [3, 40, 'Tired'],
      [4, 39, 'Fading'],
      [5, 40, 'Tired'],
      [6, 69, 'Tired'],
      [7, 70, 'Healthy'],
    ]) {
      rerender(element({ snapshot: snapshot(version, health, 100) }));
      expect(screen.getByText(label)).toBeTruthy();
      expect(
        container.querySelector('[data-health-band]').dataset.healthBand,
      ).toBe(label.toLowerCase());
      expect(
        screen
          .getByRole('meter', { name: 'Health' })
          .getAttribute('aria-valuenow'),
      ).toBe(String(health));
    }
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it('uses a 400 ms timeline for committed values and interrupts it only for newer data', () => {
    const { rerender, unmount } = render(element());
    const first = commit(1, 40, 85);
    rerender(element({ completion: first }));
    expect(gsap.timeline).toHaveBeenCalledExactlyOnceWith({
      defaults: { duration: 0.4, ease: 'power2.out' },
    });
    expect(
      timelines[0].to.mock.calls.map(([, options, position]) => [
        options.scaleX,
        position,
      ]),
    ).toEqual([
      [0.4, 0],
      [0.85, 0],
    ]);
    rerender(element({ snapshot: snapshot(1, 40, 85) }));
    rerender(element({ completion: commit(0, 71, 70) }));
    rerender(element({ completion: { ...first } }));
    expect(timelines[0].kill).not.toHaveBeenCalled();
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Health 40%')).toBeTruthy();

    rerender(element({ completion: commit(2, 39, 110) }));
    expect(timelines[0].kill).toHaveBeenCalledTimes(1);
    expect(timelines[1].to.mock.calls[1][1]).toEqual({ scaleX: 0.1 });
    expect(screen.getByText('Level 2 · 110 XP')).toBeTruthy();
    unmount();
    expect(timelines[1].kill).toHaveBeenCalledTimes(1);
  });

  it('cancels active motion immediately when preferences change and never restarts it', () => {
    const { rerender } = render(element());
    rerender(element({ completion: commit(1, 65, 95) }));
    media.change(true);
    expect(timelines[0].kill).toHaveBeenCalledTimes(1);
    expect(gsap.set.mock.calls.at(-2)[1]).toEqual({ scaleX: 0.65 });
    expect(screen.getByText('Tired')).toBeTruthy();
    media.change(false);
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
  });

  it('cleans up on session replacement and does not carry old progression or reveals into the new session', async () => {
    const { rerender } = render(element());
    rerender(element({ completion: commit(1, 35, 95, [seal('iron-will')]) }));
    expect(await screen.findByText('Iron Will')).toBeTruthy();
    rerender(
      element({
        sessionId: 'session-two',
        snapshot: start,
        completion: commit(2, 35, 95, [seal('iron-will')]),
      }),
    );
    expect(timelines[0].kill).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Iron Will')).toBeNull();
    expect(screen.getByText('Health 71%')).toBeTruthy();
    expect(
      window.sessionStorage.getItem('kaizen.feedback.session-one'),
    ).toBeNull();
  });

  it('reveals each event once in Strict Mode, restores storage on remount, and uses static seal text in reduced motion', async () => {
    media.matches = true;
    const first = commit(1, 69, 95, [seal('iron-will')]);
    const second = commit(2, 70, 120, [
      seal('hundred-gates'),
      seal('seven-day-warrior'),
    ]);
    const wrap = (completion) =>
      createElement(StrictMode, null, element({ completion }));
    const { rerender, unmount } = render(wrap(first));
    expect(await screen.findByText('Iron Will')).toBeTruthy();
    expect(screen.getByText('· 25 XP earned')).toBeTruthy();
    rerender(wrap(second));
    expect(await screen.findByText('Hundred Gates')).toBeTruthy();
    expect(screen.getByText('Seven-Day Warrior')).toBeTruthy();
    rerender(wrap({ ...second }));
    expect(screen.getAllByText('Hundred Gates')).toHaveLength(1);
    expect(gsap.timeline).not.toHaveBeenCalled();
    const key = 'kaizen.feedback.session-one';
    const saved = window.sessionStorage.getItem(key);
    expect(JSON.parse(saved)).toEqual([...first.eventIds, ...second.eventIds]);

    unmount();
    setFeedbackSession(null);
    window.sessionStorage.setItem(key, saved);
    const returned = render(wrap(second));
    await act(async () => {});
    expect(screen.queryByText('Hundred Gates')).toBeNull();
    expect(screen.queryByText('Seven-Day Warrior')).toBeNull();
    returned.rerender(element({ sessionId: null }));
    await waitFor(() => expect(window.sessionStorage.getItem(key)).toBeNull());
  });

  it('renders a known completion replay immediately even when its version is ahead of the initial snapshot', () => {
    const first = commit(1, 65, 95);
    const mounted = render(element({ completion: first }));
    mounted.unmount();
    const second = render(element());
    second.rerender(element({ completion: first }));
    expect(gsap.timeline).not.toHaveBeenCalled();
    expect(screen.getByText('Health 65%')).toBeTruthy();
  });
});
