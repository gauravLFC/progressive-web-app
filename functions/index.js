var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({ origin: true });
var webPush = require('web-push');

var { SUBSCRIPTION_PRIVATE_KEY } = require('./keys');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require('./pwagram-fb-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-7a83d.firebaseio.com/',
});

exports.storePostData = functions.https.onRequest(function (request, response) {
  cors(request, response, function () {
    admin
      .database()
      .ref('posts')
      .push({
        id: request.body.id,
        title: request.body.title,
        location: request.body.location,
        image: request.body.image,
      })
      .then(function () {
        webPush.setVapidDetails(
          'mailto:fakeemail@gmail.com',
          'BCymfPOf4ctC6GkE5Iq2GtamUkpDm9ImrxmO-bnvv56Ivgr5-pv5Kvm2jbFejDRjSsSnA2IspDyI2lIKKuae2qM',
          SUBSCRIPTION_PRIVATE_KEY
        );
        return admin.database().ref('subscription').once('value');
      })
      .then(function (subscriptions) {
        subscriptions.forEach(function (sub) {
          var pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh,
            },
          };
          webPush
            .sendNotification(
              pushConfig,
              JSON.stringify({
                title: 'New Post',
                content: 'New Post added',
                openUrl: '/help',
              })
            )
            .catch(function (err) {
              console.log(err);
            });
        });
        response
          .status(201)
          .json({ message: 'Data Stored', id: request.body.id });
      })
      .catch(function (err) {
        console.log('Some error occurred in outside catch', err);
        response.status(500).json({ error: err });
      });
  });
});