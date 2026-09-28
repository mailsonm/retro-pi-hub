import fs from 'node:fs/promises';
import { createReadStream, Stats } from 'node:fs';
import path from 'node:path';
import { isValidSystem } from '@retro-pi-hub/shared';

export interface RomStreamResult {
  statusCode: number;
  headers: Record<string, string>;
  stream?: NodeJS.ReadableStream;
}

export class RomStreamService {
  private readonly romsDir: string;

  constructor(romsDir: string) {
    this.romsDir = romsDir;
  }

  async resolveRomStream(system: string, romFileName: string, rangeHeader?: string): Promise<RomStreamResult> {
    if (!isValidSystem(system)) {
      return {
        statusCode: 400,
        headers: {}
      };
    }

    // Path traversal check
    const sanitizedRom = path.basename(romFileName);
    const resolvedPath = path.resolve(this.romsDir, system, sanitizedRom);
    const expectedBase = path.resolve(this.romsDir, system);

    if (!resolvedPath.startsWith(expectedBase + path.sep)) {
      return {
        statusCode: 403,
        headers: {}
      };
    }

    let stats: Stats;
    try {
      stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        return { statusCode: 404, headers: {} };
      }
    } catch {
      return { statusCode: 404, headers: {} };
    }

    const totalSize = stats.size;

    if (!rangeHeader) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes'
        },
        stream: createReadStream(resolvedPath)
      };
    }

    // Parse Range header: bytes=start-end
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      return {
        statusCode: 416,
        headers: {
          'Content-Range': `bytes */${totalSize}`
        }
      };
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize || start > end) {
      return {
        statusCode: 416,
        headers: {
          'Content-Range': `bytes */${totalSize}`
        }
      };
    }

    const chunkSize = end - start + 1;

    return {
      statusCode: 206,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Content-Length': String(chunkSize),
        'Accept-Ranges': 'bytes'
      },
      stream: createReadStream(resolvedPath, { start, end })
    };
  }
}
