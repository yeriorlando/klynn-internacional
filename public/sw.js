const CACHE_NAME = "klynn-pwa-v3";
const STATIC_ASSETS = [
  "/",
  "/favicon.webp",
  "/logo.png",
  "/logotipo-klynn.png",
  "/login.webp",
  "/klynn-loader.svg",
  "/nuevo_mensaje.mp3",
  "/orden_entregada.mp3",
  "/manifest.json"
];

// 1. Install: Pre-cache static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching non-fatal warning:", err);
      });
    })
  );
});

// 2. Activate: Limpiar caches anteriores inmediatamente y reclamar clientes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar métodos que no sean GET
  if (request.method !== "GET") return;

  // Ignorar Vite dev server, HMR, APIs y WebSockets
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.includes("/auth/v1/") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/realtime/") ||
    url.search.includes("t=")
  ) {
    return;
  }

  // Estrategia Network-First con fallback a caché y fallback a App Shell
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // Fallback 1: Buscar coincidencia exacta en caché
        const cached = await caches.match(request);
        if (cached) return cached;

        // Fallback 2: Para navegación o páginas HTML, retornar el App Shell raíz
        if (
          request.mode === "navigate" ||
          request.destination === "document" ||
          (request.headers.get("accept") && request.headers.get("accept").includes("text/html"))
        ) {
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;

          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Klynn Cloud Offline</title></head><body><div id="root">Cargando modo offline...</div></body></html>`,
            {
              headers: { "Content-Type": "text/html; charset=utf-8" },
              status: 200,
            }
          );
        }

        // Fallback 3: Para JSON / datos offline
        if (request.headers.get("accept") && request.headers.get("accept").includes("application/json")) {
          return new Response(JSON.stringify({ ok: true, offline: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Fallback 4: Respuesta vacía 200 para evitar que el navegador genere errores rojos fatales
        return new Response("", { status: 200 });
      })
  );
});
