// BillWatch Service Worker - Aggressive Cache Management
const CACHE_NAME = 'billwatch-v' + Date.now(); // Dynamic cache name forces updates
const STATIC_CACHE = 'billwatch-static-v' + Date.now();

// Resources to cache (minimal set for performance)
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - aggressive installation
self.addEventListener('install', function(event) {
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('SW: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('SW: Cache failed', error);
      })
  );
});

// Activate event - aggressive cleanup
self.addEventListener('activate', function(event) {
  // Claim all clients immediately
  self.clients.claim();
  
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches aggressively
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== STATIC_CACHE) {
              console.log('SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Force refresh all open tabs
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'FORCE_REFRESH' });
        });
      })
    ])
  );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    // Always try network first for fresh content
    fetch(event.request)
      .then(function(response) {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache the new response
        caches.open(STATIC_CACHE)
          .then(function(cache) {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(function() {
        // If network fails, try cache
        return caches.match(event.request)
          .then(function(response) {
            if (response) {
              return response;
            }
            // If cache also fails, return offline page for navigation requests
            if (event.request.destination === 'document') {
              return new Response('App is offline. Please check your connection.', {
                headers: { 'Content-Type': 'text/html' }
              });
            }
          });
      })
  );
});

// Message event - handle refresh requests
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});