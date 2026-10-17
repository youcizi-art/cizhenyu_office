/**
 * CIZHENYU Office Service Worker
 * 提供 PWA 离线支持与热更新能力
 */
const CACHE_NAME = 'cizhenyu-office-v1';

// 安装阶段立即激活
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 激活阶段立即接管页面，清理过期旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 监听客户端消息 (如手动触发强制更新与清空缓存)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  }
});

// 请求拦截策略：Network-First (优先网络拉取最新资产，网络异常时回退到缓存)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 忽略非 GET 请求或 API / Cloudflare Functions 请求
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 忽略非同源第三方资源
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
