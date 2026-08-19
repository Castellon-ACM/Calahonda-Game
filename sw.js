// =====================================================================
//  SERVICE WORKER — Alcohol 365
//  Cachea la app para funcionamiento offline y fuerza recarga
//  automática cuando hay una versión nueva en GitHub.
// =====================================================================

// ── VERSIÓN ───────────────────────────────────────────────────────────
// Este valor se actualiza automáticamente en cada deploy.
// El SW compara esta versión con la que tiene guardada:
// si son distintas, borra la caché vieja y recarga todos los clientes.
const CACHE_VERSION = 'v20260819-1';
const CACHE_NAME = 'alcohol365-' + CACHE_VERSION;

// Archivos que se cachean al instalar
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

// ── INSTALL: cachear recursos ─────────────────────────────────────────
self.addEventListener('install', function (event) {
  // Activar inmediatamente sin esperar a que cierren las pestañas viejas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('[SW] Error precacheando:', err);
      });
    })
  );
});

// ── ACTIVATE: borrar cachés antiguas y tomar el control ──────────────
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
      // Tomar control de todos los clientes abiertos inmediatamente
      return self.clients.claim();
    }).then(function () {
      // Notificar a todos los clientes que hay versión nueva → recargar
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// ── FETCH: servir desde caché, actualizar en segundo plano ───────────
self.addEventListener('fetch', function (event) {
  // Solo manejar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // No interceptar Firebase, CDNs externos ni APIs
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      // Fetch en paralelo para actualizar la caché
      const fetched = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () { return cached; });

      // Devolver caché inmediatamente si existe, si no esperar al fetch
      return cached || fetched;
    })
  );
});
