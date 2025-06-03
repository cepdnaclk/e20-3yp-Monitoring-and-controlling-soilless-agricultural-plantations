import { collection, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ✅ Send control command (prevents duplicates)
export const sendControlCommand = async (userId, groupId, action, value) => {
  try {
    if (!userId || !groupId || !action) {
      console.error("❌ Missing parameters in sendControlCommand.");
      return;
    }

    const activeCommandsCol = collection(db, `users/${userId}/deviceGroups/${groupId}/active_commands`);
    const commandRef = doc(activeCommandsCol, action);

    const existingCommand = await getDoc(commandRef);
    if (existingCommand.exists()) {
      console.log(`⚠️ Command already active: ${action}`);
      return;
    }

    await setDoc(commandRef, {
      action,
      value,
      timestamp: new Date(),
    });

    console.log(`✅ Control Command Sent: ${action} (Value: ${value})`);
  } catch (error) {
    console.error("❌ Error in sendControlCommand:", error);
  }
};

// ✅ Send stop command (and delete it after 10s)
export const sendStopCommand = async (userId, groupId, action) => {
  try {
    if (!userId || !groupId || !action) {
      console.error("❌ Missing parameters in sendStopCommand.");
      return;
    }

    const activeCommandsCol = collection(db, `users/${userId}/deviceGroups/${groupId}/active_commands`);
    const stopCommandsCol = collection(db, `users/${userId}/deviceGroups/${groupId}/stop_commands`);

    const activeCommandRef = doc(activeCommandsCol, action);
    const stopCommandRef = doc(stopCommandsCol, `stop_${action}`);

    const existingActive = await getDoc(activeCommandRef);
    if (!existingActive.exists()) {
      console.log(`⚠️ No active command found for ${action}, skip stopping.`);
      return;
    }

    const existingStop = await getDoc(stopCommandRef);
    if (existingStop.exists()) {
      console.log(`⚠️ Stop command already sent for ${action}`);
      return;
    }

    await setDoc(stopCommandRef, {
      action,
      status: "stop",
      timestamp: new Date(),
    });

    console.log(`✅ Stop Command Sent: stop_${action}`);
    await deleteDoc(activeCommandRef);
    console.log(`🗑️ Active Command Removed: ${action}`);

    // ⏲️ Schedule deletion of stop command after 10 seconds
    setTimeout(async () => {
      try {
        await deleteDoc(stopCommandRef);
        console.log(`🧹 Stop Command Auto-Deleted: stop_${action}`);
      } catch (error) {
        console.error("❌ Failed to auto-delete stop command:", error);
      }
    }, 10000); // 10 seconds

  } catch (error) {
    console.error("❌ Error in sendStopCommand:", error);
  }
};
