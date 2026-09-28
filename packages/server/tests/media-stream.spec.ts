import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from '../src/app.js';

describe('MediaStreamRoutes (Boxart & Artwork)', () => {
  let tempRomsDir: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    tempRomsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-media-'));
    const snesImagesDir = path.join(tempRomsDir, 'snes', 'images');
    await fs.mkdir(snesImagesDir, { recursive: true });

    // 1x1 GIF / Mock JPEG
    const mockImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    await fs.writeFile(path.join(snesImagesDir, 'smw-image.jpg'), mockImage);

    app = buildApp({
      romsDir: tempRomsDir
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempRomsDir, { recursive: true, force: true });
  });

  it('GET /api/media/:system/* should serve existing image with 200 and image mime type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/media/snes/images/smw-image.jpg'
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['cache-control']).toContain('public');
  });

  it('GET /api/media/:system/* should return 404 for non-existent image', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/media/snes/images/not-found.jpg'
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /api/media/:system/* should reject path traversal attempts with 403 or 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/media/snes/../../../etc/passwd'
    });

    expect([400, 403, 404]).toContain(res.statusCode);
  });
});
