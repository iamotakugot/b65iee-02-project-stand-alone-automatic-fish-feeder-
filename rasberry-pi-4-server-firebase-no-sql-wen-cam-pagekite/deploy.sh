#!/bin/bash
# Fish Feeder Pi Server - Production Deployment Script
# Automated setup for Raspberry Pi 4 with Firebase integration

set -e  # Exit on any error

# Configuration
PROJECT_NAME="fish-feeder"
SERVICE_NAME="fish-feeder"
PYTHON_ENV="venv"
BACKUP_DIR="fish_feeder_data/backups"
ARCHIVE_DIR="fish_feeder_data/archives"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SERVICE_NAME="fish-feeder"
PROJECT_DIR="$(pwd)"
USER="$(whoami)"
PYTHON_ENV="$PROJECT_DIR/venv"
LOG_FILE="/var/log/fish-feeder.log"

echo -e "${BLUE}Fish Feeder Pi Server Deployment Script${NC}"
echo -e "${BLUE}==========================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please run this script as a regular user, not root"
        print_status "The script will use sudo when needed"
        exit 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 is not installed"
        print_status "Installing Python3..."
        sudo apt update && sudo apt install -y python3 python3-pip python3-venv
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is not installed"
        sudo apt install -y python3-pip
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_warning "Git is not installed, installing..."
        sudo apt install -y git
    fi
    
    print_status "System requirements checked"
}

# Function to setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."
    
    # Remove existing venv if it exists
    if [ -d "$PYTHON_ENV" ]; then
        print_warning "Removing existing virtual environment..."
        rm -rf "$PYTHON_ENV"
    fi
    
    # Create new virtual environment
    python3 -m venv "$PYTHON_ENV"
    
    # Activate and install dependencies
    source "$PYTHON_ENV/bin/activate"
    pip install --upgrade pip
    pip install -r requirements.txt
    
    print_status "Python environment setup complete"
}

# Function to setup Firebase credentials
setup_firebase() {
    print_status "Checking Firebase configuration..."
    
    if [ ! -f "firebase-service-account.json" ]; then
        print_warning "Firebase service account not found!"
        print_status "Please add your firebase-service-account.json file to this directory"
        print_status "You can continue without Firebase (will run in degraded mode)"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_status "Firebase configuration found"
    fi
}

# Function to detect and configure Arduino port
setup_arduino_port() {
    print_status "Detecting Arduino ports..."
    
    # Check for common Arduino ports
    ARDUINO_PORTS=("/dev/ttyUSB0" "/dev/ttyUSB1" "/dev/ttyACM0" "/dev/ttyACM1")
    FOUND_PORT=""
    
    for port in "${ARDUINO_PORTS[@]}"; do
        if [ -e "$port" ]; then
            print_status "Found potential Arduino port: $port"
            FOUND_PORT="$port"
            break
        fi
    done
    
    if [ -n "$FOUND_PORT" ]; then
        # Add user to dialout group for serial access
        sudo usermod -a -G dialout "$USER"
        print_status "Added $USER to dialout group for serial access"
        print_warning "You may need to log out and back in for group changes to take effect"
    else
        print_warning "No Arduino port detected. Auto-detection will be used at runtime."
    fi
}

# Function to kill existing processes
kill_existing_processes() {
    print_status "Checking for existing processes..."
    
    # Kill any existing Python processes running main.py
    EXISTING_PIDS=$(pgrep -f "python.*main.py" 2>/dev/null)
    if [ -n "$EXISTING_PIDS" ]; then
        print_warning "Killing existing processes: $EXISTING_PIDS"
        echo "$EXISTING_PIDS" | xargs -r kill -TERM
        sleep 2
        
        # Force kill if still running
        STILL_RUNNING=$(pgrep -f "python.*main.py" 2>/dev/null)
        if [ -n "$STILL_RUNNING" ]; then
            echo "$STILL_RUNNING" | xargs -r kill -KILL
            print_status "Force killed remaining processes"
        fi
    fi
    
    # Stop systemd service if running
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        print_status "Stopping existing systemd service..."
        sudo systemctl stop "$SERVICE_NAME"
    fi
}

# Function to create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    # Create service file
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<EOF
[Unit]
Description=Fish Feeder IoT Pi Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PYTHON_ENV/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=$PROJECT_DIR
ExecStart=$PYTHON_ENV/bin/python main.py
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30

