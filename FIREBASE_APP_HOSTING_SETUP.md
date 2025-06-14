# 🚀 Firebase App Hosting Setup Guide

## 📋 ปัญหาที่พบและการแก้ไข

### **❌ ปัญหาเดิม**:
```
App root directory: D:\b65iee-02-project-stand-alone-automatic-fish-feeder\fish-feeder-web
Error: Invalid root directory
```

### **✅ การแก้ไขที่ถูกต้อง**:
```
App root directory: fish-feeder-web
```

---

## 🔧 การตั้งค่า Firebase App Hosting

### **1. 📂 Repository Settings**:
```yaml
Repository URL: https://github.com/iamotakugot/b65iee-02-project-stand-alone-automatic-fish-feeder
Branch: master
```

### **2. 🛠️ Build Configuration**:
```yaml
App root directory: fish-feeder-web
Build command: npm run build
Output directory: dist
Node.js version: 18
Install command: npm install --legacy-peer-deps
```

### **3. 🌍 Environment Variables** (ถ้าจำเป็น):
```yaml
NODE_ENV: production
VITE_FIREBASE_API_KEY: [your-api-key]
VITE_FIREBASE_PROJECT_ID: b65iee-02-fishfeederstandalone
```

---

## 📋 Step-by-Step Setup

### **Step 1: เข้าสู่ Firebase Console**
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจค: `b65iee-02-fishfeederstandalone`
3. ไปที่ **App Hosting** ในเมนูซ้าย

### **Step 2: แก้ไข Settings**
1. คลิก **Settings** หรือ **Configure**
2. แก้ไข **App root directory**:
   ```
   ❌ ผิด: D:\b65iee-02-project-stand-alone-automatic-fish-feeder\fish-feeder-web
   ✅ ถูก: fish-feeder-web
   ```
3. ตรวจสอบการตั้งค่าอื่นๆ:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Node.js version**: `18`

### **Step 3: บันทึกและ Deploy**
1. คลิก **Save** เพื่อบันทึกการตั้งค่า
2. คลิก **Create Rollout** เพื่อสร้าง deployment ใหม่
3. เลือก **Branch**: `master`
4. คลิก **Deploy**

### **Step 4: ตรวจสอบ Deployment**
1. รอให้ build เสร็จ (ประมาณ 3-5 นาที)
2. ตรวจสอบ URL:
   ```
   https://b65iee-02-fishfeederstandalone--b65iee-02-fishfeederstandalone.asia-east1.hosted.app
   ```

---

## 🔍 การตรวจสอบ Build ใน Local

### **ติดตั้ง Dependencies**:
```bash
cd fish-feeder-web
npm install --legacy-peer-deps
```

### **ทดสอบ Build**:
```bash
npm run build
```

### **ผลลัพธ์ที่คาดหวัง**:
```
✓ built in 5.21s
dist/index.html                   1.53 kB
dist/assets/index-BpA3p4Sg.js   301.59 kB
... (ไฟล์อื่นๆ)
```

---

## 📁 โครงสร้างโปรเจค

```
b65iee-02-project-stand-alone-automatic-fish-feeder/
├── fish-feeder-web/              ← App root directory
│   ├── src/
│   ├── public/
│   ├── dist/                     ← Output directory
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── pi-mqtt-server/
├── fish-feeder-arduino/
└── ...
```

---

## ⚙️ Build Configuration Details

### **package.json Scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### **vite.config.ts**:
```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    minify: 'esbuild',
    target: 'esnext',
  },
});
```

---

## 🚨 Common Issues และการแก้ไข

### **1. Invalid root directory**:
```
❌ ปัญหา: ใส่ absolute path (D:\...)
✅ แก้ไข: ใช้ relative path (fish-feeder-web)
```

### **2. Build Failed - Dependencies**:
```bash
# แก้ไข peer dependency conflicts
npm install --legacy-peer-deps
```

### **3. Build Failed - TypeScript Errors**:
```typescript
// vite.config.ts มี rollupOptions ที่ ignore warnings แล้ว
rollupOptions: {
  onwarn(warning, warn) {
    if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
    warn(warning);
  }
}
```

### **4. Firebase Config Issues**:
```typescript
// ตรวจสอบ firebase config ใน src/config/firebase.ts
const firebaseConfig = {
  projectId: "b65iee-02-fishfeederstandalone",
  // ... other config
};
```

---

## 🎯 Expected Results

### **Build Success**:
```
✓ 2101 modules transformed.
✓ built in 5.21s
```

### **Deployment Success**:
```
🚀 Deployment completed successfully
📱 App URL: https://b65iee-02-fishfeederstandalone--b65iee-02-fishfeederstandalone.asia-east1.hosted.app
```

### **App Features**:
- ✅ Fish Feeder Control Panel
- ✅ Real-time Sensor Data
- ✅ Motor & Relay Controls
- ✅ Analytics Dashboard
- ✅ Settings Management

---

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ **App root directory** = `fish-feeder-web`
2. ตรวจสอบ **Build command** = `npm run build`
3. ตรวจสอบ **Output directory** = `dist`
4. ลองทำ **Create Rollout** ใหม่

**🎉 เมื่อตั้งค่าถูกต้องแล้ว ระบบจะ deploy สำเร็จและพร้อมใช้งาน!** 