/**
 * Intelligent Caching System for TypeScript Analysis
 * Multi-tier caching with memory and file-based storage
 */

export { FileCache } from './FileCache';
export { MemoryCache } from './MemoryCache';
export { CacheManager } from './CacheManager';

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
  size?: number;
}

export interface CacheStats {
  entryCount: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  evictions?: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  enableCompression?: boolean;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

export interface CacheProvider<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  getStats(): CacheStats;
}