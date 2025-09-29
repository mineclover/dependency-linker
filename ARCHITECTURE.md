# Architecture Documentation - Query-Based AST Analysis Library

## Overview

**Version 3.0.0** implements a completely redesigned QueryResultMap-centric architecture for multi-language AST analysis with complete type safety, zero `any` types, and extensible query system. This document covers the architectural principles, implementation details, and design patterns used throughout the library.

## Architecture Principles

### 1. QueryResultMap-Centric Design
- **Central Type System**: All query results map to a unified type system
- **Language Namespacing**: Query keys are namespaced by language (e.g., `ts-*`, `java-*`, `python-*`)
- **Type Safety**: Full TypeScript type inference throughout the pipeline

### 2. Functional Query System
- **Immutable Operations**: All query functions are pure and side-effect free
- **Composable Queries**: Queries can be combined and composed for complex analysis
- **Parallel Execution**: Independent queries execute in parallel for performance

### 3. Language Extensibility
- **Plugin Architecture**: New languages can be added without modifying core systems
- **Consistent Patterns**: All languages follow the same query naming and structure patterns
- **Isolated Implementation**: Language-specific code is completely separated

## Core Components

### 1. QueryEngine (`src/core/QueryEngine.ts`)

The central coordination engine for all query operations with singleton pattern for global access.

```typescript
class QueryEngine {
  private registry: QueryRegistry;
  private performanceMetrics: Map<QueryKey, QueryPerformanceMetrics[]>;

  // Singleton pattern
  static readonly globalInstance = new QueryEngine();

  // Core execution methods
  execute<K extends QueryKey>(
    queryKey: K,
    matches: QueryMatch[],
    context: QueryExecutionContext
  ): Promise<UnifiedQueryResultMap[K][]>

  executeMultiple<K extends QueryKey>(
    queryKeys: K[],
    matches: QueryMatch[],
    context: QueryExecutionContext
  ): Promise<Partial<Record<K, UnifiedQueryResultMap[K][]>>>

  executeForLanguage(
    language: SupportedLanguage,
    matches: QueryMatch[],
    context: QueryExecutionContext
  ): Promise<QueryExecutionResult>

  executeByPriority<K extends QueryKey>(
    queryKeys: K[],
    matches: QueryMatch[],
    context: QueryExecutionContext,
    minPriority: number
  ): Promise<Partial<Record<K, UnifiedQueryResultMap[K][]>>>
}
```

**Key Features:**
- Query registration and validation with type safety
- Performance monitoring and metrics collection
- Multi-execution strategies (parallel, conditional, priority-based)
- Language-specific filtering and execution
- Global singleton instance for easy access

### 2. QueryResultMap (`src/core/QueryResultMap.ts`)

The central type system managing all query result mappings with complete type safety.

```typescript
// Language-specific result mappings
export interface TypeScriptQueryResultMap {
  "ts-import-sources": ImportSourceResult;
  "ts-named-imports": NamedImportResult;
  "ts-default-imports": DefaultImportResult;
  "ts-type-imports": TypeImportResult;
  "ts-export-declarations": ExportDeclarationResult;
  "ts-export-assignments": ExportAssignmentResult;
}

export interface JavaQueryResultMap {
  "java-import-sources": JavaImportSourceResult;
  "java-import-statements": JavaImportStatementResult;
  "java-wildcard-imports": JavaWildcardImportResult;
  "java-static-imports": JavaStaticImportResult;
  "java-class-declarations": JavaClassDeclarationResult;
  "java-interface-declarations": JavaInterfaceDeclarationResult;
  "java-enum-declarations": JavaEnumDeclarationResult;
  "java-method-declarations": JavaMethodDeclarationResult;
}

export interface PythonQueryResultMap {
  "python-import-sources": PythonImportSourceResult;
  "python-import-statements": PythonImportStatementResult;
  "python-from-imports": PythonFromImportResult;
  "python-import-as": PythonImportAsResult;
  "python-function-definitions": PythonFunctionDefinitionResult;
  "python-class-definitions": PythonClassDefinitionResult;
  "python-variable-definitions": PythonVariableDefinitionResult;
  "python-method-definitions": PythonMethodDefinitionResult;
}

// Unified type system
export interface UnifiedQueryResultMap extends
  TypeScriptQueryResultMap,
  JavaQueryResultMap,
  PythonQueryResultMap {
}

export type QueryKey = keyof UnifiedQueryResultMap;
export type QueryResult<K extends QueryKey> = UnifiedQueryResultMap[K];
```

