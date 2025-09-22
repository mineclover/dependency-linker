# Basic Usage Examples

Clear usage patterns and examples based on real test implementations.

## 🚀 Quick Start Examples

### Simple File Analysis

```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

// Analyze a single TypeScript file
const result = await analyzeTypeScriptFile('./src/component.tsx');

console.log('Dependencies:', result.dependencies);
console.log('Imports:', result.imports);
console.log('Exports:', result.exports);
```

### Class-Based API

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

## 📊 Multi-Language Analysis

Based on integration test implementations:

### TypeScript/TSX Analysis

```typescript
// Analyze React component
const result = await analyzeTypeScriptFile('./components/UserProfile.tsx');

// Extract React dependencies
const reactDeps = result.dependencies.filter(dep =>
  dep.includes('react') || dep.includes('@types/react')
);

console.log('React dependencies:', reactDeps);
```

### JavaScript Analysis

```typescript
// CommonJS modules
const jsResult = await analyzeTypeScriptFile('./server/app.js');

// ES6 modules
const es6Result = await analyzeTypeScriptFile('./client/module.mjs');
```

### Go Package Analysis

```typescript
// Analyze Go files (requires Go parser configuration)
const goResult = await analyzeTypeScriptFile('./services/auth.go');

console.log('Go package:', goResult.extractedData.package);
console.log('Go imports:', goResult.extractedData.imports);
```

### Java Class Analysis

```typescript
// Analyze Java files
const javaResult = await analyzeTypeScriptFile('./data/UserService.java');

console.log('Java package:', javaResult.extractedData.package);
console.log('Java classes:', javaResult.extractedData.classes);
```

## 🔄 Batch Processing

### Simple Batch Analysis

```typescript
import { getBatchAnalysis } from '@context-action/dependency-linker';

const filePaths = [
  './src/components/Header.tsx',
  './src/components/Footer.tsx',
  './src/utils/helpers.ts'
];

const results = await getBatchAnalysis(filePaths, {
  concurrency: 3,
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total} files analyzed`);
  }
});
```

### Advanced Batch Processing

```typescript
import { BatchAnalyzer, TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true,
  memoryLimit: 500 * 1024 * 1024 // 500MB
});

const result = await batchAnalyzer.processBatch(filePaths, {
  onProgress: (progress) => {
    console.log(`Memory usage: ${progress.memoryUsage}MB`);
    console.log(`CPU usage: ${progress.cpuUsage}%`);
  }
});
```

## 🎯 Dependency Extraction

### Extract Only Dependencies

```typescript
import { extractDependencies } from '@context-action/dependency-linker';

// Get just the dependency list
const deps = await extractDependencies('./src/index.ts');
console.log('Dependencies:', deps);
// Output: ['react', 'lodash', './utils', '@mui/material']
```

### Filter Dependencies by Type

```typescript
const result = await analyzeTypeScriptFile('./src/component.tsx');

// External dependencies (npm packages)
const external = result.dependencies.filter(dep =>
  !dep.startsWith('./') && !dep.startsWith('../')
);

// Internal dependencies (relative imports)
const internal = result.dependencies.filter(dep =>
  dep.startsWith('./') || dep.startsWith('../')
);

console.log('External:', external);
console.log('Internal:', internal);
```

## ⚡ Performance Optimization

### Caching Strategy

```typescript
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheTimeout: 3600000, // 1 hour
  maxCacheSize: 1000
});

// First analysis - cache miss
const result1 = await analyzer.analyzeFile('./src/component.tsx');

// Second analysis - cache hit (much faster)
const result2 = await analyzer.analyzeFile('./src/component.tsx');

// Check cache statistics
const stats = analyzer.getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Memory Management

```typescript
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enableResourceMonitoring: true,
  memoryLimit: 500 * 1024 * 1024, // 500MB limit
  adaptiveConcurrency: true
});

// Monitor memory usage during batch processing
const result = await batchAnalyzer.processBatch(filePaths, {
  onProgress: (progress) => {
    if (progress.memoryUsage > 400) { // 400MB threshold
      console.warn('High memory usage detected');
    }
  }
});
```

