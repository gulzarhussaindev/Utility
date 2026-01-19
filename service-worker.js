/* =====================================================
   UOL Staff Directory – Service Worker
   Strategy: Network-first with cache fallback
===================================================== */

const CACHE_NAME = "uol-directory-v4";

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
   FETCH
========================= */
self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        // 🌐 Try network first
        const networkResponse = await fetch(req);

        // Cache successful responses (including staff.json)
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, networkResponse.clone());

        return networkResponse;
      } catch {
        // 📦 Offline fallback
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })()
  );
});
