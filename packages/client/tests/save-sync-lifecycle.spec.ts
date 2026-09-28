// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveSyncManager } from '../src/services/save-sync-manager.service.js';

describe('Seam: Client Debounced SRAM Sync & Lifecycle Hook (Ticket #09)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce multiple rapid SRAM writes into a single sync request after 3000ms', async () => {
    const syncMock = vi.fn().mockResolvedValue({ success: true });
    const manager = new SaveSyncManager({
      system: 'snes',
      romName: 'Super Mario World',
      slot: 'tv_shared',
      syncFn: syncMock,
      emergencySyncFn: vi.fn()
    });

    const buffer1 = new Uint8Array([1, 2, 3]);
    const buffer2 = new Uint8Array([1, 2, 3, 4]);
    const buffer3 = new Uint8Array([1, 2, 3, 4, 5]);

    // Emulate 3 rapid saves within 1 second
    manager.onSramMutated(buffer1);
    vi.advanceTimersByTime(500);
    manager.onSramMutated(buffer2);
    vi.advanceTimersByTime(500);
    manager.onSramMutated(buffer3);

    // Sync has not fired yet because debounce keeps resetting
    expect(syncMock).not.toHaveBeenCalled();

    // Advance by 3000ms from the last write
    vi.advanceTimersByTime(3000);
    await Promise.resolve();

    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(syncMock).toHaveBeenCalledWith('snes', 'Super Mario World', 'tv_shared', buffer3);
    expect(manager.getSyncStatus()).toBe('synced');
  });

  it('should immediately flush pending uncommitted SRAM via emergencySyncFn on page unload', () => {
    const syncMock = vi.fn();
    const emergencySyncMock = vi.fn();
    const manager = new SaveSyncManager({
      system: 'snes',
      romName: 'Super Mario World',
      slot: 'tv_shared',
      syncFn: syncMock,
      emergencySyncFn: emergencySyncMock
    });

    const uncommittedBuffer = new Uint8Array([9, 8, 7]);
    manager.onSramMutated(uncommittedBuffer);

    expect(manager.hasUncommittedChanges()).toBe(true);

    // Trigger page unload
    manager.handlePageUnload();

    expect(emergencySyncMock).toHaveBeenCalledTimes(1);
    expect(emergencySyncMock).toHaveBeenCalledWith('snes', 'Super Mario World', 'tv_shared', uncommittedBuffer);
    expect(manager.hasUncommittedChanges()).toBe(false);
  });

  it('should update status to conflict_locked when server responds with 409', async () => {
    const syncMock = vi.fn().mockRejectedValue({ statusCode: 409, error: 'LOCKED_BY_TV' });
    const manager = new SaveSyncManager({
      system: 'snes',
      romName: 'Super Mario World',
      slot: 'tv_shared',
      syncFn: syncMock,
      emergencySyncFn: vi.fn()
    });

    manager.onSramMutated(new Uint8Array([1]));
    vi.advanceTimersByTime(3000);

    // Allow promise rejection to settle
    await Promise.resolve();
    await Promise.resolve();

    expect(manager.getSyncStatus()).toBe('conflict_locked');
  });
});
