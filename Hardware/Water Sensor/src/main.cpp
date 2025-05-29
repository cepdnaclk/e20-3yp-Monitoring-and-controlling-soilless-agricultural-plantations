#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>


// Include necessary libraries
#include "connect_to_mqtt.h" //header file to connect to MQTT broker
#include "temperature_sensor.h" //header file to read temperature sensor data

// WiFi credentials
const char* ssid = "Devin Hasnaka";
const char* password = "12345678";

// MQTT credentials
const char* mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// MQTT Topics
const char* controlTopic = "test/topic";     // Receive control updates
const char* sensorTopic = "test/sensor";     // Send sensor data

// Secure WiFi client
WiFiClientSecure espClient;
PubSubClient client(espClient); 

//sensor pins
#define tempSensor 15
#define WaterLevel 33
#define PHsensor 34

//indicator LED pin
#define wifi_indicator_pin 2 
#define MQTT_indicator_pin 5

// Initialize OneWire and DallasTemperature for DS18B20


// Timer variables
unsigned long lastPublishTime = 0;
const long publishInterval = 5000;  // Publish every 5 minutes

// // Function to connect to MQTT
// void connectToMQTT() {
//   while (!client.connected()) {
//     Serial.println("Connecting to MQTT...");
//     if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
//       Serial.println("Connected to HiveMQ");
//       client.subscribe(controlTopic);  // Subscribe to control topic
//     } else {
//       Serial.print("MQTT Connection Failed, State: ");
//       Serial.println(client.state());
//       delay(2000);
//     }
//   }
// }



String get_level_of_water(float waterLevel){
  if(waterLevel > 500){
    return "Overflow";
  }
  else if((waterLevel < 500) && (waterLevel > 300)){
    return "Above Normal";
  }
  else if((waterLevel <= 300) && (waterLevel > 100)){
    return "Normal";
  }
  else if((waterLevel <= 100) && (waterLevel > 50)){
    return "Below Normal";
  }
  else if(waterLevel >0){
    return "Low";
  }
  else{
    return "critical";
  }
}
// Function to publish random sensor data
void publishSensorData() {
  // float temperature = random(20, 35) + random(0, 99) / 100.0;  // Random 20.00 - 34.99
  // float humidity = random(40, 90) + random(0, 99) / 100.0;     // Random 40.00 - 89.99
  // float light = random(100, 1000);  // Random 100 - 999
  // float temperature = dht.getTemperature();
  // float humidity = dht.getHumidity();
  // float light = LightMeter.readLightLevel();

  float waterLevel = analogRead(WaterLevel);
  int raw = analogRead(PHsensor);
  float temp = readTemperatureSensor(tempSensor); // Get temperature from DS18B20
  float volatge = raw * (3.3 / 4095.0);
  float PH = 3.5 * volatge + 4;

  String water_level = get_level_of_water(waterLevel);
  String payload = "{\"water_level\": \"" + water_level + "\"" +
                   ", \"ph\": " + String(PH, 2) + ", temperature: " + String(temp) + "}";


  Serial.print("Publishing Sensor Data: ");
  Serial.println(payload);
  Serial.println(temp);

  if (client.publish(sensorTopic, payload.c_str())) {
    Serial.println("Data Published Successfully");
  } else {
    Serial.println("Publish Failed");
  }
  // Serial.print("Light Level: " + String(light) + " lx");
  // Serial.print("\tTemperature: " + String(temperature) + " °C");
  // Serial.println("\tHumidity: " + String(humidity) + " %");

  Serial.print("Water Level: " + water_level + " %");
  Serial.println("\tPH: " + String(PH) + " pH");
  //delay(3000);  // Delay to prevent flooding MQTT broker
}


void setup() {

  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  espClient.setInsecure();  // Allow SSL without certificates
  client.setServer(mqttServer, mqttPort);
  connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);

  // Initialize OneWire and DallasTemperature

}

void loop() {
  if (!client.connected()) {
    connectToMQTT(mqttServer, mqttPort, mqttUser, mqttPassword, client, controlTopic);
  }
  client.loop(); // Keep MQTT connection active

  // Publish sensor data every 5 minutes
  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}