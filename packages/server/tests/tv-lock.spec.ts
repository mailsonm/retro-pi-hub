import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from '../src/app.js';
import { TvLockStatusDTO } from '@retro-pi-hub/shared';

describe('Seam: Active TV Session Lock Detector (Ticket #04)', () => {
  let tempDir: string;
  let lockFilePath: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-tvlock-'));
    lockFilePath = path.join(tempDir, 'retroarch_active.json');

    app = buildApp({
      romsDir: tempDir,
      savesDir: tempDir,
      tvLockFilePath: lockFilePath
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('GET /api/saves/:system/:rom/lock-status should report isLocked=false when no TV session is active', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/saves/snes/Super%20Mario%20World/lock-status'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<TvLockStatusDTO>();
    expect(body.isLocked).toBe(false);
    expect(body.activeOnTv).toBe(false);
  });

  it('GET /api/saves/:system/:rom/lock-status should report isLocked=true when TV session matches system and rom', async () => {
    const lockPayload = {
      system: 'snes',
      romName: 'Super Mario World',
      romPath: '/roms/snes/Super Mario World.sfc',
      pid: 4321,
      startedAt: '2026-09-27T12:00:00.000Z'
    };
    await fs.writeFile(lockFilePath, JSON.stringify(lockPayload));

    // Wait a brief tick for file system watcher or direct read
    const response = await app.inject({
      method: 'GET',
      url: '/api/saves/snes/Super%20Mario%20World/lock-status'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<TvLockStatusDTO>();
    expect(body.isLocked).toBe(true);
    expect(body.activeOnTv).toBe(true);
    expect(body.currentRom).toBe('Super Mario World');
    expect(body.lockedSince).toBe('2026-09-27T12:00:00.000Z');
  });

  it('GET /api/saves/:system/:rom/lock-status should report isLocked=false if a different game is running on TV', async () => {
    const lockPayload = {
      system: 'snes',
      romName: 'Chrono Trigger',
      romPath: '/roms/snes/Chrono Trigger.sfc',
      pid: 4321,
      startedAt: '2026-09-27T12:00:00.000Z'
    };
    await fs.writeFile(lockFilePath, JSON.stringify(lockPayload));

    const response = await app.inject({
      method: 'GET',
      url: '/api/saves/snes/Super%20Mario%20World/lock-status'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<TvLockStatusDTO>();
    expect(body.isLocked).toBe(false);
    expect(body.activeOnTv).toBe(false);
  });

  it('GET /api/saves/tv_lock_status should report global TV status', async () => {
    const idleRes = await app.inject({
      method: 'GET',
      url: '/api/saves/tv_lock_status'
    });
    expect(idleRes.statusCode).toBe(200);
    expect(idleRes.json()).toEqual({ active: false });

    const lockPayload = {
      system: 'snes',
      romName: 'Super Mario World',
      startedAt: '2026-09-27T12:00:00.000Z'
    };
    await fs.writeFile(lockFilePath, JSON.stringify(lockPayload));

    const activeRes = await app.inject({
      method: 'GET',
      url: '/api/saves/tv_lock_status'
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().active).toBe(true);
    expect(activeRes.json().session.romName).toBe('Super Mario World');
  });
});
