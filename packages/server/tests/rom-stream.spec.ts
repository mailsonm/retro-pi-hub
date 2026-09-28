import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from '../src/app.js';

describe('Seam: HTTP Range Resumable ROM Streaming (Ticket #03)', () => {
  let tempRomsDir: string;
  let app: ReturnType<typeof buildApp>;
  const dummyRomSize = 1024;
  const dummyBuffer = Buffer.alloc(dummyRomSize);
  for (let i = 0; i < dummyRomSize; i++) {
    dummyBuffer[i] = i % 256;
  }

  beforeEach(async () => {
    tempRomsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-stream-'));
    const snesDir = path.join(tempRomsDir, 'snes');
    await fs.mkdir(snesDir, { recursive: true });
    await fs.writeFile(path.join(snesDir, 'super-mario.sfc'), dummyBuffer);

    app = buildApp({
      romsDir: tempRomsDir,
      savesDir: tempRomsDir
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempRomsDir, { recursive: true, force: true });
  });

  it('GET /api/roms/:system/:rom without Range header should return 200 with full content', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/roms/snes/super-mario.sfc'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-length']).toBe(String(dummyRomSize));
    expect(response.rawPayload).toEqual(dummyBuffer);
  });

  it('GET /api/roms/:system/:rom with valid Range header should return 206 Partial Content', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/roms/snes/super-mario.sfc',
      headers: {
        range: 'bytes=0-99'
      }
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['content-range']).toBe(`bytes 0-99/${dummyRomSize}`);
    expect(response.headers['content-length']).toBe('100');
    expect(response.rawPayload).toEqual(dummyBuffer.subarray(0, 100));
  });

  it('GET /api/roms/:system/:rom with tail Range header should return correct tail bytes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/roms/snes/super-mario.sfc',
      headers: {
        range: 'bytes=1000-1023'
      }
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['content-range']).toBe(`bytes 1000-1023/${dummyRomSize}`);
    expect(response.headers['content-length']).toBe('24');
    expect(response.rawPayload).toEqual(dummyBuffer.subarray(1000, 1024));
  });

  it('GET /api/roms/:system/:rom with invalid out-of-bounds Range should return 416', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/roms/snes/super-mario.sfc',
      headers: {
        range: 'bytes=5000-6000'
      }
    });

    expect(response.statusCode).toBe(416);
    expect(response.headers['content-range']).toBe(`bytes */${dummyRomSize}`);
  });

  it('GET /api/roms/:system/:rom should prevent path traversal outside designated system folder', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/roms/snes/..%2F..%2Fsecret.txt'
    });

    expect([400, 403, 404]).toContain(response.statusCode);
  });
});
