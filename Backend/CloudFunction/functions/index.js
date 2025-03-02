/* eslint-disable no-console */
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const mqtt = require("mqtt");

// Set global options
setGlobalOptions({region: "us-central1"});

// Initialize Firebase Admin SDK
admin.initializeApp();
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

  // Subscribe to sensor topic
  mqttClient.subscribe("test/sensor", (err) => {
    if (!err) {
      console.log("✅ Subscribed to test/sensor");
    } else {
      console.error("❌ Subscription error:", err);
    }
  });
});

// Handle incoming MQTT messages and store them in Firestore
mqttClient.on("message", async (topic, message) => {
  try {
    if (topic === "test/sensor") {
      const data = JSON.parse(message.toString());

      const sensorData = {
        temperature: data.temperature,
        humidity: data.humidity,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("sensorData").add(sensorData);
      console.log("✅ Data stored in Firestore:", sensorData);
    }
  } catch (error) {
    console.error("❌ Error storing data:", error);
  }
});

// Cloud Function to Keep MQTT Connection Alive
exports.mqttToFirestore = onSchedule("every 1 minutes", async () => {
  console.log("🔄 MQTT Listener is running...");
});

// Cloud Function to Notify ESP32 on Firestore Data Change
exports.notifyESP32OnDataChange = onDocumentUpdated("sensorData/{docId}",
    async (event) => {
      try {
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();

        if (!beforeData || !afterData) {
          console.log("⚠️ Missing data, skipping update.");
          return;
        }

        // Find the changed fields
        const changedFields = {};
        for (const key in afterData) {
          if (JSON.stringify(beforeData[key]) !==
          JSON.stringify(afterData[key])) {
            changedFields[key] = afterData[key];
          }
        }

        if (JSON.stringify(beforeData) !== JSON.stringify(afterData)) {
          console.log("🔄 Data changed, notifying ESP32...");

          const message = JSON.stringify(changedFields);
          mqttClient.publish("test/topic", message, {}, (err) => {
            if (err) {
              console.error("❌ MQTT Publish Error:", err);
            } else {
              console.log("✅ Update sent to ESP32:", message);
            }
          });
        } else {
          console.log("⚠️ No significant changes detected.");
        }
      } catch (error) {
        console.error("❌ Error in Firestore trigger:", error);
      }
    });
