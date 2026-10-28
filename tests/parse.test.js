import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStudents, parseSchedule, checkRoster, makeWeekdayLookup, timeRangeMinutes,
  formatStudents, formatSchedule,
} from '../js/parse.js';
import { STUDENTS_TEXT, SCHEDULE_TEXT, HEADER_KEYWORDS, WEEKDAYS } from './fixtures.js';

const weekdayOf = makeWeekdayLookup(WEEKDAYS, { 星期五: 5 });

test('parses the sample student list', () => {
  const { students, errors } = parseStudents(STUDENTS_TEXT, { headerKeywords: HEADER_KEYWORDS });
  assert.deepEqual(errors, []);
  assert.equal(students.length, 15);
  assert.deepEqual(students[2], { name: '陈思远', subjects: ['语文', '生物'] });
});

test('parses the sample schedule', () => {
  const { subjects, errors } = parseSchedule(SCHEDULE_TEXT, { headerKeywords: HEADER_KEYWORDS, weekdayOf });
  assert.deepEqual(errors, []);
  assert.equal(subjects.length, 5);
  assert.deepEqual(subjects[3], { name: '语文', weekday: 6, time: '8:00-9:30' });
});

test('accepts tabs, full-width separators and spaced time ranges', () => {
  const { students } = parseStudents('张三\t语文， 数学、英语', { headerKeywords: HEADER_KEYWORDS });
  assert.deepEqual(students[0].subjects, ['语文', '数学', '英语']);
  const { subjects } = parseSchedule('化学 星期五 19：00 ~ 20：30', { headerKeywords: HEADER_KEYWORDS, weekdayOf });
  assert.deepEqual(subjects[0], { name: '化学', weekday: 5, time: '19:00-20:30' });
});

test('reports line-level errors with codes', () => {
  const { errors: e1 } = parseStudents('张三\n张三 数学\n张三 语文', { headerKeywords: HEADER_KEYWORDS });
  assert.deepEqual(e1.map((e) => [e.code, e.line]), [['studentNoSubjects', 1], ['duplicateStudent', 3]]);
  const { errors: e2 } = parseSchedule('物理 周八 18:00-19:00\n物理 周五 25:00-26:00\n物理', {
    headerKeywords: HEADER_KEYWORDS, weekdayOf,
  });
  assert.deepEqual(e2.map((e) => e.code), ['badWeekday', 'badTime', 'scheduleColumns']);
});

test('checkRoster flags unknown and unused subjects', () => {
  const warnings = checkRoster(
    [{ name: 'A', subjects: ['物理', '化学'] }],
    [{ name: '物理', weekday: 5, time: '18:30-20:00' }, { name: '生物', weekday: 5, time: '18:30-20:00' }],
  );
  assert.deepEqual(warnings.map((w) => w.code), ['unknownSubject', 'subjectNoStudents']);
});

test('timeRangeMinutes', () => {
  assert.deepEqual(timeRangeMinutes('8:00-9:30'), [480, 570]);
  assert.equal(timeRangeMinutes('8-9'), null);
});

test('format functions round-trip through the parsers', () => {
  const { students } = parseStudents(STUDENTS_TEXT, { headerKeywords: HEADER_KEYWORDS });
  const { subjects } = parseSchedule(SCHEDULE_TEXT, { headerKeywords: HEADER_KEYWORDS, weekdayOf });
  const st = parseStudents(formatStudents(students, '学生姓名\t要参加的科目'), { headerKeywords: HEADER_KEYWORDS });
  const sc = parseSchedule(formatSchedule(subjects, '科目\t星期\t上课时间', WEEKDAYS), { headerKeywords: HEADER_KEYWORDS, weekdayOf });
  assert.deepEqual(st.students, students);
  assert.deepEqual(sc.subjects, subjects);
});
