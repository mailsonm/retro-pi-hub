# 📋 SPEC.md - Retro-Pi Hub Specification Contract

---

## 🌍 Trilingual Executive Summary / Resumo Executivo Trilíngue / Resumen Ejecutivo Trilingüe

### 🇺🇸 English
**Retro-Pi Hub** transforms a Raspberry Pi into a distributed local-network retro gaming hub. It serves an offline-first Progressive Web App (PWA) enabling clients (smartphones, tablets, PCs, smart TVs) to play retro titles via in-browser WebAssembly (**EmulatorJS**), persist and synchronize battery saves (**SRAM / `.srm`**) bidirectionally with the living room TV (RetroArch), and enjoy low-latency multiplayer via direct peer-to-peer **WebRTC DataChannels** orchestrated by a local WebSocket signaling server.

### 🇧🇷 Português (Brasil)
O **Retro-Pi Hub** transforma o Raspberry Pi em uma central de retro gaming distribuída para a rede local. Ele serve uma Progressive Web App (PWA) offline-first que permite a clientes (smartphones, tablets, PCs e smart TVs) rodar jogos clássicos no navegador via WebAssembly (**EmulatorJS**), sincronizar o progresso de bateria (**SRAM / `.srm`**) bidirecionalmente com a TV da sala (RetroArch) e disputar partidas multiplayer de baixíssima latência via conexões P2P diretas (**WebRTC DataChannel**) coordenadas por sinalização WebSocket local.

### 🇪🇸 Español
**Retro-Pi Hub** convierte una Raspberry Pi en un centro de juegos retro distribuido en red local. Proporciona una Progressive Web App (PWA) offline-first que permite a los clientes (smartphones, tablets, PCs, smart TVs) ejecutar juegos clásicos en el navegador mediante WebAssembly (**EmulatorJS**), sincronizar el progreso de batería (**SRAM / `.srm`**) de forma bidireccional con el televisor (RetroArch) y disfrutar de multijugador de bajísima latencia mediante conexiones P2P directas (**WebRTC DataChannel**) coordinadas por señalización WebSocket local.

---

## 🎯 1. Problem Statement

1. **Hardware Tethering:** Retro games running on a living room Raspberry Pi are physically tethered to the TV screen and couch controllers. When the TV is in use by someone else, or when users want to play in other rooms, the console becomes inaccessible.
2. **Save Fragmentation:** Playing the same game on multiple devices (e.g. mobile vs TV) creates fragmented save files. RetroArch `.state` files cannot be transferred to WebAssembly cores due to architecture mismatches (ARM native vs WASM 32-bit), leading to corrupted dumps and lost progress.
3. **Multiplayer Latency & Server Saturation:** Attempting to stream game video or route controller inputs through the Raspberry Pi as a centralized relay overloads the Pi's CPU and Wi-Fi interface, introducing latency and input lag.
4. **Internet Dependency:** Most web-based emulators depend on public CDNs for JS loaders and WASM cores, failing completely when the Raspberry Pi operates on an offline local network, cabin Wi-Fi, or travel hotspot.

---

## 💡 2. Solution Overview & Architecture

Retro-Pi Hub delivers a **zero-cloud, offline-first appliance architecture**:
- **Backend Hub Daemon (`packages/server`):** Built with Fastify and TypeScript on Node.js 20+. Runs as a lightweight service alongside RetroPie. Exposes REST endpoints with HTTP Range support for ROM streaming, static routes for self-hosted EmulatorJS assets, WebSocket signaling for Netplay, and an inotify-driven TV session lock manager.
- **Frontend PWA Client (`packages/client`):** Built with Vue 3, Vite, Pinia, and Vitest. Implements virtual touch gamepads, Gamepad API support, IndexedDB caching for ROMs, debounced SRAM sync, and instant Netplay room joining via QR Code and 4-character codes.
- **Shared Contracts (`packages/shared`):** Single source of truth for DTOs, WebSocket message schemas, and domain types.

