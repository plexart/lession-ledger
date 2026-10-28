// Persistent app data in localStorage, plus JSON export/import validation.

export const STORAGE_KEY = 'lesson-ledger:v1';
export const DATA_VERSION = 1;
export const DEFAULT_FEE = 1500;

export function emptyData() {
  return {
    version: DATA_VERSION,
    settings: { defaultFee: DEFAULT_FEE, lang: 'zh-CN' },
    students: [],
    subjects: [],
    sessions: [],
  };
}

export class DataError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const isString = (v) => typeof v === 'string';
const isStringArray = (v) => Array.isArray(v) && v.every(isString);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an untrusted object and returns normalized data. Throws DataError. */
export function validateData(obj) {
  if (!obj || typeof obj !== 'object') throw new DataError('invalidFormat');
  if (obj.version !== DATA_VERSION) throw new DataError('unsupportedVersion');
  const { settings = {}, students, subjects, sessions } = obj;
  if (!Array.isArray(students) || !Array.isArray(subjects) || !Array.isArray(sessions)) {
    throw new DataError('invalidFormat');
  }
  for (const s of students) {
    if (!isString(s?.name) || !isStringArray(s.subjects)) throw new DataError('invalidFormat');
  }
  for (const s of subjects) {
    if (!isString(s?.name) || !Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6
      || !isString(s.time)) throw new DataError('invalidFormat');
  }
  for (const s of sessions) {
    if (!isString(s?.id) || !isString(s.subject) || !ISO_DATE.test(s.date ?? '')
      || !Number.isFinite(s.fee) || !isStringArray(s.attendees) || !isStringArray(s.absentees)) {
      throw new DataError('invalidFormat');
    }
  }
  const defaults = emptyData();
  return {
    version: DATA_VERSION,
    settings: { ...defaults.settings, ...settings },
    students: students.map(({ name, subjects }) => ({ name, subjects: [...subjects] })),
    subjects: subjects.map(({ name, weekday, time }) => ({ name, weekday, time })),
    sessions: sessions.map((s) => ({
      id: s.id,
      batchId: s.batchId ?? null,
      subject: s.subject,
      date: s.date,
      time: s.time ?? '',
      fee: s.fee,
      attendees: [...s.attendees],
      absentees: [...s.absentees],
      createdAt: s.createdAt ?? null,
    })),
  };
}

export function parseDataJSON(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new DataError('invalidJson');
  }
  return validateData(obj);
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Sorts sessions newest date first, then by start time. */
export function compareSessions(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (a.time ?? '').localeCompare(b.time ?? '', undefined, { numeric: true });
}

// Node (tests) may expose a non-functional localStorage stub.
const hasStorage = typeof globalThis.localStorage?.getItem === 'function';

function readStorage() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? parseDataJSON(text) : emptyData();
  } catch (err) {
    console.error('Failed to read stored data, starting empty', err);
    return emptyData();
  }
}

/** Global store. Mutate `store.data` then call `store.save()`. */
export const store = {
  data: hasStorage ? readStorage() : emptyData(),

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  replace(data) {
    this.data = data;
    this.save();
  },

  hasRoster() {
    return this.data.subjects.length > 0 && this.data.students.length > 0;
  },

  subject(name) {
    return this.data.subjects.find((s) => s.name === name);
  },

  session(id) {
    return this.data.sessions.find((s) => s.id === id);
  },

  enrolled(subjectName) {
    return this.data.students.filter((s) => s.subjects.includes(subjectName)).map((s) => s.name);
  },
};
