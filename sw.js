const CACHE_VERSION = 'v20260821-8';
const CACHE_NAME = 'alcohol365-' + CACHE_VERSION;
const PRECACHE_URLS = [
  './', './index.html', './manifest.json',
  './css/style.css', './css/album.css',
  './js/firebase-config.js', './js/store.js', './js/navigation.js',
  './js/game-bottles.js', './js/account-ranking-auth.js',
  './js/groups.js', './js/admin.js', './js/event.js', './js/support.js',
  './js/steal.js', './js/casino-roulette.js', './js/casino-slots.js',
  './js/casino-blackjack.js', './js/casino-turtles.js',
  './js/casino-cosmetics.js', './js/casino-poker.js', './js/ads.js',
  './js/notifications.js', './js/gift.js', './js/announcements.js',
  './js/auction.js', './js/coin3d.js', './js/bottle3d.js', './js/skins.js',
  './assets/icon-192.png', './assets/icon-512.png'
];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(PRECACHE_URLS).catch(function(){}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
      .then(function () {
        return self.clients.matchAll({ type: 'window' }).then(function (cs) {
          cs.forEach(function (c) { c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }); });
        });
      })
  );
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(function (cached) {
    const fetched = fetch(e.request).then(function (r) {
      if (r && r.status === 200) { const cl = r.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(e.request, cl); }); }
      return r;
    }).catch(function () { return cached; });
    return cached || fetched;
  }));
});
