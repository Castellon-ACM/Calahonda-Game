// =====================================================================
//  SERVICE WORKER — Alcohol 365
//  Cachea la app para funcionamiento offline y fuerza recarga
//  automática cuando hay una versión nueva en GitHub.
//
//  ► INSTRUCCIONES: cada vez que hagas un commit con cambios,
//    cambia el número de CACHE_VERSION (ej: -2, -3, -4...).
//    Todos los jugadores recibirán la nueva versión automáticamente.
// =====================================================================

const CACHE_VERSION = 'v20260819-9';
const CACHE_NAME = 'alcohol365-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/firebase-config.js',
  './js/store.js',
  './js/navigation.js',
  './js/game-bottles.js',
  './js/account-ranking-auth.js',
  './js/admin.js',
  './js/event.js',
  './js/support.js',
  './js/casino-roulette.js',
  './js/casino-slots.js',
  './js/casino-blackjack.js',
  './js/casino-turtles.js',
  './js/casino-cosmetics.js',
  './js/coin3d.js',
  './js/bottle3d.js',
  './js/skins.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('[SW] Error precacheando:', err);
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) {
            console.log('[SW] Borrando caché antigua:', key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const fetched = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () { return cached; });

      return cached || fetched;
    })
  );
});
