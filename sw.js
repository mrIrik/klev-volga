// Service worker: оболочка приложения — из кэша, погода — сначала сеть, потом кэш
const VERSION = 'klev-v1';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/astro.js', './js/fish.js', './js/model.js', './js/places.js', './js/weather.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + '-api').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'api.open-meteo.com') {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION + '-api').then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { cacheName: VERSION + '-api' }).then(r => r || Response.error()))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // stale-while-revalidate для файлов приложения
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' }) ||
        (req.mode === 'navigate' ? await cache.match('./index.html') : null);
      const net = fetch(req).then(res => {
        if (res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
