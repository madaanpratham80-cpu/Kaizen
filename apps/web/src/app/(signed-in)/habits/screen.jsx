'use client';

import { useCallback, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';

/** @param {string} timezone */
function initialWeek(timezone) {
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
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const cellColor = {
  Completed: 'bg-tertiary text-on-tertiary',
  Missed: 'bg-primary-container text-on-primary-fixed',
  Rest: 'bg-surface-container-high text-secondary',
  Excused: 'bg-surface-container-high text-secondary',
  'Not scheduled': 'text-outline',
  Pending: 'border border-outline-variant text-primary',
  Scheduled: 'border border-surface-bright text-secondary',
};

/** @param {{session: import('../../../api/session-screen.jsx').ScreenSession, scope: import('../../../api/session-screen.jsx').SessionScope, revision: number}} props */
function HabitsContent({ session, scope, revision }) {
  const [week, setWeek] = useState(() => initialWeek(session.user.timezone));
  const read = useCallback((signal) => screenApi.habits(week, signal), [week]);
  const { data, state, retry } = useCalendarRead(
    session,
    scope,
    revision,
    `habits:${week}`,
    read,
  );
  return (
    <div>
      <label className="flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-bright bg-surface-container-lowest px-space-md py-space-md font-label-mono-md text-label-mono-md text-secondary uppercase sm:px-space-lg">
        Week starting
        <input
          type="date"
          value={week}
          required
          className="max-w-full border border-outline-variant bg-surface-container-low px-space-sm py-space-sm text-on-surface scheme-dark focus-visible:outline-primary!"
          onChange={(event) => {
            if (event.target.value) setWeek(event.target.value);
          }}
        />
      </label>
      {state && (
        <div className="px-space-md py-space-md sm:px-space-lg">
          <ScreenNotice
            state={state}
            retry={state === 'loading' ? undefined : retry}
          />
        </div>
      )}
      {data && (
        <>
          <div className="border-b border-surface-bright bg-secondary-fixed px-space-md py-space-lg text-on-secondary-fixed sm:px-space-lg">
            <p className="font-label-mono-md text-label-mono-md uppercase">
              Weekly completion rate:
            </p>
            <p className="mt-space-xs font-display-lg text-display-lg-mobile tabular-nums">
              {data.compliance === null
                ? 'unavailable'
                : `${Math.round(data.compliance * 100)}%`}
            </p>
            <p className="mt-space-sm font-label-mono-sm text-label-mono-sm text-on-secondary-fixed-variant">
              {data.completed} of {data.scheduled} elapsed scheduled quests
              completed
            </p>
          </div>
          {!data.habits.length ? (
            <div className="px-space-md py-space-lg sm:px-space-lg">
              <ScreenNotice state="empty" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[50rem] border-collapse text-left">
                <caption className="border-b border-surface-bright bg-surface-container px-space-md py-space-sm text-left font-label-mono-md text-label-mono-md text-secondary sm:px-space-lg">
                  Habit schedule for {data.week}. Rates include elapsed
                  scheduled dates.
                </caption>
                <thead className="bg-surface-container-low font-label-mono-sm text-label-mono-sm text-primary uppercase">
                  <tr>
                    <th
                      scope="col"
                      className="border border-surface-bright px-space-sm py-space-md"
                    >
                      Habit
                    </th>
                    {data.days.map((day) => (
                      <th
                        scope="col"
                        key={day.date}
                        className="border border-surface-bright px-space-sm py-space-md"
                      >
                        {day.date}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="border border-surface-bright px-space-sm py-space-md"
                    >
                      Streaks and rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.habits.map((habit) => (
                    <tr
                      key={habit.questId}
                      className="odd:bg-surface-container-lowest even:bg-surface-container-low"
                    >
                      <th
                        scope="row"
                        className="border border-surface-bright px-space-md py-space-md font-headline-sm text-headline-sm"
                      >
                        {habit.title}
                      </th>
                      {habit.cells.map(({ date, label }) => (
                        <td
                          key={date}
                          className="border border-surface-bright p-space-xs text-center"
                        >
                          <span
                            className={`inline-block px-space-xs py-space-xs font-label-mono-sm text-label-mono-sm ${cellColor[label] ?? ''}`}
                          >
                            {label}
                          </span>
                        </td>
                      ))}
                      <td className="space-y-space-xs border border-surface-bright px-space-sm py-space-md font-label-mono-sm text-label-mono-sm">
                        <p>
                          Current {habit.streak.current} · Best{' '}
                          {habit.streak.best}
                        </p>
                        <p>
                          Completion rate:{' '}
                          {habit.completionRate === null
                            ? 'unavailable'
                            : `${Math.round(habit.completionRate * 100)}%`}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function HabitsScreen() {
  return (
    <main className="min-w-0 border border-surface-bright bg-surface font-body-md text-body-md text-on-surface">
      <header className="border-b border-surface-bright bg-surface-container-low px-space-md py-space-lg sm:p-space-lg">
        <p className="mb-space-sm inline-block bg-primary-container px-space-sm py-space-xs font-label-mono-sm text-label-mono-sm text-on-primary-container uppercase">
          Weekly habit matrix
        </p>
        <h1 className="font-display-xl text-display-xl-mobile uppercase sm:text-display-xl">
          Habits
        </h1>
      </header>
      <SessionScreen>
        {(session, scope, revision) => (
          <HabitsContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
