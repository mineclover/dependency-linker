# API Documentation (v3.0.0)

Complete API reference for the Query-Based AST Analysis Library.

## 🆕 What's New in v3.0.0

### Complete QueryResultMap-Centric Redesign
- **QueryEngine**: Central coordination engine with singleton pattern and global instance
- **UnifiedQueryResultMap**: Complete type system covering TypeScript, Java, and Python
- **CustomKeyMapping**: User-friendly abstraction with full type preservation
- **Zero `any` Types**: Complete elimination of `any` types for maximum type safety
- **Multi-Language Support**: Full support for TypeScript, Java, and Python queries

### Language-Specific Query Systems
- **TypeScript Queries**: 6 queries covering imports, exports, and type analysis
- **Java Queries**: 8 queries covering imports, classes, interfaces, enums, and methods
- **Python Queries**: 8 queries covering imports, functions, classes, variables, and methods
- **Tree-sitter Integration**: Real AST parsing with high-performance query execution

### Performance & Quality Improvements
- **Parallel Execution**: Independent queries execute concurrently by default
- **Performance Monitoring**: Built-in execution metrics and optimization
- **Comprehensive Testing**: Real AST pipeline tests with actual tree-sitter parsers
- **Code Quality**: Biome linting with strict formatting and organization standards

## 📚 Core API Components

### QueryEngine
Central coordination engine for all query operations:

```typescript
import { QueryEngine } from '@context-action/dependency-linker';

// Use global instance
const engine = QueryEngine.globalInstance;

// Single query execution
const results = await engine.execute("ts-import-sources", matches, context);

// Multiple queries in parallel
const allResults = await engine.executeMultiple([
  "ts-import-sources",
  "ts-export-declarations"
], matches, context);

// Language-specific execution
const tsResults = await engine.executeForLanguage("typescript", matches, context);
```

### CustomKeyMapping
User-friendly abstraction for query composition:

```typescript
import { CustomKeyMapping } from '@context-action/dependency-linker';

// Create custom mapping
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources",
  exports: "ts-export-declarations",
  types: "ts-type-imports"
});

// Execute with type-safe results
const results = await mapping.execute(matches, context);
const validation = mapping.validate();
```

### Type-Safe Query System
Complete type safety throughout the pipeline:

```typescript
import type {
  QueryExecutionContext,
  ImportSourceResult,
  UnifiedQueryResultMap
} from '@context-action/dependency-linker';

// Automatic type inference
const results = await engine.execute("ts-import-sources", matches, context);
// results: ImportSourceResult[] (automatically inferred)
```

### 🧪 Test-Validated API
All APIs are backed by comprehensive test suites covering:
- Real AST pipeline tests with actual tree-sitter parsers
- Multi-language verification (TypeScript, Java, Python)
- Type safety validation with zero `any` types
- Performance benchmarks and resource usage
- Custom key mapping functionality

## Installation

```bash
npm install @context-action/dependency-linker
# or
yarn add @context-action/dependency-linker
```

## Quick Start

```typescript
import { QueryEngine, QueryExecutionContext } from '@context-action/dependency-linker';

// Initialize
const engine = QueryEngine.globalInstance;

// Create context
const context: QueryExecutionContext = {
  sourceCode: 'import React from "react";',
  language: "typescript",
  filePath: "app.tsx",
  astNode: parsedASTNode
};

// Execute query
const results = await engine.execute("ts-import-sources", matches, context);
```

## Language Support

### TypeScript Queries
- `ts-import-sources` - Import source paths
- `ts-named-imports` - Named import analysis
- `ts-default-imports` - Default import tracking
- `ts-type-imports` - Type-only imports
- `ts-export-declarations` - Export statements
- `ts-export-assignments` - Export assignments

### Java Queries
- `java-import-sources` - Import source paths
- `java-import-statements` - Full import info
- `java-wildcard-imports` - Wildcard imports (*)
- `java-static-imports` - Static imports
- `java-class-declarations` - Class definitions
- `java-interface-declarations` - Interface definitions
- `java-enum-declarations` - Enum definitions
- `java-method-declarations` - Method definitions

