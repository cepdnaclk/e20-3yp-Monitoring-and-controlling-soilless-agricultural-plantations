#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

#define MOTOR_B_1A 22
#define MOTOR_B_2A 23

const char *mqttServer = "plant-pulse-ac718a95.a03.euc1.aws.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUser = "Tharusha";
const char *mqttPassword = "Tharusha2001";

// Device and User Info
const char *deviceId = "2341";
String userId = "";
String groupId = "";
String controlTopic = "";

// Root CA Certificate for Firebase/Google Services
const char *google_root_ca =
    "-----BEGIN CERTIFICATE-----\n"
    "MIIDdTCCAl2gAwIBAgILBAAAAAABFUtaw5QwDQYJKoZIhvcNAQEFBQAwVzELMAkG\n"
    "A1UEBhMCQkUxGTAXBgNVBAoTEEdsb2JhbFNpZ24gbnYtc2ExEDAOBgNVBAsTB1Jv\n"
    "b3QgQ0ExGzAZBgNVBAMTEkdsb2JhbFNpZ24gUm9vdCBDQTAeFw05ODA5MDExMjAw\n"
    "MDBaFw0yODAxMjgxMjAwMDBaMFcxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9i\n"
    "YWxTaWduIG52LXNhMRAwDgYDVQQLEwdSb290IENBMRswGQYDVQQDExJHbG9iYWxT\n"
    "aWduIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDaDuaZ\n"
    "jc6j40+Kfvvxi4Mla+pIH/EqsLmVEQS98GPR4mdmzxzdzxtIK+6NiY6arymAZavp\n"
    "xy0Sy6scTHAHoT0KMM0VjU/43dSMUBUc71DuxC73/OlS8pF94G3VNTCOXkNz8kHp\n"
    "1Wrjsok6Vjk4bwY8iGlbKk3Fp1S4bInMm/k8yuX9ifUSPJJ4ltbcdG6TRGHRjcdG\n"
    "snUOhugZitVtbNV4FpWi6cgKOOvyJBNPc1STE4U6G7weNLWLBYy5d4ux2x8gkasJ\n"
    "U26Qzns3dLlwR5EiUWMWea6xrkEmCMgZK9FGqkjWZCrXgzT/LCrBbBlDSgeF59N8\n"
    "9iFo7+ryUp9/k5DPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8E\n"
    "BTADAQH/MB0GA1UdDgQWBBRge2YaRQ2XyolQL30EzTSo//z9SzANBgkqhkiG9w0B\n"
    "AQUFAAOCAQEA1nPnfE920I2/7LqivjTFKDK1fPxsnCwrvQmeU79rXqoRSLblCKOz\n"
    "yj1hTdNGCbM+w6DjY1Ub8rrvrTnhQ7k4o+YviiY776BQVvnGCv04zcQLcFGUl5gE\n"
    "38NflNUVyRRBnMRddWQVDf9VMOyGj/8N7yy5Y0b2qvzfvGn9LhJIZJrglfCm7ymP\n"
    "AbEVtQwdpf5pLGkkeB6zpxxxYu7KyJesF12KwvhHhm4qxFYxldBniYUr+WymXUad\n"
    "DKqC5JlR3XC321Y9YeRq4VzW9v493kHMB65jUr9TU/Qr6cf9tveCX4XSQRjbgbME\n"
    "HMUfpIBvFSDJ3gyICh3WZlXi/EjJKSZp4A==\n"
    "-----END CERTIFICATE-----\n";

// HTTPS client
WiFiClientSecure net;
MQTTClient client;

