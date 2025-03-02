#include <WiFi.h>
#include <WiFiManager.h>  // Install "WiFiManager" library
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

// MQTT credentials
const char* mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// Topics
const char* controlTopic = "test/topic";  // Control pump
const char* sensorTopic = "test/sensor";  // Send sensor data

// Secure WiFi client
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Timer variables
unsigned long lastPublishTime = 0;
const long publishInterval = 300000;  // Publish every 5 mins

// MQTT Callback Function
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);

  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("Message: " + message);

  if (String(topic) == controlTopic) {
    if (message.indexOf("\"pump\": \"ON\"") > 0) {
      digitalWrite(5, HIGH);
      Serial.println("Pump ON");
    } else if (message.indexOf("\"pump\": \"OFF\"") > 0) {
      digitalWrite(5, LOW);
      Serial.println("Pump OFF");
    }
  }
}

// Function to connect to MQTT
void connectToMQTT() {
  while (!client.connected()) {
    Serial.println("Connecting to MQTT...");
    if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
      Serial.println("Connected to HiveMQ");
      client.subscribe(controlTopic);  // Subscribe to control topic
    } else {
      Serial.print("MQTT Connection Failed, State: ");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

// Function to publish random sensor data
void publishSensorData() {
  float temperature = random(20, 35) + random(0, 99) / 100.0;  // Random 20.00 - 34.99
  float humidity = random(40, 90) + random(0, 99) / 100.0;     // Random 40.00 - 89.99

  String payload = "{\"temperature\": " + String(temperature, 2) + ", \"humidity\": " + String(humidity, 2) + "}";

  Serial.print("Publishing Sensor Data: ");
  Serial.println(payload);

  if (client.publish(sensorTopic, payload.c_str())) {
    Serial.println("Data Published Successfully");
  } else {
    Serial.println("Publish Failed");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(5, OUTPUT);

  // WiFiManager instance
  WiFiManager wifiManager;
  wifiManager.autoConnect("ESP32_Setup");  // Start AP mode if no WiFi saved

  Serial.println("Connected to WiFi!");

  // MQTT setup
  espClient.setInsecure();  // Allow SSL without certificates
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  connectToMQTT();
}

void loop() {
  if (!client.connected()) {
    connectToMQTT();
  }
  client.loop();

  // Publish sensor data every 5 seconds
  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}
