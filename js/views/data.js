import { t, raw } from '../i18n.js';
import { h, toast } from '../dom.js';
import { store } from '../store.js';
import {
  parseStudents, parseSchedule, checkRoster, formatStudents, formatSchedule,
} from '../parse.js';
import { weekdayLookup, headerKeywords, issueText } from '../format.js';

function rosterCard(ctx) {
  const { data } = store;
  const keywords = headerKeywords();
  const studentsInput = h('textarea', {
    rows: 10,
    placeholder: t('data.studentsPlaceholder'),
    value: data.students.length ? formatStudents(data.students, t('data.studentsHeader')) : '',
  });
  const scheduleInput = h('textarea', {
    rows: 6,
    placeholder: t('data.schedulePlaceholder'),
    value: data.subjects.length
      ? formatSchedule(data.subjects, t('data.scheduleHeader'), raw('weekdays'))
      : '',
  });
  const preview = h('div', { class: 'small' });

  function parseAll() {
    const st = parseStudents(studentsInput.value, { headerKeywords: keywords });
    const sc = parseSchedule(scheduleInput.value, { headerKeywords: keywords, weekdayOf: weekdayLookup() });
    const errors = [
      ...st.errors.map((e) => ({ ...e, source: t('data.studentsLabel') })),
      ...sc.errors.map((e) => ({ ...e, source: t('data.scheduleLabel') })),
    ];
    const warnings = st.students.length && sc.subjects.length ? checkRoster(st.students, sc.subjects) : [];
    return { students: st.students, subjects: sc.subjects, errors, warnings };
  }

  function updatePreview() {
    const { students, subjects, errors, warnings } = parseAll();
    preview.replaceChildren(
      h('div', { class: 'muted' }, t('data.previewSummary', { students: students.length, subjects: subjects.length })),
      errors.length || warnings.length
        ? h('ul', { class: 'messages' },
          errors.map((e) => h('li', { class: 'error' }, `${e.source} · ${issueText(e)}`)),
          warnings.map((w) => h('li', { class: 'warning' }, issueText(w))))
        : null,
    );
  }

  function save() {
    const { students, subjects, errors } = parseAll();
    if (errors.length) return toast(t('data.fixErrors'));
    if (!students.length || !subjects.length) return toast(t('data.needBoth'));
    if (data.sessions.length && !confirm(t('data.confirmReplaceRoster', { count: data.sessions.length }))) return;
    data.students = students;
    data.subjects = subjects;
    store.save();
    toast(t('data.saved'));
    ctx.navigate('/register');
  }

  studentsInput.addEventListener('input', updatePreview);
  scheduleInput.addEventListener('input', updatePreview);
  updatePreview();

  return h('section', { class: 'card' },
    h('h2', null, t('data.rosterTitle')),
    h('p', { class: 'muted small' }, t('data.rosterHint')),
    h('label', { class: 'field' }, h('span', null, t('data.studentsLabel')), studentsInput),
    h('label', { class: 'field' }, h('span', null, t('data.scheduleLabel')), scheduleInput),
    preview,
    h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onClick: save }, t('data.saveRoster'))),
  );
}

function settingsCard() {
  const { settings } = store.data;
  const feeInput = h('input', { type: 'number', min: 0, step: 1, inputMode: 'decimal', value: settings.defaultFee });
  feeInput.addEventListener('change', () => {
    const fee = Number(feeInput.value);
    if (!Number.isFinite(fee) || fee < 0) {
      feeInput.value = settings.defaultFee;
      return toast(t('data.invalidFee'));
    }
    settings.defaultFee = fee;
    store.save();
    toast(t('data.saved'));
  });
  return h('section', { class: 'card' },
    h('h2', null, t('data.settingsTitle')),
    h('label', { class: 'field' }, h('span', null, t('data.defaultFee')), feeInput),
    h('p', { class: 'muted small' }, t('data.defaultFeeHint')),
  );
}

export function renderData(ctx) {
  return h('div', null, rosterCard(ctx), settingsCard());
}
