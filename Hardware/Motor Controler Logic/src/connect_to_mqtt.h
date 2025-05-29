#ifndef CONNECT_TO_MQTT_CPP_H
#define CONNECT_TO_MQTT_CPP_H
// connect_to_mqtt.h
// Include necessary libraries

#include <PubSubClient.h>
#include <WiFiClientSecure.h>

void connectToMQTT(const char* mqttServer, int mqttPort, const char* mqttUser, const char* mqttPassword, PubSubClient& client, const char* controlTopic);

#endif