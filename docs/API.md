# API Documentation

Complete API reference for programmatic usage of the TypeScript Dependency Linker.

## 📚 Detailed Documentation

This document provides a quick overview. For comprehensive API documentation with test-driven specifications, see the **[api/](api/)** directory:

- **[Factory Functions](api/functions/factory-functions.md)** - Simple function-based API
- **[TypeScriptAnalyzer Class](api/classes/TypeScriptAnalyzer.md)** - Full-featured analyzer class  
- **[BatchAnalyzer Class](api/classes/BatchAnalyzer.md)** - Enterprise batch processing
- **[Core Interfaces](api/core/interfaces.md)** - System interfaces and contracts
- **[API Index](api/README.md)** - Complete API documentation index

## Installation

```bash
npm install @context-action/dependency-linker
# or
npm run build  # for local development
```

## Quick Start

```javascript
const { analyzeTypeScriptFile, TypeScriptAnalyzer } = require('@context-action/dependency-linker');

// Simple function API
const result = await analyzeTypeScriptFile('./src/component.tsx');
console.log(result.dependencies);

// Class-based API  
const analyzer = new TypeScriptAnalyzer();
const result = await analyzer.analyzeFile('./src/component.tsx');
analyzer.clearCache();
```

## Function-Based API

For detailed documentation with test coverage and examples, see **[Factory Functions API](api/functions/factory-functions.md)**.

### `analyzeTypeScriptFile(filePath, options?)`

Main analysis function with comprehensive results.

```javascript
const result = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'json',              // 'json' | 'text' | 'compact' | 'summary'
  includeSources: true,        // Include source location info
  parseTimeout: 10000          // Parsing timeout in milliseconds
});
```

