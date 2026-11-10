import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLessonDates, lessonWeek, addDays, toISODate, monthRange, latestWeekRange } from '../js/dates.js';

// 2026-10-29 is a Thursday.
const day = (iso) => new Date(`${iso}T12:00:00`);
const fmt = (map) => Object.fromEntries(map);

test('Fri/Sat defaults to the lesson week in progress or the next one', () => {
  assert.deepEqual(fmt(defaultLessonDates([5, 6], day('2026-10-29'))), { 5: '2026-10-30', 6: '2026-10-31' });
  assert.deepEqual(fmt(defaultLessonDates([5, 6], day('2026-10-30'))), { 5: '2026-10-30', 6: '2026-10-31' });
  assert.deepEqual(fmt(defaultLessonDates([5, 6], day('2026-10-31'))), { 5: '2026-10-30', 6: '2026-10-31' });
  assert.deepEqual(fmt(defaultLessonDates([5, 6], day('2026-11-01'))), { 5: '2026-11-06', 6: '2026-11-07' });
});

test('weekend spanning Sunday starts on Saturday', () => {
  assert.equal(lessonWeek([0, 6]).start, 6);
  assert.deepEqual(fmt(defaultLessonDates([6, 0], day('2026-11-01'))), { 6: '2026-10-31', 0: '2026-11-01' });
});

test('addDays crosses month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(toISODate(new Date(2026, 0, 5)), '2026-01-05');
});

test('monthRange', () => {
  assert.deepEqual(monthRange(day('2026-11-10')), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(monthRange(day('2026-01-15'), -1), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(monthRange(day('2028-03-31'), -1), { from: '2028-02-01', to: '2028-02-29' });
});

test('latestWeekRange spans the batch of the latest session', () => {
  const sessions = [
    { date: '2026-10-30', batchId: 'a' },
    { date: '2026-11-06', batchId: 'b' },
    { date: '2026-11-07', batchId: 'b' },
    { date: '2026-10-31', batchId: 'a' },
  ];
  assert.deepEqual(latestWeekRange(sessions), { from: '2026-11-06', to: '2026-11-07' });
  assert.deepEqual(latestWeekRange([{ date: '2026-11-06', batchId: null }]), { from: '2026-11-06', to: '2026-11-06' });
  assert.equal(latestWeekRange([]), null);
});
