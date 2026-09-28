# Ticket: 07 - Offline-First Static EmulatorJS Engine & Launcher
**Status:** completed  
**Blocked by:** Ticket 01  

## What to build
Configure Fastify static file serving in `packages/server` to serve EmulatorJS distribution files (WASM core binaries, `loader.js`, `emulator.min.js`, shaders, and core configurations) directly from local disk under `/emulatorjs/`.
Set up appropriate CORS and caching headers (`Cache-Control: public, max-age=31536000, immutable`).
Provide a lightweight offline asset verification check on startup.

## Acceptance Criteria
- [x] Fastify serves static files under route `/emulatorjs/` with immutable caching headers.
- [x] Returns correct MIME types for WebAssembly (`application/wasm`) and JavaScript (`application/javascript`).
- [x] Rejects path traversal attempts outside the assets root.
- [x] Startup health check verifies core assets exist locally.
- [x] Seam Test passes: `packages/server/tests/static-assets.spec.ts` verifies route delivery and headers. Command: `npm test -w packages/server`.
