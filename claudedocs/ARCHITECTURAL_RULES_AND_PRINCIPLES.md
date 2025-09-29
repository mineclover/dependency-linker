# Architectural Rules and Principles
## Multi-Language Dependency Linker

**Version**: 3.0.0
**Architecture**: Query-Based AST Analysis with Multi-Language Support
**Generated**: 2025-09-29

---

## 📋 Executive Summary

This document defines the architectural rules and principles governing the Multi-Language Dependency Linker codebase. The system follows a **Query-Centric Architecture** with strict separation between parsing, query execution, and result mapping across multiple programming languages.

---

## 🏗️ Core Architectural Principles

### 1. **Query-First Design**
- **Primary Pattern**: All analysis operations flow through the query system
- **Query Centrality**: QueryEngine and QueryResultMap are the central coordination points
- **Language Agnostic**: Queries can target multiple languages with unified interfaces

### 2. **Layered Architecture**
```
Application Layer (CLI/API)
    ↓
Query Execution Layer (QueryEngine)
    ↓
Parser Abstraction Layer (ParserFactory)
    ↓
Language-Specific Parsers (TypeScript, Go, Java, Python)
    ↓
Tree-Sitter Integration Layer
```

### 3. **Plugin-Based Extensibility**
- **Registry Pattern**: ParserFactory manages language-specific parsers
- **Uniform Interface**: All parsers extend BaseParser abstract class
- **Dynamic Registration**: Runtime parser registration capability

---

## 🔧 Module Organization Rules

### Core Module Structure
```
src/
├── core/           # Central coordination and type definitions
├── parsers/        # Language-specific parsing implementations
├── queries/        # Language-specific query definitions
├── results/        # Result type definitions and processors
├── utils/          # Shared utilities and helpers
└── mappers/        # Custom result mapping logic
```

### Module Boundary Rules

#### **RULE 1: Core Module Authority**
- `src/core/types.ts` defines ALL shared types and interfaces
- No cross-language type definitions outside core module
- All parsers MUST implement interfaces from `src/core/types.ts`

#### **RULE 2: Language Isolation**
- Each language parser resides in isolated subdirectory: `src/parsers/{language}/`
- Language-specific queries in: `src/queries/{language}/`
- No direct cross-language dependencies between parsers
- Communication ONLY through core interfaces

#### **RULE 3: Parser Factory Control**
- `ParserFactory` is the ONLY entry point for parser instantiation
- Singleton pattern enforced for global parser management
- File extension to language mapping centralized in ParserFactory

#### **RULE 4: Query System Boundaries**
- Queries are language-specific but interface-unified
- All queries implement `QueryFunction<TResult, TCaptureNames>`
- Query registration through centralized `QueryEngine`

---

## 📊 Type System Requirements

### Type Safety Standards

#### **RULE 5: Strict TypeScript Configuration**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "noImplicitReturns": true
}
```

#### **RULE 6: Interface-Driven Design**
- ALL public APIs MUST have explicit interfaces
- Abstract base classes for extensible components
- Generic types with proper constraints for reusable components

#### **RULE 7: Language Type Mapping**
```typescript
// Centralized language definitions
export type SupportedLanguage =
  | "typescript" | "tsx"
  | "javascript" | "jsx"
  | "go" | "java" | "python";

export type LanguageGroup =
  | "typescript" | "javascript"
  | "go" | "java" | "python";
```

### Result Type Hierarchy
```typescript
BaseQueryResult (base interface)
    ↓
Language-specific result types
    ↓
