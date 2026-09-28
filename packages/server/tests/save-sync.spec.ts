import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SaveSyncRequestDTO, SaveSyncResponseDTO, SaveSlotDTO } from '@retro-pi-hub/shared';

describe('Seam: SRAM Save Sync & Revision Snapshots (Ticket #05)', () => {
  let tempDir: string;
  let savesDir: string;
  let lockFilePath: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-saves-'));
    savesDir = path.join(tempDir, 'saves');
    lockFilePath = path.join(tempDir, 'retroarch_active.json');

    const snesSaves = path.join(savesDir, 'snes');
    await fs.mkdir(snesSaves, { recursive: true });

    app = buildApp({
      romsDir: tempDir,
      savesDir,
      tvLockFilePath: lockFilePath
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('POST /api/saves/:system/:rom/sync should successfully write SRAM and return 200', async () => {
    const sramContent = Buffer.from('zelda-save-progress-100%');
    const hash = crypto.createHash('sha256').update(sramContent).digest('hex');

    const payload: SaveSyncRequestDTO = {
      system: 'snes',
      romName: 'Zelda - A Link to the Past',
      slot: 'tv_shared',
      sramBase64: sramContent.toString('base64'),
      sha256: hash,
      timestamp: Date.now()
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/snes/Zelda%20-%20A%20Link%20to%20the%20Past/sync',
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<SaveSyncResponseDTO>();
    expect(body.success).toBe(true);
    expect(body.slot).toBe('tv_shared');

    // Verify file on disk
    const savedFile = path.join(savesDir, 'snes', 'Zelda - A Link to the Past.srm');
    const diskContent = await fs.readFile(savedFile);
    expect(diskContent).toEqual(sramContent);
  });

  it('POST /api/saves/:system/:rom/sync should reject corrupted payload with sha256 mismatch', async () => {
    const sramContent = Buffer.from('actual-data');
    const fakeHash = crypto.createHash('sha256').update('different-data').digest('hex');

    const payload: SaveSyncRequestDTO = {
      system: 'snes',
      romName: 'Zelda - A Link to the Past',
      slot: 'tv_shared',
      sramBase64: sramContent.toString('base64'),
      sha256: fakeHash,
      timestamp: Date.now()
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/snes/Zelda%20-%20A%20Link%20to%20the%20Past/sync',
      payload
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/saves/:system/:rom/sync should return 409 Conflict when TV lock is active on tv_shared slot', async () => {
    // Write active TV lock
    await fs.writeFile(
      lockFilePath,
      JSON.stringify({
        system: 'snes',
        romName: 'Zelda - A Link to the Past',
        pid: 1234
      })
    );

    const sramContent = Buffer.from('attempt-overwrite');
    const hash = crypto.createHash('sha256').update(sramContent).digest('hex');

    const payload: SaveSyncRequestDTO = {
      system: 'snes',
      romName: 'Zelda - A Link to the Past',
      slot: 'tv_shared',
      sramBase64: sramContent.toString('base64'),
      sha256: hash,
      timestamp: Date.now()
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/snes/Zelda%20-%20A%20Link%20to%20the%20Past/sync',
      payload
    });

    expect(response.statusCode).toBe(409);
  });

  it('POST /api/saves/:system/:rom/sync should allow saving to user slot even if TV lock is active', async () => {
    // Write active TV lock
    await fs.writeFile(
      lockFilePath,
      JSON.stringify({
        system: 'snes',
        romName: 'Zelda - A Link to the Past',
        pid: 1234
      })
    );

    const sramContent = Buffer.from('user1-safe-save');
    const hash = crypto.createHash('sha256').update(sramContent).digest('hex');

    const payload: SaveSyncRequestDTO = {
      system: 'snes',
      romName: 'Zelda - A Link to the Past',
      slot: 'user_player2',
      sramBase64: sramContent.toString('base64'),
      sha256: hash,
      timestamp: Date.now()
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/snes/Zelda%20-%20A%20Link%20to%20the%20Past/sync',
      payload
    });

    expect(response.statusCode).toBe(200);
    const savedFile = path.join(savesDir, 'snes', 'Zelda - A Link to the Past.user_player2.srm');
    const diskContent = await fs.readFile(savedFile);
    expect(diskContent).toEqual(sramContent);
  });

  it('should maintain rolling backup snapshots (max 5) on overwrite', async () => {
    const snesSaves = path.join(savesDir, 'snes');
    const mainFile = path.join(snesSaves, 'Mario.srm');
    await fs.writeFile(mainFile, 'initial-content');

    // Trigger 6 overwrites
    for (let i = 1; i <= 6; i++) {
      const data = Buffer.from(`revision-${i}`);
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      const response = await app.inject({
        method: 'POST',
        url: '/api/saves/snes/Mario/sync',
        payload: {
          system: 'snes',
          romName: 'Mario',
          slot: 'tv_shared',
          sramBase64: data.toString('base64'),
          sha256: hash,
          timestamp: Date.now() + i
        }
      });
      expect(response.statusCode).toBe(200);
    }

    const snapshotDir = path.join(savesDir, 'snapshots', 'snes');
    const snapshotFiles = await fs.readdir(snapshotDir);
    expect(snapshotFiles.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/saves/:system/:rom/slots should list available slots', async () => {
    const snesSaves = path.join(savesDir, 'snes');
    await fs.writeFile(path.join(snesSaves, 'Metroid.srm'), Buffer.alloc(100));
    await fs.writeFile(path.join(snesSaves, 'Metroid.user1.srm'), Buffer.alloc(200));

    const response = await app.inject({
      method: 'GET',
      url: '/api/saves/snes/Metroid/slots'
    });

    expect(response.statusCode).toBe(200);
    const slots = response.json<SaveSlotDTO[]>();
    expect(slots).toHaveLength(2);
    expect(slots.some((s) => s.slot === 'tv_shared' && s.isTvShared)).toBe(true);
    expect(slots.some((s) => s.slot === 'user1' && !s.isTvShared)).toBe(true);
  });
});
