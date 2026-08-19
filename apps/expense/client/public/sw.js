const CACHE_NAME = 'expensewatch-v1.0.0';
const BUILD_TIMESTAMP = '2024-12-30T00:00:00Z'; // Updated on each deployment

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  // Add other critical assets here
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/expenses',
  '/api/drafts',
  '/api/auth/user',
  '/api/expenses/stats',
  '/api/sync'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // API routes - Network first, cache as fallback
    if (isApiRoute(pathname)) {
      return await networkFirstStrategy(request);
    }
    
    // Static assets - Cache first, network as fallback
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request);
    }
    
    // HTML pages - Network first with cache fallback
    if (pathname === '/' || pathname.includes('.html') || !pathname.includes('.')) {
      return await networkFirstStrategy(request);
    }
    
    // Default to network first
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('Fetch failed:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    // Return error response
    return new Response('Network error', { status: 503 });
  }
}

async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Both cache and network failed for:', request.url);
    throw error;
  }
}

function isApiRoute(pathname) {
  return API_ROUTES.some(route => pathname.startsWith(route));
}

function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/icons/');
}

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncExpenseData());
  }
});

async function syncExpenseData() {
  try {
    // Get pending sync data from IndexedDB or localStorage
    const syncData = await getSyncData();
    
    if (syncData && syncData.length > 0) {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData),
        credentials: 'include',
      });
      
      if (response.ok) {
        await clearSyncData();
        console.log('Background sync completed successfully');
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getSyncData() {
  // Implementation would depend on how sync data is stored
  // This is a placeholder for the actual implementation
  return [];
}

async function clearSyncData() {
  // Implementation would clear the stored sync data
  // This is a placeholder for the actual implementation
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ExpenseWatch', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view':
        event.waitUntil(clients.openWindow('/'));
        break;
      case 'add-expense':
        event.waitUntil(clients.openWindow('/?action=add'));
        break;
      default:
        event.waitUntil(clients.openWindow('/'));
    }
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow('/'));
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME, timestamp: BUILD_TIMESTAMP });
        break;
      case 'SYNC_DATA':
        // Trigger background sync
        self.registration.sync.register('expense-sync');
        break;
    }
  }
});

console.log('Service Worker loaded:', CACHE_NAME);
