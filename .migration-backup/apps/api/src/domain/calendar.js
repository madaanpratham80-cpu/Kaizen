import { Temporal } from '@js-temporal/polyfill';
/**
 * @param {Date} value
 * @returns {Temporal.PlainDate}
 */
export const plainDate = (value) =>
  Temporal.PlainDate.from(value.toISOString().slice(0, 10));
/**
 * @param {Date} instant
 * @param {string} timezone
 * @returns {Temporal.PlainDate}
 */
export function localDateAt(instant, timezone) {
  return Temporal.Instant.fromEpochMilliseconds(instant.getTime())
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
}
/**
 * @param {Temporal.PlainDate} date
 * @returns {Date}
 */
export function dateColumn(date) {
  return new Date(`${date.toString()}T00:00:00.000Z`);
}
/**
 * @param {Temporal.PlainDate} date
 * @param {string} timezone
 * @returns {{startsAtUtc: Date, deadlineUtc: Date}}
 */
export function dayBounds(date, timezone) {
  return {
    startsAtUtc: new Date(date.toZonedDateTime(timezone).epochMilliseconds),
    deadlineUtc: new Date(
      date.add({ days: 1 }).toZonedDateTime(timezone).epochMilliseconds,
    ),
  };
}
/**
 * @param {Temporal.PlainDate} last
 * @param {Date} deadline
 * @param {string} timezone
 * @returns {{firstNewDate: Date, effectiveAt: Date}}
 */
export function firstTransitionDate(last, deadline, timezone) {
  let next = last.add({ days: 1 });
  for (;;) {
    const { startsAtUtc, deadlineUtc } = dayBounds(next, timezone);
    if (startsAtUtc >= deadline && deadlineUtc > startsAtUtc) {
      return { firstNewDate: dateColumn(next), effectiveAt: startsAtUtc };
    }
    next = next.add({ days: 1 });
  }
}