**Returns**: [`AnalysisResult`](#analysisresult)

### `extractDependencies(filePath, options?)`

Extract only dependency information.

```javascript
const deps = await extractDependencies('./src/index.ts');
// Returns: ['react', 'lodash', './utils', '@mui/material']
```

**Returns**: `string[]`

### `getBatchAnalysis(filePaths, options?)`

Analyze multiple files with concurrency control.

```javascript
const results = await getBatchAnalysis([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 3,
  continueOnError: true,
  onProgress: (completed, total) => console.log(`${completed}/${total}`),
  onFileError: (filePath, error) => console.log(`Error: ${filePath}`)
});
```

**Returns**: [`BatchResult`](#batchresult)

### `analyzeDirectory(dirPath, options?)`

Analyze an entire directory tree.

```javascript
const results = await analyzeDirectory('./src', {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: ['**/*.test.ts', '**/node_modules/**'],
  recursive: true,
  maxFiles: 1000
});
```

**Returns**: [`BatchResult`](#batchresult)

## Class-Based API

### `TypeScriptAnalyzer`

Advanced analyzer with caching and batch processing capabilities.

```javascript
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,           // Enable result caching
  cacheSize: 1000,            // Maximum cache entries
  defaultTimeout: 30000        // Default parsing timeout
});
```

#### Methods

##### `analyzeFile(filePath, options?)`

Analyze a single file with caching.

```javascript
const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});
```

##### `extractDependencies(filePath, options?)`

Extract dependencies with caching.

```javascript
const deps = await analyzer.extractDependencies('./src/index.ts');
```

##### `getImports(filePath, options?)`

Extract only import information.

```javascript
const imports = await analyzer.getImports('./src/index.ts');
```

##### `getExports(filePath, options?)`

Extract only export information.

```javascript
const exports = await analyzer.getExports('./src/index.ts');
```

##### `analyzeFiles(filePaths, options?)`

Batch analyze with intelligent caching.

```javascript
const results = await analyzer.analyzeFiles([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 5,
  continueOnError: true,
  useCache: true
});
```

##### `clearCache()`

Clear analysis cache.

```javascript
analyzer.clearCache();
```

## Advanced Batch Processing

### `BatchAnalyzer`

High-performance batch processing with resource monitoring.

```javascript
const { BatchAnalyzer } = require('dependency-linker/dist/api/BatchAnalyzer');

const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,              // Max concurrent operations
  enableResourceMonitoring: true, // Monitor memory/CPU usage
  memoryLimit: 512,               // Memory limit in MB
  adaptiveConcurrency: true       // Auto-adjust concurrency
});

const result = await batchAnalyzer.processBatch(filePaths, {
  continueOnError: true,
  failFast: false,
  onProgress: (completed, total) => console.log(`Progress: ${completed}/${total}`),
  onFileComplete: (filePath, result) => console.log(`Completed: ${filePath}`),
  onFileError: (filePath, error) => console.log(`Error: ${filePath}`)
});

// Get resource metrics
const metrics = batchAnalyzer.getResourceMetrics();
console.log('Memory usage:', metrics.memoryUsage, 'MB');

// Clean up
batchAnalyzer.dispose();
```

## Task Management API (`TaskAPI`)

The Task Management API provides a comprehensive system for programmatically defining, tracking, and executing complex development workflows. It is designed based on the specifications in `specs/tasks.md` and allows for sophisticated task management directly within your codebase.

### Quick Start

```javascript
import { TaskAPI } from 'dependency-linker/task';

const taskApi = new TaskAPI();

async function setupProject() {
  // Create a new task
  const task = await taskApi.createTask({
    title: 'Setup initial project structure',
    description: 'Create necessary folders and configuration files.',
    priority: 'High',
    complexity: 'Simple',
    // ... other task properties
  });

  // Start the task
  await taskApi.startTask(task.id);

  // ... perform actions ...

  // Complete the task
  await taskApi.completeTask(task.id);

  // Get project statistics
  const stats = await taskApi.getStatistics();
  console.log(`Total tasks: ${stats.totalTasks}`);
}

setupProject();
```

### `TaskAPI` Class

The main entry point for all task-related operations.

#### `new TaskAPI(config?)`

Creates a new `TaskAPI` instance.

```javascript
const taskApi = new TaskAPI({
  enableValidation: true,
  autoSave: true,
  resourceLimits: {
    maxConcurrentTasks: 5,
  },
});
```

**Configuration (`TaskAPIConfig`)**:

-   `persistencePath` (string): Path to store task data.
-   `autoSave` (boolean): Automatically save state changes.
-   `enableValidation` (boolean): Enable automatic validation of tasks and transitions.
-   `resourceLimits` (object): Configure resource usage limits.

### Core Methods

#### Task CRUD

-   `createTask(taskData, options?)`: Creates a new task.
-   `getTask(taskId)`: Retrieves a task by its ID.
-   `updateTask(taskId, updates)`: Updates a task's properties.
-   `deleteTask(taskId)`: Deletes a task.
-   `getTasks(options?)`: Queries for tasks with filtering and sorting.

#### Task Execution

-   `startTask(taskId, context?)`: Starts a task's execution.
-   `completeTask(taskId, validationResults?)`: Marks a task as complete.
-   `cancelTask(taskId, reason?)`: Cancels a task.
-   `blockTask(taskId, reason?)`: Blocks a task.
-   `unblockTask(taskId)`: Unblocks a task.

#### Dependency Management

-   `addDependency(taskId, dependencyTaskId, type?)`: Adds a dependency between two tasks.
-   `removeDependency(taskId, dependencyTaskId)`: Removes a dependency.
-   `getDependencies(taskId)`: Gets all dependencies for a task.
-   `canStartTask(taskId)`: Checks if a task's dependencies are met.

#### Batch Operations

-   `createBatch(batchData)`: Creates a batch of tasks.
-   `executeBatch(batchId, maxConcurrency?)`: Executes a batch of tasks.
-   `getBatchProgress(batchId)`: Gets the progress of a batch execution.

#### Analytics and Statistics

-   `getStatistics()`: Retrieves statistics for all tasks.
-   `getCriticalPath()`: Identifies the critical path in the task graph.
-   `getParallelizableTasks()`: Gets tasks that can be run in parallel.
-   `estimateCompletionTime()`: Estimates the total time to complete all tasks.

### Key Data Types

-   `Task`: The core task object, containing all information about a task.
-   `TaskBatch`: A collection of tasks to be executed together.
-   `TaskExecutionResult`: The result of a task's execution.
-   `TaskStatistics`: An object containing various metrics about the tasks.

(For detailed type information, refer to `src/task/types.ts`)

## Data Types

### `AnalysisResult`

```typescript
interface AnalysisResult {
  filePath: string;
  success: boolean;
  parseTime: number;              // Milliseconds
  dependencies: DependencyInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### `DependencyInfo`

```typescript
interface DependencyInfo {
  source: string;                 // Import source
  type: 'external' | 'internal' | 'relative';
  location: SourceLocation;
  isNodeBuiltin: boolean;
  isScopedPackage: boolean;
  packageName: string;
}
```

### `ImportInfo`

```typescript
interface ImportInfo {
  source: string;
  specifiers: Array<{
    type: 'default' | 'named' | 'namespace';
    imported: string;
    local: string;
  }>;
  location: SourceLocation;
  isTypeOnly: boolean;
}
```

### `ExportInfo`

```typescript
interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  location: SourceLocation;
  isTypeOnly: boolean;
}
```

### `SourceLocation`

```typescript
interface SourceLocation {
  line: number;                   // 1-based line number
  column: number;                 // 0-based column number
  offset: number;                 // Character offset from start
}
```

### `BatchResult`

```typescript
interface BatchResult {
  results: AnalysisResult[];
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalDependencies: number;
    totalImports: number;
    totalExports: number;
    averageTime: number;          // Milliseconds
  };
  errors: Array<{
    filePath: string;
    code: string;
    message: string;
    details?: any;
  }>;
  totalTime: number;              // Milliseconds
}
```

## Error Handling

All API functions handle errors gracefully and return structured error information.

### Common Error Codes

-   `FILE_NOT_FOUND`: File does not exist
-   `PARSE_ERROR`: TypeScript parsing failed
-   `TIMEOUT`: Parsing exceeded timeout limit
-   `ACCESS_DENIED`: Insufficient file permissions
-   `INVALID_FORMAT`: Unsupported file format

### Example Error Handling

```javascript
try {
  const result = await analyzeTypeScriptFile('./src/invalid.ts');
  if (!result.success) {
    console.error(`Analysis failed: ${result.error?.message}`);
    console.error(`Error code: ${result.error?.code}`);
  }
} catch (error) {
  console.error('Unexpected error:', error.message);
}
```

## Performance Guidelines

### Memory Optimization

-   Use `clearCache()` periodically for long-running processes
-   Set appropriate `cacheSize` limits
-   Monitor memory usage with `getResourceMetrics()`

### Concurrency Control

-   Start with `concurrency: 3-5` for most systems
-   Use `adaptiveConcurrency: true` for automatic optimization
-   Monitor resource usage and adjust accordingly

### Large File Handling

-   Increase `parseTimeout` for large files (>10,000 lines)
-   Consider breaking large files into smaller modules
-   Use `continueOnError: true` for batch operations

## Integration Examples

### Webpack Plugin

```javascript
class DependencyAnalysisPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('DependencyAnalysisPlugin', async (compilation) => {
      const analyzer = new TypeScriptAnalyzer();
      const result = await analyzer.analyzeFile('./src/index.ts');
      const externalDeps = result.dependencies.filter(d => d.type === 'external');
      console.log('External dependencies:', externalDeps.map(d => d.source));
      analyzer.clearCache();
    });
  }
}
```

### Build Script Integration

```javascript
const { analyzeDirectory } = require('dependency-linker');

