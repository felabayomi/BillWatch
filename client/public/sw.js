// BillWatch Service Worker - Safe deployment cache handling
const STATIC_CACHE = 'billwatch-static-v3';
const ASSET_CACHE = 'billwatch-assets-v3';

const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', function(event) {
  self.skipWaiting();

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache)),
      caches.open(ASSET_CACHE),
    ]).catch((error) => {
      console.log('SW: Cache failed', error);
    }),
  );
});

self.addEventListener('activate', function(event) {
  self.clients.claim();

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== ASSET_CACHE) {
              console.log('SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          }),
        ),
      ),
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'FORCE_REFRESH' });
        });
      }),
    ]),
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isApiRequest = requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/api');

  if (isApiRequest) {
    return;
  }

  const isDocumentRequest = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (isDocumentRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) {
            throw new Error('Network response was not ok');
          }
          return response;
        })
        .catch(() => caches.match('/') || new Response('App is offline. Please check your connection.', {
          headers: { 'Content-Type': 'text/html' },
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(ASSET_CACHE).then((cache) => cache.put(event.request, clonedResponse));
        return response;
      });
    }),
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))),
      ),
    );
  }
});