var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
);
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

function openCreatePostModal() {
  createPostArea.style.display = 'block';
  if (defferedPrompt) {
    defferedPrompt.prompt();

    defferedPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    defferedPrompt = null;
  }
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function closeCreatePostModal() {
  createPostArea.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = `url('${data.image}')`;
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'black';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCards();
  data.forEach(function (entry) {
    createCard(entry);
  });
}

const url = 'https://pwagram-7a83d.firebaseio.com/posts.json';
let networkDataReceived = false;

fetch(url)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    console.log('from web', data);
    networkDataReceived = true;
    console.log('converting object to array', Object.values(data));
    updateUI(Object.values(data));
  })
  .catch(function (err) {
    console.log('Some error occured', err);
  });

if ('indexedDB' in window) {
  readAllData('posts').then(function (data) {
    if (!networkDataReceived) {
      console.log('From Cache', data);
      updateUI(data);
    }
  });
}

function sendData() {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      id: new Date().toISOString(),
      title: titleInput.value,
      location: locationInput.value,
      image:
        'https://firebasestorage.googleapis.com/v0/b/pwagram-7a83d.appspot.com/o/sf-boat.jpg?alt=media&token=3f405cb1-bb08-4b54-90f6-f77c8e2b80b8',
    }),
  }).then(function (res) {
    console.log('Sent data', res);
    updateUI();
  });
}

form.addEventListener('submit', function (event) {
  console.log('Submitting form');
  event.preventDefault();
  console.log('titleInput.value.trim()', titleInput.value.trim());
  console.log('locationInput.value', locationInput.value.trim());
  if (!titleInput.value.trim() || !locationInput.value.trim()) {
    alert('Please enter valid data');
    return;
  }
  closeCreatePostModal();

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(function (sw) {
      var post = {
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value,
      };
      writeData('sync-posts', post)
        .then(function () {
          return sw.sync.register('sync-new-post');
        })
        .then(function () {
          var snackBarContainer = document.querySelector('#confirmation-toast');
          var data = { message: 'Your Post was saved for syncing' };
          snackBarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch(function () {
          console.log('Error');
        });
    });
  } else {
    sendData();
  }
});
