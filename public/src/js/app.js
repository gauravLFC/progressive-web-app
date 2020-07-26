var defferedPrompt;
var enableNotificationsButtons = document.querySelectorAll(
  '.enable-notifications'
);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => {
      console.log('Service Worker registered');
    })
    .catch(function (err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function (event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  defferedPrompt = event;
  return false;
});

function displayConfirmNotification() {
  var options = {
    body: 'You successfully subscribed to our notification service',
    icon: '/src/images/icons/app-icon-96x96.png',
    image: '/src/images/sf-boat.jpg',
    dir: 'ltr',
    lang: 'en-US',
    vibrate: [100, 50, 200],
    badge: '/src/images/icons/app-icon-96x96.png',
    tag: 'confirm-notification',
    renotify: true,
    actions: [
      {
        action: 'confirm',
        title: 'ok',
        icon: '/src/images/icons/app-icon-96x96.png',
      },
      {
        action: 'cancel',
        title: 'cancel',
        icon: '/src/images/icons/app-icon-96x96.png',
      },
    ],
  };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (swreg) {
      swreg.showNotification('Successfully subscribed!', options);
    });
  }
}

function configurePushSub() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready
    .then(function (swreg) {
      reg = swreg;
      return swreg.pushManager.getSubscription();
    })
    .then(function (sub) {
      console.log('value of sub', sub);
      if (sub === null) {
        // Create a new subscription
        var vapidPublicKey =
          'BCymfPOf4ctC6GkE5Iq2GtamUkpDm9ImrxmO-bnvv56Ivgr5-pv5Kvm2jbFejDRjSsSnA2IspDyI2lIKKuae2qM';
        var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPublicKey,
        });
      } else {
        // We have a subscription
      }
    })
    .then(function (newSub) {
      console.log('newSub', newSub);
      return fetch('https://pwagram-7a83d.firebaseio.com/subscription.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(newSub),
      });
    })
    .then(function (res) {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch(function (err) {
      console.log(err);
    });
}

function askForNotificationPermission() {
  Notification.requestPermission(function (userChoice) {
    console.log('userChoice', userChoice);
    if (userChoice !== 'granted') {
      console.log('No notification permission granted');
    } else {
      configurePushSub();
      //displayConfirmNotification();
    }
  });
}

if ('Notification' in window && 'serviceWorker' in navigator) {
  for (let button of enableNotificationsButtons) {
    button.style.display = 'block';
    button.addEventListener('click', askForNotificationPermission);
  }
}
