# API Documentation

Comprehensive API documentation for the TypeScript Dependency Linker, organized by component type and based on test-driven specifications.

## 📁 Documentation Structure

### Function-Based API
- **[factory-functions.md](functions/factory-functions.md)** - Simple function-based API for quick integration
  - `analyzeTypeScriptFile()` - Single file analysis
  - `extractDependencies()` - Dependency extraction
  - `getBatchAnalysis()` - Batch processing
  - `analyzeDirectory()` - Directory analysis

### Class-Based API
- **[TypeScriptAnalyzer.md](classes/TypeScriptAnalyzer.md)** - Main analyzer class with full configuration
  - Constructor and configuration options
  - File and source analysis methods
  - Convenience methods for dependencies, imports, exports
  - Batch processing capabilities
  - State management and caching

- **[BatchAnalyzer.md](classes/BatchAnalyzer.md)** - Advanced batch processing system
  - Enterprise-grade batch processing
  - Resource monitoring and limits
  - Concurrency control
  - Error recovery strategies
  - Performance optimization

### Core Interfaces
- **[interfaces.md](core/interfaces.md)** - Core system interfaces and contracts
  - `IFileAnalyzer` - File analysis contract
  - `IOutputFormatter` - Output formatting contract
  - `ITypeScriptParser` - TypeScript parsing contract
  - Supporting types and validation interfaces

### Error Handling
- **[errors.md](errors/README.md)** - Comprehensive error handling documentation
  - Error types and hierarchy
  - Error recovery strategies
  - Best practices for error handling

### Test Coverage Analysis  
- **[test-coverage-gaps.md](test-coverage-gaps.md)** - Implementation vs test coverage analysis
  - Untested methods and functions
  - Missing edge case coverage
  - Recommendations for additional testing

## 🧪 Test-Driven Documentation

This API documentation is based on comprehensive test analysis:

- **Contract Tests**: 11 test suites validating API interfaces and behavior
- **Unit Tests**: 6 test suites covering individual component functionality
- **Integration Tests**: 12 test suites covering cross-component interactions
- **Performance Tests**: Multi-language analysis validation with defined targets

### 📊 Test Coverage Details
- **Total Test Files**: 33 test suites
- **Multi-Language Support**: TypeScript, JavaScript, Go, Java analysis tests
- **Performance Targets**: Parse time <200ms, Memory <500MB, Cache hit rate >80%
- **Batch Processing**: Concurrent analysis validation up to 10 parallel operations
- **Error Handling**: Comprehensive error scenario coverage

Each API method includes:
- ✅ **Test Coverage**: What scenarios are tested across 33 test suites
- 📝 **Usage Examples**: Code examples from actual test implementations
- ⚠️ **Error Scenarios**: Known error conditions and handling patterns
- ⚡ **Performance**: Validated performance characteristics with CI targets

## 🚀 Quick Start Guide

### For Simple Use Cases
Start with [Factory Functions](functions/factory-functions.md):

```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const result = await analyzeTypeScriptFile('./src/index.ts');
console.log(result.dependencies);
```

### For Advanced Use Cases
Use [TypeScriptAnalyzer Class](classes/TypeScriptAnalyzer.md):

```typescript
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  defaultTimeout: 30000
});

const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});
```

### For Batch Processing
Use [BatchAnalyzer Class](classes/BatchAnalyzer.md):

```typescript
import { BatchAnalyzer, TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true
});

const result = await batchAnalyzer.processBatch(filePaths);
```

## 📊 API Comparison Matrix

