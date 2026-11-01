import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

// A tiny, dependency-free precache for this static application. No timer runs in the SW.
const root = 'dist'
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))
  return files.flat()
}
const files = (await walk(root)).filter((file) => !file.endsWith('sw.js') && !file.endsWith('.map')).sort()
const hash = createHash('sha256')
for (const file of files) { hash.update(relative(root, file)); hash.update(await readFile(file)) }
const version = hash.digest('hex').slice(0, 16)
const assets = files.map((file) => relative(root, file).replaceAll('\\', '/'))

await writeFile(join(root, 'sw.js'), `/* Generated at build time. */
const VERSION = ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
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
`)
console.log(`Offline cache: ${assets.length} files, version ${version}`)
