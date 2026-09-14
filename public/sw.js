const CACHE_NAME = 'staytup-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './logo.png',
  './icon.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache pre-fill partial error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching audio streaming requests, range requests, external media streams, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.includes('/api/') ||
    url.searchParams.has('audio') ||
    event.request.headers.get('range') ||
    url.hostname.includes('saavncdn') ||
    url.hostname.includes('googlevideo')
  ) {
    return;
  }

  // Network-first with cache fallback for HTML pages and deep-link navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./') || caches.match('./index.html');
      })
    );
    return;
  }

  // Cache-first strategy for static assets (js, css, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline and not cached
      });
    })
  );
});

// ==================== PWA NOTIFICATION CLICK & DEEP LINK HANDLING ====================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Retrieve destination deep-link URL (e.g. /song/123, /album/456, /artist/arijit)
  const targetPath =
    event.notification.data?.url ||
    event.notification.data?.path ||
    event.notification.data?.deepLink ||
    './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const destinationUrl = new URL(targetPath, self.location.origin).href;

      // 1. Look for an existing application window/tab
      for (const client of clientList) {
        // Check if window is from the same origin
        if (client.url && 'focus' in client) {
          // If already on the destination URL, simply focus it
          if (client.url === destinationUrl) {
            return client.focus();
          }

          // If client supports navigate, navigate directly and focus
          if ('navigate' in client) {
            return client.navigate(destinationUrl).then(() => client.focus());
          }

          // Otherwise notify the client via postMessage to change route and focus
          client.postMessage({
            type: 'NAVIGATE',
            url: destinationUrl,
          });
          return client.focus();
        }
      }

      // 2. If no existing window is open, open a new window directly to the deep link
      if (self.clients.openWindow) {
        return self.clients.openWindow(destinationUrl);
      }
    })
  );
});

// Push notification receiver
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Staytup Music';
    const options = {
      body: data.body || 'New music is playing on Staytup',
      icon: data.icon || './icon.png',
      badge: data.badge || './logo.png',
      data: {
        url: data.url || data.deepLink || './',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Staytup Music', {
        body: text,
        icon: './icon.png',
        data: { url: './' },
      })
    );
  }
});
