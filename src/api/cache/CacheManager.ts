/**
 * Unified Cache Manager with Multi-Tier Strategy
 * Coordinates memory and file caches for optimal performance
 */

import { MemoryCache } from './MemoryCache';
import { FileCache } from './FileCache';
import { CacheProvider, CacheStats, CacheOptions } from './index';

export interface CacheManagerOptions extends CacheOptions {
  enableMemoryCache?: boolean;
  enableFileCache?: boolean;
  memoryFirst?: boolean;
  cacheDir?: string;
}

/**
 * Multi-tier cache manager with intelligent cache coordination
 * Provides transparent access to memory and file caches
 */
export class CacheManager<T> implements CacheProvider<T> {
  private memoryCache?: MemoryCache<T>;
  private fileCache?: FileCache<T>;
  private memoryFirst: boolean;

  constructor(options: CacheManagerOptions = {}) {
    this.memoryFirst = options.memoryFirst !== false;

    if (options.enableMemoryCache !== false) {
      this.memoryCache = new MemoryCache<T>({
        maxSize: options.maxSize || 1000,
        ttl: options.ttl || 5 * 60 * 1000, // 5 minutes for memory
        evictionPolicy: 'lru'
      });
    }

    if (options.enableFileCache !== false) {
      const fileCacheOptions: any = {
        maxSize: (options.maxSize || 1000) * 10, // Larger for file cache
        ttl: options.ttl || 24 * 60 * 60 * 1000, // 24 hours for file
        enableCompression: options.enableCompression !== false
      };
      
      if (options.cacheDir !== undefined) {
        fileCacheOptions.cacheDir = options.cacheDir;
      }
      
      this.fileCache = new FileCache<T>(fileCacheOptions);
    }
  }

  /**
   * Get value with multi-tier lookup
   */
  async get(key: string): Promise<T | undefined> {
    // Try memory cache first if enabled and memory-first strategy
    if (this.memoryCache && this.memoryFirst) {
      const memoryResult = await this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }

    // Try file cache
    if (this.fileCache) {
      const fileResult = await this.fileCache.get(key);
      if (fileResult !== undefined) {
        // Promote to memory cache if memory-first strategy
        if (this.memoryCache && this.memoryFirst) {
          await this.memoryCache.set(key, fileResult);
        }
        return fileResult;
      }
    }

    // Try memory cache last if not memory-first strategy
    if (this.memoryCache && !this.memoryFirst) {
      const memoryResult = await this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }

    return undefined;
  }

  /**
   * Set value in all enabled caches
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.memoryCache) {
      promises.push(this.memoryCache.set(key, value, ttl));
    }

    if (this.fileCache) {
      promises.push(this.fileCache.set(key, value, ttl));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Delete from all caches
   */
  async delete(key: string): Promise<boolean> {
    const promises: Promise<boolean>[] = [];

    if (this.memoryCache) {
      promises.push(this.memoryCache.delete(key));
    }

    if (this.fileCache) {
      promises.push(this.fileCache.delete(key));
    }

    const results = await Promise.allSettled(promises);
    return results.some(result => 
      result.status === 'fulfilled' && result.value === true
    );
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.memoryCache) {
      promises.push(this.memoryCache.clear());
    }

    if (this.fileCache) {
      promises.push(this.fileCache.clear());
    }

