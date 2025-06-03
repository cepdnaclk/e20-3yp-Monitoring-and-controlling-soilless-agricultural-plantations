#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

#include "connect_to_mqtt.h" // Header file to connect to MQTT broker
#include "blinkLED.h" // Header file to blink LED during connection attempts
// WiFi credentials
const char* ssid = "Devin Hasnaka";
const char* password = "12345678";

// MQTT credentials
const char* mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// const char* mqttServer = "4cb394bbc8284672b38e8d39dc842c9f.s1.eu.hivemq.cloud";
// const int mqttPort = 8883;
// const char* mqttUser = "Devin";
// const char* mqttPassword = "Devin2001";


// Topics
const char* controlTopic = "test/topic";     // Receive control updates
const char* sensorTopic = "test/sensor";     // Send sensor data

// Secure WiFi client
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Timer variables
unsigned long lastPublishTime = 0;
const long publishInterval = 5000;  // Publish every 5 minutes

//sensor pins
#define MOTOR_B_1A 22
#define MOTOR_B_2A 23


// Callback for incoming MQTT messages
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);

  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("Message: " + message);

  if (String(topic) == controlTopic) {
    Serial.println("Processing Firestore update...");
    // Parse JSON message for pump control
    if (message.indexOf("\"pump\":\"ON\"") > 0) {
      digitalWrite(MOTOR_B_1A, HIGH);
      Serial.println("Pump ON");
    } else if (message.indexOf("\"pump\":\"OFF\"") > 0) {
      digitalWrite(MOTOR_B_1A, LOW);
      Serial.println("Pump OFF");
    }
  }
}

// Function to connect to MQTT
// void connectToMQTT() {
//   while (!client.connected()) {
//     Serial.println("Connecting to MQTT...");
//     if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
//       Serial.println("Connected to HiveMQ");
//       client.subscribe(controlTopic);  // Subscribe to control topic
//       digitalWrite(32, HIGH);  
//     } else {
//       Serial.print("MQTT Connection Failed, State: ");
//       Serial.println(client.state());
//       delay(2000);
//     }
//   }
// }



void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_B_1A, OUTPUT);
  pinMode(MOTOR_B_2A, OUTPUT);
  ledcAttachPin(MOTOR_B_1A, 0); // Channel 0 for pin 22
  ledcAttachPin(MOTOR_B_2A, 1); // Channel 1 for pin 23
  ledcSetup(0, 5000, 8); // Channel 0, 5kHz, 8-bit resolution
  ledcSetup(1, 5000, 8); // Channel 1, 5kHz, 8-bit resolution

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    //delay(500);
    blinkLED(18, 500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  espClient.setInsecure();  // Allow SSL without certificates
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);

}

void loop() {
  if (!client.connected()) {
    connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);

  }
  client.loop(); // Keep MQTT connection active

  //Publish sensor data every 5 minutes
  if (millis() - lastPublishTime >= publishInterval) {
    //publishSensorData();
    for (int speed = 0; speed <= 255; speed += 5) { // 8-bit PWM: 0-255
      ledcWrite(0, speed); // Increase speed on MOTOR_B_1A
      ledcWrite(1, 0);     // Ensure MOTOR_B_2A is off
      delay(10);
    }
    lastPublishTime = millis();
  }
}