import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface AppRouterProps {
  children: React.ReactNode;
}

const AppRouter = ({ children }: AppRouterProps) => {
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // ตรวจสอบใน localStorage ว่าเคยดู splash แล้วหรือไม่
    const splashSeen = localStorage.getItem("splash-seen");
    
    if (splashSeen) {
      setHasSeenSplash(true);
    }
  }, []);

  // หาก user มาจาก splash page
  useEffect(() => {
    if (location.pathname === "/splash") {
      localStorage.setItem("splash-seen", "true");
      setHasSeenSplash(true);
    }
  }, [location.pathname]);

  // หากยังไม่เคยดู splash และไม่ได้อยู่ในหน้า splash
  if (!hasSeenSplash && location.pathname !== "/splash") {
    return <Navigate to="/splash" replace />;
  }

  return <>{children}</>;
};

export default AppRouter; 