import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  SaveSyncRequestDTO,
  SaveSyncResponseDTO,
  SaveSlotDTO,
  validateSaveSyncRequest
} from '@retro-pi-hub/shared';
import { TvLockService } from './tv-lock.service.js';

export interface SaveSyncResult {
  statusCode: number;
  body: SaveSyncResponseDTO | { error: string; message?: string };
}

export class SaveSyncService {
  private readonly savesDir: string;
  private revisionCounters: Map<string, number> = new Map();

  constructor(savesDir: string) {
    this.savesDir = savesDir;
  }

  async syncSave(
    system: string,
    romName: string,
    req: SaveSyncRequestDTO,
    tvLockService: TvLockService
  ): Promise<SaveSyncResult> {
    const validation = validateSaveSyncRequest(req);
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: { error: 'INVALID_PAYLOAD', message: validation.errors.join(', ') }
      };
    }

    // Verify SHA-256 integrity
    const buffer = Buffer.from(req.sramBase64, 'base64');
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (computedHash.toLowerCase() !== req.sha256.toLowerCase()) {
      return {
        statusCode: 400,
        body: { error: 'HASH_MISMATCH', message: 'Calculated SHA-256 does not match payload' }
      };
    }

    // Check TV session lock
    if (req.slot === 'tv_shared') {
      const lockStatus = await tvLockService.getLockStatus(system, romName);
      if (lockStatus.isLocked) {
        return {
          statusCode: 409,
          body: {
            error: 'LOCKED_BY_TV',
            message: 'Game is actively running on the TV. Direct overwrite to tv_shared is locked.'
          }
        };
      }
    }

    const systemDir = path.join(this.savesDir, system);
    await fs.mkdir(systemDir, { recursive: true });

    const fileName = req.slot === 'tv_shared' ? `${romName}.srm` : `${romName}.${req.slot}.srm`;
    const targetPath = path.join(systemDir, fileName);

    // Create backup snapshot if file exists
    try {
      const current = await fs.readFile(targetPath);
      await this.createBackupSnapshot(system, romName, req.slot, current);
    } catch {
      // file does not exist yet, no snapshot needed
    }

    // Write new save content
    await fs.writeFile(targetPath, buffer);

    const key = `${system}:${romName}:${req.slot}`;
    const nextRevision = (this.revisionCounters.get(key) || 0) + 1;
    this.revisionCounters.set(key, nextRevision);

    return {
      statusCode: 200,
      body: {
        success: true,
        revision: nextRevision,
        slot: req.slot,
        savedAt: new Date().toISOString()
      }
    };
  }

  async getSlots(system: string, romName: string): Promise<SaveSlotDTO[]> {
    const systemDir = path.join(this.savesDir, system);
    let files: string[] = [];
    try {
      files = await fs.readdir(systemDir);
    } catch {
      return [];
    }

    const slots: SaveSlotDTO[] = [];
    const prefix = `${romName}`;

    for (const file of files) {
      if (!file.endsWith('.srm') && !file.endsWith('.sav')) {
        continue;
      }

      const filePath = path.join(systemDir, file);
      const stat = await fs.stat(filePath);

      if (file === `${prefix}.srm` || file === `${prefix}.sav`) {
        slots.push({
          slot: 'tv_shared',
          isTvShared: true,
          lastModified: stat.mtime.toISOString(),
          fileSizeBytes: stat.size
        });
      } else if (file.startsWith(`${prefix}.`) && (file.endsWith('.srm') || file.endsWith('.sav'))) {
        // format: prefix.<slot>.srm
        const parts = file.slice(prefix.length + 1).split('.');
        const slotName = parts[0];
        if (slotName && slotName !== 'srm' && slotName !== 'sav') {
          slots.push({
            slot: slotName,
            isTvShared: false,
            lastModified: stat.mtime.toISOString(),
            fileSizeBytes: stat.size
          });
        }
      }
    }

    return slots;
  }

  private async createBackupSnapshot(
    system: string,
    romName: string,
    slot: string,
    content: Buffer
  ): Promise<void> {
    const snapshotDir = path.join(this.savesDir, 'snapshots', system);
    await fs.mkdir(snapshotDir, { recursive: true });

    const timestamp = Date.now();
    const snapshotFile = path.join(snapshotDir, `${romName}.${slot}.${timestamp}.srm.bak`);
    await fs.writeFile(snapshotFile, content);

    // Prune snapshots older than 5 most recent
    const files = await fs.readdir(snapshotDir);
    const prefix = `${romName}.${slot}.`;
    const relevantSnapshots = files
      .filter((f) => f.startsWith(prefix) && f.endsWith('.srm.bak'))
      .sort(); // sorted chronologically by timestamp

    if (relevantSnapshots.length > 5) {
      const toDelete = relevantSnapshots.slice(0, relevantSnapshots.length - 5);
      for (const oldFile of toDelete) {
        await fs.rm(path.join(snapshotDir, oldFile), { force: true });
      }
    }
  }
}
