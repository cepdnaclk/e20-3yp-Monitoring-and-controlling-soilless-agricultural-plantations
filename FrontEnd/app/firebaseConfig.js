import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB2zd48_6SepB3aq0BQTJaoTUpeqF3yNnE",
  authDomain: "plant-pulse-bd615.firebaseapp.com",
  databaseURL: "https://plant-pulse-bd615-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "plant-pulse-bd615",
  storageBucket: "plant-pulse-bd615.firebasestorage.app",
  messagingSenderId: "985853051668",
  appId: "1:985853051668:web:31683335b4b49df372f801",
  measurementId: "G-P6M4LCTN7C"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
