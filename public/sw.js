const CACHE_NAME = 'pickle-pass-v3';
const STATIC_CACHE = 'pickle-pass-static-v3';
const API_CACHE = 'pickle-pass-api-v1';

const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  const keep = [STATIC_CACHE, API_CACHE];
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Supabase API: stale-while-revalidate
  if (url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/')) {
    e.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Navigation & other: network-first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'Pickle Pass', body: 'You have a new notification', icon: '/icons/icon-192.png' };
  if (e.data) {
    try { data = { ...data, ...e.data.json() }; } catch (_) {
      data.body = e.data.text();
    }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'pickle-pass',
      data: data.url ? { url: data.url } : undefined,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
