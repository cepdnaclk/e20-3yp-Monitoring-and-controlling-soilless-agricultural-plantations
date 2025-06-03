// TemperatureSensor.cpp
#include <OneWire.h>
#include <math.h>
#include "temperature_sensor.h"

static OneWire ds(0);  // Placeholder. We'll reinit it inside the function.

float readTemperatureSensor(int sensorPin) {
    ds = OneWire(sensorPin);  // Rebind to correct pin

    byte i, present = 0, type_s;
    byte data[9], addr[8];
    float celsius;

    if (!ds.search(addr)) {
        ds.reset_search();
        delay(250);
        return NAN;
    }

    if (OneWire::crc8(addr, 7) != addr[7]) {
        return NAN;
    }

    switch (addr[0]) {
        case 0x10: type_s = 1; break;
        case 0x28: case 0x22: type_s = 0; break;
        default: return NAN;
    }

    ds.reset();
    ds.select(addr);
    ds.write(0x44, 1);
    delay(1000);

    present = ds.reset();
    ds.select(addr);
    ds.write(0xBE);

    for (i = 0; i < 9; i++) {
        data[i] = ds.read();
    }

    int16_t raw = (data[1] << 8) | data[0];
    if (type_s) {
        raw <<= 3;
        if (data[7] == 0x10) {
            raw = (raw & 0xFFF0) + 12 - data[6];
        }
    } else {
        byte cfg = (data[4] & 0x60);
        if (cfg == 0x00) raw &= ~7;
        else if (cfg == 0x20) raw &= ~3;
        else if (cfg == 0x40) raw &= ~1;
    }

    celsius = (float)raw / 16.0;
    return celsius;
}
