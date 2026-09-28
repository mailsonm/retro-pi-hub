# Ticket: 06 - Netplay WebSocket Signaling Server
**Status:** completed  
**Blocked by:** Ticket 01  

## What to build
Implement `NetplaySignalingHandler` and Fastify WebSocket route `/ws/netplay` using `@fastify/websocket`.
Handles room creation, assigning an ephemeral 4-character alphanumeric Room Code (e.g. `K9X2`), peer joining, and relays WebRTC SDP offers, SDP answers, and ICE candidate packets between the Host (Player 1) and Guests (Player 2..N).

## Acceptance Criteria
- [x] Client sending `{ action: 'create_room' }` receives `{ action: 'room_created', roomCode: '...' }`.
- [x] Client sending `{ action: 'join_room', roomCode: '...' }` successfully joins and notifies the host with `{ action: 'peer_joined', peerId: '...' }`.
- [x] Relays `sdp_offer`, `sdp_answer`, and `ice_candidate` specifically between peers within the same room.
- [x] Cleans up rooms when the host disconnects and notifies remaining peers with `{ action: 'peer_left' }`.
- [x] Seam Test passes: `packages/server/tests/signaling.spec.ts` verifies full signaling handshake using simulated WebSocket clients. Command: `npm test -w packages/server`.
