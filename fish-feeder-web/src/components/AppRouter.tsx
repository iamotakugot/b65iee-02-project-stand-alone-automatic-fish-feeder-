import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface AppRouterProps {
  children: React.ReactNode;
}

const AppRouter = ({ children }: AppRouterProps) => {
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for splash settings
    const splashDisabled = localStorage.getItem("splash-disabled") === "true";
    const splashSeen = localStorage.getItem("splash-seen") === "true";
    const urlParams = new URLSearchParams(window.location.search);
    const showSplash = urlParams.get("splash") === "true";
    const noSplash = urlParams.get("nosplash") === "true";

    if (noSplash) {
      // Force skip splash via URL
      setHasSeenSplash(true);
      localStorage.setItem("splash-seen", "true");
      localStorage.setItem("splash-disabled", "true");
    } else if (showSplash) {
      // Force show splash via URL
      setHasSeenSplash(false);
      localStorage.removeItem("splash-seen");
      localStorage.removeItem("splash-disabled");
    } else if (splashDisabled) {
      // Skip splash if user has disabled it in settings
      setHasSeenSplash(true);
    } else if (splashSeen) {
      // Skip splash if user has already seen it in this session
      setHasSeenSplash(true);
    } else {
      // Default: Show splash screen for new users
      setHasSeenSplash(false);
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
    return <Navigate replace to="/splash" />;
  }

  return <>{children}</>;
};

export default AppRouter;