| Feature | Factory Functions | TypeScriptAnalyzer | BatchAnalyzer |
|---------|------------------|--------------------| -------------|
| **Ease of Use** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Configuration** | Basic | Full | Advanced |
| **Caching** | Automatic | Configurable | Inherited |
| **Batch Processing** | Built-in | Manual | Optimized |
| **Resource Monitoring** | None | Basic | Advanced |
| **Error Recovery** | Basic | Standard | Enterprise |
| **Performance** | Good | Better | Best |

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
├─────────────────┬─────────────────┬─────────────────────┤
│ Factory         │ TypeScript      │ Batch               │
│ Functions       │ Analyzer        │ Analyzer            │
│ (Simple API)    │ (Full API)      │ (Enterprise API)    │
└─────────────────┴─────────────────┴─────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  Core Interfaces                        │
├─────────────────┬─────────────────┬─────────────────────┤
│ IFileAnalyzer   │ IOutputFormatter│ ITypeScriptParser   │
└─────────────────┴─────────────────┴─────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                Service Layer                             │
├─────────────────┬─────────────────┬─────────────────────┤
│ File Analysis   │ Dependency      │ TypeScript          │
│ Service         │ Resolution      │ Parser Service      │
└─────────────────┴─────────────────┴─────────────────────┘
```

## 🎯 Best Practices

### API Selection
1. **Use Factory Functions** for simple integration and prototyping
2. **Use TypeScriptAnalyzer** for applications needing configuration and state management
3. **Use BatchAnalyzer** for processing large numbers of files efficiently

### Error Handling
1. Always wrap API calls in try-catch blocks
2. Check result.success for analysis-level errors
3. Use specific error types for targeted error handling
4. Enable partial results for robustness

### Performance Optimization
1. Enable caching for repeated analyses
2. Use appropriate concurrency levels for batch processing
3. Monitor resource usage in production environments
4. Set reasonable timeouts for large files

### Configuration
1. Start with default options and adjust based on needs
2. Monitor performance metrics to optimize settings
3. Use resource monitoring in production environments
4. Implement proper cleanup and disposal patterns

## 📈 Performance Benchmarks

Based on comprehensive test validation:

### Single File Analysis
- **Small files (< 1KB)**: < 5ms
- **Medium files (1-100KB)**: < 20ms  
- **Large files (> 100KB)**: < 100ms

### Batch Processing
- **10 files**: < 200ms (with concurrency)
- **100 files**: < 2s (with optimization)
- **1000+ files**: Linear scaling with resource limits

### Memory Usage
- **Single analysis**: < 10MB
- **Batch processing**: < 100MB (with monitoring)
- **Cache overhead**: < 50MB (configurable)

## 🔧 Integration Examples

Complete integration examples available in:
- `examples/` directory - Production-ready integration patterns  
- `demo/` directory - Interactive demos and tutorials
- Test files - Comprehensive usage examples

## 🐛 Debug Mode Documentation

The TypeScript Dependency Linker includes comprehensive debugging capabilities for development and troubleshooting.

### Enabling Debug Mode

Debug mode can be enabled globally or per-operation to provide detailed insights into analysis processes.

#### Global Debug Mode

```typescript
import { TypeScriptAnalyzer } from 'dependency-linker';

const analyzer = new TypeScriptAnalyzer({
  logLevel: 'debug',              // Enable debug logging
  enableDebugMode: true,          // Enable debug features
  enablePerformanceTracking: true // Track performance metrics
});
```

#### Per-Operation Debug Mode

```typescript
// Enable debug for specific analysis
const result = await analyzer.analyzeFile('./src/index.ts', {
  enableDebug: true,              // Debug this operation
  includeDetailedMetrics: true,   // Include detailed performance metrics
  logLevel: 'debug'              // Override global log level
});
```

### Debug Output Features

#### Detailed Analysis Logging

When debug mode is enabled, you'll see comprehensive analysis information:

```typescript
// Debug output example
DEBUG [TypeScriptAnalyzer] Starting analysis: ./src/index.ts
DEBUG [FileAnalyzer] Reading file: ./src/index.ts (size: 2.3KB)
DEBUG [TypeScriptParser] Parsing AST: ./src/index.ts
DEBUG [DependencyExtractor] Found 12 import statements
DEBUG [DependencyExtractor] Extracted 8 dependencies (4 external, 4 internal)
DEBUG [TypeScriptAnalyzer] Analysis completed: ./src/index.ts (23ms)
DEBUG [Cache] Storing result in cache: key=hash_123abc
```

#### Performance Metrics

```typescript
import { DebugHelper } from 'dependency-linker/api/errors';

