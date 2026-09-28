import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SUPPORTED_SYSTEMS,
  isValidSystem,
  SystemCatalogDTO,
  RomItemDTO
} from '@retro-pi-hub/shared';
import { GamelistParserService } from './gamelist-parser.service.js';

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

      const gamelistPath = path.join(systemPath, 'gamelist.xml');
      const parser = new GamelistParserService();
      await parser.load(gamelistPath);

      const romFiles = await fs.readdir(systemPath);
      const gamesByCanonical = new Map<string, { item: RomItemDTO; score: number }>();

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
        const meta = parser.getGameMetadata(file);

        let boxartUrl: string | undefined;
        let thumbnailUrl: string | undefined;

        if (meta?.image) {
          boxartUrl = `/api/media/${entry}/${meta.image}`;
        } else if (meta?.thumbnail) {
          boxartUrl = `/api/media/${entry}/${meta.thumbnail}`;
        }

        if (meta?.thumbnail) {
          thumbnailUrl = `/api/media/${entry}/${meta.thumbnail}`;
        } else if (meta?.image) {
          thumbnailUrl = `/api/media/${entry}/${meta.image}`;
        }

        // Fallback artwork lookup if not in gamelist
        if (!boxartUrl) {
          const possibleThumbs = [
            `images/${baseName}-image.jpg`,
            `images/${baseName}-image.png`,
            `images/${baseName}-thumb.jpg`,
            `images/${baseName}-thumb.png`,
            `images/${baseName}.png`,
            `images/${baseName}.jpg`,
            `media/images/${baseName}.png`,
            `media/images/${baseName}.jpg`,
            `media/box3d/${baseName}.png`,
            `media/box3d/${baseName}.jpg`
          ];
          for (const rel of possibleThumbs) {
            if (await this.fileExists(path.join(systemPath, rel))) {
              boxartUrl = `/api/media/${entry}/${rel}`;
              thumbnailUrl = boxartUrl;
              break;
            }
          }
        }

        // Compute priority score & language
        const { score, language } = this.computeRomScore(file, meta, hasSram);
        const canonicalKey = this.extractCanonicalKey(file, meta?.name);

        const currentItem: RomItemDTO = {
          id: `${entry}-${this.slugify(baseName)}`,
          system: entry,
          title: meta?.name || baseName,
          fileName: file,
          fileSizeBytes: fileStat.size,
          hasSramSave: hasSram,
          boxartUrl,
          thumbnailUrl: thumbnailUrl || boxartUrl,
          description: meta?.desc,
          genre: meta?.genre,
          rating: meta?.rating,
          releaseDate: meta?.releaseDate,
          developer: meta?.developer,
          publisher: meta?.publisher,
          players: meta?.players || 1,
          language
        };

        const existing = gamesByCanonical.get(canonicalKey);
        if (!existing) {
          gamesByCanonical.set(canonicalKey, { item: currentItem, score });
        } else {
          // If current candidate scores higher (e.g., PT-BR vs USA, or .zip vs .smc)
          if (score > existing.score) {
            // Inherit SRAM save flag if previous had it
            if (existing.item.hasSramSave) {
              currentItem.hasSramSave = true;
            }
            // Inherit artwork/metadata if candidate lacked it
            if (!currentItem.boxartUrl && existing.item.boxartUrl) {
              currentItem.boxartUrl = existing.item.boxartUrl;
              currentItem.thumbnailUrl = existing.item.thumbnailUrl;
            }
            if (!currentItem.description && existing.item.description) {
              currentItem.description = existing.item.description;
            }
            gamesByCanonical.set(canonicalKey, { item: currentItem, score });
          } else {
            // Existing is preferred, but merge any missing artwork/metadata from candidate
            if (!existing.item.boxartUrl && boxartUrl) {
              existing.item.boxartUrl = boxartUrl;
              existing.item.thumbnailUrl = thumbnailUrl || boxartUrl;
            }
            if (hasSram) {
              existing.item.hasSramSave = true;
            }
          }
        }
      }

      const games = Array.from(gamesByCanonical.values())
        .map(entry => entry.item)
        .sort((a, b) => a.title.localeCompare(b.title));

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

  private extractCanonicalKey(fileName: string, title?: string): string {
    const raw = title || path.basename(fileName, path.extname(fileName));
    // Remove bracketed tags like [T-Por], [!], [b1], etc.
    // Remove parenthesized tags like (USA), (Europe), (Brazil), (Rev 1), etc.
    const clean = raw
      .replace(/\s*\[[^\]]*\]\s*/g, ' ')
      .replace(/\s*\([^\)]*\)\s*/g, ' ')
      .trim();
    return this.slugify(clean || raw);
  }

  private computeRomScore(
    file: string,
    meta: { desc?: string; lang?: string; image?: string; thumbnail?: string } | null,
    hasSram: boolean
  ): { score: number; language: string } {
    let score = 0;
    let language = 'en';

    const lowerName = file.toLowerCase();
    const lowerDesc = (meta?.desc || '').toLowerCase();
    const metaLang = (meta?.lang || '').toLowerCase();

    const isPtBr =
      /(\b|_|-)(brazil|brasil|portugu[eê]s|t-por|pt-br|pt)(\b|_|-)/i.test(lowerName) ||
      metaLang === 'pt-br' ||
      metaLang === 'pt' ||
      lowerDesc.includes('traduzido') ||
      lowerDesc.includes('português') ||
      lowerDesc.includes('portugues');

    if (isPtBr) {
      score += 1000;
      language = 'pt-br';
    } else if (/(\b|_|-)(usa|us|en)(\b|_|-)/i.test(lowerName)) {
      score += 500;
      language = 'en';
    } else if (/(\b|_|-)(europe|eur)(\b|_|-)/i.test(lowerName)) {
      score += 400;
      language = 'en';
    } else if (/(\b|_|-)(japan|jp)(\b|_|-)/i.test(lowerName)) {
      score += 300;
      language = 'ja';
    }

    // Compressed formats load faster and save disk space
    if (lowerName.endsWith('.zip')) {
      score += 100;
    }

    // Preserve existing save files
    if (hasSram) {
      score += 200;
    }

    // Gamelist metadata quality
    if (meta?.image || meta?.thumbnail) {
      score += 50;
    }
    if (meta?.desc) {
      score += 20;
    }

    return { score, language };
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

  private async fileExists(p: string): Promise<boolean> {
    try {
      const s = await fs.stat(p);
      return s.isFile();
    } catch {
      return false;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
