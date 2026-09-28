# 6. Offline-First Self-Hosted EmulatorJS Distribution

Date: 2026-09-27
Status: Accepted

## Context
When running Retro-Pi Hub in standalone home environments, Wi-Fi dead zones, or on road trips using the Raspberry Pi as a portable Wi-Fi Access Point, external internet access cannot be assumed. Furthermore, depending on external CDNs introduces risks of CORS issues, Content Security Policy violations, breaking upstream version shifts, and downtime.

## Decision
All EmulatorJS core binaries (`.wasm`), JavaScript loaders (`loader.js`, `emulator.min.js`), and frontend emulator UI assets must be self-hosted locally on the Raspberry Pi and served directly by the Hub Server.
The Hub serves these assets under a dedicated static route (`/emulatorjs/`) with aggressive client caching (`Cache-Control: public, max-age=31536000, immutable`).

## Consequences
### Positive
- 100% offline capability (air-gapped and portable hotspot friendly).
- Predictable versioning and zero third-party CDN dependency.
- Faster asset loading within local Gigabit or 5GHz Wi-Fi LANs.

### Negative / Trade-offs
- Core WASM assets and data files occupy local disk storage on the Raspberry Pi (typically a few tens of megabytes).
