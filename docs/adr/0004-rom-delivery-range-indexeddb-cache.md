# 4. ROM Delivery and Caching Strategy: HTTP Range Requests & IndexedDB

Date: 2026-09-27
Status: Accepted

## Context
ROM libraries can contain hundreds of gigabytes (spanning from small NES/SNES/Genesis ROMs of a few megabytes to CD-based games for PSX/Sega CD of several hundred megabytes). Constantly re-downloading large ROMs over local Wi-Fi causes unnecessary delay and traffic on the Raspberry Pi.

## Decision
1. **HTTP Streaming with Range Support:** The Hub Server serves ROM files via HTTP streaming supporting `Range` headers, `ETag`, and compression where applicable, enabling partial reads and resumable downloads.
2. **Virtual Directory Catalog:** The Hub indexes the existing ROM directory structure (`/home/pi/RetroPie/roms/<system>/`) and exposes a lightweight JSON catalog with platform, filename, title, hash, and metadata.
3. **Client-side Persistence with IndexedDB:** The PWA client caches downloaded ROMs and core assets inside the browser's `IndexedDB` (using Dexie or raw IDB key-value store). Once downloaded, launching the game is near-instantaneous and can work offline without pinging the Hub.
4. **Cache Eviction / LRU:** The PWA maintains an LRU (Least Recently Used) cache budget for large files to avoid filling mobile browser storage quotas.

## Consequences
### Positive
- Fast subsequent launches (instant startup from local IndexedDB).
- Raspberry Pi network bandwidth is preserved.
- Large catalogs can be browsed smoothly with virtualized scrolling.

### Negative / Trade-offs
- First launch of large games (e.g., PSX `.chd` or `.bin`) requires full download time.
- Browsers enforce storage quotas per origin (though usually >1GB on modern mobile/desktop).
