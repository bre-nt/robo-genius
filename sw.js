const CACHE = "robo-genius-cache-v1";
const ASSETS = [
  "index.html","robotics.html","coding.html","community.html","robolink.html","contact.html","login.html",
  "style.css","app.js","manifest.json",
  "https://cdn-icons-png.flaticon.com/512/4712/4712025.png"
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(res => res || fetch(evt.request).catch(()=> caches.match('index.html'))));
});
