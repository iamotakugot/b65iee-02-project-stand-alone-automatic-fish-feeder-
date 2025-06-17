#include "feeding_system.h"
#include "controls.h"

// ===== FEEDING SYSTEM INITIALIZATION =====
void initFeedingSystem() {
  Serial.println("[FEED] Feeding system initialized");
}

// ===== AUTOMATIC FEEDING SEQUENCE =====
void executeAutomaticFeeding() {
  if (sys.feeding_in_progress) {
    Serial.println("Feeding already in progress");
    return;
  }
  
  Serial.println("Starting automatic feeding sequence...");
  sys.feeding_in_progress = true;
  sys.feed_start_time = millis();
  
  // Step 1: Start feeding sequence
  sendFeedingStatus("feeding_started");
  
  // Step 2: Open actuator (feed hole)
  sendFeedingStatus("actuator_opening");
  setControl(4, 255); // Actuator up
  delay(sys.actuator_up_sec * 1000);
  setControl(4, 0); // Stop actuator
  
  // Step 3: Run auger (transport food)
  sendFeedingStatus("auger_running");
  setControl(3, 200); // Auger forward
  delay(sys.feed_duration_sec * 1000);
  setControl(3, 0); // Stop auger
  
  // Step 4: Run blower (push food to pond)
  sendFeedingStatus("blower_running");
  setControl(2, 250); // Blower on
  delay(sys.blower_duration_sec * 1000);
  setControl(2, 0); // Stop blower
  
  // Step 5: Close actuator (feed hole)
  sendFeedingStatus("actuator_closing");
  setControl(4, -255); // Actuator down
  delay(sys.actuator_down_sec * 1000);
  setControl(4, 0); // Stop actuator
  
  // Step 6: Complete feeding sequence
  delay(1000); // Extra time for settling
  sendFeedingStatus("completed");
  
  sys.feeding_in_progress = false;
  
  unsigned long feed_duration = millis() - sys.feed_start_time;
  Serial.println("Feeding sequence completed in " + String(feed_duration/1000) + " seconds");
}

// ===== FEEDING STATUS FUNCTIONS =====
void sendFeedingStatus(String status) {
  Serial.println("{\"feeding_status\":\"" + status + "\",\"timestamp\":\"" + String(millis()) + "\"}");
  sys.feeding_status = status;
  sys.data_changed = true;
}

// ===== FEEDING STEPS =====
void startFeedingSequence() {
  if (!sys.feeding_in_progress) {
    executeAutomaticFeeding();
  }
}

void stopFeedingSequence() {
  if (sys.feeding_in_progress) {
    emergencyStop();
    sys.feeding_in_progress = false;
    sys.feeding_status = "stopped";
    Serial.println("Feeding sequence stopped");
  }
}

void openActuator() {
  setControl(4, 255);
  delay(sys.actuator_up_sec * 1000);
  setControl(4, 0);
}

void closeActuator() {
  setControl(4, -255);
  delay(sys.actuator_down_sec * 1000);
  setControl(4, 0);
}

void runAuger() {
  setControl(3, 200);
  delay(sys.feed_duration_sec * 1000);
  setControl(3, 0);
}

void runBlower() {
  setControl(2, 250);
  delay(sys.blower_duration_sec * 1000);
  setControl(2, 0);
}

// ===== FEEDING SAFETY =====
bool checkFeedingConditions() {
  // Check if system is ready for feeding
  if (sys.feeding_in_progress) {
    return false;
  }
  
  // Add more safety checks here if needed
  // e.g., weight threshold, time restrictions, etc.
  
  return true;
}

void emergencyStopFeeding() {
  if (sys.feeding_in_progress) {
    stopFeedingSequence();
    Serial.println("Emergency stop - Feeding halted");
  }
}

void validateFeedingSettings() {
  // Ensure timing settings are within safe ranges
  if (sys.actuator_up_sec < 1) sys.actuator_up_sec = 1;
  if (sys.actuator_up_sec > 10) sys.actuator_up_sec = 10;
  
  if (sys.actuator_down_sec < 1) sys.actuator_down_sec = 1;
  if (sys.actuator_down_sec > 10) sys.actuator_down_sec = 10;
  
  if (sys.feed_duration_sec < 1) sys.feed_duration_sec = 1;
  if (sys.feed_duration_sec > 30) sys.feed_duration_sec = 30;
  
  if (sys.blower_duration_sec < 1) sys.blower_duration_sec = 1;
  if (sys.blower_duration_sec > 30) sys.blower_duration_sec = 30;
}

// ===== FEEDING STATUS GETTERS =====
bool isFeedingInProgress() {
  return sys.feeding_in_progress;
}

unsigned long getFeedingDuration() {
  if (sys.feeding_in_progress) {
    return (millis() - sys.feed_start_time) / 1000;
  }
  return 0;
}

String getFeedingStatus() {
  return sys.feeding_status;
}

void updateFeedingProgress() {
  if (sys.feeding_in_progress) {
    sys.data_changed = true;
  }
}

// ===== FEEDING SETTINGS =====
void setFeedDuration(int seconds) {
  sys.feed_duration_sec = constrain(seconds, 1, 30);
  Serial.println("Feed duration set to: " + String(sys.feed_duration_sec) + "s");
}

void setActuatorUpTime(int seconds) {
  sys.actuator_up_sec = constrain(seconds, 1, 10);
  Serial.println("Actuator up time set to: " + String(sys.actuator_up_sec) + "s");
}

void setActuatorDownTime(int seconds) {
  sys.actuator_down_sec = constrain(seconds, 1, 10);
  Serial.println("Actuator down time set to: " + String(sys.actuator_down_sec) + "s");
}

void setBlowerDuration(int seconds) {
  sys.blower_duration_sec = constrain(seconds, 1, 30);
  Serial.println("Blower duration set to: " + String(sys.blower_duration_sec) + "s");
} 