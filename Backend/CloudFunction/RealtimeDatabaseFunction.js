/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const mqtt = require("mqtt");

// Initialize Firebase
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://plant-pulse-bd615-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = admin.database();
const ref = db.ref("/sensorData");

exports.mqttToFirebase = onRequest(
    {
      timeoutSeconds: 60,
      memory: "256MB",
    },
    async (req, res) => {
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

      client.on("message", (topic, message) => {
        logger.info(`📩 Message received on ${topic}: ${message.toString()}`);
        try {
          const data = JSON.parse(message.toString());
          ref.push(data);
          logger.info("✅ Data saved to Firebase!");
        } catch (error) {
          logger.error("❌ Invalid JSON data:", error);
        }
      });

      res.send("MQTT listener started successfully!");
    });


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
