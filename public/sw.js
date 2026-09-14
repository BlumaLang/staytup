// Staytup Music — High Performance Progressive Web App Service Worker
// Automatically stamped with unique build ID on every build/push

const BUILD_ID = '__BUILD_ID__';
const BUILD_TIME = '__BUILD_TIME__';
const CACHE_NAME = 'staytup-' + BUILD_ID;

const STATIC_ASSETS = [
  './',
  './index.html',
  './logo.png',
  './icon.png',
  './manifest.webmanifest'
];

// ==================== INSTALL LIFECYCLE ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache pre-fill partial error:', err);
      });
    })
  );
  // Activate the new worker without waiting for user to close all tabs
  self.skipWaiting();
});

// ==================== ACTIVATE LIFECYCLE ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('staytup-') && key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify all open client windows that a new version is active
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            buildId: BUILD_ID,
            buildTime: BUILD_TIME,
          });
        });
      });
    })
  );
});

// ==================== MESSAGE LISTENER ====================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==================== FETCH STRATEGY ====================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker cache entirely for:
  // - Non-GET requests
  // - Backend API requests (/api/*)
  // - Audio streams & media CDNs
  // - Range requests
  // - Version check file (/version.json)
  // - Service worker script itself (/sw.js)
  if (
    event.request.method !== 'GET' ||
    url.pathname.includes('/api/') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/sw.js') ||
    url.searchParams.has('audio') ||
    event.request.headers.get('range') ||
    url.hostname.includes('saavncdn') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  // 2. Network-First strategy for HTML navigation requests (ensures fresh index.html with offline fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // 3. Cache-First with network fallback & auto-caching for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
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
        if (client.url && 'focus' in client) {
          if (client.url === destinationUrl) {
            return client.focus();
          }

          if ('navigate' in client) {
            return client.navigate(destinationUrl).then(() => client.focus());
          }

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
