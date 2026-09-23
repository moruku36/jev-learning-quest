// Jev 学習クエスト Service Worker
//   - 画面（HTML / JS / CSS / アイコン）だけをキャッシュし、オフラインでも起動できるようにする
//   - /api/* や外部サイトはキャッシュしない（学習データや認証情報を端末に残さない）
//   - 画面はネットワーク優先で取り、つながらないときだけキャッシュを使う（更新がすぐ反映される）
const CACHE = 'jlq-shell-v1';
const SHELL = ['/', '/index.html', '/app.js', '/styles.css', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // ログイン後の ?code= 付きなどのクエリは除いた形でキャッシュする
        if (res.ok && SHELL.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(url.pathname, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/index.html' : url.pathname))
  );
});
