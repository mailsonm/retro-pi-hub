# 8. SRAM Synchronization Lifecycle: Debounced Events and Beacon Exit

Date: 2026-09-27
Status: Accepted

## Context
When playing on the PWA client, in-game saves are triggered by the game's internal battery backup logic (e.g. saving at a checkpoint, PC, or inn). EmulatorJS exposes save hooks and exposes its virtual filesystem. Emitting an HTTP request for every memory mutation causes network storms, while manual saving harms user experience and causes lost progress.

## Decision
1. **Debounced Event Hooks:**
   The PWA client listens to EmulatorJS save events (`onSave` / dirty state detection on SRAM buffer).
   - Mutations are captured and buffered with a **3-second debounce timer**.
   - If no further writes occur within 3 seconds, the binary SRAM is compressed (optional) and uploaded via `POST /api/saves/:system/:rom/sync` along with client profile ID and timestamp.
2. **Page Lifecycle Exit Guarantees:**
   To prevent lost progress when a user closes a browser tab, minimizes the app, or navigates away:
   - On `visibilitychange` (state = `hidden`) or `beforeunload`, if an uncommitted SRAM buffer exists, the PWA triggers an immediate sync using `fetch()` with `{ keepalive: true }` (or `navigator.sendBeacon`).
3. **Optimistic UI & Sync Confirmation:**
   The PWA displays a subtle status indicator ("Saved to Hub ✓") so the user has immediate visual feedback that their progress is safely persisted on the Raspberry Pi.

## Consequences
### Positive
- Fully automated and seamless: works like a real retro console.
- Zero network thrashing due to debounced batching.
- Resilient against tab closures or backgrounding on mobile devices.

### Negative / Trade-offs
- Browsers have payload size limits on `keepalive`/`sendBeacon` (typically 64KB), but battery saves (SRAM) are almost always between 512 bytes and 32KB (rarely exceeding 64KB for 8/16-bit retro platforms).
