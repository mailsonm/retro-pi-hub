# 📖 CONTEXT.md - Retro-Pi Hub

Documento vivo de arquitetura, domínio e glossário ubíquo (*Ubiquitous Language*) do projeto **Retro-Pi Hub**.

---

## 🎯 Visão do Projeto
O **Retro-Pi Hub** é uma plataforma que transforma o Raspberry Pi (ou servidor doméstico de emulação) em uma central de retro gaming distribuída para a rede local. Ele expõe uma aplicação web moderna (PWA) permitindo jogar títulos retro diretamente no navegador (smartphones, PCs, notebooks e Smart TVs) via WebAssembly (**EmulatorJS**), oferecendo multiplayer de baixa latência em rede local via **WebRTC / Netplay** e sincronização contínua de progresso (saves) com a sessão nativa conectada à TV.

---

## 🗣️ Glossário Ubíquo (Ubiquitous Language)

| Termo | Definição | Contexto de Uso |
| :--- | :--- | :--- |
| **Hub Server** | Servidor backend leve rodando no Raspberry Pi (`packages/server`: Fastify + TypeScript) que indexa ROMs, expõe API REST/WebSocket, gerencia conflitos de saves e atua como servidor de sinalização WebRTC. | Backend / Infraestrutura |
| **PWA Client** | Aplicação web progressiva instalável (`packages/client`: Vue 3 + Vite), responsiva, com suporte a gamepads virtuais touch e gamepads Bluetooth/USB físicos via Gamepad API. | Frontend / Cliente |
| **Shared Protocol Core** | Módulo de contratos (`packages/shared`) contendo tipos TypeScript, DTOs de saves, schemas e eventos de sinalização WebRTC compartilhados. | Contratos / Tipagem |
| **EmulatorJS** | Runtime WebAssembly no navegador empacotando cores Libretro compilados com Emscripten, executando a emulação 100% no cliente sem sobrecarregar a CPU do Raspberry Pi. | Emulação Web |
| **Self-Hosted WASM Bundle** | Cores e scripts do EmulatorJS armazenados localmente no Pi e servidos em `/emulatorjs/`, garantindo funcionamento 100% offline (air-gapped). | Emulação Web / Offline |
| **SRAM (Battery Save / .srm / .sav)** | Memória não-volátil do cartucho salva pelo jogo. Binário padronizado e portável entre o RetroArch nativo (Linux/ARM na TV) e o core WASM no navegador. | Persistência / Saves |
| **Save State (.state)** | Snapshot bruto da memória e registradores do emulador em tempo de execução. Mantido estritamente local no navegador do cliente (IndexedDB). Não sincronizado com a TV. | Persistência / Volátil |
| **Active TV Lock** | Bloqueio lógico ativado quando o RetroArch nativo está em execução na TV, impedindo que clientes web sobrescrevam concorrentemente o save `.srm` oficial da TV. | Sincronização / Concorrência |
| **Runcommand Hooks** | Scripts de ciclo de vida do RetroPie (`runcommand-onstart.sh`/`runcommand-onend.sh`) que mantêm o estado de jogo ativo em `/dev/shm/retroarch_active.json`. | Hardware / Host |
| **Debounced SRAM Sync** | Ciclo de persistência com debounce de 3 segundos nas escritas em memória do emulador e despacho garantido via `fetch(..., { keepalive: true })` no encerramento da aba. | Persistência / Lifecycle |
| **Save Revision Snapshot** | Cópia imutável com carimbo de data/hora mantida pelo Hub antes de cada gravação no arquivo `.srm`, garantindo recuperação histórica contra sobrescritas indesejadas. | Persistência / Auditoria |
| **Profile Slot** | Identificador de usuário/perfil (ex.: `tv_shared`, `user1`, `guest`) que isola versões de save, com capacidade de promover um slot para o save da TV. | Domínio / Usuários |
| **Signaling Server** | Mecanismo WebSocket no Hub (`/ws/netplay`) para troca de metadados SDP e ICE candidates entre pares WebRTC antes de abrir o DataChannel P2P. | Rede / Netplay |
| **WebRTC DataChannel** | Canal P2P direto (via SCTP/UDP) entre os navegadores dos jogadores para transmissão de inputs de controle com latência mínima (<16ms) e baixo jitter. | Rede / Multiplayer |
| **Room Code / QR Join** | Código alfanumérico curto (4 caracteres) e QR Code gerados pelo Host para entrada instantânea de convidados na mesma LAN. | Rede / Descoberta |
| **TV Session (RetroArch Host)** | Instância nativa de emulação rodando no Raspberry Pi conectada à TV via HDMI (ex.: RetroPie / EmulationStation / RetroArch). | Hardware / Host |
| **Save Sync Engine** | Módulo do Hub encarregado de detectar alterações de saves (in-game), mediar bloqueio de escrita (lock de sessão ativa) e sincronizar entre TV e clientes web. | Sincronização |
| **ROM Vault** | Repositório central de arquivos de jogos organizado por plataforma no storage local do Raspberry Pi (`/home/pi/RetroPie/roms/<system>/`). | Storage / Dados |