    await Promise.allSettled(promises);
  }

  /**
   * Check if key exists in any cache
   */
  async has(key: string): Promise<boolean> {
    if (this.memoryCache && await this.memoryCache.has(key)) {
      return true;
    }

    if (this.fileCache && await this.fileCache.has(key)) {
      return true;
    }

    return false;
  }

  /**
   * Get all keys from all caches (union)
   */
  async keys(): Promise<string[]> {
    const keySet = new Set<string>();

    if (this.memoryCache) {
      const memoryKeys = await this.memoryCache.keys();
      memoryKeys.forEach(key => keySet.add(key));
    }

    if (this.fileCache) {
      const fileKeys = await this.fileCache.keys();
      fileKeys.forEach(key => keySet.add(key));
    }

    return Array.from(keySet);
  }

  /**
   * Get combined cache statistics
   */
  getStats(): CacheStats {
    const memoryStats = this.memoryCache?.getStats() || {
      entryCount: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0
    };

    const fileStats = this.fileCache?.getStats() || {
      entryCount: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0
    };

    const totalRequests = (memoryStats.totalHits + memoryStats.totalMisses) +
                         (fileStats.totalHits + fileStats.totalMisses);

    const combinedHitRate = totalRequests > 0 ?
      (memoryStats.totalHits + fileStats.totalHits) / totalRequests : 0;

    return {
      entryCount: Math.max(memoryStats.entryCount, fileStats.entryCount), // Approximate unique count
      hitRate: combinedHitRate,
      totalHits: memoryStats.totalHits + fileStats.totalHits,
      totalMisses: memoryStats.totalMisses + fileStats.totalMisses,
      memoryUsage: memoryStats.memoryUsage + fileStats.memoryUsage
    };
  }

  /**
   * Get detailed statistics for each cache tier
   */
  getDetailedStats(): {
    memory?: CacheStats;
    file?: CacheStats;
    combined: CacheStats;
  } {
    const result: {
      memory?: CacheStats;
      file?: CacheStats;
      combined: CacheStats;
    } = {
      combined: this.getStats()
    };
    
    if (this.memoryCache) {
      result.memory = this.memoryCache.getStats();
    }
    
    if (this.fileCache) {
      result.file = this.fileCache.getStats();
    }
    
    return result;
  }

  /**
   * Optimize all caches
   */
  async optimize(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.memoryCache) {
      this.memoryCache.optimize();
    }

    if (this.fileCache) {
      promises.push(this.fileCache.maintenance());
    }

    await Promise.allSettled(promises);
  }

  /**
   * Synchronize memory and file caches
   * Ensures consistency between cache tiers
   */
  async synchronize(): Promise<void> {
    if (!this.memoryCache || !this.fileCache) {
      return;
    }

    try {
      const fileKeys = await this.fileCache.keys();
      const memoryKeys = await this.memoryCache.keys();

      // Promote frequently accessed file cache entries to memory
      for (const key of fileKeys.slice(0, 100)) { // Limit to prevent memory overflow
        if (!memoryKeys.includes(key)) {
          const value = await this.fileCache.get(key);
          if (value !== undefined) {
            await this.memoryCache.set(key, value);
          }
        }
      }
    } catch (error) {
      // Synchronization failure should not break cache operation
    }
  }

  /**
   * Warm cache with provided data
   */
  async warmCache(entries: Array<{ key: string; value: T }>): Promise<void> {
    const promises = entries.map(({ key, value }) => this.set(key, value));
    await Promise.allSettled(promises);
  }

  /**
   * Get cache health information
   */
  getCacheHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getDetailedStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check memory cache health
    if (stats.memory) {
      if (stats.memory.hitRate < 0.5 && stats.memory.totalHits + stats.memory.totalMisses > 100) {
        issues.push('Low memory cache hit rate');
        recommendations.push('Consider increasing memory cache size or TTL');
      }

      if (stats.memory.memoryUsage > 100 * 1024 * 1024) { // 100MB
        issues.push('High memory cache usage');
        recommendations.push('Consider reducing cache size or enabling aggressive eviction');
      }
    }

    // Check file cache health
    if (stats.file) {
      if (stats.file.hitRate < 0.3 && stats.file.totalHits + stats.file.totalMisses > 100) {
        issues.push('Low file cache hit rate');
        recommendations.push('Consider increasing file cache TTL or size');
      }
    }

    // Overall health assessment
    const healthy = issues.length === 0;
    if (healthy && stats.combined.hitRate > 0.7) {
      recommendations.push('Cache performance is optimal');
    }

    return {
      healthy,
      issues,
      recommendations
    };
  }

  /**
   * Dispose of all cache resources
   */
  dispose(): void {
    // Memory cache disposal is automatic via GC
    // File cache disposal would clean up file watchers if any
  }
}