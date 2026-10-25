/* Olympiad Quiz Kids service worker: app shell offline, pictures cached as they are viewed */
const VERSION = 'oqk-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'bank.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fresh = url.pathname.endsWith('bank.json') || url.pathname.endsWith('app.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (fresh) { // network first, so updates published to GitHub reach the app
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req)));
  } else { // cache first for pictures, fonts and styles
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })));
  }
});
