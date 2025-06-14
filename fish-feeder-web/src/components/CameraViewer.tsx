import { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { 
  IoMdCamera, 
  IoMdRefresh, 
  IoMdDownload,
  IoMdVideocam,
  IoMdPlay,
  IoMdPause
} from "react-icons/io";
import { FaExpand, FaCompress } from "react-icons/fa";
import { API_CONFIG } from "../config/api";
import { logger } from "../utils/logger";

interface CameraViewerProps {
  className?: string;
  autoRefresh?: boolean;
  showControls?: boolean;
}

const CameraViewer: React.FC<CameraViewerProps> = ({ 
  className = "", 
  autoRefresh = true,
  showControls = true 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get camera URLs (supports both local and PageKite)
  const getCameraUrls = () => {
    // In Firebase hosting mode, disable camera functionality
    if (API_CONFIG.FIREBASE_ONLY_MODE) {
      logger.info('CAMERA', 'DISABLED_FIREBASE_MODE', { 
        reason: 'Camera disabled in Firebase hosting mode' 
      });
      return {
        stream: '',
        snapshot: '',
        status: ''
      };
    }

    const baseUrl = API_CONFIG.BASE_URL;
    return {
      stream: `${baseUrl}/api/camera/stream`,
      snapshot: `${baseUrl}/api/camera/snapshot`,
      status: `${baseUrl}/api/camera/status`
    };
  };

  // Start camera streaming
  const startStreaming = () => {
    logger.buttonPress('CAMERA_START_STREAMING', 'CameraViewer');
    
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);

    const urls = getCameraUrls();
    
    // Check if camera is disabled in Firebase mode
    if (!urls.stream) {
      setIsStreaming(false);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setError('📷 Camera unavailable in Firebase hosting mode. Use local development mode for camera access.');
      logger.warn('CAMERA', 'DISABLED_MODE', { mode: 'Firebase hosting' });
      return;
    }
    
    if (imgRef.current) {
      imgRef.current.src = urls.stream;
      
      imgRef.current.onload = () => {
        setIsStreaming(true);
        setConnectionStatus('connected');
        setIsLoading(false);
        setError(null);
        logger.info('CAMERA', 'STREAMING_STARTED', { url: urls.stream });
      };

      imgRef.current.onerror = () => {
        setIsStreaming(false);
        setConnectionStatus('disconnected');
        setIsLoading(false);
        setError('📷 Camera connection failed. Please check Pi server.');
        logger.error('CAMERA', 'STREAMING_FAILED', { url: urls.stream });
      };
    }
  };

  // Stop camera streaming
  const stopStreaming = () => {
    setIsLoading(true);
    if (imgRef.current) {
      imgRef.current.src = '';
    }
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    setIsLoading(false);
  };

  // Take snapshot
  const takeSnapshot = async () => {
    logger.buttonPress('CAMERA_TAKE_SNAPSHOT', 'CameraViewer');
    
    setIsLoading(true);
    try {
      const urls = getCameraUrls();
      
      // Check if camera is disabled in Firebase mode
      if (!urls.snapshot) {
        setError('❌ Snapshot unavailable in Firebase hosting mode.');
        logger.warn('CAMERA', 'SNAPSHOT_DISABLED', { mode: 'Firebase hosting' });
        return;
      }
      
      const response = await fetch(urls.snapshot);
      
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setLastSnapshot(imageUrl);
        
        // Auto-download snapshot
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `fish-feeder-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logger.info('CAMERA', 'SNAPSHOT_SUCCESS', { filename: link.download });
      } else {
        throw new Error('Snapshot failed');
      }
    } catch (error) {
      setError('❌ Snapshot failed. Check camera connection.');
      logger.error('CAMERA', 'SNAPSHOT_FAILED', { error });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Check camera status
  const checkCameraStatus = async () => {
    try {
      const urls = getCameraUrls();
      const response = await fetch(urls.status);
      const data = await response.json();
      
      if (data.camera_active) {
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.log('Camera status check failed:', error);
    }
  };

  // Auto-start streaming on mount
  useEffect(() => {
    if (autoRefresh) {
      startStreaming();
    }
    
    // ⚡ EVENT-DRIVEN CAMERA STATUS - No setInterval polling!
    // Status checks are now triggered by streaming events
    
    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (lastSnapshot) {
        URL.revokeObjectURL(lastSnapshot);
      }
    };
  }, []);

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <p className="text-md font-semibold">📷 Pi Camera Live Stream</p>
          <p className="text-small text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connected' && '🟢 Connected via PageKite'} 
            {connectionStatus === 'connecting' && '🟡 Connecting...'} 
            {connectionStatus === 'disconnected' && '🔴 Disconnected'}
          </p>
        </div>
      </div>
      
      <div className="px-3 py-3">
        {/* Camera Stream Container */}
        <div 
          ref={containerRef}
          className={`relative bg-black rounded-lg overflow-hidden ${
            isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'
          }`}
        >
          {/* Main Camera Stream */}
          <img
            ref={imgRef}
            alt="Fish Feeder Camera Stream"
            className={`w-full h-full object-contain ${
              isStreaming ? 'block' : 'hidden'
            }`}
            crossOrigin="anonymous"
          />
          
          {/* Loading/Error States */}
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              {isLoading ? (
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>📡 Connecting to camera...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-400">
                  <IoMdCamera className="mx-auto text-4xl mb-2" />
                  <p>{error}</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <IoMdCamera className="mx-auto text-4xl mb-2" />
                  <p>📷 Camera stream offline</p>
                  <p className="text-sm mt-1">Click start to connect</p>
                </div>
              )}
            </div>
          )}
          
          {/* Fullscreen Toggle */}
          {isStreaming && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          )}
          
          {/* Connection Status Indicator */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-500/80 text-white' :
            connectionStatus === 'connecting' ? 'bg-yellow-500/80 text-white' :
            'bg-red-500/80 text-white'
          }`}>
            {connectionStatus === 'connected' && '🟢 LIVE'}
            {connectionStatus === 'connecting' && '🟡 CONNECTING'}
            {connectionStatus === 'disconnected' && '🔴 OFFLINE'}
          </div>
        </div>

        {/* Camera Controls */}
        {showControls && (
          <div className="flex gap-2 mt-4">
            <Button
              color={isStreaming ? "danger" : "success"}
              startContent={isStreaming ? <IoMdPause /> : <IoMdPlay />}
              onPress={isStreaming ? stopStreaming : startStreaming}
              isLoading={isLoading}
              size="sm"
            >
              {isStreaming ? "Stop" : "Start"}
            </Button>
            
            <Button
              color="primary"
              startContent={<IoMdCamera />}
              onPress={takeSnapshot}
              isLoading={isLoading}
              isDisabled={!isStreaming}
              size="sm"
            >
              Snapshot
            </Button>
            
            <Button
              color="default"
              startContent={<IoMdRefresh />}
              onPress={() => {
                stopStreaming();
                startStreaming();
              }}
              isLoading={isLoading}
              size="sm"
              variant="bordered"
            >
              Refresh
            </Button>

            <div className="flex-1" />
            
            {/* Auto-refresh Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Auto</span>
              <Switch
                size="sm"
                isSelected={autoRefresh}
                onValueChange={(checked) => {
                  if (checked && !isStreaming) {
                    startStreaming();
                  } else if (!checked && isStreaming) {
                    stopStreaming();
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* PageKite Info */}
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs">
            <IoMdVideocam />
            <span className="font-medium">PageKite External Access:</span>
            <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
              https://b65iee02.pagekite.me/api/camera/stream
            </code>
          </div>
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
            📡 Camera accessible from anywhere via secure tunnel
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraViewer; 