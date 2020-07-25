importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v24';
var CACHE_DYNAMIC_NAME = 'dynamic-v8';

self.addEventListener('install', function (event) {
  console.log('[Service worker] Installing service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(function (cache) {
      console.log('[Service Worker] precaching app shell');
      cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        '/src/js/app.js',
        '/src/js/utility.js',
        '/src/js/feed.js',
        '/src/js/idb.js',
        '/src/js/material.min.js',
        '/src/css/app.css',
        '/src/css/feed.css',
        '/src/images/main-image.jpg',
        'https://fonts.googleapis.com/css?family=Roboto:400,700',
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
      ]);
    })
  );
});

self.addEventListener('activate', function (event) {
  console.log('[Service worker] Activating service Worker ...', event);
  event.waitUntil(
    caches.keys().then(function (keysList) {
      return Promise.all(
        keysList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] removing old cache.', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const url = 'https://pwagram-7a83d.firebaseio.com/posts.json';
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        var clonedRes = res.clone();
        clearAllData('posts').then(function () {
          clonedRes.json().then(function (data) {
            for (let key in data) {
              writeData('posts', data[key]);
            }
          });
        });

        return res;
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(function (res) {
              return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(function (err) {
              return caches.open(CACHE_STATIC_NAME).then(function (cache) {
                if (event.request.url.indexOf('/help')) {
                  return cache.match('/offline.html');
                }
              });
            });
        }
      })
    );
  }
});

const url = 'https://pwagram-7a83d.firebaseio.com/posts.json';

self.addEventListener('sync', function (event) {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-post') {
    console.log('[Service Worker] syncing new posts');
    event.waitUntil(
      readAllData('sync-posts').then(function (data) {
        for (let dt of data) {
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              id: dt.id,
              title: dt.title,
              location: dt.location,
              image:
                'https://firebasestorage.googleapis.com/v0/b/pwagram-7a83d.appspot.com/o/sf-boat.jpg?alt=media&token=3f405cb1-bb08-4b54-90f6-f77c8e2b80b8',
            }),
          })
            .then(function (res) {
              console.log('Sent data', res);
              if (res.ok) {
                deleteItemFromData('sync-posts', dt.id);
              }
            })
            .catch(function () {
              console.log('Error while sending data', err);
            });
        }
      })
    );
  }
});
