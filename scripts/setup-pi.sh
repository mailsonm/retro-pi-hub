#!/usr/bin/env bash
# ==============================================================================
# Retro-Pi Hub - Automated Turnkey Setup for Raspberry Pi 3B / RetroPie
# Author: Mailson Maia Alves
# ==============================================================================
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_NAME="${SUDO_USER:-$USER}"

echo "=========================================================="
echo "🎮  RETRO-PI HUB - AUTOMATED RASPBERRY PI SETUP  🎮"
echo "=========================================================="
echo "Repository Path: $REPO_DIR"
echo "Target User:     $USER_NAME"
echo ""

# 1. Check or install Node.js 18+
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    echo "==> Node.js 18+ not detected. Installing Node.js 18 LTS for ARMv7..."
    curl -fsSL https://nodejs.org/dist/v18.20.4/node-v18.20.4-linux-armv7l.tar.xz | sudo tar -xJ --strip-components=1 -C /usr/local
else
    echo "==> Node.js detected: $(node -v) (npm $(npm -v))"
fi

# 2. Build monorepo packages
echo "==> Installing npm workspace dependencies..."
cd "$REPO_DIR"
npm install

echo "==> Building shared contracts and server daemon..."
npm run build -w packages/shared
npm run build -w packages/server

# 3. Install RetroPie runcommand hooks
echo "==> Installing RetroPie TV Session hooks..."
sudo bash "$REPO_DIR/scripts/install-retropie-hooks.sh"

# 4. Install systemd service
echo "==> Configuring systemd service..."
sudo cp "$REPO_DIR/scripts/retropi-hub.service" /etc/systemd/system/retropi-hub.service
# Adjust working directory and user if not default 'pi'
if [ "$USER_NAME" != "pi" ]; then
    sudo sed -i "s|User=pi|User=$USER_NAME|g" /etc/systemd/system/retropi-hub.service
    sudo sed -i "s|Group=pi|Group=$USER_NAME|g" /etc/systemd/system/retropi-hub.service
    sudo sed -i "s|/home/pi/retro-pi-hub|$REPO_DIR|g" /etc/systemd/system/retropi-hub.service
fi

sudo systemctl daemon-reload
sudo systemctl enable retropi-hub.service
sudo systemctl restart retropi-hub.service

echo ""
echo "=========================================================="
echo "🎉  SETUP COMPLETED SUCCESSFULLY!  🎉"
echo "=========================================================="
echo "The Retro-Pi Hub service is running in the background."
echo "Check status anytime with:"
echo "  sudo systemctl status retropi-hub.service"
echo ""
echo "Access from any smartphone, tablet or PC on your Wi-Fi:"
IP_ADDR=$(hostname -I | awk '{print $1}')
echo "👉 http://${IP_ADDR}:3000"
echo "=========================================================="
