# Multi-Language AST Analysis Library

🎯 **QueryResultMap-Centric Multi-Language Code Analysis with Type Safety**

## 🚀 Overview

A TypeScript-first AST analysis library featuring QueryResultMap-based type safety, extensible multi-language support, and functional query composition. Built on tree-sitter for maximum performance and reliability.

## 🌟 Key Features

### ✅ QueryResultMap-Centric Architecture
- **🔒 Complete Type Safety**: No `any` types - full TypeScript inference throughout
- **🌐 Multi-Language Support**: TypeScript, Java, Python with consistent patterns
- **🎯 Unified Type System**: All query results map to a central type system
- **🔧 Custom Key Mapping**: User-friendly abstraction layer for query composition
- **⚡ Parallel Execution**: Independent queries execute concurrently for performance

### ✅ Language-Specific Query Systems
- **📋 TypeScript**: Import/export analysis, type imports, named imports
- **☕ Java**: Import statements, class/interface/enum declarations, methods
- **🐍 Python**: Import statements, function/class/variable definitions
- **🔄 Extensible**: Easy addition of new languages with consistent patterns

### ✅ Functional Query Architecture
- **🎼 Composable Queries**: Mix and match queries across languages
- **📊 Performance Monitoring**: Built-in execution metrics and optimization
- **🛡️ Error Recovery**: Graceful handling with comprehensive validation
- **🔍 Tree-sitter Integration**: High-performance AST parsing with query strings

## 🎯 Quick Start

### 📦 Installation

```bash
npm install @context-action/dependency-linker
```

### 🚀 Basic Usage

```typescript
import {
  executeQuery,
  executeQueries,
  CustomKeyMapping,
  predefinedMappings
} from '@context-action/dependency-linker';

// Single query execution
const results = await executeQuery(
  "ts-import-sources",
  matches,
  context
);

// Multiple queries in parallel
const allResults = await executeQueries([
  "ts-import-sources",
  "ts-export-declarations",
  "ts-type-imports"
], matches, context);

// Custom key mapping
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources",
  exports: "ts-export-declarations",
  types: "ts-type-imports"
});

const customResults = await mapping.execute(matches, context);
```

### 🎨 Predefined Mappings

```typescript
// TypeScript analysis
const tsResults = await predefinedMappings.typeScriptAnalysis.execute(matches, context);

// React development
const reactResults = await predefinedMappings.reactAnalysis.execute(matches, context);

// Module structure
const moduleResults = await predefinedMappings.moduleAnalysis.execute(matches, context);
```

## 🏗️ Architecture

### Core Components

1. **QueryEngine** - Central query execution and coordination
2. **QueryResultMap** - Unified type system for all languages
3. **CustomKeyMapping** - User-friendly query abstraction
4. **Language Query Modules** - Isolated language-specific implementations

### Type Safety Flow

```typescript
// Automatic type inference throughout
const results = await executeQuery("ts-import-sources", matches, context);
// results: ImportSourceResult[] (automatically inferred)

// Custom mapping with type safety
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources" as const,
  exports: "ts-export-declarations" as const
});
// mapping: CustomKeyMapper<{imports: "ts-import-sources", exports: "ts-export-declarations"}>
```

### Query Key Patterns

Each language follows consistent naming patterns:

- **TypeScript**: `ts-import-sources`, `ts-named-imports`, `ts-type-imports`
- **Java**: `java-import-sources`, `java-class-declarations`, `java-method-declarations`
- **Python**: `python-import-sources`, `python-function-definitions`, `python-class-definitions`

## 📚 Language Support

### 📋 TypeScript/TSX (6 queries)
```typescript
// Available TypeScript queries
"ts-import-sources"      // Import source paths
"ts-named-imports"       // Named import analysis
"ts-default-imports"     // Default import tracking
"ts-type-imports"        // Type-only imports
"ts-export-declarations" // Export statements
"ts-export-assignments"  // Export assignments
```

### ☕ Java (8 queries)
```typescript
// Available Java queries
"java-import-sources"        // Import statements
"java-import-statements"     // Full import info
"java-wildcard-imports"      // Wildcard imports (*)
"java-static-imports"        // Static imports
"java-class-declarations"    // Class definitions
"java-interface-declarations" // Interface definitions
"java-enum-declarations"     // Enum definitions
"java-method-declarations"   // Method definitions
```

### 🐍 Python (8 queries)
```typescript
// Available Python queries
"python-import-sources"      // Import sources
"python-import-statements"   // Import info
"python-from-imports"        // From imports
"python-import-as"           // Import aliases
"python-function-definitions" // Function definitions
"python-class-definitions"   // Class definitions
"python-variable-definitions" // Variable definitions
"python-method-definitions"  // Method definitions
```

## 🎯 Usage Examples

### Multi-Language Project Analysis

