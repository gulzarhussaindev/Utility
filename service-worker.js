/* =====================================================
   UOL Staff Directory – Service Worker
   Strategy: Network-first (NO JSON CACHE)
   Author: Gulzar Hussain
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

  // 🚫 NEVER cache staff.json (always fetch fresh)
  if (req.url.includes("staff.json")) {
    event.respondWith(fetch(req));
    return;
  }

  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return caches.match(req);
      }
    })()
  );
});
