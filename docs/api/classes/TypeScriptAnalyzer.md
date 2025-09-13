# TypeScriptAnalyzer Class API

Main class-based API for TypeScript analysis with dependency injection and advanced configuration options.

## Class Overview

Based on test analysis from `tests/unit/api/ITypeScriptAnalyzer.test.ts`, the TypeScriptAnalyzer class provides:

### Constructor

```typescript
new TypeScriptAnalyzer(options?: AnalyzerOptions)
```

**Test Coverage**:
- Default initialization with no options
- Custom initialization with analyzer options
- Dependency injection scenarios
- Configuration validation

**Parameters**:
- `options?: AnalyzerOptions` - Optional analyzer configuration

### Core Methods

#### `analyzeFile(filePath, options?)`

**Purpose**: Analyzes a single TypeScript/TSX file with full configuration control

**Test Coverage**:
- Basic file analysis with various formats
- Source location inclusion
- Custom timeout configuration
- Cache behavior validation
- Error recovery scenarios

**Parameters**:
- `filePath: string` - Path to TypeScript/TSX file
- `options?: AnalysisOptions` - Analysis configuration

**Returns**: `Promise<AnalysisResult>`

**Example Usage** (from tests):
```typescript
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheSize: 1000,
  defaultTimeout: 30000
});

const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});
```

#### `analyzeSource(sourceCode, options?)`

**Purpose**: Analyzes TypeScript source code directly without file system access

**Test Coverage**:
- In-memory source analysis
- Syntax error handling
- Source location mapping
- Performance optimization

**Parameters**:
- `sourceCode: string` - TypeScript source code
- `options?: SourceAnalysisOptions` - Source analysis configuration

**Returns**: `Promise<AnalysisResult>`

**Example Usage** (from tests):
```typescript
const sourceCode = `
import { readFile } from 'fs/promises';
export const test = 'value';
`;

const result = await analyzer.analyzeSource(sourceCode, {
  fileName: 'virtual.ts',
  includeSources: true
});
```

### Convenience Methods

#### `extractDependencies(filePath)`

**Purpose**: Simplified dependency extraction

**Test Coverage**:
- External dependency identification
- Internal dependency resolution
- Error handling for missing files

**Returns**: `Promise<string[]>`

#### `getImports(filePath)`

**Purpose**: Extracts import statements information

**Test Coverage**:
- Named imports extraction
- Namespace imports handling
- Dynamic import detection

**Returns**: `Promise<ImportInfo[]>`

#### `getExports(filePath)`

**Purpose**: Extracts export statements information

**Test Coverage**:
- Named exports extraction
- Default exports handling
- Re-exports processing

**Returns**: `Promise<ExportInfo[]>`

### Batch Processing Methods

#### `analyzeFiles(filePaths, options?)`

**Purpose**: Analyzes multiple files with class-level configuration

**Test Coverage**:
- Concurrent file processing
- Error aggregation
- Progress tracking
- Resource management

**Parameters**:
- `filePaths: string[]` - Array of file paths
- `options?: BatchAnalysisOptions` - Batch processing options

**Returns**: `Promise<BatchResult>`

**Example Usage** (from tests):
```typescript
const result = await analyzer.analyzeFiles([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 5,
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});
```

## Configuration Options

### AnalyzerOptions

Based on test validation:

```typescript
interface AnalyzerOptions {
  enableCache?: boolean;               // Enable result caching
  cacheSize?: number;                  // Maximum cache entries
  defaultTimeout?: number;             // Default parse timeout (ms)
  logLevel?: LogLevel;                 // Logging verbosity
  maxConcurrency?: number;             // Max concurrent operations
  enableResourceMonitoring?: boolean;  // Resource usage tracking
}
```

### AnalysisOptions

```typescript
interface AnalysisOptions {
  format?: 'json' | 'summary' | 'table' | 'csv';  // Output format
  includeSources?: boolean;                        // Include source locations
  parseTimeout?: number;                           // Override default timeout
  enablePartialResults?: boolean;                  // Return partial results on errors
}
```

### SourceAnalysisOptions

```typescript
interface SourceAnalysisOptions extends AnalysisOptions {
  fileName?: string;                   // Virtual filename for error reporting
  baseDir?: string;                    // Base directory for relative imports
}
```

## State Management Methods

#### `getState()`

**Purpose**: Returns current analyzer state and statistics

**Test Coverage**:
- State information accuracy
- Statistics tracking
- Resource usage monitoring

**Returns**: `AnalyzerState`

#### `clearCache()`

**Purpose**: Clears internal caches to free memory

**Test Coverage**:
- Memory cleanup validation
- Cache invalidation
- Performance impact measurement

#### `dispose()`

**Purpose**: Cleans up resources and prepares for garbage collection

**Test Coverage**:
- Resource cleanup validation
- Memory leak prevention
- Proper disposal sequencing

## Error Handling

The TypeScriptAnalyzer class implements comprehensive error handling:

### Error Types

- **AnalysisError**: Base class for analysis-related errors
- **FileNotFoundError**: File system access errors
- **ParseTimeoutError**: Parser timeout scenarios
- **InvalidFileTypeError**: Unsupported file types
- **ResourceError**: Resource exhaustion scenarios

### Error Recovery

Based on test scenarios:

```typescript
try {
  const result = await analyzer.analyzeFile('./problematic-file.ts');
} catch (error) {
  if (error instanceof ParseTimeoutError) {
    // Retry with longer timeout
    const result = await analyzer.analyzeFile('./problematic-file.ts', {
      parseTimeout: 60000
    });
  } else if (error instanceof FileNotFoundError) {
    // Handle missing file
    console.error(`File not found: ${error.filePath}`);
  }
}
```

## Performance Characteristics

Test-validated performance features:

- **Caching**: Configurable LRU cache for parsed results
- **Concurrency**: Controlled parallel processing
- **Memory Management**: Resource monitoring and limits
- **Timeout Protection**: Configurable parsing timeouts
- **Incremental Analysis**: Reuse of parsed AST nodes

## Integration Patterns

### Dependency Injection

```typescript
// Custom parser injection (from tests)
const analyzer = new TypeScriptAnalyzer({
  customParser: myCustomParser,
  enableCache: false
});
```

### Event Handling

```typescript
// Progress and error callbacks (from tests)
analyzer.on('progress', (completed, total) => {
  console.log(`Analysis progress: ${completed}/${total}`);
});

analyzer.on('error', (filePath, error) => {
  console.error(`Error analyzing ${filePath}:`, error);
});
```

## Thread Safety

The TypeScriptAnalyzer class is designed for single-threaded use but supports:

- Concurrent file analysis within the same instance
- Safe cache access patterns
- Resource limit enforcement
- Proper cleanup on disposal