async function analyzeBuild() {
  const results = await analyzeDirectory('./src', {
    extensions: ['.ts', '.tsx'],
    ignorePatterns: ['**/*.test.ts']
  });
  
  console.log(`Analyzed ${results.summary.totalFiles} files`);
  console.log(`Found ${results.summary.totalDependencies} dependencies`);
  
  // Extract all external dependencies
  const allDeps = new Set();
  results.results.forEach(result => {
    result.dependencies
      .filter(dep => dep.type === 'external')
      .forEach(dep => allDeps.add(dep.source));
  });
  
  console.log('External dependencies:', Array.from(allDeps).sort());
}

analyzeBuild().catch(console.error);
```

## CLI Bridge

For CLI-like usage in Node.js:

```javascript
const { execSync } = require('child_process');

function analyzeFileSync(filePath, format = 'json') {
  try {
    const output = execSync(`./analyze-file "${filePath}" --format ${format}`, {
      encoding: 'utf8'
    });
    return format === 'json' ? JSON.parse(output) : output;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

const result = analyzeFileSync('./src/index.ts');
console.log(result.dependencies);
```
```

**Returns**: [`AnalysisResult`](#analysisresult)

### `extractDependencies(filePath, options?)`

Extract only dependency information.

```javascript
const deps = await extractDependencies('./src/index.ts');
// Returns: ['react', 'lodash', './utils', '@mui/material']
```

**Returns**: `string[]`

### `getBatchAnalysis(filePaths, options?)`

Analyze multiple files with concurrency control.

```javascript
const results = await getBatchAnalysis([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 3,
  continueOnError: true,
  onProgress: (completed, total) => console.log(`${completed}/${total}`),
  onFileError: (filePath, error) => console.log(`Error: ${filePath}`)
});
```

**Returns**: [`BatchResult`](#batchresult)

### `analyzeDirectory(dirPath, options?)`

Analyze an entire directory tree.

```javascript
const results = await analyzeDirectory('./src', {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: ['**/*.test.ts', '**/node_modules/**'],
  recursive: true,
  maxFiles: 1000
});
```

**Returns**: [`BatchResult`](#batchresult)

## Class-Based API

### `TypeScriptAnalyzer`

Advanced analyzer with caching and batch processing capabilities.

```javascript
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,           // Enable result caching
  cacheSize: 1000,            // Maximum cache entries
  defaultTimeout: 30000        // Default parsing timeout
});
```

#### Methods

##### `analyzeFile(filePath, options?)`

Analyze a single file with caching.

```javascript
const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});
```

##### `extractDependencies(filePath, options?)`

Extract dependencies with caching.

```javascript
const deps = await analyzer.extractDependencies('./src/index.ts');
```

##### `getImports(filePath, options?)`

Extract only import information.

```javascript
const imports = await analyzer.getImports('./src/index.ts');
```

##### `getExports(filePath, options?)`

Extract only export information.

```javascript
const exports = await analyzer.getExports('./src/index.ts');
```

##### `analyzeFiles(filePaths, options?)`

Batch analyze with intelligent caching.

```javascript
const results = await analyzer.analyzeFiles([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 5,
  continueOnError: true,
  useCache: true
});
```

##### `clearCache()`

Clear analysis cache.

```javascript
analyzer.clearCache();
```

## Advanced Batch Processing

### `BatchAnalyzer`

High-performance batch processing with resource monitoring.

```javascript
const { BatchAnalyzer } = require('tree-sitter-analyzer/dist/api/BatchAnalyzer');

const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,              // Max concurrent operations
  enableResourceMonitoring: true, // Monitor memory/CPU usage
  memoryLimit: 512,               // Memory limit in MB
  adaptiveConcurrency: true       // Auto-adjust concurrency
});

const result = await batchAnalyzer.processBatch(filePaths, {
  continueOnError: true,
  failFast: false,
  onProgress: (completed, total) => console.log(`Progress: ${completed}/${total}`),
  onFileComplete: (filePath, result) => console.log(`Completed: ${filePath}`),
  onFileError: (filePath, error) => console.log(`Error: ${filePath}`)
});

// Get resource metrics
const metrics = batchAnalyzer.getResourceMetrics();
console.log('Memory usage:', metrics.memoryUsage, 'MB');

// Clean up
batchAnalyzer.dispose();
```

## Data Types

### `AnalysisResult`

```typescript
interface AnalysisResult {
  filePath: string;
  success: boolean;
  parseTime: number;              // Milliseconds
  dependencies: DependencyInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### `DependencyInfo`

```typescript
interface DependencyInfo {
  source: string;                 // Import source
  type: 'external' | 'internal' | 'relative';
  location: SourceLocation;
  isNodeBuiltin: boolean;
  isScopedPackage: boolean;
  packageName: string;
}
```

### `ImportInfo`

```typescript
interface ImportInfo {
  source: string;
  specifiers: Array<{
    type: 'default' | 'named' | 'namespace';
    imported: string;
    local: string;
  }>;
  location: SourceLocation;
  isTypeOnly: boolean;
}
```

### `ExportInfo`

```typescript
interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  location: SourceLocation;
  isTypeOnly: boolean;
}
```

### `SourceLocation`

```typescript
interface SourceLocation {
  line: number;                   // 1-based line number
  column: number;                 // 0-based column number
  offset: number;                 // Character offset from start
}
```

### `BatchResult`

```typescript
interface BatchResult {
  results: AnalysisResult[];
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalDependencies: number;
    totalImports: number;
    totalExports: number;
    averageTime: number;          // Milliseconds
  };
  errors: Array<{
    filePath: string;
    code: string;
    message: string;
    details?: any;
  }>;
  totalTime: number;              // Milliseconds
}
```

## Error Handling

All API functions handle errors gracefully and return structured error information.

### Common Error Codes

- `FILE_NOT_FOUND`: File does not exist
- `PARSE_ERROR`: TypeScript parsing failed
- `TIMEOUT`: Parsing exceeded timeout limit
- `ACCESS_DENIED`: Insufficient file permissions
- `INVALID_FORMAT`: Unsupported file format

### Example Error Handling

```javascript
try {
  const result = await analyzeTypeScriptFile('./src/invalid.ts');
  if (!result.success) {
    console.error(`Analysis failed: ${result.error?.message}`);
    console.error(`Error code: ${result.error?.code}`);
  }
} catch (error) {
  console.error('Unexpected error:', error.message);
}
```

## Performance Guidelines

### Memory Optimization

- Use `clearCache()` periodically for long-running processes
- Set appropriate `cacheSize` limits
- Monitor memory usage with `getResourceMetrics()`

### Concurrency Control

- Start with `concurrency: 3-5` for most systems
- Use `adaptiveConcurrency: true` for automatic optimization
- Monitor resource usage and adjust accordingly

### Large File Handling

- Increase `parseTimeout` for large files (>10,000 lines)
- Consider breaking large files into smaller modules
- Use `continueOnError: true` for batch operations

## Integration Examples

### Webpack Plugin

```javascript
class DependencyAnalysisPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('DependencyAnalysisPlugin', async (compilation) => {
      const analyzer = new TypeScriptAnalyzer();
      const result = await analyzer.analyzeFile('./src/index.ts');
      const externalDeps = result.dependencies.filter(d => d.type === 'external');
      console.log('External dependencies:', externalDeps.map(d => d.source));
      analyzer.clearCache();
    });
  }
}
```

### Build Script Integration

```javascript
const { analyzeDirectory } = require('tree-sitter-analyzer');

async function analyzeBuild() {
  const results = await analyzeDirectory('./src', {
    extensions: ['.ts', '.tsx'],
    ignorePatterns: ['**/*.test.ts']
  });
  
  console.log(`Analyzed ${results.summary.totalFiles} files`);
  console.log(`Found ${results.summary.totalDependencies} dependencies`);
  
  // Extract all external dependencies
  const allDeps = new Set();
  results.results.forEach(result => {
    result.dependencies
      .filter(dep => dep.type === 'external')
      .forEach(dep => allDeps.add(dep.source));
  });
  
  console.log('External dependencies:', Array.from(allDeps).sort());
}

analyzeBuild().catch(console.error);
```

## CLI Bridge

For CLI-like usage in Node.js:

```javascript
const { execSync } = require('child_process');

function analyzeFileSync(filePath, format = 'json') {
  try {
    const output = execSync(`./analyze-file "${filePath}" --format ${format}`, {
      encoding: 'utf8'
    });
    return format === 'json' ? JSON.parse(output) : output;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

const result = analyzeFileSync('./src/index.ts');
console.log(result.dependencies);
```