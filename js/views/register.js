import { t } from '../i18n.js';
import { h, toast } from '../dom.js';
import { store, newId } from '../store.js';
import { lessonWeek, defaultLessonDates, addDays } from '../dates.js';
import { shareCents } from '../fees.js';
import { weekdayName, money, dateLabel, sortSubjects, scheduleLabel } from '../format.js';

const MAX_WEEKS_AHEAD = 52;

function sessionExists(subject, date) {
  return store.data.sessions.some((s) => s.subject === subject && s.date === date);
}

/** Default dates per weekday, skipping lesson weeks that are already fully registered. */
function initialDates(subjects) {
  let dates = defaultLessonDates(subjects.map((s) => s.weekday));
  for (let i = 0; i < MAX_WEEKS_AHEAD; i++) {
    if (!subjects.every((s) => sessionExists(s.name, dates.get(s.weekday)))) break;
    dates = new Map([...dates].map(([w, d]) => [w, addDays(d, 7)]));
  }
  return dates;
}

export function renderRegister(ctx) {
  const { data } = store;
  if (!store.hasRoster()) {
    return h('div', { class: 'empty' },
      h('p', null, t('register.noRoster')),
      h('a', { class: 'btn primary', href: '#/settings' }, t('register.goToSettings')));
  }

  const { offsets } = lessonWeek(data.subjects.map((s) => s.weekday));
  const subjects = sortSubjects(data.subjects);
  const dayDates = initialDates(subjects);

  const items = subjects.map((s) => ({
    subject: s.name,
    weekday: s.weekday,
    include: true,
    date: dayDates.get(s.weekday),
    time: s.time,
    fee: data.settings.defaultFee,
    students: store.enrolled(s.name),
    leave: new Set(),
  }));
  const cards = new Map();

  function updateCard(item) {
    const el = renderCard(item);
    cards.get(item).replaceWith(el);
    cards.set(item, el);
  }

  function renderCard(item) {
    const attendees = item.students.filter((n) => !item.leave.has(n));
    const share = shareCents({ fee: item.fee, attendees });

    const head = h('div', { class: 'card-head' },
      h('label', { class: 'check' },
        h('input', {
          type: 'checkbox',
          checked: item.include,
          onChange: (e) => { item.include = e.target.checked; updateCard(item); },
        }),
        item.subject),
      h('span', { class: 'muted small' }, scheduleLabel(item)));

    if (!item.include) {
      return h('section', { class: 'card disabled' }, head, h('div', { class: 'muted small' }, t('register.skipped')));
    }

    const dateInput = h('input', {
      type: 'date',
      value: item.date,
      onChange: (e) => { item.date = e.target.value; updateCard(item); },
    });
    const timeInput = h('input', {
      type: 'text',
      value: item.time,
      onChange: (e) => { item.time = e.target.value.trim(); },
    });
    const feeInput = h('input', {
      type: 'number',
      min: 0,
      step: 1,
      inputMode: 'decimal',
      value: item.fee,
      onChange: (e) => {
        const fee = Number(e.target.value);
        if (Number.isFinite(fee) && fee >= 0) item.fee = fee;
        else toast(t('data.invalidFee'));
        updateCard(item);
      },
    });

    return h('section', { class: 'card' },
      head,
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, t('session.date')), dateInput),
        h('label', { class: 'field' }, h('span', null, t('session.time')), timeInput),
        h('label', { class: 'field' }, h('span', null, t('session.fee')), feeInput)),
      item.date && sessionExists(item.subject, item.date)
        ? h('p', null, h('span', { class: 'badge' }, t('register.alreadyRegistered')))
        : null,
      item.students.length
        ? [
          h('h3', null, t('register.tapForLeave')),
          h('div', { class: 'chips' }, item.students.map((name) => {
            const onLeave = item.leave.has(name);
            return h('button', {
              type: 'button',
              class: `chip ${onLeave ? 'leave' : 'present'}`,
              'aria-pressed': String(onLeave),
              onClick: () => {
                if (onLeave) item.leave.delete(name);
                else item.leave.add(name);
                updateCard(item);
              },
            }, name);
          })),
          h('p', { class: 'muted small' }, t('register.cardSummary', {
            present: attendees.length,
            leave: item.leave.size,
            share: money(share),
          })),
        ]
        : h('p', { class: 'muted small' }, t('register.noStudents')));
  }

  function submit() {
    const chosen = items.filter((i) => i.include);
    if (!chosen.length) return toast(t('register.nothingSelected'));
    if (chosen.some((i) => !i.date)) return toast(t('register.missingDate'));

    const duplicates = chosen.filter((i) => sessionExists(i.subject, i.date));
    const message = duplicates.length
      ? t('register.confirmDuplicate', {
        list: duplicates.map((i) => `${i.subject} ${dateLabel(i.date)}`).join(t('list.separator')),
        count: chosen.length,
      })
      : t('register.confirm', { count: chosen.length });
    if (!confirm(message)) return;

    const batchId = newId();
    const createdAt = new Date().toISOString();
    for (const i of chosen) {
      data.sessions.push({
        id: newId(),
        batchId,
        subject: i.subject,
        date: i.date,
        time: i.time,
        fee: i.fee,
        attendees: i.students.filter((n) => !i.leave.has(n)),
        absentees: i.students.filter((n) => i.leave.has(n)),
        createdAt,
      });
    }
    store.save();
    toast(t('register.done', { count: chosen.length }));
    ctx.navigate('/sessions');
  }

  const weekdays = [...offsets.keys()].sort((a, b) => offsets.get(a) - offsets.get(b));
  const datesCard = h('section', { class: 'card' },
    h('h2', null, t('register.datesTitle')),
    h('p', { class: 'muted small' }, t('register.datesHint')),
    h('div', { class: 'row' }, weekdays.map((w) => h('label', { class: 'field' },
      h('span', null, weekdayName(w)),
      h('input', {
        type: 'date',
        value: dayDates.get(w),
        onChange: (e) => {
          for (const item of items.filter((i) => i.weekday === w)) {
            item.date = e.target.value;
            updateCard(item);
          }
        },
      })))));

  const cardEls = items.map((item) => {
    const el = renderCard(item);
    cards.set(item, el);
    return el;
  });

  return h('div', null,
    datesCard,
    cardEls,
    h('div', { class: 'sticky-actions' },
      h('button', { type: 'button', class: 'btn primary block', onClick: submit }, t('register.submit'))));
}