## 🛠️ Error Handling

### Graceful Error Recovery

```typescript
try {
  const result = await analyzeTypeScriptFile('./src/broken.ts');

  if (result.errors.length > 0) {
    console.log('Parsing errors found:');
    result.errors.forEach(error => {
      console.log(`- ${error.type}: ${error.message} at line ${error.location?.line}`);
    });
  }
} catch (error) {
  console.error('Analysis failed:', error.message);
}
```

### Batch Error Handling

```typescript
const results = await getBatchAnalysis(filePaths, {
  continueOnError: true,
  onFileError: (filePath, error) => {
    console.log(`Failed to analyze ${filePath}: ${error.message}`);
  }
});

// Check for successful vs failed analyses
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Analyzed: ${successful.length}, Failed: ${failed.length}`);
```

## 📈 Output Formatting

### Different Output Formats

```typescript
// JSON format (default)
const jsonResult = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'json'
});

// Compact format
const compactResult = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'compact'
});

// Summary format
const summaryResult = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'summary'
});
```

### Custom Result Processing

```typescript
const result = await analyzeTypeScriptFile('./src/component.tsx');

// Custom dependency analysis
const dependencyAnalysis = {
  total: result.dependencies.length,
  external: result.dependencies.filter(d => !d.startsWith('.')).length,
  internal: result.dependencies.filter(d => d.startsWith('.')).length,
  react: result.dependencies.filter(d => d.includes('react')).length
};

console.log('Dependency Analysis:', dependencyAnalysis);
```

## 🔍 Advanced Analysis

### Source Location Information

```typescript
const result = await analyzeTypeScriptFile('./src/component.tsx', {
  includeSources: true
});

// Access detailed source locations
result.imports.forEach(imp => {
  console.log(`Import "${imp.source}" at line ${imp.location?.line}`);
});

result.exports.forEach(exp => {
  console.log(`Export "${exp.name}" at line ${exp.location?.line}`);
});
```

### Performance Metrics

```typescript
const result = await analyzeTypeScriptFile('./src/large-file.ts', {
  includeMetrics: true
});

console.log('Performance Metrics:');
console.log(`Parse time: ${result.metrics?.parseTime}ms`);
console.log(`Memory usage: ${result.metrics?.memoryUsage}MB`);
console.log(`Total time: ${result.metrics?.totalTime}ms`);
```

## 🧪 Test-Based Examples

All examples above are based on patterns from our **33 comprehensive test suites**:

- **Unit tests**: Individual component validation
- **Integration tests**: Real-world scenarios with multi-language support
- **Contract tests**: API interface validation
- **Performance tests**: Validated performance characteristics

### Example Test Pattern

```typescript
// Based on multi-language-analysis.test.ts
describe('Multi-Language Analysis', () => {
  test('should analyze TypeScript files with imports and exports', async () => {
    const result = await analyzeTypeScriptFile('./sample.tsx');

    expect(result.language).toBe('typescript');
    expect(result.extractedData.imports).toHaveLength(3);
    expect(result.extractedData.exports).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });
});
```

## 💡 Best Practices

1. **Use Caching**: Enable caching for repeated analyses
2. **Monitor Resources**: Use resource monitoring for batch processing
3. **Handle Errors**: Always implement error handling patterns
4. **Optimize Concurrency**: Adjust concurrency based on system resources
5. **Validate Results**: Check for errors and partial results

## 📚 Further Reading

- [API Documentation](../api/README.md) - Comprehensive API reference
- [Performance Guide](../PERFORMANCE.md) - Performance optimization tips
- [Debugging Guide](../DEBUGGING.md) - Troubleshooting and debug mode
- [Test Files](../../tests/) - 33 test suites with real usage patterns