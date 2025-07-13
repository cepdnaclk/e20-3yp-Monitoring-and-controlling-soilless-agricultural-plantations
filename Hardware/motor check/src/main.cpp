#include <Arduino.h>

#define MOTOR_B_1A 22
#define MOTOR_B_2A 23
#define led 19

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_B_1A, OUTPUT);
  pinMode(MOTOR_B_2A, OUTPUT);
  pinMode(led, OUTPUT);

}

void loop() {
  // Example of controlling the motors
  digitalWrite(MOTOR_B_1A, HIGH);
  digitalWrite(led, HIGH);
  Serial.println("Motor B 1A ON, LED ON");
  Serial.print("MOTOR_B_1A status: ");
  Serial.println(digitalRead(MOTOR_B_1A));
  Serial.print("MOTOR_B_2A status: ");
  Serial.println(digitalRead(MOTOR_B_2A));

  delay(2000);
  digitalWrite(MOTOR_B_1A, LOW);
  digitalWrite(led, LOW);
  Serial.println("Motor B 1A OFF, LED OFF");
  Serial.print("MOTOR_B_1A status: ");
  Serial.println(digitalRead(MOTOR_B_1A));
  Serial.print("MOTOR_B_2A status: ");
  Serial.println(digitalRead(MOTOR_B_2A));
  delay(2000);
}

int main() {
  setup();
  while (true) {
    loop();
  }
}