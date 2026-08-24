const CACHE_NAME = "klynn-pwa-v5";
const CACHE_PREFIX = "klynn-pwa-";
const APP_SHELL = "/";
const STATIC_ASSETS = [
  APP_SHELL,
  "/favicon.webp",
  "/logo.png",
  "/logotipo-klynn.png",
  "/login.webp",
  "/klynn-loader.svg",
  "/nuevo_mensaje.mp3",
  "/orden_entregada.mp3",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          STATIC_ASSETS.map((asset) => cache.add(new Request(asset, { cache: "reload" }))),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/functions/") ||
    url.pathname.startsWith("/functions/") ||
    url.pathname.includes("/auth/v1/") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/realtime/")
  );
}

function isStaticRequest(request, url) {
  return (
    url.origin === self.location.origin &&
    ["script", "style", "image", "font", "audio", "manifest"].includes(request.destination)
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (
    isApiRequest(url) ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.searchParams.has("t")
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const shell = await caches.match(APP_SHELL);
        return shell || Response.error();
      }),
    );
    return;
  }

  if (!isStaticRequest(request, url)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (response.type === "basic" || response.type === "cors")) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      });
    }),
  );
});
