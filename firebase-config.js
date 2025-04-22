const firebaseConfig = {
    apiKey: "AIzaSyD1lAPeYclzrYIvrpahC2ORr6YaLcIa9LU",
    authDomain: "personal-projects-d0a03.firebaseapp.com",
    projectId: "personal-projects-d0a03",
    storageBucket: "personal-projects-d0a03.firebasestorage.app",
    messagingSenderId: "514784870634",
    appId: "1:514784870634:web:b5da13b0a64f2b43735793",
    measurementId: "G-4FXZG96NDL"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get references to Firebase services
  const auth = firebase.auth();
  const db = firebase.firestore();
