const CACHE_NAME = 'lkt-tracker-v32';
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
    // Jede Datei einzeln speichern – fehlt eine (z.B. ein Icon), klappt der Rest trotzdem
    event.waitUntil(caches.open(CACHE_NAME).then(cache =>
        Promise.all(urlsToCache.concat(LIBS).map(u => cache.add(u).catch(() => null)))));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(names.filter(n => n.startsWith('lkt-tracker-') && n !== CACHE_NAME).map(n => caches.delete(n))))  // Notenmappe (lkt-noten-*) bleibt erhalten
            .then(() => self.clients.claim())
    );
});

const APP_SHELL = new URL('./app.html', self.registration.scope).href;

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;                                   // Speichern/Hochladen nie abfangen
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const isLib = LIBS.includes(url.href);
    if (!sameOrigin && !isLib) return;                                  // Worker/Server-Daten: direkt ans Netz

    // Seiten (app.html, index.html …): erst Netz (aktuell), ohne Netz aus dem Speicher
    if (req.mode === 'navigate' || (sameOrigin && /\.html?$|\/$/.test(url.pathname))) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 4000);         // schlechtes Netz: nach 4 s aus dem Speicher
                const res = await fetch(req, { signal: ctrl.signal });
                clearTimeout(t);
                if (res && res.ok) cache.put(url.origin + url.pathname, res.clone());
                return res;
            } catch (e) {
                return (await cache.match(req, { ignoreSearch: true }))
                    || (await cache.match(url.origin + url.pathname))
                    || (await cache.match(APP_SHELL))
                    || new Response('<h2 style="font-family:sans-serif;text-align:center;margin-top:30vh">Offline – die App war auf diesem Gerät noch nicht gespeichert.<br>Bitte einmal mit Internet öffnen.</h2>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
        })());
        return;
    }

    // Alles andere (Icons, Werkzeuge): aus dem Speicher, sonst Netz und merken
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(req, { ignoreSearch: sameOrigin });
        if (hit) return hit;
        try {
            const res = await fetch(req);
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
        } catch (e) { return hit || Response.error(); }
    })());
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
