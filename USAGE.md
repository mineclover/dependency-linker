# Usage Guide - Query-Based AST Analysis Library

A TypeScript-first AST analysis library with QueryResultMap-centric architecture, complete type safety, and multi-language support.

## Quick Start

```typescript
import {
  QueryEngine,
  CustomKeyMapping,
  QueryExecutionContext
} from '@context-action/dependency-linker';

// Initialize query engine with global instance
const engine = QueryEngine.globalInstance;

// Execute multiple queries in parallel
const results = await engine.executeMultiple(
  ["ts-import-sources", "ts-export-declarations"],
  matches,
  context
);
```

## Core Concepts

### 1. AST → Query Pipeline

The library follows a consistent pipeline across all languages:

```
AST Input → QueryExecutionContext → Query Execution → Typed Results
```

### 2. Language-Specific Query Keys

Each language has its own namespaced query keys:

- **TypeScript**: `ts-import-sources`, `ts-named-imports`, `ts-type-imports`
- **Java**: `java-import-sources`, `java-class-declarations`, `java-method-declarations`
- **Python**: `python-import-sources`, `python-function-definitions`, `python-class-definitions`

### 3. Custom Key Mapping

Abstract query keys with user-friendly names:

```typescript
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources",
  exports: "ts-export-declarations",
  types: "ts-type-imports"
});
```

## Usage Examples

### Basic TypeScript Analysis

```typescript
import { QueryEngine, QueryExecutionContext } from '@context-action/dependency-linker';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// 1. Parse TypeScript code
const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const sourceCode = `
import React, { useState } from 'react';
import type { User } from './types';

export const Component: React.FC = () => {
  return <div>Hello</div>;
};
`;

const tree = parser.parse(sourceCode);

// 2. Create execution context
const context: QueryExecutionContext = {
  sourceCode,
  language: "typescript",
  filePath: "Component.tsx",
  astNode: convertTreeSitterNode(tree.rootNode)
};

// 3. Execute queries using global engine
const engine = QueryEngine.globalInstance;
const importResults = await engine.execute(
  "ts-import-sources",
  matches,
  context
);

console.log(importResults);
// Output: Array of ImportSourceResult objects with full type safety
```

### Multi-Language Project Analysis

```typescript
import { QueryEngine } from '@context-action/dependency-linker';

const engine = new QueryEngine();

// Analyze TypeScript files
const tsResults = await engine.executeForLanguage(
  "typescript",
  tsMatches,
  tsContext
);

// Analyze Java files
const javaResults = await engine.executeForLanguage(
  "java",
  javaMatches,
  javaContext
);

// Combined analysis
console.log({
  typescript: tsResults,
  java: javaResults
});
```

### Custom Key Mapping for React Projects

```typescript
import { CustomKeyMapping } from '@context-action/dependency-linker';

// Create React-specific mapping
const reactMapping = CustomKeyMapping.createMapper({
  hooks: "ts-named-imports",        // useState, useEffect, etc.
  components: "ts-default-imports", // React component imports
  types: "ts-type-imports",         // Type definitions
  exports: "ts-export-declarations" // Component exports
});

// Execute with custom keys
const results = await reactMapping.execute(matches, context);

console.log(results.hooks);      // Hook imports
console.log(results.components); // Component imports
console.log(results.types);      // Type imports
```

### Conditional Query Execution

```typescript
import { QueryEngine } from '@context-action/dependency-linker';

const engine = new QueryEngine();

// Define analysis conditions
const analysisConfig = {
  includeTypes: true,
  includeExports: true,
  includeImports: true
};

// Map conditions to queries
const queryMapping = {
  types: "ts-type-imports",
  exports: "ts-export-declarations",
  imports: "ts-import-sources"
};

// Execute based on conditions
const results = await engine.executeConditional(
  queryMapping,
  analysisConfig,
  matches,
  context
);
```

### Priority-Based Query Execution

