import { createLogger } from './logger';
import { Settings } from './settings';

const logger = createLogger('cache');

class CacheItem<T> {
  constructor(
    public value: T,
    public lastAccessed: number,
    public ttl: number // Time-To-Live in milliseconds
  ) {}
}

export class Cache<K, V> {
  private static instances: Map<string, any> = new Map();
  private cache: Map<K, CacheItem<V>>;
  private maxSize: number;

  private constructor(maxSize: number) {
    this.cache = new Map<K, CacheItem<V>>();
    this.maxSize = maxSize;
  }

  /**
   * Get an instance of the cache with a specific name
   * @param name Unique identifier for this cache instance
   * @param maxSize Maximum size of the cache (only used when creating a new instance)
   */
  public static getInstance<K, V>(
    name: string,
    maxSize: number = Settings.MAX_CACHE_SIZE
  ): Cache<K, V> {
    if (!this.instances.has(name)) {
      logger.debug(`Creating new cache instance: ${name}`);
      this.instances.set(name, new Cache<K, V>(maxSize));
    }
    return this.instances.get(name) as Cache<K, V>;
  }

  stats(): string {
    return `Cache size: ${this.cache.size}`;
  }

  /**
   * Wrap a function with caching logic by immediately executing it with the provided arguments.
   * @param fn The function to wrap
   * @param key A unique key for caching
   * @param ttl Time-To-Live in seconds for the cached value
   * @param args The arguments to pass to the function
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    key: K,
    ttl: number,
    ...args: Parameters<T>
  ): ReturnType<T> {
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue as ReturnType<T>;
    }
    const result = fn(...args);
    this.set(key, result, ttl);
    return result;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      const now = Date.now();
      if (now - item.lastAccessed > item.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      item.lastAccessed = now;
      return item.value;
    }
    return undefined;
  }

  set(key: K, value: V, ttl: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    this.cache.set(key, new CacheItem<V>(value, Date.now(), ttl * 1000));
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }
}
