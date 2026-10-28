import { t } from '../i18n.js';
import { h } from '../dom.js';
import { store } from '../store.js';
import { studentTotals, inRange } from '../fees.js';
import { money } from '../format.js';

// Kept in memory so the filter survives tab switches during a visit.
const filter = { from: '', to: '' };

export function renderFees(ctx) {
  const { students, sessions } = store.data;
  const totals = studentTotals(sessions, filter);
  const inFilter = sessions.filter((s) => inRange(s.date, filter.from, filter.to));
  const charged = inFilter.reduce((sum, s) => sum + (s.attendees.length ? Math.round(s.fee * 100) : 0), 0);

  // Roster order first, then anyone who only appears in past sessions.
  const names = students.map((s) => s.name);
  for (const name of totals.keys()) if (!names.includes(name)) names.push(name);
  const rows = names.map((name) => ({ name, ...(totals.get(name) ?? { cents: 0, attended: 0, leave: 0 }) }));
  const sum = rows.reduce((acc, r) => acc + r.cents, 0);

  const dateInput = (key) => h('input', {
    type: 'date',
    value: filter[key],
    onChange: (e) => { filter[key] = e.target.value; ctx.refresh(); },
  });

  return h('div', null,
    h('section', { class: 'card' },
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, t('fees.from')), dateInput('from')),
        h('label', { class: 'field' }, h('span', null, t('fees.to')), dateInput('to'))),
      filter.from || filter.to
        ? h('button', {
          type: 'button',
          class: 'btn block',
          onClick: () => { filter.from = ''; filter.to = ''; ctx.refresh(); },
        }, t('fees.clearFilter'))
        : null,
      h('p', { class: 'muted small' }, t('fees.summary', { sessions: inFilter.length, total: money(charged) }))),
    rows.length
      ? h('section', { class: 'card table-wrap' },
        h('table', null,
          h('thead', null, h('tr', null,
            h('th', null, t('fees.student')),
            h('th', { class: 'num' }, t('fees.attended')),
            h('th', { class: 'num' }, t('fees.leave')),
            h('th', { class: 'num' }, t('fees.amount')))),
          h('tbody', null, rows.map((r) => h('tr', null,
            h('td', null, h('a', { href: `#/students/${encodeURIComponent(r.name)}` }, r.name)),
            h('td', { class: 'num' }, r.attended),
            h('td', { class: 'num' }, r.leave),
            h('td', { class: 'num' }, money(r.cents))))),
          h('tfoot', null, h('tr', null,
            h('td', null, t('fees.total')),
            h('td', { class: 'num' }, rows.reduce((a, r) => a + r.attended, 0)),
            h('td', { class: 'num' }, rows.reduce((a, r) => a + r.leave, 0)),
            h('td', { class: 'num' }, money(sum))))),
        h('p', { class: 'muted small' }, t('fees.roundingNote')))
      : h('div', { class: 'empty' }, t('register.noRoster')));
}
