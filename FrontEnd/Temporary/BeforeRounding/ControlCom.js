import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";



// Map each action to the corresponding device type
const ACTION_DEVICE_TYPE_MAP = {
  increase_pH: "nutrient_pump",
  decrease_pH: "water_pump",
  increase_EC: "nutrient_pump",
  decrease_EC: "water_pump",
  increase_water_level: "water_pump",
  decrease_water_level: "disposal_pump",
  water_circulation: "circulation_pump",
};

// Returns a map like: { nutrient_pump: "1001", water_pump: "2001", ... }
export const fetchDeviceIdMap = async (userId, groupId) => {
  const devicesRef = collection(db, `users/${userId}/deviceGroups/${groupId}/devices`);
  const snapshot = await getDocs(devicesRef);
  const deviceMap = {};

  snapshot.forEach(doc => {
    const deviceId = doc.id;
    const prefix = deviceId.toString()[0];

    switch (prefix) {
      case "1":
        deviceMap["nutrient_pump"] = deviceId;
        break;
      case "2":
        deviceMap["water_pump"] = deviceId;
        break;
      case "3":
        deviceMap["disposal_pump"] = deviceId;
        break;
      case "4":
        deviceMap["circulation_pump"] = deviceId;
        break;
      default:
        console.warn(`⚠️ Unknown deviceId prefix for ${deviceId}`);
        break;
    }
  });

  return deviceMap;
};


// ✅ Send control command (prevents duplicates)
export const sendControlCommand = async (userId, groupId, action, value, deviceIdMap) => {
  try {
    const deviceType = ACTION_DEVICE_TYPE_MAP[action];
    const targetDeviceId = deviceIdMap[deviceType];

    if (!targetDeviceId) {
      console.error(`❌ No device found for action '${action}' (type: ${deviceType})`);
      return;
    }

    const commandRef = doc(
      db,
      `users/${userId}/deviceGroups/${groupId}/devices/${targetDeviceId}/active_commands`,
      action
    );

    const existing = await getDoc(commandRef);
    if (existing.exists()) {
      console.log(`⚠️ Command already active: ${action} for device ${targetDeviceId}`);
      return;
    }

    await setDoc(commandRef, {
      action,
      value,
      timestamp: new Date(),
    });

    console.log(`✅ Control Command Sent: ${action} → ${targetDeviceId}`);
  } catch (error) {
    console.error("❌ Error in sendControlCommand:", error);
  }
};


// ✅ Send stop command (and delete it after 10s)
export const sendStopCommand = async (userId, groupId, action, deviceIdMap) => {
  try {
    const deviceType = ACTION_DEVICE_TYPE_MAP[action];
    const targetDeviceId = deviceIdMap[deviceType];

    if (!targetDeviceId) {
      console.error(`❌ No device found for stop command '${action}' (type: ${deviceType})`);
      return;
    }

    const activeRef = doc(
      db,
      `users/${userId}/deviceGroups/${groupId}/devices/${targetDeviceId}/active_commands`,
      action
    );

    const stopRef = doc(
      db,
      `users/${userId}/deviceGroups/${groupId}/devices/${targetDeviceId}/stop_commands`,
      `stop_${action}`
    );

    const existing = await getDoc(activeRef);
    if (!existing.exists()) {
      console.log(`⚠️ No active command to stop for ${action}`);
      return;
    }

    await setDoc(stopRef, {
      action,
      status: "stop",
      timestamp: new Date(),
    });

    await deleteDoc(activeRef);

    console.log(`🛑 Stop command sent and active removed for ${action} → ${targetDeviceId}`);

    setTimeout(async () => {
      try {
        await deleteDoc(stopRef);
        console.log(`🧹 Auto-deleted stop command: stop_${action}`);
      } catch (err) {
        console.error("❌ Failed to auto-delete stop command:", err);
      }
    }, 10000);
  } catch (error) {
    console.error("❌ Error in sendStopCommand:", error);
  }
};

