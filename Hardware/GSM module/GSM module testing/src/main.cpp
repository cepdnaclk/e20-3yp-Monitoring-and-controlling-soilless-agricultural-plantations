#include <HardwareSerial.h>

HardwareSerial gsm(1);

const int RXD = 16;
const int TXD = 17;
long bauds[] = {4800, 9600, 19200};

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 3; i++) {
    Serial.print("\nTrying baud rate: ");
    Serial.println(bauds[i]);

    gsm.begin(bauds[i], SERIAL_8N1, RXD, TXD);
    delay(2000);

    gsm.println("AT");
    delay(2000);

    while (gsm.available()) {
      char c = gsm.read();
      Serial.write(c);
    }

    Serial.println("\n------------------------");
  }
}

void loop() {}