**Design Goals:**
- **Complete Type Safety**: Every query key maps to exactly one result type
- **Language Namespacing**: Clear separation between language-specific queries
- **Extensibility**: New languages extend the unified map through interface merging
- **IntelliSense**: Full IDE support for query keys and result types with autocomplete

### 3. CustomKeyMapping (`src/mappers/CustomKeyMapper.ts`)

User-friendly abstraction layer for query composition with full type safety.

```typescript
type CustomKeyMapping = Record<string, QueryKey>;

class CustomKeyMapping {
  static createMapper<T extends CustomKeyMapping>(
    mapping: T
  ): CustomKeyMapper<T>
}

class CustomKeyMapper<T extends CustomKeyMapping> {
  private mapping: T;
  private engine: QueryEngine;

  async execute(
    matches: QueryMatch[],
    context: QueryExecutionContext
  ): Promise<{
    [K in keyof T]: UnifiedQueryResultMap[T[K]][]
  }>

  getMapping(): T
  getUserKeys(): (keyof T)[]
  getQueryKeys(): T[keyof T][]
  validate(): ValidationResult
}
```

**Features:**
- User-defined key names with full type preservation
- Validation against registered queries
- Type-safe execution results with mapped keys
- Built-in validation and error handling

### 4. Language-Specific Query Modules

Each language has isolated query implementations with consistent structure:

```
src/queries/
├── typescript/
│   ├── imports.ts    # TypeScript import analysis (6 queries)
│   ├── exports.ts    # TypeScript export analysis (2 queries)
│   └── index.ts      # Unified TypeScript query registration
├── java/
│   ├── imports.ts    # Java import statements (4 queries)
│   ├── exports.ts    # Java class/interface/enum/method declarations (4 queries)
│   └── index.ts      # Unified Java query registration
└── python/
    ├── imports.ts    # Python import statements (4 queries)
    ├── exports.ts    # Python function/class/variable/method definitions (4 queries)
    └── index.ts      # Unified Python query registration
```

**Query Registration Pattern:**
```typescript
// Each language index.ts follows this pattern
export const {language}Queries = {
  ...{language}ImportQueries,
  ...{language}ExportQueries,
} as const;

export function register{Language}Queries(engine: QueryEngine): void {
  Object.entries({language}Queries).forEach(([key, query]) => {
    engine.register(key as QueryKey, query);
  });
}
```

**Query Function Structure:**
```typescript
interface QueryFunction<TResult extends BaseQueryResult> {
  name: string;
  description: string;
  query: string;                    // Tree-sitter query string
  resultType: QueryKey;
  languages: SupportedLanguage[];
  priority: number;
  processor: (matches: QueryMatch[], context: QueryExecutionContext) => TResult[];
}
```

## Data Flow Architecture

### 1. AST Input Pipeline

```
Source Code → Tree-sitter Parser → ASTNode → QueryExecutionContext
```

**Key Types:**
```typescript
interface ASTNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: ASTNode[];
}

interface QueryExecutionContext {
  sourceCode: string;
  language: SupportedLanguage;
  filePath: string;
  astNode: ASTNode;
}
```

### 2. Query Execution Pipeline

```
QueryExecutionContext → Query Selection → Tree-sitter Matching → Result Processing → Typed Results
```

**Execution Flow:**
1. **Query Registry Lookup**: Find registered query function
2. **Language Validation**: Verify query supports target language
3. **Tree-sitter Execution**: Execute query against AST
4. **Result Processing**: Transform matches to typed results
5. **Validation**: Ensure result integrity
6. **Performance Tracking**: Record execution metrics

