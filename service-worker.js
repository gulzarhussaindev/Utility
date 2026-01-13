const CACHE_NAME = "uol-directory-v2";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./data/staff.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* INSTALL */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* FETCH */
self.addEventListener("fetch", event => {
  const req = event.request;

  // Never cache admin
  if (req.url.includes("admin")) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req)
        .then(networkRes => {
          if (req.method === "GET") {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, networkRes.clone());
            });

            // Notify clients if staff.json changed
            if (req.url.includes("staff.json")) {
              self.clients.matchAll().then(clients => {
                clients.forEach(client =>
                  client.postMessage({ type: "DATA_UPDATED" })
                );
              });
            }
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