const debugHelper = new DebugHelper();
const result = await analyzer.analyzeFile('./src/complex.ts');

// Log detailed performance information
debugHelper.logAnalysisDetails(result, {
  includeMetrics: true,
  includeSourceDetails: true,
  verboseMode: true
});

// Output:
// === Analysis Performance Report ===
// File: ./src/complex.ts
// Parse Time: 45ms
// Memory Usage: 12MB
// Cache: Miss
// Dependencies: 23 found (15 external, 8 internal)
// Exports: 5 found
// AST Nodes: 1,247
```

#### Error Analysis with Debug Context

```typescript
import { DiagnosticTool } from 'dependency-linker/api/errors';

try {
  const result = await analyzer.analyzeFile('./problematic.ts');
} catch (error) {
  const diagnostics = new DiagnosticTool(analyzer);

  // Analyze error with full debug context
  const errorAnalysis = await diagnostics.analyzeError(error, {
    filePath: './problematic.ts',
    includeDebugContext: true,
    verboseMode: true
  });

  console.log('🐛 Debug Error Analysis:');
  console.log(`Root Cause: ${errorAnalysis.rootCause}`);
  console.log(`Solutions: ${errorAnalysis.solutions.join('\n- ')}`);
  console.log(`Debug Context: ${JSON.stringify(errorAnalysis.debugContext, null, 2)}`);
}
```

### Debug Mode Configuration Options

#### Comprehensive Debug Configuration

```typescript
const analyzer = new TypeScriptAnalyzer({
  // Logging configuration
  logLevel: 'debug',
  enableDebugMode: true,
  debugOptions: {
    logToFile: true,                    // Write debug logs to file
    logFilePath: './debug.log',         // Debug log file location
    enableTimestamps: true,             // Include timestamps in logs
    enableStackTraces: true,            // Include stack traces for errors
    enableMemoryTracking: true,         // Track memory usage
    enablePerformanceMetrics: true,     // Detailed performance tracking
    logCacheOperations: true,           // Log cache hits/misses
    logDependencyResolution: true,      // Log dependency resolution process
    verboseMode: process.env.DEBUG === 'true'
  }
});
```

#### Batch Processing Debug Mode

```typescript
import { BatchAnalyzer } from 'dependency-linker';

const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enableDiagnostics: true,              // Enable diagnostic collection
  enableResourceMonitoring: true,      // Monitor resource usage
  debugOptions: {
    logBatchProgress: true,             // Log progress for each file
    logResourceMetrics: true,           // Log resource usage
    logConcurrencyAdjustments: true,    // Log adaptive concurrency changes
    enableDetailedErrorReporting: true  // Detailed error context
  }
});

// Process with debug information
const result = await batchAnalyzer.processBatch(filePaths, {
  enableDebug: true,
  onProgress: (progress) => {
    console.log(`🔄 Processing: ${progress.currentFile} (${progress.completed}/${progress.total})`);
    console.log(`📊 Memory: ${progress.memoryUsage}MB, CPU: ${progress.cpuUsage}%`);
  }
});
```

### Environment-Specific Debug Configuration

#### Development Environment

```typescript
// Optimal debug settings for development
const devAnalyzer = new TypeScriptAnalyzer({
  logLevel: 'debug',
  enableDebugMode: true,
  debugOptions: {
    verboseMode: true,
    enableTimestamps: true,
    enableStackTraces: true,
    logToFile: false,                   // Console output for immediate feedback
    enableMemoryTracking: true,
    enablePerformanceMetrics: true
  }
});
```

#### Testing Environment

```typescript
// Debug settings for testing and CI
const testAnalyzer = new TypeScriptAnalyzer({
  logLevel: 'warn',                     // Reduce noise in tests
  enableDebugMode: true,
  debugOptions: {
    verboseMode: false,
    logToFile: true,                    // File logging for test artifacts
    logFilePath: './test-debug.log',
    enablePerformanceMetrics: true,
    logCacheOperations: false           // Reduce log volume
  }
});
```

#### Production Debugging

```typescript
// Minimal debug settings for production
const prodAnalyzer = new TypeScriptAnalyzer({
  logLevel: 'error',                    // Only log errors
  enableDebugMode: false,               // Disable debug features
  debugOptions: {
    verboseMode: false,
    logToFile: true,
    logFilePath: './prod-errors.log',
    enableStackTraces: true,            // For error diagnosis
    enablePerformanceMetrics: false,    // Reduce overhead
    logMemoryLeaks: true                // Monitor for memory issues
  }
});
```

### Debug Utilities and Tools

#### Debug Helper Usage

```typescript
import { DebugHelper } from 'dependency-linker/api/errors';

