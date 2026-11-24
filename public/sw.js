/* NEXO service worker: the whole app works offline after the first visit.
 * - Install: stores the shell plus every built file listed in precache.json (JS, CSS, fonts,
 *   images, music and video), so nothing depends on what the first visit happened to load.
 * - Page (navigation): network first, cached copy when offline.
 * - Built assets: cache first.
 * - Audio/video Range requests: answered from the cached full file (206), so music plays offline.
 */
const CACHE = 'nexo-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const LIST = './precache.json';

async function builtFiles(source) {
  try {
    const res = await source(LIST);
    if (!res || !res.ok) return [];
    const files = await res.json();
    return Array.isArray(files) ? files.filter((f) => typeof f === 'string').map((f) => `./${f}`) : [];
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const files = await builtFiles((u) => fetch(u, { cache: 'no-store' }));
      // Bypass the HTTP cache so a stale index.html never lands next to a newer file list.
      await cache.addAll([...SHELL, LIST, ...files].map((u) => new Request(u, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // Drop files from earlier builds that the current list no longer mentions.
      const cache = await caches.open(CACHE);
      const keep = new Set([...SHELL, LIST, ...(await builtFiles((u) => cache.match(u)))].map((u) => new URL(u, self.registration.scope).href));
      const entries = await cache.keys();
      await Promise.all(entries.filter((r) => !keep.has(r.url)).map((r) => cache.delete(r)));
      await self.clients.claim();
    })(),
  );
});

/** Serves "Range: bytes=a-b" from the cached full file; falls back to the network when not cached. */
async function rangeResponse(req) {
  const hit = await caches.match(req.url, { ignoreVary: true, ignoreSearch: true });
  if (!hit) return fetch(req);
  const buf = await hit.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = 0;
  let end = size - 1;
  if (m && m[1]) {
    start = Number(m[1]);
    if (m[2]) end = Math.min(Number(m[2]), size - 1);
  } else if (m && m[2]) {
    start = Math.max(0, size - Number(m[2])); // suffix range: last N bytes
  }
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.headers.has('range')) {
    event.respondWith(rangeResponse(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
