import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from '../src/app.js';
import { SystemCatalogDTO } from '@retro-pi-hub/shared';

describe('Seam: ROM Catalog Indexing & REST API (Ticket #02)', () => {
  let tempRomsDir: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    tempRomsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-pi-hub-roms-'));

    // Create SNES system folder and mock ROMs
    const snesDir = path.join(tempRomsDir, 'snes');
    await fs.mkdir(snesDir, { recursive: true });
    await fs.writeFile(path.join(snesDir, 'Super Mario World (USA).sfc'), Buffer.alloc(1024));
    await fs.writeFile(path.join(snesDir, 'Super Mario World (USA).srm'), Buffer.alloc(512));
    await fs.writeFile(path.join(snesDir, 'Chrono Trigger (USA).smc'), Buffer.alloc(2048));
    // Duplicates: Aladdin (.smc vs .zip) and Top Gear (USA vs PT-BR)
    await fs.writeFile(path.join(snesDir, 'Aladdin (USA).smc'), Buffer.alloc(500));
    await fs.writeFile(path.join(snesDir, 'Aladdin (USA).zip'), Buffer.alloc(250));
    await fs.writeFile(path.join(snesDir, 'Top Gear (USA).smc'), Buffer.alloc(400));
    await fs.writeFile(path.join(snesDir, 'Top Gear (Brazil) [T-Por].zip'), Buffer.alloc(300));
    await fs.writeFile(path.join(snesDir, '.DS_Store'), 'noise');

    // Create GBA system folder
    const gbaDir = path.join(tempRomsDir, 'gba');
    await fs.mkdir(gbaDir, { recursive: true });
    await fs.writeFile(path.join(gbaDir, 'Pokemon Emerald (USA).gba'), Buffer.alloc(4096));

    // Create Game Boy system folder with thumb.png artwork
    const gbDir = path.join(tempRomsDir, 'gb');
    await fs.mkdir(path.join(gbDir, 'images'), { recursive: true });
    await fs.writeFile(path.join(gbDir, 'Aerostar (USA, Europe).gb'), Buffer.alloc(1024));
    await fs.writeFile(path.join(gbDir, 'images', 'Aerostar (USA, Europe)-thumb.png'), Buffer.alloc(100));

    // Create an unsupported system folder
    const dummyDir = path.join(tempRomsDir, 'unknown_system');
    await fs.mkdir(dummyDir, { recursive: true });
    await fs.writeFile(path.join(dummyDir, 'foo.bar'), 'test');

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

  it('GET /api/catalog should return 200 with structured SystemCatalogDTO[]', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/catalog'
    });

    expect(response.statusCode).toBe(200);
    const catalog = response.json<SystemCatalogDTO[]>();

    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThanOrEqual(3);

    const snes = catalog.find((c) => c.system === 'snes');
    expect(snes).toBeDefined();
    expect(snes?.name).toBe('Super Nintendo');
    expect(snes?.coreName).toBe('snes9x');
    // SMW, Chrono Trigger, Aladdin (1 instead of 2), Top Gear (1 instead of 2) -> 4 games total!
    expect(snes?.gamesCount).toBe(4);

    // Verify SMW has SRAM save
    const smw = snes?.games.find((g) => g.title.includes('Super Mario World'));
    expect(smw).toBeDefined();
    expect(smw?.fileName).toBe('Super Mario World (USA).sfc');
    expect(smw?.hasSramSave).toBe(true);
    expect(smw?.fileSizeBytes).toBe(1024);

    // Verify Chrono Trigger has no SRAM save
    const ct = snes?.games.find((g) => g.title.includes('Chrono Trigger'));
    expect(ct).toBeDefined();
    expect(ct?.hasSramSave).toBe(false);

    // Verify Aladdin deduplicated to .zip
    const aladdin = snes?.games.find((g) => g.fileName.includes('Aladdin'));
    expect(aladdin).toBeDefined();
    expect(aladdin?.fileName).toBe('Aladdin (USA).zip');

    // Verify Top Gear prioritized Portuguese translation
    const topGear = snes?.games.find((g) => g.fileName.includes('Top Gear'));
    expect(topGear).toBeDefined();
    expect(topGear?.fileName).toBe('Top Gear (Brazil) [T-Por].zip');
    expect(topGear?.language).toBe('pt-br');

    // Verify Game Boy artwork fallback found thumb.png
    const gb = catalog.find((c) => c.system === 'gb');
    expect(gb).toBeDefined();
    const aerostar = gb?.games.find((g) => g.fileName.includes('Aerostar'));
    expect(aerostar).toBeDefined();
    expect(aerostar?.boxartUrl).toContain('images/Aerostar (USA, Europe)-thumb.png');

    // Verify noise files and unsupported systems are filtered out
    expect(snes?.games.some((g) => g.fileName === '.DS_Store')).toBe(false);
    expect(catalog.some((c) => c.system === 'unknown_system')).toBe(false);
  });
});
