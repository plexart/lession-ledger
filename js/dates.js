// Local-date helpers using ISO "YYYY-MM-DD" strings (no time zone shifts).

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function weekdayOfDate(iso) {
  return parseISODate(iso).getDay();
}

/**
 * Orders lesson weekdays as one "lesson week": picks the starting weekday that gives the
 * shortest span, so [6, 0] (Sat, Sun) starts on Saturday and [5, 6] starts on Friday.
 * @returns {{start: number, offsets: Map<number, number>}}
 */
export function lessonWeek(weekdays) {
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  let best = null;
  for (const start of unique) {
    const span = Math.max(...unique.map((w) => (w - start + 7) % 7));
    if (!best || span < best.span) best = { start, span };
  }
  const offsets = new Map(unique.map((w) => [w, (w - best.start + 7) % 7]));
  return { start: best.start, span: best.span, offsets };
}

/**
 * Default date for each lesson weekday: the lesson week that is in progress today,
 * otherwise the next one. E.g. for Fri/Sat: Thu -> coming Fri/Sat, Sat -> yesterday/today.
 * @returns {Map<number, string>} weekday -> ISO date
 */
export function defaultLessonDates(weekdays, today = new Date()) {
  const result = new Map();
  if (!weekdays.length) return result;
  const { start, span, offsets } = lessonWeek(weekdays);
  const todayISO = toISODate(today);
  const sinceStart = (today.getDay() - start + 7) % 7;
  const anchor = sinceStart <= span ? addDays(todayISO, -sinceStart) : addDays(todayISO, 7 - sinceStart);
  for (const [w, offset] of offsets) result.set(w, addDays(anchor, offset));
  return result;
}
