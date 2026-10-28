// Fee calculation. Amounts are summed in integer cents to avoid floating point drift.

/** Per-attendee share of a session in cents; 0 when nobody attended. */
export function shareCents(session) {
  const n = session.attendees.length;
  return n ? Math.round((Number(session.fee) * 100) / n) : 0;
}

/** Total charged for sessions in cents; sessions nobody attended are not charged. */
export function totalCents(sessions) {
  return sessions.reduce((sum, s) => sum + (s.attendees.length ? Math.round(Number(s.fee) * 100) : 0), 0);
}

export function inRange(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}

/**
 * Totals per student over sessions within [from, to] (ISO dates, both optional).
 * @returns {Map<string, {cents: number, attended: number, leave: number}>}
 */
export function studentTotals(sessions, { from, to } = {}) {
  const totals = new Map();
  const get = (name) => {
    if (!totals.has(name)) totals.set(name, { cents: 0, attended: 0, leave: 0 });
    return totals.get(name);
  };
  for (const s of sessions) {
    if (!inRange(s.date, from, to)) continue;
    const share = shareCents(s);
    for (const name of s.attendees) {
      const entry = get(name);
      entry.cents += share;
      entry.attended += 1;
    }
    for (const name of s.absentees) get(name).leave += 1;
  }
  return totals;
}

/** Formats cents as a plain number string: "250" or "214.29". */
export function formatAmount(cents) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
