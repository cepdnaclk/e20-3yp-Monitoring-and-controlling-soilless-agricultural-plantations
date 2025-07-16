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

// LED state variables
unsigned long previousMillis = 0;
unsigned long pauseStartTime = 0;
bool ledState = false;
bool inPause = false;
int blinkCount = 0;

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

/*---------------------------------------------------------------------- Non-blocking Blink Pattern Handler ----------------------------------------------*/

void updateLEDPattern()
{
  unsigned long currentMillis = millis();

  // Handle solid pattern
  if (currentPattern == SOLID)
  {
    setColor(currentColor, true);
    return;
  }

  // Handle pause state for multi-blink patterns
  if (inPause)
  {
    unsigned long pauseDuration = 800;
    if (currentPattern == QUICK_DOUBLE)
    {
      pauseDuration = 600;
    }

    if (currentMillis - pauseStartTime >= pauseDuration)
    {
      inPause = false;
      blinkCount = 0;
      previousMillis = currentMillis;
    }
    return;
  }

  // Determine blink interval
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
  case QUICK_DOUBLE:
    interval = (currentPattern == QUICK_DOUBLE) ? 150 : 300;
    break;
  case TRIPLE:
    interval = 200;
    break;
  default:
    interval = 1000;
    break;
  }

  // Handle blink timing
  if (currentMillis - previousMillis >= interval)
  {
    previousMillis = currentMillis;

    // Check if we need to pause after completing pattern
    if ((currentPattern == DOUBLE && blinkCount >= 4) ||
        (currentPattern == TRIPLE && blinkCount >= 6) ||
        (currentPattern == QUICK_DOUBLE && blinkCount >= 4))
    {
      setColor(OFF);
      pauseStartTime = currentMillis;
      inPause = true;
      return;
    }

    // Toggle LED state
    ledState = !ledState;
    setColor(currentColor, ledState);
    blinkCount++;
  }
}

/*--------------------------------------------------------------------------------------------------------------------------------------------*/

// MQTT Configuration
const char *mqttServer = "23162742be094f829a5b3f6f29eb5dd6.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUser = "Tharusha";
const char *mqttPassword = "Tharusha2001";

// Device and User Info
const char *deviceId = "6432";
char userId[64] = "";
char groupId[64] = "";
char sensorTopic[128] = "";

// Sensor instances
DHTesp dht;
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

// Network clients
WiFiClientSecure net;
MQTTClient client;

// Timers
unsigned long lastPublishTime = 0;
unsigned long lastMQTTCheck = 0;
unsigned long lastSensorRead = 0;
const long publishInterval = 10000;
const long mqttCheckInterval = 5000;
const long sensorReadInterval = 2000;

// Sensor data cache
struct SensorData
{
  float temperature;
  float humidity;
  float light;
  bool valid;
  unsigned long lastUpdate;
};

SensorData sensorCache = {0, 0, 0, false, 0};

// Non-blocking delay function that allows LED updates
void nonBlockingDelay(unsigned long duration)
{
  unsigned long startTime = millis();
  while (millis() - startTime < duration)
  {
    updateLEDPattern();
    delay(10); // Small delay to prevent overwhelming the system
  }
}

// Test function to verify SSL connection with non-blocking LED updates
void testSSLConnection()
{
  Serial.println("\n=== Testing SSL Connection ===");
  currentColor = YELLOW;
  currentPattern = SLOW;

  // First test: Basic connectivity without SSL
  Serial.println("Step 1: Testing basic HTTP connectivity...");
  HTTPClient http;
  http.begin("http://httpbin.org/get");
  http.setTimeout(10000);
  int basicCode = http.GET();
  Serial.print("Basic HTTP test result: ");
  Serial.println(basicCode);
  http.end();

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

  // Second test: Time sync check with non-blocking updates
  Serial.println("\nStep 2: Checking system time...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Waiting for time sync");
  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 8 * 3600 * 2 && attempts < 20)
  {
    nonBlockingDelay(500); // Use non-blocking delay
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }
  Serial.println();
  Serial.print("Current time: ");
  Serial.println(ctime(&now));

  if (now < 8 * 3600 * 2)
  {
    Serial.println("Time sync failed, check NTP server");
    currentColor = RED;
    currentPattern = TRIPLE;
    return;
  }

  // Third test: SSL with setInsecure first
  Serial.println("\nStep 3: Testing HTTPS with setInsecure()...");
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

  if (insecureCode > 0)
  {
    currentColor = ORANGE;
    currentPattern = QUICK_DOUBLE;
  }

  // Fourth test: SSL with certificate
  Serial.println("\nStep 4: Testing HTTPS with certificate...");
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

    currentColor = BLUE;
    currentPattern = DOUBLE;
  }
  else
  {
    Serial.print("SSL Connection failed. Error: ");
    Serial.println(https2.errorToString(httpCode));

    // Try alternative certificate approach
    Serial.println("\nStep 5: Trying with different certificate approach...");
    testClient2.setCACert(NULL);
    testClient2.setInsecure();
    https2.begin(testClient2, "https://www.google.com");
    int googleTest = https2.GET();
    Serial.print("Google.com test result: ");
    Serial.println(googleTest);

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
  Serial.println("=== SSL Test Complete ===\n");
}

