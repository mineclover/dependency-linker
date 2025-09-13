/**
 * CacheManager service implementation
 * Manages caching of AST parsing results and analysis data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { CacheEntry, CacheStats, CacheConfiguration } from '../models/CacheEntry';

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
  optimize(): Promise<{ removedEntries: number; spaceRecovered: number }>;

  /**
   * Configures cache settings
   */
  configure(config: Partial<CacheConfiguration>): void;

  /**
   * Gets cache configuration
   */
  getConfiguration(): CacheConfiguration;
}

export class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private astCache: Map<string, CacheEntry<any>> = new Map(); // Dedicated AST cache
  private stats: CacheStats;
  private config: CacheConfiguration;
  private compressionCache: Map<string, Buffer> = new Map(); // Pre-compressed data cache

  constructor(config?: Partial<CacheConfiguration>) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 3600000, // 1 hour
      enableCompression: true,
      enablePersistence: true,
      persistencePath: '.cache',
      cleanupInterval: 300000, // 5 minutes
      ...config
    };

    this.stats = {
      totalEntries: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      memoryStats: {
        current: 0,
        peak: 0,
        averageEntrySize: 0,
        efficiency: 0
      },
      performanceStats: {
        averageRetrievalTime: 0,
        averageStorageTime: 0,
        operationsPerSecond: 0,
        timeSaved: 0
      },
      distribution: {
        ast: 0,
        analysis: 0,
        extractor: 0,
        interpreter: 0,
        external: 0
      }
    };

    // Start cleanup interval if configured
    if (this.config.cleanupInterval > 0) {
      setInterval(() => this.cleanup(), this.config.cleanupInterval);
    }

    // Load persisted cache if enabled
    if (this.config.enablePersistence) {
      this.loadFromDisk().catch(error => {
        console.warn('Failed to load cache from disk:', error.message);
      });
    }
  }

  /**
   * Gets cached entry by key
   */
  async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        this.updateStats();
        return undefined;
      }

      // Check if entry is expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        await this.delete(key);
        this.stats.misses++;
        this.updateStats();
        return undefined;
      }

      // Update access info
      entry.accessCount++;
      entry.lastAccessed = new Date();

      this.stats.hits++;
      this.updateStats();

      // Decompress if needed
      const data = this.config.enableCompression && entry.compressed
        ? this.decompress(entry.data)
        : entry.data;

      return data as T;
    } finally {
      const accessTime = Date.now() - startTime;
      this.updateAvgAccessTime(accessTime);
    }
  }

  /**
   * Stores entry in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      await this.evictOldest();
    }

    const now = new Date();
    const actualTtl = ttl ?? this.config.defaultTtl;
    const expiresAt = actualTtl > 0 ? new Date(now.getTime() + actualTtl) : undefined;

    // Compress data if enabled
    const processedData = this.config.enableCompression
      ? this.compress(data)
      : data;

    const entry: CacheEntry<T> = {
      key,
      data: processedData,
      createdAt: now,
      expiresAt,
      lastAccessed: now,
      accessCount: 0,
      size: this.calculateSize(processedData),
      compressed: this.config.enableCompression,
      checksum: this.calculateChecksum(data)
    };

    this.cache.set(key, entry);
    this.updateMemoryUsage();

    // Persist to disk if enabled
    if (this.config.enablePersistence) {
      await this.persistToDisk();
    }
  }

  /**
   * Checks if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes entry from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMemoryUsage();
      if (this.config.enablePersistence) {
        await this.persistToDisk();
      }
    }
    return deleted;
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.entries = 0;
    this.stats.memoryUsage = 0;

    if (this.config.enablePersistence) {
      await this.clearDiskCache();
    }
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Validates cache integrity
   */
  async validate(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const [key, entry] of this.cache) {
      try {
        // Validate checksum
        const currentChecksum = this.calculateChecksum(entry.data);
        if (currentChecksum !== entry.checksum) {
          errors.push(`Checksum mismatch for key: ${key}`);
        }

        // Validate data integrity
        if (entry.compressed) {
          try {
            this.decompress(entry.data);
          } catch (error) {
            errors.push(`Decompression failed for key: ${key}`);
          }
        }
      } catch (error) {
        errors.push(`Validation error for key ${key}: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Optimizes cache (removes expired entries, compresses data)
   */
  async optimize(): Promise<{ removedEntries: number; spaceRecovered: number }> {
    let removedEntries = 0;
    let spaceRecovered = 0;
    const now = new Date();

    // Remove expired entries
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        spaceRecovered += entry.size;
        await this.delete(key);
        removedEntries++;
      }
    }

    // Update cleanup timestamp
    this.stats.lastCleanup = now;

    if (this.config.enablePersistence) {
      await this.persistToDisk();
    }

    return { removedEntries, spaceRecovered };
  }

  /**
   * Configures cache settings
   */
  configure(config: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets cache configuration
   */
  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  /**
   * AST-specific cache methods for optimized parsing performance
   */

  /**
   * Gets cached AST by file path and content hash
   */
  async getAST(filePath: string, contentHash?: string): Promise<any> {
    const key = contentHash ? `ast:${filePath}:${contentHash}` : `ast:${filePath}`;
    return this.get(key);
  }

  /**
   * Stores AST with optimized compression for parsing performance
   */
  async setAST(filePath: string, ast: any, contentHash?: string): Promise<void> {
    const key = contentHash ? `ast:${filePath}:${contentHash}` : `ast:${filePath}`;

    // Use AST-specific compression that preserves structure while reducing size
    const compressedAST = await this.compressAST(ast);
    await this.set(key, compressedAST);
  }

  /**
   * Batch AST operations for improved performance
   */
  async setASTBatch(entries: Array<{ filePath: string; ast: any; contentHash?: string }>): Promise<void> {
    const compressionPromises = entries.map(async ({ filePath, ast, contentHash }) => {
      const key = contentHash ? `ast:${filePath}:${contentHash}` : `ast:${filePath}`;
      const compressedAST = await this.compressAST(ast);
      return { key, data: compressedAST };
    });

    const compressedEntries = await Promise.all(compressionPromises);

    // Batch insert for better performance
    for (const { key, data } of compressedEntries) {
      await this.set(key, data);
    }
  }

  /**
   * Pre-warms AST cache for frequently accessed files
   */
  async warmupASTCache(filePaths: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const warmupPromises = filePaths.map(async (filePath) => {
      try {
        // Check if already cached
        const cached = await this.getAST(filePath);
        if (!cached) {
          // Pre-load into cache - this would typically be called after parsing
          // For now, we just mark as a cache miss
          failed++;
        } else {
          success++;
        }
      } catch (error) {
        failed++;
      }
    });

    await Promise.all(warmupPromises);
    return { success, failed };
  }

  private async cleanup(): Promise<void> {
    await this.optimize();
  }

  private async evictOldest(): Promise<void> {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
  }

  private updateAvgAccessTime(accessTime: number): void {
    const totalAccesses = this.stats.hits + this.stats.misses;
    this.stats.avgAccessTime = ((this.stats.avgAccessTime * (totalAccesses - 1)) + accessTime) / totalAccesses;
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private compress<T>(data: T): any {
    try {
      const jsonString = JSON.stringify(data);
      if (this.config.enableCompression) {
        return zlib.gzipSync(jsonString).toString('base64');
      }
      return jsonString;
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error.message);
      return JSON.stringify(data);
    }
  }

  private decompress<T>(data: any): T {
    try {
      if (typeof data === 'string' && data.length > 0 && this.config.enableCompression) {
        // Try to decompress if it looks like compressed data
        if (data.includes('H4sI') || data.length % 4 === 0) {
          const buffer = Buffer.from(data, 'base64');
          const decompressed = zlib.gunzipSync(buffer).toString();
          return JSON.parse(decompressed);
        }
      }
      // Fallback to regular JSON parsing
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.warn('Decompression failed, trying as regular JSON:', error.message);
      return JSON.parse(data);
    }
  }

  /**
   * AST-optimized compression that preserves structure while maximizing compression
   */
  private async compressAST(ast: any): Promise<any> {
    if (!ast) return ast;

    try {
      // Remove redundant information that can be reconstructed
      const optimized = this.optimizeASTForStorage(ast);

      // Use high compression for AST data
      const jsonString = JSON.stringify(optimized);

      if (this.config.enableCompression) {
        return new Promise((resolve, reject) => {
          zlib.gzip(jsonString, { level: zlib.constants.Z_BEST_COMPRESSION }, (err, result) => {
            if (err) reject(err);
            else resolve(result.toString('base64'));
          });
        });
      }

      return optimized;
    } catch (error) {
      console.warn('AST compression failed, storing unoptimized:', error.message);
      return ast;
    }
  }

  /**
   * Optimizes AST structure for storage by removing redundant data
   */
  private optimizeASTForStorage(ast: any): any {
    if (!ast || typeof ast !== 'object') return ast;

    // Create a shallow copy to avoid mutating the original
    const optimized = { ...ast };

    // Remove common redundant properties that can be reconstructed
    delete optimized.parent; // Parent references create cycles
    delete optimized.sourceFile; // Can be reconstructed from context
    delete optimized.pos; // Position info often not needed for caching
    delete optimized.end; // End position info often not needed

    // Recursively optimize children
    if (optimized.children && Array.isArray(optimized.children)) {
      optimized.children = optimized.children.map(child => this.optimizeASTForStorage(child));
    }

    if (optimized.body && Array.isArray(optimized.body)) {
      optimized.body = optimized.body.map(child => this.optimizeASTForStorage(child));
    }

    // Handle other common child properties
    for (const [key, value] of Object.entries(optimized)) {
      if (Array.isArray(value)) {
        optimized[key] = value.map(item =>
          typeof item === 'object' ? this.optimizeASTForStorage(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        optimized[key] = this.optimizeASTForStorage(value);
      }
    }

    return optimized;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private calculateChecksum(data: any): string {
    return crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const cachePath = path.join(this.config.persistencePath, 'cache.json');
      const data = await fs.readFile(cachePath, 'utf-8');
      const entries = JSON.parse(data);

      for (const entry of entries) {
        this.cache.set(entry.key, {
          ...entry,
          createdAt: new Date(entry.createdAt),
          expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : undefined,
          lastAccessed: new Date(entry.lastAccessed)
        });
      }

      this.updateMemoryUsage();
    } catch (error) {
      // Cache file doesn't exist or is invalid - start fresh
    }
  }

  private async persistToDisk(): Promise<void> {
    try {
      await fs.mkdir(this.config.persistencePath, { recursive: true });
      const cachePath = path.join(this.config.persistencePath, 'cache.json');
      const entries = Array.from(this.cache.values());
      await fs.writeFile(cachePath, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.warn('Failed to persist cache to disk:', error.message);
    }
  }

  private async clearDiskCache(): Promise<void> {
    try {
      const cachePath = path.join(this.config.persistencePath, 'cache.json');
      await fs.unlink(cachePath);
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }
}