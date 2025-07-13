#include <HardwareSerial.h>

HardwearSerial GSM(1); // Assuming GSM is connected to Serial1

void setup(){
    Serial.begin(115200);
    GSM.begin(9600,SERIAL_8N1,16,17);

    Serial.println("Initializing...");
    delay(1000);

    GSM.println("AT"); // Check GSM module
    delay(1000);

    GSM.println("AT+CMGF=1"); // Set SMS text mode
    delay(1000);

    GSM.println("AT+CMGS=\"+94719154938\""); // Recipient number
    delay(1000);

    GSM.print("Hello from ESP32 via GSM!"); // Message body
    delay(500);

    GSM.write(26); // CTRL+Z to send SMS

}
void loop() {
  while (GSM.available()) {
    Serial.write(GSM.read()); // Print GSM responses to Serial Monitor
  }
}