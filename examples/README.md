# TypeScript Analyzer API Examples

This directory contains comprehensive examples demonstrating how to use the TypeScript File Analyzer API in various scenarios.

## 📋 Examples Overview

### 1. Basic Usage (`basic-usage.js`)
Simple API usage examples covering:
- Function-based API (`analyzeTypeScriptFile`, `extractDependencies`)
- Class-based API with options
- Error handling patterns
- Different output formats
- Performance monitoring

**Run the example:**
```bash
node examples/basic-usage.js
```

### 2. Batch Processing (`batch-processing.js`)
Advanced batch processing capabilities:
- Simple batch analysis with progress tracking
- Directory scanning and analysis
- Advanced batch processing with resource monitoring
- Different error handling strategies (fail-fast, best-effort, collect-all)
- Performance comparisons between sequential and concurrent processing
- Cancellation support

**Run the example:**
```bash
node examples/batch-processing.js
```

### 3. Webpack Plugin (`webpack-plugin.js`)
Custom Webpack plugin integration:
- Build-time dependency analysis
- Circular dependency detection
- Dependency report generation
- Performance analysis
- Integration with webpack's module system
- Optimization suggestions

**Run the example:**
```bash
node examples/webpack-plugin.js
```

### 4. VS Code Extension (`vscode-extension.js`)
VS Code extension development example:
- Real-time file analysis
- Diagnostic collection integration
- File watcher setup
- Command registration
- Caching for performance
- Workspace analysis
- Extension configuration

**Run the example:**
```bash
node examples/vscode-extension.js
```

## 🚀 Getting Started

1. **Build the project first:**
   ```bash
   npm run build
   ```

2. **Run any example:**
   ```bash
   node examples/<example-name>.js
   ```

3. **Enable debug output:**
   ```bash
   DEBUG=1 node examples/<example-name>.js
   ```

## 📚 API Usage Patterns

### Simple Function API
```javascript
const { analyzeTypeScriptFile, extractDependencies } = require('tree-sitter-analyzer');

// Analyze a single file
const result = await analyzeTypeScriptFile('./src/index.ts');
console.log(result.dependencies);

// Extract dependencies only
const deps = await extractDependencies('./src/index.ts');
console.log(deps); // ['react', 'lodash', './utils']
```

### Class-based API
```javascript
const { TypeScriptAnalyzer } = require('tree-sitter-analyzer');

const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  defaultTimeout: 30000
});

const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});
```

### Batch Processing
```javascript
const { getBatchAnalysis } = require('tree-sitter-analyzer');

const results = await getBatchAnalysis([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});
```

### Advanced Batch Processing
```javascript
const { TypeScriptAnalyzer } = require('tree-sitter-analyzer');
const { BatchAnalyzer } = require('tree-sitter-analyzer/dist/api/BatchAnalyzer');

const analyzer = new TypeScriptAnalyzer();
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true
});

const result = await batchAnalyzer.processBatch(filePaths, {
  continueOnError: true,
  onProgress: (completed, total) => console.log(`${completed}/${total}`)
});
```

## 🛠️ Integration Examples

### Build Tool Integration

The examples show how to integrate the analyzer with popular build tools:

- **Webpack**: Custom plugin for build-time analysis
- **Rollup**: Similar pattern to Webpack plugin
- **Vite**: Integration with Vite's plugin system
- **ESBuild**: Custom plugin development

### Editor Integration

The VS Code extension example demonstrates:

- Real-time analysis as you type
- Diagnostic collection for showing issues
- Command palette integration
- File watcher patterns
- Configuration management

### CI/CD Integration

```javascript
// Example CI/CD usage
const { analyzeDirectory } = require('tree-sitter-analyzer');

const results = await analyzeDirectory('./src', {
  ignorePatterns: ['**/*.test.ts', '**/node_modules/**']
});

// Fail CI if circular dependencies found
const circularDeps = detectCircularDependencies(results);
if (circularDeps.length > 0) {
  console.error('Circular dependencies detected:', circularDeps);
  process.exit(1);
}
```

## 📊 Performance Considerations

### Caching

The API includes sophisticated caching:

```javascript
const { CacheManager } = require('tree-sitter-analyzer/dist/api/cache/CacheManager');

const cacheManager = new CacheManager({
  enableMemoryCache: true,
  enableFileCache: true,
  maxSize: 1000
});

// Use with analyzer for optimal performance
const analyzer = new TypeScriptAnalyzer({
  enableCache: false // Use external cache manager instead
});
```

### Batch Processing Optimization

- Use appropriate concurrency levels (typically 3-5)
- Enable resource monitoring for large batches
- Choose the right error handling strategy
- Consider memory limits for very large projects

### Memory Management

```javascript
// Good practices
const analyzer = new TypeScriptAnalyzer();

try {
  // Perform analysis
  const result = await analyzer.analyzeFile(filePath);
  // Process result
} finally {
  // Clean up resources
  analyzer.clearCache();
}
```

## 🔧 Configuration Options

### Analyzer Options

```javascript
const options = {
  enableCache: true,           // Enable internal caching
  cacheSize: 1000,            // Maximum cache entries
  defaultTimeout: 30000,       // Default parse timeout (ms)
  logLevel: 'INFO'            // Logging level
};
```

### Analysis Options

```javascript
const analysisOptions = {
  format: 'json',             // Output format
  includeSources: false,      // Include source locations
  parseTimeout: 15000,        // Parse timeout for this operation
  includeTypeImports: true    // Include type-only imports
};
```

### Batch Options

```javascript
const batchOptions = {
  concurrency: 5,             // Max concurrent operations
  continueOnError: true,      // Don't stop on first error
  failFast: false,           // Stop on first error
  onProgress: (completed, total) => {},  // Progress callback
  onFileError: (file, error) => {},      // Error callback
  onFileComplete: (file, result) => {}   // Completion callback
};
```

## 🚨 Error Handling

The API provides structured error handling:

```javascript
try {
  const result = await analyzer.analyzeFile(filePath);
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    console.error('File does not exist');
  } else if (error.code === 'PARSE_TIMEOUT') {
    console.error('Parsing took too long');
  } else if (error.code === 'INVALID_FILE_TYPE') {
    console.error('Not a TypeScript file');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## 📈 Monitoring and Debugging

### Performance Monitoring

```javascript
const startTime = Date.now();
const result = await analyzer.analyzeFile(filePath);
const duration = Date.now() - startTime;

console.log(`Analysis completed in ${duration}ms`);
console.log(`Parse time: ${result.parseTime}ms`);
```

### Resource Monitoring

```javascript
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enableResourceMonitoring: true
});

const metrics = batchAnalyzer.getResourceMetrics();
console.log(`Memory usage: ${metrics.memoryUsage}MB`);
console.log(`Active operations: ${metrics.activeOperations}`);
```

### Debug Output

Set the `DEBUG` environment variable to enable verbose logging:

```bash
DEBUG=1 node your-script.js
```

## 🤝 Contributing

When adding new examples:

1. Follow the existing pattern with clear comments
2. Include error handling and cleanup
3. Add performance monitoring where appropriate
4. Update this README with the new example
5. Test the example works with the current API

## 📄 License

These examples are part of the TypeScript File Analyzer project and are subject to the same MIT license.