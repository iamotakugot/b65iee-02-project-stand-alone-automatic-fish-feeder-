# AI Execution Instructions for Fish Feeder IoT System

## Objective

You are tasked to read, analyze, and finalize a production-grade standalone fish feeder IoT system. This is not a test or prototype. You must:

* Read **all files** and **every line of code** under:

  * `fish-feeder-arduino/`
  * `pi-mqtt-server/`
  * `fish-feeder-web/`
* Do not make assumptions. Do not generate placeholder code.
* Do not create new files unless explicitly instructed.
* Do not restructure files arbitrarily.
* Do not insert emojis into code or comments. It causes issues in rendering and parsing.

> ❗ **Do NOT read, analyze, parse, or modify `config-secrets.md`.** This file contains sensitive credentials and must only be handled manually by the user.

---

## Scope of Work

### 1. Code Understanding and Cleanup

* Parse and understand the complete logic flow of each module.
* Identify and remove:

  * Mock files or dummy scripts
  * Unused or test functions
  * Comments or code blocks that have been disabled for over 7 days
* Ensure all Firebase paths used are actually referenced by the Web App, Pi, and Arduino.

### 2. Entry Points

* `main_fixed.py` is the **only** valid entrypoint for the Pi Server.
* All logic must execute from there. Do not create new scripts for startup or testing.

### 3. Firebase

* Confirm all commands from Firestore are received and processed properly by Pi and sent to Arduino.
* Confirm all sensor data is pushed to the correct Firebase Realtime Database paths.
* Validate Firebase structure:

  * Realtime DB → `/fish_feeder/sensors/...`
  * Firestore → `/commands`, `/calibration/hx711`, `/camera_control`, `/logs/feed_logs/{timestamp}`
* Never use mock data. Only use actual sensor and command data in production flow.

### 4. Arduino

* Upload the firmware from `fish-feeder-arduino` using PlatformIO or Arduino IDE.
* Ensure it:

  * Sends sensor data via Serial as JSON every 3 seconds
  * Accepts Serial commands for motor, relay, camera, HX711
  * Stores HX711 calibration in EEPROM
  * Resumes correctly on restart using EEPROM values

### 5. Deployments

* Web App:

  * Build and deploy using `npm run build` and `firebase deploy` from `fish-feeder-web`
* Pi Server:

  * Run `main_fixed.py`
  * Ensure it's enabled as a systemd service (`fish-feeder.service`)
* Arduino:

  * Upload firmware using `pio run --target upload` or the Arduino IDE

### 6. Functional Verification

* Sensor readings must appear in the Web App in real-time (from RTDB)
* Web controls (feed, fan, blower, weight calibrate) must propagate to Pi → Arduino correctly
* HX711 calibration and tare must work through Firestore
* Camera snapshot or recording must trigger via Firestore and save results locally and/or upload to Drive
* Feed logs must be recorded in Firestore with timestamp and media paths
* Do not use mock sensors. All sensors must connect and report actual values from hardware.

### 7. Final Restrictions

* No emoji in any source code, comments, logs, or filenames
* No unnecessary code splitting or abstraction
* No creation of `test`, `temp`, or `mock` directories
* No external dependencies unless already used in the current system

---

## Result

When completed, the system must be:

* Fully bootable on power-up
* Executing `main_fixed.py` without errors
* Delivering real-time data to the Web App
* Executing commands with no delay or failure
* Logging and camera features must work on-demand
* Must operate solely with real sensor and actuator data (no emulation or placeholder logic)

This is a production system. Do not treat it as a prototype.

---

## Extension: Config & Secrets Management

If any API Key, camera secret, or Firebase credential is required, do not generate or hardcode it.

Create a file called `config-secrets.md` inside the project root (same level as `fish-feeder-web`, `pi-mqtt-server`, etc).

Wait for the user to manually fill in credentials before proceeding with deployment, Firebase connection, or Google Drive integration.

### Sample Format of `config-secrets.md`

```ini
FIREBASE_API_KEY=your_api_key_here
FIREBASE_PROJECT_ID=your_project_id_here
DRIVE_CLIENT_SECRET=xxxxxx
CAMERA_STREAM_URL=https://your-stream-url.pagekite.me
```

> ❗ This file must only be handled by the user. **Never read, parse, or access this file using AI or automated processes.**

---

## Extension: Local Data Storage on Raspberry Pi

The system must maintain a local database or flat-file log system on Raspberry Pi to store:

* Sensor history (timestamped JSON or CSV)
* Feeding history (time, amount, trigger method)
* Snapshot/video metadata (filename, time, feed ref)

This ensures that data remains available even when Firebase is unreachable or Internet connection is down.

Location recommendation: `/home/pi/fish-feeder-logs/` Format: JSON, CSV, or SQLite (depending on implementation)

The Web App or Pi script must synchronize with local storage before or after any Firebase push, and support history recovery if Firebase fails.

---

## Version Lock: v1.0-final

This document, system structure, and logic flow are officially locked as **version 1.0-final**.

* No modification of functional flow is allowed in this version.
* No code splitting, abstraction, or restructuring is permitted.
* No new modules or mock systems should be introduced.
* Any future enhancements must start from a new version branch (e.g., v1.1 or v2.0).

This version is declared stable, field-ready, and production-grade. It may now be deployed globally.
