/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const mqtt = require("mqtt");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

/**
 * Cloud Function to listen to MQTT messages and save to Firestore
 * @param {Object} req - The HTTP request
 * @param {Object} res - The HTTP response
 */
exports.mqttToFirestore = functions.https.onRequest(async (req, res) => {
  const MQTT_BROKER = "mqtt://broker.emqx.io"; // Change if necessary
  const MQTT_TOPIC = "tharusha/data";

  logger.info("🚀 Starting MQTT Client...");
  const client = mqtt.connect(MQTT_BROKER);

  client.on("connect", () => {
    logger.info("✅ Connected to MQTT Broker");
    client.subscribe(MQTT_TOPIC, (err) => {
      if (!err) {
        logger.info(`📡 Subscribed to topic: ${MQTT_TOPIC}`);
      } else {
        logger.error("❌ Subscription error:", err);
      }
    });
  });

  client.on("error", (err) => {
    logger.error("❌ MQTT Connection Error:", err);
  });

  client.on("message", async (topic, message) => {
    logger.info(`📩 Message received on ${topic}: ${message.toString()}`);
    try {
      const data = JSON.parse(message.toString());

      // Save to Firestore
      const docRef = await db.collection("sensorData").add(data);
      logger.info(`✅ Data saved to Firestore with ID: ${docRef.id}`);
    } catch (error) {
      logger.error("❌ Invalid JSON data:", error);
    }
  });

  res.send("MQTT listener started successfully with Firestore!");
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
