// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RomCacheService } from '../src/services/rom-cache.service.js';

describe('Seam: RomCacheService & IndexedDB Storage (Ticket #08)', () => {
  let cache: RomCacheService;

  beforeEach(() => {
    cache = new RomCacheService();
    cache.clear();
  });

  it('should fetch from network and store in cache on first request', async () => {
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchMock = vi.fn().mockResolvedValue(dummyBuffer);

    const data = await cache.getOrFetchRom('snes', 'smw.sfc', fetchMock);

    expect(data).toEqual(dummyBuffer);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.hasCached('snes', 'smw.sfc')).toBe(true);
  });

  it('should serve from cache without calling network on subsequent requests', async () => {
    const dummyBuffer = new Uint8Array([10, 20, 30]).buffer;
    const fetchMock = vi.fn().mockResolvedValue(dummyBuffer);

    // First fetch
    await cache.getOrFetchRom('gba', 'pokemon.gba', fetchMock);

    // Second fetch
    const cachedData = await cache.getOrFetchRom('gba', 'pokemon.gba', fetchMock);

    expect(cachedData).toEqual(dummyBuffer);
    expect(fetchMock).toHaveBeenCalledTimes(1); // Not called a second time
  });
});
