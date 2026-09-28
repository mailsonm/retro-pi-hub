#!/usr/bin/env bash
# /opt/retropie/configs/all/runcommand-onstart.sh
# Hook executed by RetroPie when launching an emulator.
# Arguments:
#   $1 = system (e.g. snes)
#   $2 = emulator/core
#   $3 = full path to ROM file
#   $4 = command line

SYSTEM="$1"
EMULATOR="$2"
ROM_PATH="$3"
COMMAND="$4"

if [ -n "$ROM_PATH" ]; then
    ROM_FILENAME=$(basename "$ROM_PATH")
    ROM_NAME="${ROM_FILENAME%.*}"
    PID=$$
    STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Atomic write to RAM-backed /dev/shm
    cat <<EOF > /dev/shm/retroarch_active.json.tmp
{
  "system": "$SYSTEM",
  "romName": "$ROM_NAME",
  "romPath": "$ROM_PATH",
  "emulator": "$EMULATOR",
  "pid": $PID,
  "startedAt": "$STARTED_AT"
}
EOF
    mv -f /dev/shm/retroarch_active.json.tmp /dev/shm/retroarch_active.json
fi