// Test function to verify SSL connection
void testSSLConnection()
{
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
  while (now < 8 * 3600 * 2 && attempts < 20)
  {
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
  if (insecureCode > 0)
  {
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

  if (httpCode > 0)
  {
    String response = https2.getString();
    Serial.println("Response received:");
    Serial.println(response);
    Serial.println("SSL Connection with certificate successful!");
  }
  else
  {
    Serial.print("SSL Connection failed. Error: ");
    Serial.println(https2.errorToString(httpCode));

    // Try alternative certificate approach
    Serial.println("\\nStep 5: Trying with different certificate approach...");
    testClient2.setCACert(NULL);                         // Clear certificate
    testClient2.setInsecure();                           // Fall back to insecure for comparison
    https2.begin(testClient2, "https://www.google.com"); // Test with known working Google endpoint
    int googleTest = https2.GET();
    Serial.print("Google.com test result: ");
    Serial.println(googleTest);
  }

  https2.end();
  Serial.println("=== SSL Test Complete ===\\n");
}

// void messageReceived(String &topic, String &payload)
// {
//   Serial.print("Message received on topic: ");
//   Serial.println(topic);
//   Serial.println("Message: " + payload);

//   if (topic == controlTopic)
//   {
//     if (payload.indexOf("\"pump\": \"ON\"") >= 0)
//     {
//       ledcWrite(0, speed); // start MOTOR_B_1A with speed
//       ledcWrite(1, 0);     // Ensure MOTOR_B_2A is off
//       Serial.println("Pump ON");
//     }
//     else if (payload.indexOf("\"pump\": \"OFF\"") >= 0)
//     {
//       ledcWrite(0, 0); // Ensure MOTOR_B_1A is off
//       ledcWrite(1, 0); // Ensure MOTOR_B_2A is off
//       Serial.println("Pump OFF");
//     }
//   }
// }

void messageReceived(String &topic, String &payload)
{
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.println("Payload: " + payload);

  if (topic == controlTopic)
  {
    // Parse JSON payload
    JSONVar doc = JSON.parse(payload);

    if (JSON.typeof(doc) == "undefined")
    {
      Serial.println("Failed to parse JSON payload.");
      return;
    }

    // Read 'pump' command: "ON" or "OFF"
    String pumpCommand = (const char *)doc["pump"];

    // Default PWM speed
    int pwmSpeed = 200;

    // If 'speed' is included in the JSON, use it
    if (doc.hasOwnProperty("speed"))
    {
      pwmSpeed = (int)doc["speed"];
      pwmSpeed = constrain(pwmSpeed, 0, 255); // Clamp to 8-bit PWM range
    }

    // Control the motor using PWM
    if (pumpCommand == "ON")
    {
      ledcWrite(0, pwmSpeed); // MOTOR_B_1A
      ledcWrite(1, 0);        // MOTOR_B_2A off
      Serial.println("Pump turned ON with speed: " + String(pwmSpeed));
    }
    else if (pumpCommand == "OFF")
    {
      ledcWrite(0, 0);
      ledcWrite(1, 0);
      Serial.println("Pump turned OFF");
    }
    else
    {
      Serial.println("Unknown pump command received: " + pumpCommand);
    }
  }
}

// Fetch userId from Firebase Function
bool fetchUserId()
{
  HTTPClient https;
  String url = "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=" + String(deviceId);

  net.setCACert(google_root_ca);
  https.begin(net, url);
  int httpCode = https.GET();

  if (httpCode == 200)
  {
    String response = https.getString();
    Serial.println("Response: " + response);

    JSONVar doc = JSON.parse(response);

    if (JSON.typeof(doc) == "undefined")
    {
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
  }
  else
  {
    Serial.println("Failed to fetch userId: " + String(httpCode));
    https.end();
    return false;
  }
}

void connectToMQTT()
{
  net.setInsecure();
  client.begin(mqttServer, mqttPort, net);
  client.onMessage(messageReceived);

  while (!client.connect("ESP32Client", mqttUser, mqttPassword))
  {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nConnected to MQTT");
  client.subscribe(controlTopic, 1);
}

void setup()
{
  Serial.begin(115200);

  pinMode(MOTOR_B_1A, OUTPUT);
  pinMode(MOTOR_B_2A, OUTPUT);
  ledcAttachPin(MOTOR_B_1A, 0); // Channel 0 for pin 22
  ledcAttachPin(MOTOR_B_2A, 1); // Channel 1 for pin 23
  ledcSetup(0, 5000, 8);        // Channel 0, 5kHz, 8-bit resolution
  ledcSetup(1, 5000, 8);        // Channel 1, 5kHz, 8-bit resolution

  //pinMode(5, OUTPUT);

  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.println("Connected to WiFi");

  // Test SSL connection first
  testSSLConnection();

  if (!fetchUserId())
  {
    Serial.println("Cannot continue without userId");
    while (true)
      delay(1000);
  }

  connectToMQTT();
}

void loop()
{
  client.loop();

  if (!client.connected())
  {
    connectToMQTT();
  }
}