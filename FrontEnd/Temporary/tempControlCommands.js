import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ✅ Send control command (prevents duplicates)
export const sendControlCommand = async (userId, action, value) => {
  try {
    const commandRef = doc(db, `users/${userId}/active_commands`, action); // ✅ Use action as doc ID

    // Check if command is already active
    const existingCommand = await getDoc(commandRef);
    if (existingCommand.exists()) {
      console.log(`⚠️ Command already active: ${action}`);
      return;
    }

    await setDoc(commandRef, {
      action: action,
      value: value,
      timestamp: new Date(),
    });

    console.log(`✅ Command Sent: ${action} (Value: ${value})`);
  } catch (error) {
    console.error("❌ Error sending control command:", error);
  }
};

// ✅ Send stop command (prevents duplicates)
export const sendStopCommand = async (userId, action) => {
  try {
    const stopCommandRef = doc(db, `users/${userId}/stop_commands`, action);

    // Check if stop command already exists
    const existingStopCommand = await getDoc(stopCommandRef);
    if (existingStopCommand.exists()) {
      console.log(`⚠️ Stop command already sent: ${action}`);
      return;
    }

    await setDoc(stopCommandRef, {
      action: action,
      timestamp: new Date(),
    });

    // ❌ Remove the active command from Firestore
    await deleteDoc(doc(db, `users/${userId}/active_commands`, action));

    console.log(`✅ Stop Command Sent & Active Command Removed: ${action}`);
  } catch (error) {
    console.error("❌ Error sending stop command:", error);
  }
};
