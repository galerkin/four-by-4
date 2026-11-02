/* Generated at build time. */
const VERSION = "361ee9c7134c862e";
const ASSETS = ["apple-touch-icon.png","assets/index-BJSMbX22.js","assets/index-Do9eq0fW.css","assets/manrope-latin-wght-normal-DHIcAJRg.woff2","assets/oswald-latin-wght-normal-CzS3kehr.woff2","favicon.svg","icons/icon-192.png","icons/icon-512.png","index.html","manifest.webmanifest"];
const PREFIX = 'four-by-four:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const assetURLs = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assetURLs)));
  // Do not skipWaiting: a new version must not interrupt an active workout.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  const isHome = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
  const key = isHome ? new URL('index.html', scope).href : url.href;
  if (!isHome && !assetURLs.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(request);
  })());
});
