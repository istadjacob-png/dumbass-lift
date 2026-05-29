/* DUMBASS LIFT — service worker.
   Push notifications only. No fetch/caching on purpose: the app already
   self-updates via APP_BUILD, and a caching SW would fight that. */

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'DUMBASS LIFT';
  const body  = data.body  || "Don't skip today's session.";
  const url   = data.url   || 'https://istadjacob-png.github.io/dumbass-lift/';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'dumbass-daily',
      renotify: true,
      vibrate: [40, 30, 40],
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) ||
              'https://istadjacob-png.github.io/dumbass-lift/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.indexOf('dumbass-lift') !== -1 && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
