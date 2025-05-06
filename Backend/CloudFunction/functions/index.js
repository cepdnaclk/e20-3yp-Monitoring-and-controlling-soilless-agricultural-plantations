/* eslint-disable no-console */
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2/options");
const {
  onDocumentCreated,
  onDocumentDeleted,
} =require("firebase-functions/v2/firestore");
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
});

exports.subscribeToNewDevice = onDocumentCreated(
    "users/{userId}/devices/{deviceId}",
    async (event) => {
      const {userId, deviceId} = event.params;
      const sensorTopic = `${userId}/${deviceId}/sensor`;

      mqttClient.subscribe(sensorTopic, {qos: 1}, (err) => {
        if (!err) {
          console.log(`✅ Subscribed to topic: ${sensorTopic}`);
        } else {
          console.error(`❌ Subscription error in ${sensorTopic}:`, err.message);
        }
      });
    });

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

    for (const userDoc of usersSnapshot.docs) {
      const deviceDoc = await db
          .doc(`users/${userDoc.id}/devices/${deviceId}`)
          .get();

      if (deviceDoc.exists) {
        console.log("Device found for userId:", userDoc.id);
        return res.status(200).json({userId: userDoc.id});
      }
    }

    return res.status(404).json({error: "Device not found"});
  } catch (error) {
    console.log("❌ Error retrieving userId:", error.message);
    return res.status(500).json({error: "Internal server error"});
  }
});

// Handle incoming MQTT messages and store them in Firestore
mqttClient.on("message", async (topic, message) => {
  try {
    const userId = topic.split("/")[0]; // topic: {userId}/{deviceId}/sensor
    console.log(`Received message on topic: ${topic}`);
    console.log(userId);
    const data = JSON.parse(message.toString());

    const sensorData = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...(data.water_level !== undefined && {water_level: data.water_level}),
      ...(data.ec !== undefined && {ec: data.ec}),
      ...(data.ph !== undefined && {ph: data.ph}),
      ...(data.temperature !== undefined && {temperature: data.temperature}),
      ...(data.humidity !== undefined && {humidity: data.humidity}),
      ...(data.light_intensity !== undefined &&
        {light_intensity: data.light_intensity}),
    };

    const targetPath = `users/${userId}/sensor_data/1`;
    console.log(`Storing data in Firestore at ${targetPath}`, sensorData);

    await db.doc(targetPath).set(sensorData, {
      merge: true,
      ignoreUndefinedProperties: true,
    });

    console.log(`✅ Data stored in Firestore at ${targetPath}`, sensorData);
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
    });

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
    });

