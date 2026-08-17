const CACHE_NAME = 'iglow-beauty-v21';
const INDEX_FALLBACK = './index.html';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/proof.css',
  './assets/studio-academy.css',
  './assets/theme.css',
  './assets/luxury.css',
  './assets/app.js',
  './assets/icon.svg',
  './assets/iglow-logo.svg',
  './assets/academy-lash-brow.svg',
  './assets/academy-hair.svg',
  './data/transformations.json',
  './data/sources.json',
  './data/studio-academy.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

async function putIfUsable(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, fallback = null) {
  try {
    return await putIfUsable(request, await fetch(request));
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallback) {
      const fallbackResponse = await caches.match(fallback);
      if (fallbackResponse) return fallbackResponse;
    }
    throw error;
  }
}

async function cacheFirstExact(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return putIfUsable(request, await fetch(request));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => putIfUsable(request, response))
    .catch(() => null);
  return cached || (await network) || new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, INDEX_FALLBACK));
    return;
  }

  if (url.pathname.includes('/data/') || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'image') {
    // Cache local assets byte-for-byte as served; external portfolio media is
    // intentionally left to its origin so this worker never transforms it.
    event.respondWith(cacheFirstExact(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
