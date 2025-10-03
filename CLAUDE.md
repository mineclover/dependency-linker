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

## Recent Architecture Improvements

### Phase 1: Core System Stabilization
- **Parser Initialization**: Automatic parser registration via `initializeAnalysisSystem()`
- **Type Safety**: Fixed `GraphRelationship.sourceFile` optional field
- **Export Structure**: Cleaned up duplicate exports and resolved naming conflicts
- **Import Paths**: Corrected module import paths (`ParseResult` from `parsers/base`)
- **Test Coverage**: Core parser and query tests at 100% pass rate

### Phase 2: Namespace Integration (2025-10-02)
- **Namespace System**: Integrated namespace-based file organization from deps-cli
- **Batch Analysis**: NamespaceDependencyAnalyzer for analyzing multiple files by namespace
- **CLI Tool**: Complete namespace-analyzer CLI with 9 commands (list, create, delete, analyze, query, cross-namespace)
- **GraphDB Integration**: NamespaceGraphDB for storing namespace-tagged dependency data
- **Glob Patterns**: FilePatternMatcher with include/exclude pattern support
- **Test Results**: 76 files analyzed with 95% feature pass rate (42/44 tests passed)
- **Issue #1 Fixed**: Edge detection working (0 → 153 edges) - file content reading added
- **Issue #2 Fixed**: Safe database re-initialization with IF NOT EXISTS clauses
- **Issue #3 Implemented**: Cross-namespace dependency tracking (27 cross-deps detected)
  - Unified graph analysis with `analyzeAll()` method
  - Database storage with namespace metadata on edges
  - CLI commands for cross-namespace analysis and querying
- **Production Status**: ✅ All issues resolved (Issue #1, #2, #3), system production-ready

### Phase 3: Symbol Dependency Tracking (2025-10-03)
- **Symbol Extraction**: Fine-grained symbol-level dependency tracking for TypeScript/JavaScript
- **Dependency Types**: Call, Instantiation, TypeReference, Extends, Implements
- **Tree-sitter Queries**: 6 new dependency tracking queries added
  - `ts-call-expressions`: Function/method calls including super()
  - `ts-new-expressions`: Class instantiation (new operator)
  - `ts-member-expressions`: Property access patterns
  - `ts-type-references`: Type references in annotations
  - `ts-extends-clause`: Class inheritance
  - `ts-implements-clause`: Interface implementation
- **Multi-Capture Fix**: Fixed tree-sitter query processing to handle multiple captures per match
- **Test Coverage**: 9/9 dependency tracking tests passing with comprehensive validation
- **Production Status**: ✅ Symbol dependency tracking production-ready

### Phase 4: Markdown Dependency Tracking (2025-10-03)
- **Markdown Support**: Complete markdown dependency extraction and analysis system
- **Dependency Types**: Link, Image, WikiLink, SymbolReference, Include, CodeBlockReference, Anchor, Hashtag (8 types)
- **GraphDB Integration**: Markdown edge types with transitive relationship support
- **Pattern Extraction**: Regex-based extraction with front matter and heading structure support
- **Heading Symbols**: Headings as first-class symbols with semantic type tagging
  - Headings stored as `heading-symbol` nodes in GraphDB
  - File path + heading text forms unique symbol identifier
  - Semantic types defined via hashtags: `# API Design #architecture #design`
  - Multiple semantic types supported per heading
  - `md-contains-heading` hierarchical relationship from file to headings
- **Features**:
  - Standard markdown links: `[text](url)`
  - Images: `![alt](url)`
  - Wiki-style links: `[[target]]` or `[[target|text]]`
  - Symbol references: `@ClassName`, `@function()`
  - Code block file references: `` ```language:filepath ``
  - Include directives: `<!-- include:path -->`
  - Internal anchors: `[text](#anchor)`
  - Hashtags: `#tag`, `#태그` (inline tags without spaces)
  - Heading symbols: `# Heading Text #type1 #type2`
- **Test Coverage**: 19/19 markdown dependency tests passing (2 heading symbol tests)
- **Production Status**: ✅ Markdown dependency tracking production-ready with heading symbols and semantic tagging

### Phase 5: Namespace-based Semantic Tags (2025-10-03)
- **Namespace Integration**: Semantic tags automatically assigned based on namespace configuration
- **Configuration System**: Extended `NamespaceConfig` with `semanticTags?: string[]` field
- **Path-based Tagging**: Files matched by namespace patterns receive configured semantic tags
- **Database Integration**: NamespaceGraphDB stores and applies semantic tags during analysis
- **CLI Support**: Both `analyze` and `analyze-all` commands support semantic tag assignment
- **Example Tags**:
  - Source files (`src/**/*.ts`) → `["source", "production"]`
  - Test files (`tests/**/*.ts`) → `["test", "quality-assurance"]`
  - Config files (`*.config.*`) → `["config", "infrastructure"]`
  - Documentation (`docs/**/*.md`) → `["documentation", "knowledge"]`
- **Verification**: 158 nodes analyzed with semantic tags correctly applied across 4 namespaces
- **Production Status**: ✅ Namespace-semantic tags integration production-ready

## System Capabilities
- **Multi-Language Support**: TypeScript, TSX, JavaScript, JSX, Java, Python, Go, Markdown
- **Graph Database**: SQLite-based code relationship storage with circular dependency detection
- **Namespace Organization**: Glob-based file grouping with batch dependency analysis and semantic tag assignment
- **Symbol Dependency Tracking**: Fine-grained symbol-level relationships (calls, instantiation, inheritance, type refs)
- **Semantic Tags**: Path-based automatic tagging via namespace configuration for contextual classification
- **Inference System**: Hierarchical, transitive, and inheritable edge type inference
- **Custom Queries**: User-defined key mapping with type-safe execution
- **Performance Tracking**: Built-in metrics and benchmarking
- **CLI Tools**: Single-file analysis and namespace batch operations with semantic tagging
- **Markdown Analysis**: Complete markdown dependency tracking with 8 dependency types (including hashtags)
- **Symbol Tracking**: Fine-grained symbol-level dependency analysis for TypeScript/JavaScript

## Code Quality Status
- **TypeScript**: Strict mode enabled, zero `any` types
- **Type Safety**: Complete type inference throughout query pipeline
- **Build System**: Incremental builds with type checking
- **Linting**: Biome with strict rules
- **Testing**: 159 passing tests (146 existing + 13 markdown) with comprehensive coverage

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

## Documentation References
- **Type System**: [docs/type-system.md](docs/type-system.md) - Node and Edge type definitions, classification hierarchy, and type registry
- **Semantic Tags Guide**: [docs/semantic-tags.md](docs/semantic-tags.md) - Hierarchical tag system with 10 namespaced categories for contextual symbol classification

---
*Updated - 2025-10-03*