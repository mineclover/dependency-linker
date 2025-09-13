# Factory Functions API

Simple function-based API for TypeScript analysis. These functions provide an easy-to-use interface without requiring class instantiation.

## Functions Overview

Based on test analysis from `tests/unit/api/factory-functions.test.ts`, the following functions are available:

### `analyzeTypeScriptFile(filePath, options?)`

**Purpose**: Analyzes a single TypeScript or TSX file

**Test Coverage**:
- Basic file analysis with default options
- Custom analysis options (format, includeSources, parseTimeout)
- Error handling for non-existent files
- Error handling for invalid file types
- Parse timeout scenarios

**Parameters**:
- `filePath: string` - Path to the TypeScript/TSX file
- `options?: AnalysisOptions` - Optional analysis configuration

**Returns**: `Promise<AnalysisResult>`

**Example Usage** (from tests):
```typescript
// Basic usage
const result = await analyzeTypeScriptFile(testFilePath);

// With options
const result = await analyzeTypeScriptFile(testFilePath, {
  format: 'json',
  includeSources: true,
  parseTimeout: 10000
});
```

**Error Scenarios**:
- Throws `FileNotFoundError` when file doesn't exist
- Throws `InvalidFileTypeError` for non-TypeScript files
- Throws `ParseTimeoutError` when parsing exceeds timeout

### `extractDependencies(filePath, options?)`

**Purpose**: Extracts only the dependencies from a TypeScript file

**Test Coverage**:
- Dependency extraction with default options
- Custom extraction options
- Error handling scenarios

**Parameters**:
- `filePath: string` - Path to the TypeScript/TSX file
- `options?: AnalysisOptions` - Optional analysis configuration

**Returns**: `Promise<string[]>` - Array of dependency sources

**Example Usage** (from tests):
```typescript
const dependencies = await extractDependencies(testFilePath);
// Returns: ['fs/promises', 'path', './types']
```

### `getBatchAnalysis(filePaths, options?)`

**Purpose**: Analyzes multiple TypeScript files in batch

**Test Coverage**:
- Batch processing with multiple files
- Concurrency control
- Progress tracking callbacks
- Error handling for individual files
- Mixed success/failure scenarios

**Parameters**:
- `filePaths: string[]` - Array of file paths to analyze
- `options?: BatchAnalysisOptions` - Batch processing configuration

**Returns**: `Promise<BatchResult>`

**Example Usage** (from tests):
```typescript
const results = await getBatchAnalysis([
  testFilePath,
  testFile2Path
], {
  concurrency: 2,
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});
```

### `analyzeDirectory(dirPath, options?)`

**Purpose**: Analyzes all TypeScript files in a directory

**Test Coverage**:
- Directory traversal with file filtering
- Extension filtering (.ts, .tsx)
- Ignore patterns (node_modules, test files)
- Recursive directory processing

**Parameters**:
- `dirPath: string` - Path to directory to analyze
- `options?: DirectoryOptions` - Directory analysis configuration

**Returns**: `Promise<BatchResult>`

**Example Usage** (from tests):
```typescript
const results = await analyzeDirectory(tempDir, {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: ['**/*.test.ts', '**/node_modules/**'],
  recursive: true
});
```

## Configuration Options

### AnalysisOptions

Based on test usage patterns:

```typescript
interface AnalysisOptions {
  format?: 'json' | 'text';           // Output format
  includeSources?: boolean;            // Include source locations
  parseTimeout?: number;               // Parse timeout in ms
}
```

### BatchAnalysisOptions

```typescript
interface BatchAnalysisOptions {
  concurrency?: number;                // Max concurrent analyses
  continueOnError?: boolean;           // Continue on individual file errors
  onProgress?: (completed: number, total: number) => void;  // Progress callback
  onFileError?: (filePath: string, error: Error) => void;   // Error callback
}
```

### DirectoryOptions

```typescript
interface DirectoryOptions {
  extensions?: string[];               // File extensions to include
  ignorePatterns?: string[];           // Glob patterns to ignore
  recursive?: boolean;                 // Recursive directory traversal
}
```

## Error Handling

All factory functions implement comprehensive error handling as validated in tests:

- **FileNotFoundError**: Thrown when specified files don't exist
- **InvalidFileTypeError**: Thrown for non-TypeScript files
- **ParseTimeoutError**: Thrown when parsing exceeds timeout limits
- **BatchError**: Aggregates errors from batch operations

## Performance Characteristics

Based on test validation:

- Single file analysis: < 10ms (typical)
- Batch processing: Configurable concurrency (default: 3)
- Memory efficient: Uses streaming for large batches
- Timeout protection: Configurable parse timeouts

## Cache Management

Factory functions include cache management utilities:

- `clearFactoryCache()`: Clears internal caches
- `resetFactoryAnalyzer()`: Resets the underlying analyzer instance

These are validated in integration tests for memory management scenarios.