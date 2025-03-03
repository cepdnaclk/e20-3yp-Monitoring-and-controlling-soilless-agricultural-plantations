#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

#include <DHTesp.h>
#include <BH1750.h>
#include <Wire.h>

// WiFi credentials
const char* ssid = "Eng-Student";
const char* password = "3nG5tuDt";

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


//Initializing the DHT sensor
DHTesp dht;

//Initializing the BH1750 sensor
BH1750 LightMeter;

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
  // float temperature = random(20, 35) + random(0, 99) / 100.0;  // Random 20.00 - 34.99
  // float humidity = random(40, 90) + random(0, 99) / 100.0;     // Random 40.00 - 89.99
  float temperature = dht.getTemperature();
  float humidity = dht.getHumidity();
  float light = LightMeter.readLightLevel();

  String payload = "{\"temperature\": " + String(temperature, 2) +
                   ", \"humidity\": " + String(humidity, 2) + 
                   ", \"light_intensity\": " + String(light, 2) + "}";

  Serial.print("Publishing Sensor Data: ");
  Serial.println(payload);

  if (client.publish(sensorTopic, payload.c_str())) {
    Serial.println("Data Published Successfully");
  } else {
    Serial.println("Publish Failed");
  }
  Serial.print("Light Level: " + String(light) + " lx");
  Serial.print("\tTemperature: " + String(temperature) + " °C");
  Serial.println("\tHumidity: " + String(humidity) + " %");

  //delay(3000);  // Delay to prevent flooding MQTT broker
}

void setup() {
  Serial.begin(9600);
  pinMode(5, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  espClient.setInsecure();  // Allow SSL without certificates
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  connectToMQTT();


  //Initializing the DHT sensor
  dht.setup(4, DHTesp::DHT22);

  //Initializing the BH1750 sensor
    /*
  BH1750 aka Light Meter
  SDA connect to GPIO21
  SCL connect to GPIO22
  */
  Wire.begin(21,22);
  LightMeter.begin();
}

void loop() {
  if (!client.connected()) {
    connectToMQTT();
  }
  client.loop(); // Keep MQTT connection active

  // Publish sensor data every 5 minutes
  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}