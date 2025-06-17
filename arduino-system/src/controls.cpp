#include "controls.h"

// ===== CONTROL INITIALIZATION =====
void initControls() {
  // Pin setup
  pinMode(LED_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(BLOWER_RPWM_PIN, OUTPUT);
  pinMode(BLOWER_LPWM_PIN, OUTPUT);
  pinMode(AUGER_ENA_PIN, OUTPUT);
  pinMode(AUGER_IN1_PIN, OUTPUT);
  pinMode(AUGER_IN2_PIN, OUTPUT);
  pinMode(ACTUATOR_ENA_PIN, OUTPUT);
  pinMode(ACTUATOR_IN1_PIN, OUTPUT);
  pinMode(ACTUATOR_IN2_PIN, OUTPUT);
  
  // Default states (Active Low for relays)
  digitalWrite(LED_RELAY_PIN, HIGH);  // OFF
  digitalWrite(FAN_RELAY_PIN, HIGH);  // OFF
  analogWrite(BLOWER_RPWM_PIN, 0);
  digitalWrite(BLOWER_LPWM_PIN, LOW);
  analogWrite(AUGER_ENA_PIN, 0);
  digitalWrite(AUGER_IN1_PIN, LOW);
  digitalWrite(AUGER_IN2_PIN, LOW);
  analogWrite(ACTUATOR_ENA_PIN, 0);
  digitalWrite(ACTUATOR_IN1_PIN, LOW);
  digitalWrite(ACTUATOR_IN2_PIN, LOW);
  
  Serial.println("[CONTROLS] All control pins initialized");
}

// ===== MAIN CONTROL FUNCTION =====
void setControl(int type, int value) {
  safePrint("[TOOL] setControl called: type=" + String(type) + ", value=" + String(value));
  
  switch(type) {
    case 0: // LED
      setLED(value);
      break;
    case 1: // Fan
      setFan(value);
      break;
    case 2: // Blower
      setBlower(value);
      break;
    case 3: // Auger
      setAuger(value);
      break;
    case 4: // Actuator
      setActuator(value);
      break;
    default:
      safePrint("[ERROR] Unknown control type: " + String(type));
      return;
  }
  
  sys.data_changed = true;
  safePrint("[OK] Control executed successfully");
}

// ===== RELAY CONTROL FUNCTIONS =====
void setLED(bool state) {
  sys.relay_led_pond = state;
  ledState = state;
  setRelay(LED_RELAY_PIN, state);
  safePrint("[LED] LED Pin " + String(LED_RELAY_PIN) + " set to " + String(state ? "ON" : "OFF"));
}

void setFan(bool state) {
  sys.relay_fan_box = state;
  fanState = state;
  setRelay(FAN_RELAY_PIN, state);
  safePrint("[FAN] Fan Pin " + String(FAN_RELAY_PIN) + " set to " + String(state ? "ON" : "OFF"));
}

void setRelay(int pin, bool state) {
  // Active Low for relays
  digitalWrite(pin, state ? LOW : HIGH);
}

// ===== MOTOR CONTROL FUNCTIONS =====
void setBlower(int pwm) {
  sys.motor_blower_pwm = constrain(pwm, 0, 255);
  
  if (pwm == 0) {
    // CRITICAL: Force stop blower completely
    analogWrite(BLOWER_RPWM_PIN, 0);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
    blowerPWM = 0;  // Update state variable immediately
    safePrint("[BLOWER] Blower STOPPED - PWM=0, RPWM=0");
  } else {
    // CRITICAL FIX: Minimum PWM for blower to start (most blowers need >120)
    int actualPWM = max(pwm, 150);  // Minimum 150 PWM for blower
    analogWrite(BLOWER_RPWM_PIN, actualPWM);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
    blowerPWM = actualPWM;  // Use actual PWM value
    safePrint("[BLOWER] Blower PWM=" + String(actualPWM) + " (req:" + String(pwm) + "), Pin" + String(BLOWER_RPWM_PIN));
  }
  
  // CRITICAL FIX: Ensure system state matches hardware immediately
  sys.motor_blower_pwm = pwm;
}

void setAuger(int pwm) {
  sys.motor_auger_pwm = constrain(pwm, -255, 255);
  
  if (pwm == 0) {
    // CRITICAL: Force stop auger completely
    analogWrite(AUGER_ENA_PIN, 0);
    digitalWrite(AUGER_IN1_PIN, LOW);
    digitalWrite(AUGER_IN2_PIN, LOW);
    augerSpeed = 0;  // Update state variable immediately
    safePrint("[AUGER] Auger STOPPED - PWM=0, ENA=0");
  } else if (pwm > 0) {
    // CRITICAL FIX: Minimum PWM for motor to start (most motors need >150)
    int actualPWM = max(abs(pwm), 180);  // Minimum 180 PWM
    digitalWrite(AUGER_IN1_PIN, HIGH);
    digitalWrite(AUGER_IN2_PIN, LOW);
    analogWrite(AUGER_ENA_PIN, actualPWM);
    augerSpeed = actualPWM;  // Use actual PWM value
    safePrint("[AUGER] Auger PWM=" + String(actualPWM) + " (req:" + String(pwm) + "), Dir=FWD, Pin" + String(AUGER_ENA_PIN));
  } else if (pwm < 0) {
    // CRITICAL FIX: Minimum PWM for motor to start
    int actualPWM = max(abs(pwm), 180);  // Minimum 180 PWM
    digitalWrite(AUGER_IN1_PIN, LOW);
    digitalWrite(AUGER_IN2_PIN, HIGH);
    analogWrite(AUGER_ENA_PIN, actualPWM);
    augerSpeed = actualPWM;  // Use actual PWM value
    safePrint("[AUGER] Auger PWM=" + String(actualPWM) + " (req:" + String(abs(pwm)) + "), Dir=REV, Pin" + String(AUGER_ENA_PIN));
  }
  
  // CRITICAL FIX: Ensure system state matches hardware immediately
  sys.motor_auger_pwm = pwm;
}

void setActuator(int pwm) {
  sys.motor_actuator_pwm = constrain(pwm, -255, 255);
  
  if (pwm == 0) {
    // CRITICAL: Force stop actuator completely
    analogWrite(ACTUATOR_ENA_PIN, 0);
    digitalWrite(ACTUATOR_IN1_PIN, LOW);
    digitalWrite(ACTUATOR_IN2_PIN, LOW);
    actuatorPosition = 0;  // Reset position when stopped
    safePrint("[ACTUATOR] Actuator STOPPED - PWM=0, ENA=0");
  } else if (pwm > 0) {
    // CRITICAL FIX: Minimum PWM for actuator to move (most actuators need >160)
    int actualPWM = max(abs(pwm), 180);  // Minimum 180 PWM
    digitalWrite(ACTUATOR_IN1_PIN, HIGH);
    digitalWrite(ACTUATOR_IN2_PIN, LOW);
    analogWrite(ACTUATOR_ENA_PIN, actualPWM);
    actuatorPosition = map(actualPWM, 0, 255, 0, 100);  // Use actual PWM for position
    safePrint("[ACTUATOR] Actuator PWM=" + String(actualPWM) + " (req:" + String(pwm) + "), Dir=UP, Pos=" + String(actuatorPosition) + "%, Pin" + String(ACTUATOR_ENA_PIN));
  } else if (pwm < 0) {
    // CRITICAL FIX: Minimum PWM for actuator to move
    int actualPWM = max(abs(pwm), 180);  // Minimum 180 PWM
    digitalWrite(ACTUATOR_IN1_PIN, LOW);
    digitalWrite(ACTUATOR_IN2_PIN, HIGH);
    analogWrite(ACTUATOR_ENA_PIN, actualPWM);
    actuatorPosition = map(actualPWM, 0, 255, 0, 100);  // Use actual PWM for position
    safePrint("[ACTUATOR] Actuator PWM=" + String(actualPWM) + " (req:" + String(abs(pwm)) + "), Dir=DOWN, Pos=" + String(actuatorPosition) + "%, Pin" + String(ACTUATOR_ENA_PIN));
  }
  
  // CRITICAL FIX: Ensure system state matches hardware immediately
  sys.motor_actuator_pwm = pwm;
}

// ===== EMERGENCY FUNCTIONS =====
void emergencyStop() {
  safePrint("[EMERGENCY] EMERGENCY STOP INITIATED!");
  
  // Stop all motors first (highest priority)
  stopAllMotors();
  
  // Turn off all relays
  setLED(false);
  setFan(false);
  
  // Force all system states to safe values
  sys.motor_blower_pwm = 0;
  sys.motor_auger_pwm = 0;
  sys.motor_actuator_pwm = 0;
  sys.relay_led_pond = false;
  sys.relay_fan_box = false;
  
  // Mark data as changed for immediate status update
  sys.data_changed = true;
  
  safePrint("[EMERGENCY] Emergency stop completed - All systems OFF and SAFE");
}

void stopAllMotors() {
  safePrint("[EMERGENCY] Stopping all motors...");
  
  // Stop motors in safe order: Auger first (food safety), then Actuator, then Blower
  setAuger(0);
  setActuator(0); 
  setBlower(0);
  
  // Verify all motor pins are LOW (hardware safety check)
  analogWrite(AUGER_ENA_PIN, 0);
  analogWrite(ACTUATOR_ENA_PIN, 0);
  analogWrite(BLOWER_RPWM_PIN, 0);
  
  digitalWrite(AUGER_IN1_PIN, LOW);
  digitalWrite(AUGER_IN2_PIN, LOW);
  digitalWrite(ACTUATOR_IN1_PIN, LOW);
  digitalWrite(ACTUATOR_IN2_PIN, LOW);
  digitalWrite(BLOWER_LPWM_PIN, LOW);
  
  safePrint("[EMERGENCY] All motors stopped and pins verified LOW");
}

// ===== PERFORMANCE MODE FUNCTIONS =====
void setPerformanceMode(String mode) {
  if (mode == "REAL_TIME") {
    config.send_interval = 500;   // 0.5s - Very fast for feeding
    config.read_interval = 250;   // 0.25s
  } else if (mode == "FAST") {
    config.send_interval = 1000;  // 1s - Fast for debugging
    config.read_interval = 500;   // 0.5s
  } else if (mode == "NORMAL") {
    config.send_interval = 2000;  // 2s - Normal operation
    config.read_interval = 1000;  // 1s
  } else if (mode == "POWER_SAVE") {
    config.send_interval = 5000;  // 5s - Save battery
    config.read_interval = 2000;  // 2s
  }
  config.performance_mode = mode;
  safePrint("[CONFIG] Performance mode: " + mode + " (Send:" + String(config.send_interval) + "ms, Read:" + String(config.read_interval) + "ms)");
  sys.data_changed = true;
}

// ===== SAFE PRINT FUNCTION =====
void safePrint(String message) {
  if (config.pi_mode) {
    // Remove emoji for Pi communication - แก้ปัญหา JSON corruption
    String cleanMsg = message;
    // Remove common emoji
    cleanMsg.replace("🔧", "[TOOL]");
    cleanMsg.replace("💡", "[LED]");
    cleanMsg.replace("🌀", "[FAN]");
    cleanMsg.replace("💨", "[BLOWER]");
    cleanMsg.replace("🥄", "[AUGER]");
    cleanMsg.replace("⚠️", "[WARNING]");
    cleanMsg.replace("✅", "[OK]");
    cleanMsg.replace("❌", "[ERROR]");
    cleanMsg.replace("📊", "[STATUS]");
    cleanMsg.replace("📡", "[SEND]");
    cleanMsg.replace("⬆️", "[UP]");
    cleanMsg.replace("⬇️", "[DOWN]");
    cleanMsg.replace("🍽️", "[FEED]");
    cleanMsg.replace("⚙️", "[CONFIG]");
    Serial.println(cleanMsg);
  } else {
    Serial.println(message);
  }
}

// ===== STATE GETTER FUNCTIONS =====
bool getLEDState() {
  return ledState;
}

bool getFanState() {
  return fanState;
}

int getBlowerPWM() {
  return blowerPWM;
}

int getAugerSpeed() {
  return augerSpeed;
}

int getActuatorPosition() {
  return actuatorPosition;
}

// ===== MEMORY MONITOR =====
int getFreeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
} 