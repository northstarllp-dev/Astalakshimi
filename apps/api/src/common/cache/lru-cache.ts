/**
 * Tiny in-process LRU+TTL cache. No external dep.
 *
 * Used in front of expensive read paths (search, profile view) where the
 * staleness window is seconds-to-a-minute and an external cache layer is
 * out of scope. Single-instance only; per-instance state is dropped on
 * restart. Correctness is unchanged — stale data is acceptable; we're
 * just avoiding unnecessary DB round trips.
 */

export type CacheEntry<V> = { value: V; expiresAt: number };

export class LruCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();

  constructor(private readonly maxEntries: number, private readonly ttlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh recency
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    // Evict oldest insertion (Map iteration order = insertion order).
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
