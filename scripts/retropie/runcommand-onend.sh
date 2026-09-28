#!/usr/bin/env bash
# /opt/retropie/configs/all/runcommand-onend.sh
# Hook executed by RetroPie when exiting an emulator.

# Remove the active lock file to signal the TV session has ended
rm -f /dev/shm/retroarch_active.json /dev/shm/retroarch_active.json.tmp
