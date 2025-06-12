import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, CardHeader, Button, Divider, Chip, Select, SelectItem, Progress, Switch } from '@nextui-org/react';
import { Camera, Video, VideoOff, Settings, Download, Play, Pause, RotateCcw, Trash2, Folder, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../config/api';

interface Recording {
  filename: string;
  timestamp: string;
  size: number;
  duration: number;
}

interface CameraControlProps {
  className?: string;
  onFeedingStart?: () => void;
  onFeedingEnd?: () => void;
}

const CameraControl: React.FC<CameraControlProps> = ({ 
  className = "",
  onFeedingStart,
  onFeedingEnd 
}) => {
  // Camera States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentResolution, setCurrentResolution] = useState('640x480');
  const [autoRecording, setAutoRecording] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stream States
  const [streamActive, setStreamActive] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'disconnected' | 'connected' | 'streaming'>('disconnected');
  
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const streamCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Resolution options
  const resolutionOptions = [
    { value: '320x240', label: '320x240 (Economy)', description: 'Ultra low bandwidth' },
    { value: '640x480', label: '640x480 (Standard)', description: 'Good quality' },
    { value: '1280x720', label: '1280x720 (HD)', description: 'High quality' },
    { value: '1920x1080', label: '1920x1080 (Full HD)', description: 'Best quality' }
  ];

  // Initialize camera and load recordings
  useEffect(() => {
    initializeCamera();
    loadRecordings();
    
    // Check stream status periodically
    streamCheckInterval.current = setInterval(checkStreamStatus, 5000);
    
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (streamCheckInterval.current) clearInterval(streamCheckInterval.current);
    };
  }, []);

  // Auto recording on feeding (ใหม่!)
  useEffect(() => {
    if (autoRecording) {
      // Listen for feeding events
      const handleFeedingStart = async () => {
        if (!isRecording) {
          await startRecording('auto_feed');
          onFeedingStart?.();
        }
      };

      const handleFeedingEnd = async () => {
        if (isRecording) {
          await stopRecording();
          onFeedingEnd?.();
        }
      };

      // Simulate listening to Arduino signals (in real implementation, this would be WebSocket)
      window.addEventListener('arduino:actuator:up', handleFeedingStart);
      window.addEventListener('arduino:blower:off', handleFeedingEnd);

      return () => {
        window.removeEventListener('arduino:actuator:up', handleFeedingStart);
        window.removeEventListener('arduino:blower:off', handleFeedingEnd);
      };
    }
  }, [autoRecording, isRecording, onFeedingStart, onFeedingEnd]);

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      const statusResponse = await apiClient.getRecordingStatus();
      if (statusResponse?.is_recording) {
        setIsRecording(true);
        startRecordingTimer();
      }
      
      // Set stream URL - dynamic PageKite detection
      const isPageKite = window.location.hostname.includes('pagekite.me');
      if (isPageKite) {
        setStreamUrl(`${window.location.origin}/api/camera/stream`);
      } else {
        setStreamUrl('http://localhost:5000/api/camera/stream');
      }
      setCameraStatus('connected');
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const checkStreamStatus = async () => {
    try {
      const response = await fetch(streamUrl, { method: 'HEAD' });
      if (response.ok) {
        setCameraStatus('streaming');
        setStreamActive(true);
      } else {
        setCameraStatus('connected');
        setStreamActive(false);
      }
    } catch (error) {
      setCameraStatus('disconnected');
      setStreamActive(false);
    }
  };

  const loadRecordings = async () => {
    try {
      const response = await apiClient.getRecordings();
      if (response?.recordings) {
        setRecordings(response.recordings);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const startRecording = async (prefix = 'manual') => {
    if (isRecording) return;
    
    try {
      setIsLoading(true);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${prefix}_${timestamp}.mp4`;
      
      const response = await apiClient.startRecording({
        filename,
        resolution: currentResolution
      });
      
      if (response?.status === 'success') {
        setIsRecording(true);
        setRecordingDuration(0);
        startRecordingTimer();
        
        // Emit event for Arduino listening
        window.dispatchEvent(new CustomEvent('camera:recording:start'));
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.stopRecording();
      
      if (response?.status === 'success') {
        setIsRecording(false);
        stopRecordingTimer();
        await loadRecordings(); // Refresh recordings list
        
        // Emit event for Arduino listening
        window.dispatchEvent(new CustomEvent('camera:recording:stop'));
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecordingTimer = () => {
    recordingInterval.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  };

  const changeResolution = async (resolution: string) => {
    try {
      setIsLoading(true);
      const [width, height] = resolution.split('x').map(Number);
      await apiClient.setCameraResolution(width, height);
      setCurrentResolution(resolution);
    } catch (error) {
      console.error('Failed to change resolution:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : 
           `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    switch (cameraStatus) {
      case 'streaming': return 'success';
      case 'connected': return 'warning';
      default: return 'danger';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${className}`}
    >
      <Card className="bg-gradient-to-br from-slate-900/90 to-blue-900/90 backdrop-blur border border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: isRecording ? [1, 1.2, 1] : 1,
                rotate: isLoading ? 360 : 0 
              }}
              transition={{ 
                scale: { repeat: isRecording ? Infinity : 0, duration: 1 },
                rotate: { duration: 1, repeat: isLoading ? Infinity : 0 }
              }}
            >
              <Camera className={`w-6 h-6 ${isRecording ? 'text-red-400' : 'text-blue-400'}`} />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-white">Camera Control</h3>
              <p className="text-sm text-slate-400">
                {isRecording ? `Recording: ${formatDuration(recordingDuration)}` : 'Ready to record'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Chip
              color={getStatusColor()}
              variant="flat"
              size="sm"
              startContent={
                cameraStatus === 'streaming' ? <Video className="w-3 h-3" /> :
                cameraStatus === 'connected' ? <Camera className="w-3 h-3" /> :
                <VideoOff className="w-3 h-3" />
              }
            >
              {cameraStatus === 'streaming' ? 'Live' :
               cameraStatus === 'connected' ? 'Ready' : 'Offline'}
            </Chip>
            
            {isRecording && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Chip color="danger" variant="solid" size="sm">
                  ● REC
                </Chip>
              </motion.div>
            )}
          </div>
        </CardHeader>

        <Divider className="bg-slate-600" />

        <CardBody className="space-y-6">
          {/* Live Stream Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600"
          >
            {streamActive ? (
              <img
                src={streamUrl}
                alt="Camera Stream"
                className="w-full h-full object-cover"
                onError={() => setStreamActive(false)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Monitor className="w-12 h-12 mx-auto mb-2" />
                  <p>Camera Stream Unavailable</p>
                  <p className="text-sm">Check connection</p>
                </div>
              </div>
            )}
            
            {/* Recording Overlay */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
                <span className="text-white font-medium text-sm">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}

            {/* Resolution Display */}
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-white text-xs">
              {currentResolution}
            </div>
          </motion.div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recording Controls */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h4 className="text-white font-medium flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                Recording Controls
              </h4>

              <div className="flex items-center gap-3">
                <Button
                  color={isRecording ? "danger" : "success"}
                  variant="solid"
                  size="lg"
                  onPress={isRecording ? stopRecording : () => startRecording('manual')}
                  isLoading={isLoading}
                  startContent={
                    isRecording ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />
                  }
                  className="flex-1"
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-300 text-sm">Auto Record on Feeding</span>
                <Switch
                  isSelected={autoRecording}
                  onValueChange={setAutoRecording}
                  color="success"
                  size="sm"
                />
              </div>

              {isRecording && (
                <div className="space-y-2">
                  <Progress
                    value={(recordingDuration % 60) * (100/60)}
                    color="danger"
                    className="w-full"
                    size="sm"
                  />
                  <p className="text-slate-400 text-sm text-center">
                    Recording in progress... {formatDuration(recordingDuration)}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h4 className="text-white font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Camera Settings
              </h4>

              <Select
                label="Video Resolution"
                selectedKeys={[currentResolution]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  if (selected) changeResolution(selected);
                }}
                variant="bordered"
                size="sm"
                className="w-full"
              >
                {resolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-slate-400">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="flat"
                  size="sm"
                  startContent={<RotateCcw className="w-4 h-4" />}
                  onPress={initializeCamera}
                  isLoading={isLoading}
                >
                  Refresh
                </Button>
                <Button
                  variant="flat"
                  size="sm"
                  startContent={<Folder className="w-4 h-4" />}
                  onPress={loadRecordings}
                >
                  Reload Files
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Recordings List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Folder className="w-4 h-4 text-purple-400" />
                Recorded Videos ({recordings.length})
              </h4>
              <Chip size="sm" color="primary" variant="flat">
                128GB Local Storage
              </Chip>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2">
              <AnimatePresence>
                {recordings.slice(0, 10).map((recording, index) => (
                  <motion.div
                    key={recording.filename}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-600"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {recording.filename.replace(/^(manual_|auto_feed_)/, '')}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {new Date(recording.timestamp).toLocaleString()} • {formatFileSize(recording.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        color={recording.filename.startsWith('auto_') ? 'success' : 'primary'}
                        variant="flat"
                      >
                        {recording.filename.startsWith('auto_') ? 'Auto' : 'Manual'}
                      </Chip>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<Download className="w-3 h-3" />}
                      >
                        Download
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {recordings.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recordings yet</p>
                  <p className="text-sm">Start recording to see videos here</p>
                </div>
              )}
            </div>
          </motion.div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default CameraControl; 