#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

#define MOTOR_B_1A 22
#define MOTOR_B_2A 23

const char* mqttServer = "plantpulse-be3d895a.a03.euc1.aws.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "Tharusha";
const char* mqttPassword = "Tharusha2001";

// Device and User Info
const char* deviceId = "1458";
String userId = "";
String groupId = "";
String controlTopic = "";

// Connection state tracking
bool mqttConnected = false;
unsigned long lastReconnectAttempt = 0;
unsigned long lastKeepAlive = 0;
const unsigned long reconnectInterval = 10000; // 10 seconds
const unsigned long keepAliveInterval = 30000; // 30 seconds

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

void messageReceived(String &topic, String &payload) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.println("Payload: " + payload);

  if (topic == controlTopic) {
    // Parse JSON payload
    JSONVar doc = JSON.parse(payload);

    if (JSON.typeof(doc) == "undefined") {
      Serial.println("Failed to parse JSON payload.");
      return;
    }

    // Read 'pump' command: "ON" or "OFF"
    String pumpCommand = (const char *)doc["pump"];

    // Default PWM speed
    int pwmSpeed = 255;

    // If 'speed' is included in the JSON, use it
    if (doc.hasOwnProperty("speed")) {
      pwmSpeed = (int)doc["speed"];
      pwmSpeed = constrain(pwmSpeed, 0, 255); // Clamp to 8-bit PWM range
    }

    // Control the motor using PWM
    if (pumpCommand == "ON") {
      ledcWrite(0, pwmSpeed); // MOTOR_B_1A
      ledcWrite(1, 0);        // MOTOR_B_2A off
      Serial.println("Pump turned ON with speed: " + String(pwmSpeed));
    } else if (pumpCommand == "OFF") {
      ledcWrite(0, 0);
      ledcWrite(1, 0);
      Serial.println("Pump turned OFF");
    } else {
      Serial.println("Unknown pump command received: " + pumpCommand);
    }
  }
}

// Fetch userId from Firebase Function
bool fetchUserId() {
  HTTPClient https;
  String url = "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=" + String(deviceId);

  // Set the root CA certificate for Google/Firebase services
  net.setCACert(google_root_ca);

  https.begin(net, url);
  int httpCode = https.GET();

  if (httpCode == 200) {
    String response = https.getString();
    Serial.println("Response: " + response);

    JSONVar doc = JSON.parse(response);

    if (JSON.typeof(doc) == "undefined") {
      Serial.println("Parsing input failed!");
      return false;
    }

    userId = (const char *)doc["userId"];
    groupId = (const char *)doc["groupId"];

    // Build dynamic topics
    controlTopic = userId + "/" + groupId + "/" + deviceId + "/control";

    Serial.println("Retrieved userId: " + userId);
    Serial.println("MQTT Topics: ");
    Serial.println("Control -> " + controlTopic);

    https.end();
    return true;
  } else {
    Serial.println("Failed to fetch userId: " + String(httpCode));
    https.end();
    return false;
  }
}

// Fixed MQTT connection function with better diagnostics
bool connectToMQTT() {
  if (client.connected()) {
    return true; // Already connected
  }

  Serial.print("Attempting MQTT connection...");
  
  // Configure the client with keep-alive and buffer settings
  net.setInsecure();
  client.begin(mqttServer, mqttPort, net);
  client.onMessage(messageReceived);
  
  // Set keep-alive interval (in seconds) and buffer size
  client.setKeepAlive(60); // 60 seconds keep-alive
  client.setCleanSession(true); // Clean session for fresh start
  client.setTimeout(5000); // 5 second timeout

  // Generate unique client ID to prevent conflicts
  String clientId = "ESP32Client_" + String(deviceId) + "_" + String(random(10000));
  
  // Try to connect with timeout
  int attempts = 0;
  const int maxAttempts = 5;
  
  while (!client.connect(clientId.c_str(), mqttUser, mqttPassword) && attempts < maxAttempts) {
    Serial.print(".");
    delay(2000);
    attempts++;
  }

  if (client.connected()) {
    Serial.println(" Connected to MQTT!");
    Serial.println("Client ID: " + clientId);
    client.subscribe(controlTopic, 1);
    Serial.println("Subscribed to: " + controlTopic);
    mqttConnected = true;
    return true;
  } else {
    Serial.println(" Failed to connect to MQTT");
    Serial.println("Connection state: " + String(client.lastError()));
    mqttConnected = false;
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  
  // Setup motor control pins
  pinMode(MOTOR_B_1A, OUTPUT);
  pinMode(MOTOR_B_2A, OUTPUT);
  ledcAttachPin(MOTOR_B_1A, 0); // Channel 0 for pin 22
  ledcAttachPin(MOTOR_B_2A, 1); // Channel 1 for pin 23
  ledcSetup(0, 5000, 8);        // Channel 0, 5kHz, 8-bit resolution
  ledcSetup(1, 5000, 8);        // Channel 1, 5kHz, 8-bit resolution

  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.println("Connected to WiFi");

  // Test SSL connection first
  testSSLConnection();

  if (!fetchUserId()) {
    Serial.println("Cannot continue without userId");
    while (true) delay(1000);
  }

  // Initial MQTT connection
  connectToMQTT();
}

void loop() {
  // Handle MQTT client
  if (client.connected()) {
    client.loop();
    
    // Update connection status
    if (!mqttConnected) {
      mqttConnected = true;
      Serial.println("MQTT connection restored");
    }
    
    // Send periodic keep-alive/ping
    unsigned long now = millis();
    if (now - lastKeepAlive > keepAliveInterval) {
      lastKeepAlive = now;
      // Send a small ping message to maintain connection
      String pingTopic = userId + "/" + groupId + "/" + deviceId + "/ping";
      client.publish(pingTopic, "alive");
    }
    
  } else {
    // Connection lost
    if (mqttConnected) {
      mqttConnected = false;
      Serial.println("MQTT connection lost");
      Serial.println("WiFi status: " + String(WiFi.status()));
      Serial.println("WiFi RSSI: " + String(WiFi.RSSI()));
    }
    
    // Try to reconnect with rate limiting
    unsigned long now = millis();
    if (now - lastReconnectAttempt > reconnectInterval) {
      lastReconnectAttempt = now;
      
      // Check WiFi connection first
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected, attempting reconnection...");
        WiFi.reconnect();
        delay(5000);
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("Attempting to reconnect...");
        connectToMQTT();
      }
    }
  }
  
  // Small delay to prevent overwhelming the loop
  delay(500);
}