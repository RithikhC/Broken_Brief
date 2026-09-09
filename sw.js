/**
 * Daydream service worker.
 *
 * Precaches the entire app on first visit — every module, every stylesheet —
 * because "works great with no signal" has to include the second visit, the
 * cold start, and the reload. Cache-first for everything we own; navigations
 * fall back to the cached shell so the app opens with the radio off.
 *
 * There are no images to cache: covers are generated as SVG at runtime.
 */
const VERSION = 'daydream-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './css/fun.css',
  './js/app.js',
  './js/lib/dom.js',
  './js/lib/art.js',
  './js/lib/store.js',
  './js/lib/net.js',
  './js/lib/sync.js',
  './js/lib/geo.js',
  './js/lib/sun.js',
  './js/core/planner.js',
  './js/core/state.js',
  './js/core/clock.js',
  './js/data/spots.js',
  './js/ui/overlay.js',
  './js/ui/card.js',
  './js/ui/poster.js',
  './js/ui/profile.js',
  './js/ui/delight.js',
  './js/views/discover.js',
  './js/views/plan.js',
  './js/views/live.js',
  './js/views/boards.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Navigations: cached shell first, so a cold start offline still opens.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(req).catch(() => caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // Refresh in the background, but never block on it.
        fetch(req).then(res => {
          if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
