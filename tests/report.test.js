import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMessages } from '../js/i18n.js';
import { studentReport, sessionsReport, reportText, periodLabel } from '../js/report.js';

setMessages(JSON.parse(readFileSync(new URL('../locales/zh-CN.json', import.meta.url), 'utf8')), 'zh-CN');

const today = new Date('2026-11-10T12:00:00');
const session = (date, subject, attendees, absentees = [], fee = 1500) =>
  ({ id: `${date}-${subject}`, date, subject, time: '18:30-20:00', fee, attendees, absentees });
const sessions = [
  session('2026-10-30', '物理', ['甲', '乙'], ['丙']),
  session('2026-11-06', '物理', ['甲', '丙', '丁']),
  session('2026-11-07', '语文', ['乙'], ['甲']),
  session('2026-11-07', '数学', [], ['丁'], 1000),
];

test('periodLabel', () => {
  assert.equal(periodLabel({ from: '2026-11-01', to: '2026-11-30' }, today), '11月1日 至 11月30日');
  assert.equal(periodLabel({ from: '2025-12-29', to: '2026-01-04' }, today), '2025年12月29日 至 1月4日');
  assert.equal(periodLabel({ from: '2026-11-07', to: '2026-11-07' }, today), '11月7日');
  assert.equal(periodLabel({ from: '', to: '' }, today), '全部记录');
});

test('studentReport filters by range and shows shares when fees are on', () => {
  const r = studentReport('甲', sessions, { from: '2026-11-01', to: '2026-11-30', showFees: true, today });
  assert.equal(r.title, '甲 上课记录');
  assert.equal(r.count, 2);
  assert.equal(r.summary, '上课 1 次 · 请假 1 次 · 合计 ¥500');
  assert.deepEqual(r.groups[0].rows.map((row) => [row.title, row.side, row.tone]), [
    ['11月6日 周五 物理', '¥500', null],
    ['11月7日 周六 语文', '请假', 'leave'],
  ]);
  assert.equal(reportText(r), [
    '【甲 上课记录】',
    '11月1日 至 11月30日',
    '上课 1 次 · 请假 1 次 · 合计 ¥500',
    '',
    '11月6日 周五 物理 18:30-20:00 · ¥500',
    '11月7日 周六 语文 18:30-20:00 · 请假',
  ].join('\n'));
});

test('studentReport hides amounts when fees are off', () => {
  const r = studentReport('甲', sessions, { showFees: false, today });
  assert.equal(r.count, 3);
  assert.ok(!reportText(r).includes('¥'));
  assert.equal(r.groups[0].rows[0].side, '出勤');
});

test('studentReport with an empty range', () => {
  const r = studentReport('甲', sessions, { from: '2026-12-01', to: '2026-12-31', showFees: true, today });
  assert.equal(r.count, 0);
  assert.equal(r.summary, '所选时间段没有记录');
  assert.deepEqual(r.groups, []);
});

test('sessionsReport groups by date, oldest first', () => {
  const r = sessionsReport(sessions, { from: '2026-11-06', to: '2026-11-07', showFees: true, today });
  assert.equal(r.count, 3);
  assert.equal(r.summary, '共 3 个课次，合计费用 ¥3000');
  assert.deepEqual(r.groups.map((g) => g.heading), ['11月6日 周五', '11月7日 周六']);
  assert.equal(reportText(r), [
    '【课次记录】',
    '11月6日 至 11月7日',
    '共 3 个课次，合计费用 ¥3000',
    '',
    '11月6日 周五',
    '物理 18:30-20:00 · 出勤 3/3 · 人均 ¥500',
    '  甲、丙、丁',
    '',
    '11月7日 周六',
    '语文 18:30-20:00 · 出勤 1/2 · 人均 ¥1500',
    '  乙',
    '  请假：甲',
    '数学 18:30-20:00 · 出勤 0/1 · 无人出勤',
    '  请假：丁',
  ].join('\n'));
});

test('sessionsReport hides amounts when fees are off', () => {
  const r = sessionsReport(sessions, { showFees: false, today });
  assert.equal(r.summary, '共 4 个课次');
  assert.ok(!reportText(r).includes('¥'));
});
