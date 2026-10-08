// Service Worker for DonateConnect Progressive Web App (PWA)
const CACHE_NAME = 'donateconnect-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle API and assets seamlessly
});
