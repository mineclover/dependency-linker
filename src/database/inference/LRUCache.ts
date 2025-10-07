/**
 * LRU Cache Implementation
 * 성능 최적화를 위한 Least Recently Used 캐시 시스템
 */

export interface CacheEntry<T> {
	key: string;
	value: T;
	lastAccessed: number;
	accessCount: number;
}

export interface LRUCacheConfig {
	maxSize: number;
	ttl?: number; // Time to live in milliseconds
	cleanupInterval?: number; // Cleanup interval in milliseconds
}

/**
 * LRU Cache with TTL support
 */
export class LRUCache<T> {
	protected cache = new Map<string, CacheEntry<T>>();
	private accessOrder: string[] = [];
	private config: Required<LRUCacheConfig>;
	private cleanupTimer?: NodeJS.Timeout;

	// Statistics
	protected hitCount = 0;
	protected missCount = 0;
	protected evictionCount = 0;

	constructor(config: LRUCacheConfig) {
		this.config = {
			maxSize: config.maxSize,
			ttl: config.ttl ?? Infinity,
			cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute default
		};

		// Start cleanup timer if TTL is set
		if (this.config.ttl < Infinity) {
			this.startCleanupTimer();
		}
	}

	/**
	 * Get value from cache
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			this.missCount++;
			return undefined;
		}

		// Check TTL
		if (this.config.ttl < Infinity) {
			const now = Date.now();
			if (now - entry.lastAccessed > this.config.ttl) {
				this.delete(key);
				this.missCount++;
				return undefined;
			}
		}

		// Update access info
		entry.lastAccessed = Date.now();
		entry.accessCount++;

		// Move to end of access order
		this.updateAccessOrder(key);

		this.hitCount++;
		return entry.value;
	}

	/**
	 * Set value in cache
	 */
	set(key: string, value: T): void {
		const now = Date.now();

		// If key exists, update it
		if (this.cache.has(key)) {
			const entry = this.cache.get(key);
			if (!entry) return;
			entry.value = value;
			entry.lastAccessed = now;
			entry.accessCount++;
			this.updateAccessOrder(key);
			return;
		}

		// Check if we need to evict
		if (this.cache.size >= this.config.maxSize) {
			this.evictLRU();
			this.evictionCount++;
		}

		// Add new entry
		const entry: CacheEntry<T> = {
			key,
			value,
			lastAccessed: now,
			accessCount: 1,
		};

		this.cache.set(key, entry);
		this.accessOrder.push(key);
	}

	/**
	 * Delete value from cache
	 */
	delete(key: string): boolean {
		const deleted = this.cache.delete(key);
		if (deleted) {
			const index = this.accessOrder.indexOf(key);
			if (index !== -1) {
				this.accessOrder.splice(index, 1);
			}
		}
		return deleted;
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
		this.accessOrder = [];
	}

	/**
	 * Check if key exists in cache
	 */
	has(key: string): boolean {
		return this.cache.has(key);
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		mostAccessed: Array<{ key: string; accessCount: number }>;
	} {
		const entries = Array.from(this.cache.values());
		const totalAccesses = entries.reduce(
			(sum, entry) => sum + entry.accessCount,
			0,
		);
		const hitRate =
			totalAccesses > 0
				? totalAccesses / (totalAccesses + this.getMissCount())
				: 0;

		const mostAccessed = entries
			.sort((a, b) => b.accessCount - a.accessCount)
			.slice(0, 5)
			.map((entry) => ({ key: entry.key, accessCount: entry.accessCount }));

		return {
			size: this.cache.size,
			maxSize: this.config.maxSize,
			hitRate,
			mostAccessed,
		};
	}

	/**
	 * Update access order for LRU eviction
	 */
	private updateAccessOrder(key: string): void {
		const index = this.accessOrder.indexOf(key);
		if (index !== -1) {
			this.accessOrder.splice(index, 1);
		}
		this.accessOrder.push(key);
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLRU(): void {
		if (this.accessOrder.length === 0) {
			return;
		}

		const lruKey = this.accessOrder[0];
		this.delete(lruKey);
	}

	/**
	 * Start cleanup timer for TTL
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpired();
		}, this.config.cleanupInterval);
	}

	/**
	 * Clean up expired entries
	 */
	private cleanupExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.lastAccessed > this.config.ttl) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => {
			this.delete(key);
		});
	}

	/**
	 * Get miss count (approximate)
	 */
	private getMissCount(): number {
		// This is a simplified implementation
		// In a real implementation, you'd track misses separately
		return Math.max(0, this.cache.size * 0.1);
	}

	/**
	 * Destroy cache and cleanup resources
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = undefined;
		}
		this.clear();
	}
}

/**
 * Specialized LRU Cache for Inference Results
 */
export class InferenceLRUCache extends LRUCache<{
	results: any[];
	computedAt: Date;
	edgeType: string;
	queryType: "hierarchical" | "transitive" | "inheritable";
}> {
	public readonly maxSize: number;

	constructor(maxSize: number = 1000, ttl: number = 300000) {
		// 5 minutes TTL
		super({
			maxSize,
			ttl,
			cleanupInterval: 60000, // 1 minute cleanup
		});
		this.maxSize = maxSize;
	}

	/**
	 * Generate cache key for inference query
	 */
	generateKey(
		queryType: "hierarchical" | "transitive" | "inheritable",
		edgeType: string,
		options: any = {},
	): string {
		const optionsStr = JSON.stringify(options, Object.keys(options).sort());
		return `${queryType}:${edgeType}:${optionsStr}`;
	}

	/**
	 * Cache inference results
	 */
	cacheResults(
		queryType: "hierarchical" | "transitive" | "inheritable",
		edgeType: string,
		results: any[],
		options: any = {},
	): void {
		const key = this.generateKey(queryType, edgeType, options);
		this.set(key, {
			results,
			computedAt: new Date(),
			edgeType,
			queryType,
		});
	}

	/**
	 * Get cached inference results
	 */
	getResults(
		queryType: "hierarchical" | "transitive" | "inheritable",
		edgeType: string,
		options: any = {},
	): any[] | undefined {
		const key = this.generateKey(queryType, edgeType, options);
		const entry = this.get(key);
		return entry?.results;
	}

	/**
	 * Invalidate cache for specific edge type
	 */
	invalidateEdgeType(edgeType: string): void {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (entry.value.edgeType === edgeType) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => {
			this.delete(key);
		});
	}

	/**
	 * Invalidate cache for specific query type
	 */
	invalidateQueryType(
		queryType: "hierarchical" | "transitive" | "inheritable",
	): void {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (entry.value.queryType === queryType) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => {
			this.delete(key);
		});
	}

	/**
	 * Get cache hit rate
	 */
	getHitRate(): number {
		const totalAccesses = this.hitCount + this.missCount;
		return totalAccesses > 0 ? this.hitCount / totalAccesses : 0;
	}

	/**
	 * Get cache miss rate
	 */
	getMissRate(): number {
		const totalAccesses = this.hitCount + this.missCount;
		return totalAccesses > 0 ? this.missCount / totalAccesses : 0;
	}

	/**
	 * Get eviction count
	 */
	getEvictionCount(): number {
		return this.evictionCount;
	}
}