### 3. Result Type System

```typescript
// Base result interface
interface BaseQueryResult {
  queryName: QueryKey;
  location: ExtendedSourceLocation;
  nodeText: string;
}

// Language-specific results extend base
interface ImportSourceResult extends BaseQueryResult {
  queryName: "ts-import-sources";
  source: string;
  isRelative: boolean;
  fileExtension?: string;
  importType: "static" | "dynamic";
}
```

## Type Safety Implementation

### 1. Strict Type Mapping

Every query key maps to exactly one result type:

```typescript
interface TypeScriptQueryResultMap {
  "ts-import-sources": ImportSourceResult;
  "ts-named-imports": NamedImportResult;
  "ts-default-imports": DefaultImportResult;
  "ts-type-imports": TypeImportResult;
  "ts-export-declarations": ExportDeclarationResult;
  "ts-export-assignments": ExportAssignmentResult;
}
```

### 2. Type Inference Chain

```typescript
// Automatic type inference throughout the pipeline
const results = await executeQuery("ts-import-sources", matches, context);
// results: ImportSourceResult[] (automatically inferred)

const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources" as const,
  exports: "ts-export-declarations" as const
});
// mapping: CustomKeyMapper<{imports: "ts-import-sources", exports: "ts-export-declarations"}>
```

### 3. Compile-Time Validation

```typescript
// Compile-time error if query key doesn't exist
const results = await executeQuery("invalid-query", matches, context);
// TypeScript Error: Argument of type '"invalid-query"' is not assignable to parameter of type 'QueryKey'

// Compile-time error if mapping is invalid
const mapping = CustomKeyMapping.createMapper({
  imports: "non-existent-query"  // TypeScript Error
});
```

## Performance Architecture

### 1. Parallel Execution Strategy

```typescript
// Queries execute in parallel when possible
const results = await engine.executeMultiple([
  "ts-import-sources",
  "ts-export-declarations",
  "ts-type-imports"
], matches, context);
// All three queries execute concurrently
```

### 2. Performance Monitoring

```typescript
interface QueryPerformanceMetrics {
  executionTime: number;
  matchCount: number;
  resultCount: number;
  errorCount: number;
}

// Automatic performance tracking
const metrics = engine.getPerformanceMetrics("ts-import-sources");
// Returns array of last 100 execution metrics
```

### 3. Caching Strategy

- **Query Function Caching**: Query functions cached after registration
- **Result Validation Caching**: Validation rules cached per query type
- **Performance Metrics**: Rolling window of recent performance data

## Extensibility Architecture

### 1. Adding New Languages

**Step 1: Define Result Types**
```typescript
// src/results/rust.ts
export interface RustQueryResultMap {
  "rust-use-declarations": RustUseDeclarationResult;
  "rust-struct-definitions": RustStructDefinitionResult;
  "rust-impl-blocks": RustImplBlockResult;
}
```

**Step 2: Create Query Modules**
```typescript
// src/queries/rust/imports.ts
export const rustUseDeclarations: QueryFunction<RustUseDeclarationResult> = {
  name: "rust-use-declarations",
  description: "Extract Rust use declarations",
  query: "(use_declaration) @use",
  resultType: "rust-use-declarations",
  languages: ["rust"],
  priority: 90,
  processor: processRustUseDeclarations
};
```

**Step 3: Extend Unified Map**
```typescript
// src/results/index.ts
export interface UnifiedQueryResultMap extends
  TypeScriptQueryResultMap,
  JavaQueryResultMap,
  PythonQueryResultMap,
  RustQueryResultMap {  // Add new language
}
```

### 2. Adding New Query Types

```typescript
// New query function
export const customAnalysis: QueryFunction<CustomAnalysisResult> = {
  name: "ts-custom-analysis",
  description: "Custom TypeScript analysis",
  query: "(custom_pattern) @custom",
  resultType: "ts-custom-analysis",
  languages: ["typescript"],
  priority: 50,
  processor: processCustomAnalysis
};

// Register with engine
engine.register("ts-custom-analysis", customAnalysis);
```

