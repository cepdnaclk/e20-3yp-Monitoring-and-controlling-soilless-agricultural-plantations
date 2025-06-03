#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* mqttServer = "plant-pulse-ac718a95.a03.euc1.aws.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// Device and User Info
const char* deviceId = "6432";
String userId = "";
String groupId = "";
String sensorTopic = "";

// Root CA Certificate for Firebase/Google Services
const char* google_root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDdTCCAl2gAwIBAgILBAAAAAABFUtaw5QwDQYJKoZIhvcNAQEFBQAwVzELMAkG\n" \
"A1UEBhMCQkUxGTAXBgNVBAoTEEdsb2JhbFNpZ24gbnYtc2ExEDAOBgNVBAsTB1Jv\n" \
"b3QgQ0ExGzAZBgNVBAMTEkdsb2JhbFNpZ24gUm9vdCBDQTAeFw05ODA5MDExMjAw\n" \
"MDBaFw0yODAxMjgxMjAwMDBaMFcxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9i\n" \
"YWxTaWduIG52LXNhMRAwDgYDVQQLEwdSb290IENBMRswGQYDVQQDExJHbG9iYWxT\n" \
"aWduIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDaDuaZ\n" \
"jc6j40+Kfvvxi4Mla+pIH/EqsLmVEQS98GPR4mdmzxzdzxtIK+6NiY6arymAZavp\n" \
"xy0Sy6scTHAHoT0KMM0VjU/43dSMUBUc71DuxC73/OlS8pF94G3VNTCOXkNz8kHp\n" \
"1Wrjsok6Vjk4bwY8iGlbKk3Fp1S4bInMm/k8yuX9ifUSPJJ4ltbcdG6TRGHRjcdG\n" \
"snUOhugZitVtbNV4FpWi6cgKOOvyJBNPc1STE4U6G7weNLWLBYy5d4ux2x8gkasJ\n" \
"U26Qzns3dLlwR5EiUWMWea6xrkEmCMgZK9FGqkjWZCrXgzT/LCrBbBlDSgeF59N8\n" \
"9iFo7+ryUp9/k5DPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8E\n" \
"BTADAQH/MB0GA1UdDgQWBBRge2YaRQ2XyolQL30EzTSo//z9SzANBgkqhkiG9w0B\n" \
"AQUFAAOCAQEA1nPnfE920I2/7LqivjTFKDK1fPxsnCwrvQmeU79rXqoRSLblCKOz\n" \
"yj1hTdNGCbM+w6DjY1Ub8rrvrTnhQ7k4o+YviiY776BQVvnGCv04zcQLcFGUl5gE\n" \
"38NflNUVyRRBnMRddWQVDf9VMOyGj/8N7yy5Y0b2qvzfvGn9LhJIZJrglfCm7ymP\n" \
"AbEVtQwdpf5pLGkkeB6zpxxxYu7KyJesF12KwvhHhm4qxFYxldBniYUr+WymXUad\n" \
"DKqC5JlR3XC321Y9YeRq4VzW9v493kHMB65jUr9TU/Qr6cf9tveCX4XSQRjbgbME\n" \
"HMUfpIBvFSDJ3gyICh3WZlXi/EjJKSZp4A==\n" \
"-----END CERTIFICATE-----\n";

// HTTPS client
WiFiClientSecure net;
MQTTClient client;

// Timer
unsigned long lastPublishTime = 0;
const long publishInterval = 10000;