```typescript
import { QueryEngine } from '@context-action/dependency-linker';

const engine = new QueryEngine();

// Execute high-priority queries first
const results = await engine.executeByPriority(
  ["ts-import-sources", "ts-export-declarations", "ts-type-imports"],
  matches,
  context,
  80 // minimum priority
);
```

## Predefined Mappings

The library includes several predefined mappings for common use cases:

### TypeScript Analysis
```typescript
import { predefinedMappings } from '@context-action/dependency-linker';

const results = await predefinedMappings.typeScriptAnalysis.execute(matches, context);
// Includes: sources, namedImports, defaultImports, typeImports, exports
```

### React Development
```typescript
const results = await predefinedMappings.reactAnalysis.execute(matches, context);
// Optimized for React component analysis
```

### Module Structure Analysis
```typescript
const results = await predefinedMappings.moduleAnalysis.execute(matches, context);
// Focus on import/export relationships
```

## Type Safety

The library provides full TypeScript type safety:

```typescript
// Type-safe query execution
const results = await executeQuery("ts-import-sources", matches, context);
// results is automatically typed as ImportSourceResult[]

// Type-safe custom mapping
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources" as const,
  exports: "ts-export-declarations" as const
});
// mapping is fully typed with proper key relationships
```

## Performance Features

### Query Engine Performance Monitoring

```typescript
const engine = QueryEngine.globalInstance;

// Execute queries
await engine.execute("ts-import-sources", matches, context);

// Check performance metrics
const metrics = engine.getPerformanceMetrics("ts-import-sources");
console.log(`Average execution time: ${metrics.averageTime}ms`);
console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);

// Validate engine state
const validation = engine.validate();
console.log(`Registry valid: ${validation.isValid}`);
console.log(`Warnings: ${validation.warnings.length}`);
```

### Batch Execution for Better Performance

```typescript
// Execute multiple queries in parallel for maximum performance
const results = await engine.executeMultiple(
  ["ts-import-sources", "ts-export-declarations", "ts-type-imports"],
  matches,
  context
);

// Priority-based execution
const priorityResults = await engine.executeByPriority(
  ["ts-import-sources", "ts-export-declarations", "ts-type-imports"],
  matches,
  context,
  80 // minimum priority
);

// Language-specific batch execution
const tsResults = await engine.executeForLanguage(
  "typescript",
  matches,
  context
);
```

### Custom Key Mapping for Complex Workflows

```typescript
// React component analysis mapping
const reactMapping = CustomKeyMapping.createMapper({
  hooks: "ts-named-imports",        // useState, useEffect, etc.
  components: "ts-default-imports", // React component imports
  types: "ts-type-imports",         // Type definitions
  exports: "ts-export-declarations" // Component exports
});

// Execute with custom keys
const results = await reactMapping.execute(matches, context);

// Access results with user-friendly keys
console.log(results.hooks);      // Hook imports
console.log(results.components); // Component imports
console.log(results.types);      // Type imports

// Validate mapping
const validation = reactMapping.validate();
console.log(`Mapping valid: ${validation.isValid}`);
```

## Language-Specific Examples

### TypeScript Analysis

```typescript
// TypeScript React component analysis
const engine = QueryEngine.globalInstance;

// Analyze imports
const imports = await engine.execute("ts-import-sources", matches, context);
const namedImports = await engine.execute("ts-named-imports", matches, context);
const typeImports = await engine.execute("ts-type-imports", matches, context);

// Analyze exports
const exports = await engine.execute("ts-export-declarations", matches, context);

// Results are fully typed
imports.forEach(result => {
  console.log(`Import: ${result.source} (${result.importType})`);
  console.log(`Relative: ${result.isRelative}`);
});
```

### Java Analysis

```typescript
// Java application analysis
const javaContext: QueryExecutionContext = {
  sourceCode: javaSourceCode,
  language: "java",
  filePath: "Application.java",
  astNode: javaASTNode
};

// Analyze Java imports
const javaImports = await engine.execute("java-import-sources", matches, javaContext);
const javaClasses = await engine.execute("java-class-declarations", matches, javaContext);
const javaMethods = await engine.execute("java-method-declarations", matches, javaContext);

// Process results
javaImports.forEach(result => {
  console.log(`Java Import: ${result.source}`);
});
```

