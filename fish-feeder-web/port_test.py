import serial
import time

def test_arduino_connection():
    ports = ['COM3', 'COM4', 'COM5', 'COM6']
    
    for port in ports:
        try:
            print(f"🔍 Testing {port}...")
            arduino = serial.Serial(port, 115200, timeout=2)
            time.sleep(1)
            
            # Try to read some data
            if arduino.in_waiting > 0:
                line = arduino.readline().decode().strip()
                if '[SEND]' in line:
                    print(f"✅ Found Arduino on {port}")
                    print(f"📨 Sample data: {line[:100]}...")
                    arduino.close()
                    return port
            
            arduino.close()
            
        except Exception as e:
            print(f"❌ {port}: {e}")
    
    print("❌ No Arduino found on any port")
    return None

if __name__ == "__main__":
    test_arduino_connection() 