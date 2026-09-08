const CACHE_NAME = 'aog-alarm-shell-v2';
const BASE_PATH = new URL('./', self.location.href).pathname;
const APP_SHELL = [BASE_PATH, `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match(BASE_PATH)))
  );
});

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const title = payload.title || 'New alarm';
  const body = payload.body || payload.message || 'An alarm needs your attention.';
  const alarm = {
    id: payload.id || payload.alarmId || `${Date.now()}-${title}`,
    title,
    body,
    severity: payload.severity || 'warning',
    source: payload.source || 'Node-RED',
    timestamp: payload.timestamp || new Date().toISOString()
  };

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body,
      tag: `alarm-${alarm.id}`,
      renotify: true,
      requireInteraction: true,
      data: { alarm }
    }),
    notifyClients(alarm)
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('?alarm=' + encodeURIComponent(event.notification.data?.alarm?.id || ''), self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      return existing ? existing.focus().then(() => existing.navigate(target)) : self.clients.openWindow(target);
    })
  );
});

function readPayload(event) {
  if (!event.data) return {};
  try {
    const value = event.data.json();
    return value.notification || value;
  } catch {
    return { body: event.data.text() };
  }
}

async function notifyClients(alarm) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'alarm', alarm }));
}
