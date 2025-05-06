#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
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
WiFiClientSecure net;
MQTTClient client;

// Timer variables
unsigned long lastPublishTime = 0;
const long publishInterval = 300000;  // Publish every 5 seconds

// MQTT Callback Function
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

// Function to connect to MQTT
void connectToMQTT() {
  Serial.print("Connecting to MQTT...");
  
  // Configure MQTT client
  client.begin(mqttServer, mqttPort, net);
  client.onMessage(messageReceived);
  
  while (!client.connect("ESP32Client", mqttUser, mqttPassword)) {
    Serial.print(".");
    delay(1000);
  }
  
  Serial.println("\nConnected to HiveMQ!");
  client.subscribe(controlTopic, 1);  // Subscribe to control topic
}

// Function to publish random sensor data
void publishSensorData() {
  float temperature = random(20, 35) + random(0, 99) / 100.0;  // Random 20.00 - 34.99
  float humidity = random(40, 90) + random(0, 99) / 100.0;     // Random 40.00 - 89.99

  String payload = "{\"temperature\": " + String(temperature, 2) + ", \"humidity\": " + String(humidity, 2) + "}";

  Serial.print("Publishing Sensor Data: ");
  Serial.println(payload);

  if (client.publish(sensorTopic, payload, true, 1)) {  // QoS 1, retained=true
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
  wifiManager.autoConnect("PlantPulse_Setup");  // Start AP mode if no WiFi saved
  Serial.println("Connected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Configure WiFiClientSecure
  net.setInsecure();  // Skip certificate validation (not recommended for production)
  
  // MQTT setup
  connectToMQTT();
}

void loop() {
  client.loop();  // Maintain MQTT connection
  
  if (!client.connected()) {
    connectToMQTT();
  }

  // Publish sensor data every 5 seconds
  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}