### 3. Framework Integration Patterns

**Webpack Plugin Example:**
```typescript
class ASTAnalysisPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap('ASTAnalysis', (compilation) => {
      // Use library for dependency analysis
      const dependencies = await executeQuery("ts-import-sources", matches, context);
      // Process dependencies...
    });
  }
}
```

**ESLint Rule Integration:**
```typescript
const rule: Rule.RuleModule = {
  create(context) {
    return {
      Program(node) {
        // Use library for AST analysis
        const exports = await executeQuery("ts-export-declarations", matches, context);
        // Validate exports...
      }
    };
  }
};
```

## Quality Architecture

### 1. Validation System

```typescript
// Query result validation
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Automatic validation on query execution
const results = await engine.execute("ts-import-sources", matches, context);
// Results automatically validated before return
```

### 2. Error Handling Strategy

```typescript
// Comprehensive error handling
try {
  const results = await engine.execute("ts-import-sources", matches, context);
} catch (error) {
  if (error instanceof QueryNotFoundError) {
    // Query not registered
  } else if (error instanceof LanguageNotSupportedError) {
    // Language not supported for query
  } else if (error instanceof ValidationError) {
    // Result validation failed
  }
}
```

### 3. Testing Architecture

**Current Test Structure (v3.0.0):**
```
tests/
├── real-ast-pipeline.test.ts        # Real tree-sitter integration with TypeScript/JavaScript
├── multi-language-verification.test.ts  # Cross-language query compatibility
├── ast-pipeline.test.ts             # Core pipeline and query composition testing
```

**Test Categories:**
- **Real AST Pipeline Tests**: Actual tree-sitter integration with TypeScript and JavaScript parsers
- **Multi-Language Verification**: Cross-language compatibility and query pattern testing
- **Type Safety Tests**: Complete TypeScript compilation and type inference validation
- **Pipeline Concept Tests**: Core QueryResultMap-centric architecture validation
- **Query Registry Tests**: Query registration, validation, and execution testing

**Key Testing Features:**
- **Tree-sitter Integration**: Tests use actual tree-sitter parsers for realistic AST processing
- **Type Safety Validation**: All tests ensure complete type inference without `any` types
- **Cross-Language Testing**: Validates consistent patterns across TypeScript, Java, and Python
- **Performance Validation**: Query execution timing and resource usage verification
- **Custom Mapping Tests**: Validates user-defined key mapping functionality

## Migration Architecture

### 1. Backward Compatibility

```typescript
// Legacy compatibility mapping
export const legacyCompatibilityMapping = CustomKeyMapping.createMapper({
  "import-sources": "ts-import-sources",
  "named-imports": "ts-named-imports",
  "default-imports": "ts-default-imports",
  "type-imports": "ts-type-imports"
});
```

### 2. Version Migration Paths

**v1.x → v3.x:**
```typescript
// Old API
const analyzer = new TypeScriptAnalyzer();
const results = analyzer.extractImports(sourceCode);

// New API equivalent
const results = await executeQuery("ts-import-sources", matches, context);
```

**v2.x → v3.x:**
```typescript
// Old engine-based approach
const engine = new AnalysisEngine();
const results = engine.analyze(sourceCode, { language: "typescript" });

// New query-based approach
const results = await globalQueryEngine.executeForLanguage("typescript", matches, context);
```

## Future Architecture Considerations

### 1. Planned Language Support
- **Rust**: Use declarations, struct definitions, impl blocks
- **Go**: Import statements, struct definitions, function declarations
- **C++**: Include directives, class definitions, function declarations
- **C#**: Using directives, class definitions, method declarations

### 2. Advanced Features
- **Incremental Analysis**: Only re-analyze changed files
- **Cross-File Analysis**: Inter-file dependency tracking
- **Semantic Analysis**: Beyond syntactic to semantic understanding
- **Language Server Integration**: LSP-based analysis capabilities

