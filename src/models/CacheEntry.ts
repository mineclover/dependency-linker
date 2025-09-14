/**
 * Represents a cached analysis result entry
 * Handles AST caching, result caching, and cache metadata
 */

export interface CacheEntry<T = any> {
	/** Unique cache key */
	key: string;

	/** Cached data */
	data: T;

	/** Cache entry metadata */
	metadata: CacheEntryMetadata;

	/** When this entry was created */
	createdAt: Date;

	/** When this entry was last accessed */
	lastAccessedAt: Date;

	/** When this entry expires (if TTL is set) */
	expiresAt?: Date;

	/** File system metadata for invalidation */
	fileMetadata?: FileMetadata;
}

export interface CacheEntryMetadata {
	/** Size of the cached data in bytes */
	size: number;

	/** How many times this entry has been accessed */
	hitCount: number;

	/** Source of the cached data */
	source: CacheSource;

	/** Version of the data format */
	version: string;

	/** Compression information if data is compressed */
	compression?: CompressionInfo;

	/** Additional tags for categorization */
	tags: string[];

	/** Custom metadata */
	custom: Record<string, any>;
}

export interface FileMetadata {
	/** File path */
	filePath: string;

	/** File size in bytes */
	size: number;

	/** Last modified timestamp */
	lastModified: Date;

	/** File checksum for integrity checking */
	checksum: string;

	/** File encoding */
	encoding: string;
}

export interface CompressionInfo {
	/** Compression algorithm used */
	algorithm: "gzip" | "brotli" | "lz4" | "none";

	/** Original size before compression */
	originalSize: number;

	/** Compressed size */
	compressedSize: number;

	/** Compression ratio */
	ratio: number;
}

export type CacheSource =
	| "ast"
	| "analysis"
	| "extractor"
	| "interpreter"
	| "external";

/**
 * Specialized cache entries for different data types
 */

export interface ASTCacheEntry extends CacheEntry {
	data: {
		ast: any;
		parseTime: number;
		language: string;
		parserVersion: string;
	};
	metadata: CacheEntryMetadata & {
		source: "ast";
		nodeCount: number;
		depth: number;
	};
}

export interface AnalysisResultCacheEntry extends CacheEntry {
	data: {
		extractedData: Record<string, any>;
		interpretedData: Record<string, any>;
		performanceMetrics: any;
		errors: any[];
	};
	metadata: CacheEntryMetadata & {
		source: "analysis";
		extractorsUsed: string[];
		interpretersUsed: string[];
		configHash: string;
	};
}

export interface ExtractorResultCacheEntry extends CacheEntry {
	data: {
		extractedData: any;
		extractorName: string;
		extractorVersion: string;
		confidence: number;
	};
	metadata: CacheEntryMetadata & {
		source: "extractor";
		language: string;
		itemCount: number;
	};
}

/**
 * Cache statistics and monitoring
 */
export interface CacheStats {
	/** Total number of entries */
	totalEntries: number;

	/** Current cache size in bytes */
	currentSize: number;

	/** Maximum cache size in bytes */
	maxSize: number;

	/** Cache hit rate (0-1) */
	hitRate: number;

	/** Cache miss rate (0-1) */
	missRate: number;

	/** Total number of cache hits */
	totalHits: number;

	/** Total number of cache misses */
	totalMisses: number;

	/** Number of evicted entries */
	evictions: number;

	/** Memory usage statistics */
	memoryStats: CacheMemoryStats;

	/** Performance statistics */
	performanceStats: CachePerformanceStats;

	/** Entry distribution by source */
	distribution: Record<CacheSource, number>;
}

export interface CacheMemoryStats {
	/** Current memory usage in bytes */
	current: number;

	/** Peak memory usage in bytes */
	peak: number;

	/** Average entry size in bytes */
	averageEntrySize: number;

	/** Memory efficiency (useful data / total memory) */
	efficiency: number;
}

export interface CachePerformanceStats {
	/** Average time to retrieve an entry in milliseconds */
	averageRetrievalTime: number;

