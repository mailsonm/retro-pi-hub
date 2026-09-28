# 2. Save Synchronization Strategy: SRAM Format with Concurrency Lock

Date: 2026-09-27
Status: Accepted

## Context
Save files must be shared between the native RetroArch instance running on the Raspberry Pi (connected via HDMI to the TV) and web browsers running WebAssembly-compiled Libretro cores via EmulatorJS.
- **Save States (`.state`)** represent raw emulator CPU and RAM dumps. Because architectures differ (ARM 64/32-bit native Linux vs 32-bit WASM Emscripten), save states are not binary compatible and attempting to cross-load them causes crashes and state corruption.
- **SRAM / Battery Saves (`.srm`, `.sav`)** represent the standardized hardware memory chip contents of original game cartridges. These binary blobs are 100% architecture-independent and compatible across all Libretro ports.

Additionally, concurrent writes (e.g. playing on the TV while someone plays or submits a save from a browser) can lead to race conditions, save file loss, or overwrites.

## Decision
1. **Strict SRAM-Only Interoperability:** We exclusively synchronize in-game battery saves (`.srm`/`.sav`) between the TV and PWA clients. Save states (`.state`) remain client-local in the browser (IndexedDB) and are not synced to the TV.
2. **Concurrency Locking & TV Session Detection:**
   - The Hub monitors the RetroArch process on the host (via process detection or file locks).
   - When a game is active on the TV, the Hub places a non-destructive write lock on that game's TV save slot.
   - PWA clients attempting to play the same game receive a notification: they can play using their own user slot or a temporary detached session, preventing accidental overwrites of the active TV save.
   - When the TV session terminates and RetroArch flushes its `.srm` to disk, the lock releases and the Hub indexes the updated save with a new revision timestamp.

## Consequences
### Positive
- Zero risk of crash from cross-architecture save state incompatibilities.
- Rock-solid preservation of RPG/campaign progress across TV and web.
- Protection against concurrent overwriting of saves.

### Negative / Trade-offs
- Players cannot pause on TV mid-jump via save state and resume from the exact frame on mobile; they must rely on in-game save points.
