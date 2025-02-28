import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBz0QYUeCGFxZahN5uDvqJUY3bBTgxY570",
    authDomain: "mytestapp-b58a4.firebaseapp.com",
    projectId: "mytestapp-b58a4",
    storageBucket: "mytestapp-b58a4.firebasestorage.app",
    messagingSenderId: "701953680169",
    appId: "1:701953680169:web:f4e3c66a97b931ddb3cd38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
