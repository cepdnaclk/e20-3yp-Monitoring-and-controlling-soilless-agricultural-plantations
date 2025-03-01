import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Ensure Firebase is correctly imported

export const sendControlCommand = async (userId, action, value) => {
  try {
    await addDoc(collection(db, `users/${userId}/commands`), {
      action: action,  // e.g., "increase_pH"
      value: value,    // e.g., 0.5
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Command sent:", action, "Value:", value);
  } catch (error) {
    console.error("🔥 Firestore Error sending command:", error);
  }
};