```mermaid
flowchart TD
    subgraph Host ["Raspberry Pi Host (RetroPie / Linux)"]
        TV["HDMI TV / RetroArch Native"]
        RAM["/dev/shm/retroarch_active.json<br/>(Runcommand Hooks)"]
        Storage["/home/pi/RetroPie/roms/<br/>SRAM (.srm) Storage"]
        
        subgraph HubServer ["Hub Server (Fastify + TypeScript)"]
            StaticServe["Static Engine<br/>/emulatorjs/ (Offline WASM)"]
            CatalogAPI["Catalog & ROM Stream<br/>(HTTP Range Requests)"]
            SaveSync["Save Sync & Snapshot Engine<br/>(Revision History)"]
            TVLock["Active TV Lock Watcher<br/>(inotify on /dev/shm)"]
            Signaling["WebSocket Signaling<br/>/ws/netplay (SDP/ICE)"]
        end
    end

    subgraph Client1 ["Player 1 (Mobile / Browser PWA)"]
        PWA1["Vue 3 PWA UI<br/>(Virtual Gamepad / IndexedDB)"]
        WASM1["EmulatorJS (WASM Core)"]
    end

    subgraph Client2 ["Player 2 (Laptop / Browser PWA)"]
        PWA2["Vue 3 PWA UI"]
        WASM2["EmulatorJS (WASM Core)"]
    end

    TV -->|Writes lock on start| RAM
    TV -->|Persists SRAM| Storage
    RAM -->|inotify event| TVLock
    TVLock --> SaveSync
    Storage <--> SaveSync
    Storage --> CatalogAPI
    
    CatalogAPI -->|Stream ROM| PWA1
    StaticServe -->|Serve WASM assets| PWA1
    PWA1 <-->|Debounced SRAM sync| SaveSync
    
    PWA1 <-->|WebSocket Signaling| Signaling
    PWA2 <-->|WebSocket Signaling| Signaling
    PWA1 <===>|WebRTC DataChannel P2P (Inputs <16ms)| PWA2
```

---

## 👤 3. User Stories & Acceptance Criteria

### **US-01: ROM Catalog Browsing**
> **As a** retro gamer on my smartphone or laptop,  
> **I want to** browse the list of available retro systems and games hosted on my Raspberry Pi,  
> **So that** I can select a game to play without copying files manually.

- **AC-01.1:** `GET /api/catalog` returns a categorized list of systems (e.g. `snes`, `nes`, `gba`, `genesis`) and their indexed ROMs.
- **AC-01.2:** Each ROM item includes `id`, `title`, `system`, `fileName`, `fileSizeBytes`, `hasSave`, and optional `boxartUrl`.
- **AC-01.3:** Catalog indexing handles nested folders and skips temporary or hidden files (e.g. `.DS_Store`, `._*`).

---

### **US-02: Resumable ROM Streaming & IndexedDB Client Caching**
> **As a** mobile user on local Wi-Fi,  
> **I want** ROMs to stream quickly and remain cached on my device,  
> **So that** subsequent launches are instant and do not re-saturate local Wi-Fi.

- **AC-02.1:** `GET /api/roms/:system/:rom` responds with `206 Partial Content` when the client sends an HTTP `Range` header.
- **AC-02.2:** The PWA client stores the downloaded ROM ArrayBuffer in `IndexedDB` with an LRU retention timestamp.
- **AC-02.3:** When launching a previously played title, the PWA retrieves the binary from `IndexedDB` in < 200ms without initiating a network download.

---

### **US-03: Self-Hosted Offline EmulatorJS Launch**
> **As a** user operating the Raspberry Pi in portable/offline hotspot mode,  
> **I want** the PWA to load EmulatorJS and WASM cores directly from the Pi,  
> **So that** emulating games requires zero public internet connectivity.

- **AC-03.1:** All EmulatorJS scripts (`loader.js`, `emulator.min.js`), stylesheets, and core binaries (`.wasm`) are served from local path `/emulatorjs/`.
- **AC-03.2:** The PWA initiates the WASM core in an isolated DOM container passing the ROM buffer and core settings.
- **AC-03.3:** Zero HTTP requests are made to external CDNs (`unpkg`, `jsdelivr`, `cdn.emulatorjs.org`).

---

### **US-04: Virtual Touch Controls & Gamepad API Integration**
> **As a** smartphone user playing without a physical controller,  
> **I want** an on-screen responsive touch gamepad with haptic feedback,  
> **So that** I can control the game accurately with multi-touch input.

- **AC-04.1:** On touch-enabled devices, the client renders a low-latency touch overlay (D-Pad, A/B/X/Y, L/R, Start, Select).
- **AC-04.2:** Multi-touch events are tracked simultaneously without ghost touches or scroll gesture interference (`touch-action: none`).
- **AC-04.3:** When a physical Bluetooth or USB gamepad is connected, the standard HTML5 Gamepad API is detected, mapping buttons and suppressing the virtual overlay.

---

### **US-05: Debounced SRAM Battery Save Synchronization**
> **As a** player progressing through an RPG on the PWA,  
> **I want** my in-game saves to automatically sync back to the Raspberry Pi,  
> **So that** I never lose my campaign progress when closing the game.

