#include "menu.h"
#include "sensors.h"
#include "controls.h"

// ===== MENU INITIALIZATION =====
void initMenu() {
  Serial.println("[MENU] Menu system initialized");
}

// ===== MAIN MENU SYSTEM =====
void processSerialInput() {
  inputString.trim();
  int input = inputString.toInt();
  
  if (!inSubMenu) {
    // Main Menu
    switch (input) {
      case 1:
        mainMenu = 1;
        showSensorMenu();
        break;
      case 2:
        mainMenu = 2;
        inSubMenu = true;
        showRelayMenu();
        break;
      case 3:
        mainMenu = 3;
        inSubMenu = true;
        showBlowerMenu();
        break;
      case 4:
        mainMenu = 4;
        inSubMenu = true;
        showAugerMenu();
        break;
      case 5:
        mainMenu = 5;
        inSubMenu = true;
        showActuatorMenu();
        break;
      case 6:
        mainMenu = 6;
        inSubMenu = true;
        showHX711Menu();
        break;
      case 7:
        mainMenu = 7;
        showPinDiagnostic();
        break;
      case 0:
        showMainMenu();
        break;
      default:
        Serial.println("Invalid option. Try again.");
        break;
    }
  } else {
    // Sub Menu
    handleSubMenu(input);
  }
}

void showMainMenu() {
  inSubMenu = false;
  sensorDisplayActive = false;
  Serial.println("\n=== MAIN MENU ===");
  Serial.println("1. Sensors (Display All)");
  Serial.println("2. Relay Control (LED/Fan)");
  Serial.println("3. Blower Control (Ventilation)");
  Serial.println("4. Auger Control (Food Dispenser)");
  Serial.println("5. Actuator Control");
  Serial.println("6. HX711 Load Cell");
  Serial.println("7. Pin Diagnostic");
  Serial.println("0. Refresh Menu");
  Serial.println("Select option (0-7):");
}

void showSensorMenu() {
  Serial.println("\n=== SENSOR DISPLAY ACTIVATED ===");
  Serial.println("Displaying all sensors every 3 seconds...");
  Serial.println("Press 0 to return to main menu");
  sensorDisplayActive = true;
  lastSensorRead = 0; // Force immediate reading
}

void showRelayMenu() {
  Serial.println("\n=== RELAY CONTROL ===");
  Serial.println("1. LED ON");
  Serial.println("2. FAN ON");
  Serial.println("3. LED OFF");
  Serial.println("4. FAN OFF");
  Serial.println("0. Emergency Stop (All OFF)");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current: LED=");
  Serial.print(ledState ? "ON" : "OFF");
  Serial.print(", FAN=");
  Serial.println(fanState ? "ON" : "OFF");
}

void showBlowerMenu() {
  Serial.println("\n=== BLOWER CONTROL ===");
  Serial.println("PWM >= 230 required for motor operation");
  Serial.println("1. Turn OFF fan");
  Serial.println("2. Turn ON fan (PWM 250)");
  Serial.println("3. Manual PWM 230");
  Serial.println("4. Manual PWM 255");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current PWM: ");
  Serial.println(blowerPWM);
}

void showAugerMenu() {
  Serial.println("\n=== AUGER CONTROL ===");
  Serial.println("0. Stop auger");
  Serial.println("1. Run forward (default speed)");
  Serial.println("2. Run backward (default speed)");
  Serial.println("3. Forward 25% speed");
  Serial.println("4. Forward 50% speed");
  Serial.println("5. Forward 75% speed");
  Serial.println("6. Forward 100% speed");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current Speed: ");
  Serial.print(augerSpeed);
  Serial.println("%");
}

void showActuatorMenu() {
  Serial.println("\n=== ACTUATOR CONTROL ===");
  Serial.println("0. Stop actuator");
  Serial.println("1. Extend actuator");
  Serial.println("2. Retract actuator");
  Serial.println("3. Position 25%");
  Serial.println("4. Position 50%");
  Serial.println("5. Position 75%");
  Serial.println("6. Position 100%");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current Position: ");
  Serial.print(actuatorPosition);
  Serial.println("%");
}

void showHX711Menu() {
  Serial.println("\n=== HX711 LOAD CELL ===");
  Serial.println("1. Read Weight Continuously");
  Serial.println("2. Calibrate (Enter weight in kg)");
  Serial.println("3. Tare (Set Zero)");
  Serial.println("4. Reset EEPROM");
  Serial.println("9. Back to Main Menu");
  Serial.print("Scale Factor: ");
  Serial.println(scaleFactor, 6);
}

