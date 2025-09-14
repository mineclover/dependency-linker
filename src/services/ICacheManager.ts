/**
 * Cache Manager interface
 * Provides caching functionality for AST parsing results and analysis data
 */

import type { CacheStats } from "../models/CacheEntry";

export interface ICacheManager {
	/**
	 * Gets cached entry by key
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Stores entry in cache
	 */
	set<T>(key: string, data: T, ttl?: number): Promise<void>;

	/**
	 * Checks if key exists in cache
	 */
	has(key: string): Promise<boolean>;

	/**
	 * Removes entry from cache
	 */
	delete(key: string): Promise<boolean>;

	/**
	 * Invalidates cache entry (alias for delete)
	 */
	invalidate(key: string): Promise<boolean>;

	/**
	 * Clears all cache entries
	 */
	clear(): Promise<void>;

	/**
	 * Gets cache statistics
	 */
	getStats(): CacheStats;

	/**
	 * Validates cache integrity
	 */
	validate(): Promise<{ isValid: boolean; errors: string[] }>;

	/**
	 * Optimizes cache (removes expired entries, compresses data)
	 */
	optimize(): Promise<{ entriesRemoved: number; spaceSaved: number }>;

	/**
	 * Performs cleanup operations
	 */
	cleanup(): Promise<void>;
}
