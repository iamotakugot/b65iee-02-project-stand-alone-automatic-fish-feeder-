import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { BsPlus, BsTrash } from "react-icons/bs";

interface Schedule {
  time: string;
  amount: string;
  type: string;
  actuator_up: number;
  actuator_down: number;
  auger_duration: number;
  blower_duration: number;
}

interface FeedSchedulerProps {
  automaticFeeding: boolean;
  setAutomaticFeeding: (value: boolean) => void;
  schedules: Schedule[];
  setSchedules: (schedules: Schedule[]) => void;
  newScheduleTime: string;
  setNewScheduleTime: (time: string) => void;
  newScheduleAmount: string;
  setNewScheduleAmount: (amount: string) => void;
  formatWeightDisplay: (grams: string | number, showName?: boolean, name?: string) => string;
}

export const FeedScheduler = ({
  automaticFeeding,
  setAutomaticFeeding,
  schedules,
  setSchedules,
  newScheduleTime,
  setNewScheduleTime,
  newScheduleAmount,
  setNewScheduleAmount,
  formatWeightDisplay
}: FeedSchedulerProps) => {
  const handleAddSchedule = () => {
    if (newScheduleTime && newScheduleAmount) {
      const newSchedule: Schedule = {
        time: newScheduleTime,
        amount: newScheduleAmount,
        type: "custom",
        actuator_up: 3,
        actuator_down: 2,
        auger_duration: 20,
        blower_duration: 15
      };
      
      setSchedules([...schedules, newSchedule]);
      setNewScheduleTime("");
      setNewScheduleAmount("100");
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Automatic Feeding
        </h3>
        <Switch
          isSelected={automaticFeeding}
          onValueChange={setAutomaticFeeding}
          color="primary"
        />
      </div>

      {automaticFeeding && (
        <>
          <div className="space-y-2">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
              Current Schedules
            </h4>
            {schedules.map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {schedule.time}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatWeightDisplay(schedule.amount, true, schedule.type)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  isIconOnly
                  onPress={() => handleRemoveSchedule(index)}
                >
                  <BsTrash />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3 p-4 border rounded-lg dark:border-gray-600">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
              Add New Schedule
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <Input
                  type="time"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  size="sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (grams)
                </label>
                <Input
                  type="number"
                  value={newScheduleAmount}
                  onChange={(e) => setNewScheduleAmount(e.target.value)}
                  min="1"
                  max="5000"
                  size="sm"
                />
              </div>
            </div>

            <Button
              color="primary"
              startContent={<BsPlus />}
              onPress={handleAddSchedule}
              isDisabled={!newScheduleTime || !newScheduleAmount}
            >
              Add Schedule
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 