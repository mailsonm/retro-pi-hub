# Ticket: 03 - HTTP Range Resumable ROM Streaming
**Status:** completed  
**Blocked by:** Ticket 02  

## What to build
Implement `RomStreamService` and Fastify route `GET /api/roms/:system/:rom` supporting HTTP Range requests (`bytes=start-end`), `206 Partial Content`, `Content-Range`, `Content-Length`, and standard `200 OK` for full downloads. Path traversal protection must strictly prevent accessing files outside the designated ROM vault.

## Acceptance Criteria
- [x] `GET /api/roms/:system/:rom` responds with `200 OK` and correct `Content-Length` for requests without Range header.
- [x] Responds with `206 Partial Content` and accurate `Content-Range: bytes start-end/total` when given a valid `Range: bytes=...` header.
- [x] Returns `416 Range Not Satisfiable` for out-of-bounds byte ranges.
- [x] Rejects directory traversal attempts (e.g. `../../etc/passwd`) with `403 Forbidden` or `400 Bad Request`.
- [x] Seam Test passes: `packages/server/tests/rom-stream.spec.ts` verifies range streaming and boundary validation. Command: `npm test -w packages/server`.
