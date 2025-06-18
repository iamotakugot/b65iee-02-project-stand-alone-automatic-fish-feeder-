import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiShield, FiX } from 'react-icons/fi';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';

interface LockScreenModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  onNavigateAway?: () => void; // เพิ่ม callback สำหรับปิด modal และกลับไปหน้าอื่น
}

const LockScreenModal: React.FC<LockScreenModalProps> = ({ isLocked, onUnlock, onNavigateAway }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const CORRECT_PASSWORD = '1150';
  const MAX_ATTEMPTS = 5;

  // Block navigation when locked
  useEffect(() => {
    if (!isLocked) return;

    const blockNavigation = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Block browser navigation
    window.addEventListener('beforeunload', blockNavigation);
    
    // Block back button
    const handlePopState = (e: PopStateEvent) => {
      if (isLocked) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', blockNavigation);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLocked]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+U, etc.
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'r') ||
        (e.metaKey && e.key === 'r')
      ) {
        e.preventDefault();
        return false;
      }

      // Enter to submit
      if (e.key === 'Enter' && password) {
        handleUnlock();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, password]);

  const handleUnlock = async () => {
    if (attempts >= MAX_ATTEMPTS) {
      setError('จำนวนครั้งเกินกำหนด กรุณารีเฟรชหน้าเว็บ');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate checking password
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (password === CORRECT_PASSWORD) {
      setError('');
      setShowUnlockModal(false);
      setPassword('');
      setAttempts(0);
      
      // 🔓 เรียกใช้ callback จาก Sidebar เพื่อ navigate ไปหน้าที่ต้องการ
      const handleUnlockSuccess = (window as any).handleUnlockSuccess;
      if (handleUnlockSuccess) {
        handleUnlockSuccess();
      } else {
        onUnlock(); // fallback เดิม
      }
    } else {
      setAttempts(prev => prev + 1);
      setError(`รหัสผ่านไม่ถูกต้อง (${attempts + 1}/${MAX_ATTEMPTS})`);
      setPassword('');
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleClose = () => {
    // 🚪 แค่ปิด modal ลงไปเลย ไม่ต้องถามอะไร
    console.log('🚪 Lock Modal: Closing modal - unlocking system');
    onUnlock(); // ปลดล็อคระบบ ซึ่งจะทำให้ modal หายไป
  };

  // แสดง modal เมื่อ locked ไม่ว่าจะอยู่หน้าไหน
  if (!isLocked) return null;

  console.log('🔒 LockScreenModal: Showing lock modal for pending navigation');

  // Show full modal for locked pages (feed-control, settings, etc.)
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Lock Screen Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="✖️ ปิด Lock Modal"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
          >
            <FiLock className="h-8 w-8 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🔐 ต้องรหัสผ่านเพื่อเข้าใช้งาน
          </h2>
          
          {/* แสดงหน้าที่จะไป */}
          {(() => {
            const pendingPath = (window as any).pendingNavigation;
            if (pendingPath) {
              const pathLabels: Record<string, string> = {
                '/feed-control': '🍽️ Feed Control Center',
                '/settings': '⚙️ Settings Panel'
              };
              return (
                <div className="mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      หน้าที่ต้องการเข้าใช้งาน:
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 text-lg font-semibold">
                      {pathLabels[pendingPath] || pendingPath}
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          <p className="text-gray-600 dark:text-gray-400">
            กรุณาใส่รหัสผ่านเพื่อปลดล็อคการใช้งาน
          </p>
        </div>

        {/* Password Input */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ใส่รหัสผ่าน"
              isDisabled={isLoading || attempts >= MAX_ATTEMPTS}
              classNames={{
                input: "text-center text-lg tracking-widest",
                inputWrapper: "h-14"
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              }
            />
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3"
            >
              <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">
                {error}
              </p>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onPress={handleReset}
              isDisabled={isLoading}
              className="flex-1"
            >
              ล้าง
            </Button>
            
                              <Button
                    color="primary"
                    onPress={handleUnlock}
                    isLoading={isLoading}
                    isDisabled={!password || attempts >= MAX_ATTEMPTS}
                    className="flex-1"
                  >
                    {isLoading 
                      ? 'กำลังตรวจสอบ...' 
                      : (window as any).pendingNavigation 
                        ? `🔓 ปลดล็อคและเข้าใช้งาน`
                        : 'ปลดล็อค'
                    }
                  </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>🔒 ระบบความปลอดภัย Fish Feeder IoT</p>
            <p>Dashboard สามารถดูได้ แต่ไม่สามารถใช้งานฟังก์ชันอื่นได้</p>
            <p className="text-blue-500 dark:text-blue-400">
              เหลือ {MAX_ATTEMPTS - attempts} ครั้ง
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LockScreenModal; 