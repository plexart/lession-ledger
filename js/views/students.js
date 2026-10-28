import { t } from '../i18n.js';
import { h } from '../dom.js';
import { store, compareSessions } from '../store.js';
import { shareCents, studentTotals } from '../fees.js';
import { money, dateLabel, scheduleLabel, sortSubjects } from '../format.js';

const studentHref = (name) => `#/students/${encodeURIComponent(name)}`;

export function renderStudentList() {
  const { students, subjects } = store.data;
  if (!students.length) {
    return h('div', { class: 'empty' },
      h('p', null, t('register.noRoster')),
      h('a', { class: 'btn primary', href: '#/data' }, t('register.goToData')));
  }
  const totals = studentTotals(store.data.sessions);
  const ordered = sortSubjects(subjects).map((s) => s.name);
  const subjectOrder = (a, b) => ordered.indexOf(a) - ordered.indexOf(b);

  return h('div', { class: 'list' }, students.map((st) => {
    const total = totals.get(st.name);
    return h('a', { class: 'list-item', href: studentHref(st.name) },
      h('div', { class: 'main' },
        h('div', { class: 'title' }, st.name),
        [...st.subjects].sort(subjectOrder).map((name) => {
          const sub = store.subject(name);
          return h('div', { class: 'sub' }, sub ? `${name} · ${scheduleLabel(sub)}` : name);
        })),
      h('div', { class: 'side' },
        h('div', { class: 'amount' }, money(total?.cents ?? 0)),
        h('div', { class: 'sub' }, t('student.attendedCount', { count: total?.attended ?? 0 }))));
  }));
}

export function renderStudentDetail(ctx) {
  const [name] = ctx.params;
  const student = store.data.students.find((s) => s.name === name);
  const history = store.data.sessions
    .filter((s) => s.attendees.includes(name) || s.absentees.includes(name))
    .sort(compareSessions);
  if (!student && !history.length) return h('div', { class: 'empty' }, t('student.notFound'));

  const total = studentTotals(history).get(name) ?? { cents: 0, attended: 0, leave: 0 };
  const subjects = sortSubjects(store.data.subjects.filter((s) => student?.subjects.includes(s.name)));
  const unknown = student ? student.subjects.filter((n) => !store.subject(n)) : [];

  return h('div', null,
    h('section', { class: 'card' },
      h('h2', null, name),
      student
        ? h('div', { class: 'list' },
          subjects.map((s) => h('div', { class: 'list-item' },
            h('div', { class: 'main title' }, s.name),
            h('div', { class: 'side muted' }, scheduleLabel(s)))),
          unknown.map((n) => h('div', { class: 'list-item' },
            h('div', { class: 'main title' }, n),
            h('div', { class: 'side' }, h('span', { class: 'badge' }, t('student.notInSchedule'))))))
        : h('p', { class: 'muted small' }, t('student.notInRoster')),
      h('p', null,
        t('student.stats', { attended: total.attended, leave: total.leave }),
        ' · ',
        h('span', { class: 'amount' }, t('student.total', { total: money(total.cents) })))),
    h('div', { class: 'section-title' }, t('student.history')),
    history.length
      ? h('div', { class: 'list' }, history.map((s) => {
        const attended = s.attendees.includes(name);
        return h('a', { class: 'list-item', href: `#/sessions/${encodeURIComponent(s.id)}` },
          h('div', { class: 'main' },
            h('div', { class: 'title' }, s.subject),
            h('div', { class: 'sub' }, [dateLabel(s.date), s.time].filter(Boolean).join(' · '))),
          h('div', { class: 'side' }, attended
            ? h('span', { class: 'amount' }, money(shareCents(s)))
            : h('span', { class: 'chip leave' }, t('student.leave'))));
      }))
      : h('div', { class: 'empty' }, t('student.noHistory')));
}
