// Service worker: precaches the app shell and serves it cache-first, so the app opens
// instantly even on a slow network. Each launch refreshes the cache in the background;
// a new deploy shows up on the next launch.

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
  'js/install.js',
  'js/parse.js',
  'js/store.js',
  'js/views/register.js',
  'js/views/sessions.js',
  'js/views/settings.js',
  'js/views/students.js',
  'js/views/subjects.js',
  'js/version.js',
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

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true })
    || (request.mode === 'navigate' && await cache.match('./'));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// Re-downloads the whole app shell. addAll stores nothing unless every file arrives,
// so the cache never mixes files from two deploys.
async function refresh() {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'no-cache' }))).catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(cacheFirst(request));
  if (request.mode === 'navigate') event.waitUntil(refresh());
});
