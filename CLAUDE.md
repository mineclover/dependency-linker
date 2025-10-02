# Multi-Language Dependency Linker - Claude Code Context

## Project Overview
Query-based AST analysis library with QueryResultMap-centric architecture. TypeScript-first multi-language AST analysis framework supporting TypeScript, JavaScript, Java, Python, and Go through tree-sitter parsers.

## Current Architecture (v3.0.0)
- **Version**: 3.0.0
- **Language**: TypeScript 5.x, Node.js 18+
- **Architecture**: QueryResultMap-centric with type-safe query system
- **Dependencies**: tree-sitter with language-specific parsers
- **Testing**: Jest with 82+ passing tests
- **Type Safety**: Zero `any` types, complete type inference

## Core Components
```
QueryEngine (central coordinator)
├── QueryResultMap (unified type system)
├── TreeSitterQueryEngine (tree-sitter execution)
├── QueryBridge (parser-query integration)
├── ParserFactory (parser creation)
├── ParserManager (parser caching & high-level APIs)
└── CustomKeyMapper (user-friendly query composition)
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
- **Parser Initialization**: Automatic parser registration via `initializeAnalysisSystem()`
- **Type Safety**: Fixed `GraphRelationship.sourceFile` optional field
- **Export Structure**: Cleaned up duplicate exports and resolved naming conflicts
- **Import Paths**: Corrected module import paths (`ParseResult` from `parsers/base`)
- **Test Coverage**: Core parser and query tests at 100% pass rate

## System Capabilities
- **Multi-Language Support**: TypeScript, TSX, JavaScript, JSX, Java, Python, Go
- **Graph Database**: SQLite-based code relationship storage with circular dependency detection
- **Inference System**: Hierarchical, transitive, and inheritable edge type inference
- **Custom Queries**: User-defined key mapping with type-safe execution
- **Performance Tracking**: Built-in metrics and benchmarking

## Code Quality Status
- **TypeScript**: Strict mode enabled, zero `any` types
- **Type Safety**: Complete type inference throughout query pipeline
- **Build System**: Incremental builds with type checking
- **Linting**: Biome with strict rules
- **Testing**: 82+ passing tests with core systems at 100%

## Package Distribution
- **Name**: `@context-action/dependency-linker`
- **Version**: 3.0.0
- **Architecture**: QueryResultMap-centric with type safety
- **Supported Languages**: TypeScript, JavaScript, Java, Python, Go
- **Module System**: ESM with tree-shaking support
- **CLI Tools**: `analyze-file` for single-file analysis

## Key Design Patterns
- **Singleton**: `globalQueryEngine`, `globalParserFactory`, `globalTreeSitterQueryEngine`
- **Factory**: `ParserFactory` for language-specific parser creation
- **Builder**: `DependencyGraphBuilder` for graph construction
- **Strategy**: Query processors for language-specific result processing

---
*Updated - 2025-10-02*