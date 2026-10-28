import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLessonDates, lessonWeek, addDays, toISODate } from '../js/dates.js';

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
