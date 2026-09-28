import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from '../src/app.js';

describe('Seam: Offline-First Static EmulatorJS Engine (Ticket #07)', () => {
  let tempEmulatorDir: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    tempEmulatorDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-emulatorjs-'));

    // Create mock EmulatorJS files
    await fs.writeFile(path.join(tempEmulatorDir, 'loader.js'), 'console.log("loader");');
    await fs.writeFile(path.join(tempEmulatorDir, 'emulator.min.js'), 'console.log("emulator");');
    await fs.writeFile(path.join(tempEmulatorDir, 'snes9x.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d])); // wasm magic bytes

    app = buildApp({
      romsDir: tempEmulatorDir,
      savesDir: tempEmulatorDir,
      emulatorJsDir: tempEmulatorDir
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempEmulatorDir, { recursive: true, force: true });
  });

  it('GET /emulatorjs/loader.js should serve JS with correct content-type and cache-control', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/emulatorjs/loader.js'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/javascript');
    expect(response.headers['cache-control']).toContain('public');
    expect(response.body).toBe('console.log("loader");');
  });

  it('GET /emulatorjs/snes9x.wasm should serve WebAssembly with application/wasm content-type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/emulatorjs/snes9x.wasm'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/wasm');
    expect(response.rawPayload.slice(0, 4)).toEqual(Buffer.from([0x00, 0x61, 0x73, 0x6d]));
  });

  it('GET /emulatorjs/../secret should reject directory traversal attempts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/emulatorjs/../secret'
    });

    // Fastify/fastify-static either returns 404 or 400 for dot-dot path attempts
    expect([400, 403, 404]).toContain(response.statusCode);
  });
});
