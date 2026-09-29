/*
 * Игра как приложение: после первого запуска открывается мгновенно и без интернета.
 * Страница — сначала сеть (свежая версия), без сети — из кэша. Скрипты, стили, картинки, музыка —
 * из кэша сразу, а в фоне обновляются (у скриптов и стилей Vite имена с хэшем — новая версия = новый файл).
 */
const CACHE = 'road-breakthrough-v1';

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon-192.png']); }).catch(function() {}));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e) {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    if (req.headers.has('range')) return; // музыка частями — пусть идёт мимо кэша
    if (req.mode === 'navigate') {
        e.respondWith(fetch(req).then(function(res) {
            const copy = res.clone(); caches.open(CACHE).then(function(c) { c.put('./index.html', copy); });
            return res;
        }).catch(function() { return caches.match('./index.html'); }));
        return;
    }
    e.respondWith(caches.open(CACHE).then(function(c) {
        return c.match(req).then(function(hit) {
            const net = fetch(req).then(function(res) { if (res && res.ok && res.type === 'basic') c.put(req, res.clone()); return res; }).catch(function() { return hit; });
            return hit || net;
        });
    }));
});
