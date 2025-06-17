#ifndef FEEDING_SYSTEM_H
#define FEEDING_SYSTEM_H

#include "config.h"

// ===== FEEDING FUNCTIONS (NO CAMERA!) =====
void initFeedingSystem();
void executeAutomaticFeeding();
void sendFeedingStatus(String status);

// Feeding Steps
void startFeedingSequence();
void stopFeedingSequence();
void openActuator();
void closeActuator();
void runAuger();
void runBlower();

// Feeding Safety
bool checkFeedingConditions();
void emergencyStopFeeding();
void validateFeedingSettings();

// Feeding Status
bool isFeedingInProgress();
unsigned long getFeedingDuration();
String getFeedingStatus();
void updateFeedingProgress();

// Feeding Settings
void setFeedDuration(int seconds);
void setActuatorUpTime(int seconds);
void setActuatorDownTime(int seconds);
void setBlowerDuration(int seconds);

#endif 