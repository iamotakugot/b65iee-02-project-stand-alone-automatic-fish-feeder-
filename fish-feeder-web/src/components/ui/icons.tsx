import { IconSvgProps } from "@/types";

export const MoonFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path
      d="M21.53 15.93c-.16-.27-.61-.69-1.73-.49a8.46 8.46 0 01-1.88.13 8.409 8.409 0 01-5.91-2.82 8.068 8.068 0 01-1.44-8.66c.44-1.01.13-1.54-.09-1.76s-.77-.55-1.83-.11a10.318 10.318 0 00-6.32 10.21 10.475 10.475 0 007.04 8.99 10 10 0 002.89.55c.16.01.32.02.48.02a10.5 10.5 0 008.47-4.27c.67-.93.49-1.519.32-1.79z"
      fill="currentColor"
    />
  </svg>
);

export const SunFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <g fill="currentColor">
      <path d="M19 12a7 7 0 11-7-7 7 7 0 017 7z" />
      <path d="M12 22.96a.969.969 0 01-1-.96v-.08a1 1 0 012 0 1.038 1.038 0 01-1 1.04zm7.14-2.82a1.024 1.024 0 01-.71-.29l-.13-.13a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.984.984 0 01-.7.29zm-14.28 0a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a1 1 0 01-.7.29zM22 13h-.08a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zM2.08 13H2a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zm16.93-7.01a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a.984.984 0 01-.7.29zm-14.02 0a1.024 1.024 0 01-.71-.29l-.13-.14a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.97.97 0 01-.7.3zM12 3.04a.969.969 0 01-1-.96V2a1 1 0 012 0 1.038 1.038 0 01-1 1.04z" />
    </g>
  </svg>
);

// Fan Icon with spinning animation
export const FanIcon = ({
  size = 24,
  width,
  height,
  spinning = false,
  speed = "normal", // slow, normal, fast
  ...props
}: IconSvgProps & { 
  spinning?: boolean; 
  speed?: "slow" | "normal" | "fast";
}) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 512 512"
    width={size || width}
    className={spinning ? `animate-spin ${speed === "slow" ? "duration-[3s]" : speed === "fast" ? "duration-500" : "duration-1000"}` : ""}
    style={{
      transformOrigin: "center",
      animation: spinning ? 
        speed === "slow" ? "spin 3s linear infinite" : 
        speed === "fast" ? "spin 0.5s linear infinite" : 
        "spin 1s linear infinite" : "none"
    }}
    {...props}
  >
    <path
      d="M352.57 128c-28.09 0-54.09 4.52-77.06 12.86l12.41-123.11C289 7.31 279.81-1.18 269.33.13 189.63 10.13 128 77.64 128 159.43c0 28.09 4.52 54.09 12.86 77.06L17.75 224.08C7.31 223-1.18 232.19.13 242.67c10 79.7 77.51 141.33 159.3 141.33 28.09 0 54.09-4.52 77.06-12.86l-12.41 123.11c-1.05 10.43 8.11 18.93 18.59 17.62 79.7-10 141.33-77.51 141.33-159.3 0-28.09-4.52-54.09-12.86-77.06l123.11 12.41c10.44 1.05 18.93-8.11 17.62-18.59-10-79.7-77.51-141.33-159.3-141.33zM256 288a32 32 0 1 1 32-32 32 32 0 0 1-32 32z"
      fill="currentColor"
    />
  </svg>
);

// Alternative Fan Icon (simpler design) with spinning animation
export const SimpleFanIcon = ({
  size = 24,
  width,
  height,
  spinning = false,
  speed = "normal",
  ...props
}: IconSvgProps & { 
  spinning?: boolean; 
  speed?: "slow" | "normal" | "fast";
}) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    className={spinning ? `animate-spin ${speed === "slow" ? "duration-[3s]" : speed === "fast" ? "duration-500" : "duration-1000"}` : ""}
    style={{
      transformOrigin: "center",
      animation: spinning ? 
        speed === "slow" ? "spin 3s linear infinite" : 
        speed === "fast" ? "spin 0.5s linear infinite" : 
        "spin 1s linear infinite" : "none"
    }}
    {...props}
  >
    <path
      d="M12 2L8.5 8.5L2 12l6.5 3.5L12 22l3.5-6.5L22 12l-6.5-3.5L12 2z"
      fill="currentColor"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

// Blower Fan Icon with advanced animation controls
export const BlowerFanIcon = ({
  size = 24,
  width,
  height,
  spinning = false,
  speed = "normal",
  temperature = 0,
  ...props
}: IconSvgProps & { 
  spinning?: boolean; 
  speed?: "slow" | "normal" | "fast";
  temperature?: number;
}) => {
  // Color changes based on temperature
  const getTemperatureColor = (temp: number) => {
    if (temp >= 45) return "#ef4444"; // red-500
    if (temp >= 35) return "#f97316"; // orange-500  
    if (temp >= 25) return "#eab308"; // yellow-500
    return "#3b82f6"; // blue-500
  };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 512 512"
      width={size || width}
      className={spinning ? `animate-spin ${speed === "slow" ? "duration-[4s]" : speed === "fast" ? "duration-700" : "duration-[1.5s]"}` : ""}
      style={{
        transformOrigin: "center",
        animation: spinning ? 
          speed === "slow" ? "spin 4s linear infinite" : 
          speed === "fast" ? "spin 0.7s linear infinite" : 
          "spin 1.5s linear infinite" : "none",
        color: temperature > 0 ? getTemperatureColor(temperature) : "currentColor"
      }}
      {...props}
    >
      <path
        d="M352.57 128c-28.09 0-54.09 4.52-77.06 12.86l12.41-123.11C289 7.31 279.81-1.18 269.33.13 189.63 10.13 128 77.64 128 159.43c0 28.09 4.52 54.09 12.86 77.06L17.75 224.08C7.31 223-1.18 232.19.13 242.67c10 79.7 77.51 141.33 159.3 141.33 28.09 0 54.09-4.52 77.06-12.86l-12.41 123.11c-1.05 10.43 8.11 18.93 18.59 17.62 79.7-10 141.33-77.51 141.33-159.3 0-28.09-4.52-54.09-12.86-77.06l123.11 12.41c10.44 1.05 18.93-8.11 17.62-18.59-10-79.7-77.51-141.33-159.3-141.33zM256 288a32 32 0 1 1 32-32 32 32 0 0 1-32 32z"
        fill="currentColor"
      />
      {/* Optional glow effect for high temperatures */}
      {temperature >= 40 && (
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      )}
    </svg>
  );
};
