importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v35';
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

const url =
  'https://us-central1-pwagram-7a83d.cloudfunctions.net/storePostData';

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
                res.json().then(function (resData) {
                  deleteItemFromData('sync-posts', resData.id);
                });
              }
            })
            .catch(function (err) {
              console.log('Error while sending data', err);
            });
        }
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  var notification = event.notification;
  var action = event.action;
  console.log('notification', notification);
  if (action === 'confirm') {
    console.log('Confirm was choosen');
  } else {
    console.log('notification not confirmed', action);
    event.waitUntil(
      clients.matchAll().then(function (clis) {
        var client = clis.find(function (c) {
          return (c.visibilityState = 'visible');
        });

        if (client) {
          client.navigate(notification.data.url);
          client.focus();
        } else {
          clients.openWindow(notification.data.url);
        }
      })
    );
  }
  notification.close();
});

self.addEventListener('notificationclose', function (event) {
  console.log('Notification was closed', event);
});

self.addEventListener('push', function (event) {
  console.log('Push notification received', event);
  var data = { title: 'New', content: 'Something new happened', openUrl: '/' };
  if (event.data) {
    data = JSON.parse(event.data.text());
    console.log('data', data);
  }

  var options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
