# Ticket: 04 - Active TV Session Lock & Process Fallback
**Status:** completed  
**Blocked by:** Ticket 01  

## What to build
Implement `TvSessionDetector` in `packages/server` to determine whether RetroArch is currently running an active game on the HDMI TV.
Primary mechanism: inspects `/dev/shm/retroarch_active.json` written by RetroPie runcommand hooks.
Secondary fallback mechanism: checks active system processes for `retroarch`.
Expose `GET /api/saves/:system/:rom/lock-status` to report real-time lock state.

## Acceptance Criteria
- [x] `TvSessionDetector.isLocked(system, rom)` returns `true` when the lock file matches the active game.
- [x] Returns `false` when no active game or a different game is running.
- [x] Fastify route `GET /api/saves/:system/:rom/lock-status` returns `TvLockStatusDTO`.
- [x] File watcher (`fs.watch`) updates internal memory state without blocking or polling CPU.
- [x] Seam Test passes: `packages/server/tests/tv-lock.spec.ts` verifies hook file creation, deletion, and process fallback logic. Command: `npm test -w packages/server`.
