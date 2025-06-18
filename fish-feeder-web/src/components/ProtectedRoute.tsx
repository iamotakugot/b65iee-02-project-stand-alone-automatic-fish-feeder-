import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLock } from '@/contexts/LockContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresUnlock?: boolean; // Whether this route requires unlock
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresUnlock = false 
}) => {
  const { isLocked, setIsLocked } = useLock();
  const navigate = useNavigate();
  const location = useLocation();

  // Lock specific pages that require unlock
  const protectedPaths = ['/feed-control', '/settings'];
  
  useEffect(() => {
    if (requiresUnlock && protectedPaths.includes(location.pathname)) {
      // 🔒 ProtectedRoute แค่ log ไม่ต้อง setIsLocked เพราะ Sidebar จัดการแล้ว
      console.log(`🔒 ProtectedRoute: On protected page ${location.pathname} - Lock status: ${isLocked}`);
    }
  }, [location.pathname, requiresUnlock, isLocked]);

  // 🚫 ถ้าระบบล็อคอยู่ และหน้านี้ต้อง unlock -> ไม่แสดง children เลย
  if (requiresUnlock && isLocked) {
    console.log(`🚫 ProtectedRoute: System is locked - blocking ${location.pathname} content`);
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            กำลังรอการปลดล็อค...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            กรุณาใส่รหัสผ่านเพื่อเข้าใช้งานหน้านี้
          </p>
        </div>
      </div>
    );
  }

  // ✅ ระบบไม่ล็อค หรือ หน้านี้ไม่ต้อง unlock -> แสดง children ปกติ
  return <>{children}</>;
};

export default ProtectedRoute; 