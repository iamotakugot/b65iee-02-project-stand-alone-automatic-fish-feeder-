import type { NavigateOptions } from "react-router-dom";

import { useEffect, useState } from "react";
import { HeroUIProvider } from "@heroui/system";
import { useHref, useNavigate } from "react-router-dom";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a minimal version during SSR
    return (
      <HeroUIProvider locale="th-TH" navigate={navigate} useHref={useHref}>
        {children}
      </HeroUIProvider>
    );
  }

  return (
    <HeroUIProvider locale="th-TH" navigate={navigate} useHref={useHref}>
      {children}
    </HeroUIProvider>
  );
}
