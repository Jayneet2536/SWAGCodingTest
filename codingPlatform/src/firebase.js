// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxXTczUBLcd2kr1SeLEV_BqsW0a7aW1Xc",
  authDomain: "swagtest-497e2.firebaseapp.com",
  projectId: "swagtest-497e2",
  storageBucket: "swagtest-497e2.firebasestorage.app",
  messagingSenderId: "511902241169",
  appId: "1:511902241169:web:1b13bef7b0a77231bd8a30",
  measurementId: "G-8LMSD9K5QV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);