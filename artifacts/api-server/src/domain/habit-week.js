/**
 * @typedef {{date: string, status: string | null, timing: string, occurrences: {questId: string, status: string}[]}} HabitDay
 */

/**
 * @param {HabitDay[]} days
 * @param {string} [questId]
 * @returns {{scheduled: number, completed: number, compliance: number | null}}
 */
export function summarizeWeekCompliance(days, questId) {
  const scheduled = days
    .filter(({ timing }) => timing === 'elapsed')
    .flatMap(({ occurrences }) => occurrences)
    .filter((item) => questId === undefined || item.questId === questId);
  const completed = scheduled.filter(
    ({ status }) => status === 'COMPLETED',
  ).length;
  return {
    scheduled: scheduled.length,
    completed,
    compliance: scheduled.length ? completed / scheduled.length : null,
  };
}

function cellLabel(day, item) {
  if (day.status === 'REST') return 'Rest';
  if (day.status === 'EXCUSED') return 'Excused';
  if (!item) return 'Not scheduled';
  if (item.status === 'COMPLETED') return 'Completed';
  if (day.timing === 'elapsed') return 'Missed';
  return day.timing === 'today' ? 'Pending' : 'Scheduled';
}

/**
 * @param {HabitDay[]} days
 * @param {string} questId
 * @returns {{completionRate: number | null, cells: {date: string, label: string}[]}}
 */
export function summarizeHabitWeek(days, questId) {
  return {
    completionRate: summarizeWeekCompliance(days, questId).compliance,
    cells: days.map((day) => ({
      date: day.date,
      label: cellLabel(
        day,
        day.occurrences.find((item) => item.questId === questId),
      ),
    })),
  };
}
