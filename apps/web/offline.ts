export const manifest = {
  name: 'Canvas', short_name: 'Canvas', description: 'A local-first drawing workspace',
  start_url: '/', display: 'standalone', background_color: '#f6f4ee', theme_color: '#f6f4ee',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
};
export const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f6f4ee"/><rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#1f1e1b" stroke-width="2"/><path d="M14 43c6-1 9-9 14-16s11-11 15-8-1 11-7 15-9 5-8 8 9 0 14-4 6-2 6 1" fill="none" stroke="#1f1e1b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="18" r="6" fill="#f2b4ab" stroke="#1f1e1b" stroke-width="2"/></svg>`;
export const serviceWorker = String.raw`
const CACHE = 'canvas-shell-v3';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const response = await fetch('/', { cache: 'reload' });
  if (!response.ok) throw new Error('Failed to cache application shell');
  const html = await response.clone().text();
  await cache.put('/', response);
  const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => new URL(match[1], self.location.origin)).filter(url => url.origin === self.location.origin).map(url => url.pathname);
  const queue = [...new Set(['/manifest.webmanifest', '/icon.svg','/fonts/index.json','/font-tools/subset.worker.js','/font-tools/harfbuzz.js','/font-tools/woff2-compress.js','/font-tools/woff2-decompress.js','/font-tools/subset.wasm','/fonts/dm-sans-regular.woff2','/fonts/dm-sans-bold.woff2','/fonts/gaegu-regular.woff2','/fonts/space-mono-regular.woff2', ...assets])];
  const visited = new Set();
  while (queue.length) {
    const path = queue.shift(); if (visited.has(path)) continue; visited.add(path);
    const asset = await fetch(path, { cache: 'reload' }); if (!asset.ok) throw new Error('Failed to cache ' + path);
    if (path.endsWith('.js')) {
      const code = await asset.clone().text();
      for (const match of code.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["'](\.\/[^"']+\.js)["']/g)) queue.push(new URL(match[1], new URL(path, self.location.origin)).pathname);
    }
    await cache.put(path, asset);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('canvas-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try { const response = await fetch(event.request); if (response.ok && (event.request.mode === 'navigate' || ['script', 'style', 'font'].includes(event.request.destination) || url.pathname.startsWith('/icons/')||url.pathname.startsWith('/fonts/')||url.pathname.startsWith('/font-tools/'))) await cache.put(event.request.mode === 'navigate' ? '/' : event.request, response.clone()); return response; }
    catch (error) { const cached = await caches.match(event.request.mode === 'navigate' ? '/' : event.request); if (cached) return cached; throw error; }
  })());
});`;
