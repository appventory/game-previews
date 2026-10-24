'use strict';
// Filled by tool/build_web.sh; standalone cache, never other games' caches.
const CACHE = 'castle-rock-aca612eba5bf01b48e51';
const ASSETS = ["assets/AssetManifest.bin", "assets/AssetManifest.bin.json", "assets/FontManifest.json", "assets/NOTICES", "assets/assets/fonts/Fredoka-OFL.txt", "assets/assets/fonts/Fredoka.ttf", "assets/assets/fonts/Nunito-OFL.txt", "assets/assets/fonts/Nunito.ttf", "assets/fonts/MaterialIcons-Regular.otf", "assets/fonts/fallback/Roboto-Regular.ttf", "assets/shaders/ink_sparkle.frag", "assets/shaders/stretch_effect.frag", "canvaskit/canvaskit.js", "canvaskit/canvaskit.wasm", "canvaskit/chromium/canvaskit.js", "canvaskit/chromium/canvaskit.wasm", "flutter.js", "flutter_bootstrap.js", "game-host.js", "icon.svg", "index.html", "main.dart.js", "manifest.json", "offline.js", "play-hosted-bridge.js", "pwa-viewport.js", "version.json"];
const scope = self.registration.scope;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new URL(path, scope).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('castle-rock-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (request.mode === 'navigate') {
      const page = await cache.match(new URL('index.html', scope).href);
      if (page) return page;
    }
    return (await cache.match(request)) || fetch(request);
  }));
});
