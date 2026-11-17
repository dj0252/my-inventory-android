/* Increment this cache identifier for each released application update. */
const CACHE = 'dahaizhaozhen-pwa-test-2';
const APP_SHELL = ['./index.html', './manifest.webmanifest', './icon.svg'];
const APP_PATH = new URL('./index.html', self.registration.scope).pathname;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('dahaizhaozhen-pwa-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Online-first: always try the latest HTML rather than returning an old shell.
        const response = await fetch(request, {cache: 'no-store'});
        if (response.ok && url.pathname === APP_PATH) {
          const cache = await caches.open(CACHE);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch {
        const fallback = await caches.match('./index.html');
        return fallback || Response.error();
      }
    })());
    return;
  }
  // Cache only explicitly listed static assets; never cache backup files or user photos.
  if (!APP_SHELL.some(path => url.pathname === new URL(path, self.registration.scope).pathname)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
