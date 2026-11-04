/* Pour Dawgz Field Book — service worker (offline + installable) */
var CACHE = "fieldbook-v1";
var CORE = [
  "/fieldbook.html",
  "/fieldbook-d97a8d8f.html",
  "/fieldbook-manifest.json",
  "/images/field-book-icon-192.png",
  "/images/field-book-icon.png"
];
self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function(r){
      var copy = r.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      return r;
    }).catch(function(){
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
