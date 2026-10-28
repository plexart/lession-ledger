import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDataJSON, emptyData, DataError } from '../js/store.js';

const sample = {
  ...emptyData(),
  students: [{ name: '张小雨', subjects: ['物理'] }],
  subjects: [{ name: '物理', weekday: 5, time: '18:30-20:00' }],
  sessions: [{
    id: 'x', batchId: 'b', subject: '物理', date: '2026-10-30', time: '18:30-20:00',
    fee: 1500, attendees: ['张小雨'], absentees: [], createdAt: '2026-10-30T12:00:00.000Z',
  }],
};

test('exported data round-trips through parseDataJSON', () => {
  assert.deepEqual(parseDataJSON(JSON.stringify(sample)), sample);
});

test('rejects invalid backups with error codes', () => {
  const code = (text) => {
    try {
      parseDataJSON(text);
    } catch (err) {
      assert.ok(err instanceof DataError);
      return err.code;
    }
    return null;
  };
  assert.equal(code('{'), 'invalidJson');
  assert.equal(code(JSON.stringify({ ...sample, version: 2 })), 'unsupportedVersion');
  assert.equal(code(JSON.stringify({ ...sample, sessions: [{ id: 'x' }] })), 'invalidFormat');
});
