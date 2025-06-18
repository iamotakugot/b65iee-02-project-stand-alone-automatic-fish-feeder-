import { FC, useState, useEffect } from "react";
import { Switch } from "@heroui/switch";
import { useTheme } from "../provider";

import { SunFilledIcon, MoonFilledIcon } from "./ui/icons";

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className = "" }) => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div
        className={`w-12 h-6 bg-gray-300 rounded-full animate-pulse ${className}`}
      />
    );
  }

  const handleThemeChange = (isSelected: boolean) => {
    setTheme(isSelected ? "light" : "dark");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center text-sm text-gray-500">
        <MoonFilledIcon size={16} />
      </div>

      <Switch
        aria-label="Toggle theme"
        classNames={{
          base: "max-w-fit",
          wrapper: "p-0 h-4 overflow-visible",
          thumb: "w-6 h-6 border-2 shadow-lg",
        }}
        color="primary"
        endContent={<SunFilledIcon size={16} />}
        isSelected={theme === "light"}
        size="sm"
        startContent={<MoonFilledIcon size={16} />}
        onValueChange={handleThemeChange}
      />

      <div className="flex items-center text-sm text-gray-500">
        <SunFilledIcon size={16} />
      </div>
    </div>
  );
};
