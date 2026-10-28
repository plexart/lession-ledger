import { t } from '../i18n.js';
import { h } from '../dom.js';
import { store } from '../store.js';
import { totalCents } from '../fees.js';
import { scheduleLabel, sortSubjects, money } from '../format.js';

export function renderSubjects() {
  const { subjects, sessions } = store.data;
  if (!subjects.length) {
    return h('div', { class: 'empty' },
      h('p', null, t('register.noRoster')),
      h('a', { class: 'btn primary', href: '#/data' }, t('register.goToData')));
  }

  return h('div', null, sortSubjects(subjects).map((sub) => {
    const names = store.enrolled(sub.name);
    const held = sessions.filter((s) => s.subject === sub.name);
    const total = totalCents(held);
    return h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, sub.name),
        h('span', { class: 'muted small' }, scheduleLabel(sub))),
      h('p', { class: 'muted small' }, t('subject.stats', { students: names.length, sessions: held.length, total: money(total) })),
      names.length
        ? h('div', { class: 'chips' }, names.map((n) =>
          h('a', { class: 'chip info', href: `#/students/${encodeURIComponent(n)}` }, n)))
        : h('p', { class: 'muted small' }, t('register.noStudents')));
  }));
}
