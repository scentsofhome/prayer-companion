const CACHE_NAME = 'orthodox-prayer-book-v24-mobile-search';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/app.js',
  './src/extra-prayers.js',
  './data/prayers.json',
  './data/prayer-rules.json',
  './data/psalm-50-51/01.txt',
  './data/psalm-50-51/02.txt',
  './data/psalm-50-51/03.txt',
  './data/psalm-50-51/04.txt',
  './data/psalm-50-51/05.txt',
  './data/psalm-50-51/06.txt',
  './data/psalm-50-51/07.txt',
  './data/psalm-50-51/08.txt',
  './data/psalm-50-51/09.txt',
  './data/psalm-50-51/10.txt',
  './data/psalm-50-51/11.txt',
  './data/psalm-50-51/12.txt',
  './data/psalm-50-51/13.txt',
  './data/psalm-50-51/14.txt',
  './data/psalm-50-51/15.txt',
  './data/psalm-50-51/16.txt',
  './data/psalm-50-51/17.txt',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request)))
  );
});
