import fs from 'node:fs/promises';
import path from 'node:path';

export interface ParsedGameMetadata {
  path: string;
  name?: string;
  desc?: string;
  image?: string;
  thumbnail?: string;
  genre?: string;
  rating?: number;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  players?: number;
  lang?: string;
}

export class GamelistParserService {
  private gamesByExactFile: Map<string, ParsedGameMetadata> = new Map();
  private gamesByBaseName: Map<string, ParsedGameMetadata> = new Map();

  async load(gamelistXmlPath: string): Promise<void> {
    this.gamesByExactFile.clear();
    this.gamesByBaseName.clear();

    let content: string;
    try {
      content = await fs.readFile(gamelistXmlPath, 'utf-8');
    } catch {
      return;
    }

    this.parse(content);
  }

  parse(xmlContent: string): void {
    const gameBlockRegex = /<game\b[^>]*>([\s\S]*?)<\/game>/gi;
    let match: RegExpExecArray | null;

    while ((match = gameBlockRegex.exec(xmlContent)) !== null) {
      const block = match[1];
      const rawPath = this.extractTag(block, 'path');
      if (!rawPath) continue;

      const normalizedRelativePath = rawPath.replace(/^\.\//, '').trim();
      const fileName = path.basename(normalizedRelativePath);
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);

      const ratingStr = this.extractTag(block, 'rating');
      const rating = ratingStr ? parseFloat(ratingStr) : undefined;

      const playersStr = this.extractTag(block, 'players');
      let players: number | undefined;
      if (playersStr) {
        const numbers = playersStr.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          players = parseInt(numbers[numbers.length - 1], 10);
        }
      }

      const normalizeAssetPath = (val?: string) => {
        if (!val) return undefined;
        return val.replace(/^\.\//, '').trim();
      };

      const meta: ParsedGameMetadata = {
        path: normalizedRelativePath,
        name: this.extractTag(block, 'name'),
        desc: this.extractTag(block, 'desc'),
        image: normalizeAssetPath(this.extractTag(block, 'image')),
        thumbnail: normalizeAssetPath(this.extractTag(block, 'thumbnail')),
        genre: this.extractTag(block, 'genre'),
        rating: typeof rating === 'number' && !isNaN(rating) ? rating : undefined,
        releaseDate: this.extractTag(block, 'releasedate'),
        developer: this.extractTag(block, 'developer'),
        publisher: this.extractTag(block, 'publisher'),
        players,
        lang: this.extractTag(block, 'lang')
      };

      this.gamesByExactFile.set(fileName.toLowerCase(), meta);
      this.gamesByBaseName.set(baseName.toLowerCase(), meta);
    }
  }

  getGameMetadata(romFileName: string): ParsedGameMetadata | null {
    const lower = romFileName.toLowerCase();
    if (this.gamesByExactFile.has(lower)) {
      return this.gamesByExactFile.get(lower)!;
    }

    const ext = path.extname(lower);
    const baseName = path.basename(lower, ext);
    if (this.gamesByBaseName.has(baseName)) {
      return this.gamesByBaseName.get(baseName)!;
    }

    return null;
  }

  private extractTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = regex.exec(xml);
    if (!match) return undefined;
    return match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }
}
