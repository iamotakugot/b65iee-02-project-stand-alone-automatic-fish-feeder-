# 🌐 **PageKite Setup Guide** - External Access for Fish Feeder

## **📋 Overview:**
PageKite ให้คุณเข้าถึง Pi server จากไหนก็ได้ผ่าน internet โดยไม่ต้อง port forwarding

**Current Setup:** `https://b65iee02.pagekite.me`

---

## **🚀 Quick Setup (5 นาที):**

### **1. Install PageKite on Raspberry Pi:**
```bash
# Install PageKite
pip3 install pagekite

# หรือ download script
wget https://pagekite.net/pk/pagekite.py
chmod +x pagekite.py
```

### **2. Setup PageKite Service:**
```bash
# Create service file
sudo nano /etc/systemd/system/pagekite.service
```

**Content:**
```ini
[Unit]
Description=PageKite Tunnel Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/local/bin/python3 -m pagekite --defaults --service_on=http:localhost:5000:b65iee02.pagekite.me
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### **3. Enable & Start Service:**
```bash
# Enable auto-start
sudo systemctl enable pagekite.service

# Start PageKite
sudo systemctl start pagekite.service

# Check status
sudo systemctl status pagekite.service
```

---

## **🎯 Access URLs:**

### **📡 External Access (PageKite):**
- **Main Dashboard:** `https://b65iee02.pagekite.me`
- **Camera Stream:** `https://b65iee02.pagekite.me/api/camera/stream`
- **Camera Snapshot:** `https://b65iee02.pagekite.me/api/camera/snapshot`
- **API Health:** `https://b65iee02.pagekite.me/api/health`
- **Sensor Data:** `https://b65iee02.pagekite.me/api/sensors`

### **🏠 Local Access (Pi Network):**
- **Main Dashboard:** `http://192.168.1.x:5000`
- **Direct Camera:** `http://192.168.1.x:5000/api/camera/stream`

---

## **📷 Camera Streaming via PageKite:**

### **Web Integration:**
```javascript
// Camera URLs - Auto-detect PageKite vs Local
const getCameraUrls = () => {
  const baseUrl = window.location.hostname.includes('pagekite.me') ? 
    'https://b65iee02.pagekite.me' : 
    'http://localhost:5000';

  return {
    stream: `${baseUrl}/api/camera/stream`,
    snapshot: `${baseUrl}/api/camera/snapshot`
  };
};

// Use in React component
const streamUrl = getCameraUrls().stream;
```

### **Direct Browser Access:**
```html
<!-- MJPEG Stream via PageKite -->
<img src="https://b65iee02.pagekite.me/api/camera/stream" 
     alt="Fish Feeder Camera" 
     style="width: 100%; height: auto;" />
```

---

## **⚖️ Weight Monitoring via PageKite:**

### **API Endpoints:**
```bash
# Get current weight
curl https://b65iee02.pagekite.me/api/control/weight/monitor

# Start auto weighing
curl -X POST https://b65iee02.pagekite.me/api/control/weight/auto-weigh \
  -H "Content-Type: application/json" \
  -d '{"duration": 30, "interval": 1}'

# Weight calibration
curl -X POST https://b65iee02.pagekite.me/api/control/weight/calibrate \
  -H "Content-Type: application/json" \
  -d '{"known_weight": 1000}'

# Tare scale
curl -X POST https://b65iee02.pagekite.me/api/control/weight/tare
```

---

## **🎮 Device Control via PageKite:**

### **Feed Control:**
```bash
# Start feeding
curl -X POST https://b65iee02.pagekite.me/api/feed \
  -H "Content-Type: application/json" \
  -d '{"action": "feed", "amount": 100}'

# LED Control
curl -X POST https://b65iee02.pagekite.me/api/control/relay/led/on

# Fan Control  
curl -X POST https://b65iee02.pagekite.me/api/control/relay/fan/toggle
```

