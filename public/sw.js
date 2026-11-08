/**
 * ============================================
 * FILE: sw.js
 * FEATURE: Service Worker (Offline Support)
 * RESPONSIBILITY: 
 *   - App ki files ko cache karna
 *   - Offline mode mein app ko chalana
 *   - Network requests ko handle karna
 * 
 * AUTHOR: Asum Universe Team
 * CREATED: 2026-09-21
 * ============================================
 */

const CACHE_NAME = 'asuum-universe-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/app.ts',
  '/src/app.css',
  '/manifest.json'
];

// Install event - files ko cache karo
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - cached files dikhaao
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Cache se mil gaya
        }
        return fetch(event.request); // Nahi mila toh internet se lao
      })
  );
});

// Activate event - purana cache delete karo
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});