Specialized result processors
```

---

## 🔄 Query System Architecture

### Query System Rules

#### **RULE 8: Query Function Structure**
Every query MUST implement:
```typescript
export type QueryFunction<TResult, TCaptureNames> = {
  readonly name: string;
  readonly description: string;
  readonly query: string;                    // Tree-sitter query
  readonly languages: readonly SupportedLanguage[];
  readonly priority: number;
  readonly resultType: string;
  readonly processor: (matches, context) => TResult[];
};
```

#### **RULE 9: Query Organization Pattern**
```
src/queries/{language}/
├── index.ts        # Main export and registration
├── imports.ts      # Import-related queries
├── exports.ts      # Export-related queries
└── {feature}.ts    # Feature-specific queries
```

#### **RULE 10: Query Registration Protocol**
- All queries MUST be registered through `QueryEngine.register()`
- Query keys MUST be type-safe through `QueryKey` union type
- Language-specific registration helpers required (`registerTypeScriptQueries()`)

---

## 🌐 Parser Implementation Standards

### Parser Architecture Rules

#### **RULE 11: BaseParser Contract**
ALL parsers MUST:
```typescript
export abstract class BaseParser {
  protected abstract language: SupportedLanguage;
  protected abstract fileExtensions: string[];

  abstract parse(sourceCode: string, options?: ParserOptions): Promise<ParseResult>;
  abstract parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult>;

  // Standardized utility methods
  supportsFile(filePath: string): boolean;
  getLanguage(): SupportedLanguage;
  getSupportedExtensions(): string[];
}
```

#### **RULE 12: Parser Implementation Pattern**
```typescript
// Each parser follows this structure:
export class {Language}Parser extends BaseParser {
  protected language = "{language}" as const;
  protected fileExtensions = [/* extensions */];

  async parse(sourceCode: string, options?: ParserOptions): Promise<ParseResult> {
    // Tree-sitter integration
    // Performance monitoring
    // Error handling
  }
}
```

#### **RULE 13: Performance Requirements**
- Parse time: **< 200ms per file**
- Memory usage: **< 100MB per session**
- Node count tracking: **Required for all parsers**
- Performance metadata: **Required in ParseResult**

---

## 📁 File Organization Rules

### Naming Conventions

#### **RULE 14: File Naming Standards**
- **Classes**: PascalCase (`TypeScriptParser.ts`)
- **Interfaces**: PascalCase with 'I' prefix (`IDataExtractor.ts`)
- **Utilities**: kebab-case (`ast-helpers.ts`)
- **Tests**: `{name}.test.ts`
- **Types**: `types.ts` (consolidated) or `{domain}.types.ts`

#### **RULE 15: Directory Structure**
- **Language Directories**: `src/{component}/{language}/`
- **Index Files**: Required for each directory with public exports
- **Test Mirroring**: Test structure MUST mirror source structure

#### **RULE 16: Import/Export Patterns**
```typescript
// Index files re-export public APIs
export { TypeScriptParser } from './TypeScriptParser';
export { default } from './TypeScriptParser';

// Cross-module imports use absolute paths from src/
import type { SupportedLanguage } from "../core/types";
```

---

## ⚡ Performance Architecture Rules

### Caching Strategy

#### **RULE 17: Multi-Tier Caching**
- **AST Caching**: Parse results cached in memory
- **Query Results**: Cached per file + query combination
- **Parser Instances**: Singleton pattern for reuse
- **Cache Invalidation**: File modification time based

#### **RULE 18: Performance Targets**
```yaml
Parsing Performance:
  - Single File: < 200ms
  - Batch Processing: < 10ms per file average
  - Memory Usage: < 100MB per session
  - Cache Hit Rate: > 80%

Query Performance:
  - Query Execution: < 50ms per query
  - Result Processing: < 10ms per query
  - Concurrent Analysis: Support 10 parallel operations
