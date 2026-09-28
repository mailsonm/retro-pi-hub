# 3. Netplay Architecture: WebRTC DataChannel with Local WebSocket Signaling

Date: 2026-09-27
Status: Accepted

## Context
Multiplayer retro gaming requires deterministic input transmission with sub-frame latency (< 16ms) to feel responsive. If inputs are routed through the Raspberry Pi as a centralized relay server, the Pi's CPU and Wi-Fi interface become a bottleneck, adding latency and jitter. Furthermore, EmulatorJS runs emulation directly in client browsers.

## Decision
1. **Peer-to-Peer DataChannel:** Gamepad inputs and netplay sync packets are exchanged directly between client browsers via WebRTC `RTCDataChannel` (using unreliable/unordered or ordered SCTP over UDP channels tailored for netplay input streams).
2. **Hub as WebSocket Signaling Server:** The Hub Server acts strictly as a lightweight signaling coordinator. Clients connect to a WebSocket endpoint (`/ws/netplay`) to announce rooms, negotiate Session Description Protocol (SDP) offers/answers, and exchange ICE candidates on the local network.
3. **Host/Guest Model:** The player who opens the room acts as Player 1 (Host). Additional joining peers establish direct P2P connections to the Host, which acts as the authoritative netplay arbiter in EmulatorJS.

## Consequences
### Positive
- Negligible load on Raspberry Pi CPU/RAM during multiplayer sessions.
- Ultra-low latency on LAN (sub-5ms direct peer communication).
- Scale to multi-player rooms (2 to 4 players) without central server performance degradation.

### Negative / Trade-offs
- Network connectivity relies on WebRTC peer connection success (in isolated or restrictive Wi-Fi subnets, STUN/TURN might be needed if peers cannot reach each other directly via mDNS/LAN IP).
