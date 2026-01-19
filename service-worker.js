/* =====================================================
   UOL Staff Directory – Service Worker
   Strategy: Network-first (auto refresh)
   Author: Gulzar Hussain
===================================================== */

const CACHE_NAME = "uol-directory-v2";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/custom_style.css",
  "./js/app.js",
  "./manifest.json"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => k !== CACHE_NAME && caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* =========================
   FETCH (NETWORK FIRST)
========================= */
self.addEventListener("fetch", event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        // 🔑 Always try network first
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (err) {
        // 🔒 Offline fallback
        const cachedResponse = await caches.match(request);
        return cachedResponse || Response.error();
      }
    })()
  );
});
