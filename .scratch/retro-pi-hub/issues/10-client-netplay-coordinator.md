# Ticket: 10 - Client Netplay Lobby, QR Code Generation & WebRTC DataChannel Coordinator
**Status:** completed  
**Blocked by:** Ticket 06, Ticket 08  

## What to build
Implement the Netplay pairing client module in `packages/client`:
1. Host UI: requests room creation via WebSocket signaling (`/ws/netplay`), displays 4-character code and renders SVG QR code for URL `http://<hub-ip>:<port>/join/<room-code>`.
2. Guest UI: input field for 4-character code or auto-join route `/join/:code`.
3. `WebRtcPeerCoordinator`: manages `RTCPeerConnection`, exchanges SDP and ICE candidates via WebSocket signaling, opens `RTCDataChannel` (unreliable/unordered for lowest latency), and relays player controller input frames.

## Acceptance Criteria
- [x] Renders QR code and Room Code reactively upon host room creation.
- [x] Guest client initiates WebRTC offer/answer exchange through WebSocket signaling.
- [x] Direct P2P `RTCDataChannel` opens successfully between Host and Guest.
- [x] Player 2 input state is received on Host with sub-16ms latency.
- [x] Seam Test passes: `packages/client/tests/netplay-coordinator.spec.ts` verifies signaling choreography and input forwarding using mocked RTCPeerConnection and WebSocket. Command: `npm test -w packages/client`.
