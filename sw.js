/* DUMBASS LIFT — service worker.
   Offline support, network-first: when online you always get the newest
   build (so the APP_BUILD auto-updater still works); when offline the last
   copy is served from cache. Cloud-sync traffic (Firestore/Auth APIs) is
   never touched — Firestore has its own offline queue. */

const CACHE = 'dumbass-lift-v1';
const PRECACHE = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'favicon-32.png'];
// Third-party files the app needs to boot: Firebase SDK + fonts.
const CACHEABLE_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !(CACHEABLE_HOSTS.includes(url.hostname) && (firebaseSdk || url.hostname !== 'www.gstatic.com'))) return;

  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        // Cache the page under one key so "?v=..." reloads still work offline.
        const key = sameOrigin && req.mode === 'navigate' ? 'index.html' : req;
        caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: sameOrigin }).then(hit =>
        hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())
      )
    )
  );
});
