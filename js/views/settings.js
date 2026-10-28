import { t, raw } from '../i18n.js';
import { h, setChildren, toast } from '../dom.js';
import { store, parseDataJSON, emptyData, DataError } from '../store.js';
import { toISODate } from '../dates.js';
import {
  isStandalone, isIOS, canPromptInstall, promptInstall, onInstallChange,
} from '../install.js';
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
    setChildren(preview,
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
    ctx.navigate('/subjects');
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
  const showFeesInput = h('input', {
    type: 'checkbox',
    checked: settings.showFees,
    onChange: (e) => {
      settings.showFees = e.target.checked;
      store.save();
      toast(t('data.saved'));
    },
  });
  return h('section', { class: 'card' },
    h('h2', null, t('data.settingsTitle')),
    h('label', { class: 'field' }, h('span', null, t('data.defaultFee')), feeInput),
    h('p', { class: 'muted small' }, t('data.defaultFeeHint')),
    h('label', { class: 'check' }, showFeesInput, t('data.showFees')),
    h('p', { class: 'muted small' }, t('data.showFeesHint')),
  );
}

function exportData() {
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `lesson-ledger-${toISODate(new Date())}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupCard(ctx) {
  const { data } = store;
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let imported;
    try {
      imported = parseDataJSON(await file.text());
    } catch (err) {
      if (!(err instanceof DataError)) console.error(err);
      return toast(t(`backup.error.${err instanceof DataError ? err.code : 'invalidFormat'}`));
    }
    const message = t('backup.confirmImport', {
      students: imported.students.length,
      subjects: imported.subjects.length,
      sessions: imported.sessions.length,
    });
    if (!confirm(message)) return;
    store.replace(imported);
    toast(t('backup.imported'));
    ctx.refresh();
  });

  function clearAll() {
    if (!confirm(t('backup.confirmClear'))) return;
    store.replace(emptyData());
    toast(t('backup.cleared'));
    ctx.refresh();
  }

  return h('section', { class: 'card' },
    h('h2', null, t('backup.title')),
    h('p', { class: 'muted small' }, t('backup.hint', {
      students: data.students.length,
      subjects: data.subjects.length,
      sessions: data.sessions.length,
    })),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn primary', onClick: exportData }, t('backup.export')),
      h('button', { type: 'button', class: 'btn', onClick: () => fileInput.click() }, t('backup.import'))),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn danger', onClick: clearAll }, t('backup.clear'))),
    fileInput);
}

function installCard() {
  if (isStandalone()) return null;
  const card = h('section', { class: 'card' });

  function render() {
    setChildren(card,
      h('h2', null, t('install.title')),
      h('p', { class: 'muted small' }, t(isIOS() ? 'install.iosHint' : 'install.hint')),
      canPromptInstall()
        ? h('div', { class: 'actions' }, h('button', {
          type: 'button',
          class: 'btn primary',
          onClick: async () => {
            if (await promptInstall()) toast(t('install.done'));
            render();
          },
        }, t('install.button')))
        : null);
  }

  onInstallChange(render);
  render();
  return card;
}

export function renderSettings(ctx) {
  return h('div', null, rosterCard(ctx), settingsCard(), backupCard(ctx), installCard());
}
