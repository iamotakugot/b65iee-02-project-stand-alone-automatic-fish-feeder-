import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
// import { BsPlus, BsTrash } from "react-icons/bs";

interface FeedPresetSelectorProps {
  feedType: string;
  setFeedType: (type: string) => void;
  feedAmount: string;
  setFeedAmount: (amount: string) => void;
  presetAmounts: Record<string, string>;
  setPresetAmounts: (amounts: Record<string, string>) => void;
  getPresetLabel: (type: string, amount: string) => string;
  formatWeightDisplay: (
    grams: string | number,
    showName?: boolean,
    name?: string,
  ) => string;
}

export const FeedPresetSelector = ({
  feedType,
  setFeedType,
  feedAmount,
  setFeedAmount,
  presetAmounts,
  setPresetAmounts,
  getPresetLabel,
  formatWeightDisplay,
}: FeedPresetSelectorProps) => {
  const handlePresetAmountChange = (type: string, value: string) => {
    setPresetAmounts({
      ...presetAmounts,
      [type]: value,
    });
  };

  const getPresetAmount = (type: string) => {
    return presetAmounts[type] || "100";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Feed Amount Presets
      </h3>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(presetAmounts).map(([type, amount]) => (
          <Button
            key={type}
            className="h-16 flex flex-col justify-center"
            color={feedType === type ? "primary" : "default"}
            variant={feedType === type ? "solid" : "bordered"}
            onPress={() => {
              setFeedType(type);
              setFeedAmount(getPresetAmount(type));
            }}
          >
            <div className="text-sm font-medium">
              {getPresetLabel(type, amount)}
            </div>
            <div className="text-xs opacity-70">
              {formatWeightDisplay(amount)}
            </div>
          </Button>
        ))}
      </div>

      {/* Custom Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Custom Amount (grams)
        </label>
        <Input
          className="w-full"
          max="5000"
          min="1"
          placeholder="Enter amount in grams"
          type="number"
          value={feedAmount}
          onChange={(e) => setFeedAmount(e.target.value)}
        />
      </div>

      {/* Preset Amount Editors */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
          Edit Preset Amounts
        </h4>
        {Object.entries(presetAmounts).map(([type, amount]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-16 text-sm font-medium capitalize">{type}:</span>
            <Input
              className="flex-1"
              max="5000"
              min="1"
              size="sm"
              type="number"
              value={amount}
              onChange={(e) => handlePresetAmountChange(type, e.target.value)}
            />
            <span className="text-xs text-gray-500 w-16">
              {formatWeightDisplay(amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
