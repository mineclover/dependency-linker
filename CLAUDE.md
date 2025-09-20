# TypeScript Dependency Linker - Claude Code Context

## Project Overview
Multi-language AST-based code analysis framework with extensible plugin architecture. Refactoring existing TypeScript dependency analysis to support Go, Java, Python, and custom analysis types.

## Current Architecture (Feature 004)
- **Language**: TypeScript 5.x, Node.js 18+
- **Dependencies**: tree-sitter, tree-sitter-typescript, tree-sitter-go, tree-sitter-java
- **Testing**: Jest with integration test suite
- **Storage**: File-based caching with JSON serialization
- **Type**: Single library project with plugin system

## Core Components
```
AnalysisEngine (coordinator)
├── ParserRegistry (language-specific parsers)
├── ExtractorRegistry (data extraction plugins)
├── InterpreterRegistry (data processing plugins)
└── CacheManager (AST and result caching)
```

## Plugin Architecture
- `IDataExtractor<T>`: Extract specific data from AST (dependencies, identifiers, etc.)
- `IDataInterpreter<TInput, TOutput>`: Process extracted data for analysis
- `LanguageParser`: Language-specific tree-sitter wrapper

## Three-Module Flow
1. **Code Parser**: Language detection → AST generation → Caching
2. **Data Extraction**: AST traversal → Information extraction (pluggable)
3. **Data Interpretation**: Analysis-specific processing → Results (pluggable)

## Key Interfaces
- `IAnalysisEngine`: Main coordination interface
- `ILanguageParser`: Multi-language AST parsing
- `IDataExtractor<T>`: Plugin for data extraction
- `IDataInterpreter<TInput, TOutput>`: Plugin for data interpretation

## Performance Targets
- Parse: <200ms per file
- Memory: <100MB per session
- Cache hit rate: >80%
- Concurrency: 10 parallel analyses

## Recent Changes (005-test-optimization)
- **Testing Issues Identified**: 309 tests with 23 failures, 3.17s execution time
- **Optimization Strategy**: Three-tier categorization (Critical/Optimize/Remove)
- **Performance Targets**: <1.5s execution, >99% pass rate, ~250 tests
- **Technical Focus**: Parser registry optimization, shared utilities, behavior-driven testing

## Test Optimization Status
- **Current State**: 309 tests (23 failed), 3.17s execution, worker exit issues
- **Target State**: ~250 tests, <1.5s execution, >99% reliability
- **Key Issues**: Parser registration warnings, flaky tests, complex setup/teardown
- **Optimization Areas**: Duplicate consolidation, shared utilities, behavior focus

## Next Phase
Ready for `/tasks` command to generate test optimization implementation tasks.

---
*Auto-generated from specs/005-test-optimization/plan.md*