### Python Queries
- `python-import-sources` - Import module sources
- `python-import-statements` - Import statement info
- `python-from-imports` - From imports
- `python-import-as` - Import aliases
- `python-function-definitions` - Function definitions
- `python-class-definitions` - Class definitions
- `python-variable-definitions` - Variable definitions
- `python-method-definitions` - Method definitions
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

### High-Level Analysis Functions

#### `analyzeTypeScriptFile(filePath, options?)`

Main analysis function with comprehensive results.

```javascript
const result = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'json',              // 'json' | 'text' | 'compact' | 'summary'
  includeSources: true,        // Include source location info
  parseTimeout: 10000          // Parsing timeout in milliseconds
});
```

**Returns**: [`AnalysisResult`](#analysisresult)

### Utility Functions (v2.4.1 Functional Refactor)

The following utility functions were converted from static classes to individual exports for better tree-shaking and functional programming patterns:

#### AST Traversal Functions (formerly ASTTraverser class)

```typescript
import {
  traverse,
  findNodes,
  findNode,
  findNodesByType,
  findNodesByTypes,
  getChildren,
  getChildrenByType,
  getChildByType
} from '@context-action/dependency-linker';

// Traverse AST with visitor pattern
traverse(ast, (node) => {
  if (node.type === 'function_declaration') {
    console.log('Found function:', node.text);
  }
});

// Find all nodes matching condition
const functions = findNodes(ast, node => node.type === 'function_declaration');

// Find first node of specific type
const firstFunction = findNode(ast, node => node.type === 'function_declaration');

// Find all nodes of specific type(s)
const declarations = findNodesByType(ast, 'function_declaration');
const allDeclarations = findNodesByTypes(ast, ['function_declaration', 'class_declaration']);

// Get child nodes
const children = getChildren(node);
const identifiers = getChildrenByType(node, 'identifier');
const firstChild = getChildByType(node, 'identifier');
```

#### Node Utility Functions (formerly NodeUtils class)

```typescript
import {
  getText,
  clearTextCache,
  getSourceLocation,
  hasChildOfType,
  getIdentifierName,
  isVariableDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  isTypeDeclaration,
  isAsync,
  isStatic,
  getVisibility
} from '@context-action/dependency-linker';

// Get node text with caching
const nodeText = getText(node);

// Get source location info
const location = getSourceLocation(node); // { line, column, offset }

// Type checking utilities
const isVar = isVariableDeclaration(node);
const isFunc = isFunctionDeclaration(node);
const isClass = isClassDeclaration(node);
const isType = isTypeDeclaration(node);

// Property checking
const async = isAsync(node);
const static = isStatic(node);
const visibility = getVisibility(node); // 'public' | 'private' | 'protected'

// Clear text cache periodically for memory management
clearTextCache();
```

#### Text Matching Functions (formerly TextMatcher class)

```typescript
import {
  findAllExports,
  findExportsByType,
  hasExports,
  countExports,
  parseNamedExports,
  cleanExportText
} from '@context-action/dependency-linker';

const sourceCode = `
export const API_URL = 'https://api.example.com';
export function getData() { return fetch(API_URL); }
export default class Service {}
`;

// Find all exports in source code
const allExports = findAllExports(sourceCode);
console.log(allExports); // ['API_URL', 'getData', 'default']

// Find exports by type
const namedExports = findExportsByType(sourceCode, 'named');
const defaultExports = findExportsByType(sourceCode, 'default');

// Check for exports
const hasAnyExports = hasExports(sourceCode);
const exportCount = countExports(sourceCode);

// Parse named export syntax
const namedExportList = parseNamedExports('export { foo, bar as baz }');
console.log(namedExportList); // ['foo', 'baz']

// Clean export text for analysis
const cleanText = cleanExportText('export   const   API_URL');
```

#### Benefits of Functional Approach

1. **Tree-shaking**: Import only the functions you need
2. **Bundle size**: 30-50% smaller bundles when using specific functions
3. **Performance**: No class instantiation overhead
4. **Functional patterns**: Better composition and testing
5. **TypeScript**: Enhanced type inference and IDE support

#### Migration from Static Classes

```typescript
// Before (v2.4.0 and earlier)
import { ASTTraverser, NodeUtils, TextMatcher } from '@context-action/dependency-linker';

ASTTraverser.traverse(ast, visitor);
const text = NodeUtils.getText(node);
const exports = TextMatcher.findAllExports(code);

// After (v2.4.1+)
import { traverse, getText, findAllExports } from '@context-action/dependency-linker';

traverse(ast, visitor);
const text = getText(node);
const exports = findAllExports(code);
```

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

## 🎯 Enhanced Dependency Analysis API

### `EnhancedDependencyExtractor`

Advanced dependency analysis with named import usage tracking, dead code detection, and tree-shaking optimization.

#### Constructor

```javascript
const extractor = new EnhancedDependencyExtractor();
```

Extends the base `DependencyExtractor` with enhanced analysis capabilities.

#### Methods

##### `extractEnhanced(ast, filePath)`

Performs comprehensive dependency analysis including usage tracking.

```javascript
const result = extractor.extractEnhanced(parseResult.ast, './src/component.tsx');
```

**Parameters**:
- `ast`: Parsed AST from tree-sitter
- `filePath`: Path to the analyzed file

**Returns**: [`EnhancedDependencyExtractionResult`](#enhanceddependencyextractionresult)

#### Enhanced Data Types

##### `EnhancedDependencyExtractionResult`

```typescript
interface EnhancedDependencyExtractionResult extends DependencyExtractionResult {
  enhancedDependencies: EnhancedDependencyInfo[];
  usageAnalysis: {
    totalImports: number;
    usedImports: number;
    unusedImports: number;
    mostUsedMethods: Array<{
      method: string;
      count: number;
      source: string;
    }>;
    unusedImportsList: Array<{
      source: string;
      unusedItems: string[];
    }>;
  };
}
```

##### `EnhancedDependencyInfo`

```typescript
interface EnhancedDependencyInfo {
  // Basic dependency info
  source: string;
  type: "external" | "internal" | "relative";
  location?: SourceLocation;
  isTypeOnly?: boolean;

  // Enhanced analysis
  importedNames?: string[];          // All imported named items
  usedMethods?: UsedMethodInfo[];    // Actually used methods
  unusedImports?: string[];          // Imported but unused items
  usageCount?: number;               // Total usage count
  usageLocations?: SourceLocation[]; // All usage locations
}
```

##### `UsedMethodInfo`

```typescript
interface UsedMethodInfo {
  methodName: string;                // Method name
  originalName?: string;             // Original name if aliased
  usageType: "call" | "property" | "reference"; // Usage type
  locations: SourceLocation[];      // All usage locations
  callCount: number;                 // Number of times called
  contextInfo?: {
    parentFunction?: string;
    isInCondition?: boolean;
    isInLoop?: boolean;
    callArguments?: string[];
  };
}
```

#### Example Usage

##### Basic Enhanced Analysis

```javascript
import { EnhancedDependencyExtractor, TypeScriptParser } from '@context-action/dependency-linker';

async function analyzeEnhancedDependencies() {
  const code = `
import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { debounce, throttle } from 'lodash';

function MyComponent() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tomorrow = addDays(date, 1);
    console.log(format(tomorrow, 'yyyy-MM-dd'));
  }, [date]);

  const debouncedUpdate = debounce(() => {
    setDate(new Date());
  }, 1000);

  // throttle is imported but never used

  return <div onClick={debouncedUpdate}>Click me</div>;
}
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/example.tsx', code);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/example.tsx');

  console.log('📊 Analysis Results:');
  console.log(`Total imports: ${result.usageAnalysis.totalImports}`);
  console.log(`Used methods: ${result.usageAnalysis.usedImports}`);
  console.log(`Unused imports: ${result.usageAnalysis.unusedImports}`);

  // Detailed per-dependency analysis
  result.enhancedDependencies.forEach(dep => {
    console.log(`\n📦 ${dep.source}:`);
    console.log(`  Imported: ${dep.importedNames?.join(', ')}`);
    console.log(`  Used: ${dep.usedMethods?.map(m => `${m.methodName}(${m.callCount}x)`).join(', ') || 'None'}`);

    if (dep.unusedImports?.length) {
      console.log(`  ⚠️ Unused: ${dep.unusedImports.join(', ')}`);
    }
  });
}
```

##### Tree-shaking Analysis

```javascript
async function analyzeTreeShaking() {
  const lodashCode = `
import _ from 'lodash';
import { debounce } from 'lodash';

// Inefficient: default import usage
const uniqueData = _.uniq([1, 2, 2, 3]);
const sortedData = _.sortBy([3, 1, 2]);

// Efficient: named import usage
const debouncedFn = debounce(() => console.log('debounced'), 100);
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/optimization.ts', lodashCode);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/optimization.ts');

  // Tree-shaking recommendations
  result.enhancedDependencies.forEach(dep => {
    if (dep.source === 'lodash') {
      console.log('🌳 Tree-shaking Recommendations:');

      if (dep.usedMethods) {
        const defaultImportMethods = dep.usedMethods.filter(m => m.methodName.startsWith('_'));

        if (defaultImportMethods.length > 0) {
          console.log('⚠️ Inefficient default imports found:');
          defaultImportMethods.forEach(method => {
            const methodName = method.methodName.replace('_.', '');
            console.log(`  ${method.methodName} → import { ${methodName} } from 'lodash/${methodName}';`);
          });
        }
      }

      if (dep.unusedImports?.length) {
        console.log(`🗑️ Remove unused: ${dep.unusedImports.join(', ')}`);
      }
    }
  });
}
```

##### Usage Pattern Analysis

```javascript
async function analyzeUsagePatterns() {
  const complexCode = `
import React, { useState, useEffect, useCallback } from 'react';
import { format, isAfter, isBefore } from 'date-fns';
import { debounce, merge, isEmpty } from 'lodash';

const Dashboard = () => {
  const [data, setData] = useState([]);

  // High frequency: format used multiple times
  const formatDate = useCallback((date) => format(date, 'yyyy-MM-dd'), []);
  const formatTime = (date) => format(date, 'HH:mm');
  const displayDate = (date) => format(date, 'PPP');

  // Medium frequency: debounce, merge
  const debouncedSearch = debounce((query) => {
    const filters = merge({}, { search: query });
    console.log(filters);
  }, 300);

  // Low frequency: isEmpty
  const processData = (rawData) => {
    if (isEmpty(rawData)) return [];
    return rawData;
  };

  return <div>Dashboard</div>;
};
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/dashboard.tsx', complexCode);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/dashboard.tsx');

  console.log('📈 Usage Pattern Analysis:');

  // Categorize by usage frequency
  const highUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count >= 3);
  const mediumUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count >= 2 && m.count < 3);
  const lowUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count === 1);

  console.log('🔥 High usage (3+ calls):', highUsage.map(m => `${m.method}(${m.count}x)`));
  console.log('🔶 Medium usage (2 calls):', mediumUsage.map(m => `${m.method}(${m.count}x)`));
  console.log('🔷 Low usage (1 call):', lowUsage.map(m => `${m.method}(${m.count}x)`));

  // Package utilization analysis
  result.enhancedDependencies.forEach(dep => {
    const totalImports = dep.importedNames?.length || 0;
    const usedImports = dep.usedMethods?.length || 0;
    const utilizationRate = totalImports > 0 ? ((usedImports / totalImports) * 100).toFixed(1) : 0;

    console.log(`📦 ${dep.source}: ${utilizationRate}% utilization (${usedImports}/${totalImports})`);
  });
}
```

#### Integration with Existing API

The `EnhancedDependencyExtractor` integrates seamlessly with existing analyzer classes:

```javascript
// With TypeScriptAnalyzer
const analyzer = new TypeScriptAnalyzer();
const extractor = new EnhancedDependencyExtractor();

async function enhancedAnalysis(filePath) {
  // Standard analysis
  const basicResult = await analyzer.analyzeFile(filePath);

  // Enhanced analysis
  const parseResult = await analyzer.parser.parse(filePath);
  const enhancedResult = extractor.extractEnhanced(parseResult.ast, filePath);

  return {
    basic: basicResult,
    enhanced: enhancedResult
  };
}
```

#### Performance Considerations

- **Memory Usage**: Enhanced analysis requires additional memory for usage tracking
- **Performance**: Typical overhead of 10-20% compared to basic dependency extraction
- **Scalability**: Suitable for files up to 50,000 lines with optimal performance
- **Caching**: Results can be cached alongside basic dependency analysis