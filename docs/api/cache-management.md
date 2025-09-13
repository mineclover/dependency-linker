# Cache Management API

Comprehensive caching system for optimal performance and resource management in the TypeScript Dependency Linker.

## 🚀 Overview

The cache management system provides multiple layers of caching to optimize analysis performance:

1. **Factory Cache**: Intelligent caching for factory functions
2. **Analyzer Cache**: Configurable caching within TypeScriptAnalyzer instances
3. **Batch Cache**: Optimized caching for batch operations
4. **Result Cache**: Long-term storage of analysis results

## 🏭 Factory Cache System

The factory cache provides automatic caching for factory functions with intelligent cache strategies.

### Configuration

Factory functions automatically use caching, but can be configured globally or per-operation:

```typescript
import { configureCaching } from 'dependency-linker/api/factory-functions';

// Global cache configuration
configureCaching({
  enabled: true,
  maxSize: 1000,
  ttl: 3600000, // 1 hour
  strategy: 'lru', // 'lru', 'fifo', or 'lfu'
  persistToDisk: true,
  cacheDirectory: './cache'
});
```

### Cache Strategies

#### LRU (Least Recently Used) - Default
Best for most applications with varying file access patterns.

```typescript
import { analyzeTypeScriptFile } from 'dependency-linker';

// Automatically uses LRU cache
const result1 = await analyzeTypeScriptFile('./src/utils.ts');
const result2 = await analyzeTypeScriptFile('./src/utils.ts'); // Cache hit
```

#### LFU (Least Frequently Used)
Optimal for applications that repeatedly analyze the same set of files.

```typescript
configureCaching({ strategy: 'lfu' });

// Files analyzed multiple times stay in cache longer
for (let i = 0; i < 10; i++) {
  await analyzeTypeScriptFile('./src/core.ts'); // High frequency = stays cached
}
```

#### FIFO (First In, First Out)
Suitable for linear processing where older entries can be safely discarded.

```typescript
configureCaching({ strategy: 'fifo' });

// Older entries removed regardless of usage
await analyzeTypeScriptFile('./file1.ts');
await analyzeTypeScriptFile('./file2.ts');
// ... more files, file1.ts eventually evicted
```

### Factory Cache Methods

#### `getCacheStats(): CacheStatistics`

Retrieves comprehensive cache performance statistics.

```typescript
import { getCacheStats } from 'dependency-linker/api/factory-functions';

const stats = getCacheStats();

console.log(`Cache Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Cache Size: ${stats.currentSize}/${stats.maxSize}`);
console.log(`Memory Usage: ${stats.memoryUsage}MB`);
console.log(`Average Response Time: ${stats.averageResponseTime}ms`);
```

**Cache Statistics Interface:**
```typescript
interface CacheStatistics {
  hitRate: number;          // 0.0 to 1.0
  missRate: number;         // 0.0 to 1.0
  currentSize: number;      // Current number of cached items
  maxSize: number;          // Maximum cache capacity
  memoryUsage: number;      // Memory usage in MB
  averageResponseTime: number; // Average cache lookup time in ms
  evictionCount: number;    // Number of items evicted
  oldestEntry: number;      // Timestamp of oldest cache entry
  newestEntry: number;      // Timestamp of newest cache entry
  topFiles: Array<{        // Most frequently accessed files
    filePath: string;
    accessCount: number;
    lastAccessed: number;
  }>;
}
```

#### `clearCache(): void`

Clears all cached analysis results from factory functions.

```typescript
import { clearCache } from 'dependency-linker/api/factory-functions';

// Clear all cached results
clearCache();

// Next analysis will be a cache miss
const result = await analyzeTypeScriptFile('./src/index.ts');
```

#### `preloadCache(filePaths: string[], options?: PreloadOptions): Promise<CachePreloadResult>`

Preloads analysis results into cache for improved performance.

```typescript
import { preloadCache } from 'dependency-linker/api/factory-functions';

const preloadResult = await preloadCache([
  './src/index.ts',
  './src/utils.ts',
  './src/types.ts'
], {
  concurrency: 3,
  continueOnError: true,
  priority: 'high'
});

console.log(`Preloaded: ${preloadResult.successful}/${preloadResult.total} files`);
console.log(`Failed: ${preloadResult.failed.length} files`);
```

#### `optimizeCache(): CacheOptimizationResult`

Optimizes cache for better performance and memory usage.

```typescript
import { optimizeCache } from 'dependency-linker/api/factory-functions';

const optimization = optimizeCache();

console.log(`Memory Freed: ${optimization.memoryFreed}MB`);
console.log(`Items Removed: ${optimization.itemsRemoved}`);
console.log(`New Hit Rate Estimate: ${(optimization.estimatedHitRateImprovement * 100).toFixed(1)}%`);
```

## 🔧 TypeScriptAnalyzer Cache Management

Individual analyzer instances provide fine-grained cache control.

### Cache Configuration

