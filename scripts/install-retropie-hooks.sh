#!/usr/bin/env bash
set -e

RETROPIE_CONFIG_DIR="/opt/retropie/configs/all"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing Retro-Pi Hub hooks into ${RETROPIE_CONFIG_DIR}..."

if [ ! -d "$RETROPIE_CONFIG_DIR" ]; then
    echo "Notice: $RETROPIE_CONFIG_DIR not found. Creating it for testing/standalone installation..."
    mkdir -p "$RETROPIE_CONFIG_DIR"
fi

# Ensure hooks are executable
chmod +x "${SCRIPT_DIR}/retropie/runcommand-onstart.sh"
chmod +x "${SCRIPT_DIR}/retropie/runcommand-onend.sh"

# Append or create onstart
if [ -f "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh" ]; then
    if ! grep -q "retroarch_active.json" "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"; then
        echo "" >> "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
        echo "# --- Retro-Pi Hub Hook ---" >> "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
        cat "${SCRIPT_DIR}/retropie/runcommand-onstart.sh" >> "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
        echo "Appended hook to existing runcommand-onstart.sh"
    else
        echo "Hook already present in runcommand-onstart.sh"
    fi
else
    cp "${SCRIPT_DIR}/retropie/runcommand-onstart.sh" "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
    chmod +x "${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
    echo "Created ${RETROPIE_CONFIG_DIR}/runcommand-onstart.sh"
fi

# Append or create onend
if [ -f "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh" ]; then
    if ! grep -q "retroarch_active.json" "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"; then
        echo "" >> "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
        echo "# --- Retro-Pi Hub Hook ---" >> "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
        cat "${SCRIPT_DIR}/retropie/runcommand-onend.sh" >> "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
        echo "Appended hook to existing runcommand-onend.sh"
    else
        echo "Hook already present in runcommand-onend.sh"
    fi
else
    cp "${SCRIPT_DIR}/retropie/runcommand-onend.sh" "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
    chmod +x "${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
    echo "Created ${RETROPIE_CONFIG_DIR}/runcommand-onend.sh"
fi

echo "==> RetroPie runcommand hooks installed successfully!"
