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
  Completed: 'text-health-healthy',
  Missed: 'text-health-fading',
  Rest: 'text-progression-ink',
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
    <div className="space-y-6">
      <label className="block">
        Week starting
        <input
          type="date"
          value={week}
          required
          className="block border bg-white p-2"
          onChange={(event) => {
            if (event.target.value) setWeek(event.target.value);
          }}
        />
      </label>
      {state && (
        <ScreenNotice
          state={state}
          retry={state === 'loading' ? undefined : retry}
        />
      )}
      {data && (
        <>
          <p>
            Weekly completion rate:{' '}
            {data.compliance === null
              ? 'unavailable'
              : `${Math.round(data.compliance * 100)}%`}{' '}
            · {data.completed} of {data.scheduled} elapsed scheduled quests
            completed
          </p>
          {!data.habits.length ? (
            <ScreenNotice state="empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="pb-3 text-left">
                  Habit schedule for {data.week}. Rates include elapsed
                  scheduled dates.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="border p-2">
                      Habit
                    </th>
                    {data.days.map((day) => (
                      <th scope="col" key={day.date} className="border p-2">
                        {day.date}
                      </th>
                    ))}
                    <th scope="col" className="border p-2">
                      Streaks and rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.habits.map((habit) => (
                    <tr key={habit.questId}>
                      <th scope="row" className="border p-2">
                        {habit.title}
                      </th>
                      {habit.cells.map(({ date, label }) => (
                        <td
                          key={date}
                          className={`border p-2 ${cellColor[label] ?? ''}`}
                        >
                          {label}
                        </td>
                      ))}
                      <td className="border p-2">
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
    <main className="space-y-6">
      <h1 className="text-4xl font-bold">Habits</h1>
      <SessionScreen>
        {(session, scope, revision) => (
          <HabitsContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
