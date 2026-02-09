const CACHE_NAME = 'bluechat-v5';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/types.js',
  './js/identity.js',
  './js/screens.js',
  './js/toast.js',
  './js/sdp-compress.js',
  './js/transport.js',
  './js/webrtc-transport.js',
  './js/qr-manager.js',
  './js/chat.js',
  './js/app.js',
  './lib/lz-string.min.js',
  './lib/qrcode.min.js',
  './lib/html5-qrcode.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then((cached) => cached || fetch(e.request))
  );
});
