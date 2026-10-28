import { t } from '../i18n.js';
import { h, toast } from '../dom.js';
import { store, compareSessions } from '../store.js';
import { shareCents } from '../fees.js';
import { money, dateLabel } from '../format.js';

/** Sorts names by roster order; names no longer on the roster go last. */
function rosterOrder(names) {
  const index = new Map(store.data.students.map((s, i) => [s.name, i]));
  const pos = (n) => index.get(n) ?? Infinity;
  return [...names].sort((a, b) => pos(a) - pos(b));
}

export function renderSessionList() {
  const sessions = [...store.data.sessions].sort(compareSessions);
  if (!sessions.length) {
    return h('div', { class: 'empty' },
      h('p', null, t('sessions.empty')),
      h('a', { class: 'btn primary', href: '#/register' }, t('sessions.goRegister')));
  }

  const total = sessions.reduce((sum, s) => sum + (s.attendees.length ? Math.round(s.fee * 100) : 0), 0);
  const byDate = new Map();
  for (const s of sessions) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }

  return h('div', null,
    h('p', { class: 'muted small' }, t('sessions.summary', { count: sessions.length, total: money(total) })),
    [...byDate].map(([date, list]) => [
      h('div', { class: 'section-title' }, dateLabel(date)),
      h('div', { class: 'list' }, list.map((s) => h('a', { class: 'list-item', href: `#/sessions/${encodeURIComponent(s.id)}` },
        h('div', { class: 'main' },
          h('div', { class: 'title' }, s.subject),
          h('div', { class: 'sub' },
            [s.time, t('session.attendance', { present: s.attendees.length, total: s.attendees.length + s.absentees.length })]
              .filter(Boolean).join(' · ')),
          s.absentees.length
            ? h('div', { class: 'sub' }, t('session.leaveNames', { names: s.absentees.join(t('list.separator')) }))
            : null),
        h('div', { class: 'side' },
          s.attendees.length
            ? [h('div', { class: 'amount' }, money(shareCents(s))), h('div', { class: 'sub' }, t('session.perPerson'))]
            : h('span', { class: 'badge' }, t('session.noAttendees')))))),
    ]));
}

export function renderSessionDetail(ctx) {
  const [id] = ctx.params;
  const session = store.session(id);
  if (!session) return h('div', { class: 'empty' }, t('sessions.notFound'));

  const draft = {
    date: session.date,
    time: session.time,
    fee: session.fee,
    names: rosterOrder([...session.attendees, ...session.absentees]),
    present: new Set(session.attendees),
  };
  const root = h('div');

  function save() {
    if (!draft.date) return toast(t('register.missingDate'));
    session.date = draft.date;
    session.time = draft.time;
    session.fee = draft.fee;
    session.attendees = draft.names.filter((n) => draft.present.has(n));
    session.absentees = draft.names.filter((n) => !draft.present.has(n));
    store.save();
    toast(t('data.saved'));
    render();
  }

  function remove() {
    if (!confirm(t('session.confirmDelete', { subject: session.subject, date: dateLabel(session.date) }))) return;
    store.data.sessions = store.data.sessions.filter((s) => s.id !== session.id);
    store.save();
    toast(t('session.deleted'));
    ctx.navigate('/sessions');
  }

  function render() {
    const attendees = draft.names.filter((n) => draft.present.has(n));
    const share = shareCents({ fee: draft.fee, attendees });

    root.replaceChildren(
      h('section', { class: 'card' },
        h('div', { class: 'card-head' },
          h('h2', null, session.subject),
          h('span', { class: 'muted small' }, dateLabel(session.date))),
        h('div', { class: 'row' },
          h('label', { class: 'field' }, h('span', null, t('session.date')),
            h('input', { type: 'date', value: draft.date, onChange: (e) => { draft.date = e.target.value; } })),
          h('label', { class: 'field' }, h('span', null, t('session.time')),
            h('input', { type: 'text', value: draft.time, onChange: (e) => { draft.time = e.target.value.trim(); } })),
          h('label', { class: 'field' }, h('span', null, t('session.fee')),
            h('input', {
              type: 'number',
              min: 0,
              step: 1,
              inputMode: 'decimal',
              value: draft.fee,
              onChange: (e) => {
                const fee = Number(e.target.value);
                if (Number.isFinite(fee) && fee >= 0) draft.fee = fee;
                else toast(t('data.invalidFee'));
                render();
              },
            }))),
        h('h3', null, t('session.tapToToggle')),
        h('div', { class: 'chips' }, draft.names.map((name) => {
          const present = draft.present.has(name);
          return h('button', {
            type: 'button',
            class: `chip ${present ? 'present' : 'leave'}`,
            'aria-pressed': String(!present),
            onClick: () => {
              if (present) draft.present.delete(name);
              else draft.present.add(name);
              render();
            },
          }, name);
        })),
        h('p', { class: 'muted small' }, t('register.cardSummary', {
          present: attendees.length,
          leave: draft.names.length - attendees.length,
          share: money(share),
        })),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn danger', onClick: remove }, t('session.delete')),
          h('button', { type: 'button', class: 'btn primary', onClick: save }, t('session.save')))),
      session.createdAt
        ? h('p', { class: 'muted small' }, t('session.createdAt', { time: new Date(session.createdAt).toLocaleString() }))
        : null,
    );
  }

  render();
  return root;
}