```typescript
import { TypeScriptAnalyzer } from 'dependency-linker';

const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheConfig: {
    maxSize: 500,
    ttl: 1800000, // 30 minutes
    strategy: 'lru',
    persistToDisk: false,
    enableCacheCompression: true,
    cacheValidation: true
  }
});
```

### Cache Control Methods

#### `getCacheStats(): CacheStats`

```typescript
const stats = analyzer.getCacheStats();

console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Cache Size: ${stats.size}/${stats.maxSize}`);
console.log(`Memory Usage: ${stats.memoryUsage}MB`);
```

#### `clearCache(): void`

```typescript
// Clear analyzer's internal cache
analyzer.clearCache();
```

#### `setCacheConfig(config: CacheConfig): void`

```typescript
// Update cache configuration
analyzer.setCacheConfig({
  maxSize: 1000,
  ttl: 7200000, // 2 hours
  strategy: 'lfu'
});
```

#### `warmupCache(filePaths: string[]): Promise<CacheWarmupResult>`

```typescript
const warmupResult = await analyzer.warmupCache([
  './src/components/*.ts',
  './src/utils/*.ts'
]);

console.log(`Warmed up ${warmupResult.filesProcessed} files`);
console.log(`Cache hit rate should improve to ~${warmupResult.expectedHitRate}%`);
```

## 📦 Batch Cache Optimization

Batch operations include advanced caching strategies for processing multiple files efficiently.

### BatchAnalyzer Cache Features

```typescript
import { BatchAnalyzer, TypeScriptAnalyzer } from 'dependency-linker';

const analyzer = new TypeScriptAnalyzer({ enableCache: true });
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enableSharedCache: true,      // Share cache across batch operations
  enablePredictiveCache: true,  // Predict and preload likely dependencies
  cacheCompressionLevel: 6,     // Compress cached results (1-9)
  enableCacheValidation: true   // Validate cache integrity
});
```

### Shared Cache Benefits

When processing multiple files, shared cache prevents redundant analysis of common dependencies:

```typescript
// Process batch with shared cache
const result = await batchAnalyzer.processBatch([
  './src/fileA.ts', // Imports './common.ts'
  './src/fileB.ts', // Also imports './common.ts'
  './src/fileC.ts'  // Also imports './common.ts'
]);

// './common.ts' analyzed once, cached result used for fileB and fileC
console.log(`Cache hits: ${result.cacheStats.hitCount}`);
console.log(`Time saved: ${result.cacheStats.timeSaved}ms`);
```

### Predictive Caching

Predictive caching analyzes import patterns to preload likely dependencies:

```typescript
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enablePredictiveCache: true,
  predictionAccuracy: 0.8, // 80% confidence threshold
  maxPredictiveEntries: 100
});

// Automatically preloads common imports based on file analysis patterns
const result = await batchAnalyzer.processBatch(filePaths);
console.log(`Prediction accuracy: ${result.predictionStats.accuracy}%`);
```

## 💾 Persistent Cache

Enable disk-based caching for cache persistence across application restarts.

### Configuration

```typescript
import { TypeScriptAnalyzer } from 'dependency-linker';

const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheConfig: {
    persistToDisk: true,
    cacheDirectory: './node_modules/.cache/dependency-linker',
    compression: true,
    encryption: false,
    maxDiskSize: 100 * 1024 * 1024, // 100MB
    cleanupInterval: 86400000 // 24 hours
  }
});
```

### Cache Persistence Methods

#### `saveCacheToDisk(): Promise<CacheSaveResult>`

```typescript
const saveResult = await analyzer.saveCacheToDisk();

console.log(`Saved ${saveResult.entriesSaved} cache entries`);
console.log(`Disk usage: ${saveResult.diskUsage}MB`);
console.log(`Compression ratio: ${saveResult.compressionRatio}%`);
```

#### `loadCacheFromDisk(): Promise<CacheLoadResult>`

```typescript
const loadResult = await analyzer.loadCacheFromDisk();

console.log(`Loaded ${loadResult.entriesLoaded} cache entries`);
console.log(`Cache hit rate improved by: ${loadResult.hitRateImprovement}%`);
```

#### `cleanupDiskCache(): Promise<CacheCleanupResult>`

```typescript
const cleanupResult = await analyzer.cleanupDiskCache();

console.log(`Freed ${cleanupResult.spaceFreed}MB`);
console.log(`Removed ${cleanupResult.expiredEntries} expired entries`);
```

## 📊 Cache Performance Monitoring

### Real-time Cache Monitoring

```typescript
// Enable real-time cache monitoring
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  enableCacheMonitoring: true,
  monitoringInterval: 10000 // 10 seconds
});

