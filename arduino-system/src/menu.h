#ifndef MENU_H
#define MENU_H

#include "config.h"

// ===== MENU SYSTEM =====
void initMenu();
void processSerialInput();
void showMainMenu();
void showSensorMenu();
void showRelayMenu();
void showBlowerMenu();
void showAugerMenu();
void showActuatorMenu();
void showHX711Menu();

// ===== SUB MENU HANDLERS =====
void handleSubMenu(int input);
void handleRelayControl(int input);
void handleBlowerControl(int input);
void handleAugerControl(int input);
void handleActuatorControl(int input);
void handleHX711Control(int input);

// Menu Utilities
void activateSensorDisplay();
void deactivateSensorDisplay();
bool isSensorDisplayActive();

// Memory Functions
int getFreeMemory();

#endif 