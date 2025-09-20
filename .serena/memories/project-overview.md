# TypeScript Dependency Linker - Project Overview

## Purpose
Advanced TypeScript/TSX analysis tool with dual CLI and API interface. Multi-language AST-based code analysis framework with extensible plugin architecture, currently supporting TypeScript, Go, Java, and Python through tree-sitter parsing.

## Key Features
- **Dual Interface**: Complete CLI tool + programmatic API
- **High Performance**: <10ms analysis time, <200ms per file
- **Multi-language Support**: TypeScript, Go, Java, Python via tree-sitter
- **Comprehensive Analysis**: Dependencies, imports, exports, source locations
- **Advanced Caching**: Multi-tier caching with memory and file storage
- **Plugin Architecture**: Extensible data extraction and interpretation plugins

## Current State (Feature 005)
- **Branch**: 005- (test optimization phase)
- **Main Issues**: 309 tests with 23 failures, 3.17s execution time
- **Optimization Goals**: <1.5s execution, >99% pass rate, ~250 tests
- **Technical Focus**: Parser registry optimization, shared utilities, behavior-driven testing

## Architecture Components
```
AnalysisEngine (coordinator)
├── ParserRegistry (language-specific parsers)
├── ExtractorRegistry (data extraction plugins)  
├── InterpreterRegistry (data processing plugins)
└── CacheManager (AST and result caching)
```

## Three-Module Flow
1. **Code Parser**: Language detection → AST generation → Caching
2. **Data Extraction**: AST traversal → Information extraction (pluggable)
3. **Data Interpretation**: Analysis-specific processing → Results (pluggable)

## Performance Targets
- Parse: <200ms per file
- Memory: <100MB per session
- Cache hit rate: >80%
- Concurrency: 10 parallel analyses