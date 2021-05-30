var CACHE_NAME_STATIC = 'my-site-pre-cache-v4';
var CACHE_NAME_DYNAMIC = 'my-site-dynamic-cache-v4';
var urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/media.css',
  '/css/style.css',
  '/js/app.js',
  '/js/fetch.js',
  '/js/promise.js',
  '/favicon.ico',
  '/images/no-image.png',
  '/images/app-icon-144x144.png',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat&family=Sacramento&display=swap',
];

// cache size limit function


function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName)
    .then(function (cache) {
      return cache.keys()
        .then(function (keys) {
          if (keys.length > maxItems) {
            cache.delete(keys[0])
              .then(limitCacheSize(cacheName, maxItems));
          }
        });
    })
}

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

function invalidResponse(res) {
  return !res || res.status !== 200 || res.type !== 'basic'
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC)
      .then(function (cache) {
        console.log('[Service Worker] Pre Caching App Shell...');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function (event) {
  var cacheAllowlist = [CACHE_NAME_STATIC, CACHE_NAME_DYNAMIC];

  /**
   * Enable navigation preload if it's supported.
   * See https://developers.google.com/web/updates/2017/02/navigation-preload
   */

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});



function cacheOnly(event) {
  event.respondWith(
    caches.match(event.request)
  );
}

function imageMatchWithNwFallback(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (image) {
        if (image) {
          return image;
        } else {
          return fetch(event.request)
            .then(function (res) {
              return caches.open(CACHE_NAME_DYNAMIC)
                .then(function (cache) {
                  cache.put(event.request, res.clone());
                  return res;
                })
            })
            .catch(() => {
              return caches.match('/images/no-image.png');
            });
        }
      })
  );
}

function cacheThenNetwork(event) {
  event.respondWith(
    caches.open(CACHE_NAME_DYNAMIC)
      .then(function (cache) {
        return fetch(event.request)
          .then(function (res) {

            // Check if we received a valid response
            if (invalidResponse(res)) {
              return res;
            }

            // Limiting cache to 20 items
            limitCacheSize(CACHE_NAME_DYNAMIC, 20);
            cache.put(event.request, res.clone());
            return res;
          })
          .catch(function (err) {
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            if (event.request.headers.get('accept').includes('image/')) {
               
                return caches.match(event.request)
                  .then(function (image) {
                    if(image) return image;
                    return caches.match('/images/no-image.png');
                  });
            }
          });
      })
  );
}

self.addEventListener('fetch', function (event) {
  // check if request is made by chrome extensions or web page
  // if request is made for web page url must contains http.
  if (event.request.url.indexOf('http') !== 0) return; // skip the request. if request is not made with http protocol
  else if (isInArray(event.request.url, urlsToCache)) {
    cacheOnly(event);
  }
  else if (event.request.headers.get('accept').includes('image/')) {
    imageMatchWithNwFallback(event);
  }
  else {
    cacheThenNetwork(event);
  }
});