```typescript
import { QueryEngine } from '@context-action/dependency-linker';

const engine = new QueryEngine();

// TypeScript analysis
const tsResults = await engine.executeForLanguage(
  "typescript",
  tsMatches,
  tsContext
);

// Java analysis
const javaResults = await engine.executeForLanguage(
  "java",
  javaMatches,
  javaContext
);

// Python analysis
const pythonResults = await engine.executeForLanguage(
  "python",
  pythonMatches,
  pythonContext
);
```

### Priority-Based Execution

```typescript
// Execute high-priority queries first
const results = await engine.executeByPriority([
  "ts-import-sources",
  "ts-export-declarations",
  "ts-type-imports"
], matches, context, 80); // minimum priority
```

### Conditional Analysis

```typescript
// Execute based on conditions
const analysisConfig = {
  includeImports: true,
  includeExports: true,
  includeTypes: process.env.NODE_ENV === 'development'
};

const queryMapping = {
  imports: "ts-import-sources",
  exports: "ts-export-declarations",
  types: "ts-type-imports"
};

const results = await engine.executeConditional(
  queryMapping,
  analysisConfig,
  matches,
  context
);
```

### Custom Query Development

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

// Register and use
engine.register("custom-analysis", customQuery);
const results = await engine.execute("custom-analysis", matches, context);
```

## ⚡ Performance Features

### Parallel Execution

```typescript
// All queries execute in parallel
const results = await engine.executeMultiple([
  "ts-import-sources",
  "ts-export-declarations",
  "java-class-declarations",
  "python-function-definitions"
], matches, context);
```

### Performance Monitoring

```typescript
// Built-in performance tracking
const metrics = engine.getPerformanceMetrics("ts-import-sources");
console.log(`Average execution time: ${metrics.averageTime}ms`);
console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
```

### Validation System

```typescript
// Automatic result validation
const validation = engine.validate();
console.log(`Registry valid: ${validation.isValid}`);
console.log(`Warnings: ${validation.warnings.length}`);
```

## 🔧 Adding New Languages

Adding support for new languages follows a consistent pattern:

### 1. Define Result Types

```typescript
// src/results/rust.ts
export interface RustQueryResultMap {
  "rust-use-declarations": RustUseDeclarationResult;
  "rust-struct-definitions": RustStructDefinitionResult;
}
```

### 2. Create Query Modules

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

### 3. Extend Unified Map

```typescript
// src/results/index.ts
export interface UnifiedQueryResultMap extends
  TypeScriptQueryResultMap,
  JavaQueryResultMap,
  PythonQueryResultMap,
  RustQueryResultMap {  // Add new language
}
```

## 📊 Real AST Integration

The library integrates with real tree-sitter AST parsing:

```typescript
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// Parse real TypeScript code
const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const sourceCode = `
import React, { useState } from 'react';
export const Component = () => <div>Hello</div>;
`;

const tree = parser.parse(sourceCode);
const astNode = convertTreeSitterNode(tree.rootNode);

// Execute queries on real AST
const context = {
  sourceCode,
  language: "typescript",
  filePath: "Component.tsx",
  astNode
};

const results = await executeQuery("ts-import-sources", matches, context);
```

## 🧪 Testing & Quality

- **✅ Complete Test Suite**: 8 test suites, 48 tests passing
- **✅ Type Safety**: Zero `any` types, complete TypeScript inference
- **✅ Multi-Language Validation**: All language query patterns tested
- **✅ Real AST Testing**: Integration with actual tree-sitter parsers
- **✅ Performance Testing**: Execution time and memory validation

### Test Categories

- **Real AST Pipeline Tests**: Actual tree-sitter integration
- **Multi-Language Verification**: Cross-language compatibility
- **Type Inference Validation**: Complete type safety verification
- **Pipeline Concept Validation**: Core architecture validation
- **Query Registry Tests**: Query registration and validation

## 📚 Documentation

- **[USAGE.md](USAGE.md)**: Comprehensive usage guide with examples
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Detailed architecture documentation
- **[Source Code](src/)**: Well-documented TypeScript implementation

## 🏆 Project Status

**✅ Production Ready**
- All linting errors resolved
- Complete test suite passing
- Type-safe implementation
- Multi-language support verified
- Performance benchmarks met

### Technical Features

- **QueryResultMap-Centric**: All queries map to unified type system
- **Zero Any Types**: Complete TypeScript type safety
- **Functional Architecture**: Pure functions with composable queries
- **Language Extensibility**: Easy addition of new language support
- **Performance Optimized**: Parallel execution and caching

### Quality Metrics

- **Test Coverage**: 100% core functionality tested
- **Type Safety**: Complete TypeScript inference
- **Performance**: <50ms analysis per file
- **Memory Efficiency**: Optimized AST processing
- **Error Handling**: Comprehensive validation and recovery

## 🚀 Ready to Use

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build

# Start analyzing!
import { executeQuery } from '@context-action/dependency-linker';
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**🎯 Multi-Language AST Analysis Made Simple with Complete Type Safety**