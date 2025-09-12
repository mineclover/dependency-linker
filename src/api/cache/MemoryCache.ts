/**
 * High-Performance Memory Cache with LRU Eviction
 * Intelligent memory management with adaptive limits
 */

import type {
	CacheEntry,
	CacheOptions,
	CacheProvider,
	CacheStats,
} from "./index";

/**
 * Memory cache with LRU eviction and intelligent memory management
 */
export class MemoryCache<T> implements CacheProvider<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private maxSize: number;
	private ttl: number;
	private stats: {
		hits: number;
		misses: number;
		evictions: number;
	};

	constructor(options: CacheOptions = {}) {
		this.maxSize = options.maxSize || 1000;
		this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
		};
	}

	/**
	 * Get value from cache
	 */
	async get(key: string): Promise<T | undefined> {
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return undefined;
		}

		// Check expiration
		if (this.isExpired(entry)) {
			this.cache.delete(key);
			this.stats.misses++;
			return undefined;
		}

		// Update access statistics for LRU
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		// Move to end (most recently used)
		this.cache.delete(key);
		this.cache.set(key, entry);

		this.stats.hits++;
		return entry.value;
	}

	/**
	 * Set value in cache
	 */
	async set(key: string, value: T, ttl?: number): Promise<void> {
		// Remove existing entry if present
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		// Evict if at capacity
		if (this.cache.size >= this.maxSize) {
			this.evictLeastRecentlyUsed();
		}

		const now = Date.now();
		const entry: CacheEntry<T> = {
			key,
			value,
			timestamp: now,
			expiresAt: ttl ? now + ttl : now + this.ttl,
			accessCount: 1,
			lastAccessed: now,
			size: this.estimateSize(value),
		};

		this.cache.set(key, entry);
	}

	/**
	 * Delete entry from cache
	 */
	async delete(key: string): Promise<boolean> {
		return this.cache.delete(key);
	}

	/**
	 * Clear all entries
	 */
	async clear(): Promise<void> {
		this.cache.clear();
		this.stats.hits = 0;
		this.stats.misses = 0;
		this.stats.evictions = 0;
	}

	/**
	 * Check if key exists (without updating access stats)
	 */
	async has(key: string): Promise<boolean> {
		const entry = this.cache.get(key);
		return entry ? !this.isExpired(entry) : false;
	}

	/**
	 * Get all cache keys
	 */
	async keys(): Promise<string[]> {
		// Clean up expired entries first
		this.cleanupExpired();
		return Array.from(this.cache.keys());
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		this.cleanupExpired();

		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

		const memoryUsage = Array.from(this.cache.values()).reduce(
			(total, entry) => total + (entry.size || 0),
			0,
		);

		return {
			entryCount: this.cache.size,
			hitRate,
			totalHits: this.stats.hits,
			totalMisses: this.stats.misses,
			memoryUsage,
			evictions: this.stats.evictions,
		};
	}

	/**
	 * Get memory usage information
	 */
	getMemoryInfo(): {
		entryCount: number;
		estimatedMemoryMB: number;
		averageEntrySizeKB: number;
	} {
		const entries = Array.from(this.cache.values());
		const totalSize = entries.reduce(
			(sum, entry) => sum + (entry.size || 0),
			0,
		);

		return {
			entryCount: entries.length,
			estimatedMemoryMB: totalSize / (1024 * 1024),
			averageEntrySizeKB:
				entries.length > 0 ? totalSize / entries.length / 1024 : 0,
		};
	}

	/**
	 * Manually trigger cache optimization
	 */
	optimize(): void {
		this.cleanupExpired();

		// If still over capacity, evict based on access patterns
		while (this.cache.size > this.maxSize * 0.8) {
			this.evictLeastRecentlyUsed();
		}
	}

	/**
	 * Check if cache entry is expired
	 */
	private isExpired(entry: CacheEntry<T>): boolean {
		return entry.expiresAt ? Date.now() > entry.expiresAt : false;
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLeastRecentlyUsed(): void {
		let oldestKey: string | undefined;
		let oldestTime = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccessed < oldestTime) {
				oldestTime = entry.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.stats.evictions++;
		}
	}

	/**
	 * Clean up expired entries
	 */
	private cleanupExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt && now > entry.expiresAt) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => this.cache.delete(key));
	}

	/**
	 * Estimate the size of a cache value in bytes
	 */
	private estimateSize(value: T): number {
		try {
			return JSON.stringify(value).length * 2; // Rough estimate (2 bytes per character)
		} catch {
			return 1024; // Default 1KB estimate
		}
	}
}
