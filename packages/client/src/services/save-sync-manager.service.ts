export type SyncStatus = 'idle' | 'saving' | 'synced' | 'conflict_locked' | 'error';

export interface SaveSyncManagerOptions {
  system: string;
  romName: string;
  slot: string;
  debounceMs?: number;
  syncFn: (system: string, romName: string, slot: string, data: Uint8Array) => Promise<{ success: boolean }>;
  emergencySyncFn?: (system: string, romName: string, slot: string, data: Uint8Array) => void;
}

export class SaveSyncManager {
  private readonly system: string;
  private readonly romName: string;
  private readonly slot: string;
  private readonly debounceMs: number;
  private readonly syncFn: (system: string, romName: string, slot: string, data: Uint8Array) => Promise<{ success: boolean }>;
  private readonly emergencySyncFn?: (system: string, romName: string, slot: string, data: Uint8Array) => void;

  private pendingBuffer: Uint8Array | null = null;
  private timer: NodeJS.Timeout | null = null;
  private syncStatus: SyncStatus = 'idle';

  constructor(options: SaveSyncManagerOptions) {
    this.system = options.system;
    this.romName = options.romName;
    this.slot = options.slot;
    this.debounceMs = options.debounceMs ?? 3000;
    this.syncFn = options.syncFn;
    this.emergencySyncFn = options.emergencySyncFn;
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  hasUncommittedChanges(): boolean {
    return this.pendingBuffer !== null;
  }

  onSramMutated(buffer: Uint8Array) {
    this.pendingBuffer = buffer;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flushSync();
    }, this.debounceMs);
  }

  handlePageUnload() {
    if (!this.pendingBuffer) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const dataToSync = this.pendingBuffer;
    this.pendingBuffer = null;

    if (this.emergencySyncFn) {
      this.emergencySyncFn(this.system, this.romName, this.slot, dataToSync);
    }
  }

  private async flushSync() {
    if (!this.pendingBuffer) return;

    const dataToSync = this.pendingBuffer;
    this.pendingBuffer = null;
    this.syncStatus = 'saving';

    try {
      await this.syncFn(this.system, this.romName, this.slot, dataToSync);
      this.syncStatus = 'synced';
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.error === 'LOCKED_BY_TV') {
        this.syncStatus = 'conflict_locked';
      } else {
        this.syncStatus = 'error';
      }
    }
  }
}
