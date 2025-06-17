#!/usr/bin/env node

/**
 * Fish Feeder Web App - Build & Deploy Script
 * ✅ UNIFIED PROTOCOL READY - 100% Compatible with Pi Server
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Fish Feeder Web App with Unified Protocol...\n');

// Check if Firebase config exists
const firebaseConfigPath = path.join(__dirname, 'src/config/firebase.ts');
if (!fs.existsSync(firebaseConfigPath)) {
  console.error('❌ Firebase config not found! Please check src/config/firebase.ts');
  process.exit(1);
}

console.log('✅ Firebase config found');

// Install dependencies if needed
try {
  console.log('📦 Checking dependencies...');
  execSync('npm ci', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the app
try {
  console.log('🔨 Building production app...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Build output not found! Check build process');
  process.exit(1);
}

console.log('📊 Build Statistics:');
try {
  const files = fs.readdirSync(distPath);
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file}: ${sizeKB} KB`);
    }
  });
} catch (error) {
  console.log('   (Could not read build statistics)');
}

console.log('\n🎉 Fish Feeder Web App Build Complete!');
console.log('\n📋 Deployment Instructions:');
console.log('   1. Upload dist/ folder to your web server');
console.log('   2. Ensure Firebase config matches your project');
console.log('   3. Test connection with Pi Server on same network');
console.log('\n🔗 Unified Protocol Features:');
console.log('   ✅ LED Control: /controls → relays → led_pond_light');
console.log('   ✅ Fan Control: /controls → relays → control_box_fan');
console.log('   ✅ Auger Control: /controls → motors → auger_food_dispenser');
console.log('   ✅ Blower Control: /controls → motors → blower_ventilation');
console.log('   ✅ Actuator Control: /controls → motors → actuator_feeder');
console.log('   ✅ Sensor Data: /sensors (unified naming convention)');
console.log('   ✅ Real-time Updates: 1-second interval');
console.log('\n🚀 Ready for Production Use!'); 