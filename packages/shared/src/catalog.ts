export interface SystemDefinition {
  system: string;
  name: string;
  coreName: string;
  extensions: string[];
}

export const SUPPORTED_SYSTEMS: Record<string, SystemDefinition> = {
  snes: {
    system: 'snes',
    name: 'Super Nintendo',
    coreName: 'snes9x',
    extensions: ['.sfc', '.smc', '.zip']
  },
  nes: {
    system: 'nes',
    name: 'Nintendo Entertainment System',
    coreName: 'fceumm',
    extensions: ['.nes', '.zip']
  },
  gba: {
    system: 'gba',
    name: 'Game Boy Advance',
    coreName: 'mgba',
    extensions: ['.gba', '.zip']
  },
  gb: {
    system: 'gb',
    name: 'Game Boy / Game Boy Color',
    coreName: 'gambatte',
    extensions: ['.gb', '.gbc', '.zip']
  },
  genesis: {
    system: 'genesis',
    name: 'Sega Genesis / Mega Drive',
    coreName: 'genesis_plus_gx',
    extensions: ['.bin', '.gen', '.md', '.smd', '.zip']
  },
  psx: {
    system: 'psx',
    name: 'Sony PlayStation',
    coreName: 'pcsx_rearmed',
    extensions: ['.chd', '.cue', '.iso', '.pbp']
  }
};

export function isValidSystem(system: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_SYSTEMS, system);
}

export interface RomItemDTO {
  id: string;
  system: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  hasSramSave: boolean;
  boxartUrl?: string;
}

export interface SystemCatalogDTO {
  system: string;
  name: string;
  coreName: string;
  gamesCount: number;
  games: RomItemDTO[];
}
