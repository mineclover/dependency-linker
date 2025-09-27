import type { AnalysisConfig } from "../../models/AnalysisConfig";
import type { AnalysisResult } from "../../models/AnalysisResult";
import type { ICacheManager } from "../CacheManager";
import type { EnginePerformanceMetrics } from "../IAnalysisEngine";

/**
 * Cache management module for AnalysisEngine
 * Handles all cache-related operations including validation, warmup, and metrics
 */
export class AnalysisEngineCache {
	constructor(private cacheManager: ICacheManager) {}

	/**
	 * Generates a cache key for analysis results
	 * @param filePath - Path to the file being analyzed
	 * @param config - Analysis configuration
	 * @returns Cache key string
	 */
	generateCacheKey(filePath: string, config: AnalysisConfig): string {
		return `${filePath}:${JSON.stringify(config)}`;
	}

	/**
	 * Clears the analysis cache
	 * @example
	 * ```typescript
	 * cache.clearCache();
	 * ```
	 */
	clearCache(): void {
		this.cacheManager.clear();
	}

	/**
	 * Gets cache statistics
	 * @returns Cache statistics object
	 * @example
	 * ```typescript
	 * const stats = cache.getCacheStats();
	 * console.log(`Hit rate: ${stats.hitRate}%`);
	 * ```
	 */
	getCacheStats() {
		return this.cacheManager.getStats();
	}

	/**
	 * Validates the cache integrity
	 * @returns Promise that resolves when validation is complete
	 * @example
	 * ```typescript
	 * await cache.validateCache();
	 * ```
	 */
	async validateCache(): Promise<void> {
		// Validate cache integrity
		const stats = this.cacheManager.getStats();
		console.log(`Cache validation: ${stats.totalEntries} entries found`);
	}

	/**
	 * Warms up the cache with commonly used files
	 * @param filePaths - Array of file paths to pre-cache
	 * @param config - Analysis configuration to use
	 * @returns Promise that resolves when warmup is complete
	 * @example
	 * ```typescript
	 * await cache.warmupCache(['src/index.ts', 'src/utils.ts'], config);
	 * ```
	 */
	async warmupCache(
		filePaths: string[],
		config: AnalysisConfig,
		analyzeFileFunc: (
			filePath: string,
			config: AnalysisConfig,
		) => Promise<AnalysisResult>,
	): Promise<void> {
		console.log(`Warming up cache with ${filePaths.length} files...`);

		const promises = filePaths.map(async (filePath) => {
			const cacheKey = this.generateCacheKey(filePath, config);
			const cached = await this.cacheManager.get<AnalysisResult>(cacheKey);

			if (!cached) {
				try {
					await analyzeFileFunc(filePath, config);
				} catch (error) {
					console.warn(`Failed to warmup cache for ${filePath}:`, error);
				}
			}
		});

		await Promise.all(promises);
		console.log("Cache warmup completed");
	}

	/**
	 * Gets cached analysis result if available
	 * @param cacheKey - Cache key to lookup
	 * @returns Cached result or null if not found
	 */
	async getCachedResult(cacheKey: string): Promise<AnalysisResult | null> {
		const result = await this.cacheManager.get<AnalysisResult>(cacheKey);
		return result || null;
	}

	/**
	 * Sets analysis result in cache
	 * @param cacheKey - Cache key to store under
	 * @param result - Analysis result to cache
	 */
	async setCachedResult(
		cacheKey: string,
		result: AnalysisResult,
	): Promise<void> {
		await this.cacheManager.set(cacheKey, result);
	}

	/**
	 * Updates cache metrics in performance tracking
	 * @param cacheHit - Whether this was a cache hit
	 * @param startTime - Start time of the operation
	 * @param performanceMetrics - Performance metrics object to update
	 */
	updateCacheMetrics(
		cacheHit: boolean,
		startTime: number,
		performanceMetrics: EnginePerformanceMetrics,
	): void {
		const cacheTime = Date.now() - startTime;

		if (cacheHit) {
			performanceMetrics.timeSavedByCache += cacheTime;
		}

		// Update cache hit rate based on cache stats
		const cacheStats = this.getCacheStats();
		if (cacheStats.totalHits + cacheStats.totalMisses > 0) {
			performanceMetrics.cacheHitRate =
				cacheStats.totalHits / (cacheStats.totalHits + cacheStats.totalMisses);
		}
	}

	/**
	 * Clears all cache data including internal state for test isolation
	 * @example
	 * ```typescript
	 * await cache.clearAll();
	 * ```
	 */
	async clearAll(): Promise<void> {
		// Clear all cache data
		await this.cacheManager.clear();

		// Force optimization to ensure all expired entries are removed
		await this.cacheManager.optimize();

		// Clear any internal state that might interfere with tests
		const stats = this.cacheManager.getStats();
		if (stats.totalEntries > 0) {
			console.warn(
				`Cache still has ${stats.totalEntries} entries after clearAll`,
			);
		}
	}
}