// Fetch userId from Firebase Function with retry logic and non-blocking delays
bool fetchUserId()
{
  const int maxRetries = 3;
  int retryCount = 0;

  while (retryCount < maxRetries)
  {
    Serial.print("Attempting to fetch userId (attempt ");
    Serial.print(retryCount + 1);
    Serial.print("/");
    Serial.print(maxRetries);
    Serial.println(")...");

    HTTPClient https;
    String url = "https://us-central1-plant-pulse-bd615.cloudfunctions.net/getUserId?deviceId=" + String(deviceId);

    net.setCACert(google_root_ca);
    https.begin(net, url);
    https.setTimeout(15000);
    int httpCode = https.GET();

    if (httpCode == 200)
    {
      String response = https.getString();
      Serial.println("Response: " + response);

      JSONVar doc = JSON.parse(response);

      if (JSON.typeof(doc) == "undefined")
      {
        Serial.println("Parsing input failed!");
        https.end();
        retryCount++;
        continue;
      }

      // Use strncpy for safer string copying
      strncpy(userId, (const char *)doc["userId"], sizeof(userId) - 1);
      strncpy(groupId, (const char *)doc["groupId"], sizeof(groupId) - 1);
      userId[sizeof(userId) - 1] = '\0';
      groupId[sizeof(groupId) - 1] = '\0';

      // Build dynamic topic
      snprintf(sensorTopic, sizeof(sensorTopic), "%s/%s/%s/sensor", userId, groupId, deviceId);

      Serial.println("Retrieved userId: " + String(userId));
      Serial.println("Retrieved groupId: " + String(groupId));
      Serial.println("MQTT Topic: " + String(sensorTopic));

      https.end();
      return true;
    }
    else
    {
      Serial.println("Failed to fetch userId. HTTP Code: " + String(httpCode));
      https.end();
      retryCount++;

      if (retryCount < maxRetries)
      {
        Serial.println("Retrying in 5 seconds...");
        nonBlockingDelay(5000); // Use non-blocking delay
      }
    }
  }

  Serial.println("Failed to fetch userId after " + String(maxRetries) + " attempts");
  return false;
}

// Improved MQTT connection with timeout and non-blocking delays
bool connectToMQTT()
{
  Serial.println("Connecting to MQTT...");
  net.setInsecure();
  client.begin(mqttServer, mqttPort, net);

  int attempts = 0;
  const int maxAttempts = 10;

  while (!client.connect("ESP32Client", mqttUser, mqttPassword) && attempts < maxAttempts)
  {
    Serial.print(".");
    nonBlockingDelay(1000); // Use non-blocking delay
    attempts++;
  }

  if (attempts >= maxAttempts)
  {
    Serial.println("\nFailed to connect to MQTT after " + String(maxAttempts) + " attempts");
    return false;
  }

  Serial.println("\nConnected to MQTT");
  return true;
}

// Non-blocking sensor reading
void readSensors()
{
  unsigned long currentMillis = millis();

  if (currentMillis - lastSensorRead >= sensorReadInterval)
  {
    lastSensorRead = currentMillis;

    float temperature = dht.getTemperature();
    float humidity = dht.getHumidity();
    float light = LightMeter.readLightLevel();

    // Validate sensor readings
    bool tempValid = !isnan(temperature) && temperature > -40 && temperature < 80;
    bool humidValid = !isnan(humidity) && humidity >= 0 && humidity <= 100;
    bool lightValid = !isnan(light) && light >= 0;

    if (tempValid && humidValid && lightValid)
    {
      sensorCache.temperature = temperature;
      sensorCache.humidity = humidity;
      sensorCache.light = light;
      sensorCache.valid = true;
      sensorCache.lastUpdate = currentMillis;

      Serial.print("Sensors updated - Temp: ");
      Serial.print(temperature);
      Serial.print("°C, Humidity: ");
      Serial.print(humidity);
      Serial.print("%, Light: ");
      Serial.print(light);
      Serial.println(" lux");
    }
    else
    {
      Serial.println("Invalid sensor readings detected");
      if (!tempValid)
        Serial.println("  - Temperature invalid: " + String(temperature));
      if (!humidValid)
        Serial.println("  - Humidity invalid: " + String(humidity));
      if (!lightValid)
        Serial.println("  - Light invalid: " + String(light));
    }
  }
}