	/** Average time to store an entry in milliseconds */
	averageStorageTime: number;

	/** Cache operations per second */
	operationsPerSecond: number;

	/** Time saved through caching (estimated) */
	timeSaved: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
	/** Maximum number of entries */
	maxEntries?: number;

	/** Maximum memory usage in bytes */
	maxMemory?: number;

	/** Default TTL for entries in milliseconds */
	defaultTtl?: number;

	/** Eviction strategy */
	evictionStrategy?: EvictionStrategy;

	/** Whether to enable compression */
	enableCompression?: boolean;

	/** Compression algorithm to use */
	compressionAlgorithm?: CompressionInfo["algorithm"];

	/** Whether to persist cache to disk */
	persistToDisk?: boolean;

	/** Disk storage location */
	diskLocation?: string;

	/** Whether to enable cache warming */
	enableWarming?: boolean;

	/** Files to pre-load into cache */
	warmupFiles?: string[];
}

export type EvictionStrategy = "lru" | "lfu" | "fifo" | "random" | "ttl";

/**
 * Cache manager configuration (alias for CacheOptions for backward compatibility)
 */
export interface CacheConfiguration {
	/** Maximum number of entries */
	maxSize: number;

	/** Default TTL for entries in milliseconds */
	defaultTtl: number;

	/** Whether to enable compression */
	enableCompression: boolean;

	/** Whether to persist cache to disk */
	enablePersistence: boolean;

	/** Disk storage location */
	persistencePath: string;

	/** Cleanup interval in milliseconds */
	cleanupInterval: number;
}

/**
 * Utility functions for cache entries
 */
export class CacheEntryUtils {
	/**
	 * Creates a cache key from file path and configuration
	 */
	static createKey(filePath: string, config?: any): string {
		const configHash = config ? CacheEntryUtils.hashObject(config) : "default";
		const pathHash = CacheEntryUtils.hashString(filePath);
		return `${pathHash}-${configHash}`;
	}

	/**
	 * Checks if a cache entry is expired
	 */
	static isExpired(entry: CacheEntry): boolean {
		if (!entry.expiresAt) {
			return false;
		}
		return new Date() > entry.expiresAt;
	}

	/**
	 * Checks if a cache entry is valid based on file metadata
	 */
	static isValid(
		entry: CacheEntry,
		currentFileMetadata?: FileMetadata,
	): boolean {
		if (CacheEntryUtils.isExpired(entry)) {
			return false;
		}

		if (!entry.fileMetadata || !currentFileMetadata) {
			return true; // Cannot validate without metadata
		}

		return (
			entry.fileMetadata.lastModified.getTime() ===
				currentFileMetadata.lastModified.getTime() &&
			entry.fileMetadata.size === currentFileMetadata.size &&
			entry.fileMetadata.checksum === currentFileMetadata.checksum
		);
	}

	/**
	 * Calculates the size of an entry's data
	 */
	static calculateSize(data: any): number {
		return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
	}

	/**
	 * Creates an AST cache entry
	 */
	static createASTEntry(
		key: string,
		ast: any,
		parseTime: number,
		language: string,
		parserVersion: string,
		fileMetadata?: FileMetadata,
		ttl?: number,
	): ASTCacheEntry {
		const data = { ast, parseTime, language, parserVersion };
		const size = CacheEntryUtils.calculateSize(data);
		const nodeCount = CacheEntryUtils.countASTNodes(ast);
		const depth = CacheEntryUtils.calculateASTDepth(ast);

		const entry: ASTCacheEntry = {
			key,
			data,
			createdAt: new Date(),
			lastAccessedAt: new Date(),
			fileMetadata,
			metadata: {
				size,
				hitCount: 0,
				source: "ast",
				version: "1.0.0",
				tags: ["ast", language],
				nodeCount,
				depth,
				custom: {},
			},
		};

		if (ttl) {
			entry.expiresAt = new Date(Date.now() + ttl);
		}

		return entry;
	}

