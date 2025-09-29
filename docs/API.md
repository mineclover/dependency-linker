# API Documentation

Complete API reference for the Multi-Language Dependency Linker with CustomKeyMapper system.

## 📚 Table of Contents

- [Core Analysis API](#core-analysis-api)
- [CustomKeyMapper API](#customkeymapper-api)
- [Query Engine API](#query-engine-api)
- [Tree-sitter Integration](#tree-sitter-integration)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)

---

## Core Analysis API

### High-Level Analysis Functions

#### `analyzeFile(sourceCode, language, filePath?, options?)`

General file analysis function that works with any supported language.

```typescript
async function analyzeFile(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string,
  options?: AnalysisOptions
): Promise<AnalysisResult>
```

**Parameters:**
- `sourceCode`: The source code to analyze
- `language`: Target language (`"typescript"`, `"tsx"`, `"javascript"`, `"jsx"`, `"java"`, `"python"`)
- `filePath`: Optional file path for context (default: `"unknown"`)
- `options`: Optional analysis configuration

**Returns:** Complete analysis result with query results, performance metrics, and optional custom mapping results.

**Example:**
```typescript
import { analyzeFile } from '@context-action/dependency-linker';

const result = await analyzeFile(`
import React from 'react';
export const App = () => <div>Hello</div>;
`, "tsx", "App.tsx");

console.log(result.queryResults);        // All query results
console.log(result.performanceMetrics); // Execution timing
console.log(result.parseMetadata);      // AST parsing info
```

#### `analyzeTypeScriptFile(sourceCode, filePath?, options?)`

TypeScript-specific analysis with automatic language detection (.ts vs .tsx).

```typescript
async function analyzeTypeScriptFile(
  sourceCode: string,
  filePath?: string,
  options?: Omit<AnalysisOptions, 'language'>
): Promise<AnalysisResult>
```

**Auto-detection:**
- Files ending with `.tsx` → `"tsx"` language
- All others → `"typescript"` language

**Example:**
```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const result = await analyzeTypeScriptFile(`
import type { User } from './types';
import { ApiClient } from '@/lib/api';
export const UserService = new ApiClient();
`, "UserService.tsx");

// Automatically uses 'tsx' language due to .tsx extension
```

#### `analyzeJavaScriptFile(sourceCode, filePath?, options?)`

JavaScript-specific analysis with JSX support detection.

```typescript
async function analyzeJavaScriptFile(
  sourceCode: string,
  filePath?: string,
  options?: Omit<AnalysisOptions, 'language'>
): Promise<AnalysisResult>
```

#### `analyzeJavaFile(sourceCode, filePath?, options?)`

Java-specific analysis optimized for Java language patterns.

```typescript
async function analyzeJavaFile(
  sourceCode: string,
  filePath?: string,
  options?: Omit<AnalysisOptions, 'language'>
): Promise<AnalysisResult>
```

#### `analyzePythonFile(sourceCode, filePath?, options?)`

Python-specific analysis optimized for Python language patterns.

```typescript
async function analyzePythonFile(
  sourceCode: string,
  filePath?: string,
  options?: Omit<AnalysisOptions, 'language'>
): Promise<AnalysisResult>
```

### Specialized Analysis Functions

#### `analyzeImports(sourceCode, language, filePath?)`

Focused import analysis with detailed breakdown.

```typescript
async function analyzeImports(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string
): Promise<{
  sources: QueryResult<QueryKey>[];
  named: QueryResult<QueryKey>[];
  defaults: QueryResult<QueryKey>[];
  types?: QueryResult<QueryKey>[];  // TypeScript only
}>
```

**Returns:**
- `sources`: Import source paths (`'react'`, `'./utils'`)
- `named`: Named imports (`{ useState, useEffect }`)
- `defaults`: Default imports (`React`, `Component`)
- `types`: Type-only imports (TypeScript/TSX only)

**Example:**
```typescript
import { analyzeImports } from '@context-action/dependency-linker';

const imports = await analyzeImports(`
import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { ApiClient } from '@/lib/api';
`, "tsx", "Component.tsx");

console.log(`Found ${imports.sources.length} import sources`);
console.log(`Found ${imports.named.length} named imports`);
console.log(`Found ${imports.types?.length || 0} type imports`);
```

#### `analyzeDependencies(sourceCode, language, filePath?)`

Dependency classification into internal, external, and builtin modules.

```typescript
async function analyzeDependencies(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string
): Promise<{
  internal: string[];   // Relative path imports
  external: string[];   // npm packages
  builtin: string[];    // Node.js built-ins
}>
```

**Classification Rules:**
- **Internal**: Starts with `./` or `../`
- **External**: npm packages (doesn't start with `./` or `../`, not builtin)
- **Builtin**: Node.js built-in modules (`fs`, `path`, `os`, etc.)

**Example:**
```typescript
import { analyzeDependencies } from '@context-action/dependency-linker';

const deps = await analyzeDependencies(`
import fs from 'fs';
import axios from 'axios';
import { utils } from './utils';
import { Config } from '../config';
`, "typescript");

console.log('Internal:', deps.internal);  // ['./utils', '../config']
console.log('External:', deps.external);  // ['axios']
console.log('Builtin:', deps.builtin);    // ['fs']
```

---

## CustomKeyMapper API

### Core Functions

#### `createCustomKeyMapper(mapping)`

Creates a new CustomKeyMapper instance with user-defined key mappings.

```typescript
function createCustomKeyMapper<T extends CustomKeyMapping>(
  mapping: T
): CustomKeyMapper<T>
```

**Parameters:**
- `mapping`: Object mapping user-friendly keys to actual query keys

**Returns:** CustomKeyMapper instance with validation and execution methods

**Example:**
```typescript
import { createCustomKeyMapper } from '@context-action/dependency-linker';

const mapper = createCustomKeyMapper({
  "모든_임포트": "ts-import-sources",
  "네임드_임포트": "ts-named-imports",
  "타입_임포트": "ts-type-imports"
});
```

### CustomKeyMapper Methods

#### `mapper.validate()`

Validates the mapping against currently registered queries.

```typescript
validate(): ValidationResult
```

**Returns:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validKeys: string[];
  invalidKeys: string[];
}
```

**Example:**
```typescript
const validation = mapper.validate();
if (!validation.isValid) {
  console.error('Invalid mappings:', validation.errors);
  console.log('Valid keys:', validation.validKeys);
}
```

#### `mapper.getUserKeys()`

Returns array of user-defined keys.

```typescript
getUserKeys(): string[]
```

#### `mapper.getQueryKeys()`

Returns array of mapped query keys.

```typescript
getQueryKeys(): QueryKey[]
```

#### `mapper.execute(matches, context)`

Executes all mapped queries and returns results with user-friendly keys.

```typescript
async execute(
  matches: QueryMatch[],
  context: QueryExecutionContext
): Promise<Record<string, QueryResult<QueryKey>[]>>
```

#### `mapper.executeConditional(conditions, matches, context)`

Executes only queries where the corresponding condition is `true`.

```typescript
async executeConditional(
  conditions: Record<string, boolean>,
  matches: QueryMatch[],
  context: QueryExecutionContext
): Promise<Record<string, QueryResult<QueryKey>[]>>
```

**Example:**
```typescript
const conditions = {
  "모든_임포트": true,     // Execute
  "네임드_임포트": true,   // Execute
  "타입_임포트": false     // Skip
};

const results = await mapper.executeConditional(conditions, matches, context);
// Only contains results for "모든_임포트" and "네임드_임포트"
```

### Predefined Mappings

#### `predefinedCustomMappings`

Pre-configured mappings for common analysis scenarios.

```typescript
export const predefinedCustomMappings = {
  typeScriptAnalysis: {
    "sources": "ts-import-sources",
    "namedImports": "ts-named-imports",
    "defaultImports": "ts-default-imports",
    "typeImports": "ts-type-imports",
    "exports": "ts-export-declarations",
    "assignments": "ts-export-assignments"
  },

  reactAnalysis: {
    "hooks": "ts-named-imports",
    "components": "ts-default-imports",
    "exports": "ts-export-declarations"
  },

  generalAnalysis: {
    "imports": "ts-import-sources",
    "exports": "ts-export-declarations"
  }
} as const;
```

**Usage:**
```typescript
import { predefinedCustomMappings, createCustomKeyMapper } from '@context-action/dependency-linker';

const tsMapper = createCustomKeyMapper(predefinedCustomMappings.typeScriptAnalysis);
const reactMapper = createCustomKeyMapper(predefinedCustomMappings.reactAnalysis);
```

---

## Query Engine API

### Core QueryEngine

#### `globalQueryEngine`

The global singleton QueryEngine instance with all queries pre-registered.

```typescript
import { globalQueryEngine } from '@context-action/dependency-linker';
```

### Registration Functions

#### `registerTypeScriptQueries(engine)`

Registers all TypeScript/TSX queries with the engine.

```typescript
function registerTypeScriptQueries(engine: QueryEngine): void
```

#### `registerJavaQueries(engine)`

Registers all Java queries with the engine.

```typescript
function registerJavaQueries(engine: QueryEngine): void
```

#### `registerPythonQueries(engine)`

Registers all Python queries with the engine.

```typescript
function registerPythonQueries(engine: QueryEngine): void
```

**Example:**
```typescript
import {
  QueryEngine,
  registerTypeScriptQueries,
  registerJavaQueries
} from '@context-action/dependency-linker';

const engine = new QueryEngine();
registerTypeScriptQueries(engine);
registerJavaQueries(engine);
```

### Query Execution

#### `executeQuery(queryKey, matches, context)`

Execute a single query by key.

```typescript
async function executeQuery<K extends QueryKey>(
  queryKey: K,
  matches: QueryMatch[],
  context: QueryExecutionContext
): Promise<QueryResult<K>[]>
```

#### `executeQueries(queryKeys, matches, context)`

Execute multiple queries in parallel.

```typescript
async function executeQueries(
  queryKeys: QueryKey[],
  matches: QueryMatch[],
  context: QueryExecutionContext
): Promise<Record<QueryKey, QueryResult<QueryKey>[]>>
```

---

## Tree-sitter Integration

### Query Bridge Functions

#### `executeTreeSitterQuery(queryKey, context)`

Execute a Tree-sitter query and process results through the query bridge.

```typescript
async function executeTreeSitterQuery(
  queryKey: QueryKey,
  context: QueryExecutionContext
): Promise<QueryResult<QueryKey>[]>
```

#### `executeMultipleTreeSitterQueries(queryKeys, context)`

Execute multiple Tree-sitter queries in parallel.

```typescript
async function executeMultipleTreeSitterQueries(
  queryKeys: QueryKey[],
  context: QueryExecutionContext
): Promise<Record<QueryKey, QueryResult<QueryKey>[]>>
```

#### `executeAllLanguageQueries(context)`

Execute all queries available for the context's language.

```typescript
async function executeAllLanguageQueries(
  context: QueryExecutionContext
): Promise<Record<QueryKey, QueryResult<QueryKey>[]>>
```

### Tree-sitter Query Engine

#### `globalTreeSitterQueryEngine`

The global Tree-sitter query execution engine.

```typescript
import { globalTreeSitterQueryEngine } from '@context-action/dependency-linker';

// Get supported languages
const languages = globalTreeSitterQueryEngine.getSupportedLanguages();
console.log('Supported:', languages); // ['typescript', 'tsx', 'javascript', 'jsx', 'java', 'python']
```

---

## Type Definitions

### Core Types

#### `SupportedLanguage`

```typescript
type SupportedLanguage =
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "java"
  | "python";
```

#### `QueryExecutionContext`

```typescript
interface QueryExecutionContext {
  sourceCode: string;
  language: SupportedLanguage;
  filePath: string;
  tree: Parser.Tree;  // Tree-sitter AST
}
```

#### `AnalysisResult`

```typescript
interface AnalysisResult {
  // Basic info
  language: SupportedLanguage;
  filePath: string;
  sourceCode: string;

  // Parse results
  parseMetadata: {
    nodeCount: number;
    parseTime: number;
  };

  // Query results
  queryResults: Record<QueryKey, QueryResult<QueryKey>[]>;

  // Custom mapping results (if provided)
  customResults?: Record<string, QueryResult<QueryKey>[]>;

  // Performance metrics
  performanceMetrics: {
    totalExecutionTime: number;
    queryExecutionTime: number;
    customMappingTime?: number;
  };
}
```

#### `AnalysisOptions`

```typescript
interface AnalysisOptions {
  // Query selection
  queryKeys?: QueryKey[];

  // Custom key mapping
  customMapping?: CustomKeyMapping;
  customConditions?: Record<string, boolean>;

  // Performance options
  enableParallelExecution?: boolean;
  enableCaching?: boolean;
}
```

### Query Types

#### `QueryKey`

All available query keys across all languages:

```typescript
type QueryKey =
  // TypeScript/TSX
  | "ts-import-sources"
  | "ts-named-imports"
  | "ts-default-imports"
  | "ts-type-imports"
  | "ts-export-declarations"
  | "ts-export-assignments"

  // JavaScript/JSX
  | "js-import-sources"
  | "js-named-imports"
  | "js-default-imports"
  | "js-export-declarations"
  | "js-export-assignments"

  // Java
  | "java-import-sources"
  | "java-import-statements"
  | "java-wildcard-imports"
  | "java-static-imports"
  | "java-class-declarations"
  | "java-interface-declarations"
  | "java-enum-declarations"
  | "java-method-declarations"

  // Python
  | "python-import-sources"
  | "python-import-statements"
  | "python-from-imports"
  | "python-import-as"
  | "python-function-definitions"
  | "python-class-definitions"
  | "python-variable-definitions"
  | "python-method-definitions";
```

#### `QueryResult<K>`

Base result type for all queries:

```typescript
interface QueryResult<K extends QueryKey> {
  queryName: K;
  location: Location;
  nodeText: string;
  // Additional properties specific to query type
}
```

#### `CustomKeyMapping`

```typescript
type CustomKeyMapping = Record<string, QueryKey>;
```

### Specific Result Types

#### `ImportSourceResult`

```typescript
interface ImportSourceResult extends QueryResult<"ts-import-sources"> {
  source: string;  // e.g., "react", "./utils"
}
```

#### `NamedImportResult`

```typescript
interface NamedImportResult extends QueryResult<"ts-named-imports"> {
  name: string;      // e.g., "useState"
  alias?: string;    // e.g., "useState as useStateHook"
}
```

#### `ExportDeclarationResult`

```typescript
interface ExportDeclarationResult extends QueryResult<"ts-export-declarations"> {
  name: string;          // e.g., "UserComponent"
  exportType: "const" | "function" | "class" | "interface" | "type";
}
```

---

## System Initialization

### `initializeAnalysisSystem()`

Initialize the complete analysis system with all components.

```typescript
function initializeAnalysisSystem(): void
```

**What it does:**
- Initializes the Query Bridge
- Registers all language queries
- Sets up Tree-sitter query engine
- Prepares the system for analysis

**Example:**
```typescript
import { initializeAnalysisSystem } from '@context-action/dependency-linker';

// Initialize once at application startup
initializeAnalysisSystem();

// Now all analysis functions are ready to use
```

---

## Error Handling

### Common Error Types

#### `AnalysisError`

Thrown when analysis fails due to parsing or execution issues.

```typescript
try {
  const result = await analyzeTypeScriptFile(sourceCode, "Component.tsx");
} catch (error) {
  if (error instanceof AnalysisError) {
    console.error('Analysis failed:', error.message);
    console.error('File:', error.filePath);
    console.error('Language:', error.language);
  }
}
```

#### `ValidationError`

Thrown when CustomKeyMapper validation fails.

```typescript
try {
  const mapper = createCustomKeyMapper({
    "invalid": "non-existent-query"
  });

  const validation = mapper.validate();
  if (!validation.isValid) {
    throw new ValidationError(`Invalid mapping: ${validation.errors.join(', ')}`);
  }
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

### Error Recovery

#### Graceful Degradation

```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

async function safeAnalyze(sourceCode: string, filePath: string) {
  try {
    return await analyzeTypeScriptFile(sourceCode, filePath);
  } catch (error) {
    console.warn(`Analysis failed for ${filePath}:`, error.message);

    // Return minimal result
    return {
      success: false,
      error: error.message,
      filePath,
      fallbackResults: []
    };
  }
}
```

#### Partial Success Handling

```typescript
async function analyzeWithFallback(sourceCode: string, filePath: string) {
  try {
    // Try full analysis with custom mapping
    return await analyzeTypeScriptFile(sourceCode, filePath, {
      customMapping: predefinedCustomMappings.typeScriptAnalysis
    });
  } catch (error) {
    console.warn('Custom mapping failed, trying basic analysis');

    // Fallback to basic analysis
    return await analyzeTypeScriptFile(sourceCode, filePath);
  }
}
```

---

## Usage Patterns

### Initialization Pattern

```typescript
import { initializeAnalysisSystem } from '@context-action/dependency-linker';

// Initialize once at application startup
initializeAnalysisSystem();

// Now all analysis functions are ready to use
```

### Batch Processing Pattern

```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

async function analyzeBatch(files: Array<{code: string, path: string}>) {
  const results = await Promise.allSettled(
    files.map(file => analyzeTypeScriptFile(file.code, file.path))
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  return { successful, failed };
}
```

### Custom Analysis Pipeline

```typescript
import {
  analyzeFile,
  createCustomKeyMapper,
  globalQueryEngine
} from '@context-action/dependency-linker';

class CustomAnalyzer {
  private mapping = {
    "user_imports": "ts-import-sources",
    "user_exports": "ts-export-declarations"
  };

  private mapper = createCustomKeyMapper(this.mapping);

  async analyze(sourceCode: string, language: SupportedLanguage) {
    // Validate mapping
    const validation = this.mapper.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid mapping: ${validation.errors.join(', ')}`);
    }

    // Execute analysis
    const result = await analyzeFile(sourceCode, language, "file", {
      customMapping: this.mapping
    });

    return {
      imports: result.customResults?.user_imports || [],
      exports: result.customResults?.user_exports || [],
      performance: result.performanceMetrics
    };
  }
}
```

---

## Performance Considerations

### Optimization Tips

1. **Initialize Once**: Call `initializeAnalysisSystem()` only once at startup
2. **Reuse Mappers**: Create CustomKeyMapper instances once and reuse them
3. **Parallel Processing**: Use `Promise.all()` for analyzing multiple files
4. **Query Selection**: Use `queryKeys` option to run only needed queries
5. **Conditional Execution**: Use `customConditions` to skip unnecessary queries

### Performance Monitoring

```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const result = await analyzeTypeScriptFile(sourceCode, "Component.tsx");

console.log('Performance Metrics:');
console.log(`Total time: ${result.performanceMetrics.totalExecutionTime}ms`);
console.log(`Query time: ${result.performanceMetrics.queryExecutionTime}ms`);
console.log(`Parse time: ${result.parseMetadata.parseTime}ms`);
console.log(`AST nodes: ${result.parseMetadata.nodeCount}`);
```

---

## Complete Examples

### Basic Usage with Korean Keys

```typescript
import {
  analyzeTypeScriptFile,
  createCustomKeyMapper,
  initializeAnalysisSystem
} from '@context-action/dependency-linker';

// Initialize system
initializeAnalysisSystem();

// Create Korean key mapping
const koreanMapping = {
  "모든_임포트": "ts-import-sources",
  "네임드_임포트": "ts-named-imports",
  "타입_임포트": "ts-type-imports",
  "익스포트_선언": "ts-export-declarations"
};

// Validate mapping
const mapper = createCustomKeyMapper(koreanMapping);
const validation = mapper.validate();

if (validation.isValid) {
  const sourceCode = `
  import React, { useState } from 'react';
  import type { User } from './types';
  export const UserComponent = () => <div>Hello</div>;
  `;

  const result = await analyzeTypeScriptFile(sourceCode, "Component.tsx", {
    customMapping: koreanMapping
  });

  // Results with Korean keys
  console.log("모든_임포트:", result.customResults?.["모든_임포트"]);
  console.log("네임드_임포트:", result.customResults?.["네임드_임포트"]);
}
```

### Production Class Example

```typescript
import {
  analyzeTypeScriptFile,
  createCustomKeyMapper,
  predefinedCustomMappings,
  initializeAnalysisSystem
} from '@context-action/dependency-linker';

class ProjectAnalyzer {
  private mapper: ReturnType<typeof createCustomKeyMapper>;

  constructor() {
    initializeAnalysisSystem();

    this.mapper = createCustomKeyMapper(
      predefinedCustomMappings.typeScriptAnalysis
    );

    const validation = this.mapper.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid mapping: ${validation.errors.join(', ')}`);
    }
  }

  async analyzeComponent(sourceCode: string, filePath: string) {
    try {
      const result = await analyzeTypeScriptFile(sourceCode, filePath, {
        customMapping: predefinedCustomMappings.typeScriptAnalysis,
        enableParallelExecution: true
      });

      return {
        success: true,
        data: {
          imports: result.customResults?.sources || [],
          exports: result.customResults?.exports || [],
          types: result.customResults?.typeImports || [],
          performance: result.performanceMetrics
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }
}
```

---

**🎯 Complete API reference for CustomKeyMapper query composition and Tree-sitter AST analysis**