// Improved sensor data publishing
void publishSensorData()
{
  if (!sensorCache.valid)
  {
    Serial.println("No valid sensor data to publish");
    return;
  }

  // Check if sensor data is too old (older than 30 seconds)
  if (millis() - sensorCache.lastUpdate > 30000)
  {
    Serial.println("Sensor data too old, skipping publish");
    return;
  }

  char payload[200];
  snprintf(payload, sizeof(payload),
           "{\"temperature\": %.2f, \"light_intensity\": %.2f, \"humidity\": %.2f}",
           sensorCache.temperature, sensorCache.light, sensorCache.humidity);

  Serial.print("Publishing: ");
  Serial.println(payload);

  if (client.publish(sensorTopic, payload, false, 1))
  {
    Serial.println("Data published successfully");
    currentColor = GREEN;
    currentPattern = SOLID;
  }
  else
  {
    Serial.println("Failed to publish data");
    currentColor = RED;
    currentPattern = FAST;
  }
}

// Initialize sensors with proper error checking
bool initializeSensors()
{
  Serial.println("Initializing sensors...");

  // Initialize DHT sensor
  dht.setup(4, DHTesp::DHT22);
  Serial.println("DHT22 initialized");

  // Initialize BH1750 sensor
  Wire.begin(21, 22);
  if (!LightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE))
  {
    Serial.println("Failed to initialize BH1750! Check wiring or sensor.");
    return false;
  }
  else
  {
    Serial.println("BH1750 initialized successfully.");
  }

  // Wait a bit for sensors to stabilize
  nonBlockingDelay(2000); // Use non-blocking delay

  // Test initial sensor readings
  Serial.println("Testing initial sensor readings...");
  readSensors();

  return true;
}

void setup()
{
  Serial.begin(115200);
  Serial.println("\n=== Plant Pulse ESP32 Starting ===");

  // Initialize LED pins
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  // Set initial LED state
  currentColor = BLUE;
  currentPattern = SLOW;

  // Connect to WiFi
  WiFiManager wifiManager;
  wifiManager.autoConnect("PlantPulse_Setup");
  Serial.println("Connected to WiFi");

  // Test SSL connection
  testSSLConnection();

  // Initialize sensors
  if (!initializeSensors())
  {
    Serial.println("Sensor initialization failed!");
    currentColor = RED;
    currentPattern = TRIPLE;
    // Continue anyway, but with error indication
  }

  // Fetch user credentials
  if (!fetchUserId())
  {
    Serial.println("Cannot continue without userId - entering error state");
    currentColor = SOLID_RED;
    currentPattern = FAST;
    // Don't halt completely, but indicate error
    return;
  }

  // Connect to MQTT
  if (!connectToMQTT())
  {
    Serial.println("Initial MQTT connection failed - will retry in main loop");
    currentColor = RED;
    currentPattern = DOUBLE;
  }
  else
  {
    currentColor = GREEN;
    currentPattern = SLOW;
  }

  Serial.println("Setup complete - entering main loop");
}

void loop()
{
  // Always update LED pattern (non-blocking)
  updateLEDPattern();

  // Handle MQTT connection check
  unsigned long currentMillis = millis();
  if (currentMillis - lastMQTTCheck >= mqttCheckInterval)
  {
    lastMQTTCheck = currentMillis;

    if (!client.connected())
    {
      Serial.println("MQTT disconnected - attempting reconnection");
      currentColor = YELLOW;
      currentPattern = FAST;

      if (!connectToMQTT())
      {
        Serial.println("MQTT reconnection failed");
        currentColor = RED;
        currentPattern = DOUBLE;
      }
      else
      {
        currentColor = GREEN;
        currentPattern = SLOW;
      }
    }
  }

  // Process MQTT messages (non-blocking)
  if (client.connected())
  {
    client.loop();
  }

  // Read sensors periodically (non-blocking)
  readSensors();

  // Publish sensor data periodically
  if (currentMillis - lastPublishTime >= publishInterval)
  {
    if (client.connected() && strlen(sensorTopic) > 0)
    {
      publishSensorData();
      lastPublishTime = currentMillis;
    }
    else
    {
      Serial.println("Skipping publish - not connected or no topic configured");
    }
  }

  // Small delay to prevent overwhelming the system
  delay(10);
}
