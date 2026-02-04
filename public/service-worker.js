
const CACHE_NAME = 'examai-pro-offline-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event: Cache core static assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// Fetch Event: Handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strategy for Navigation (HTML): Network First -> Cache Fallback
  // This ensures users get the latest version if online, but app loads if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => {
          // If offline and navigation fails, return cached index.html
          return caches.match('/index.html')
            .then((cachedRes) => cachedRes || caches.match('/'));
        })
    );
    return;
  }

  // Strategy for Assets (JS, CSS, Images): Cache First -> Network
  // This speeds up loading and enables offline functionality for app resources.
  event.respondWith(
    caches.match(event.request).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(event.request).then((networkRes) => {
        // Cache new successful responses for valid http/https requests
        if (networkRes && networkRes.status === 200 && url.protocol.startsWith('http')) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return networkRes;
      });
    })
  );
});
