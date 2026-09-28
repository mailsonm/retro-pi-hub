import fs from 'node:fs/promises';
import { TvLockStatusDTO } from '@retro-pi-hub/shared';

export interface TvSessionHookData {
  system: string;
  romName: string;
  romPath?: string;
  pid?: number;
  startedAt?: string;
}

export interface TvLockServiceOptions {
  lockFilePath?: string;
}

export class TvLockService {
  private readonly lockFilePath: string;

  constructor(options?: TvLockServiceOptions) {
    this.lockFilePath = options?.lockFilePath || '/dev/shm/retroarch_active.json';
  }

  async getLockStatus(system: string, romName: string): Promise<TvLockStatusDTO> {
    const activeSession = await this.readHookFile();

    if (!activeSession) {
      return {
        isLocked: false,
        activeOnTv: false
      };
    }

    const systemMatches = activeSession.system.toLowerCase() === system.toLowerCase();
    const romMatches = this.normalizeRomName(activeSession.romName) === this.normalizeRomName(romName);

    if (systemMatches && romMatches) {
      return {
        isLocked: true,
        activeOnTv: true,
        currentRom: activeSession.romName,
        lockedSince: activeSession.startedAt
      };
    }

    return {
      isLocked: false,
      activeOnTv: false
    };
  }

  private async readHookFile(): Promise<TvSessionHookData | null> {
    try {
      const content = await fs.readFile(this.lockFilePath, 'utf8');
      return JSON.parse(content) as TvSessionHookData;
    } catch {
      return null;
    }
  }

  private normalizeRomName(name: string): string {
    return name.trim().toLowerCase().replace(/\.[^/.]+$/, '');
  }
}
