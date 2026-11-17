'use client';

import { useState } from 'react';
import {
  createQuestSchema,
  editQuestSchema,
  questCategorySchema,
  questDifficultySchema,
} from '@kaizen/contracts';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const inputStyle = 'block w-full border border-current bg-white p-2';

/** @typedef {Awaited<ReturnType<typeof import('../../../api/client.js').screenApi.quests>>['quests'][number]} Quest */
/** @typedef {import('@kaizen/contracts').z.infer<typeof editQuestSchema>} QuestEdit */
/** @typedef {import('@kaizen/contracts').z.infer<typeof createQuestSchema>} QuestCreate */

/** @param {string} isoDate */
function dayAfter(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** @param {string} timezone */
function localTomorrow(timezone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  return dayAfter(`${parts.year}-${parts.month}-${parts.day}`);
}

/**
 * @param {{quest?: Quest, timezone: string, pending: boolean, onSave: (input: QuestCreate | QuestEdit) => void, onCancel: () => void}} props
 */
export function QuestForm({ quest, timezone, pending, onSave, onCancel }) {
  const schedule = quest?.schedules[0];
  const [recurrence, setRecurrence] = useState(schedule?.recurrence ?? 'DAILY');
  const [error, setError] = useState('');
  const tomorrow = localTomorrow(timezone);
  const afterCurrent =
    schedule && dayAfter(schedule.effectiveFrom.slice(0, 10));
  const minDate =
    afterCurrent && afterCurrent > tomorrow ? afterCurrent : tomorrow;

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  function submit(event) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const input = {
      title: form.get('title'),
      category: form.get('category'),
      difficulty: form.get('difficulty'),
      target: Number(form.get('target')),
      effectiveFrom: form.get('effectiveFrom'),
      recurrence:
        recurrence === 'WEEKLY'
          ? { kind: recurrence, weekdays: form.getAll('weekdays').map(Number) }
          : { kind: recurrence },
      ...(quest && { expectedVersion: quest.version }),
    };
    const parsed = (quest ? editQuestSchema : createQuestSchema).safeParse(
      input,
    );
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(
        issue.path.includes('weekdays')
          ? 'Select at least one weekday.'
          : `Check ${issue.path.join(' ') || 'the quest details'}. ${issue.message}`,
      );
      return;
    }
    setError('');
    onSave(parsed.data);
  }

  return (
    <form
      aria-label={quest ? 'Edit quest' : 'New quest'}
      onSubmit={submit}
      aria-busy={pending}
      className="space-y-3"
    >
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <label>
          Title
          <input
            name="title"
            className={inputStyle}
            required
            maxLength={120}
            defaultValue={quest?.title ?? ''}
          />
        </label>
        <label>
          Category
          <select
            name="category"
            className={inputStyle}
            defaultValue={quest?.category ?? questCategorySchema.options[0]}
          >
            {questCategorySchema.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            name="difficulty"
            className={inputStyle}
            defaultValue={schedule?.difficulty ?? 'EASY'}
          >
            {questDifficultySchema.options.map((option) => (
              <option key={option} value={option}>
                {option.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target
          <input
            type="number"
            name="target"
            min="0"
            step="1"
            className={inputStyle}
            required
            defaultValue={schedule?.target ?? 1}
          />
        </label>
        <label>
          Recurrence
          <select
            name="recurrence"
            aria-label="Quest recurrence"
            className={inputStyle}
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value)}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </label>
        <label>
          Effective date
          <input
            type="date"
            name="effectiveFrom"
            className={inputStyle}
            required
            min={minDate}
            defaultValue={minDate}
          />
        </label>
        {recurrence === 'WEEKLY' && (
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="font-semibold">Scheduled weekdays</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {WEEKDAYS.map((name, index) => (
                <label key={name} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={index + 1}
                    defaultChecked={
                      schedule?.weekdays.includes(index + 1) ?? false
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </fieldset>
      <div className="flex gap-4">
        <button className="auth-button" type="submit" disabled={pending}>
          {pending ? 'Saving…' : quest ? 'Save changes' : 'Create quest'}
        </button>
        <button
          className="underline"
          type="button"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
