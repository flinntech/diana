#!/bin/bash
# Install DIANA watcher as a systemd user service
# Dynamically generates service file based on current environment

set -e

# Detect paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_PATH="$(which node)"
USER_SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$USER_SERVICE_DIR/diana-watcher.service"

# Detect OLLAMA_HOST (for WSL)
if [ -z "$OLLAMA_HOST" ]; then
  # Try to detect WSL host IP
  if grep -qi microsoft /proc/version 2>/dev/null; then
    WSL_HOST=$(ip route | grep default | awk '{print $3}')
    OLLAMA_HOST="${WSL_HOST:-localhost}"
  else
    OLLAMA_HOST="localhost"
  fi
fi

# Detect Windows username (for WSL paths)
if [ -z "$WINDOWS_USER" ]; then
  # Try to detect from /mnt/c/Users
  if [ -d "/mnt/c/Users" ]; then
    # Find a user directory that has Downloads and isn't a system account
    for dir in /mnt/c/Users/*/Downloads; do
      if [ -d "$dir" ]; then
        candidate=$(basename "$(dirname "$dir")")
        # Skip system accounts
        case "$candidate" in
          "Default"|"Default User"|"Public"|"All Users") continue ;;
          *) WINDOWS_USER="$candidate"; break ;;
        esac
      fi
    done
  fi
  WINDOWS_USER="${WINDOWS_USER:-$USER}"
fi

echo "Installing DIANA watcher service..."
echo ""
echo "Detected configuration:"
echo "  Node:         $NODE_PATH"
echo "  Project:      $PROJECT_DIR"
echo "  Ollama host:  $OLLAMA_HOST"
echo "  Windows user: $WINDOWS_USER"
echo ""

# Create user systemd directory if needed
mkdir -p "$USER_SERVICE_DIR"

# Generate service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=DIANA File Watcher - Monitors directories and creates organization proposals
After=network.target

[Service]
Type=simple
ExecStart=$NODE_PATH $PROJECT_DIR/dist/cli/index.js watch
WorkingDirectory=$PROJECT_DIR
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=HOME=$HOME
Environment=OLLAMA_HOST=$OLLAMA_HOST
Environment=WINDOWS_USER=$WINDOWS_USER

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=diana-watcher

[Install]
WantedBy=default.target
EOF

# Reload systemd
systemctl --user daemon-reload

echo "Service installed to: $SERVICE_FILE"
echo ""
echo "Available commands:"
echo ""
echo "  systemctl --user start diana-watcher    # Start the watcher"
echo "  systemctl --user stop diana-watcher     # Stop the watcher"
echo "  systemctl --user status diana-watcher   # Check status"
echo "  systemctl --user enable diana-watcher   # Start on login"
echo "  journalctl --user -u diana-watcher -f   # View logs"
echo ""
echo "To start now and enable on login:"
echo "  systemctl --user enable --now diana-watcher"
echo ""
