#include <HardwareSerial.h>

HardwareSerial sim900(1); // Use UART1

const int rxPin = 16; // ESP32 RX (connect to GSM TX 3.3V)
const int txPin = 17; // ESP32 TX (connect to GSM RX 3.3V)
const long baudRate = 9600; // Update this if you find a different working rate

const char* phoneNumber = "+94719154938"; // Replace with your number
const char* message = "Hey! GSM working without WiFi";
// Helper: Send command and wait for expected response
bool sendAT(const char* cmd, const char* expected, unsigned long timeout) {
  sim900.println(cmd);
  unsigned long start = millis();
  String response = "";

  while (millis() - start < timeout) {
    if (sim900.available()) {
      char c = sim900.read();
      response += c;
      if (response.indexOf(expected) != -1) {
        Serial.println("" + String(cmd) + " -> OK");
        return true;
      }
    }
  }
  Serial.println("" + String(cmd) + " failed. Response: " + response);
  return false;
}

// Helper: Send SMS
bool sendSMS(const char* number, const char* text) {
  sim900.print("AT+CMGS=\"");
  sim900.print(number);
  sim900.println("\"");
  delay(2000);

  sim900.print(text);
  delay(500);
  sim900.write(26); // Ctrl+Z to send
  delay(5000);

  String response = "";
  while (sim900.available()) {
    char c = sim900.read();
    response += c;
  }

  Serial.println("SMS Response: " + response);
  return response.indexOf("+CMGS:") != -1;
}

void setup() {
  Serial.begin(115200);
  sim900.begin(baudRate, SERIAL_8N1, rxPin, txPin);

  delay(3000);
  Serial.println("Initializing GSM module...");

  if (!sendAT("AT", "OK", 2000)) return;
  if (!sendAT("AT+CMGF=1", "OK", 2000)) return; // Set text mode
  if (!sendSMS(phoneNumber, message)) {
    Serial.println("Failed to send SMS.");
  } else {
    Serial.println("SMS sent successfully.");
  }
}

void loop() {
  // Nothing to do
}


