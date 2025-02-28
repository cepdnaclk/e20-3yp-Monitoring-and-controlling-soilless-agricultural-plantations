#include <WiFi.h>
#include <PubSubClient.h>

#define WIFI_SSID "Eng-Student"//"Galaxy M31C1C6"//"Dialog 4G 635"
#define WIFI_PASSWORD "3nG5tuDt"//"tharusha123"//"7AA3c3e3"
#define MQTT_BROKER "broker.emqx.io"  // Change to your Mosquitto server IP
#define MQTT_PORT 1883
#define MQTT_TOPIC "tharusha/data"

WiFiClient espClient;
PubSubClient client(espClient);

void connectToWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(5000);
    }
    Serial.println("\nConnected to WiFi!");
}

void connectToMQTT() {
    while (!client.connected()) {
        Serial.print("Connecting to MQTT...");
        if (client.connect("ESP32Client")) {
            Serial.println("Connected!");
        } else {
            Serial.print("Failed, rc=");
            Serial.print(client.state());
            Serial.println(" retrying in 5 seconds...");
            delay(5000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    connectToWiFi();
    client.setServer(MQTT_BROKER, MQTT_PORT);
    connectToMQTT();
}

void loop() {
    if (!client.connected()) {
        connectToMQTT();
    }
    client.loop();

    // Generate Random Sensor Data
    float sensor1 = random(100);
    float sensor2 = random(100);
    float sensor3 = random(100);
    float sensor4 = random(100);
    float sensor5 = random(100);

    // Create JSON Payload
    String payload = "{";
    payload += "\"sensor1\":" + String(sensor1) + ",";
    payload += "\"sensor2\":" + String(sensor2) + ",";
    payload += "\"sensor3\":" + String(sensor3) + ",";
    payload += "\"sensor4\":" + String(sensor4) + ",";
    payload += "\"sensor5\":" + String(sensor5);
    payload += "}";

    Serial.println("Publishing: " + payload);
    
    client.publish(MQTT_TOPIC, payload.c_str());
    
    delay(300000);
}
