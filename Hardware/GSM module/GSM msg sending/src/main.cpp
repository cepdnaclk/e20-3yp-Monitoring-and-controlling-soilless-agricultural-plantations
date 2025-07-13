// #include <Arduino.h>

// // put function declarations here:
// int myFunction(int, int);

// void setup() {
//   // put your setup code here, to run once:
//   int result = myFunction(2, 3);
// }

// void loop() {
//   // put your main code here, to run repeatedly:
// }

// // put function definitions here:
// int myFunction(int x, int y) {
//   return x + y;
// }

// #include <HardwareSerial.h>

// HardwareSerial GSM(1); // Assuming GSM is connected to Serial1

// void setup(){
//     Serial.begin(115200);
//     GSM.begin(9600,SERIAL_8N1,16,17);

//     Serial.println("Initializing...");
//     delay(1000);

//     GSM.println("AT"); // Check GSM module
//     delay(1000);

//     GSM.println("AT+CMGF=1"); // Set SMS text mode
//     delay(1000);

//     GSM.println("AT+CMGS=\"+94719154938\""); // Recipient number
//     delay(1000);

//     GSM.print("Hello from ESP32 via GSM!"); // Message body
//     delay(500);

//     GSM.write(26); // CTRL+Z to send SMS

// }
// void loop() {
//   while (GSM.available()) {
//     Serial.write(GSM.read()); // Print GSM responses to Serial Monitor
//   }
// }

// #include <HardwareSerial.h>

// HardwareSerial GSM(1); // UART1 on ESP32

// void setup() {
//   Serial.begin(115200);
//   GSM.begin(9600, SERIAL_8N1, 17, 16); // GSM RX=17, TX=16

//   Serial.println("GSM Module Test Starting...");
//   delay(2000);

//   // Step 1: Test communication
//   GSM.println("AT"); // Basic attention command
//   delay(1000);

//   // Step 2: Check SIM status
//   GSM.println("AT+CPIN?"); // SIM status
//   delay(1000);

//   // Step 3: Check network registration
//   GSM.println("AT+CREG?"); // Network registration status
//   delay(1000);

//   // Step 4: Check signal strength
//   GSM.println("AT+CSQ"); // Signal quality
// }

// void loop() {
//   while (GSM.available()) {
//     Serial.write(GSM.read()); // Print GSM responses to Serial Monitor
//   }
// }


// #include <HardwareSerial.h>

// HardwareSerial sim900(1); // use UART1

// const int rxPin = 16; // ESP32 RX (connect to SIM900 TX)
// const int txPin = 17; // ESP32 TX (connect to SIM900 RX)
// const int baudRate = 9600;

// const char* phoneNumber = "0719154938"; // Replace with your number
// const char* message = "Hello from ESP32 via SIM900A!";

// // Function prototype for sendATCommand
// bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout);

// // Function prototype for sendSMS
// void sendSMS(const char* number, const char* text);

// void setup() {
//   Serial.begin(9400);
//   sim900.begin(baudRate, SERIAL_8N1, rxPin, txPin);

//   Serial.println("Initializing SIM900A...");
//   delay(3000);

//   if (sendATCommand("AT", "OK", 2000)) {
//     Serial.println("SIM900A ready.");
//   } else {
//     Serial.println("Failed to communicate with SIM900A.");
//     return;
//   }

//   if (sendATCommand("AT+CMGF=1", "OK", 2000)) { // Set SMS mode
//     Serial.println("SMS Text Mode Set.");
//   } else {
//     Serial.println("Failed to set SMS Text Mode.");
//     return;
//   }

//   Serial.println("Sending SMS...");
//   sendSMS(phoneNumber, message);
// }

// void loop() {
//   // Nothing here
// }

// bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
//   sim900.println(command);
//   unsigned long timeStart = millis();
//   String response = "";

//   while (millis() - timeStart < timeout) {
//     if (sim900.available()) {
//       char c = sim900.read();
//       response += c;
//       if (response.indexOf(expectedResponse) != -1) {
//         return true; // Expected response found
//       }
//     }
//   }
//   Serial.print("Response: ");
//   Serial.println(response);
//   return false; // Timeout
// }

// void sendSMS(const char* number, const char* text) {
//   sim900.print("AT+CMGS=\"");
//   sim900.print(number);
//   sim900.println("\"");
//   delay(2000);

//   sim900.print(text);
//   delay(500);

//   sim900.write(26); // Ctrl+Z to send SMS
//   delay(5000); // Wait for response

//   // Read and print final response
//   while (sim900.available()) {
//     Serial.write(sim900.read());
//   }

//   Serial.println("\nSMS Send Command Issued.");
// }


#include <HardwareSerial.h>

HardwareSerial sim900(1); // use UART1

const int rxPin = 16; // ESP32 RX (connect to SIM900 TX)
const int txPin = 17; // ESP32 TX (connect to SIM900 RX)
const int baudRate = 115200; // Updated baud rate

const char* phoneNumber = "+94719154938"; // Replace with your number
const char* message = "Hello from ESP32 via SIM900A!";

// Function prototype for sendSMS
void sendSMS(const char* number, const char* text);

// Function prototype for printResponse
void printResponse();

void setup() {
  Serial.begin(115200);          // Debug serial
  sim900.begin(baudRate, SERIAL_8N1, rxPin, txPin); // SIM900A serial

  delay(3000);
  Serial.println("Checking SIM900A connection...");

  // Try AT 5 times to confirm SIM900A is responsive
  for (int i = 0; i < 5; i++) {
    sim900.println("AT");
    delay(1000);
    if (sim900.available()) {
      String resp = sim900.readString();
      Serial.println("SIM900A responded:");
      Serial.println(resp);
      if (resp.indexOf("OK") != -1) {
        break;
      }
    } else {
      Serial.println("No response, retrying...");
    }
  }

  Serial.println("Checking SIM900A network status...");

  // Check network registration
  sim900.println("AT+CREG?");
  delay(1000);
  printResponse();

  // Check signal quality
  sim900.println("AT+CSQ");
  delay(1000);
  printResponse();

  Serial.println("Sending SMS...");
  sendSMS(phoneNumber, message);
}

void loop() {
  // Nothing here
}

// Function prototype for printResponse
void printResponse();

void sendSMS(const char* number, const char* text) {
  sim900.println("AT");                         // Test AT communication
  delay(1000);
  printResponse();

  sim900.println("AT+CMGF=1");                  // Set SMS text mode
  delay(1000);
  printResponse();

  sim900.print("AT+CMGS=\"");                   // Start SMS command
  sim900.print(number);
  sim900.println("\"");
  delay(1000);
  printResponse();

  sim900.print(text);                           // SMS content
  delay(500);
  sim900.write(26);                             // Ctrl+Z to send
  delay(5000);                                  // Wait for send confirmation
  printResponse();

  Serial.println("SMS command issued.");
}

void printResponse() {
  while (sim900.available()) {
    Serial.write(sim900.read());
  }
}