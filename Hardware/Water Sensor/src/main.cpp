#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>


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

//sensor pins
#define MOTOR 2
#define WaterLevel 34
#define PHsensor 33

int pump_on = 0;
// Forward declaration of Water_remove function
int Water_remove(float waterLevel);

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
      digitalWrite(MOTOR, HIGH);
      Serial.println("Pump ON");
    } else if (message.indexOf("\"pump\":\"OFF\"") > 0) {
      digitalWrite(MOTOR, LOW);
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
  float volatge = raw * (3.3 / 4095.0);
  float PH = 3.5 * volatge + 4;

  String water_level = get_level_of_water(waterLevel);
  String payload = "{\"water_level\": \"" + water_level + "\"" +
                   ", \"ph\": " + String(PH, 2) + "}";
  if((waterLevel > 500) && (pump_on == 0)){
    pump_on = Water_remove(waterLevel);
  }
  if((waterLevel < 300) && (pump_on == 1)){
    digitalWrite(MOTOR, LOW);
    String controlsignal = "{\"pump\":\"OFF\"}";
    if(client.publish(controlTopic, controlsignal.c_str())){
      Serial.println("Water Level is low and Pump is OFF");
      pump_on = 0;
    }
    else{
      Serial.println("publish failed - Water Level is low and cannot OFF the pump");
    }
  }


  Serial.print("Publishing Sensor Data: ");
  Serial.println(payload);

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

int Water_remove(float waterLevel){
    digitalWrite(MOTOR, HIGH);
    String controlsignal = "{\"pump\":\"ON\"}";
    if(client.publish(controlTopic, controlsignal.c_str())){
      Serial.println("Water Level is high and Pump is ON");
      return 1;
    }
    else{
      Serial.println("publish failed - Water Level is high and cannot ON the pump");
      return 0;
    }

}

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR, OUTPUT);

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