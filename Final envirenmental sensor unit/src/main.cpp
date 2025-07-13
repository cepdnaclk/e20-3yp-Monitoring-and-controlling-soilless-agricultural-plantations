#include <MQTTClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

#include <DHTesp.h>
#include <BH1750.h>
#include <Wire.h>

// pin definitions
// #define tempSensor 15
// #define WaterLevel 33
// #define PHsensor 34

/*------------------------------------------------------ LED control Utility --------------------------------------------------------------*/

#define RED_PIN 17
#define GREEN_PIN 5
#define BLUE_PIN 2

enum LedColor
{
  OFF,
  GREEN,
  YELLOW,
  BLUE,
  ORANGE,
  RED,
  SOLID_RED
};
enum BlinkPattern
{
  SOLID,
  SLOW,
  FAST,
  DOUBLE,
  TRIPLE,
  QUICK_DOUBLE
};

unsigned long previousMillis = 0;
bool ledState = false;

LedColor currentColor = OFF;
BlinkPattern currentPattern = SOLID;

void setColor(LedColor color, bool state = true)
{
  int r = 0, g = 0, b = 0;
  if (!state)
  {
    analogWrite(RED_PIN, 0);
    analogWrite(GREEN_PIN, 0);
    analogWrite(BLUE_PIN, 0);
    return;
  }

  switch (color)
  {
  case GREEN:
    g = 255;
    break;
  case YELLOW:
    g = 255;
    r = 255;
    break;
  case BLUE:
    b = 255;
    break;
  case ORANGE:
    r = 255;
    g = 100;
    break;
  case RED:
  case SOLID_RED:
    r = 255;
    break;
  case OFF:
  default:
    break;
  }
  analogWrite(RED_PIN, r);
  analogWrite(GREEN_PIN, g);
  analogWrite(BLUE_PIN, b);
}

/*-------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------- Blink Pattern Handler ----------------------------------------------*/

void updateLEDPattern()
{
  unsigned long currentMillis = millis();
  static int blinkCount = 0;

  unsigned long interval = 1000; // default slow
  switch (currentPattern)
  {
  case SLOW:
    interval = 1000;
    break;
  case FAST:
    interval = 300;
    break;
  case DOUBLE:
    interval = 300;
    break;
  case QUICK_DOUBLE:
    interval = 150;
    break;
  case TRIPLE:
    interval = 200;
    break;
  case SOLID:
    setColor(currentColor, true);
    return;
  }

  if (currentMillis - previousMillis >= interval)
  {
    previousMillis = currentMillis;

    if (currentPattern == DOUBLE && blinkCount >= 2)
    {
      setColor(OFF);
      blinkCount = 0;
      delay(800);
    }
    else if (currentPattern == TRIPLE && blinkCount >= 3)
    {
      setColor(OFF);
      blinkCount = 0;
      delay(800);
    }
    else if (currentPattern == QUICK_DOUBLE && blinkCount >= 2)
    {
      setColor(OFF);
      blinkCount = 0;
      delay(600);
    }
    else
    {
      ledState = !ledState;
      setColor(currentColor, ledState);
      blinkCount++;
    }
  }
}

/*--------------------------------------------------------------------------------------------------------------------------------------------*/

const char *mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUser = "Tharusha";
const char *mqttPassword = "Tharusha2001";

// Device and User Info
const char *deviceId = "6432";
String userId = "";
String groupId = "";
String sensorTopic = "";

// Initializing the DHT sensor
DHTesp dht;

// Initializing the BH1750 sensor
BH1750 LightMeter;

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

// Timer
unsigned long lastPublishTime = 0;
const long publishInterval = 10000;

// Test function to verify SSL connection
void testSSLConnection()
{
  Serial.println("\\n=== Testing SSL Connection ===");
  currentColor = YELLOW;
  currentPattern = SLOW;
  // First test: Basic connectivity without SSL
  Serial.println("Step 1: Testing basic HTTP connectivity...");
  HTTPClient http;
  http.begin("http://httpbin.org/get");
  int basicCode = http.GET();
  Serial.print("Basic HTTP test result: ");
  Serial.println(basicCode);
  http.end();

  // LED Blink
  if (basicCode > 0)
  {
    Serial.println("Basic HTTP endpoint is reachable");
  }
  else
  {
    Serial.println("Basic HTTP endpoint failed");
    currentColor = RED;
    currentPattern = FAST;
    return;
  }

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

  // LED Blink
  if (now < 8 * 3600 * 2)
  {
    Serial.println("Time sync failed, check NTP server");
    currentColor = RED;
    currentPattern = TRIPLE;
    return;
  }

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

  // Blink LED
  if (insecureCode > 0)
  {
    currentColor = ORANGE;
    currentPattern = QUICK_DOUBLE; // fallback SSL used
  }

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

    //LED Blink
    currentColor = BLUE;
    currentPattern = DOUBLE; // secure connection OK
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

    //LED Blink
    if (googleTest > 0)
    {
      currentColor = ORANGE;
      currentPattern = QUICK_DOUBLE;
    }
    else
    {
      currentColor = SOLID_RED;
      currentPattern = FAST;
    }
  }

  https2.end();
  Serial.println("=== SSL Test Complete ===\\n");
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
    sensorTopic = userId + "/" + groupId + "/" + deviceId + "/sensor";

    Serial.println("Retrieved userId: " + userId);
    Serial.println("MQTT Topics: ");
    Serial.println("Sensor -> " + sensorTopic);

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

  while (!client.connect("ESP32Client", mqttUser, mqttPassword))
  {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nConnected to MQTT");
}

void publishSensorData()
{
  float temperature = dht.getTemperature();
  float humidity = dht.getHumidity();
  float light = LightMeter.readLightLevel();

  String payload = "{\"temperature\": " + String(temperature, 2) +
                   ", \"light_intensity\": " + String(light, 2) +
                   ", \"humidity\": " + String(humidity, 2) + "}";

  Serial.print("Publishing: ");
  Serial.println(payload);

  if (client.publish(sensorTopic.c_str(), payload, false, 1))
  {
    Serial.println("Data published");
  }
  else
  {
    Serial.println("Failed to publish");
  }
}

void setup()
{
  Serial.begin(115200);

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
  dht.setup(4, DHTesp::DHT22);

  // Initializing the BH1750 sensor
  /*
BH1750 aka Light Meter
SDA connect to GPIO21
SCL connect to GPIO22
*/
  Wire.begin(21, 22);
  LightMeter.begin();
  //   if (!LightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) {
  //   Serial.println("⚠️ Failed to initialize BH1750! Check wiring or sensor.");
  // } else {
  //   Serial.println("✅ BH1750 initialized successfully.");
  // }
}

void loop()
{
  updateLEDPattern();
  client.loop();

  if (!client.connected())
  {
    connectToMQTT();
  }

  if (millis() - lastPublishTime >= publishInterval)
  {
    publishSensorData();
    lastPublishTime = millis();
  }
}