# Logging
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

# Resource limits
LimitNOFILE=1024
MemoryMax=512M

# Security
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

    # Set proper permissions
    sudo chmod 644 "/etc/systemd/system/$SERVICE_NAME.service"
    
    # Create log file with proper permissions
    sudo touch "$LOG_FILE"
    sudo chown "$USER:$USER" "$LOG_FILE"
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    print_status "Systemd service created and enabled"
}

# Function to create monitoring script
create_monitoring_script() {
    print_status "Creating monitoring script..."
    
    cat > monitor.sh <<'EOF'
#!/bin/bash
# Fish Feeder Monitoring Script

SERVICE_NAME="fish-feeder"
LOG_FILE="/var/log/fish-feeder.log"

# Function to check service status
check_service() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "Service is running"
        return 0
    else
        echo "Service is not running"
        return 1
    fi
}

# Function to show recent logs
show_logs() {
    echo "Recent logs (last 20 lines):"
    tail -n 20 "$LOG_FILE" 2>/dev/null || echo "No logs available"
}

# Function to restart service
restart_service() {
    echo "Restarting service..."
    sudo systemctl restart "$SERVICE_NAME"
    sleep 3
    check_service
}

# Function to show status
show_status() {
    echo "Fish Feeder Service Status"
    echo "=========================="
    systemctl status "$SERVICE_NAME" --no-pager -l
    echo ""
    echo "Memory usage:"
    ps aux | grep "[p]ython.*main.py" | awk '{print $4"% memory, "$6" KB"}' || echo "Process not found"
    echo ""
    echo "Network connections:"
    ss -tulpn | grep python || echo "No Python network connections"
}

# Main menu
case "${1:-status}" in
    "status"|"s")
        show_status
        ;;
    "logs"|"l")
        show_logs
        ;;
    "restart"|"r")
        restart_service
        ;;
    "check"|"c")
        check_service
        ;;
    "monitor"|"m")
        echo "Monitoring mode (Ctrl+C to exit)"
        while true; do
            clear
            show_status
            echo ""
            show_logs
            sleep 5
        done
        ;;
    *)
        echo "Fish Feeder Monitor"
        echo "Usage: $0 [status|logs|restart|check|monitor]"
        echo ""
        echo "Commands:"
        echo "  status  (s) - Show detailed status"
        echo "  logs    (l) - Show recent logs"
        echo "  restart (r) - Restart service"
        echo "  check   (c) - Quick health check"
        echo "  monitor (m) - Continuous monitoring"
        ;;
esac
EOF

    chmod +x monitor.sh
    print_status "Monitoring script created"
}

# Function to create backup script
create_backup_script() {
    print_status "Creating backup management script..."
    
    cat > backup_manager.sh <<'EOF'
#!/bin/bash
# Fish Feeder Backup Manager

BACKUP_DIR="data_backup"
ARCHIVE_DIR="archived_backups"

# Function to show backup statistics
show_stats() {
    echo "Backup Statistics"
    echo "==================="
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return
    fi
    
    echo "Backup directory: $BACKUP_DIR"
    echo "Total size: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)"
    echo "Date directories: $(find $BACKUP_DIR -maxdepth 1 -type d | wc -l)"
    echo "Total JSON files: $(find $BACKUP_DIR -name "*.json" | wc -l)"
    echo ""
    
    echo "Recent dates:"
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" | sort | tail -7
    echo ""
    
    echo "Disk usage by date:"
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" | sort | tail -5 | xargs -I {} du -sh {}
}

# Function to clean old backups
clean_old() {
    local days=${1:-30}
    echo "Cleaning backups older than $days days..."
    
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" -mtime +$days -exec rm -rf {} \;
    echo "Cleanup complete"
}

# Function to archive backups
archive_backups() {
    local days=${1:-7}
    echo "Archiving backups older than $days days..."
    
    mkdir -p "$ARCHIVE_DIR"
    
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" -mtime +$days | while read dir; do
        if [ -d "$dir" ]; then
            date_name=$(basename "$dir")
            echo "Archiving $date_name..."
            tar -czf "$ARCHIVE_DIR/${date_name}.tar.gz" -C "$BACKUP_DIR" "$date_name"
            rm -rf "$dir"
        fi
    done
    
    echo "Archive complete"
}

# Function to restore from archive
restore_backup() {
    local date=$1
    if [ -z "$date" ]; then
        echo "Usage: restore <YYYY-MM-DD>"
        return 1
    fi
    
    local archive_file="$ARCHIVE_DIR/${date}.tar.gz"
    if [ ! -f "$archive_file" ]; then
        echo "Archive not found: $archive_file"
        return 1
    fi
    
    echo "Restoring backup for $date..."
    tar -xzf "$archive_file" -C "$BACKUP_DIR"
    echo "Restore complete"
}

# Main menu
case "${1:-stats}" in
    "stats"|"s")
        show_stats
        ;;
    "clean"|"c")
        clean_old ${2:-30}
        ;;
    "archive"|"a")
        archive_backups ${2:-7}
        ;;
    "restore"|"r")
        restore_backup $2
        ;;
    *)
        echo "Fish Feeder Backup Manager"
        echo "Usage: $0 [stats|clean|archive|restore]"
        echo ""
        echo "Commands:"
        echo "  stats              - Show backup statistics"
        echo "  clean [days]       - Clean backups older than N days (default: 30)"
        echo "  archive [days]     - Archive backups older than N days (default: 7)"
        echo "  restore <date>     - Restore backup from archive (YYYY-MM-DD)"
        ;;
