# 🎮 Retro-Pi Hub

> **Distributed Local-Network Retro Gaming Hub with PWA, WebAssembly EmulatorJS & WebRTC Netplay**

---

## 🌍 Languages / Idiomas / Idiomas
- [🇺🇸 English](#-english)
- [🇧🇷 Português (Brasil)](#-português-brasil)
- [🇪🇸 Español](#-español)

---

## 🇺🇸 English

### Overview
**Retro-Pi Hub** turns your Raspberry Pi 3B/4/5 (running RetroPie or Raspberry Pi OS) into a local-network retro gaming server. Players can browse ROMs, play in any modern browser via in-browser WebAssembly (**EmulatorJS**), persist and sync in-game battery saves (**SRAM / `.srm`**) bidirectionally with the living room TV, and join multiplayer co-op sessions over low-latency **WebRTC DataChannels**.

### Quick Start on Raspberry Pi 3B / RetroPie

1. **Format & Flash SD Card:**
   Flash the official **RetroPie image** (or Raspberry Pi OS 32/64-bit) onto your MicroSD card using Raspberry Pi Imager.
2. **Boot and connect to local Wi-Fi / Ethernet.**
3. **Open terminal on the Pi (via SSH or F4 in EmulationStation):**
   ```bash
   cd ~
   git clone https://github.com/mailsonm/retro-pi-hub.git
   cd retro-pi-hub
   sudo bash scripts/setup-pi.sh
   ```
4. **Play:**
   Open any mobile or desktop browser on the same Wi-Fi and navigate to:
   `http://<raspberry-pi-ip>:3000`

---

## 🇧🇷 Português (Brasil)

### Visão Geral
O **Retro-Pi Hub** transforma seu Raspberry Pi 3B/4/5 (com RetroPie ou Raspberry Pi OS) em uma central de emulação distribuída para a rede doméstica. Os jogadores podem navegar pelo catálogo de ROMs, jogar diretamente no navegador via WebAssembly (**EmulatorJS**), sincronizar o progresso de bateria (**SRAM / `.srm`**) bidirecionalmente com a TV da sala (RetroArch) e disputar partidas multiplayer de baixíssima latência via **WebRTC DataChannel**.

### Como colocar no Cartão SD e no Raspberry Pi 3B

1. **Gravar o Cartão MicroSD:**
   Grave a imagem oficial do **RetroPie** (ou Raspberry Pi OS) no seu cartão MicroSD utilizando o *Raspberry Pi Imager*. Habilite o Wi-Fi e o SSH nas opções avançadas.
2. **Inicializar o Pi:**
   Insira o cartão no Raspberry Pi 3B, ligue na TV via HDMI e aguarde a inicialização do EmulationStation.
3. **Instalação em 1 comando no Pi (via SSH ou pressionando F4):**
   ```bash
   cd ~
   git clone https://github.com/mailsonm/retro-pi-hub.git
   cd retro-pi-hub
   sudo bash scripts/setup-pi.sh
   ```
   *O instalador baixa o Node.js 20 LTS, compila os pacotes, configura os hooks de detecção da TV no RetroPie e cria o serviço em segundo plano no `systemd`.*
4. **Jogar no Celular, Tablet ou PC:**
   No navegador de qualquer aparelho conectado no mesmo Wi-Fi da casa, acesse:
   `http://<ip-do-raspberry-pi>:3000`

---

## 🇪🇸 Español

### Descripción General
**Retro-Pi Hub** convierte su Raspberry Pi 3B/4/5 (con RetroPie o Raspberry Pi OS) en un centro de juegos retro distribuido en red local. Permite explorar el catálogo de ROMs, jugar directamente en el navegador mediante WebAssembly (**EmulatorJS**), sincronizar partidas guardadas de batería (**SRAM / `.srm`**) bidireccionalmente con el televisor y jugar en multijugador con bajísima latencia vía **WebRTC DataChannel**.

### Pasos para Instalar en Raspberry Pi 3B con Tarjeta SD

1. **Grabar la Tarjeta MicroSD:**
   Instale la imagen oficial de **RetroPie** en la tarjeta MicroSD usando *Raspberry Pi Imager*. Configure Wi-Fi y SSH.
2. **Encender la Raspberry Pi:**
   Inserte la tarjeta en la Raspberry Pi 3B y conéctela a la TV.
3. **Instalación en 1 comando (vía SSH o terminal F4):**
   ```bash
   cd ~
   git clone https://github.com/mailsonm/retro-pi-hub.git
   cd retro-pi-hub
   sudo bash scripts/setup-pi.sh
   ```
4. **Acceder desde cualquier dispositivo:**
   Abra el navegador en su smartphone o PC en la misma red local:
   `http://<ip-de-la-pi>:3000`

---

## 🧪 Testing & Verification
```bash
npm test        # Runs 44 automated tests across all monorepo packages
npm run build   # Typechecks and builds shared contracts and server daemon
```
