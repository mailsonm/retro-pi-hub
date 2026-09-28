import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SUPPORTED_SYSTEMS,
  isValidSystem,
  SystemCatalogDTO,
  RomItemDTO
} from '@retro-pi-hub/shared';

export interface CatalogServiceOptions {
  romsDir: string;
  savesDir?: string;
}

export class CatalogService {
  private readonly romsDir: string;
  private readonly savesDir: string;

  constructor(options: CatalogServiceOptions) {
    this.romsDir = options.romsDir;
    this.savesDir = options.savesDir || options.romsDir;
  }

  async getCatalog(): Promise<SystemCatalogDTO[]> {
    const catalog: SystemCatalogDTO[] = [];

    let entries: string[];
    try {
      entries = await fs.readdir(this.romsDir);
    } catch {
      return [];
    }

    for (const entry of entries) {
      if (!isValidSystem(entry)) {
        continue;
      }

      const systemDef = SUPPORTED_SYSTEMS[entry];
      const systemPath = path.join(this.romsDir, entry);
      const stat = await fs.stat(systemPath);

      if (!stat.isDirectory()) {
        continue;
      }

      const romFiles = await fs.readdir(systemPath);
      const games: RomItemDTO[] = [];

      for (const file of romFiles) {
        // Skip hidden and system noise files
        if (file.startsWith('.') || file.startsWith('._')) {
          continue;
        }

        const ext = path.extname(file).toLowerCase();
        if (!systemDef.extensions.includes(ext)) {
          continue;
        }

        const filePath = path.join(systemPath, file);
        const fileStat = await fs.stat(filePath);
        if (!fileStat.isFile()) {
          continue;
        }

        const baseName = path.basename(file, ext);
        const hasSram = await this.checkSramExists(entry, baseName, file);

        games.push({
          id: `${entry}-${this.slugify(baseName)}`,
          system: entry,
          title: baseName,
          fileName: file,
          fileSizeBytes: fileStat.size,
          hasSramSave: hasSram
        });
      }

      catalog.push({
        system: entry,
        name: systemDef.name,
        coreName: systemDef.coreName,
        gamesCount: games.length,
        games
      });
    }

    return catalog;
  }

  private async checkSramExists(system: string, baseName: string, fileName: string): Promise<boolean> {
    const candidatePaths = [
      path.join(this.savesDir, system, `${baseName}.srm`),
      path.join(this.savesDir, system, `${baseName}.sav`),
      path.join(this.savesDir, system, `${fileName}.srm`),
      path.join(this.romsDir, system, `${baseName}.srm`),
      path.join(this.romsDir, system, `${baseName}.sav`)
    ];

    for (const candidate of candidatePaths) {
      try {
        const s = await fs.stat(candidate);
        if (s.isFile()) {
          return true;
        }
      } catch {
        // file doesn't exist
      }
    }

    return false;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
