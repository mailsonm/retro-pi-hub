# 11. Test Harness: Unified Vitest on Public Seams

Date: 2026-09-27
Status: Accepted

## Context
Following the AVE (*Anti-Vibe Engineering*) framework and the *Akita Way*, tests must be written before code (TDD-First) targeting **public seams** (Michael Feathers) without coupling to volatile private methods.
We need an ultra-fast, deterministic test runner that works consistently across backend services, shared types, and frontend components.

## Decision
We standardize on **Vitest** across all workspaces:
1. **Server Seams:** Fastify routes and services are tested using `app.inject()` (in-memory HTTP requests without opening real TCP ports) and mocked WebSocket streams for signaling logic.
2. **Client Seams:** Vue 3 components and stores are tested using Vitest with `@vue/test-utils` and **MSW (Mock Service Worker)** for network isolation.
3. **Shared Seams:** Schema validation and DTO transformations are tested directly with pure unit assertions.
4. **Execution Protocol:** Root-level `npm test` executes tests across all packages deterministically.

## Consequences
### Positive
- Sub-second test execution and hot-module reloading in watch mode.
- Identical syntax and assertion library (`expect`, `describe`, `it`, `vi`) across backend and frontend.
- Absolute isolation: zero reliance on live network connections or real filesystems in unit test seams.

### Negative / Trade-offs
- Integration with native browser APIs (such as WebRTC `RTCPeerConnection` or Gamepad API) requires lightweight mocks or polyfills in the test runner environment.
