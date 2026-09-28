# Ticket: 05 - SRAM Battery Save Sync & Revision Snapshots
**Status:** completed  
**Blocked by:** Ticket 04  

## What to build
Implement `SaveSyncEngine` and Fastify routes for save persistence:
- `POST /api/saves/:system/:rom/sync`: accepts `SaveSyncRequestDTO`, validates TV lock status (rejects with `409 Conflict` if target is locked TV slot), creates an immutable backup snapshot in `/saves/snapshots/<system>/<rom>.<timestamp>.srm.bak` (retaining max 5 snapshots per ROM), and writes the `.srm` binary to disk.
- `GET /api/saves/:system/:rom/slots`: lists available save slots and revision history.
- `POST /api/saves/:system/:rom/promote`: promotes a user slot to the primary `tv_shared` slot if unlocked.

## Acceptance Criteria
- [x] Successfully persists binary SRAM from Base64 payload into target `.srm` file.
- [x] Returns `409 Conflict` when trying to overwrite `tv_shared` while TV session is locked.
- [x] Creates a timestamped `.bak` snapshot before writing, pruning old snapshots beyond the 5 most recent.
- [x] Validates payload SHA-256 integrity against the binary buffer.
- [x] Seam Test passes: `packages/server/tests/save-sync.spec.ts` verifies save sync, snapshot rotation, and conflict locking. Command: `npm test -w packages/server`.
