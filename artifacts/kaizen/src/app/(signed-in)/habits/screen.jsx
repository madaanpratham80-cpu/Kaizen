'use client';

import { useCallback, useState } from 'react';
import {
  DossierHeader,
  DossierMetric,
  dossierInput,
  dossierLabel,
  dossierPanel,
} from '../dossier.jsx';
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

const displayClass = 'font-(family-name:--font-habits-display)';
const cellTone = {
  Completed: 'bg-tertiary-container text-on-tertiary-container',
  Missed: 'bg-primary-container text-on-primary-container',
  Rest: 'bg-surface-container-high text-secondary',
};
const cellFrame = 'border-r border-b border-outline-variant p-space-sm';
const weekday = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  timeZone: 'UTC',
});

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
    <>
      <div className="flex flex-wrap items-end justify-between gap-space-md border-b border-outline-variant bg-surface-container-low px-space-md py-space-md sm:px-space-lg">
        <label className={dossierLabel}>
          Week starting
          <input
            type="date"
            value={week}
            required
            className={dossierInput}
            onChange={(event) => {
              if (event.target.value) setWeek(event.target.value);
            }}
          />
        </label>
        {data && (
          <p className={`${dossierLabel} text-outline`}>Week of {data.week}</p>
        )}
      </div>
      {state && (
        <div className="border-b border-outline-variant p-space-lg">
          <ScreenNotice
            state={state}
            retry={state === 'loading' ? undefined : retry}
          />
        </div>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-px border-b-2 border-outline-variant bg-outline-variant xl:grid-cols-4">
            <DossierMetric
              valueClass={displayClass}
              label="Habits in view"
              value={data.habits.length}
              tone="neutral"
            />
            <DossierMetric
              valueClass={displayClass}
              label="Elapsed scheduled quests"
              value={data.scheduled}
              tone="signal"
            />
            <DossierMetric
              valueClass={displayClass}
              label="Weekly completion rate"
              value={
                data.compliance === null ? (
                  <span className="text-headline-sm">Unavailable</span>
                ) : (
                  `${Math.round(data.compliance * 100)}%`
                )
              }
              tone="paper"
            />
            <DossierMetric
              valueClass={displayClass}
              label="Quests completed"
              value={data.completed}
              tone="olive"
            />
          </dl>
          {!data.habits.length ? (
            <div className="p-space-lg">
              <ScreenNotice state="empty" />
            </div>
          ) : (
            <div
              className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              tabIndex={0}
              role="region"
              aria-label="Weekly habit matrix"
            >
              <table className="w-full min-w-[55rem] border-collapse text-left">
                <caption
                  className={`border-b border-outline-variant bg-surface-container px-space-md py-space-md text-left text-secondary sm:px-space-lg ${dossierLabel}`}
                >
                  Habit schedule for {data.week}. Rates include elapsed
                  scheduled dates.
                </caption>
                <thead
                  className={`bg-surface-container-low text-outline ${dossierLabel}`}
                >
                  <tr>
                    <th scope="col" className={`${cellFrame} w-1/4`}>
                      Habit
                    </th>
                    {data.days.map((day) => (
                      <th
                        scope="col"
                        key={day.date}
                        className={`${cellFrame} text-center`}
                      >
                        <span className="block text-primary">
                          {weekday.format(new Date(day.date))}
                        </span>
                        <time
                          dateTime={day.date}
                          className="whitespace-nowrap text-label-mono-sm"
                        >
                          {day.date}
                        </time>
                      </th>
                    ))}
                    <th scope="col" className={`${cellFrame} min-w-36`}>
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
                        className={`${cellFrame} ${displayClass} text-headline-sm uppercase [overflow-wrap:anywhere]`}
                      >
                        {habit.title}
                      </th>
                      {habit.cells.map(({ date, label }) => (
                        <td key={date} className={`${cellFrame} text-center`}>
                          <span
                            className={`inline-block px-space-xs py-space-sm font-label-mono-sm text-label-mono-sm uppercase ${cellTone[label] ?? 'bg-surface-container text-secondary'}`}
                          >
                            {label}
                          </span>
                        </td>
                      ))}
                      <td
                        className={`${cellFrame} space-y-space-xs font-label-mono-sm text-label-mono-sm`}
                      >
                        <p className="text-primary">
                          Current {habit.streak.current} · Best{' '}
                          {habit.streak.best}
                        </p>
                        <p className="text-secondary">
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
    </>
  );
}

/** @param {{className?: string}} props */
export function HabitsScreen({ className = '' }) {
  return (
    <main className={`${dossierPanel} ${className}`.trim()}>
      <DossierHeader
        number=".03"
        title="Habits"
        eyebrow="Weekly cadence"
        titleClass={displayClass}
      />
      <SessionScreen>
        {(session, scope, revision) => (
          <HabitsContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
