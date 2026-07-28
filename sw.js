// Service Worker ОТКЛЮЧЁН.
// Раньше он мог вернуть пустой ответ (null) при сбое сети — и Safari ломал
// всю страницу ("FetchEvent.respondWith received an error: Returned response
// is null"). Пользы он давал почти ноль (картинки идут через /api/, которые
// он и так пропускал), а риск был высокий. Теперь он саморазрегистрируется и
// чистит кэш, чтобы у всех, кто его успел получить, сайт снова работал напрямую.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {}
        try { await self.registration.unregister(); } catch (e) {}
        // Перезагружаем открытые вкладки, чтобы контроль SW сразу снялся
        try {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((c) => c.navigate(c.url));
        } catch (e) {}
    })());
});

// fetch НЕ перехватываем — все запросы идут напрямую в сеть (никаких null-ответов)
