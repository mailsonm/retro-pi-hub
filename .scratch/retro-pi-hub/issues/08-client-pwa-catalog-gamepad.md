# Ticket: 08 - Client PWA Catalog, IndexedDB ROM Cache & Virtual Touch Gamepad
**Status:** completed  
**Blocked by:** Ticket 02, Ticket 03  

## What to build
Build the core PWA client in `packages/client` using Vue 3, Vite, and Pinia:
1. Virtualized catalog browser for systems and ROMs with search and filter.
2. `RomCacheService` storing downloaded ROM binary buffers in browser `IndexedDB`.
3. Virtual Touch Gamepad overlay (D-Pad, A/B/X/Y, Start/Select, L/R) with multi-touch tracking and haptic vibration feedback.
4. Gamepad API listener to auto-detect physical USB/Bluetooth controllers.

## Acceptance Criteria
- [x] Catalog views render systems and game lists reactively from Pinia store.
- [x] `RomCacheService.getOrFetchRom(system, rom)` serves cached binary from IndexedDB if available; fetches from `/api/roms/...` and caches otherwise.
- [x] Virtual gamepad tracks simultaneous touch inputs without scrolling or ghost touches.
- [x] Physical gamepad button presses are translated to standardized controller input events.
- [x] Seam Test passes: `packages/client/tests/catalog-ui.spec.ts` and `packages/client/tests/virtual-gamepad.spec.ts` execute cleanly under Vitest with MSW. Command: `npm test -w packages/client`.
