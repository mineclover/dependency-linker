/**
 * Persistent File-Based Cache with Compression
 * TTL-based expiration and corruption recovery
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type {
	CacheEntry,
	CacheOptions,
	CacheProvider,
	CacheStats,
} from "./index";

interface FileCacheMetadata {
	version: string;
	created: number;
	lastCleanup: number;
	totalEntries: number;
}

/**
 * File-based cache with persistent storage and compression
 */
export class FileCache<T> implements CacheProvider<T> {
	private cacheDir: string;
	private maxSize: number;
	private ttl: number;
	private enableCompression: boolean;
	private stats: {
		hits: number;
		misses: number;
		errors: number;
	};
	private metadata: FileCacheMetadata;

	constructor(options: CacheOptions & { cacheDir?: string } = {}) {
		this.cacheDir =
			options.cacheDir || path.join(os.tmpdir(), "ts-analyzer-cache");
		this.maxSize = options.maxSize || 10000;
		this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
		this.enableCompression = options.enableCompression !== false;

		this.stats = {
			hits: 0,
			misses: 0,
			errors: 0,
		};

		this.metadata = {
			version: "1.0.0",
			created: Date.now(),
			lastCleanup: Date.now(),
			totalEntries: 0,
		};

		this.initializeCache();
	}

	/**
	 * Get value from file cache
	 */
	async get(key: string): Promise<T | undefined> {
		try {
			const filePath = this.getFilePath(key);
			const exists = await this.fileExists(filePath);

			if (!exists) {
				this.stats.misses++;
				return undefined;
			}

			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry<T> = JSON.parse(data);

			// Check expiration
			if (this.isExpired(entry)) {
				await this.deleteFile(filePath);
				this.stats.misses++;
				return undefined;
			}

			// Update access statistics
			entry.accessCount = (entry.accessCount || 0) + 1;
			entry.lastAccessed = Date.now();

			// Write back updated entry
			await fs.writeFile(filePath, JSON.stringify(entry), "utf8");

			this.stats.hits++;
			return entry.value;
		} catch (error) {
			this.stats.errors++;
			this.stats.misses++;

			// Handle corrupted cache files
			if (error instanceof SyntaxError) {
				const filePath = this.getFilePath(key);
				await this.deleteFile(filePath);
			}

			return undefined;
		}
	}

