import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAE2YHygEW-HPqAB04urw33pXU_EIdgnx0",
    authDomain: "plantapp-2025.firebaseapp.com",
    projectId: "plantapp-2025",
    storageBucket: "plantapp-2025.firebasestorage.app",
    messagingSenderId: "585851983314",
    appId: "1:585851983314:web:3fe6b580fb96b05012e40b"
  };
  
// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