```

---

## 🧪 Testing Architecture

### Testing Rules

#### **RULE 19: Test Organization**
```
tests/
├── setup.ts                          # Test configuration
├── {component}-integration.test.ts    # Integration tests
├── {component}.test.ts                # Unit tests
└── real-ast-pipeline.test.ts         # End-to-end tests
```

#### **RULE 20: Test Coverage Requirements**
- **Core APIs**: > 90% coverage
- **Parser Implementations**: > 85% coverage
- **Query Functions**: > 95% coverage (critical path)
- **Utilities**: > 80% coverage

#### **RULE 21: Test Isolation**
- Each test file MUST be independently runnable
- No shared state between test files
- Mock external dependencies (tree-sitter, file system)

---

## 🔒 Quality Gates

### Build Requirements

#### **RULE 22: Pre-commit Validation**
```bash
# Required before any commit
npm run typecheck    # TypeScript compilation
npm run lint        # Biome code quality
npm run test        # Jest test suite
npm run build       # Distribution build
```

#### **RULE 23: Code Quality Standards**
- **Biome**: Replaces ESLint + Prettier
- **TypeScript**: Strict mode with all checks enabled
- **No `any` types**: Except for explicitly documented edge cases
- **Documentation**: JSDoc for all public APIs

---

## 🚀 Distribution Architecture

### Package Structure Rules

#### **RULE 24: Build Output Structure**
```
dist/
├── index.js           # Main entry point
├── index.d.ts         # Type definitions
├── core/              # Core module compiled
├── parsers/           # Parser implementations
├── queries/           # Query definitions
└── utils/             # Utility functions
```

#### **RULE 25: API Surface Control**
```typescript
// src/index.ts - ONLY export public APIs
export { QueryEngine } from './core/QueryEngine';
export { ParserFactory } from './parsers/ParserFactory';
export * from './core/types';
export { /* selective exports */ } from './utils';
```

---

## ⚠️ Constraint Rules

### What Must NOT Be Done

#### **RULE 26: Anti-Patterns**
- ❌ **NO** direct tree-sitter imports outside parser implementations
- ❌ **NO** language-specific logic in core modules
- ❌ **NO** hardcoded file paths or language assumptions
- ❌ **NO** circular dependencies between modules
- ❌ **NO** mutable global state (except singleton factories)

#### **RULE 27: Dependency Constraints**
- ❌ **NO** runtime dependencies on build tools
- ❌ **NO** optional dependencies that break core functionality
- ❌ **NO** version conflicts between tree-sitter language modules
- ❌ **NO** Node.js version below 18.x

#### **RULE 28: Performance Boundaries**
- ❌ **NO** synchronous parsing operations in production
- ❌ **NO** unbounded memory growth in caching
- ❌ **NO** recursive query execution without depth limits
- ❌ **NO** blocking operations in main thread

---

## 📈 Extensibility Principles

### Extension Points

#### **RULE 29: Supported Extension Patterns**
✅ **New Language Support**: Add parser + queries + registration
✅ **New Query Types**: Implement QueryFunction interface
✅ **Custom Result Processors**: Extend BaseQueryResult
✅ **Custom Key Mapping**: Implement CustomKeyMapper interface

#### **RULE 30: Extension Requirements**
- All extensions MUST follow existing interface contracts
- New languages MUST provide complete query coverage for core operations
- Performance requirements apply to all extensions
- Documentation MUST be updated for new capabilities

---

## 🔧 Compliance Verification

### Automated Checks
```bash
# Architecture compliance verification
npm run verify-separation    # Module boundary validation
npm run validate-types      # Type system validation
npm run diagnostic         # Architecture health check
```

### Manual Review Checklist
- [ ] Module boundaries respected
- [ ] Type safety maintained
- [ ] Performance targets met
- [ ] Test coverage adequate
- [ ] Documentation current
- [ ] No anti-patterns present

---

## 📚 Related Documentation

- **[ARCHITECTURE.md](../ARCHITECTURE.md)**: High-level system design
- **[CLAUDE.md](../CLAUDE.md)**: Development context and setup
- **[Package.json](../package.json)**: Dependencies and scripts
- **[TSConfig.json](../tsconfig.json)**: TypeScript configuration

---

*This document defines the architectural constraints and principles for the Multi-Language Dependency Linker. Adherence to these rules ensures system reliability, maintainability, and extensibility.*

**Last Updated**: 2025-09-29
**Architecture Version**: 3.0.0
**Compliance**: Query-Centric Multi-Language AST Analysis Framework