/**
 * Generic cache interface
 */
export interface ICache<K, V> {
	get(key: K): V | undefined;
	set(key: K, value: V): void;
	has(key: K): boolean;
	delete(key: K): boolean;
	clear(): void;
	size: number;
}

/**
 * LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> implements ICache<K, V> {
	private readonly maxSize: number;
	private readonly cache = new Map<K, V>();

	constructor(maxSize: number = 100) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		// Remove if already exists
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		// Add to end
		else if (this.cache.size >= this.maxSize) {
			// Remove least recently used (first item)
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(key, value);
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}

/**
 * Simple Map-based cache with no eviction
 */
export class SimpleCache<K, V> implements ICache<K, V> {
	private readonly cache = new Map<K, V>();

	get(key: K): V | undefined {
		return this.cache.get(key);
	}

	set(key: K, value: V): void {
		this.cache.set(key, value);
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}

/**
 * Memoization decorator for caching method results
 */
export function memoize<T extends (...args: any[]) => any>(
	fn: T,
	keyGenerator?: (...args: Parameters<T>) => string,
): T {
	const cache = new SimpleCache<string, ReturnType<T>>();

	const memoized = ((...args: Parameters<T>): ReturnType<T> => {
		const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;

	// Expose cache for debugging/testing
	(memoized as any).cache = cache;
	(memoized as any).clearCache = () => cache.clear();

	return memoized;
}

/**
 * Cache manager for coordinating multiple caches
 */
export class CacheManager {
	private readonly caches = new Map<string, ICache<any, any>>();

	/**
	 * Register a cache with a name
	 */
	registerCache<K, V>(name: string, cache: ICache<K, V>): void {
		this.caches.set(name, cache);
	}

	/**
	 * Get a registered cache
	 */
	getCache<K, V>(name: string): ICache<K, V> | undefined {
		return this.caches.get(name) as ICache<K, V> | undefined;
	}

	/**
	 * Clear all registered caches
	 */
	clearAll(): void {
		for (const cache of this.caches.values()) {
			cache.clear();
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): Record<string, { size: number }> {
		const stats: Record<string, { size: number }> = {};
		for (const [name, cache] of this.caches) {
			stats[name] = { size: cache.size };
		}
		return stats;
	}
}

/**
 * Global cache manager instance
 */
export const globalCacheManager = new CacheManager();
