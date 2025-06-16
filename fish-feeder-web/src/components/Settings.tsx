import React, { useState } from 'react';
import { useApi } from '../contexts/ApiContext';
import { FaCog, FaWeight, FaThermometerHalf } from 'react-icons/fa';

interface SettingsProps {
  className?: string;
}

const Settings: React.FC<SettingsProps> = ({ className = '' }) => {
  const { 
    sensorData, 
    controlFeeder,
    controlLED,
    controlFan,
    controlBlower,
    controlActuator,
    controlAuger
  } = useApi();

  // State management
  const [currentWeight] = useState<number>(0);
  const [calibrationWeight, setCalibrationWeight] = useState<string>('');
  const [tareOffset, setTareOffset] = useState<string>('');

  // Weight calibration functions
  const handleWeightCalibration = async () => {
    try {
      const weight = parseFloat(calibrationWeight);
      if (isNaN(weight) || weight <= 0) {
        alert('กรุณาใส่น้ำหนักที่ถูกต้อง');
        return;
      }
      
      // Send calibration command
      await controlFeeder(weight);
      alert(`เริ่มการ Calibrate น้ำหนัก: ${weight}g`);
      setCalibrationWeight('');
    } catch (error) {
      console.error('Weight calibration error:', error);
      alert('เกิดข้อผิดพลาดในการ Calibrate น้ำหนัก');
    }
  };

  const handleWeightTare = async () => {
    try {
      const offset = parseFloat(tareOffset);
      if (isNaN(offset)) {
        alert('กรุณาใส่ค่า Offset ที่ถูกต้อง');
        return;
      }
      
      // Send tare command
      await controlFeeder(0); // Reset to zero
      alert(`ตั้งค่า Tare เรียบร้อย: ${offset}`);
      setTareOffset('');
    } catch (error) {
      console.error('Weight tare error:', error);
      alert('เกิดข้อผิดพลาดในการตั้งค่า Tare');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <FaCog className="text-2xl text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-800">การตั้งค่าระบบ</h2>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaWeight className="text-blue-600 mr-2" />
            <span className="font-semibold">น้ำหนักปัจจุบัน</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {sensorData?.weight?.toFixed(2) || '0.00'} g
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaThermometerHalf className="text-green-600 mr-2" />
            <span className="font-semibold">อุณหภูมิ</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {sensorData?.temp1?.toFixed(1) || '0.0'} °C
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaThermometerHalf className="text-yellow-600 mr-2" />
            <span className="font-semibold">ความชื้น</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {sensorData?.hum1?.toFixed(0) || '0'} %
          </p>
        </div>
      </div>

      {/* Weight Calibration Section */}
      <div className="border-t pt-6">
        <h3 className="text-xl font-semibold mb-4">การปรับเทียบน้ำหนัก</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calibration */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Calibration</h4>
            <div className="flex space-x-2">
              <input
                type="number"
                value={calibrationWeight}
                onChange={(e) => setCalibrationWeight(e.target.value)}
                placeholder="น้ำหนักมาตรฐาน (g)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleWeightCalibration}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Calibrate
              </button>
            </div>
            <p className="text-sm text-gray-600">
              วางน้ำหนักมาตรฐานแล้วกด Calibrate
            </p>
          </div>

          {/* Tare */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Tare (ตั้งศูนย์)</h4>
            <div className="flex space-x-2">
              <input
                type="number"
                value={tareOffset}
                onChange={(e) => setTareOffset(e.target.value)}
                placeholder="Offset (g)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleWeightTare}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Tare
              </button>
            </div>
            <p className="text-sm text-gray-600">
              ตั้งค่าศูนย์หรือปรับ Offset
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-xl font-semibold mb-4">การควบคุมด่วน</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => controlLED("on")}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            เปิดไฟ LED
          </button>
          
          <button
            onClick={() => controlFan("on")}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            เปิดพัดลม
          </button>
          
          <button
            onClick={() => controlBlower("on")}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            เปิดเครื่องเป่า
          </button>
          
          <button
            onClick={() => controlActuator('up')}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            ยกกระบอก
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;