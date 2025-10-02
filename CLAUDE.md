# Multi-Language Dependency Linker - Claude Code Context

## Project Overview
Query-based AST analysis library with QueryResultMap-centric architecture. TypeScript-first multi-language AST analysis framework supporting TypeScript, JavaScript, Java, Python, and Go through tree-sitter parsers.

## Current Architecture (v3.0.0)
- **Version**: 3.0.0
- **Language**: TypeScript 5.x, Node.js 18+
- **Architecture**: QueryResultMap-centric with type-safe query system + Namespace integration
- **Dependencies**: tree-sitter with language-specific parsers
- **Testing**: Jest with 82+ passing tests
- **Type Safety**: Zero `any` types, complete type inference
- **Namespace System**: Glob-based file organization with batch dependency analysis

## Core Components
```
QueryEngine (central coordinator)
├── QueryResultMap (unified type system)
├── TreeSitterQueryEngine (tree-sitter execution)
├── QueryBridge (parser-query integration)
├── ParserFactory (parser creation)
├── ParserManager (parser caching & high-level APIs)
└── CustomKeyMapper (user-friendly query composition)

Namespace Module (file organization)
├── ConfigManager (namespace configuration)
├── FilePatternMatcher (glob pattern matching)
├── NamespaceDependencyAnalyzer (batch analysis)
├── NamespaceGraphDB (GraphDB integration)
└── CLI (namespace-analyzer tool)
```

## Query-Based Architecture
- **QueryResultMap**: Central type system with language-namespaced queries (ts-*, java-*, python-*)
- **QueryEngine**: Type-safe query execution with automatic inference
- **TreeSitterQueryEngine**: Direct tree-sitter query execution
- **QueryBridge**: Seamless tree-sitter ↔ processor integration
- **CustomKeyMapper**: User-defined key mapping with full type preservation

## Three-Layer Architecture
1. **Parser Layer**: Language detection → AST generation via tree-sitter
2. **Query Layer**: Tree-sitter queries → QueryMatch generation
3. **Processor Layer**: Type-safe result processing → Structured output

## Key Interfaces
- `QueryKey`: Typed query identifier from UnifiedQueryResultMap
- `QueryResult<K>`: Automatically inferred result type for query K
- `QueryExecutionContext`: Execution environment (AST, language, source)
- `CustomKeyMapping`: User-friendly query composition system

## Performance Targets
- Parse: <200ms per file
- Memory: <100MB per session
- Cache hit rate: >80%
- Concurrency: 10 parallel analyses

## Recent Architecture Improvements (2025-10-02)

### Phase 1: Core System Stabilization
- **Parser Initialization**: Automatic parser registration via `initializeAnalysisSystem()`
- **Type Safety**: Fixed `GraphRelationship.sourceFile` optional field
- **Export Structure**: Cleaned up duplicate exports and resolved naming conflicts
- **Import Paths**: Corrected module import paths (`ParseResult` from `parsers/base`)
- **Test Coverage**: Core parser and query tests at 100% pass rate

### Phase 2: Namespace Integration (2025-10-02)
- **Namespace System**: Integrated namespace-based file organization from deps-cli
- **Batch Analysis**: NamespaceDependencyAnalyzer for analyzing multiple files by namespace
- **CLI Tool**: Complete namespace-analyzer CLI with 8 commands (list, create, delete, analyze, query)
- **GraphDB Integration**: NamespaceGraphDB for storing namespace-tagged dependency data
- **Glob Patterns**: FilePatternMatcher with include/exclude pattern support
- **Test Results**: 76 files analyzed with 95% feature pass rate (42/44 tests passed)
- **Issue #1 Fixed**: Edge detection working (0 → 153 edges) - file content reading added
- **Issue #2 Fixed**: Safe database re-initialization with IF NOT EXISTS clauses
- **Production Status**: ✅ All critical issues resolved, system production-ready

## System Capabilities
- **Multi-Language Support**: TypeScript, TSX, JavaScript, JSX, Java, Python, Go
- **Graph Database**: SQLite-based code relationship storage with circular dependency detection
- **Namespace Organization**: Glob-based file grouping with batch dependency analysis
- **Inference System**: Hierarchical, transitive, and inheritable edge type inference
- **Custom Queries**: User-defined key mapping with type-safe execution
- **Performance Tracking**: Built-in metrics and benchmarking
- **CLI Tools**: Single-file analysis and namespace batch operations

## Code Quality Status
- **TypeScript**: Strict mode enabled, zero `any` types
- **Type Safety**: Complete type inference throughout query pipeline
- **Build System**: Incremental builds with type checking
- **Linting**: Biome with strict rules
- **Testing**: 82+ passing tests with core systems at 100%

## Package Distribution
- **Name**: `@context-action/dependency-linker`
- **Version**: 3.0.0
- **Architecture**: QueryResultMap-centric with type safety + Namespace integration
- **Supported Languages**: TypeScript, JavaScript, Java, Python, Go
- **Module System**: ESM with tree-shaking support
- **CLI Tools**: `analyze-file` (single-file), `namespace-analyzer` (batch operations)

## Key Design Patterns
- **Singleton**: `globalQueryEngine`, `globalParserFactory`, `globalTreeSitterQueryEngine`
- **Factory**: `ParserFactory` for language-specific parser creation
- **Builder**: `DependencyGraphBuilder` for graph construction
- **Strategy**: Query processors for language-specific result processing

---
*Updated - 2025-10-02*