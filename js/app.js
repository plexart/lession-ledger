import { loadLocale, applyI18n, t } from './i18n.js';
import { h } from './dom.js';
import { store } from './store.js';
import './install.js';
import { renderSettings } from './views/settings.js';
import { renderRegister } from './views/register.js';
import { renderSessionList, renderSessionDetail } from './views/sessions.js';
import { renderStudentList, renderStudentDetail } from './views/students.js';
import { renderSubjects } from './views/subjects.js';

const DEFAULT_LANG = 'zh-CN';

/**
 * Route table. `pattern` is matched against the hash path; capture groups are passed
 * to `render` as decoded params. `tab` highlights a tab, `back` shows a back button.
 */
const routes = [
  { pattern: /^\/sessions$/, tab: 'sessions', title: 'page.sessions', render: renderSessionList },
  {
    pattern: /^\/sessions\/new$/, tab: 'sessions', title: 'page.register', back: '/sessions',
    render: renderRegister,
  },
  {
    pattern: /^\/sessions\/([^/]+)$/, tab: 'sessions', title: 'page.sessionDetail', back: '/sessions',
    render: renderSessionDetail,
  },
  { pattern: /^\/students$/, tab: 'students', title: 'page.students', render: renderStudentList },
  {
    pattern: /^\/students\/([^/]+)$/, tab: 'students', title: 'page.studentDetail', back: '/students',
    render: renderStudentDetail,
  },
  { pattern: /^\/subjects$/, tab: 'subjects', title: 'page.subjects', render: renderSubjects },
  { pattern: /^\/settings$/, tab: 'settings', title: 'page.settings', render: renderSettings },
];

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('page-title');
const backEl = document.getElementById('back-button');

// True once the user has navigated inside the app, so "back" can use browser history.
let navigatedInApp = false;

function defaultPath() {
  return store.hasRoster() ? '/sessions' : '/settings';
}

export function navigate(path) {
  location.hash = `#${path}`;
}

/** Returns to the previous in-app page, or replaces the current page with `fallback`. */
function goBack(fallback) {
  if (navigatedInApp) history.back();
  else location.replace(`#${fallback}`);
}

function renderNotFound() {
  return h('div', { class: 'empty' }, t('notFound.message'));
}

function route() {
  const path = location.hash.slice(1) || defaultPath();
  let match = null;
  let entry = null;
  for (const r of routes) {
    match = r.pattern.exec(path);
    if (match) { entry = r; break; }
  }
  const params = match ? match.slice(1).map(decodeURIComponent) : [];
  const ctx = { params, refresh: route, navigate, goBack };

  titleEl.textContent = entry ? t(entry.title) : t('page.notFound');
  backEl.hidden = !entry?.back;
  backEl.onclick = entry?.back ? () => goBack(entry.back) : null;
  for (const a of document.querySelectorAll('#tabbar a')) {
    a.classList.toggle('active', a.dataset.tab === entry?.tab);
  }

  viewEl.replaceChildren(entry ? entry.render(ctx) : renderNotFound());
}

async function main() {
  try {
    await loadLocale(store.data.settings.lang || DEFAULT_LANG);
  } catch (err) {
    console.error(err);
    viewEl.textContent = 'Failed to load locale.';
    return;
  }
  document.title = t('app.title');
  document.getElementById('apple-title').content = t('app.title');
  applyI18n(document);
  window.addEventListener('hashchange', () => {
    navigatedInApp = true;
    route();
    window.scrollTo(0, 0);
  });
  route();
}

main();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .catch((err) => console.error('Service worker registration failed', err));
}