- **AC-05.1:** Memory writes to the SRAM buffer trigger a debounce timer of 3 seconds.
- **AC-05.2:** On timer expiry, `POST /api/saves/:system/:rom/sync` sends the binary SRAM payload along with SHA-256 hash and slot identifier.
- **AC-05.3:** When the browser tab is closed or navigated away (`visibilitychange` / `beforeunload`), any uncommitted SRAM buffer is dispatched immediately via `fetch` with `keepalive: true`.

---

### **US-06: Active TV Session Lock & Revision Snapshots**
> **As a** household user,  
> **I want** the Hub to safeguard save files when someone is actively playing on the TV,  
> **So that** a web session does not overwrite the TV player's active game.

- **AC-06.1:** When `/dev/shm/retroarch_active.json` exists for a given ROM, `GET /api/saves/:system/:rom/lock-status` reports `{ isLocked: true, activeOnTv: true }`.
- **AC-06.2:** If a web client attempts to sync to the `tv_shared` slot while locked, the Hub rejects the direct overwrite with `409 Conflict`, offering to save into a personal user slot.
- **AC-06.3:** Before writing any save file to disk, the Hub writes an immutable backup snapshot to `/saves/snapshots/<system>/<rom>.<timestamp>.srm.bak`, retaining the last 5 revisions.

---

### **US-07: Save Slots & TV Promotion**
> **As a** player with a dedicated profile,  
> **I want** to manage distinct save slots and promote a personal save to become the active TV save,  
> **So that** I can transfer my mobile playthrough to the living room couch.

- **AC-07.1:** `GET /api/saves/:system/:rom/slots` lists all available slots (`tv_shared`, `user_<id>`) and their last modified dates.
- **AC-07.2:** `POST /api/saves/:system/:rom/promote` safely swaps the target slot into the primary `.srm` path (verifying first that the TV lock is inactive).

---

### **US-08: WebRTC P2P Netplay via Room Code / QR Code**
> **As a** player wanting to play 2-player co-op with a friend on local Wi-Fi,  
> **I want** to host a game and share a 4-character code or QR Code,  
> **So that** my friend can join instantly on their phone as Player 2 with minimal latency.

- **AC-08.1:** The Host creates a room; the Hub assigns a unique 4-character alphanumeric code (e.g. `J7K2`) and registers a WebSocket room in memory.
- **AC-08.2:** The Guest enters the code or scans the QR code; the Hub relays WebRTC SDP offer, SDP answer, and ICE candidates between Host and Guest via `/ws/netplay`.
- **AC-08.3:** Once the `RTCDataChannel` is established, controller input frames are exchanged peer-to-peer with frame timestamps (< 16ms transit).

---

## 🧵 4. Public Seams & Test Boundary Contracts

Following the *Akita Way* and Michael Feathers' seam concepts, tests interact exclusively with these public seams:

```
+-------------------------------------------------------------------------+
|                              PUBLIC SEAMS                               |
+-------------------------------------------------------------------------+
| SEAM 1: Catalog API Seam (Fastify HTTP)                                 |
|         Entry: app.inject({ method: 'GET', url: '/api/catalog' })       |
|         Contract: Array<SystemCatalogDTO>                               |
+-------------------------------------------------------------------------+
| SEAM 2: ROM Range Stream Seam (Fastify HTTP)                            |
|         Entry: app.inject({ method: 'GET', url: '/api/roms/:sys/:rom' })|
|         Contract: Status 200 / 206 Partial Content, Accept-Ranges       |
+-------------------------------------------------------------------------+
| SEAM 3: Save Sync & Snapshot Seam (Fastify HTTP)                        |
|         Entry: app.inject({ method: 'POST', url: '/api/saves/.../sync'})|
|         Contract: Status 200 (Success) / 409 (Locked by TV)             |
+-------------------------------------------------------------------------+
| SEAM 4: TV Lock Watcher Seam (Filesystem Event Adapter)                 |
|         Entry: TvLockWatcher.inspectLock(system, rom)                   |
|         Contract: { isLocked: boolean, source: 'runcommand'|'process' } |
+-------------------------------------------------------------------------+
| SEAM 5: Netplay Signaling Seam (Fastify WebSocket)                      |
|         Entry: ws.send(JSON.stringify(SignalingMessage))                |
|         Contract: RoomCreatedEvent, PeerJoinedEvent, SdpRelayEvent      |
+-------------------------------------------------------------------------+
| SEAM 6: Client Save Sync Manager Seam (Vue/Pinia Store)                 |
|         Entry: useSaveStore().syncCurrentSram(buffer, isUnloading)      |
|         Contract: Emits debounced HTTP request or Beacon                |
+-------------------------------------------------------------------------+
| SEAM 7: WebRTC Peer Coordinator Seam (Client DataChannel Adapter)       |
|         Entry: PeerCoordinator.joinRoom(roomCode, signalingAdapter)    |
|         Contract: DataChannel 'open' event, onInputFrame callback       |
+-------------------------------------------------------------------------+
```

