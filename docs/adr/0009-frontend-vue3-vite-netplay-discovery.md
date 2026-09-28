# 9. Frontend Architecture: Vue 3, Vite, Pinia, Vitest & Netplay Discovery

Date: 2026-09-27
Status: Accepted

## Context
The user interface must serve multiple purposes:
1. Virtualized responsive catalog of ROMs across multiple retro platforms with search and artwork.
2. Emulator canvas with customizable on-screen touch controls (Virtual Gamepad) for smartphones and Web Gamepad API for Bluetooth/USB controllers.
3. Multiplayer Netplay lobby enabling fast pairing without typing long URLs.
4. Testable code adhering to the TDD-First and Akita Way methodology.

## Decision
1. **Frontend Stack:**
   - **Framework:** Vue 3 (Composition API, `<script setup lang="ts">`).
   - **Bundler:** Vite with `@vitejs/plugin-vue` and `vite-plugin-pwa`.
   - **State Management:** Pinia.
   - **Test Framework:** Vitest with Mock Service Worker (`msw`) for API seams and component testing.
2. **Netplay Discovery & Room Joining:**
   - Host player creates a room from the game card in the PWA.
   - The Hub assigns a **4-character alphanumeric Room Code** (e.g., `A7K2`) and generates an SVG/Canvas **QR Code** pointing to `http://<hub-ip>:<port>/join/<room-code>`.
   - Guest players scan the QR code with their mobile device or enter the 4-character code on any browser on the LAN to auto-join the WebRTC signaling channel and initiate the P2P DataChannel connection.
3. **Responsive Virtual Gamepad:**
   - On touch devices, a high-performance touch controller overlay (Canvas/SVG with Pointer Events and multi-touch tracking) provides D-Pad, Action buttons, Select/Start, and L/R triggers with haptic vibration feedback (`navigator.vibrate`).

## Consequences
### Positive
- Modern, reactive, lightweight frontend matching project tech stack conventions.
- Fast onboarding for multiplayer: scan QR code and play in seconds.
- Fully testable in Vitest without real network dependencies.

### Negative / Trade-offs
- Virtual touch controls require careful tuning for tactile responsiveness and preventing touch ghosting.
