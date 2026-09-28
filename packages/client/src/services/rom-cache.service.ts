export class RomCacheService {
  private memCache: Map<string, ArrayBuffer> = new Map();

  private getKey(system: string, fileName: string): string {
    return `${system}:${fileName}`;
  }

  hasCached(system: string, fileName: string): boolean {
    return this.memCache.has(this.getKey(system, fileName));
  }

  async getOrFetchRom(
    system: string,
    fileName: string,
    fetchFn: (url: string) => Promise<ArrayBuffer>
  ): Promise<ArrayBuffer> {
    const key = this.getKey(system, fileName);

    const cached = this.memCache.get(key);
    if (cached) {
      return cached;
    }

    const fetched = await fetchFn(`/api/roms/${encodeURIComponent(system)}/${encodeURIComponent(fileName)}`);
    this.memCache.set(key, fetched);
    return fetched;
  }

  clear() {
    this.memCache.clear();
  }
}
