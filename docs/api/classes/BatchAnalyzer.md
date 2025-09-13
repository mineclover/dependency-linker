# BatchAnalyzer Class API

Advanced batch processing system for analyzing multiple TypeScript files with resource monitoring and concurrency control.

## Class Overview

Based on test analysis from `tests/unit/api/batch-processing.test.ts`, the BatchAnalyzer provides enterprise-grade batch processing capabilities:

### Constructor

```typescript
new BatchAnalyzer(analyzer: TypeScriptAnalyzer, options?: BatchAnalyzerOptions)
```

**Test Coverage**:
- Analyzer dependency injection
- Resource monitoring initialization
- Configuration validation
- Memory limit enforcement

**Parameters**:
- `analyzer: TypeScriptAnalyzer` - Base analyzer instance
- `options?: BatchAnalyzerOptions` - Batch processing configuration

### Core Methods

#### `processBatch(filePaths, options?)`

**Purpose**: Processes multiple files with advanced resource management

**Test Coverage**:
- Concurrent processing with configurable limits
- Resource monitoring and throttling
- Memory usage tracking
- Error aggregation and recovery
- Progress reporting with detailed metrics

**Parameters**:
- `filePaths: string[]` - Array of file paths to process
- `options?: BatchProcessingOptions` - Processing configuration

**Returns**: `Promise<BatchResult>`

**Example Usage** (from tests):
```typescript
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true,
  memoryLimit: 512 // MB
});

const result = await batchAnalyzer.processBatch(filePaths, {
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
  onFileError: (filePath, error) => {
    console.log(`Error in ${filePath}: ${error.message}`);
  },
  onResourceWarning: (metrics) => {
    console.log(`Resource usage: ${metrics.memoryUsageMB}MB`);
  }
});
```

#### `processDirectory(dirPath, options?)`

**Purpose**: Recursively processes directories with intelligent file filtering

**Test Coverage**:
- Directory traversal with pattern matching
- File extension filtering
- Ignore pattern processing
- Nested directory handling
- Symbolic link handling

**Parameters**:
- `dirPath: string` - Root directory path
- `options?: DirectoryProcessingOptions` - Directory processing configuration

**Returns**: `Promise<BatchResult>`

**Example Usage** (from tests):
```typescript
const result = await batchAnalyzer.processDirectory('./src', {
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/dist/**'
  ],
  recursive: true,
  followSymlinks: false
});
```

### Resource Management Methods

#### `getResourceMetrics()`

**Purpose**: Returns current resource usage statistics

**Test Coverage**:
- Memory usage tracking
- CPU utilization monitoring
- Processing speed metrics
- Cache hit rates

**Returns**: `ResourceMetrics`

**Example Usage** (from tests):
```typescript
const metrics = batchAnalyzer.getResourceMetrics();
console.log(`Memory usage: ${metrics.memoryUsageMB}MB`);
console.log(`Files per second: ${metrics.filesPerSecond}`);
console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
```

#### `setResourceLimits(limits)`

**Purpose**: Updates resource usage limits during operation

**Test Coverage**:
- Dynamic limit adjustment
- Memory threshold updates
- Concurrency level changes
- Throttling behavior validation

**Parameters**:
- `limits: ResourceLimits` - New resource limits

### Cancellation Support

#### `cancel()`

**Purpose**: Cancels ongoing batch operations gracefully

**Test Coverage**:
- Graceful shutdown of running analyses
- Partial result preservation
- Resource cleanup
- Error state handling

**Returns**: `Promise<void>`

**Example Usage** (from tests):
```typescript
// Start long-running batch operation
const batchPromise = batchAnalyzer.processBatch(manyFiles);

// Cancel after 5 seconds
setTimeout(() => {
  batchAnalyzer.cancel();
}, 5000);

try {
  const result = await batchPromise;
} catch (error) {
  if (error instanceof OperationCancelledError) {
    console.log('Operation was cancelled');
    console.log(`Partial results: ${error.partialResults.length} files`);
  }
}
```

## Configuration Options

### BatchAnalyzerOptions

Based on comprehensive test validation:

```typescript
interface BatchAnalyzerOptions {
  maxConcurrency?: number;             // Max concurrent file analyses (default: 3)
  enableResourceMonitoring?: boolean;  // Enable resource usage tracking
  memoryLimit?: number;                // Memory limit in MB
  enableProgressEvents?: boolean;      // Enable progress event emission
  retryFailedFiles?: boolean;          // Retry failed analyses
  maxRetries?: number;                 // Maximum retry attempts per file
  retryDelay?: number;                 // Delay between retries (ms)
}
```

### BatchProcessingOptions

