// Service worker: precaches the app shell so the app opens offline, and serves
// same-origin requests network-first so updates show up as soon as the user is online.

const CACHE = 'lesson-ledger-v1';

// Every file the app needs. tests/sw.test.js checks this list against the repo.
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'locales/zh-CN.json',
  'locales/zh-CN.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/dates.js',
  'js/dom.js',
  'js/fees.js',
  'js/format.js',
  'js/i18n.js',
  'js/parse.js',
  'js/store.js',
  'js/views/register.js',
  'js/views/sessions.js',
  'js/views/settings.js',
  'js/views/students.js',
  'js/views/subjects.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('./');
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
