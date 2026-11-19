import { describe, expect, it } from 'vitest';
import { habitsResponseSchema } from '@kaizen/contracts';
import {
  summarizeHabitWeek,
  summarizeWeekCompliance,
} from '../src/domain/habit-week.js';

const day = (date, status, timing, occurrence) => ({
  date,
  status,
  timing,
  occurrences: occurrence ? [occurrence] : [],
});
const item = (status) => ({ questId: 'reading', status });
describe('habit week presentation', () => {
  it('parses every emitted cell label against the Habits contract', () => {
    const days = [
      day('2026-11-16', 'ACTIVE', 'elapsed', item('COMPLETED')),
      day('2026-11-17', 'ACTIVE', 'elapsed', item('PENDING')),
      day('2026-11-18', 'REST', 'elapsed'),
      day('2026-11-19', 'EXCUSED', 'elapsed'),
      day('2026-11-20', 'EMPTY', 'elapsed'),
      day('2026-11-21', 'OPEN', 'today', item('PENDING')),
      day('2026-11-22', 'SCHEDULED', 'future', item('SCHEDULED')),
    ];
    const summary = summarizeHabitWeek(days, 'reading');
    expect(summary.cells.map(({ label }) => label)).toEqual([
      'Completed',
      'Missed',
      'Rest',
      'Excused',
      'Not scheduled',
      'Pending',
      'Scheduled',
    ]);
    const habit = {
      questId: '09d5a188-cc9f-47d4-8e1e-848c51b51e87',
      title: 'Reading',
      streak: { current: 1, best: 1 },
      ...summary,
    };
    expect(
      habitsResponseSchema.shape.data.shape.habits.element.parse(habit),
    ).toEqual(habit);
  });
  it('uses the same elapsed-date denominator for weekly and per-habit rates', () => {
    const days = [
      day('2026-11-16', 'ACTIVE', 'elapsed', item('COMPLETED')),
      day('2026-11-17', 'ACTIVE', 'elapsed', item('PENDING')),
      day('2026-11-18', 'OPEN', 'today', item('COMPLETED')),
    ];
    expect(summarizeWeekCompliance(days)).toEqual({
      scheduled: 2,
      completed: 1,
      compliance: 0.5,
    });
    expect(summarizeHabitWeek(days, 'reading')).toEqual({
      completionRate: 0.5,
      cells: [
        { date: '2026-11-16', label: 'Completed' },
        { date: '2026-11-17', label: 'Missed' },
        { date: '2026-11-18', label: 'Completed' },
      ],
    });
  });
  it('labels rest and unscheduled dates and leaves a zero-denominator rate unavailable', () => {
    const days = [
      day('2026-11-16', 'REST', 'elapsed'),
      day('2026-11-17', 'EMPTY', 'elapsed'),
      day('2026-11-18', 'OPEN', 'today', item('PENDING')),
      day('2026-11-19', 'SCHEDULED', 'future', item('SCHEDULED')),
    ];
    expect(summarizeHabitWeek(days, 'reading')).toEqual({
      completionRate: null,
      cells: [
        { date: '2026-11-16', label: 'Rest' },
        { date: '2026-11-17', label: 'Not scheduled' },
        { date: '2026-11-18', label: 'Pending' },
        { date: '2026-11-19', label: 'Scheduled' },
      ],
    });
  });
});
