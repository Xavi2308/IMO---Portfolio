// Service Worker para cache de recursos estáticos y API calls
const CACHE_NAME = 'imo-v1.0.0';
const API_CACHE_NAME = 'imo-api-v1.0.0';

// Recursos para cachear
const STATIC_RESOURCES = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// URLs de API para cachear
const API_PATTERNS = [
  /\/rest\/v1\/products/,
  /\/rest\/v1\/orders/,
  /\/rest\/v1\/companies/
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Intercepción de requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache strategy para recursos estáticos
  if (request.method === 'GET' && isStaticResource(url)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          });
        })
    );
    return;
  }

  // Cache strategy para API calls
  if (request.method === 'GET' && isAPICall(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // Solo cachear respuestas exitosas
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Si falla la red, intentar devolver respuesta cacheada
            return cachedResponse;
          });

          // Stale-while-revalidate: devolver cache inmediatamente si existe,
          // pero actualizar en background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Para todo lo demás, ir a la red
  event.respondWith(fetch(request));
});

// Helpers
function isStaticResource(url) {
  return url.pathname.startsWith('/static/') || 
         url.pathname === '/' ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.svg');
}

function isAPICall(url) {
  return API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Limpiar cache viejo periódicamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    cleanOldCache();
  }
});

function cleanOldCache() {
  caches.open(API_CACHE_NAME).then((cache) => {
    cache.keys().then((requests) => {
      requests.forEach((request) => {
        cache.match(request).then((response) => {
          if (response) {
            const cacheDate = new Date(response.headers.get('date'));
            const now = new Date();
            const diffMs = now - cacheDate;
            
            // Eliminar cache de más de 1 hora
            if (diffMs > 60 * 60 * 1000) {
              cache.delete(request);
            }
          }
        });
      });
    });
  });
}