void handleSubMenu(int input) {
  switch (mainMenu) {
    case 2: // Relay Control
      handleRelayControl(input);
      break;
    case 3: // Blower Control
      handleBlowerControl(input);
      break;
    case 4: // Auger Control
      handleAugerControl(input);
      break;
    case 5: // Actuator Control
      handleActuatorControl(input);
      break;
    case 6: // HX711 Control
      handleHX711Control(input);
      break;
  }
}

void handleRelayControl(int input) {
  switch (input) {
    case 1: // LED ON
      setControl(0, 1);
      Serial.println("Relay IN1 ON (LED Pond Light)");
      break;
    case 2: // FAN ON
      setControl(1, 1);
      Serial.println("Relay IN2 ON (Control Box Fan)");
      break;
    case 3: // LED OFF
      setControl(0, 0);
      Serial.println("Relay IN1 OFF (LED Pond Light)");
      break;
    case 4: // FAN OFF
      setControl(1, 0);
      Serial.println("Relay IN2 OFF (Control Box Fan)");
      break;
    case 0: // Emergency Stop
      setControl(0, 0);
      setControl(1, 0);
      Serial.println("All relays OFF (Emergency Stop)");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("Invalid option");
      break;
  }
  showRelayMenu();
}

void handleBlowerControl(int input) {
  switch (input) {
    case 1: // OFF
      setControl(2, 0);
      Serial.println("Blower stopped");
      break;
    case 2: // ON (PWM 250)
      setControl(2, 250);
      Serial.println("Blower started at PWM 250");
      break;
    case 3: // Manual PWM 230
      setControl(2, 230);
      Serial.println("Blower PWM 230");
      break;
    case 4: // Manual PWM 255
      setControl(2, 255);
      Serial.println("Blower PWM 255");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("Invalid option");
      break;
  }
  showBlowerMenu();
}

void handleAugerControl(int input) {
  switch (input) {
    case 0: // Stop
      setControl(3, 0);
      Serial.println("Auger stopped");
      break;
    case 1: // Forward Default
      setControl(3, 200);
      Serial.println("Auger forward");
      break;
    case 2: // Backward
      setControl(3, -200);
      Serial.println("Auger backward");
      break;
    case 3: // 25%
      setControl(3, 64);
      Serial.println("Auger forward 25% speed (PWM 64)");
      break;
    case 4: // 50%
      setControl(3, 128);
      Serial.println("Auger forward 50% speed (PWM 128)");
      break;
    case 5: // 75%
      setControl(3, 192);
      Serial.println("Auger forward 75% speed (PWM 192)");
      break;
    case 6: // 100%
      setControl(3, 255);
      Serial.println("Auger forward 100% speed (PWM 255)");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("Invalid option");
      break;
  }
  showAugerMenu();
}

void handleActuatorControl(int input) {
  switch (input) {
    case 0: // Stop
      setControl(4, 0);
      Serial.println("Actuator stopped");
      break;
    case 1: // Extend
      setControl(4, 255);
      Serial.println("Actuator extending");
      break;
    case 2: // Retract
      setControl(4, -255);
      Serial.println("Actuator retracting");
      break;
    case 3: // Position 25%
      setControl(4, 64);
      Serial.println("Moving to Position 25%");
      break;
    case 4: // Position 50%
      setControl(4, 128);
      Serial.println("Moving to Position 50%");
      break;
    case 5: // Position 75%
      setControl(4, 192);
      Serial.println("Moving to Position 75%");
      break;
    case 6: // Position 100%
      setControl(4, 255);
      Serial.println("Moving to Position 100%");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("Invalid option");
      break;
  }
  showActuatorMenu();
}

void handleHX711Control(int input) {
  if (input == 9) {
    inSubMenu = false;
    showMainMenu();
    return;
  }
  
  switch (input) {
    case 1: // Read Weight Continuously
      Serial.println("Reading weight continuously... (Press 9 to stop)");
      break;
    case 2: // Calibrate
      Serial.println("Enter known weight in kg (e.g., 2.0):");
      break;
    case 3: // Tare
      tareHX711();
      break;
    case 4: // Reset EEPROM
      {
        scaleFactor = 1.0;
        offset = 0;
        saveHX711Calibration();
        Serial.println("EEPROM Reset - Calibration cleared");
      }
      break;
    default:
      // Check if it's a calibration weight
      float weight = inputString.toFloat();
      if (weight > 0) {
        calibrateHX711(weight);
      } else {
        Serial.println("Invalid option");
      }
      break;
  }
  showHX711Menu();
} 