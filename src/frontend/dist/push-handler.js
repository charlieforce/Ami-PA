// What the phone does when a notification arrives, even with the app closed.
self.addEventListener('push', (event) => {
  let d = { title: 'Ami', body: '', tag: 'ami', loud: false };
  try { d = { ...d, ...event.data.json() }; } catch (e) { /* keep the defaults */ }

  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      tag: d.tag,
      icon: '/ami-192.png',
      badge: '/ami-192.png',
      requireInteraction: !!d.loud,          // a meeting stays until he looks
      vibrate: d.loud ? [200, 100, 200, 100, 200] : [100],
      silent: !d.loud,
      renotify: true,
    })
  );
});

// tapping it opens the app, or brings it forward if already open
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
