# 7. TV Session Detection: Runcommand Hooks with Process Fallback

Date: 2026-09-27
Status: Accepted

## Context
To prevent race conditions where a web player overwrites an in-game save while the living room TV is actively playing and writing to the same ROM save file, the Hub Server must reliably detect when a game session is active on the TV with near-zero CPU overhead.

## Decision
1. **Primary Mechanism - RetroPie Runcommand Hooks:**
   We integrate with the standard RetroPie lifecycle hooks (`runcommand-onstart.sh` and `runcommand-onend.sh` located in `/opt/retropie/configs/all/`).
   - On game launch, the hook writes a lightweight JSON file into shared memory: `/dev/shm/retroarch_active.json` containing `{ system, romPath, romName, pid, startedAt }`.
   - On game exit, the hook removes `/dev/shm/retroarch_active.json`.
   - The Hub Server watches this file via inotify (`fs.watch`), resulting in 0% CPU polling overhead.
2. **Fallback Mechanism - OS Process Polling:**
   If the hook file is not present or the server runs on non-RetroPie platforms (generic Linux/Debian or Batocera), the Hub Server uses a fallback check querying the process table (`pgrep -x retroarch`) with command-line argument parsing to detect the running ROM.

## Consequences
### Positive
- Zero CPU usage in the standard RetroPie setup (RAM-backed inotify events).
- Instant detection (<10ms) of TV launch and exit events.
- Graceful degradation on alternative Linux distributions.

### Negative / Trade-offs
- Initial setup requires placing or symlinking the hook scripts in RetroPie's configuration directory.
