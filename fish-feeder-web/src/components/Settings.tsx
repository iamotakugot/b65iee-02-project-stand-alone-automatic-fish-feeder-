import React, { useState, useCallback, useEffect } from 'react';
import { useApiConnection } from '../hooks/useApiConnection';
import { 
  FaCog, FaWeight, FaCalibrate, FaInfoCircle, 
  FaDownload, FaUpload, FaTint, FaQuestionCircle,
  FaExclamationTriangle, FaCheckCircle 
} from 'react-icons/fa';
import { apiClient } from '../config/api';

interface CalibrationResult {
  status: string;
  scale_factor?: number;
  offset?: number;
  known_weight?: number;
  current_weight?: number;
  action?: string;
  timestamp?: number;
}

interface WeightCalibrationProps {
  className?: string;
}

const WeightCalibrationPanel: React.FC<WeightCalibrationProps> = ({ className = "" }) => {
  const [calibrationState, setCalibrationState] = useState<'idle' | 'calibrating' | 'taring' | 'loading'>('idle');
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [knownWeight, setKnownWeight] = useState<string>('1.000');
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current weight status
  const fetchWeightStatus = useCallback(async () => {
    try {
      const response = await apiClient.sendDirectCommand('WEIGHT_CAL:status');
      if (response?.status === 'success') {
        // Parse weight status from Arduino response
        // This would need to be implemented in the API client
        console.log('Weight status:', response);
      }
    } catch (err) {
      console.error('Failed to fetch weight status:', err);
    }
  }, []);

  // Start weight calibration
  const startCalibration = useCallback(async () => {
    if (!knownWeight || parseFloat(knownWeight) <= 0) {
      setError('กรุณาใส่น้ำหนักมาตรฐานที่ถูกต้อง');
      return;
    }

    setCalibrationState('calibrating');
    setError(null);
    setSuccess(null);

    try {
      const command = `WEIGHT_CAL:calibrate:${knownWeight}`;
      const response = await apiClient.sendDirectCommand(command);
      
      if (response?.status === 'success') {
        setSuccess(`✅ Calibration สำเร็จ! ใช้น้ำหนักมาตรฐาน ${knownWeight} kg`);
        setCalibrationResult({
          status: 'success',
          known_weight: parseFloat(knownWeight),
          timestamp: Date.now()
        });
      } else {
        setError('Calibration ล้มเหลว กรุณาลองใหม่');
      }
    } catch (err) {
      setError(`Calibration error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalibrationState('idle');
    }
  }, [knownWeight]);

  // Tare weight sensor
  const tareWeight = useCallback(async () => {
    setCalibrationState('taring');
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.sendDirectCommand('WEIGHT_CAL:tare');
      
      if (response?.status === 'success') {
        setSuccess('✅ Tare (ปรับศูนย์) สำเร็จ!');
        setCalibrationResult({
          status: 'success',
          action: 'tare',
          timestamp: Date.now()
        });
      } else {
        setError('Tare ล้มเหลว กรุณาลองใหม่');
      }
    } catch (err) {
      setError(`Tare error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalibrationState('idle');
    }
  }, []);

  // Reset calibration
  const resetCalibration = useCallback(async () => {
    if (!confirm('ต้องการรีเซ็ต calibration กลับไปค่าเริ่มต้นหรือไม่?')) {
      return;
    }

    setCalibrationState('loading');
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.sendDirectCommand('WEIGHT_CAL:reset');
      
      if (response?.status === 'success') {
        setSuccess('✅ Reset calibration สำเร็จ!');
        setCalibrationResult({
          status: 'success',
          action: 'reset',
          timestamp: Date.now()
        });
      } else {
        setError('Reset ล้มเหลว กรุณาลองใหม่');
      }
    } catch (err) {
      setError(`Reset error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalibrationState('idle');
    }
  }, []);

  // Load calibration from EEPROM
  const loadCalibration = useCallback(async () => {
    setCalibrationState('loading');
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.sendDirectCommand('WEIGHT_CAL:load');
      
      if (response?.status === 'success') {
        setSuccess('✅ โหลด calibration จาก EEPROM สำเร็จ!');
      } else {
        setError('โหลด calibration ล้มเหลว');
      }
    } catch (err) {
      setError(`Load error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalibrationState('idle');
    }
  }, []);

  // ⚡ NO AUTO-REFRESH - Manual refresh only for system stability
  // Weight status will be fetched when manually needed

  const isLoading = calibrationState !== 'idle';

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <FaWeight className="mr-2 text-blue-600" />
          HX711 Weight Sensor Calibration
        </h2>
        <span className="text-sm text-gray-500">
          EEPROM Auto-Save
        </span>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <FaCheckCircle className="text-green-500 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Current Weight Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-2">น้ำหนักปัจจุบัน</h3>
        <div className="text-2xl font-mono text-center py-4">
          {currentWeight.toFixed(3)} kg
        </div>
      </div>

      {/* Calibration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Known Weight Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            น้ำหนักมาตรฐาน (kg)
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            max="50.000"
            value={knownWeight}
            onChange={(e) => setKnownWeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            placeholder="1.000"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            แนะนำ: 0.5kg, 1.0kg, 2.0kg หรือ 5.0kg
          </p>
        </div>

        {/* Quick Weight Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            น้ำหนักมาตรฐานที่ใช้บ่อย
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['0.500', '1.000', '2.000', '5.000'].map((weight) => (
              <button
                key={weight}
                onClick={() => setKnownWeight(weight)}
                disabled={isLoading}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {weight} kg
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Calibrate Button */}
        <button
          onClick={startCalibration}
          disabled={isLoading}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            calibrationState === 'calibrating'
              ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <FaCalibrate className="mr-2" />
          {calibrationState === 'calibrating' ? 'กำลัง Calibrate...' : 'Calibrate'}
        </button>

        {/* Tare Button */}
        <button
          onClick={tareWeight}
          disabled={isLoading}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            calibrationState === 'taring'
              ? 'bg-green-100 text-green-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <FaTint className="mr-2" />
          {calibrationState === 'taring' ? 'กำลัง Tare...' : 'Tare (ปรับศูนย์)'}
        </button>

        {/* Load Button */}
        <button
          onClick={loadCalibration}
          disabled={isLoading}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            calibrationState === 'loading'
              ? 'bg-purple-100 text-purple-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <FaDownload className="mr-2" />
          {calibrationState === 'loading' ? 'กำลังโหลด...' : 'Load EEPROM'}
        </button>

        {/* Reset Button */}
        <button
          onClick={resetCalibration}
          disabled={isLoading}
          className="flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaUpload className="mr-2" />
          Reset
        </button>
      </div>

      {/* Calibration Results */}
      {calibrationResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-2 text-blue-800">ผลลัพธ์ Calibration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {calibrationResult.known_weight && (
              <div>
                <span className="text-gray-600">น้ำหนักมาตรฐาน:</span>
                <span className="font-mono ml-2">{calibrationResult.known_weight.toFixed(3)} kg</span>
              </div>
            )}
            {calibrationResult.scale_factor && (
              <div>
                <span className="text-gray-600">Scale Factor:</span>
                <span className="font-mono ml-2">{calibrationResult.scale_factor.toFixed(6)}</span>
              </div>
            )}
            {calibrationResult.offset && (
              <div>
                <span className="text-gray-600">Offset:</span>
                <span className="font-mono ml-2">{calibrationResult.offset}</span>
              </div>
            )}
            {calibrationResult.action && (
              <div>
                <span className="text-gray-600">Action:</span>
                <span className="font-mono ml-2">{calibrationResult.action}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <h3 className="font-medium mb-2 text-yellow-800 flex items-center">
          <FaQuestionCircle className="mr-2" />
          วิธีการ Calibrate
        </h3>
        <ol className="text-sm text-yellow-800 space-y-1">
          <li>1. ตั้งเซ็นเซอร์น้ำหนักให้เป็นศูนย์ (ไม่มีน้ำหนัก) แล้วกด "Tare"</li>
          <li>2. วางน้ำหนักมาตรฐานลงบนเซ็นเซอร์</li>
          <li>3. ใส่ค่าน้ำหนักมาตรฐานในช่อง "น้ำหนักมาตรฐาน"</li>
          <li>4. กดปุ่ม "Calibrate"</li>
          <li>5. ระบบจะบันทึกค่า calibration ลง EEPROM อัตโนมัติ</li>
          <li>6. เมื่อเครื่องรีสตาร์ท ค่า calibration จะถูกโหลดอัตโนมัติ</li>
        </ol>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { apiRequest } = useApiConnection();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'weight' | 'system' | 'network'>('weight');

  const handleApiTest = async (endpoint: string, method: string = 'GET') => {
    setLoading(endpoint);
    setMessage(null);
    try {
      const result = await apiRequest(endpoint, { method });
      setMessage(`✅ ${endpoint} สำเร็จ: ${JSON.stringify(result)}`);
    } catch (error) {
      setMessage(`❌ ${endpoint} ล้มเหลว: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleWeightCalibration = async (weight: number) => {
    setLoading('weight-calibrate');
    try {
      const result = await apiRequest('/api/control/weight/calibrate', {
        method: 'POST',
        body: JSON.stringify({ weight })
      });
      setMessage(`✅ Calibration สำเร็จ: ${JSON.stringify(result)}`);
    } catch (error) {
      setMessage(`❌ Calibration ล้มเหลว: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleWeightTare = async () => {
    setLoading('weight-tare');
    try {
      const result = await apiRequest('/api/control/weight/tare', {
        method: 'POST'
      });
      setMessage(`✅ Tare สำเร็จ: ${JSON.stringify(result)}`);
    } catch (error) {
      setMessage(`❌ Tare ล้มเหลว: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const TestButton = ({ 
    children, 
    onClick, 
    isLoading = false,
    color = 'blue'
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    isLoading?: boolean;
    color?: 'blue' | 'green' | 'red' | 'yellow';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      red: 'bg-red-500 hover:bg-red-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600'
    };

    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[color]} ${isLoading ? 'animate-pulse' : ''}`}
      >
        {isLoading ? '⏳ กำลังทดสอบ...' : children}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <FaCog className="mr-3 text-blue-600" />
            ระบบตั้งค่า Fish Feeder
          </h1>
          <p className="text-gray-600 mt-2">
            จัดการการตั้งค่าระบบ การ calibrate เซ็นเซอร์ และการกำหนดค่าต่างๆ
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { key: 'weight', label: 'Weight Calibration', icon: FaWeight },
                { key: 'system', label: 'System Settings', icon: FaCog },
                { key: 'network', label: 'Network Settings', icon: FaInfoCircle }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center px-6 py-4 font-medium transition-colors duration-200 ${
                    activeTab === key
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'weight' && <WeightCalibrationPanel />}
            
            {activeTab === 'system' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">System Settings</h2>
                <p className="text-gray-600">ระบบตั้งค่าอื่นๆ จะเพิ่มเติมในอนาคต</p>
              </div>
            )}
            
            {activeTab === 'network' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Network Settings</h2>
                <p className="text-gray-600">การตั้งค่าเครือข่ายและการเชื่อมต่อ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 