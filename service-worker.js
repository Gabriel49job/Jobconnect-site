// JOB CONNECT - Service Worker
const CACHE_NAME = 'jobconnect-v1.0.0';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/confidentialite.html'];

self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(caches.keys().then(names => Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.pathname.includes('/api/') || url.pathname.includes('firebaseapp.com') || url.pathname.includes('cloudinary.com')) {
    event.respondWith(fetch(request).then(res => {
      if (res.status === 200) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
      return res;
    }).catch(() => caches.match(request).then(c => c || createOfflineResponse())));
  } else if (request.method === 'GET' && (url.pathname.match(/\.(png|jpg|gif|svg|css)$/i) || request.destination === 'image')) {
    event.respondWith(caches.match(request).then(c => c || fetch(request).then(res => {
      if (res.status === 200) caches.open(CACHE_NAME).then(cc => cc.put(request, res.clone()));
      return res;
    }).catch(() => createOfflineResponse())));
  } else {
    event.respondWith(fetch(request).catch(() => createOfflineResponse()));
  }
});

self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'JOB CONNECT', body: 'Notification' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icon-192.png' }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll().then(list => {
    for (let client of list) { if (client.url === '/' && 'focus' in client) return client.focus(); }
    return clients.openWindow('/');
  }));
});

function createOfflineResponse() {
  return new Response('<html><body style="background:#073C28;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>📡 Offline</h1><p>Vérifiez votre connexion</p><button onclick="location.reload()" style="padding:10px 20px;border:none;border-radius:5px;cursor:pointer">Réessayer</button></div></body></html>', { headers: { 'Content-Type': 'text/html' } });
}

console.log('[SW] Loaded');
