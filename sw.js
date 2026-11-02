const CACHE_NAME = 'lkt-tracker-v25';
const urlsToCache = [
    './',
    './app.html',
    './index.html',
    './trinkspiele.html',
    './notenquiz.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache).then(() =>
                // Werkzeuge aus dem Netz zusätzlich offline vorhalten (Fehler hier stören nicht)
                Promise.all(LIBS.map(u => cache.add(u).catch(() => null)))))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => 
            Promise.all(names.filter(n => n.startsWith('lkt-tracker-') && n !== CACHE_NAME).map(n => caches.delete(n)))  // Notenmappe (lkt-noten-*) bleibt erhalten
        )
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// ============================================================
// PUSH-NACHRICHTEN empfangen und anzeigen
// ============================================================
self.addEventListener('push', event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'LKT Tracker', body: event.data ? event.data.text() : '' }; }
    const title = data.title || 'LKT Tracker';
    event.waitUntil(self.registration.showNotification(title, {
        body: data.body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        data: { url: data.url || './app.html' }
    }));
});

// Antippen -> App öffnen (oder vorhandenes Fenster nach vorne holen)
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = new URL((event.notification.data && event.notification.data.url) || './app.html', self.registration.scope).href;
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) { if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate && c.url !== url && c.navigate(url).catch(() => {}); return c.focus(); } }
        return clients.openWindow ? clients.openWindow(url) : null;
    }));
});

// Browser hat das Abo erneuert -> App kümmert sich beim nächsten Öffnen darum
self.addEventListener('pushsubscriptionchange', () => {});
