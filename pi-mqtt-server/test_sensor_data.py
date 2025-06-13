#!/usr/bin/env python3
"""
📊 Complete Sensor Data Handling Test
ทดสอบการประมวลผลและจัดการข้อมูลเซ็นเซอร์ทั้งหมด
"""

import firebase_admin
from firebase_admin import credentials, db
import json
import time
from datetime import datetime, timedelta
import requests
import serial
import threading
import statistics

class SensorDataTester:
    def __init__(self):
        self.firebase_url = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
        self.pi_server_url = "http://localhost:5000"
        self.arduino_port = "COM3"
        self.arduino_baudrate = 115200
        
        # Initialize Firebase
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate("firebase-service-account.json")
                firebase_admin.initialize_app(cred, {
                    'databaseURL': self.firebase_url
                })
            print("✅ Firebase initialized for sensor testing")
        except Exception as e:
            print(f"❌ Firebase init failed: {e}")
    
    def test_dht22_sensors(self):
        """ทดสอบเซ็นเซอร์ DHT22 (อุณหภูมิและความชื้น)"""
        print("\n🌡️ Testing DHT22 Sensors...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("❌ No sensor data available")
                return False
            
            dht22_sensors = ['DHT22_SYSTEM', 'DHT22_FEEDER']
            results = []
            
            for sensor_name in dht22_sensors:
                if sensor_name in sensor_data:
                    sensor_info = sensor_data[sensor_name]
                    print(f"✅ {sensor_name} found")
                    
                    # Check temperature data
                    if 'temperature' in sensor_info:
                        temp_data = sensor_info['temperature']
                        if isinstance(temp_data, dict) and 'value' in temp_data:
                            temp_value = temp_data['value']
                            if -40 <= temp_value <= 80:  # Valid DHT22 range
                                print(f"   └─ Temperature: {temp_value}°C ✅")
                                results.append(True)
                            else:
                                print(f"   └─ Temperature out of range: {temp_value}°C ❌")
                                results.append(False)
                        else:
                            print(f"   └─ Invalid temperature structure ❌")
                            results.append(False)
                    else:
                        print(f"   └─ No temperature data ❌")
                        results.append(False)
                    
                    # Check humidity data
                    if 'humidity' in sensor_info:
                        humidity_data = sensor_info['humidity']
                        if isinstance(humidity_data, dict) and 'value' in humidity_data:
                            humidity_value = humidity_data['value']
                            if 0 <= humidity_value <= 100:  # Valid humidity range
                                print(f"   └─ Humidity: {humidity_value}% ✅")
                                results.append(True)
                            else:
                                print(f"   └─ Humidity out of range: {humidity_value}% ❌")
                                results.append(False)
                        else:
                            print(f"   └─ Invalid humidity structure ❌")
                            results.append(False)
                    else:
                        print(f"   └─ No humidity data ❌")
                        results.append(False)
                else:
                    print(f"❌ {sensor_name} not found")
                    results.append(False)
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 DHT22 Success Rate: {success_rate:.1%}")
            return success_rate >= 0.7
        except Exception as e:
            print(f"❌ DHT22 test failed: {e}")
            return False
    
    def test_hx711_weight_sensor(self):
        """ทดสอบเซ็นเซอร์ HX711 (น้ำหนัก)"""
        print("\n⚖️ Testing HX711 Weight Sensor...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors/HX711_FEEDER')
            weight_data = sensors_ref.get()
            
            if not weight_data:
                print("❌ No HX711 weight data found")
                return False
            
            print("✅ HX711_FEEDER data found")
            
            # Check weight data structure
            if 'weight' in weight_data:
                weight_info = weight_data['weight']
                if isinstance(weight_info, dict):
                    if 'value' in weight_info:
                        weight_value = weight_info['value']
                        print(f"   └─ Weight: {weight_value}g")
                        
                        # Check if weight is reasonable (0-10kg for fish feeder)
                        if 0 <= weight_value <= 10000:
                            print("   └─ Weight in reasonable range ✅")
                            
                            # Check timestamp
                            if 'timestamp' in weight_info:
                                timestamp = weight_info['timestamp']
                                try:
                                    weight_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                    time_diff = (datetime.now() - weight_time.replace(tzinfo=None)).total_seconds()
                                    
                                    if time_diff < 300:  # Less than 5 minutes
                                        print(f"   └─ Data fresh: {time_diff:.1f}s old ✅")
                                        return True
                                    else:
                                        print(f"   └─ Data stale: {time_diff:.1f}s old ❌")
                                        return False
                                except Exception as e:
                                    print(f"   └─ Invalid timestamp format ❌")
                                    return False
                            else:
                                print("   └─ No timestamp ❌")
                                return False
                        else:
                            print(f"   └─ Weight out of range: {weight_value}g ❌")
                            return False
                    else:
                        print("   └─ No weight value ❌")
                        return False
                else:
                    print("   └─ Invalid weight structure ❌")
                    return False
            else:
                print("   └─ No weight data ❌")
                return False
        except Exception as e:
            print(f"❌ HX711 test failed: {e}")
            return False
    
    def test_battery_voltage_sensor(self):
        """ทดสอบเซ็นเซอร์แบตเตอรี่"""
        print("\n🔋 Testing Battery Voltage Sensor...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors/BATTERY_STATUS')
            battery_data = sensors_ref.get()
            
            if not battery_data:
                print("❌ No battery data found")
                return False
            
            print("✅ BATTERY_STATUS data found")
            
            if 'voltage' in battery_data:
                voltage_info = battery_data['voltage']
                if isinstance(voltage_info, dict) and 'value' in voltage_info:
                    voltage_value = voltage_info['value']
                    print(f"   └─ Voltage: {voltage_value}V")
                    
                    # Check if voltage is in reasonable range (3.0V - 4.2V for Li-ion)
                    if 3.0 <= voltage_value <= 4.5:
                        print("   └─ Voltage in normal range ✅")
                        
                        # Calculate battery percentage
                        battery_percent = ((voltage_value - 3.0) / (4.2 - 3.0)) * 100
                        print(f"   └─ Battery Level: {battery_percent:.1f}% ✅")
                        return True
                    else:
                        print(f"   └─ Voltage out of range: {voltage_value}V ❌")
                        return False
                else:
                    print("   └─ Invalid voltage structure ❌")
                    return False
            else:
                print("   └─ No voltage data ❌")
                return False
        except Exception as e:
            print(f"❌ Battery test failed: {e}")
            return False
    
    def test_solar_voltage_sensor(self):
        """ทดสอบเซ็นเซอร์โซลาร์เซลล์"""
        print("\n☀️ Testing Solar Voltage Sensor...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors/SOLAR_VOLTAGE')
            solar_data = sensors_ref.get()
            
            if not solar_data:
                print("❌ No solar data found")
                return False
            
            print("✅ SOLAR_VOLTAGE data found")
            
            if 'voltage' in solar_data:
                voltage_info = solar_data['voltage']
                if isinstance(voltage_info, dict) and 'value' in voltage_info:
                    voltage_value = voltage_info['value']
                    print(f"   └─ Solar Voltage: {voltage_value}V")
                    
                    # Check if voltage is reasonable (0V - 6V for 5V solar panel)
                    if 0 <= voltage_value <= 6.0:
                        print("   └─ Solar voltage in normal range ✅")
                        
                        # Check if charging
                        if voltage_value > 4.5:
                            print("   └─ Solar panel charging ☀️ ✅")
                        else:
                            print("   └─ Solar panel not charging 🌙")
                        return True
                    else:
                        print(f"   └─ Solar voltage out of range: {voltage_value}V ❌")
                        return False
                else:
                    print("   └─ Invalid solar voltage structure ❌")
                    return False
            else:
                print("   └─ No solar voltage data ❌")
                return False
        except Exception as e:
            print(f"❌ Solar test failed: {e}")
            return False
    
    def test_soil_moisture_sensor(self):
        """ทดสอบเซ็นเซอร์ความชื้นดิน"""
        print("\n🌱 Testing Soil Moisture Sensor...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors/SOIL_MOISTURE')
            soil_data = sensors_ref.get()
            
            if not soil_data:
                print("❌ No soil moisture data found")
                return False
            
            print("✅ SOIL_MOISTURE data found")
            
            if 'moisture' in soil_data:
                moisture_info = soil_data['moisture']
                if isinstance(moisture_info, dict) and 'value' in moisture_info:
                    moisture_value = moisture_info['value']
                    print(f"   └─ Soil Moisture: {moisture_value}%")
                    
                    # Check if moisture is in reasonable range
                    if 0 <= moisture_value <= 100:
                        print("   └─ Moisture in normal range ✅")
                        
                        # Interpret moisture level
                        if moisture_value < 30:
                            print("   └─ Soil is dry 🏜️")
                        elif moisture_value < 70:
                            print("   └─ Soil moisture is good 🌿")
                        else:
                            print("   └─ Soil is wet 💧")
                        return True
                    else:
                        print(f"   └─ Moisture out of range: {moisture_value}% ❌")
                        return False
                else:
                    print("   └─ Invalid moisture structure ❌")
                    return False
            else:
                print("   └─ No moisture data ❌")
                return False
        except Exception as e:
            print(f"❌ Soil moisture test failed: {e}")
            return False
    
    def test_data_conversion_accuracy(self):
        """ทดสอบความแม่นยำของการแปลงข้อมูล"""
        print("\n🎯 Testing Data Conversion Accuracy...")
        try:
            # Get raw Arduino data
            try:
                ser = serial.Serial(self.arduino_port, self.arduino_baudrate, timeout=2)
                time.sleep(2)
                
                # Request sensor data
                ser.write(b"GET_SENSORS\n")
                time.sleep(1)
                
                raw_response = ser.read_all().decode('utf-8').strip()
                ser.close()
                
                if raw_response:
                    print("✅ Raw Arduino data received")
                    print(f"   └─ Raw: {raw_response[:100]}...")
                else:
                    print("❌ No raw Arduino data")
                    return False
            except Exception as e:
                print(f"❌ Arduino communication failed: {e}")
                return False
            
            # Get processed Firebase data
            sensors_ref = db.reference('fish_feeder/sensors')
            firebase_data = sensors_ref.get()
            
            if not firebase_data:
                print("❌ No Firebase sensor data")
                return False
            
            print("✅ Firebase processed data available")
            
            # Compare data freshness
            timestamps = []
            for sensor_name, sensor_data in firebase_data.items():
                if isinstance(sensor_data, dict):
                    for data_type, data_info in sensor_data.items():
                        if isinstance(data_info, dict) and 'timestamp' in data_info:
                            try:
                                ts = datetime.fromisoformat(data_info['timestamp'].replace('Z', '+00:00'))
                                timestamps.append(ts)
                            except:
                                pass
            
            if timestamps:
                latest_time = max(timestamps)
                time_diff = (datetime.now() - latest_time.replace(tzinfo=None)).total_seconds()
                
                if time_diff < 60:  # Less than 1 minute
                    print(f"✅ Data conversion is current: {time_diff:.1f}s old")
                    return True
                else:
                    print(f"❌ Data conversion is stale: {time_diff:.1f}s old")
                    return False
            else:
                print("❌ No timestamps found in processed data")
                return False
        except Exception as e:
            print(f"❌ Data conversion test failed: {e}")
            return False
    
    def test_sensor_data_consistency(self):
        """ทดสอบความสอดคล้องของข้อมูลเซ็นเซอร์"""
        print("\n🔄 Testing Sensor Data Consistency...")
        try:
            # Collect multiple readings over time
            readings = []
            
            for i in range(5):
                sensors_ref = db.reference('fish_feeder/sensors')
                data = sensors_ref.get()
                
                if data:
                    readings.append(data)
                    print(f"   └─ Reading {i+1}/5 collected")
                    time.sleep(2)
                else:
                    print(f"   └─ Reading {i+1}/5 failed")
            
            if len(readings) < 3:
                print("❌ Insufficient readings for consistency test")
                return False
            
            # Check DHT22 temperature consistency
            dht22_temps = []
            for reading in readings:
                if 'DHT22_SYSTEM' in reading and 'temperature' in reading['DHT22_SYSTEM']:
                    temp_data = reading['DHT22_SYSTEM']['temperature']
                    if isinstance(temp_data, dict) and 'value' in temp_data:
                        dht22_temps.append(temp_data['value'])
            
            if len(dht22_temps) >= 3:
                temp_std = statistics.stdev(dht22_temps)
                temp_avg = statistics.mean(dht22_temps)
                
                if temp_std < 2.0:  # Standard deviation less than 2°C
                    print(f"✅ Temperature consistency good: avg={temp_avg:.1f}°C, std={temp_std:.2f}")
                else:
                    print(f"❌ Temperature inconsistent: avg={temp_avg:.1f}°C, std={temp_std:.2f}")
                    return False
            
            # Check weight consistency
            weights = []
            for reading in readings:
                if 'HX711_FEEDER' in reading and 'weight' in reading['HX711_FEEDER']:
                    weight_data = reading['HX711_FEEDER']['weight']
                    if isinstance(weight_data, dict) and 'value' in weight_data:
                        weights.append(weight_data['value'])
            
            if len(weights) >= 3:
                weight_std = statistics.stdev(weights)
                weight_avg = statistics.mean(weights)
                
                if weight_std < 50:  # Standard deviation less than 50g
                    print(f"✅ Weight consistency good: avg={weight_avg:.1f}g, std={weight_std:.2f}")
                else:
                    print(f"❌ Weight inconsistent: avg={weight_avg:.1f}g, std={weight_std:.2f}")
                    return False
            
            print("✅ Sensor data consistency test passed")
            return True
        except Exception as e:
            print(f"❌ Consistency test failed: {e}")
            return False
    
    def test_sensor_update_frequency(self):
        """ทดสอบความถี่ในการอัปเดตข้อมูลเซ็นเซอร์"""
        print("\n⏱️ Testing Sensor Update Frequency...")
        try:
            # Monitor updates for 30 seconds
            updates_received = []
            
            def on_sensor_update(event):
                updates_received.append({
                    'timestamp': datetime.now(),
                    'path': event.path,
                    'data': event.data
                })
            
            # Set up listener
            sensors_ref = db.reference('fish_feeder/sensors')
            listener = sensors_ref.listen(on_sensor_update)
            
            print("   └─ Monitoring sensor updates for 30 seconds...")
            time.sleep(30)
            
            # Stop listener
            listener.close()
            
            if updates_received:
                update_count = len(updates_received)
                update_rate = update_count / 30  # Updates per second
                
                print(f"✅ Received {update_count} updates in 30s")
                print(f"   └─ Update rate: {update_rate:.2f} updates/second")
                
                # Check if update rate is reasonable (at least 1 update per 10 seconds)
                if update_rate >= 0.1:
                    print("✅ Update frequency is adequate")
                    return True
                else:
                    print("❌ Update frequency too low")
                    return False
            else:
                print("❌ No sensor updates received")
                return False
        except Exception as e:
            print(f"❌ Update frequency test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test Sensor Data Handling ครอบคลุม"""
        print("📊 Starting Comprehensive Sensor Data Handling Test")
        print("=" * 60)
        
        tests = [
            ("DHT22 Sensors", self.test_dht22_sensors),
            ("HX711 Weight Sensor", self.test_hx711_weight_sensor),
            ("Battery Voltage", self.test_battery_voltage_sensor),
            ("Solar Voltage", self.test_solar_voltage_sensor),
            ("Soil Moisture", self.test_soil_moisture_sensor),
            ("Data Conversion Accuracy", self.test_data_conversion_accuracy),
            ("Data Consistency", self.test_sensor_data_consistency),
            ("Update Frequency", self.test_sensor_update_frequency),
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\n🧪 Running: {test_name}")
            try:
                result = test_func()
                results[test_name] = result
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"   Result: {status}")
            except Exception as e:
                results[test_name] = False
                print(f"   Result: ❌ ERROR - {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 SENSOR DATA HANDLING TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<35} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL SENSOR TESTS PASSED! Data handling is working correctly.")
        else:
            print("⚠️  Some sensor tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = SensorDataTester()
    tester.run_comprehensive_test() 