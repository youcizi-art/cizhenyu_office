/*
 * ONLYOFFICE Service Worker Cache Cleanup & Self-Unregister
 */

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.registration.unregister();
      })
      .then(function () {
        return self.clients.claim();
      })
      .catch(function (err) {
        console.warn("[ServiceWorker cleanup error]:", err);
      })
  );
});

// 不再拦截任何网络请求，全部放行交由浏览器原生高速 HTTP 缓存处理