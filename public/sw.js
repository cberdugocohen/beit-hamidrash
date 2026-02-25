const CACHE_NAME = "beit-hamidrash-v4";

// Only these static assets get cached — nothing else
const STATIC_ASSETS = [
  "/favicon.svg",
  "/logo.png",
  "/icon-192.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => {
        console.log("[SW] Deleting old cache:", k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

// Only serve from cache for whitelisted static assets, never for auth/API/dynamic
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // NEVER cache or intercept: Supabase, auth, API routes, _next
  if (
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return; // Let browser handle normally — no SW involvement
  }

  // For whitelisted static assets only: serve from cache, fallback to network
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
  // All other requests go straight to network — no caching
});