### 3. Performance Optimizations
- **Tree-sitter Query Caching**: Cache compiled queries
- **Result Streaming**: Stream results for large files
- **Memory Management**: Optimize AST memory usage
- **Parallel File Processing**: Multi-file analysis parallelization

## API Design Patterns

### 1. Type-Safe Query Execution

```typescript
// Automatic type inference throughout the pipeline
const results = await engine.execute("ts-import-sources", matches, context);
// results: ImportSourceResult[] (automatically inferred)

// Custom mapping with preserved types
const mapping = CustomKeyMapping.createMapper({
  imports: "ts-import-sources" as const,
  exports: "ts-export-declarations" as const
});
// mapping: CustomKeyMapper<{imports: "ts-import-sources", exports: "ts-export-declarations"}>
```

### 2. Language Extension Pattern

```typescript
// 1. Define result types
export interface RustQueryResultMap {
  "rust-use-declarations": RustUseDeclarationResult;
  "rust-struct-definitions": RustStructDefinitionResult;
}

// 2. Create query functions
export const rustUseDeclarations: QueryFunction<RustUseDeclarationResult> = {
  name: "rust-use-declarations",
  description: "Extract Rust use declarations",
  query: "(use_declaration) @use",
  resultType: "rust-use-declarations",
  languages: ["rust"],
  priority: 90,
  processor: processRustUseDeclarations
};

// 3. Extend unified map (automatic through module augmentation)
declare module "../../core/QueryResultMap" {
  interface UnifiedQueryResultMap extends RustQueryResultMap {}
}
```

### 3. Performance Optimization Patterns

```typescript
// Parallel execution by default
const results = await engine.executeMultiple([
  "ts-import-sources",
  "ts-export-declarations",
  "java-class-declarations"
], matches, context);

// Priority-based filtering
const criticalResults = await engine.executeByPriority(
  allQueries,
  matches,
  context,
  80 // minimum priority
);

// Language-specific optimization
const tsResults = await engine.executeForLanguage("typescript", matches, context);
```

## Quality Assurance

### 1. Type Safety Enforcement

- **Zero `any` Types**: Complete elimination of `any` types throughout the codebase
- **Strict TypeScript**: `strict: true` with all strict flags enabled
- **Type Inference**: Full automatic type inference for all query results
- **Interface Segregation**: Clean separation between language-specific and core types

### 2. Code Quality Standards

- **Linting**: Biome linter with strict rules for code quality and consistency
- **Formatting**: Automatic code formatting with Biome formatter
- **Import Organization**: Automatic import sorting and organization
- **Unused Code Detection**: Automatic detection and removal of unused imports and parameters

### 3. Testing Standards

- **Real AST Integration**: All tests use actual tree-sitter parsers for realistic scenarios
- **Type Safety Validation**: Tests ensure complete type inference without compromises
- **Multi-Language Coverage**: Comprehensive testing across all supported languages
- **Performance Benchmarks**: Query execution timing and resource usage validation

## Version 3.0.0 Architectural Improvements

### 1. Complete Restructure

- **QueryResultMap-Centric**: Complete redesign around unified type system
- **Language Namespacing**: Clear separation and namespacing for all language queries
- **Type Safety**: Elimination of all `any` types for complete type safety
- **Performance**: Optimized query execution with parallel processing capabilities

### 2. Enhanced Developer Experience

- **Global Instance**: Convenient `QueryEngine.globalInstance` for easy access
- **Custom Key Mapping**: User-friendly abstraction with full type preservation
- **Comprehensive Validation**: Built-in validation for queries, mappings, and execution context
- **Rich Metrics**: Performance monitoring and execution metrics collection

### 3. Production Readiness

- **Clean Codebase**: Removal of legacy code and outdated test files
- **Comprehensive Documentation**: Complete usage guides, architecture documentation, and examples
- **Quality Assurance**: Strict linting, formatting, and testing standards
- **Multi-Language Support**: Full support for TypeScript, Java, and Python with consistent patterns

This architecture provides a solid foundation for scalable, type-safe, multi-language AST analysis while maintaining excellent performance, developer experience, and extensibility for future language additions.