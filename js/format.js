// Locale-aware formatting shared by views.

import { t, raw } from './i18n.js';
import { makeWeekdayLookup } from './parse.js';
import { formatAmount } from './fees.js';
import { weekdayOfDate } from './dates.js';

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
