const BASE_PATH = '/Line-Stamp-Editor';
const VERSION = '1.0.10'; // Bump version to force cache update
const CACHE_NAME = `stickerstudio-${VERSION}`;
const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/style.css',
  BASE_PATH + '/script.js',
  BASE_PATH + '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap'
];

// Install event - cache assets
// On install, clear all caches and re-cache assets (force update)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => {
      return caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Opened cache (fresh)');
          return cache.addAll(ASSETS_TO_CACHE);
        });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Always try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid, update cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
