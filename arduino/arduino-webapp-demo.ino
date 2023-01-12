#include <OneWire.h>
#include <DallasTemperature.h>
#include <LiquidCrystal.h>
#include <CommandHandler.h>

#define ONE_WIRE_BUS 10

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

CommandHandler<> SerialCommandHandler(Serial, '#', '^');

// Addresses of DS18B20s
uint8_t sensor[8] = { 0x28, 0x48, 0x8D, 0x65, 0x05, 0x00, 0x00, 0xC9 };

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

uint32_t msDelay = 1000;
static unsigned long updateTime = 0;

void setup(void) {
  Serial.begin(9600);
  sensors.begin();
  analogWrite(6, 60);// Kontrast LCD
  lcd.begin(16, 2);
  lcd.print("Setup...");
  SerialCommandHandler.AddVariable(F("msdelay"), msDelay);
  delay(1000);
}

void loop(void) {
  SerialCommandHandler.Process();
  if (millis() - updateTime > msDelay) {
    sensors.requestTemperatures();
    float tempC = sensors.getTempC(sensor);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("Temp.: "));
    lcd.print(tempC);
    lcd.print(" C");
    lcd.setCursor(0, 1);
    lcd.print(F("Delay: "));
    lcd.print(msDelay);
    lcd.print(" ms");

    Serial.print('(');
    Serial.print("temp");
    Serial.print(';');
    Serial.print(tempC);
    Serial.print(')');

//    Serial.println(tempC);  
    updateTime = millis();
  }
}
