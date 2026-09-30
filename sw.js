// FloodEye service worker — เปลี่ยน VERSION ทุกครั้งที่แก้ index.html เพื่อบังคับโหลดใหม่
const VERSION = "floodeye-v85";
const SHELL = ["./", "index.html", "manifest.json", "logo-eye.png", "favicon-64.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = e.request.url;
  // ข้อมูลสด: webhook, Firestore, Auth, tile แผนที่ — ไม่ cache
  if (e.request.method !== "GET" || u.includes("/webhook/") || u.includes("googleapis.com") || u.includes("firebase") || u.includes("tile.openstreetmap.org")) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