	/**
	 * Set value in file cache
	 */
	async set(key: string, value: T, ttl?: number): Promise<void> {
		try {
			await this.ensureCacheDir();

			// Check if we need to evict entries
			if (await this.shouldEvict()) {
				await this.evictOldEntries();
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

			const filePath = this.getFilePath(key);
			await fs.writeFile(filePath, JSON.stringify(entry), "utf8");

			this.metadata.totalEntries++;
			await this.saveMetadata();
		} catch (_error) {
			this.stats.errors++;
			// Silently fail for cache writes to not break the main operation
		}
	}

	/**
	 * Delete entry from file cache
	 */
	async delete(key: string): Promise<boolean> {
		try {
			const filePath = this.getFilePath(key);
			const exists = await this.fileExists(filePath);

			if (!exists) {
				return false;
			}

			await this.deleteFile(filePath);
			this.metadata.totalEntries = Math.max(0, this.metadata.totalEntries - 1);
			await this.saveMetadata();

			return true;
		} catch (_error) {
			this.stats.errors++;
			return false;
		}
	}

	/**
	 * Clear all cache entries
	 */
	async clear(): Promise<void> {
		try {
			const exists = await this.fileExists(this.cacheDir);
			if (exists) {
				const files = await fs.readdir(this.cacheDir);
				const deletePromises = files
					.filter((file) => file.endsWith(".cache"))
					.map((file) => this.deleteFile(path.join(this.cacheDir, file)));

				await Promise.allSettled(deletePromises);
			}

			this.metadata.totalEntries = 0;
			this.stats.hits = 0;
			this.stats.misses = 0;
			this.stats.errors = 0;

			await this.saveMetadata();
		} catch (_error) {
			this.stats.errors++;
		}
	}

	/**
	 * Check if key exists in cache
	 */
	async has(key: string): Promise<boolean> {
		try {
			const filePath = this.getFilePath(key);
			const exists = await this.fileExists(filePath);

			if (!exists) {
				return false;
			}

			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry<T> = JSON.parse(data);

			return !this.isExpired(entry);
		} catch {
			return false;
		}
	}

	/**
	 * Get all cache keys
	 */
	async keys(): Promise<string[]> {
		try {
			await this.cleanupExpired();

			const exists = await this.fileExists(this.cacheDir);
			if (!exists) {
				return [];
			}

			const files = await fs.readdir(this.cacheDir);
			const keys: string[] = [];

			for (const file of files) {
				if (file.endsWith(".cache")) {
					try {
						const filePath = path.join(this.cacheDir, file);
						const data = await fs.readFile(filePath, "utf8");
						const entry: CacheEntry<T> = JSON.parse(data);

						if (!this.isExpired(entry)) {
							keys.push(entry.key);
						} else {
							await this.deleteFile(filePath);
						}
					} catch {}
				}
			}

			return keys;
		} catch {
			return [];
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

		return {
			entryCount: this.metadata.totalEntries,
			hitRate,
			totalHits: this.stats.hits,
			totalMisses: this.stats.misses,
			memoryUsage: 0, // File cache doesn't use memory
		};
	}

	/**
	 * Perform cache maintenance
	 */
	async maintenance(): Promise<void> {
		const now = Date.now();
		const oneDayAgo = now - 24 * 60 * 60 * 1000;

		// Only run maintenance once per day
		if (this.metadata.lastCleanup > oneDayAgo) {
			return;
		}

		await this.cleanupExpired();
		await this.validateCacheIntegrity();

		this.metadata.lastCleanup = now;
		await this.saveMetadata();
	}

	/**
	 * Initialize cache directory and metadata
	 */
	private async initializeCache(): Promise<void> {
		try {
			await this.ensureCacheDir();
			await this.loadMetadata();
		} catch {
			// If initialization fails, create new metadata
			await this.saveMetadata();
		}
	}

	/**
	 * Ensure cache directory exists
	 */
	private async ensureCacheDir(): Promise<void> {
		try {
			await fs.mkdir(this.cacheDir, { recursive: true });
		} catch (error: any) {
			if (error.code !== "EEXIST") {
				throw error;
			}
		}
	}

	/**
	 * Get file path for cache key
	 */
	private getFilePath(key: string): string {
		const hash = crypto.createHash("md5").update(key).digest("hex");
		return path.join(this.cacheDir, `${hash}.cache`);
	}

	/**
	 * Check if cache entry is expired
	 */
	private isExpired(entry: CacheEntry<T>): boolean {
		return entry.expiresAt ? Date.now() > entry.expiresAt : false;
	}

	/**
	 * Check if file exists
	 */
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Delete file safely
	 */
	private async deleteFile(filePath: string): Promise<void> {
		try {
			await fs.unlink(filePath);
		} catch {
			// Ignore deletion errors
		}
	}

	/**
	 * Check if we should evict entries
	 */
	private async shouldEvict(): Promise<boolean> {
		return this.metadata.totalEntries >= this.maxSize;
	}

	/**
	 * Evict old entries based on access patterns
	 */
	private async evictOldEntries(): Promise<void> {
		try {
			const exists = await this.fileExists(this.cacheDir);
			if (!exists) return;

			const files = await fs.readdir(this.cacheDir);
			const entries: Array<{ filePath: string; entry: CacheEntry<T> }> = [];

			// Read all cache entries
			for (const file of files) {
				if (file.endsWith(".cache")) {
					try {
						const filePath = path.join(this.cacheDir, file);
						const data = await fs.readFile(filePath, "utf8");
						const entry: CacheEntry<T> = JSON.parse(data);
						entries.push({ filePath, entry });
					} catch {
						// Skip corrupted files
					}
				}
			}

			// Sort by last accessed (oldest first)
			entries.sort(
				(a, b) => (a.entry.lastAccessed || 0) - (b.entry.lastAccessed || 0),
			);

			// Delete oldest 25% of entries
			const toDelete = Math.floor(entries.length * 0.25);
			const deletePromises = entries
				.slice(0, toDelete)
				.map(({ filePath }) => this.deleteFile(filePath));

			await Promise.allSettled(deletePromises);
			this.metadata.totalEntries -= toDelete;
		} catch {
			// Eviction failure should not crash the application
		}
	}

	/**
	 * Clean up expired entries
	 */
	private async cleanupExpired(): Promise<void> {
		try {
			const exists = await this.fileExists(this.cacheDir);
			if (!exists) return;

			const files = await fs.readdir(this.cacheDir);
			let cleanedCount = 0;

			for (const file of files) {
				if (file.endsWith(".cache")) {
					try {
						const filePath = path.join(this.cacheDir, file);
						const data = await fs.readFile(filePath, "utf8");
						const entry: CacheEntry<T> = JSON.parse(data);

						if (this.isExpired(entry)) {
							await this.deleteFile(filePath);
							cleanedCount++;
						}
					} catch {
						// Delete corrupted files
						const filePath = path.join(this.cacheDir, file);
						await this.deleteFile(filePath);
						cleanedCount++;
					}
				}
			}

			this.metadata.totalEntries = Math.max(
				0,
				this.metadata.totalEntries - cleanedCount,
			);
		} catch {
			// Cleanup failure should not crash the application
		}
	}

	/**
	 * Validate cache integrity
	 */
	private async validateCacheIntegrity(): Promise<void> {
		try {
			const keys = await this.keys();
			this.metadata.totalEntries = keys.length;
		} catch {
			// Reset metadata if validation fails
			this.metadata.totalEntries = 0;
		}
	}

	/**
	 * Load cache metadata
	 */
	private async loadMetadata(): Promise<void> {
		try {
			const metadataPath = path.join(this.cacheDir, "metadata.json");
			const data = await fs.readFile(metadataPath, "utf8");
			this.metadata = { ...this.metadata, ...JSON.parse(data) };
		} catch {
			// Use default metadata if loading fails
		}
	}

	/**
	 * Save cache metadata
	 */
	private async saveMetadata(): Promise<void> {
		try {
			await this.ensureCacheDir();
			const metadataPath = path.join(this.cacheDir, "metadata.json");
			await fs.writeFile(
				metadataPath,
				JSON.stringify(this.metadata, null, 2),
				"utf8",
			);
		} catch {
			// Metadata save failure should not crash the application
		}
	}

	/**
	 * Estimate the size of a cache value in bytes
	 */
	private estimateSize(value: T): number {
		try {
			return JSON.stringify(value).length * 2; // Rough estimate
		} catch {
			return 1024; // Default 1KB estimate
		}
	}
}
