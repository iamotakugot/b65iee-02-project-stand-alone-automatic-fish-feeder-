import { Input } from "@heroui/input";

interface FeedTimingControlsProps {
  actuatorUp: string;
  setActuatorUp: (value: string) => void;
  actuatorDown: string;
  setActuatorDown: (value: string) => void;
  augerDuration: string;
  setAugerDuration: (value: string) => void;
  blowerDuration: string;
  setBlowerDuration: (value: string) => void;
}

export const FeedTimingControls = ({
  actuatorUp,
  setActuatorUp,
  actuatorDown,
  setActuatorDown,
  augerDuration,
  setAugerDuration,
  blowerDuration,
  setBlowerDuration,
}: FeedTimingControlsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Timing Controls
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Actuator Up (seconds)
          </label>
          <Input
            max="30"
            min="1"
            size="sm"
            type="number"
            value={actuatorUp}
            onChange={(e) => setActuatorUp(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Actuator Down (seconds)
          </label>
          <Input
            max="30"
            min="1"
            size="sm"
            type="number"
            value={actuatorDown}
            onChange={(e) => setActuatorDown(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Auger Duration (seconds)
          </label>
          <Input
            max="120"
            min="1"
            size="sm"
            type="number"
            value={augerDuration}
            onChange={(e) => setAugerDuration(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Blower Duration (seconds)
          </label>
          <Input
            max="60"
            min="1"
            size="sm"
            type="number"
            value={blowerDuration}
            onChange={(e) => setBlowerDuration(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