esac
EOF

    chmod +x backup_manager.sh
    print_status "Backup manager created"
}

# Function to test the installation
test_installation() {
    print_status "Testing installation..."
    
    # Test Python environment
    if source "$PYTHON_ENV/bin/activate" && python -c "import serial, firebase_admin, flask" 2>/dev/null; then
        print_status "Python dependencies test passed"
    else
        print_error "Python dependencies test failed"
        return 1
    fi
    
    # Test service file
    if sudo systemctl status "$SERVICE_NAME" --no-pager >/dev/null 2>&1; then
        print_status "Systemd service test passed"
    else
        print_warning "Systemd service not yet started"
    fi
    
    print_status "Installation test complete"
}

# Function to start the service
start_service() {
    print_status "Starting Fish Feeder service..."
    
    sudo systemctl start "$SERVICE_NAME"
    sleep 3
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Service started successfully"
        print_status "View logs with: journalctl -u $SERVICE_NAME -f"
        print_status "Monitor with: ./monitor.sh"
    else
        print_error "Service failed to start"
        print_status "Check logs with: journalctl -u $SERVICE_NAME"
        return 1
    fi
}

# Main deployment function
main() {
    print_status "Starting Fish Feeder Pi Server deployment..."
    
    check_root
    check_requirements
    setup_python_env
    setup_firebase
    setup_arduino_port
    kill_existing_processes
    create_systemd_service
    create_monitoring_script
    create_backup_script
    test_installation
    
    print_status "Deployment complete! 🎉"
    print_status ""
    print_status "Next steps:"
    print_status "1. Start the service: ./deploy.sh start"
    print_status "2. Monitor status: ./monitor.sh"
    print_status "3. View logs: ./monitor.sh logs"
    print_status "4. Access web interface: https://b65iee-02-fishfeederstandalone.web.app/arduino-test"
    print_status ""
    print_status "Service will auto-start on system boot"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy"|"d")
        main
        ;;
    "start"|"s")
        start_service
        ;;
    "stop")
        sudo systemctl stop "$SERVICE_NAME"
        print_status "Service stopped"
        ;;
    "restart")
        sudo systemctl restart "$SERVICE_NAME"
        print_status "Service restarted"
        ;;
    "status")
        systemctl status "$SERVICE_NAME" --no-pager
        ;;
    "uninstall")
        print_warning "Uninstalling Fish Feeder service..."
        sudo systemctl stop "$SERVICE_NAME" 2>/dev/null
        sudo systemctl disable "$SERVICE_NAME" 2>/dev/null
        sudo rm -f "/etc/systemd/system/$SERVICE_NAME.service"
        sudo systemctl daemon-reload
        print_status "Service uninstalled"
        ;;
    *)
        echo "Fish Feeder Pi Server Deployment"
        echo "Usage: $0 [deploy|start|stop|restart|status|uninstall]"
        echo ""
        echo "Commands:"
        echo "  deploy     - Full deployment setup"
        echo "  start      - Start the service"
        echo "  stop       - Stop the service"
        echo "  restart    - Restart the service"
        echo "  status     - Show service status"
        echo "  uninstall  - Remove service"
        ;;
esac 