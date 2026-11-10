// Locale-aware formatting shared by views.

import { t, raw } from './i18n.js';
import { makeWeekdayLookup, timeRangeMinutes } from './parse.js';
import { formatAmount } from './fees.js';
import { weekdayOfDate, lessonWeek } from './dates.js';
import { store } from './store.js';

export function weekdayName(weekday) {
  return raw('weekdays')[weekday];
}

export function weekdayLookup() {
  return makeWeekdayLookup(raw('weekdays'), raw('weekdayAliases'));
}

export function headerKeywords() {
  return raw('parse.headerKeywords');
}

export function money(cents) {
  return t('money', { amount: formatAmount(cents) });
}

/** "10-30 周五" style label for an ISO date. */
export function dateLabel(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return t('date.label', { month: m, day: d, weekday: weekdayName(weekdayOfDate(iso)) });
}

/** Translates a parse error/warning object ({code, line, ...}) into a message. */
export function issueText(issue) {
  return t(`issue.${issue.code}`, issue);
}

/** Orders subjects by position in the lesson week, then by start time. */
export function sortSubjects(subjects) {
  if (!subjects.length) return [];
  const { offsets } = lessonWeek(subjects.map((s) => s.weekday));
  const startOf = (s) => timeRangeMinutes(s.time)?.[0] ?? 0;
  return [...subjects].sort((a, b) =>
    offsets.get(a.weekday) - offsets.get(b.weekday) || startOf(a) - startOf(b));
}

/** "周五 18:30-20:00" */
export function scheduleLabel(subject) {
  return `${weekdayName(subject.weekday)} ${subject.time}`;
}

/** Sorts names by roster order; names no longer on the roster go last. */
export function rosterOrder(names) {
  const index = new Map(store.data.students.map((s, i) => [s.name, i]));
  const pos = (n) => index.get(n) ?? Infinity;
  return [...names].sort((a, b) => pos(a) - pos(b));
}
