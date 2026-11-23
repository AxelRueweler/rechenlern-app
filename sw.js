// Service Worker: macht die App offline nutzbar.
// Bei jeder Änderung an den Dateien VERSION erhöhen, damit Geräte das Update laden.
const VERSION = 'v11';
const CACHE = 'rechenheld-' + VERSION;
const FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'speech.js',
  'mult.js',
  'rest.js',
  'frac.js',
  'progress.js',
  'rewards.js',
  'shop.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst Netz versuchen (damit Updates schnell ankommen), sonst Cache.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
