import { loadLocale, applyI18n, t } from './i18n.js';
import { h } from './dom.js';

const DEFAULT_LANG = 'zh-CN';

/**
 * Route table. `pattern` is matched against the hash path; capture groups are passed
 * to `render` as decoded params. `tab` highlights a tab, `back` shows a back button.
 */
const routes = [];

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('page-title');
const backEl = document.getElementById('back-button');

function defaultPath() {
  return '/register';
}

export function navigate(path) {
  location.hash = `#${path}`;
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
  const ctx = { params, refresh: route, navigate };

  titleEl.textContent = entry ? t(entry.title) : t('page.notFound');
  backEl.hidden = !entry?.back;
  backEl.onclick = entry?.back ? () => navigate(entry.back) : null;
  for (const a of document.querySelectorAll('#tabbar a')) {
    a.classList.toggle('active', a.dataset.tab === entry?.tab);
  }

  viewEl.replaceChildren(entry ? entry.render(ctx) : renderNotFound());
}

async function main() {
  try {
    await loadLocale(DEFAULT_LANG);
  } catch (err) {
    console.error(err);
    viewEl.textContent = 'Failed to load locale.';
    return;
  }
  document.title = t('app.title');
  applyI18n(document);
  window.addEventListener('hashchange', () => {
    route();
    window.scrollTo(0, 0);
  });
  route();
}

main();
