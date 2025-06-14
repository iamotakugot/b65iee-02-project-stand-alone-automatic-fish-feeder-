#!/bin/bash
# 🚀 Fish Feeder Pi Server - 1-Click Deploy Script
# ================================================
# Auto-install and setup Pi Server with auto-restart

set -e  # Exit on any error

echo "🐟 Fish Feeder Pi Server - 1-Click Deploy"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Step 1: Update system
print_step "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Python and pip
print_step "2. Installing Python and pip..."
sudo apt install -y python3 python3-pip python3-venv

# Step 3: Install system dependencies
print_step "3. Installing system dependencies..."
sudo apt install -y git curl wget

# Step 4: Create virtual environment
print_step "4. Creating Python virtual environment..."
python3 -m venv fish_feeder_env
source fish_feeder_env/bin/activate

# Step 5: Install Python packages
print_step "5. Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Step 6: Setup Firebase credentials
print_step "6. Setting up Firebase credentials..."
if [ ! -f "firebase-service-account.json" ]; then
    print_warning "Firebase service account file not found"
    print_warning "Please add firebase-service-account.json manually"
fi

# Step 7: Test main.py
print_step "7. Testing main.py..."
python3 -c "import main; print('✅ main.py imports successfully')"

# Step 8: Create systemd service
print_step "8. Creating systemd service..."
sudo tee /etc/systemd/system/fish-feeder.service > /dev/null <<EOF
[Unit]
Description=Fish Feeder Pi Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/fish_feeder_env/bin
ExecStart=$(pwd)/fish_feeder_env/bin/python3 $(pwd)/main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Step 9: Enable and start service
print_step "9. Enabling auto-start service..."
sudo systemctl daemon-reload
sudo systemctl enable fish-feeder.service

# Step 10: Start service
print_step "10. Starting Fish Feeder service..."
sudo systemctl start fish-feeder.service

# Step 11: Check service status
print_step "11. Checking service status..."
sleep 3
sudo systemctl status fish-feeder.service --no-pager

# Step 12: Setup log monitoring
print_step "12. Setting up log monitoring..."
echo "#!/bin/bash" > monitor_logs.sh
echo "sudo journalctl -u fish-feeder.service -f" >> monitor_logs.sh
chmod +x monitor_logs.sh

# Step 13: Create management scripts
print_step "13. Creating management scripts..."

# Start script
echo "#!/bin/bash" > start.sh
echo "sudo systemctl start fish-feeder.service" >> start.sh
echo "echo '✅ Fish Feeder service started'" >> start.sh
chmod +x start.sh

# Stop script
echo "#!/bin/bash" > stop.sh
echo "sudo systemctl stop fish-feeder.service" >> stop.sh
echo "echo '🛑 Fish Feeder service stopped'" >> stop.sh
chmod +x stop.sh

# Restart script
echo "#!/bin/bash" > restart.sh
echo "sudo systemctl restart fish-feeder.service" >> restart.sh
echo "echo '🔄 Fish Feeder service restarted'" >> restart.sh
chmod +x restart.sh

# Status script
echo "#!/bin/bash" > status.sh
echo "sudo systemctl status fish-feeder.service --no-pager" >> status.sh
chmod +x status.sh

print_status "🎉 Deployment completed successfully!"
print_status ""
print_status "📋 Available commands:"
print_status "  ./start.sh     - Start the service"
print_status "  ./stop.sh      - Stop the service"
print_status "  ./restart.sh   - Restart the service"
print_status "  ./status.sh    - Check service status"
print_status "  ./monitor_logs.sh - Monitor live logs"
print_status ""
print_status "🌐 Web API will be available at: http://$(hostname -I | awk '{print $1}'):5000"
print_status "📊 Service will auto-restart after power failure"
print_status ""
print_status "✅ Fish Feeder Pi Server is now running!" 