---

## 🏛️ Registros de Decisões de Arquitetura (ADRs)

| ADR | Título | Status |
| :--- | :--- | :--- |
| [ADR-0001](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0001-backend-runtime-fastify-typescript.md) | Backend Runtime and Framework: Node.js + Fastify + TypeScript | Aceito |
| [ADR-0002](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0002-save-sync-sram-concurrency-lock.md) | Save Synchronization Strategy: SRAM Format with Concurrency Lock | Aceito |
| [ADR-0003](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0003-netplay-webrtc-datachannel-signaling.md) | Netplay Architecture: WebRTC DataChannel with Local WebSocket Signaling | Aceito |
| [ADR-0004](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0004-rom-delivery-range-indexeddb-cache.md) | ROM Delivery and Caching Strategy: HTTP Range Requests & IndexedDB | Aceito |
| [ADR-0005](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0005-multi-profile-save-versioning.md) | Save Management: Multi-Profile Versioning with Shared TV Default | Aceito |
| [ADR-0006](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0006-offline-self-hosted-emulatorjs.md) | Offline-First Self-Hosted EmulatorJS Distribution | Aceito |
| [ADR-0007](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0007-tv-session-detection-hooks-and-fallback.md) | TV Session Detection: Runcommand Hooks with Process Fallback | Aceito |
| [ADR-0008](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0008-sram-sync-debounced-lifecycle.md) | SRAM Synchronization Lifecycle: Debounced Events and Beacon Exit | Aceito |
| [ADR-0009](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0009-frontend-vue3-vite-netplay-discovery.md) | Frontend Architecture: Vue 3, Vite, Pinia, Vitest & Netplay Discovery | Aceito |
| [ADR-0010](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0010-monorepo-npm-workspaces.md) | Monorepo Topology: npm Workspaces (`packages/{shared,server,client}`) | Aceito |
| [ADR-0011](file:///home/mailson/Documentos/GitHub/retro-pi-hub/docs/adr/0011-test-harness-vitest-public-seams.md) | Test Harness: Unified Vitest on Public Seams | Aceito |

---

## 📐 Fronteiras Arquiteturais (Bounding Contexts)
1. **Catalog & ROM Management (`packages/server` + `packages/shared`):** Indexação de sistemas e títulos em `/home/pi/RetroPie/roms/`, metadados e streaming de binários com suporte a `Range Requests`.
2. **Emulation Runtime & UI (`packages/client`):** Interface Vue 3 PWA, inicialização do EmulatorJS com ROM em memória (cache IndexedDB), mapeamento de Gamepad API e Virtual Touch Controls.
3. **Netplay & Signaling Engine (`packages/server` + `packages/client`):** Handshake WebSocket (`/ws/netplay`) para pareamento de salas via Room Code/QR Code e canais WebRTC DataChannel P2P para sincronização de inputs.
4. **Save & State Synchronization (`packages/server` + `packages/client`):** Listener de hooks do RetroPie (`/dev/shm/retroarch_active.json`), motor de snapshot de revisões históricas e API de sync de SRAM com concorrência mediada.
