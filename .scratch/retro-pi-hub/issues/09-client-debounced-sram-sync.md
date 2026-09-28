# Ticket: 09 - Client Debounced SRAM Sync & Lifecycle Hook
**Status:** completed  
**Blocked by:** Ticket 05, Ticket 07, Ticket 08  

## What to build
Implement `useSaveStore` in `packages/client`:
1. Listens to EmulatorJS in-game save events (`onSave` / SRAM mutations).
2. Debounces uploads to `POST /api/saves/:system/:rom/sync` by 3 seconds.
3. Automatically triggers emergency sync on `visibilitychange` (hidden) and `beforeunload` using `fetch(..., { keepalive: true })`.
4. Displays visual save indicator ("Saved to Hub ✓") and alerts if TV lock conflict (409) occurs.

## Acceptance Criteria
- [x] Multiple save mutations within 3s trigger only a single network upload.
- [x] Emergency sync successfully triggers with `keepalive: true` on page unload.
- [x] Handles 409 Conflict gracefully by prompting user to switch to a private save slot.
- [x] Seam Test passes: `packages/client/tests/save-sync-lifecycle.spec.ts` verifies debouncing, unload beacon, and store state changes under fake timers. Command: `npm test -w packages/client`.
