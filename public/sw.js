self.addEventListener('install', function (event) {
  console.log('[Service worker] Installing service Worker ...', event);
});

self.addEventListener('activate', function (event) {
  console.log('[Service worker] Activating service Worker ...', event);
  return self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  console.log('[Service Worker] Fetching something...', event);
  event.respondWith(fetch(event.request));
});
