const CACHE_NAME = 'aog-alarm-shell-v3';
const BASE_PATH = new URL('./', self.location.href).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match(BASE_PATH))));
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {};
  const data = payload.notification || payload;
  const alarm = {
    id: data.id || data.alarmId || `${Date.now()}`,
    title: data.title || 'New alarm',
    body: data.body || data.message || 'An alarm needs your attention.',
    source: data.source || 'Node-RED',
    severity: data.severity || 'warning',
    timestamp: data.timestamp || new Date().toISOString()
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(alarm.title, { body: alarm.body, tag: `alarm-${alarm.id}`, requireInteraction: true, data: { alarm } }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => clients.forEach((client) => client.postMessage({ type: 'alarm', alarm })))
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const target = `${self.registration.scope}?alarm=${encodeURIComponent(event.notification.data?.alarm?.id || '')}`;
    const existing = clients.find((client) => 'focus' in client);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
