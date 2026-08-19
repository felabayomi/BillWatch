// IncomeLift Service Worker - Aggressive Update Strategy
const CACHE_NAME = 'incomelift-v2'; // Incremented version to force cache refresh
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/manifest.json'
];

// Install event - cache resources and skip waiting
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version');
  // Skip waiting to immediately activate new service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('SW: Cache install failed:', error);
      })
  );
});

// Fetch event - network first, then cache (aggressive updates)
self.addEventListener('fetch', (event) => {
  // For HTML requests, always try network first
  if (event.request.destination === 'document' || 
      event.request.url.includes('.html') ||
      event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // For other resources, try cache first but refresh in background
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Fetch from network in background to update cache
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
          
          // Return cached version immediately, or wait for network
          return cachedResponse || fetchPromise;
        })
    );
  }
});

// Activate event - aggressively clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version');
  
  event.waitUntil(
    Promise.all([
      // Clear ALL old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Message event - handle manual cache refresh
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('SW: Manual cache clear requested');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('SW: Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('SW: All caches cleared');
        // Reload all clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});