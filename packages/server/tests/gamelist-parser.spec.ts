import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { GamelistParserService } from '../src/services/gamelist-parser.service.js';

describe('GamelistParserService', () => {
  let tempDir: string;
  let gamelistPath: string;

  const mockXml = `<?xml version="1.0"?>
<gameList>
  <game>
    <path>./Super Mario World (USA).zip</path>
    <name>Super Mario World</name>
    <desc>Mario e Luigi chegam na Terra dos Dinossauros.</desc>
    <image>./images/Super Mario World (USA)-image.jpg</image>
    <thumbnail>./images/Super Mario World (USA)-thumb.jpg</thumbnail>
    <genre>Platform</genre>
    <rating>0.95</rating>
    <releasedate>19901121T000000</releasedate>
    <developer>Nintendo EAD</developer>
    <publisher>Nintendo</publisher>
    <players>1-2</players>
    <lang>pt-br</lang>
  </game>
  <game>
    <path>./Aerostar (USA, Europe).gb</path>
    <name>Aerostar</name>
    <desc>Vertical shoot em up.</desc>
    <thumbnail>./images/Aerostar (USA, Europe)-thumb.png</thumbnail>
    <players>1</players>
  </game>
  <game>
    <path>./Chrono Trigger (USA).smc</path>
    <name>Chrono Trigger</name>
    <desc>A classic RPG across time.</desc>
    <image>./media/images/Chrono Trigger (USA).png</image>
    <genre>RPG</genre>
  </game>
</gameList>`;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gamelist-test-'));
    gamelistPath = path.join(tempDir, 'gamelist.xml');
    await fs.writeFile(gamelistPath, mockXml, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse gamelist.xml and index games by normalized file name', async () => {
    const parser = new GamelistParserService();
    await parser.load(gamelistPath);

    const smw = parser.getGameMetadata('Super Mario World (USA).zip');
    expect(smw).toBeDefined();
    expect(smw?.name).toBe('Super Mario World');
    expect(smw?.desc).toBe('Mario e Luigi chegam na Terra dos Dinossauros.');
    expect(smw?.image).toBe('images/Super Mario World (USA)-image.jpg');
    expect(smw?.thumbnail).toBe('images/Super Mario World (USA)-thumb.jpg');
    expect(smw?.genre).toBe('Platform');
    expect(smw?.rating).toBe(0.95);
    expect(smw?.developer).toBe('Nintendo EAD');
    expect(smw?.publisher).toBe('Nintendo');
    expect(smw?.players).toBe(2);
    expect(smw?.lang).toBe('pt-br');

    const aero = parser.getGameMetadata('Aerostar (USA, Europe).gb');
    expect(aero).toBeDefined();
    expect(aero?.thumbnail).toBe('images/Aerostar (USA, Europe)-thumb.png');
    expect(aero?.image).toBeUndefined();
    expect(aero?.players).toBe(1);
  });

  it('should match game even if extension differs in path vs actual file', async () => {
    const parser = new GamelistParserService();
    await parser.load(gamelistPath);

    // If file is stored as .sfc but gamelist had .smc
    const ct = parser.getGameMetadata('Chrono Trigger (USA).sfc');
    expect(ct).toBeDefined();
    expect(ct?.name).toBe('Chrono Trigger');
    expect(ct?.genre).toBe('RPG');
  });

  it('should return null gracefully if gamelist.xml does not exist', async () => {
    const parser = new GamelistParserService();
    await parser.load(path.join(tempDir, 'non_existent.xml'));
    expect(parser.getGameMetadata('Any.zip')).toBeNull();
  });
});
