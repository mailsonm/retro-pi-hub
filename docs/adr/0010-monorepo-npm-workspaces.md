# 10. Monorepo Topology: npm Workspaces

Date: 2026-09-27
Status: Accepted

## Context
Retro-Pi Hub consists of multiple distinct execution environments:
1. A backend daemon running under Node.js on the Raspberry Pi host.
2. A client-side PWA running inside desktop and mobile browsers.
3. Common protocols, DTOs, WebRTC signaling events, and save metadata formats shared between client and server.

Managing these components in detached repositories creates synchronization friction, while mixing them in an unstructured single directory pollutes dependencies and build scripts.

## Decision
We adopt a **monorepo with npm workspaces** (`npm` >= 9 / Node >= 20):
- `packages/shared`: Shared TypeScript types, data contracts, validation schemas, and signaling event definitions.
- `packages/server`: Fastify backend, filesystem watcher, runcommand hook listener, and WebRTC signaling server.
- `packages/client`: Vue 3 + Vite PWA, Pinia store, Virtual Gamepad, and EmulatorJS bridge.

## Consequences
### Positive
- Single Git repository for easy versioning and atomic commits.
- Strict dependency boundaries between client and server packages.
- Zero type duplication: backend and frontend import directly from `@retro-pi-hub/shared`.

### Negative / Trade-offs
- Root workspace requires running dependency install and orchestrating package scripts (`npm run build --workspaces`).
