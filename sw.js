// Версия кэша. Меняется при каждом обновлении файлов.
const CACHE = "traty-v5";
const FILES = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(FILES.map(f => c.add(f))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", e => {
  if (e.data === "update") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = req.url;
  if (u.includes("api.anthropic.com") || u.includes("googleapis.com") ||
      u.includes("firebaseio.com") || u.includes("firebaseapp.com")) return;

  // Свои файлы: сначала сеть, кэш только как запасной вариант без интернета.
  const own = u.startsWith(self.location.origin);
  if (own) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Сторонние библиотеки меняются редко: берём из кэша, если он есть.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
