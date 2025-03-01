import { collection, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ✅ Send control command (prevents duplicates)
export const sendControlCommand = async (userId, action, value) => {
  try {
    const commandRef = doc(db, `users/${userId}/active_commands`, action);

    // ✅ Check if the command is already active
    const existingCommand = await getDoc(commandRef);
    if (existingCommand.exists()) {
      console.log(`⚠️ Command already active: ${action}`);
      return;
    }

    // ✅ Add command to active_commands
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
    if (!userId || !action) {
      console.error("🚨 Invalid parameters: userId or action missing.");
      return;
    }

    const activeCommandRef = doc(db, `users/${userId}/active_commands`, action);
    const stopCommandName = `stop_${action}`; // ✅ Correct stop format
    const stopCommandRef = doc(db, `users/${userId}/stop_commands`, stopCommandName);

    // ✅ Step 1: Check if the action is currently active
    const existingCommand = await getDoc(activeCommandRef);
    if (!existingCommand.exists()) {
      console.log(`⚠️ No active command found for: ${action}, skipping stop.`);
      return;
    }

    // ✅ Step 2: Prevent duplicate stop commands
    const existingStopCommand = await getDoc(stopCommandRef);
    if (existingStopCommand.exists()) {
      console.log(`⚠️ Stop command already exists: ${stopCommandName}, avoiding duplicate.`);
      return;
    }

    console.log(`🚀 Stopping command: ${action}`);

    // ✅ Step 3: Store stop command in stop_commands
    await setDoc(stopCommandRef, {
      status: "stop",
      action: stopCommandName,
      timestamp: new Date(),
    });

    console.log(`✅ Stop Command Sent: ${stopCommandName}`);

    // ✅ Step 4: Remove the active command only after stop command is added
    await deleteDoc(activeCommandRef);
    console.log(`🗑️ Active Command Removed: ${action}`);

  } catch (error) {
    console.error("❌ Error sending stop command:", error);
  }
};
