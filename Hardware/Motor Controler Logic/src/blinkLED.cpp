#include "blinkLED.h"
#include <Arduino.h>

void blinkLED(int pin, int duration)
{
  digitalWrite(pin, HIGH);
  delay(duration);
  digitalWrite(pin, LOW);
}