// Test function to verify SSL connection
void testSSLConnection() {
  Serial.println("\\n=== Testing SSL Connection ===");
  
  // First test: Basic connectivity without SSL
  Serial.println("Step 1: Testing basic HTTP connectivity...");
  HTTPClient http;
  http.begin("http://httpbin.org/get");
  int basicCode = http.GET();
  Serial.print("Basic HTTP test result: ");
  Serial.println(basicCode);
  http.end();
  
  // Second test: Time sync check
  Serial.println("\\nStep 2: Checking system time...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Waiting for time sync");
  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 8 * 3600 * 2 && attempts < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }
  Serial.println();
  Serial.print("Current time: ");
  Serial.println(ctime(&now));
  
  // Third test: SSL with setInsecure first
  Serial.println("\\nStep 3: Testing HTTPS with setInsecure()...");
  WiFiClientSecure testClient1;
  testClient1.setInsecure();
  HTTPClient https1;
  https1.begin(testClient1, "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=test");
  https1.setTimeout(15000);
  int insecureCode = https1.GET();
  Serial.print("Insecure HTTPS result: ");
  Serial.println(insecureCode);
  if (insecureCode > 0) {
    Serial.println("HTTPS endpoint is reachable");
  }
  https1.end();
  
  // Fourth test: SSL with certificate
  Serial.println("\\nStep 4: Testing HTTPS with certificate...");
  WiFiClientSecure testClient2;
  testClient2.setCACert(google_root_ca);
  
  HTTPClient https2;
  https2.begin(testClient2, "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=test");
  https2.setTimeout(15000);
  
  Serial.println("Attempting HTTPS connection with certificate...");
  int httpCode = https2.GET();
  
  Serial.print("HTTP Response Code: ");
  Serial.println(httpCode);
  
  if (httpCode > 0) {
    String response = https2.getString();
    Serial.println("Response received:");
    Serial.println(response);
    Serial.println("SSL Connection with certificate successful!");
  } else {
    Serial.print("SSL Connection failed. Error: ");
    Serial.println(https2.errorToString(httpCode));
    
    // Try alternative certificate approach
    Serial.println("\\nStep 5: Trying with different certificate approach...");
    testClient2.setCACert(NULL); // Clear certificate
    testClient2.setInsecure(); // Fall back to insecure for comparison
    https2.begin(testClient2, "https://www.google.com"); // Test with known working Google endpoint
    int googleTest = https2.GET();
    Serial.print("Google.com test result: ");
    Serial.println(googleTest);
  }
  
  https2.end();
  Serial.println("=== SSL Test Complete ===\\n");
}

// Fetch userId from Firebase Function
bool fetchUserId() {
  HTTPClient https;
  String url = "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=" + String(deviceId);

  // net.setInsecure();  // For dev only
  // Set the root CA certificate for Google/Firebase services
  net.setCACert(google_root_ca);

  https.begin(net, url);
  int httpCode = https.GET();

  if (httpCode == 200) {
    String response = https.getString();
    Serial.println("Response: " + response);

    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);
    userId = doc["userId"].as<String>();
    groupId = doc["groupId"].as<String>();

    // Build dynamic topics
    sensorTopic = userId + "/" + groupId + "/" + deviceId + "/sensor";

    Serial.println("Retrieved userId: " + userId);
    Serial.println("MQTT Topics: ");
    Serial.println("Sensor -> " + sensorTopic);

    https.end();
    return true;
  } else {
    Serial.println("Failed to fetch userId: " + String(httpCode));
    https.end();
    return false;
  }
}

void connectToMQTT() {
  net.setInsecure();
  client.begin(mqttServer, mqttPort, net);

  while (!client.connect("ESP32Client", mqttUser, mqttPassword)) {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nConnected to MQTT");
}

void publishSensorData() {
  float temperature = random(20, 35) + random(0, 99) / 100.0;
  float humidity = random(40, 90) + random(0, 99) / 100.0;
  String water_level = "normal";
  float ph = random(0, 14) + random(0, 99) / 100.0;
  float light_intensity = random(0, 14000) + random(0, 99) / 100.0;

  String payload = "{\"temperature\": " + String(temperature, 2) +
                  ", \"ph\": " + String(ph, 2) +
                  ", \"water_level\": \"" + water_level + "\"" +
                  ", \"light_intensity\": " + String(light_intensity, 2) +
                  ", \"humidity\": " + String(humidity, 2) + "}";

  Serial.print("Publishing: ");
  Serial.println(payload);

  if (client.publish(sensorTopic.c_str(), payload, false, 1)) {
    Serial.println("Data published");
  } else {
    Serial.println("Failed to publish");
  }
}

void setup() {
  Serial.begin(115200);

  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.println("Connected to WiFi");

  // Test SSL connection first
  testSSLConnection();

  if (!fetchUserId()) {
    Serial.println("Cannot continue without userId");
    while (true) delay(1000);
  }

  connectToMQTT();
}

void loop() {
  client.loop();

  if (!client.connected()) {
    connectToMQTT();
  }

  if (millis() - lastPublishTime >= publishInterval) {
    publishSensorData();
    lastPublishTime = millis();
  }
}
