#!/bin/bash
# Fish Feeder Pi Auto-Start Setup Script
# =====================================

set -e

echo "🐟 Fish Feeder Pi Auto-Start Setup"
echo "=================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should NOT be run as root"
   echo "   Run as: ./setup_autostart.sh"
   exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/fish-feeder.service"
AUTOSTART_SCRIPT="$SCRIPT_DIR/autostart.py"

echo "📁 Script directory: $SCRIPT_DIR"

# Check if required files exist
if [[ ! -f "$SERVICE_FILE" ]]; then
    echo "❌ Service file not found: $SERVICE_FILE"
    exit 1
fi

if [[ ! -f "$AUTOSTART_SCRIPT" ]]; then
    echo "❌ Auto-start script not found: $AUTOSTART_SCRIPT"
    exit 1
fi

# Make autostart script executable
echo "🔧 Making autostart script executable..."
chmod +x "$AUTOSTART_SCRIPT"

# Update service file paths
echo "📝 Updating service file paths..."
TEMP_SERVICE="/tmp/fish-feeder.service"
sed "s|/home/pi/fish-feeder/pi-mqtt-server|$SCRIPT_DIR|g" "$SERVICE_FILE" > "$TEMP_SERVICE"

# Install service file
echo "📦 Installing systemd service..."
sudo cp "$TEMP_SERVICE" /etc/systemd/system/fish-feeder.service
sudo systemctl daemon-reload

# Enable service
echo "⚡ Enabling auto-start service..."
sudo systemctl enable fish-feeder.service

# Check if service is already running
if sudo systemctl is-active --quiet fish-feeder.service; then
    echo "🔄 Restarting service..."
    sudo systemctl restart fish-feeder.service
else
    echo "🚀 Starting service..."
    sudo systemctl start fish-feeder.service
fi

# Wait a moment and check status
sleep 2
echo ""
echo "📊 Service Status:"
sudo systemctl status fish-feeder.service --no-pager -l

echo ""
echo "✅ Auto-start setup completed!"
echo ""
echo "🔧 Useful commands:"
echo "   Start:   sudo systemctl start fish-feeder"
echo "   Stop:    sudo systemctl stop fish-feeder"
echo "   Restart: sudo systemctl restart fish-feeder"
echo "   Status:  sudo systemctl status fish-feeder"
echo "   Logs:    sudo journalctl -u fish-feeder -f"
echo "   Disable: sudo systemctl disable fish-feeder"
echo ""
echo "🎉 Fish Feeder will now start automatically on boot!"

# Clean up
rm -f "$TEMP_SERVICE" 