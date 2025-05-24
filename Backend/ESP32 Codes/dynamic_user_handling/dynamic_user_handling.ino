#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// Device and User Info
const char* deviceId = "esp12345";
String userId = "";
String groupId = "";
String controlTopic = "";
String sensorTopic = "";

// HTTPS client
WiFiClientSecure net;
MQTTClient client;

// Timer
unsigned long lastPublishTime = 0;
const long publishInterval = 10000;

void messageReceived(String &topic, String &payload) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.println("Message: " + payload);

  if (topic == controlTopic) {
    if (payload.indexOf("\"pump\": \"ON\"") >= 0) {
      digitalWrite(5, HIGH);
      Serial.println("Pump ON");
    } else if (payload.indexOf("\"pump\": \"OFF\"") >= 0) {
      digitalWrite(5, LOW);
      Serial.println("Pump OFF");
    }
  }
}

// Fetch userId from Firebase Function
bool fetchUserId() {
  HTTPClient https;
  String url = "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=" + String(deviceId);

  net.setInsecure();  // For dev only

  https.begin(net, url);
  int httpCode = https.GET();

  if (httpCode == 200) {
    String response = https.getString();
    Serial.println("Response: " + response);

    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);
    userId = doc["userId"].as<String>();
    groupId = doc["groupId"].as<String>();

    // Build dynamic topics
    controlTopic = userId + "/" + groupId + "/" + deviceId + "/control";
    sensorTopic = userId + "/" + groupId + "/" + deviceId + "/sensor";

    Serial.println("Retrieved userId: " + userId);
    Serial.println("MQTT Topics: ");
    Serial.println("Sensor -> " + sensorTopic);
    Serial.println("Control -> " + controlTopic);

    https.end();
    return true;
  } else {
    Serial.println("Failed to fetch userId: " + String(httpCode));
    https.end();
    return false;
  }
}

void connectToMQTT() {
  client.begin(mqttServer, mqttPort, net);
  client.onMessage(messageReceived);

  while (!client.connect("ESP32Client", mqttUser, mqttPassword)) {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nConnected to MQTT");
  client.subscribe(controlTopic, 1);
}

void publishSensorData() {
  float temperature = random(20, 35) + random(0, 99) / 100.0;
  float humidity = random(40, 90) + random(0, 99) / 100.0;

  String payload = "{\"temperature\": " + String(temperature, 2) +
                   ", \"humidity\": " + String(humidity, 2) + "}";

  Serial.print("Publishing: ");
  Serial.println(payload);

  if (client.publish(sensorTopic.c_str(), payload, false, 1)) {
    Serial.println("Data published");
  } else {
    Serial.println("Failed to publish");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(5, OUTPUT);

  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.println("Connected to WiFi");

  if (!fetchUserId()) {
    Serial.println("Cannot continue without userId");
    while (true) delay(1000);
  }

  connectToMQTT();
}

void loop() {
  client.loop();

  if (!client.connected()) {
    connectToMQTT();
  }

  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}
