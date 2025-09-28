# Cache Management Guide

This document explains how to manage and reset caches in the dependency-linker library.

## Overview

The dependency-linker library uses multiple levels of caching to improve performance:
- **AST Cache**: Parsed Abstract Syntax Trees
- **Analysis Result Cache**: Complete analysis results
- **Shared Instance Cache**: Factory-managed analyzer instances

## Cache Reset Methods

### 1. Individual Analyzer Instance Reset

Reset cache for a specific analyzer instance:

```typescript
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer({
    enableCache: true,
    defaultTimeout: 30000
});

// Analyze some files...
await analyzer.analyzeFile('src/example.ts');

// Clear cache for this specific analyzer instance
analyzer.clearCache();
console.log('Individual analyzer cache cleared');
```

### 2. Factory-Level Reset

Reset all factory-managed shared analyzers:

```typescript
import { resetFactoryAnalyzers } from '@context-action/dependency-linker';

// Reset all factory-managed analyzer instances
resetFactoryAnalyzers();
console.log('All factory analyzers reset');
```

### 3. Shared Analyzer Reset

Reset the internal shared analyzer instance used by factory functions:

```typescript
import { resetSharedAnalyzer } from '@context-action/dependency-linker';

// Reset the shared analyzer instance
resetSharedAnalyzer();
console.log('Shared analyzer cache cleared');
```

### 4. Analysis Engine Reset

Direct access to the underlying analysis engine:

```typescript
import { AnalysisEngine } from '@context-action/dependency-linker';

const engine = new AnalysisEngine({
    useCache: true,
    maxCacheSize: 1000
});

// Clear cache at engine level
engine.clearCache();
console.log('Analysis engine cache cleared');
```

## When to Reset Cache

### Test Isolation
```typescript
// In test setup/teardown
import { resetFactoryAnalyzers, resetSharedAnalyzer } from '@context-action/dependency-linker';

describe('Analysis Tests', () => {
    afterEach(() => {
        // Ensure clean state between tests
        resetFactoryAnalyzers();
        resetSharedAnalyzer();
    });

    it('should analyze without interference', async () => {
        // Test logic here
    });
});
```

### Development/Hot Reload
```typescript
// During development when files change frequently
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();

// After file system changes
function onFileChange() {
    analyzer.clearCache();
    console.log('Cache cleared due to file change');
}
```

### Memory Management
```typescript
// Periodic cache cleanup in long-running applications
import { resetFactoryAnalyzers } from '@context-action/dependency-linker';

setInterval(() => {
    resetFactoryAnalyzers();
    console.log('Periodic cache cleanup performed');
}, 30 * 60 * 1000); // Every 30 minutes
```

### Configuration Changes
```typescript
// When analysis configuration changes
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();

function updateConfiguration(newConfig) {
    // Clear cache when configuration changes
    analyzer.clearCache();

    // Apply new configuration
    analyzer.setDefaultConfig(newConfig);
}
```

## Cache Statistics

Monitor cache performance before and after resets:

```typescript
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();

// Get cache statistics
const statsBeforeReset = analyzer.getCacheStats();
console.log('Before reset:', statsBeforeReset);

// Clear cache
analyzer.clearCache();

// Verify cache is cleared
const statsAfterReset = analyzer.getCacheStats();
console.log('After reset:', statsAfterReset);
```

## Best Practices

### 1. Choose the Right Level
- **Individual Instance**: Use `analyzer.clearCache()` for instance-specific cleanup
- **Factory Level**: Use `resetFactoryAnalyzers()` for application-wide reset
- **Shared Instance**: Use `resetSharedAnalyzer()` for factory function cleanup

### 2. Test Environment
```typescript
// Recommended test setup
import { resetFactoryAnalyzers, resetSharedAnalyzer } from '@context-action/dependency-linker';

beforeEach(() => {
    // Ensure clean state for each test
    resetFactoryAnalyzers();
    resetSharedAnalyzer();
});
```

### 3. Production Environment
```typescript
// Conservative approach for production
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

class ProductionAnalyzer {
    private analyzer: TypeScriptAnalyzer;

    constructor() {
        this.analyzer = new TypeScriptAnalyzer({
            enableCache: true,
            maxCacheSize: 5000
        });
    }

    // Controlled cache management
    public managedClearCache(): void {
        const stats = this.analyzer.getCacheStats();

        // Only clear if cache is getting large
        if (stats.size > 4000) {
            this.analyzer.clearCache();
            console.log('Cache cleared due to size limit');
        }
    }
}
```

### 4. Error Recovery
```typescript
// Clear cache on analysis errors
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();

async function robustAnalysis(filePath: string) {
    try {
        return await analyzer.analyzeFile(filePath);
    } catch (error) {
        console.error('Analysis failed:', error);

        // Clear cache and retry once
        analyzer.clearCache();
        console.log('Cache cleared, retrying analysis');

        return await analyzer.analyzeFile(filePath);
    }
}
```

## Performance Impact

### Cache Reset Costs
- **Individual Reset**: Low impact, only affects one analyzer instance
- **Factory Reset**: Medium impact, affects all factory-managed instances
- **Shared Reset**: Low impact, affects only the shared instance

### When NOT to Reset
- **High-frequency operations**: Avoid resetting cache during batch processing
- **Stable file sets**: Keep cache when analyzing the same files repeatedly
- **Production hot paths**: Be conservative with cache resets in critical paths

## Troubleshooting

### Common Issues

1. **Cache Not Clearing**
   ```typescript
   // Verify cache is actually cleared
   const stats = analyzer.getCacheStats();
   console.log('Cache size after reset:', stats.size); // Should be 0
   ```

2. **Test Interference**
   ```typescript
   // Ensure proper cleanup in test environment
   afterEach(() => {
       resetFactoryAnalyzers();
       resetSharedAnalyzer();
   });
   ```

3. **Memory Leaks**
   ```typescript
   // Monitor memory usage
   const memoryBefore = process.memoryUsage().heapUsed;
   analyzer.clearCache();
   const memoryAfter = process.memoryUsage().heapUsed;
   console.log('Memory freed:', memoryBefore - memoryAfter);
   ```

## API Reference

### TypeScriptAnalyzer
- `clearCache(): void` - Clear analyzer instance cache
- `getCacheStats(): CacheStats` - Get cache statistics

### Factory Functions
- `resetFactoryAnalyzers(): void` - Reset all factory analyzers
- `resetSharedAnalyzer(): void` - Reset shared analyzer instance

### AnalysisEngine
- `clearCache(): void` - Clear analysis engine cache
- `getCacheStats(): CacheStats` - Get cache statistics
- `resetPerformanceMetrics(): void` - Reset performance tracking

## Migration Guide

### From v2.3.6 to v2.3.7

The cache reset functionality was enhanced in v2.3.7 for better test isolation:

```typescript
// Old approach (still works)
analyzer.clearCache();

// New enhanced approach (recommended for tests)
import { resetSharedAnalyzer } from '@context-action/dependency-linker';

// In test cleanup
afterEach(() => {
    resetSharedAnalyzer(); // Enhanced cleanup
});
```

## Related Documentation

- [Performance Guide](./PERFORMANCE.md) - Cache optimization strategies
- [Testing Guide](./TESTING.md) - Test isolation patterns
- [API Reference](./API.md) - Complete API documentation