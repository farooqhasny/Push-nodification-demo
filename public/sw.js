const CACHE_NAME = 'aog-alarm-shell-v4';
const ALARM_DB_NAME = 'aog-alarm-terminal';
const ALARM_STORE_NAME = 'alarms';
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
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? await event.data.json() : {};
    } catch {
      payload = {};
    }
    const data = payload.notification || payload;
    const alarm = {
      id: String(data.id || data.alarmId || `${Date.now()}`),
      title: String(data.title || 'New alarm'),
      body: String(data.body || data.message || 'An alarm needs your attention.'),
      source: String(data.source || 'Node-RED'),
      severity: data.severity === 'critical' || data.severity === 'normal' ? data.severity : 'warning',
      timestamp: String(data.timestamp || new Date().toISOString())
    };

    const storagePromise = saveAlarm(alarm).catch(() => undefined);
    const notificationPromise = self.registration.showNotification(alarm.title, { body: alarm.body, tag: `alarm-${alarm.id}`, requireInteraction: true, data: { alarm } });
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'alarm', alarm }));
    await Promise.all([notificationPromise, storagePromise]);
  })());
});

function saveAlarm(alarm) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ALARM_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(ALARM_STORE_NAME, { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction(ALARM_STORE_NAME, 'readwrite');
      transaction.objectStore(ALARM_STORE_NAME).put(alarm);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const target = `${self.registration.scope}?alarm=${encodeURIComponent(event.notification.data?.alarm?.id || '')}`;
    const existing = clients.find((client) => 'focus' in client);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
