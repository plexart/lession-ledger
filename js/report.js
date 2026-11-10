// Shareable reports (student history, session list) over a date range. A report is a plain
// model rendered either as text (reportText) or as an image (share.js reportImage).
//
// Model: { title, period, summary, count, groups: [{ heading, rows: [Row] }] }
// Row:   { title, meta, lines: string[], side, tone: 'leave' | 'muted' | null }

import { t } from './i18n.js';
import { inRange, shareCents, studentTotals, totalCents } from './fees.js';
import { money, dateLabel, rosterOrder } from './format.js';

const byDateAsc = (a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1)
  : (a.time ?? '').localeCompare(b.time ?? '', undefined, { numeric: true }));

/** "11月7日", with the year when it differs from `thisYear`. */
function shortDate(iso, thisYear) {
  const [y, m, d] = iso.split('-').map(Number);
  return y === thisYear
    ? t('share.date', { month: m, day: d })
    : t('share.dateWithYear', { year: y, month: m, day: d });
}

/** Human-readable range; either end may be empty (unbounded). */
export function periodLabel({ from, to }, today = new Date()) {
  const year = today.getFullYear();
  if (from && to) {
    if (from === to) return shortDate(from, year);
    return t('share.period', { from: shortDate(from, year), to: shortDate(to, year) });
  }
  if (from) return t('share.periodFrom', { from: shortDate(from, year) });
  if (to) return t('share.periodTo', { to: shortDate(to, year) });
  return t('share.periodAll');
}

function inPeriod(sessions, { from, to }) {
  return sessions.filter((s) => inRange(s.date, from, to)).sort(byDateAsc);
}

/** One student's attendance (and fees, when shown) within the range. */
export function studentReport(name, sessions, { from, to, showFees, today } = {}) {
  const list = inPeriod(
    sessions.filter((s) => s.attendees.includes(name) || s.absentees.includes(name)),
    { from, to },
  );
  const total = studentTotals(list).get(name) ?? { cents: 0, attended: 0, leave: 0 };
  const stats = t('student.stats', { attended: total.attended, leave: total.leave });
  const rows = list.map((s) => {
    const attended = s.attendees.includes(name);
    let side = t('student.leave');
    if (attended) side = showFees ? money(shareCents(s)) : t('student.present');
    return {
      title: `${dateLabel(s.date)} ${s.subject}`,
      meta: s.time || '',
      lines: [],
      side,
      tone: attended ? null : 'leave',
    };
  });
  return {
    title: t('share.studentTitle', { name }),
    period: periodLabel({ from, to }, today),
    summary: list.length
      ? (showFees ? `${stats} · ${t('student.total', { total: money(total.cents) })}` : stats)
      : t('share.empty'),
    count: list.length,
    groups: rows.length ? [{ heading: '', rows }] : [],
  };
}

/** All sessions within the range, grouped by date. */
export function sessionsReport(sessions, { from, to, showFees, today } = {}) {
  const list = inPeriod(sessions, { from, to });
  const sep = t('list.separator');
  const groups = [];
  for (const s of list) {
    const heading = dateLabel(s.date);
    if (groups.at(-1)?.heading !== heading) groups.push({ heading, rows: [] });
    const present = s.attendees.length;
    let side = '';
    if (!present) side = t('session.noAttendees');
    else if (showFees) side = t('share.perPerson', { amount: money(shareCents(s)) });
    groups.at(-1).rows.push({
      title: s.subject,
      meta: [s.time, t('session.attendance', { present, total: present + s.absentees.length })]
        .filter(Boolean).join(' · '),
      lines: [
        present ? rosterOrder(s.attendees).join(sep) : '',
        s.absentees.length ? t('session.leaveNames', { names: s.absentees.join(sep) }) : '',
      ].filter(Boolean),
      side,
      tone: present ? null : 'muted',
    });
  }
  let summary = t('share.empty');
  if (list.length) {
    summary = showFees
      ? t('sessions.summary', { count: list.length, total: money(totalCents(list)) })
      : t('sessions.count', { count: list.length });
  }
  return {
    title: t('share.sessionsTitle'),
    period: periodLabel({ from, to }, today),
    summary,
    count: list.length,
    groups,
  };
}

/** Plain text for pasting into a chat. */
export function reportText(model) {
  const out = [`【${model.title}】`, model.period, model.summary];
  for (const group of model.groups) {
    out.push('');
    if (group.heading) out.push(group.heading);
    for (const row of group.rows) {
      out.push([[row.title, row.meta].filter(Boolean).join(' '), row.side].filter(Boolean).join(' · '));
      for (const line of row.lines) out.push(`  ${line}`);
    }
  }
  return out.join('\n');
}