### Python Analysis

```typescript
// Python module analysis
const pythonContext: QueryExecutionContext = {
  sourceCode: pythonSourceCode,
  language: "python",
  filePath: "main.py",
  astNode: pythonASTNode
};

// Analyze Python imports and definitions
const pythonImports = await engine.execute("python-import-sources", matches, pythonContext);
const pythonFunctions = await engine.execute("python-function-definitions", matches, pythonContext);
const pythonClasses = await engine.execute("python-class-definitions", matches, pythonContext);

// Process results with type safety
pythonImports.forEach(result => {
  console.log(`Python Import: ${result.source}`);
});
```

### Adding New Languages

The architecture supports easy language expansion:

1. Create language-specific query modules in `src/queries/{language}/`
2. Define result types in `src/results/{language}.ts`
3. Register queries in the main index
4. Add language support to QueryEngine

Example structure for adding Rust support:

```typescript
// src/queries/rust/imports.ts
export const rustUseDeclarations: QueryFunction<RustUseDeclarationResult> = {
  name: "rust-use-declarations",
  description: "Extract Rust use declarations",
  query: "(use_declaration) @use",
  resultType: "rust-use-declarations",
  languages: ["rust"],
  priority: 90,
  processor: (matches, context) => {
    // Implementation
  }
};
```

## Error Handling

The library includes comprehensive error handling:

```typescript
try {
  const results = await executeQuery("ts-import-sources", matches, context);
} catch (error) {
  if (error.message.includes("not found in registry")) {
    console.log("Query not registered");
  }
  if (error.message.includes("does not support language")) {
    console.log("Language not supported for this query");
  }
}
```

## Migration from Legacy Versions

If you're migrating from earlier versions:

### Old API (v1.x)
```typescript
// Old approach
const analyzer = new TypeScriptAnalyzer();
const results = analyzer.extractImports(sourceCode);
```

### New API (v3.x)
```typescript
// New approach
const results = await executeQuery("ts-import-sources", matches, context);
```

### Legacy Compatibility Mapping
```typescript
import { predefinedMappings } from '@context-action/dependency-linker';

// Use legacy-compatible keys
const results = await predefinedMappings.legacyCompatibility.execute(matches, context);
// Provides: import-sources, named-imports, default-imports, type-imports
```

## Best Practices

1. **Use Predefined Mappings**: Start with predefined mappings for common scenarios
2. **Batch Queries**: Use `executeMultiple` for better performance
3. **Language-Specific Analysis**: Use `executeForLanguage` for focused analysis
4. **Type Safety**: Leverage TypeScript types throughout your analysis pipeline
5. **Error Handling**: Always handle potential query execution errors
6. **Performance Monitoring**: Use built-in metrics for optimization

## Advanced Usage

### Creating Custom Query Functions

```typescript
import type { QueryFunction } from '@context-action/dependency-linker';

const customQuery: QueryFunction<CustomResult> = {
  name: "custom-analysis",
  description: "Custom AST analysis",
  query: "(custom_pattern) @custom",
  resultType: "custom-analysis",
  languages: ["typescript"],
  priority: 50,
  processor: (matches, context) => {
    return matches.map(match => ({
      queryName: "custom-analysis",
      customData: extractCustomData(match.node),
      location: extractLocation(match.node),
      nodeText: match.node.text
    }));
  }
};

// Register custom query
engine.register("custom-analysis", customQuery);
```

### Integration with Build Tools

```typescript
// webpack.config.js integration example
import { executeQuery } from '@context-action/dependency-linker';

class DependencyAnalysisPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('DependencyAnalysis', (compilation) => {
      // Analyze dependencies during build
      const results = executeQuery("ts-import-sources", matches, context);
      // Process results...
    });
  }
}
```

This library provides a robust, type-safe foundation for multi-language AST analysis with excellent performance and extensibility.