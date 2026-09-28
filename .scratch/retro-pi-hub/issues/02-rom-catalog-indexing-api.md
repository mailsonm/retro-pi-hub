# Ticket: 02 - ROM Vault Catalog Indexing & REST API
**Status:** completed  
**Blocked by:** Ticket 01  

## What to build
Implement `CatalogService` and Fastify route `GET /api/catalog` in `packages/server`. The service indexes ROM files organized by system under a configurable root directory (defaulting to `/home/pi/RetroPie/roms/`), parses metadata, checks for corresponding `.srm` save files, ignores hidden/system files, and returns structured `SystemCatalogDTO[]`.

## Acceptance Criteria
- [x] Fastify endpoint `GET /api/catalog` returns 200 with JSON payload conforming to `SystemCatalogDTO[]`.
- [x] Correctly associates ROM items with their respective retro system directory (e.g. `snes`, `gba`, `nes`, `genesis`).
- [x] Filters out hidden files (e.g. `.DS_Store`, `._*`) and non-ROM system artifacts.
- [x] Flags `hasSramSave: true` if an `.srm` or `.sav` exists for that ROM.
- [x] Seam Test passes: `packages/server/tests/catalog.spec.ts` executes via `app.inject()` with mock directory fixtures. Command: `npm test -w packages/server`.
