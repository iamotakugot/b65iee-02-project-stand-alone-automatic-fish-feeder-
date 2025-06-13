/*
Arduino Communication Test Script
=================================
Test all acknowledgment responses and heartbeat system

Upload this to Arduino and test through Serial Monitor
Baud Rate: 115200
*/

void setup() {
  Serial.begin(115200);
  Serial.println(F("Arduino Communication Test"));
  Serial.println(F("=========================="));
  Serial.println(F("Send these commands to test:"));
  Serial.println(F("PING"));
  Serial.println(F("TEST_CONNECTION"));
  Serial.println(F("HEARTBEAT:1"));
  Serial.println(F("R:1"));
  Serial.println(F("G:1"));
  Serial.println(F("B:1"));
  Serial.println(F("A:1"));
  Serial.println(F("FEED:100"));
  Serial.println(F("INVALID_TEST"));
  Serial.println(F(""));
  Serial.println(F("Expected format: [RECV] command → [ACK/NAK] response"));
  Serial.println(F("Ready for commands..."));
}

void loop() {
  // Test heartbeat every 10 seconds for demo
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat >= 10000) {
    Serial.print(F("[HEARTBEAT] ALIVE_"));
    Serial.print(millis());
    Serial.print(F(" UPTIME_"));
    Serial.print(millis() / 1000);
    Serial.println(F("s MEMORY_OK"));
    lastHeartbeat = millis();
  }
  
  // Handle serial commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    // Show received command
    Serial.print(F("[RECV] "));
    Serial.println(cmd);
    
    // Test acknowledgments
    if (cmd == "PING") {
      Serial.println(F("[ACK] PING PONG"));
    } else if (cmd == "TEST_CONNECTION") {
      Serial.println(F("[ACK] TEST_CONNECTION ARDUINO_READY"));
    } else if (cmd == "HEARTBEAT:1") {
      Serial.println(F("[ACK] HEARTBEAT:1 HEARTBEAT_ENABLED"));
    } else if (cmd == "R:1") {
      Serial.println(F("[ACK] R:1 FAN_ON"));
    } else if (cmd == "G:1") {
      Serial.println(F("[ACK] G:1 AUGER_FORWARD_80%"));
    } else if (cmd == "B:1") {
      Serial.println(F("[ACK] B:1 BLOWER_ON"));
    } else if (cmd == "A:1") {
      Serial.println(F("[ACK] A:1 ACTUATOR_OPEN"));
    } else if (cmd.startsWith("FEED:")) {
      Serial.print(F("[ACK] FEED:"));
      Serial.print(cmd.substring(5));
      Serial.println(F(" FEED_STARTED"));
    } else {
      Serial.print(F("[NAK] UNKNOWN_CMD: "));
      Serial.println(cmd);
    }
  }
} 