```typescript
interface BatchProcessingOptions {
  continueOnError?: boolean;           // Continue processing on file errors
  priority?: 'speed' | 'memory' | 'balanced';  // Processing optimization strategy
  
  // Callback functions
  onProgress?: (completed: number, total: number, currentFile?: string) => void;
  onFileComplete?: (filePath: string, result: AnalysisResult) => void;
  onFileError?: (filePath: string, error: Error, retryCount?: number) => void;
  onResourceWarning?: (metrics: ResourceMetrics) => void;
  onResourceError?: (error: ResourceError) => void;
  
  // Cancellation support
  cancellationToken?: CancellationToken;
}
```

### DirectoryProcessingOptions

```typescript
interface DirectoryProcessingOptions extends BatchProcessingOptions {
  extensions?: string[];               // File extensions to include
  ignorePatterns?: string[];           // Glob patterns to ignore
  recursive?: boolean;                 // Recursive directory traversal
  followSymlinks?: boolean;            // Follow symbolic links
  maxDepth?: number;                   // Maximum directory depth
  fileLimit?: number;                  // Maximum files to process
}
```

## Resource Monitoring

### ResourceMetrics Interface

```typescript
interface ResourceMetrics {
  // Memory metrics
  memoryUsageMB: number;               // Current memory usage
  peakMemoryUsageMB: number;           // Peak memory during operation
  
  // Performance metrics
  filesProcessed: number;              // Total files processed
  filesPerSecond: number;              // Current processing speed
  averageFileTimeMs: number;           // Average time per file
  
  // Cache metrics
  cacheHitRate: number;                // Cache hit percentage
  cacheSize: number;                   // Current cache entries
  
  // Error metrics
  errorRate: number;                   // Error percentage
  retryCount: number;                  // Total retry attempts
}
```

### Resource Limits

```typescript
interface ResourceLimits {
  maxMemoryMB?: number;                // Memory usage limit
  maxConcurrency?: number;             // Concurrency limit
  maxFileSize?: number;                // Individual file size limit (bytes)
  timeoutMs?: number;                  // Operation timeout
}
```

## Error Handling and Recovery

### Error Types

Based on test scenarios:

- **BatchError**: Aggregates multiple file processing errors
- **ResourceError**: Resource exhaustion or limits exceeded
- **OperationCancelledError**: Operation cancelled by user
- **DirectoryError**: Directory access or traversal errors

### Error Recovery Strategies

```typescript
// Retry configuration (from tests)
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  retryFailedFiles: true,
  maxRetries: 3,
  retryDelay: 1000
});

// Error handling with partial results
try {
  const result = await batchAnalyzer.processBatch(filePaths, {
    continueOnError: true,
    onFileError: (filePath, error, retryCount) => {
      if (retryCount && retryCount > 0) {
        console.log(`Retry ${retryCount} failed for ${filePath}: ${error.message}`);
      }
    }
  });
  
  console.log(`Successfully processed: ${result.successful.length} files`);
  console.log(`Failed: ${result.failed.length} files`);
} catch (error) {
  if (error instanceof ResourceError) {
    console.log(`Resource limit exceeded: ${error.message}`);
  }
}
```

## Performance Optimization

### Processing Strategies

Test-validated optimization strategies:

```typescript
// Speed-optimized processing
const result = await batchAnalyzer.processBatch(files, {
  priority: 'speed',
  continueOnError: true
});

// Memory-optimized processing
const result = await batchAnalyzer.processBatch(files, {
  priority: 'memory',
  maxConcurrency: 2
});

// Balanced processing (default)
const result = await batchAnalyzer.processBatch(files, {
  priority: 'balanced'
});
```

### Resource Monitoring Integration

```typescript
// Real-time resource monitoring (from tests)
batchAnalyzer.on('resourceUpdate', (metrics: ResourceMetrics) => {
  if (metrics.memoryUsageMB > 400) {
    console.warn('High memory usage detected');
    batchAnalyzer.setResourceLimits({ maxConcurrency: 2 });
  }
});
```

## Integration with TypeScriptAnalyzer

The BatchAnalyzer works as a wrapper around TypeScriptAnalyzer:

- Inherits all configuration from the base analyzer
- Extends functionality with batch-specific features
- Maintains consistency with single-file analysis results
- Provides seamless migration from single to batch processing

## Cleanup and Disposal

```typescript
// Proper cleanup (from tests)
try {
  const results = await batchAnalyzer.processBatch(files);
  // Process results
} finally {
  // Clean up resources
  batchAnalyzer.dispose();
}
```

The BatchAnalyzer automatically handles:
- Worker thread cleanup
- Memory cache clearing
- File handle closure
- Event listener removal