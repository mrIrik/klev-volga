// Service worker: файлы приложения — сначала сеть, без сети — кэш. Погода кэшируется в localStorage.
const VERSION = 'klev-v6';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/art.js', './js/astro.js', './js/fish.js', './js/model.js', './js/places.js', './js/weather.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // запросы к Open-Meteo и другим сайтам идут напрямую в сеть, без service worker
  if (url.origin !== location.origin) return;

  // файлы приложения: сначала сеть (чтобы обновления приходили сразу), без сети — кэш
  e.respondWith(
    caches.open(VERSION).then(cache =>
      fetch(req).then(res => {
        if (res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(async () =>
        (await cache.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? await cache.match('./index.html') : Response.error()))
    )
  );
});
