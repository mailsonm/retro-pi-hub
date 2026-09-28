# 1. Backend Runtime and Framework: Node.js + Fastify + TypeScript

Date: 2026-09-27
Status: Accepted

## Context
The Retro-Pi Hub must run directly on resource-constrained hardware such as a Raspberry Pi 3B+, 4, or 5 alongside the active gaming session (RetroPie, EmulationStation, RetroArch) connected via HDMI to the TV. The hub needs to serve static PWA assets, stream large ROM files efficiently, handle real-time WebSocket connections for WebRTC signaling, and monitor save files on the local filesystem without degrading emulator performance or introducing latency.

## Decision
We adopt **Node.js (v20+ LTS)** with **Fastify** and **TypeScript**.
- **Fastify** provides minimal overhead, low memory footprint, schema-based JSON serialization, and first-class native WebSocket support via `@fastify/websocket`.
- **TypeScript** ensures end-to-end type safety across domain models, API payloads, and shared types with the frontend PWA.

## Consequences
### Positive
- Extremely low memory consumption and asynchronous non-blocking event loop.
- Built-in zero-copy stream support for ROM file delivery.
- Unified language (TypeScript) across backend API and frontend PWA.
- High-performance WebSocket handling for WebRTC signaling.

### Negative / Trade-offs
- Node.js runtime must be installed on the Raspberry Pi (standard in modern Linux distros).
- Requires a build step (TypeScript compilation / bundling via `tsx` or `tsup`/`esbuild`).
