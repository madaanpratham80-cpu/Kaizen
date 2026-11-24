import { Temporal } from '@js-temporal/polyfill';
import { expect, it } from 'vitest';
import { dayBounds, firstTransitionDate } from '../src/domain/calendar.js';
it.each([
  ['UTC', '2026-11-16', '2026-11-16T00:00:00.000Z', '2026-11-17T00:00:00.000Z'],
  [
    'Asia/Kolkata',
    '2026-11-16',
    '2026-11-15T18:30:00.000Z',
    '2026-11-16T18:30:00.000Z',
  ],
  [
    'America/New_York',
    '2026-03-08',
    '2026-03-08T05:00:00.000Z',
    '2026-03-09T04:00:00.000Z',
  ],
  [
    'America/New_York',
    '2026-11-01',
    '2026-11-01T04:00:00.000Z',
    '2026-11-02T05:00:00.000Z',
  ],
])(
  'day-materialization-calendar resolves %s %s from local midnights',
  (zone, date, start, end) => {
    expect(dayBounds(Temporal.PlainDate.from(date), zone)).toEqual({
      startsAtUtc: new Date(start),
      deadlineUtc: new Date(end),
    });
  },
);
it.each([
  ['Asia/Kolkata', '2026-11-18', '2026-11-17T18:30:00.000Z'],
  ['America/Los_Angeles', '2026-11-17', '2026-11-17T08:00:00.000Z'],
])('selects the first eligible successor for %s', (timezone, date, starts) => {
  expect(
    firstTransitionDate(
      Temporal.PlainDate.from('2026-11-16'),
      new Date('2026-11-17Z'),
      timezone,
    ),
  ).toEqual({
    firstNewDate: new Date(`${date}T00:00:00Z`),
    effectiveAt: new Date(starts),
  });
});
