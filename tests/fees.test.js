import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareCents, studentTotals, formatAmount } from '../js/fees.js';

const session = (date, attendees, absentees = [], fee = 1500) => ({ date, fee, attendees, absentees });

test('fee is split among actual attendees', () => {
  assert.equal(shareCents(session('2026-10-30', ['a', 'b', 'c', 'd'], ['e'])), 37500);
  assert.equal(shareCents(session('2026-10-30', ['a', 'b', 'c', 'd', 'e', 'f', 'g'])), 21429);
  assert.equal(shareCents(session('2026-10-30', [], ['a'])), 0);
});

test('studentTotals sums shares and counts leave within a date range', () => {
  const sessions = [
    session('2026-10-30', ['a', 'b'], ['c']),
    session('2026-10-31', ['a', 'c']),
    session('2026-11-06', ['a'], [], 1000),
  ];
  const all = studentTotals(sessions);
  assert.deepEqual(all.get('a'), { cents: 250000, attended: 3, leave: 0 });
  assert.deepEqual(all.get('c'), { cents: 75000, attended: 1, leave: 1 });
  const oct = studentTotals(sessions, { to: '2026-10-31' });
  assert.equal(oct.get('a').cents, 150000);
});

test('formatAmount', () => {
  assert.equal(formatAmount(37500), '375');
  assert.equal(formatAmount(21429), '214.29');
});
