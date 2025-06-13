# 🧭 fish-feeder-deployment-instructions.md (v1.0-final)

> ❗ **Do NOT read, analyze, parse, or modify `config-secrets.md`.** This file contains sensitive credentials and must only be handled manually by the user.

---

## 🔑 Credentials (to be filled by user)

```
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_STORAGE_BUCKET=
DRIVE_CLIENT_SECRET=
CAMERA_STREAM_URL=
```

---

## 🔁 Mapping: Web UI → Firestore → Pi → Arduino

See also: `chatgpt4o/Chatgpt4o-ui-mapping.md`

| UI Element (Page)           | Firestore Path                | Payload Example / Description                      |
| --------------------------- | ----------------------------- | -------------------------------------------------- |
| Feed Now (FeedControl)      | `/commands/feed`              | `{ "action": "start", "duration": 3 }` → run auger |
| Fan ON/OFF (FanTempCtrl)    | `/commands/fan`               | `{ "state": true }` or `{ "state": false }`        |
| Blower ON/OFF (FanTempCtrl) | `/commands/blower`            | `{ "state": true }` or `{ "state": false }`        |
| Calibrate Weight (Settings) | `/calibration/hx711`          | `{ "command": "calibrate", "ref_weight": 500 }`    |
| Tare (Reset Weight)         | `/calibration/hx711`          | `{ "command": "tare" }`                            |
| Set Camera Resolution       | `/camera_control`             | `{ "resolution": "640x480", "fps": 15 }`           |
| Record Video                | `/camera_control`             | `{ "action": "record", "duration": 10 }`           |
| Snapshot                    | `/camera_control`             | `{ "action": "snapshot" }`                         |
| View Log                    | `/logs/feed_logs/{timestamp}` | Pi stores video metadata + sensor at feed time     |
| Enable Alerts (Settings)    | `/alerts/enable`              | `{ "overheat": true, "low_food": true }`           |
| Manual Log Entry            | `/logs/manual`                | `{ "note": "Adjusted auger manually" }`            |

---

## 📁 Reference Folder Structure

```
/b65iee-02-project-stand-alone-automatic-fish-feeder
├── fish-feeder-web               # Web frontend (React)
├── pi-mqtt-server                # Pi backend (Python Flask)
├── fish-feeder-arduino          # Arduino firmware
├── flie-arduino-test-sensor-pass# Reference/test sensor code
└── chatgpt4o                     # For ChatGPT-4o logic & instructions
```

---

## 📘 System Execution & Scope Summary (AI Instruction)

* Read **all files** and **every line of code** under:

  * `fish-feeder-arduino/`
  * `pi-mqtt-server/`
  * `fish-feeder-web/`

* Do not make assumptions. Do not generate placeholder code.

* Do not restructure files or create new ones unless explicitly instructed.

* Do not insert emojis into code or comments.

### 🔧 Execution Entry Point

* `main_fixed.py` is the **only** valid entrypoint for the Pi Server.

### 🔥 Firebase Structure

* Realtime DB → `/fish_feeder/sensors/...`
* Firestore → `/commands`, `/calibration/hx711`, `/camera_control`, `/logs/feed_logs/{timestamp}`, `/alerts/...`, `/logs/manual`

### 🔌 Arduino

* Sends sensor data via Serial as JSON every 3 seconds
* Accepts Serial commands
* Stores HX711 calibration in EEPROM
* Resumes using EEPROM on restart

### 📦 Deployments

* Web: `npm run build` + `firebase deploy`
* Pi: Run `main_fixed.py`, enabled as systemd `fish-feeder.service`
* Arduino: Upload firmware via `pio run --target upload` or Arduino IDE

### ✅ Functional Verification

* Real-time sensor → Web
* Web controls → Pi → Arduino
* HX711 calibrate/tare via Firestore
* Camera snapshot/video via Firestore
* Log feed metadata in Firestore
* Alert toggle reflects backend config
* Manual logs are preserved
* No mock sensors — real hardware only

---

## 🧠 Local Data Resilience

* Save to: `/home/pi/fish-feeder-logs/`
* Format: JSON, CSV, or SQLite
* Store: sensor data, feed logs, camera metadata
* Sync local logs before/after Firebase push

---

## 🔒 Version Lock: v1.0-final

* No structural or logic changes allowed
* No mock/test code allowed
* All future updates go to `v1.1`, `v2.0`, etc.
* This version is stable and production-grade

🔐 AI must never read actual secret values. Only use this file to confirm which keys or structur
