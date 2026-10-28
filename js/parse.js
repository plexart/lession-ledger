// Parsers for pasted tabular text. Pure functions: they return data plus error/warning
// codes (with params), and the UI translates the codes.

const LIST_SEPARATOR = /[,，、;；/]+/;
const TIME_RANGE = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

/** Normalizes full-width punctuation and spacing so that columns split cleanly. */
function normalizeLine(line) {
  return line
    .replace(/：/g, ':')
    .replace(/　/g, ' ')
    // "18:30 ~ 20:00" -> "18:30-20:00"
    .replace(/(\d{1,2}:\d{2})\s*[-~～–—－至到]\s*(\d{1,2}:\d{2})/g, '$1-$2')
    // "语文, 生物" -> "语文,生物"
    .replace(/\s*([,，、;；/])\s*/g, '$1')
    .trim();
}

function splitColumns(line) {
  return normalizeLine(line).split(/\s+/).filter(Boolean);
}

function splitList(text) {
  return text.split(LIST_SEPARATOR).map((s) => s.trim()).filter(Boolean);
}

function isHeader(line, headerKeywords) {
  return headerKeywords.some((kw) => line.includes(kw));
}

/** Yields [lineNumber, columns] for non-empty lines, skipping a header on the first one. */
function* rows(text, headerKeywords) {
  const lines = text.split(/\r?\n/);
  let first = true;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (first && isHeader(lines[i], headerKeywords)) {
      first = false;
      continue;
    }
    first = false;
    yield [i + 1, splitColumns(lines[i])];
  }
}

/**
 * Parses "name <tab> subject1,subject2" lines.
 * @returns {{students: {name: string, subjects: string[]}[], errors: object[]}}
 */
export function parseStudents(text, { headerKeywords = [] } = {}) {
  const students = [];
  const errors = [];
  const byName = new Map();
  for (const [line, cols] of rows(text, headerKeywords)) {
    const [name, ...rest] = cols;
    const subjects = splitList(rest.join(','));
    if (!subjects.length) {
      errors.push({ code: 'studentNoSubjects', line, name });
      continue;
    }
    const existing = byName.get(name);
    if (existing) {
      errors.push({ code: 'duplicateStudent', line, name });
      continue;
    }
    const student = { name, subjects: [...new Set(subjects)] };
    byName.set(name, student);
    students.push(student);
  }
  return { students, errors };
}

/**
 * Parses "subject <tab> weekday <tab> HH:MM-HH:MM" lines.
 * @param weekdayOf maps a weekday label (e.g. "周五") to 0-6, or returns null.
 * @returns {{subjects: {name: string, weekday: number, time: string}[], errors: object[]}}
 */
export function parseSchedule(text, { headerKeywords = [], weekdayOf }) {
  const subjects = [];
  const errors = [];
  const seen = new Set();
  for (const [line, cols] of rows(text, headerKeywords)) {
    if (cols.length < 3) {
      errors.push({ code: 'scheduleColumns', line });
      continue;
    }
    const [name, dayLabel, time] = cols;
    const weekday = weekdayOf(dayLabel);
    if (weekday == null) {
      errors.push({ code: 'badWeekday', line, value: dayLabel });
      continue;
    }
    if (timeRangeMinutes(time) == null) {
      errors.push({ code: 'badTime', line, value: time });
      continue;
    }
    if (seen.has(name)) {
      errors.push({ code: 'duplicateSubject', line, name });
      continue;
    }
    seen.add(name);
    subjects.push({ name, weekday, time });
  }
  return { subjects, errors };
}

/** Returns [startMinutes, endMinutes] for "H:MM-H:MM", or null when invalid. */
export function timeRangeMinutes(time) {
  const m = TIME_RANGE.exec(time ?? '');
  if (!m) return null;
  const [h1, m1, h2, m2] = m.slice(1).map(Number);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;
  return [h1 * 60 + m1, h2 * 60 + m2];
}

/** Cross-checks students against the schedule. */
export function checkRoster(students, subjects) {
  const warnings = [];
  const known = new Set(subjects.map((s) => s.name));
  const used = new Set();
  for (const st of students) {
    for (const sub of st.subjects) {
      if (known.has(sub)) used.add(sub);
      else warnings.push({ code: 'unknownSubject', name: st.name, subject: sub });
    }
  }
  for (const sub of subjects) {
    if (!used.has(sub.name)) warnings.push({ code: 'subjectNoStudents', subject: sub.name });
  }
  return warnings;
}

/** Builds a weekday lookup from locale names (index = weekday) and extra aliases. */
export function makeWeekdayLookup(names, aliases = {}) {
  const map = new Map();
  names.forEach((name, i) => map.set(name, i));
  for (const [alias, i] of Object.entries(aliases)) map.set(alias, i);
  return (label) => (map.has(label) ? map.get(label) : null);
}

/** Serializes students back to pasteable text. */
export function formatStudents(students, header) {
  const lines = students.map((s) => `${s.name}\t${s.subjects.join(',')}`);
  return [header, ...lines].join('\n');
}

/** Serializes the schedule back to pasteable text. */
export function formatSchedule(subjects, header, weekdayNames) {
  const lines = subjects.map((s) => `${s.name}\t${weekdayNames[s.weekday]}\t${s.time}`);
  return [header, ...lines].join('\n');
}
