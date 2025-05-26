#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include "connect_to_mqtt.h"

// Function to connect to MQTT
void connectToMQTT(const char* mqttServer, int mqttPort, const char* mqttUser, const char* mqttPassword, PubSubClient& client, const char* controlTopic) {
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


