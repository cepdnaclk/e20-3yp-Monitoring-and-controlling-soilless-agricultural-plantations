/* eslint-disable no-console */
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2/options");
const {
  onDocumentCreated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const mqtt = require("mqtt");

// Set global options
setGlobalOptions({region: "us-central1"});

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// MQTT Broker Configuration
const mqttOptions = {
  host: "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud",
  port: 8883,
  username: "Tharusha",
  password: "Tharusha2001",
  protocol: "mqtts",
};

// MQTT Client Connection
const mqttClient = mqtt.connect(mqttOptions);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT Broker");

  initializeSubscriptions()
      .then(() => console.log(
          "✅ MQTT subscriptions initialized after connection",
      ))
      .catch((err) => console.error(
          "❌ Failed to initialize subscriptions:",
          err.message,
      ));
});


/**
 * Initializes MQTT subscriptions for all existing devices in Firestore
 * @async
 * @function initializeSubscriptions
 * @return {Promise<void>} Resolves when all subscriptions are complete
 * @throws {Error} If any part of the subscription process fails
 *
 * @example
 * // Call this when your backend starts
 * initializeSubscriptions()
 *   .then(() => console.log("Subscriptions initialized"))
 *   .catch(err => console.error("Initialization failed", err));
 */
async function initializeSubscriptions() {
  try {
    console.log("⏳ Initializing MQTT subscriptions for existing devices...");

    // Get all users
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Get all device groups for this user
      const groupsSnapshot = await userDoc.ref.collection("deviceGroups").get();

      for (const groupDoc of groupsSnapshot.docs) {
        const groupId = groupDoc.id;

        // Get all devices in this group
        const devicesSnapshot = await groupDoc.ref.collection("devices").get();

        for (const deviceDoc of devicesSnapshot.docs) {
          const deviceId = deviceDoc.id;
          const sensorTopic = `${userId}/${groupId}/${deviceId}/sensor`;

          // Subscribe to the topic
          mqttClient.subscribe(sensorTopic, {qos: 1}, (err) => {
            if (!err) {
              console.log(`✅ Initial subscription to topic: ${sensorTopic}`);
            } else {
              console.error(
                  `❌ Initial subscription error for ${sensorTopic}:`,
                  err.message,
              );
            }
          });
        }
      }
    }

    console.log("✅ Finished initializing MQTT subscriptions");
  } catch (error) {
    console.error("❌ Error initializing subscriptions:", error.message);
  }
}

// subscribe to a new device when scanned QR code
exports.subscribeToNewDevice = onDocumentCreated(
    "users/{userId}/deviceGroups/{groupId}/devices/{deviceId}",
    async (event) => {
      const {userId, groupId, deviceId} = event.params;
      const sensorTopic = `${userId}/${groupId}/${deviceId}/sensor`;

      mqttClient.subscribe(sensorTopic, {qos: 1}, (err) => {
        if (!err) {
          console.log(`✅ Subscribed to topic: ${sensorTopic}`);
        } else {
          console.error(`❌ Subscription error in ${sensorTopic}:`, err.message);
        }
      });
    },
);

// unsubscribe from a device when removed
exports.unsubscribeFromRemovedDevice = onDocumentDeleted(
    "users/{userId}/deviceGroups/{groupId}/devices/{deviceId}",
    async (event) => {
      const {userId, groupId, deviceId} = event.params;
      const sensorTopic = `${userId}/${groupId}/${deviceId}/sensor`;

      mqttClient.unsubscribe(sensorTopic, (err) => {
        if (!err) {
          console.log(`🛑 Unsubscribed from topic: ${sensorTopic}`);
        } else {
          console.error(`❌ Unsubscription error ${sensorTopic}:`, err.message);
        }
      });
    },
);

/**
 * HTTPS Cloud Function to get userId for a given deviceId.
 */
exports.getUserId = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");

  const deviceId = req.query.deviceId;
  console.log("Received deviceId:", deviceId);

  if (!deviceId) {
    return res.status(400).json({error: "Missing deviceId parameter"});
  }

  try {
    const usersSnapshot = await db.collection("users").get();
    console.log("👤 Total users found:", usersSnapshot.size);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`🔍 Checking user: ${userId}`);

      const deviceGroupsRef = db.collection(`users/${userId}/deviceGroups`);
      const groupsSnapshot = await deviceGroupsRef.get();
      console.log(`📁 Found ${groupsSnapshot.size} groups for user ${userId}`);

      for (const groupDoc of groupsSnapshot.docs) {
        const groupId = groupDoc.id;
        console.log(`🔍 Checking group: ${groupId}`);

        const deviceRef = db.doc(
            `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}`,
        );
        console.log(`📄 Looking for device: ${deviceRef.path}`);
        const deviceDoc = await deviceRef.get();

        if (deviceDoc.exists) {
          console.log(`✅ Device found in path: ${deviceRef.path}`);
          return res.status(200).json({userId: userId, groupId: groupId});
        }
      }
    }

    console.log("❌ Device not found in any group.");
    return res.status(404).json({error: "Device not found"});
  } catch (error) {
    console.error("❌ Error retrieving userId:", error.message);
    return res.status(500).json({error: "Internal server error"});
  }
});

