import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Divider, Chip, Slider, Progress } from '@nextui-org/react';
import { Timer, Settings, Save, RotateCcw, Zap, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../config/api';

interface DeviceTiming {
  actuatorUp: number;
  actuatorDown: number;
  augerDuration: number;
  blowerDuration: number;
}

interface DeviceTimingControlProps {
  className?: string;
}

const DeviceTimingControl: React.FC<DeviceTimingControlProps> = ({ className = "" }) => {
  const [timing, setTiming] = useState<DeviceTiming>({
    actuatorUp: 2.0,
    actuatorDown: 1.0,
    augerDuration: 10.0,
    blowerDuration: 5.0
  });
  
  const [originalTiming, setOriginalTiming] = useState<DeviceTiming>({
    actuatorUp: 2.0,
    actuatorDown: 1.0,
    augerDuration: 10.0,
    blowerDuration: 5.0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  // Load current timing configuration
  useEffect(() => {
    loadDeviceTiming();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(timing) !== JSON.stringify(originalTiming);
    setHasChanges(changed);
  }, [timing, originalTiming]);

  const loadDeviceTiming = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getDeviceTiming();
      if (response?.timing) {
        setTiming(response.timing);
        setOriginalTiming(response.timing);
      }
    } catch (error) {
      console.error('Failed to load device timing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDeviceTiming = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.updateDeviceTiming(timing);
      if (response?.status === 'success') {
        setOriginalTiming(timing);
        setLastSaved(new Date());
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to save device timing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults: DeviceTiming = {
      actuatorUp: 2.0,
      actuatorDown: 1.0,
      augerDuration: 10.0,
      blowerDuration: 5.0
    };
    setTiming(defaults);
  };

  const resetToOriginal = () => {
    setTiming(originalTiming);
  };

  const updateTiming = (key: keyof DeviceTiming, value: number) => {
    setTiming(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Preview feeding sequence with current timing
  const previewSequence = () => {
    if (previewMode) return;
    
    setPreviewMode(true);
    setPreviewProgress(0);
    
    const totalDuration = timing.actuatorUp + timing.augerDuration + timing.actuatorDown + timing.blowerDuration;
    const steps = [
      { name: 'Actuator Up', duration: timing.actuatorUp },
      { name: 'Auger Running', duration: timing.augerDuration },
      { name: 'Actuator Down', duration: timing.actuatorDown },
      { name: 'Blower Active', duration: timing.blowerDuration }
    ];

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.1;
      const progress = (elapsed / totalDuration) * 100;
      setPreviewProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setPreviewMode(false);
          setPreviewProgress(0);
        }, 1000);
      }
    }, 100);
  };

  const getTotalFeedTime = () => {
    return timing.actuatorUp + timing.augerDuration + timing.actuatorDown + timing.blowerDuration;
  };

  const getTimingQuality = () => {
    const total = getTotalFeedTime();
    if (total < 15) return { level: 'Fast', color: 'warning', description: 'Very quick feeding' };
    if (total < 25) return { level: 'Optimal', color: 'success', description: 'Recommended timing' };
    if (total < 35) return { level: 'Thorough', color: 'primary', description: 'Complete feeding cycle' };
    return { level: 'Slow', color: 'danger', description: 'May be too slow' };
  };

  const quality = getTimingQuality();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${className}`}
    >
      <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur border border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
            >
              <Timer className="w-6 h-6 text-orange-400" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-white">Device Timing Control</h3>
              <p className="text-sm text-slate-400">Fine-tune feeding sequence timing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Chip
              color={quality.color as any}
              variant="flat"
              size="sm"
            >
              {quality.level} ({getTotalFeedTime()}s)
            </Chip>
            
            {hasChanges && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Chip color="warning" variant="flat" size="sm">
                  Unsaved Changes
                </Chip>
              </motion.div>
            )}
          </div>
        </CardHeader>

        <Divider className="bg-slate-600" />

        <CardBody className="space-y-6">
          {/* Timing Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actuator Up Timing */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-white font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Actuator Up
                </label>
                <Chip size="sm" color="primary" variant="flat">
                  {timing.actuatorUp}s
                </Chip>
              </div>
              <Slider
                size="lg"
                step={0.1}
                minValue={0.5}
                maxValue={10}
                value={timing.actuatorUp}
                onChange={(value) => updateTiming('actuatorUp', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="primary"
                showTooltip
                tooltipProps={{
                  content: `${timing.actuatorUp}s - Lift feed container`,
                }}
              />
              <p className="text-xs text-slate-400">Time to lift the feed container up</p>
            </motion.div>

            {/* Auger Duration */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-white font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-green-400" />
                  Auger Duration
                </label>
                <Chip size="sm" color="success" variant="flat">
                  {timing.augerDuration}s
                </Chip>
              </div>
              <Slider
                size="lg"
                step={0.5}
                minValue={1}
                maxValue={60}
                value={timing.augerDuration}
                onChange={(value) => updateTiming('augerDuration', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="success"
                showTooltip
                tooltipProps={{
                  content: `${timing.augerDuration}s - Feed dispensing time`,
                }}
              />
              <p className="text-xs text-slate-400">How long to dispense feed</p>
            </motion.div>

            {/* Actuator Down Timing */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-white font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Actuator Down
                </label>
                <Chip size="sm" color="secondary" variant="flat">
                  {timing.actuatorDown}s
                </Chip>
              </div>
              <Slider
                size="lg"
                step={0.1}
                minValue={0.5}
                maxValue={10}
                value={timing.actuatorDown}
                onChange={(value) => updateTiming('actuatorDown', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="secondary"
                showTooltip
                tooltipProps={{
                  content: `${timing.actuatorDown}s - Lower feed container`,
                }}
              />
              <p className="text-xs text-slate-400">Time to lower the feed container</p>
            </motion.div>

            {/* Blower Duration */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-white font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-orange-400" />
                  Blower Duration
                </label>
                <Chip size="sm" color="warning" variant="flat">
                  {timing.blowerDuration}s
                </Chip>
              </div>
              <Slider
                size="lg"
                step={0.5}
                minValue={1}
                maxValue={30}
                value={timing.blowerDuration}
                onChange={(value) => updateTiming('blowerDuration', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="warning"
                showTooltip
                tooltipProps={{
                  content: `${timing.blowerDuration}s - Clear remaining feed`,
                }}
              />
              <p className="text-xs text-slate-400">Time to blow out remaining feed</p>
            </motion.div>
          </div>

          {/* Preview Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400" />
                Sequence Preview
              </h4>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                onPress={previewSequence}
                isDisabled={previewMode}
                startContent={previewMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              >
                {previewMode ? 'Previewing...' : 'Preview Sequence'}
              </Button>
            </div>

            {previewMode && (
              <div className="space-y-2">
                <Progress
                  size="lg"
                  value={previewProgress}
                  color="primary"
                  className="w-full"
                />
                <p className="text-sm text-slate-300 text-center">
                  Simulating feeding sequence... {Math.round(previewProgress)}%
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                <div className="text-lg font-bold text-blue-400">{timing.actuatorUp}s</div>
                <div className="text-xs text-blue-300">Lift Up</div>
              </div>
              <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-700">
                <div className="text-lg font-bold text-green-400">{timing.augerDuration}s</div>
                <div className="text-xs text-green-300">Dispense</div>
              </div>
              <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                <div className="text-lg font-bold text-purple-400">{timing.actuatorDown}s</div>
                <div className="text-xs text-purple-300">Lower Down</div>
              </div>
              <div className="text-center p-3 bg-orange-900/30 rounded-lg border border-orange-700">
                <div className="text-lg font-bold text-orange-400">{timing.blowerDuration}s</div>
                <div className="text-xs text-orange-300">Clean</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Total Sequence Time:</span>
                <span className="text-white font-bold">{getTotalFeedTime().toFixed(1)} seconds</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-300">Timing Quality:</span>
                <span className={`font-medium ${
                  quality.color === 'success' ? 'text-green-400' :
                  quality.color === 'warning' ? 'text-orange-400' :
                  quality.color === 'primary' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {quality.description}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={resetToDefaults}
                startContent={<RotateCcw className="w-4 h-4" />}
              >
                Reset to Defaults
              </Button>
              
              {hasChanges && (
                <Button
                  color="warning"
                  variant="flat"
                  size="sm"
                  onPress={resetToOriginal}
                  startContent={<RotateCcw className="w-4 h-4" />}
                >
                  Discard Changes
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-slate-400">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              <Button
                color="success"
                variant={hasChanges ? "solid" : "flat"}
                size="sm"
                onPress={saveDeviceTiming}
                isLoading={isSaving}
                isDisabled={!hasChanges}
                startContent={<Save className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </motion.div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default DeviceTimingControl; 