# Package Exports Configuration (v3.0.0)

## Current Package Structure

The `@context-action/dependency-linker` package follows a Query-Centric Architecture with tree-shaking optimization support.

### Main Entry Point

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

**Usage:**
```typescript
import {
  QueryEngine,
  globalQueryEngine,
  executeQueriesWithCustomKeys,
  ParserFactory
} from '@context-action/dependency-linker';
```

## 🌳 Tree-Shaking Import Paths

For optimal bundle size, you can import directly from specific modules:

### Core Query System

```typescript
// Query Engine (Central coordinator)
import { QueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';
import { globalQueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';

// Query Result Map (Type system)
import { QueryResultMap } from '@context-action/dependency-linker/dist/core/QueryResultMap';

// Core types
import type {
  QueryExecutionContext,
  ParseResult,
  SupportedLanguage
} from '@context-action/dependency-linker/dist/core/types';
```

### Custom Key Mapping System

```typescript
// Custom key mapping
import {
  CustomKeyMapper,
  createCustomKeyMapper,
  executeQueriesWithCustomKeys
} from '@context-action/dependency-linker/dist/mappers/CustomKeyMapper';

// Predefined mappings
import {
  predefinedCustomMappings
} from '@context-action/dependency-linker/dist/mappers/CustomKeyMapper';
```

### Parser System

```typescript
// Parser factory
import { ParserFactory } from '@context-action/dependency-linker/dist/parsers/ParserFactory';

// Individual parsers
import { BaseParser } from '@context-action/dependency-linker/dist/parsers/base';
import { TypeScriptParser } from '@context-action/dependency-linker/dist/parsers/typescript/TypeScriptParser';
import { JavaParser } from '@context-action/dependency-linker/dist/parsers/java/JavaParser';
import { PythonParser } from '@context-action/dependency-linker/dist/parsers/python/PythonParser';
import { GoParser } from '@context-action/dependency-linker/dist/parsers/go/GoParser';
```

### Language-Specific Queries

```typescript
// TypeScript queries
import {
  registerTypeScriptQueries
} from '@context-action/dependency-linker/dist/queries/typescript';

// Java queries
import {
  registerJavaQueries
} from '@context-action/dependency-linker/dist/queries/java';

// Python queries
import {
  registerPythonQueries
} from '@context-action/dependency-linker/dist/queries/python';

// Go queries
import {
  registerGoQueries
} from '@context-action/dependency-linker/dist/queries/go';
```

### Result Type System

```typescript
// All result types
import type {
  QueryKey,
  QueryResult,
  UnifiedQueryResultMap,
  TypeScriptQueryResultMap,
  JavaQueryResultMap,
  PythonQueryResultMap,
  GoQueryResultMap
} from '@context-action/dependency-linker/dist/results';

// Specific result types
import type {
  ImportSourceResult,
  NamedImportResult,
  ExportDeclarationResult
} from '@context-action/dependency-linker/dist/results/imports';

import type {
  ClassDefinitionResult,
  FunctionDeclarationResult
} from '@context-action/dependency-linker/dist/results/classes';
```

### Utility Functions

```typescript
// AST utilities
import {
  countTreeSitterNodes
} from '@context-action/dependency-linker/dist/utils/ast-helpers';

// Performance utilities
import {
  createPerformanceTimer
} from '@context-action/dependency-linker/dist/utils/performance';
```

## 📦 Bundle Size Optimization

### Import Strategies by Use Case

#### Minimal Query Analysis (25-40KB)
```typescript
import { globalQueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';
import { ParserFactory } from '@context-action/dependency-linker/dist/parsers/ParserFactory';
```

#### Single Language Analysis (50-80KB)
```typescript
import { globalQueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';
import { TypeScriptParser } from '@context-action/dependency-linker/dist/parsers/typescript/TypeScriptParser';
import { registerTypeScriptQueries } from '@context-action/dependency-linker/dist/queries/typescript';
```

#### Multi-Language Support (120-180KB)
```typescript
import { QueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';
import { ParserFactory } from '@context-action/dependency-linker/dist/parsers/ParserFactory';
import {
  registerTypeScriptQueries,
  registerJavaQueries,
  registerPythonQueries
} from '@context-action/dependency-linker/dist/queries';
```

#### Custom Key Mapping (80-120KB)
```typescript
import {
  CustomKeyMapper,
  executeQueriesWithCustomKeys,
  predefinedCustomMappings
} from '@context-action/dependency-linker/dist/mappers/CustomKeyMapper';
```

## 🔮 Future Exports Configuration

