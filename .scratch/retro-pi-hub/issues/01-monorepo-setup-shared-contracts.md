# Ticket: 01 - Monorepo Setup, Workspace Harness & Shared Contracts
**Status:** completed  
**Blocked by:** None  

## What to build
Set up the npm monorepo workspace structure (`packages/shared`, `packages/server`, `packages/client`) with TypeScript configuration and a unified Vitest test runner across all workspaces. Implement the shared contracts, DTO types, and schema validators defined in `SPEC.md` within `packages/shared`.

## Acceptance Criteria
- [x] Root `package.json` configures npm workspaces for `packages/*`.
- [x] `packages/shared` compiles and exports `RomItemDTO`, `SystemCatalogDTO`, `SaveSyncRequestDTO`, `SaveSyncResponseDTO`, `TvLockStatusDTO`, and `SignalingMessage`.
- [x] Vitest is configured at the root and runnable across all packages.
- [x] Seam Test passes: `npm test -w packages/shared` runs unit tests verifying schema contracts.