---

## 📐 5. Data Contracts & DTO Schemas (`packages/shared`)

### 5.1. Catalog & ROM DTOs
```typescript
export interface RomItemDTO {
  id: string;              // e.g. "snes-super-mario-world"
  system: string;          // e.g. "snes"
  title: string;           // e.g. "Super Mario World"
  fileName: string;        // e.g. "Super Mario World (USA).sfc"
  fileSizeBytes: number;
  hasSramSave: boolean;
  boxartUrl?: string;
}

export interface SystemCatalogDTO {
  system: string;          // e.g. "snes"
  name: string;            // e.g. "Super Nintendo"
  coreName: string;        // e.g. "snes9x"
  gamesCount: number;
  games: RomItemDTO[];
}
```

### 5.2. Save Sync & Lock DTOs
```typescript
export interface SaveSyncRequestDTO {
  system: string;
  romName: string;
  slot: string;            // "tv_shared" | user slot
  sramBase64: string;      // Base64 encoded binary SRAM
  sha256: string;          // Integrity hash
  timestamp: number;
}

export interface SaveSyncResponseDTO {
  success: boolean;
  revision: number;
  slot: string;
  savedAt: string;
}

export interface TvLockStatusDTO {
  isLocked: boolean;
  activeOnTv: boolean;
  currentRom?: string;
  lockedSince?: string;
}
```

### 5.3. Netplay Signaling Protocol DTOs
```typescript
export type SignalingAction =
  | 'create_room'
  | 'room_created'
  | 'join_room'
  | 'peer_joined'
  | 'sdp_offer'
  | 'sdp_answer'
  | 'ice_candidate'
  | 'peer_left'
  | 'error';

export interface SignalingMessage<T = unknown> {
  action: SignalingAction;
  roomCode?: string;
  senderId?: string;
  payload?: T;
}
```

---

## 🚫 6. Explicitly Out of Scope

1. **Native Save State Sync (`.state`):** Transferring unstandardized volatile emulator memory dumps between ARM native RetroArch and WASM cores is strictly excluded due to architecture crash risks.
2. **Video Streaming / Remote Cloud Gaming:** Games run natively on client browser WebAssembly; the Raspberry Pi does NOT capture or encode H.264/WebRTC video streams.
3. **WAN / Global Internet Relay (Coturn Hosting):** Designed for local network gaming (LAN / home Wi-Fi). Public STUN/TURN infrastructure for cross-internet NAT traversal is not part of this local hub release.
4. **Third-Party CDN Dependencies:** No runtime reliance on unpkg or jsdelivr; everything must run air-gapped on the local Pi.

---

## 🔍 7. Traceability Matrix

| User Story | Target Seam | Test File Seam | Verification Command |
| :--- | :--- | :--- | :--- |
| **US-01** (Catalog) | `CatalogService` & `/api/catalog` | `packages/server/tests/catalog.spec.ts` | `npm test -w packages/server` |
| **US-02** (Range Stream) | `RomStreamService` & `/api/roms/...` | `packages/server/tests/rom-stream.spec.ts` | `npm test -w packages/server` |
| **US-03** (EmulatorJS) | Static Assets & Loader | `packages/server/tests/static-assets.spec.ts` | `npm test -w packages/server` |
| **US-04** (Gamepad) | Touch Overlay & Gamepad API | `packages/client/tests/virtual-gamepad.spec.ts` | `npm test -w packages/client` |
| **US-05** (Save Sync) | `SaveSyncEngine` & `/api/saves/...` | `packages/server/tests/save-sync.spec.ts` | `npm test -w packages/server` |
| **US-06** (TV Lock) | `TvSessionDetector` & Lock API | `packages/server/tests/tv-lock.spec.ts` | `npm test -w packages/server` |
| **US-07** (Save Slots) | Slot Promotion & Snapshot History | `packages/server/tests/save-slots.spec.ts` | `npm test -w packages/server` |
| **US-08** (Netplay) | Signaling Server & Peer Coordinator | `packages/server/tests/signaling.spec.ts` | `npm test -w packages/server` |
