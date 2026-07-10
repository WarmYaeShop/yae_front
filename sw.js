// Service Worker для PWA. Код (js/css/html/json) — всегда из сети, чтобы
// обновления применялись мгновенно. Картинки — из кэша (скорость + офлайн).
const CACHE = 'yae-shop-v3';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.pathname.includes('/api/')) return;

    // Код и данные — строго из сети (никакого устаревания), кэш только как офлайн-фоллбэк
    if (req.mode === 'navigate' || /\.(js|css|html|json)$/i.test(url.pathname)) {
        e.respondWith(fetch(req).catch(() => caches.match(req)));
        return;
    }

    // Картинки и прочая статика — cache-first
    e.respondWith(
        caches.match(req).then((cached) => cached || fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
        }))
    );
});