	/**
	 * Creates an analysis result cache entry
	 */
	static createAnalysisEntry(
		key: string,
		analysisData: any,
		extractorsUsed: string[],
		interpretersUsed: string[],
		configHash: string,
		fileMetadata?: FileMetadata,
		ttl?: number,
	): AnalysisResultCacheEntry {
		const size = CacheEntryUtils.calculateSize(analysisData);

		const entry: AnalysisResultCacheEntry = {
			key,
			data: analysisData,
			createdAt: new Date(),
			lastAccessedAt: new Date(),
			fileMetadata,
			metadata: {
				size,
				hitCount: 0,
				source: "analysis",
				version: "1.0.0",
				tags: ["analysis", ...extractorsUsed, ...interpretersUsed],
				extractorsUsed,
				interpretersUsed,
				configHash,
				custom: {},
			},
		};

		if (ttl) {
			entry.expiresAt = new Date(Date.now() + ttl);
		}

		return entry;
	}

	/**
	 * Updates the last accessed time and increments hit count
	 */
	static touch(entry: CacheEntry): void {
		entry.lastAccessedAt = new Date();
		entry.metadata.hitCount++;
	}

	/**
	 * Compresses cache entry data if beneficial
	 */
	static compress(
		entry: CacheEntry,
		algorithm: CompressionInfo["algorithm"] = "gzip",
	): CacheEntry {
		if (algorithm === "none" || entry.metadata.compression) {
			return entry;
		}

		const originalData = JSON.stringify(entry.data);
		const originalSize = originalData.length;

		// Simulate compression (in real implementation, would use actual compression)
		const compressionRatio = CacheEntryUtils.estimateCompressionRatio(
			originalData,
			algorithm,
		);
		const compressedSize = Math.floor(originalSize * compressionRatio);

		if (compressedSize >= originalSize * 0.9) {
			// Not worth compressing if less than 10% savings
			return entry;
		}

		const compressedEntry = {
			...entry,
			metadata: {
				...entry.metadata,
				compression: {
					algorithm,
					originalSize,
					compressedSize,
					ratio: compressionRatio,
				},
			},
		};

		return compressedEntry;
	}

	/**
	 * Estimates compression ratio for different algorithms
	 */
	private static estimateCompressionRatio(
		data: string,
		algorithm: CompressionInfo["algorithm"],
	): number {
		const repetitionScore = CacheEntryUtils.calculateRepetitionScore(data);

		switch (algorithm) {
			case "gzip":
				return Math.max(0.3, 1 - repetitionScore * 0.7);
			case "brotli":
				return Math.max(0.25, 1 - repetitionScore * 0.75);
			case "lz4":
				return Math.max(0.4, 1 - repetitionScore * 0.6);
			default:
				return 1.0;
		}
	}

	/**
	 * Calculates a repetition score for compression estimation
	 */
	private static calculateRepetitionScore(data: string): number {
		const uniqueChars = new Set(data).size;
		const totalChars = data.length;
		return 1 - uniqueChars / totalChars;
	}

	/**
	 * Counts the number of nodes in an AST
	 */
	private static countASTNodes(ast: any): number {
		if (!ast || typeof ast !== "object") {
			return 0;
		}

		let count = 1; // Count current node

		if (Array.isArray(ast.children)) {
			for (const child of ast.children) {
				count += CacheEntryUtils.countASTNodes(child);
			}
		}

		return count;
	}

	/**
	 * Calculates the depth of an AST
	 */
	private static calculateASTDepth(ast: any): number {
		if (!ast || typeof ast !== "object" || !Array.isArray(ast.children)) {
			return 1;
		}

		let maxChildDepth = 0;
		for (const child of ast.children) {
			const childDepth = CacheEntryUtils.calculateASTDepth(child);
			maxChildDepth = Math.max(maxChildDepth, childDepth);
		}

		return 1 + maxChildDepth;
	}

	/**
	 * Creates a simple hash of a string
	 */
	private static hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Creates a hash of an object
	 */
	private static hashObject(obj: any): string {
		const str = JSON.stringify(obj, Object.keys(obj).sort());
		return CacheEntryUtils.hashString(str);
	}
}