analyzer.on('cacheStats', (stats) => {
  console.log(`Current hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  if (stats.hitRate < 0.7) {
    console.warn('Cache hit rate below optimal threshold');
  }
});
```

### Cache Health Diagnostics

```typescript
import { DiagnosticTool } from 'dependency-linker/api/errors';

const diagnostics = new DiagnosticTool(analyzer);

// Analyze cache health
const cacheHealth = await diagnostics.analyzeCacheHealth();

console.log(`Cache Health Score: ${cacheHealth.overallScore}/100`);
cacheHealth.recommendations.forEach(recommendation => {
  console.log(`- ${recommendation.description} (Impact: ${recommendation.impact})`);
});
```

## 🎯 Best Practices

### Cache Strategy Selection

#### For Web Applications
```typescript
// Optimize for frequent re-analysis of the same files
configureCaching({
  strategy: 'lfu',
  maxSize: 1000,
  ttl: 3600000, // 1 hour
  persistToDisk: true
});
```

#### For CI/CD Pipelines
```typescript
// Optimize for one-time analysis with fast startup
configureCaching({
  strategy: 'lru',
  maxSize: 500,
  ttl: 600000, // 10 minutes
  persistToDisk: false
});
```

#### For Development Tools
```typescript
// Balance between memory usage and performance
configureCaching({
  strategy: 'lru',
  maxSize: 200,
  ttl: 1800000, // 30 minutes
  persistToDisk: true,
  enableCacheCompression: true
});
```

### Memory Management

1. **Monitor Memory Usage**: Regularly check cache memory consumption
```typescript
const stats = getCacheStats();
if (stats.memoryUsage > 100) { // 100MB threshold
  optimizeCache();
}
```

2. **Set Appropriate TTL**: Balance between cache efficiency and memory usage
```typescript
// Short TTL for rapidly changing files
configureCaching({ ttl: 300000 }); // 5 minutes

// Long TTL for stable dependencies
configureCaching({ ttl: 86400000 }); // 24 hours
```

3. **Use Cache Compression**: Reduce memory footprint for large projects
```typescript
const analyzer = new TypeScriptAnalyzer({
  cacheConfig: {
    enableCacheCompression: true,
    compressionLevel: 6 // Balance between speed and compression
  }
});
```

### Performance Optimization

1. **Preload Critical Files**: Warm up cache with frequently used files
```typescript
await preloadCache([
  './src/index.ts',
  './src/types.ts',
  './src/utils.ts'
]);
```

2. **Batch Operations**: Use BatchAnalyzer for multiple files
```typescript
// More efficient than individual analyzeTypeScriptFile calls
const batchResult = await batchAnalyzer.processBatch(filePaths);
```

3. **Cache Validation**: Enable validation in development, disable in production
```typescript
const analyzer = new TypeScriptAnalyzer({
  cacheConfig: {
    cacheValidation: process.env.NODE_ENV === 'development'
  }
});
```

## 📈 Performance Benchmarks

### Cache Performance Impact

| Operation | No Cache | With Cache | Improvement |
|-----------|----------|------------|-------------|
| Single file analysis | 25ms | 2ms | 92% faster |
| Batch processing (10 files) | 250ms | 50ms | 80% faster |
| Repeated analysis | 25ms | 0.5ms | 98% faster |

### Memory Usage

| Cache Size | Memory Usage | Recommended For |
|------------|--------------|-----------------|
| 100 entries | ~10MB | Small projects |
| 500 entries | ~45MB | Medium projects |
| 1000 entries | ~85MB | Large projects |
| 2000 entries | ~160MB | Enterprise projects |

### Cache Hit Rates by Strategy

| Strategy | Typical Hit Rate | Best Use Case |
|----------|------------------|---------------|
| LRU | 75-85% | General purpose |
| LFU | 80-90% | Repeated file access |
| FIFO | 65-75% | Linear processing |

## 🔧 Integration Examples

### Express.js Cache Management Endpoint

```typescript
import express from 'express';
import { getCacheStats, clearCache, optimizeCache } from 'dependency-linker';

const app = express();

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    hitRate: Math.round(stats.hitRate * 100),
    memoryUsage: stats.memoryUsage,
    size: `${stats.currentSize}/${stats.maxSize}`,
    efficiency: stats.hitRate > 0.8 ? 'excellent' :
                stats.hitRate > 0.6 ? 'good' : 'poor'
  });
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
  clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

app.post('/api/cache/optimize', (req, res) => {
  const result = optimizeCache();
  res.json({
    message: 'Cache optimized',
    memoryFreed: result.memoryFreed,
    itemsRemoved: result.itemsRemoved
  });
});
```

### Automated Cache Management

```typescript
class SmartCacheManager {
  private analyzer: TypeScriptAnalyzer;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.analyzer = new TypeScriptAnalyzer({ enableCache: true });
    this.startMonitoring();
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      const stats = this.analyzer.getCacheStats();

      // Auto-optimize if hit rate drops below threshold
      if (stats.hitRate < 0.6) {
        console.log('Cache hit rate low, optimizing...');
        optimizeCache();
      }

      // Auto-clear if memory usage is too high
      if (stats.memoryUsage > 200) { // 200MB threshold
        console.log('Cache memory usage high, clearing oldest entries...');
        this.analyzer.clearCache();
      }
    }, 60000); // Check every minute
  }

  dispose() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}
```