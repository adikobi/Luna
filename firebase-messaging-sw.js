// Import and initialize the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Note: This configuration will be populated by the main script
// It is intentionally left sparse.
const firebaseConfig = {
    apiKey: "AIzaSyDnXuOUGPrN4WMDkwK--cKy4zewj390Rkc",
    authDomain: "luna-bb5ab.firebaseapp.com",
    projectId: "luna-bb5ab",
    storageBucket: "luna-bb5ab.appspot.com",
    messagingSenderId: "621008201851",
    appId: "1:621008201851:web:e96d8675e117fe7d06dade"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle incoming messages when the app is not in the foreground
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico' // Optional: add a path to an icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