// Handle incoming MQTT messages and store them in Firestore
mqttClient.on("message", async (topic, message) => {
  try {
    const userId = topic.split("/")[0]; //  {userId}/{groupId}/{deviceId}/sensor
    const groupId = topic.split("/")[1];
    const deviceId = topic.split("/")[2];
    console.log(`Received message on topic: ${topic}`);
    console.log(
        `userId: ${userId}, groupId: ${groupId}, deviceId: ${deviceId}`,
    );
    const data = JSON.parse(message.toString());

    // Get current date and hour for historical path
    const now = new Date();
    const timestampReadable = now.toLocaleString("en-US", {
      timeZone: "Asia/Colombo", // Optional: ensure consistent timezone
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const safeTimestamp = timestampReadable.replace(/[^a-zA-Z0-9]/g, "_");

    const sensorData = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...(data.water_level !== undefined && {water_level: data.water_level}),
      ...(data.ec !== undefined && {ec: data.ec}),
      ...(data.ph !== undefined && {ph: data.ph}),
      ...(data.temperature !== undefined && {temperature: data.temperature}),
      ...(data.humidity !== undefined && {humidity: data.humidity}),
      ...(data.light_intensity !== undefined && {
        light_intensity: data.light_intensity,
      }),
    };

    // Original path (single document with merged data)
    const targetPath = `/users/${userId}/deviceGroups/${groupId}/sensor_data/1`;
    console.log(`Storing data in Firestore at ${targetPath}`, sensorData);

    // Historical path (new document for each message)
    const historyPath =
    `users/${userId}/deviceGroups/${groupId}/sensor_history/${safeTimestamp}`;

    console.log(
        `Storing historical data in Firestore at ${historyPath}`, sensorData,
    );

    // Use batch to write both documents atomically
    const batch = db.batch();

    // Update the existing document
    batch.set(db.doc(targetPath), sensorData, {
      merge: true,
      ignoreUndefinedProperties: true,
    });

    // Create new historical document
    batch.set(db.doc(historyPath), sensorData, {
      ignoreUndefinedProperties: true,
    });

    await batch.commit();

    console.log(
        `✅ Data stored in Firestore at both ${targetPath} and ${historyPath}`,
        sensorData,
    );
  } catch (error) {
    console.error("❌ Error storing data:", error.message);
  }
});

/**
 * Publishes an MQTT message to the topic "test/topic".
 * @param {string} topic - The MQTT topic to publish to.
 * @param {number} qosLvl - The Quality of Service level for the message.
 * @param {string} state - The state of the pump, either "ON" or "OFF".
 */
function sendMQTTMessage(topic, qosLvl, state) {
  const payload = JSON.stringify({pump: state});

  mqttClient.publish(topic, payload, {qos: qosLvl}, (err) => {
    if (err) {
      console.error("❌ MQTT Publish Error:", err.message);
    } else {
      console.log(`✅ MQTT Message Sent: ${payload}`);
    }
  });
}

/**
 * Cloud Function that triggers when a document is created in `active_commands`.
 * If a document named "increase_pH" or "decrease_pH" is added,
 * the pump is turned ON.
 */
exports.turnPumpOn = onDocumentCreated(
    "users/{userId}/active_commands/{docId}",
    async (event) => {
      const {docId, userId} = event.params;
      const topic = `${userId}/control`;
      const message = "ON";
      const qos = 1;

      if (docId === "increase_pH" || docId === "decrease_pH") {
        console.log(`🟢 Document "${docId}" created. User ID: ${userId}`);
        sendMQTTMessage(topic, qos, message);
      }
    },
);

/**
 * Cloud Function that triggers when a document is deleted.
 * If the last "increase_pH" or "decrease_pH" document is deleted,
 * the pump is turned OFF.
 */
exports.turnPumpOff = onDocumentDeleted(
    "users/{userId}/active_commands/{docId}",
    async (event) => {
      const {docId, userId} = event.params;
      const topic = `${userId}/control`;
      const message = "OFF";
      const qos = 1;

      if (docId === "increase_pH" || docId === "decrease_pH") {
        console.log(`🔴 Document "${docId}" deleted. User ID: ${userId}`);

        // Check if any "increase_pH" or "decrease_pH" documents still exist
        const activeCommandsRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("active_commands");

        const increasePHDoc = await activeCommandsRef.doc("increase_pH").get();
        const decreasePHDoc = await activeCommandsRef.doc("decrease_pH").get();

        const increaseExists = increasePHDoc.exists;
        const decreaseExists = decreasePHDoc.exists;

        if (!increaseExists && !decreaseExists) {
          console.log("⚠️ No more active pH commands. Turning pump OFF.");
          sendMQTTMessage(topic, qos, message);
        } else {
          console.log("Other active pH commands still exist. Keeping pump ON.");
        }
      }
    },
);