### **Camera Control:**
```bash
# Take photo
curl -X POST https://b65iee02.pagekite.me/api/camera/photo

# Get camera status
curl https://b65iee02.pagekite.me/api/camera/status
```

---

## **🔧 Configuration Options:**

### **Custom PageKite Domain:**
```bash
# Use custom subdomain
python3 -m pagekite --defaults \
  --service_on=http:localhost:5000:your-custom-name.pagekite.me
```

### **Multiple Services:**
```bash
# HTTP + HTTPS + SSH
python3 -m pagekite --defaults \
  --service_on=http:localhost:5000:b65iee02.pagekite.me \
  --service_on=https:localhost:5000:b65iee02.pagekite.me \
  --service_on=ssh:localhost:22:b65iee02.pagekite.me
```

### **Authentication (Optional):**
```bash
# Add basic auth
python3 -m pagekite --defaults \
  --service_on=http:localhost:5000:b65iee02.pagekite.me \
  --http_password=your-password
```

---

## **📊 Monitoring & Logs:**

### **Check PageKite Status:**
```bash
# Service status
sudo systemctl status pagekite

# View logs
sudo journalctl -u pagekite -f

# Check connections
sudo netstat -tulpn | grep 5000
```

### **Performance Monitoring:**
```bash
# Test external access
curl -I https://b65iee02.pagekite.me/api/health

# Test camera streaming
curl -I https://b65iee02.pagekite.me/api/camera/stream

# Speed test
time curl https://b65iee02.pagekite.me/api/sensors
```

---

## **🚨 Troubleshooting:**

### **Connection Issues:**
```bash
# Restart PageKite
sudo systemctl restart pagekite

# Check Pi server is running
sudo systemctl status fish-feeder

# Test local access first
curl http://localhost:5000/api/health
```

### **Camera Stream Issues:**
```bash
# Check camera status
vcgencmd get_camera

# Test camera locally
curl http://localhost:5000/api/camera/status

# Restart camera service
sudo systemctl restart fish-feeder
```

### **Performance Issues:**
```bash
# Check bandwidth
iftop

# Monitor CPU usage
htop

# Check memory
free -h
```

---

## **🔒 Security Notes:**

### **HTTPS Only:**
- PageKite provides automatic HTTPS
- All data encrypted in transit
- No need for SSL certificates

### **Access Control:**
```bash
# Add IP whitelist (optional)
python3 -m pagekite --defaults \
  --service_on=http:localhost:5000:b65iee02.pagekite.me \
  --acl="allow:192.168.1.0/24" \
  --acl="deny:all"
```

### **Firewall Settings:**
```bash
# Allow PageKite connections
sudo ufw allow out 443
sudo ufw allow out 80

# Block direct Pi access (optional)
sudo ufw deny 5000
```

---

## **✅ Verification Checklist:**

- [ ] PageKite service running: `sudo systemctl status pagekite`
- [ ] External access working: `https://b65iee02.pagekite.me`
- [ ] Camera streaming: `https://b65iee02.pagekite.me/api/camera/stream`
- [ ] API responses: `https://b65iee02.pagekite.me/api/health`
- [ ] Weight monitoring: `https://b65iee02.pagekite.me/api/control/weight/monitor`
- [ ] Device control: `https://b65iee02.pagekite.me/api/control/relay/led/toggle`

---

## **🎯 Integration with Web App:**

The React web app automatically detects PageKite access and switches URLs:

```typescript
// Auto-detection in web app
const baseUrl = API_CONFIG.OFFLINE_MODE ? 
  'https://b65iee02.pagekite.me' : // PageKite external
  API_CONFIG.BASE_URL; // Local Pi server

// Camera component uses PageKite automatically
<CameraViewer autoRefresh={true} showControls={true} />

// Weight monitoring via PageKite  
<AutoWeighMonitor onWeightChange={handleWeightChange} />
```

**🎉 PageKite Setup Complete!** 

Your Fish Feeder system is now accessible from anywhere in the world at `https://b65iee02.pagekite.me` 