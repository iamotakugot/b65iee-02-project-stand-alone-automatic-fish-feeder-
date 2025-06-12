#!/usr/bin/env python3
"""
Fish Feeder Pi Auto-Start Script
================================
Automatically starts the fish feeder system on Pi boot
- Checks system readiness
- Starts main server
- Monitors for crashes and restarts
- Handles graceful shutdown
"""

import os
import sys
import time
import signal
import subprocess
import logging
from pathlib import Path
from datetime import datetime
import psutil

# System configuration
SCRIPT_DIR = Path(__file__).parent
MAIN_SCRIPT = SCRIPT_DIR / "main.py"
LOG_DIR = SCRIPT_DIR / "logs" / "autostart"
PID_FILE = SCRIPT_DIR / "fish_feeder.pid"
MAX_RESTART_ATTEMPTS = 5
RESTART_DELAY = 10  # seconds

class FishFeederAutoStart:
    def __init__(self):
        self.setup_logging()
        self.main_process = None
        self.restart_count = 0
        self.start_time = datetime.now()
        self.shutdown_requested = False
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def setup_logging(self):
        """Setup logging for auto-start system"""
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        log_file = LOG_DIR / f"autostart_{datetime.now().strftime('%Y%m%d')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True
        self.stop_main_process()
        
    def check_system_readiness(self):
        """Check if system is ready to start"""
        self.logger.info("🔍 Checking system readiness...")
        
        # Check if we're on Raspberry Pi
        try:
            with open('/proc/cpuinfo', 'r') as f:
                if 'raspberry' not in f.read().lower():
                    self.logger.warning("Not running on Raspberry Pi - some features may not work")
        except:
            pass
            
        # Check available memory
        memory = psutil.virtual_memory()
        if memory.available < 100 * 1024 * 1024:  # Less than 100MB
            self.logger.warning(f"Low memory: {memory.available / 1024 / 1024:.1f}MB available")
            
        # Check disk space
        disk = psutil.disk_usage('/')
        if disk.free < 500 * 1024 * 1024:  # Less than 500MB
            self.logger.warning(f"Low disk space: {disk.free / 1024 / 1024:.1f}MB free")
            
        # Check if main script exists
        if not MAIN_SCRIPT.exists():
            self.logger.error(f"Main script not found: {MAIN_SCRIPT}")
            return False
            
        # Check for existing PID file
        if PID_FILE.exists():
            try:
                with open(PID_FILE, 'r') as f:
                    old_pid = int(f.read().strip())
                    
                if psutil.pid_exists(old_pid):
                    self.logger.warning(f"Fish feeder already running with PID {old_pid}")
                    return False
                else:
                    # Remove stale PID file
                    PID_FILE.unlink()
                    self.logger.info("Removed stale PID file")
            except:
                PID_FILE.unlink()
                
        self.logger.info("✅ System readiness check passed")
        return True
        
    def write_pid_file(self, pid):
        """Write PID file"""
        try:
            with open(PID_FILE, 'w') as f:
                f.write(str(pid))
            self.logger.info(f"PID file written: {pid}")
        except Exception as e:
            self.logger.error(f"Failed to write PID file: {e}")
            
    def remove_pid_file(self):
        """Remove PID file"""
        try:
            if PID_FILE.exists():
                PID_FILE.unlink()
                self.logger.info("PID file removed")
        except Exception as e:
            self.logger.error(f"Failed to remove PID file: {e}")
            
    def start_main_process(self):
        """Start the main fish feeder process"""
        if self.main_process and self.main_process.poll() is None:
            self.logger.warning("Main process already running")
            return True
            
        try:
            self.logger.info("🚀 Starting Fish Feeder main process...")
            
            # Start main.py
            self.main_process = subprocess.Popen(
                [sys.executable, str(MAIN_SCRIPT)],
                cwd=str(SCRIPT_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Write PID file
            self.write_pid_file(self.main_process.pid)
            
            self.logger.info(f"✅ Main process started with PID: {self.main_process.pid}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start main process: {e}")
            return False
            
    def stop_main_process(self):
        """Stop the main process gracefully"""
        if not self.main_process:
            return
            
        try:
            self.logger.info("⏹️ Stopping main process...")
            
            # Try graceful shutdown first
            self.main_process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.main_process.wait(timeout=10)
                self.logger.info("✅ Main process stopped gracefully")
            except subprocess.TimeoutExpired:
                # Force kill if needed
                self.logger.warning("🔥 Force killing main process...")
                self.main_process.kill()
                self.main_process.wait()
                self.logger.info("💀 Main process force killed")
                
        except Exception as e:
            self.logger.error(f"❌ Error stopping main process: {e}")
        finally:
            self.main_process = None
            self.remove_pid_file()
            
    def monitor_main_process(self):
        """Monitor main process and restart if needed"""
        if not self.main_process:
            return False
            
        # Check if process is still running
        poll_result = self.main_process.poll()
        
        if poll_result is None:
            # Process is still running
            return True
        else:
            # Process has exited
            self.logger.error(f"❌ Main process exited with code: {poll_result}")
            
            # Read any final output
            try:
                output, _ = self.main_process.communicate(timeout=1)
                if output:
                    self.logger.info(f"Final output: {output}")
            except:
                pass
                
            self.main_process = None
            self.remove_pid_file()
            return False
            
    def should_restart(self):
        """Check if we should restart the process"""
        if self.shutdown_requested:
            return False
            
        if self.restart_count >= MAX_RESTART_ATTEMPTS:
            self.logger.error(f"❌ Max restart attempts ({MAX_RESTART_ATTEMPTS}) reached")
            return False
            
        # Don't restart too quickly
        uptime = (datetime.now() - self.start_time).total_seconds()
        if uptime < 60:  # Less than 1 minute uptime
            self.logger.warning(f"⚠️ Process crashed too quickly (uptime: {uptime:.1f}s)")
            
        return True
        
    def run(self):
        """Main auto-start loop"""
        self.logger.info("🐟 Fish Feeder Auto-Start System v1.0 Starting...")
        
        # Check system readiness
        if not self.check_system_readiness():
            self.logger.error("❌ System not ready, exiting")
            sys.exit(1)
            
        # Main monitoring loop
        while not self.shutdown_requested:
            try:
                # Start main process if not running
                if not self.main_process:
                    if self.should_restart():
                        self.restart_count += 1
                        self.start_time = datetime.now()
                        
                        self.logger.info(f"🔄 Restart attempt {self.restart_count}/{MAX_RESTART_ATTEMPTS}")
                        
                        if not self.start_main_process():
                            self.logger.error("❌ Failed to start main process")
                            time.sleep(RESTART_DELAY)
                            continue
                    else:
                        self.logger.info("💀 Not restarting, shutting down auto-start")
                        break
                        
                # Monitor the process
                if not self.monitor_main_process():
                    self.logger.warning("⚠️ Main process stopped, will restart...")
                    time.sleep(RESTART_DELAY)
                    continue
                    
                # Reset restart count if process has been running for a while
                uptime = (datetime.now() - self.start_time).total_seconds()
                if uptime > 300 and self.restart_count > 0:  # 5 minutes
                    self.logger.info(f"✅ Process stable for {uptime:.0f}s, resetting restart count")
                    self.restart_count = 0
                    
                # Sleep before next check
                time.sleep(5)
                
            except KeyboardInterrupt:
                self.logger.info("🛑 Keyboard interrupt received")
                break
            except Exception as e:
                self.logger.error(f"❌ Unexpected error in main loop: {e}")
                time.sleep(10)
                
        # Cleanup
        self.stop_main_process()
        self.logger.info("🏁 Fish Feeder Auto-Start System shutdown complete")

def main():
    """Entry point"""
    try:
        auto_start = FishFeederAutoStart()
        auto_start.run()
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 