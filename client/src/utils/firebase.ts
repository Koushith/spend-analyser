// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyC2qW-cL5n-24ZPYfVmUwezAvJScER6yDI',
  authDomain: 'spend-1be3e.firebaseapp.com',
  projectId: 'spend-1be3e',
  storageBucket: 'spend-1be3e.firebasestorage.app',
  messagingSenderId: '835609785241',
  appId: '1:835609785241:web:87bc85e37d01b461175908',
  measurementId: 'G-EFKSVFZK9Z',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