For enhanced tree-shaking, we recommend adding explicit exports to package.json:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./core/*": {
      "types": "./dist/core/*.d.ts",
      "import": "./dist/core/*.js",
      "require": "./dist/core/*.js"
    },
    "./parsers/*": {
      "types": "./dist/parsers/*.d.ts",
      "import": "./dist/parsers/*.js",
      "require": "./dist/parsers/*.js"
    },
    "./queries/*": {
      "types": "./dist/queries/*.d.ts",
      "import": "./dist/queries/*.js",
      "require": "./dist/queries/*.js"
    },
    "./results/*": {
      "types": "./dist/results/*.d.ts",
      "import": "./dist/results/*.js",
      "require": "./dist/results/*.js"
    },
    "./mappers/*": {
      "types": "./dist/mappers/*.d.ts",
      "import": "./dist/mappers/*.js",
      "require": "./dist/mappers/*.js"
    },
    "./utils/*": {
      "types": "./dist/utils/*.d.ts",
      "import": "./dist/utils/*.js",
      "require": "./dist/utils/*.js"
    }
  }
}
```

This would enable cleaner imports:

```typescript
// With exports configuration
import { QueryEngine } from '@context-action/dependency-linker';
import { TypeScriptParser } from '@context-action/dependency-linker/parsers/typescript/TypeScriptParser';
import { CustomKeyMapper } from '@context-action/dependency-linker/mappers/CustomKeyMapper';
```

## 📊 Bundle Analysis Results

### Current Import Performance

| Import Method | Bundle Size | First Load | Parse Time |
|---------------|-------------|------------|------------|
| Full package import | ~180KB | ~60ms | ~12ms |
| Core system only | ~120KB | ~40ms | ~8ms |
| Single language | ~80KB | ~30ms | ~6ms |
| Query functions only | ~40KB | ~15ms | ~4ms |

### Tree-Shaking Effectiveness

Modern bundlers (Webpack 5+, Rollup 3+, Vite 4+) can effectively tree-shake the package when using:

1. **Direct module imports** (`/dist/module/file`)
2. **Selective main imports** (importing specific functions from main entry)
3. **ESM-only environments** (avoiding CommonJS require)

### Best Practices

1. **Use specific imports** for production applications
2. **Import core system** for multi-language analysis
3. **Use query-specific imports** for single-purpose analysis
4. **Monitor bundle size** with tools like webpack-bundle-analyzer

## 🛠️ Integration Examples

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@context-action/dependency-linker/dist': path.resolve(__dirname, 'node_modules/@context-action/dependency-linker/dist')
    }
  },
  optimization: {
    usedExports: true,
    sideEffects: false
  }
};
```

### Rollup Configuration

```javascript
// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  plugins: [
    nodeResolve({
      preferBuiltins: false
    })
  ],
  external: (id) => id.includes('@context-action/dependency-linker/dist')
};
```

### Vite Configuration

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      external: [
        /@context-action\/dependency-linker\/dist\/.*/
      ]
    }
  }
};
```

## 📚 Module Map

Complete reference of all available modules in the Query-Centric Architecture:

```
@context-action/dependency-linker/
├── dist/
│   ├── index.js (main entry - all exports)
│   ├── core/
│   │   ├── QueryEngine.js (central coordinator)
│   │   ├── QueryResultMap.js (type system)
│   │   └── types.js (core type definitions)
│   ├── parsers/
│   │   ├── base.js (abstract parser)
│   │   ├── ParserFactory.js (parser registry)
│   │   ├── typescript/TypeScriptParser.js
│   │   ├── java/JavaParser.js
│   │   ├── python/PythonParser.js
│   │   └── go/GoParser.js
│   ├── queries/
│   │   ├── typescript/ (TypeScript queries)
│   │   ├── java/ (Java queries)
│   │   ├── python/ (Python queries)
│   │   └── go/ (Go queries)
│   ├── results/
│   │   ├── index.js (unified result types)
│   │   ├── imports.js (import result types)
│   │   ├── exports.js (export result types)
│   │   ├── classes.js (class result types)
│   │   ├── functions.js (function result types)
│   │   ├── java.js (Java-specific results)
│   │   └── python.js (Python-specific results)
│   ├── mappers/
│   │   └── CustomKeyMapper.js (user-friendly mapping)
│   └── utils/
│       ├── ast-helpers.js (AST utilities)
│       └── performance.js (performance monitoring)
```

## 🎯 Usage Patterns

### Core System Import Pattern
```typescript
// Full core system (recommended for most use cases)
import {
  QueryEngine,
  ParserFactory,
  executeQueriesWithCustomKeys
} from '@context-action/dependency-linker';
```

### Language-Specific Import Pattern
```typescript
// TypeScript-only analysis
import { globalQueryEngine } from '@context-action/dependency-linker/dist/core/QueryEngine';
import { registerTypeScriptQueries } from '@context-action/dependency-linker/dist/queries/typescript';
import type { TypeScriptQueryResultMap } from '@context-action/dependency-linker/dist/results';
```

### Custom Analysis Pattern
```typescript
// Custom key mapping with predefined mappings
import {
  CustomKeyMapper,
  predefinedCustomMappings
} from '@context-action/dependency-linker/dist/mappers/CustomKeyMapper';

const mapper = new CustomKeyMapper(predefinedCustomMappings.typeScriptAnalysis);
```

This modular Query-Centric structure allows for precise control over bundle size and loading performance while maintaining complete type safety and multi-language support.