const debugHelper = new DebugHelper();

// Trace execution path for complex operations
const result = await debugHelper.traceExecutionPath('batch-analysis', async () => {
  return await batchAnalyzer.processBatch(filePaths);
});

// Generate comprehensive debug report
const debugReport = debugHelper.generateDetailedReport(result);
console.log('📋 Debug Report:', debugReport);
```

#### System Health Monitoring

```typescript
import { DiagnosticTool } from 'dependency-linker/api/errors';

const diagnostics = new DiagnosticTool(analyzer);

// Run comprehensive system diagnostics
const healthReport = await diagnostics.getSystemHealth();
console.log('🏥 System Health:');
healthReport.healthChecks.forEach(check => {
  const status = check.status === 'healthy' ? '✅' : '⚠️';
  console.log(`${status} ${check.component}: ${check.message}`);
});
```

### Debug Mode Best Practices

#### Development Workflow

1. **Enable Verbose Debugging**: Use full debug mode during development
```typescript
process.env.DEBUG = 'true';
const analyzer = new TypeScriptAnalyzer({ logLevel: 'debug', enableDebugMode: true });
```

2. **Monitor Performance**: Track performance during development
```typescript
const result = await analyzer.analyzeFile(filePath, { includeDetailedMetrics: true });
console.log(`⚡ Performance: ${result.metrics.parseTime}ms`);
```

3. **Use Debug Helpers**: Leverage debug utilities for complex issues
```typescript
debugHelper.logAnalysisDetails(result, { verboseMode: true });
```

#### Troubleshooting Workflow

1. **Enable Debug Logging**: Start with comprehensive logging
```typescript
const analyzer = new TypeScriptAnalyzer({
  logLevel: 'debug',
  debugOptions: { verboseMode: true, enableStackTraces: true }
});
```

2. **Analyze Errors**: Use diagnostic tools for error analysis
```typescript
const errorAnalysis = await diagnostics.analyzeError(error, { includeDebugContext: true });
```

3. **Monitor Resources**: Check for resource-related issues
```typescript
const metrics = batchAnalyzer.getResourceMetrics();
console.log(`💾 Memory: ${metrics.memoryUsage.heapUsed}MB`);
```

#### Performance Debugging

1. **Track Bottlenecks**: Identify performance bottlenecks
```typescript
const perfAnalysis = await diagnostics.analyzePerformance(filePath);
console.log(`🐌 Slowest operations: ${perfAnalysis.bottlenecks.join(', ')}`);
```

2. **Monitor Cache Efficiency**: Optimize cache performance
```typescript
const cacheStats = analyzer.getCacheStats();
console.log(`📊 Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
```

3. **Resource Optimization**: Monitor and optimize resource usage
```typescript
const optimization = batchAnalyzer.optimizeMemoryUsage();
console.log(`🚀 Memory freed: ${optimization.memoryFreed}MB`);
```

## 📞 Support and Troubleshooting

For issues and advanced usage:
- **[DEBUGGING.md](../DEBUGGING.md)** - Troubleshooting guide
- **[PERFORMANCE.md](../PERFORMANCE.md)** - Performance optimization
- **[diagnostic-methods.md](diagnostic-methods.md)** - Diagnostic tools and error analysis
- **[cache-management.md](cache-management.md)** - Cache optimization and management
- **[resource-management.md](resource-management.md)** - Resource monitoring and optimization
- **Test files** - Reference implementations and edge cases