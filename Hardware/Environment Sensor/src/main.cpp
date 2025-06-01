#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h> // Library for managing WiFi connections

#include <DHTesp.h>
#include <BH1750.h>
#include <Wire.h>

#include "connect_to_mqtt.h" //header file to connect to MQTT broker
#include "blinkLED.h" //header file to blink LED

// WiFi credentials
// const char *ssid = "Eng-Student";
// const char *password = "3nG5tuDt";

// const char *ssid = "Devin Hasnaka";
// const char *password = "12345678";

// MQTT credentials
const char *mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUser = "Tharusha";
const char *mqttPassword = "Tharusha2001";

// Topics
const char *controlTopic = "test/topic"; // Receive control updates
const char *sensorTopic = "test/sensor"; // Send sensor data

// Secure WiFi client
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Timer variables
unsigned long lastPublishTime = 0;
const long publishInterval = 5000; // Publish every 5 minutes

// Initializing the DHT sensor
DHTesp dht;

// Initializing the BH1750 sensor
BH1750 LightMeter;
// void blinkLED(int pin, int duration)
// {
//   digitalWrite(pin, HIGH);
//   delay(duration);
//   digitalWrite(pin, LOW);
// }

// Function to connect to MQTT
// void connectToMQTT()
// {
//   while (!client.connected())
//   {
//     Serial.println("Connecting to MQTT...");
//     if (client.connect("ESP32Client", mqttUser, mqttPassword))
//     {
//       Serial.println("Connected to HiveMQ");
//       digitalWrite(17, HIGH); // Turn on LED when connected (Red LED)
//       client.subscribe(controlTopic); // Subscribe to control topic
//     }
//     else
//     {
//       Serial.print("MQTT Connection Failed, State: ");
//       Serial.println(client.state());
//       delay(2000);
//       blinkLED(17, 1000); // Blink LED while connecting
//     }
//   }
// }

// Function to publish random sensor data
void publishSensorData()
{
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

  if (client.publish(sensorTopic, payload.c_str()))
  {
    Serial.println("Data Published Successfully");
  }
  else
  {
    Serial.println("Publish Failed");
  }
  Serial.print("Light Level: " + String(light) + " lx");
  Serial.print("\tTemperature: " + String(temperature) + " °C");
  Serial.println("\tHumidity: " + String(humidity) + " %");

  // delay(3000);  // Delay to prevent flooding MQTT broker
}

void setup()
{
  Serial.begin(115200);
  pinMode(5, OUTPUT);
  pinMode(17, OUTPUT); // LED pin for MQTT connection status

  //
  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    blinkLED(5, 1000); // Blink LED while connecting
  }
  Serial.println("\nWiFi Connected");
  digitalWrite(5, HIGH); // Turn on LED when connected

  espClient.setInsecure(); // Allow SSL without certificates
  client.setServer(mqttServer, mqttPort);
  connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);
  if (client.connected())
  {
    Serial.println("Connected to MQTT Broker");
    digitalWrite(17, HIGH); // Turn on LED when connected (Red LED)
  }
  else
  {
    Serial.println("Failed to connect to MQTT Broker");
    digitalWrite(17, LOW); // Turn off LED if connection fails
  }

  // Initializing the DHT sensor
  dht.setup(4, DHTesp::DHT22);

  // Initializing the BH1750 sensor
  /*
BH1750 aka Light Meter
SDA connect to GPIO21
SCL connect to GPIO22
*/
  Wire.begin(21, 22);
  LightMeter.begin();
}

void loop()
{

  if (!client.connected())
  {
    digitalWrite(17, LOW); // Turn off LED if disconnected
    connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);
  }
  client.loop(); // Keep MQTT connection active

  // Publish sensor data every 5 minutes
  if (millis() - lastPublishTime >= publishInterval)
  {
    publishSensorData();
    lastPublishTime = millis();
  }
}