# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.1] - 2025-09-26

### Enhanced
- **LinkDependencyInterpreter**: Comprehensive refactoring and enhancement
  - 🏷️ **Smart Categorization**: Improved anchor link detection (#section links)
  - 🔍 **Precise Link Validation**: Enhanced BROKEN vs UNREACHABLE status logic
  - 🛡️ **Security Analysis**: Added blocked domain detection and suspicious link identification
  - ⚡ **Performance Monitoring**: Large file detection with configurable thresholds
  - ♿ **Accessibility Checks**: Image alt text validation and compliance checking
  - 📊 **Domain Analytics**: Intelligent domain grouping (docs.github.com → github.com)
  - 📈 **Link Density Analysis**: Improved links-per-line calculation
  - 🔧 **MIME Type Detection**: Enhanced file type identification with fallback
  - ⏱️ **High-Resolution Timing**: Switched to process.hrtime.bigint() for precise measurement
  - 🎯 **Comprehensive Issue Detection**: BROKEN_LINK, MISSING_FILE, SECURITY_RISK, PERFORMANCE_ISSUE, ACCESSIBILITY_ISSUE
  - 📋 **Smart Recommendations**: Improved singular/plural handling and context-aware suggestions

### Fixed
- Fixed category classification for anchor links (#section)
- Fixed link status logic for missing internal files (now correctly returns BROKEN)
- Fixed domain counting to properly group subdomains with parent domains
- Fixed link density calculation to use maximum line number
- Fixed recommendation message formatting (removed unnecessary pluralization)
- Fixed analysis timing measurement precision

### Technical
- All 16 LinkDependencyInterpreter tests now pass ✅
- No interface changes - full backward compatibility maintained
- Enhanced error handling and validation throughout
- Improved code documentation and type safety

## [2.3.0] - 2025-09-23

### Added
- **EnhancedExportExtractor**: Comprehensive TypeScript/JavaScript export analysis
  - Complete export classification (functions, classes, variables, types, enums)
  - Class member analysis with visibility detection
  - Re-export pattern support
  - Source location tracking
  - 100% test coverage (23/23 tests passing)

### Enhanced
- **Multi-Language Support**: Enhanced documentation for Go, Java, Markdown parsers
- **Package Publishing**: Updated to `@context-action/dependency-linker` scope
- **Tree-Shaking**: Verified modular architecture supports selective imports
- **Performance**: Optimized test execution and resource management

### Fixed
- Resolved all TypeScript compilation errors
- Fixed import/export issues across modules
- Enhanced build configuration with incremental builds
- Improved error handling and type safety

## [2.2.0] - 2025-09-21

### Added
- **Test Optimization Framework**: Complete framework for test analysis and optimization
  - TestAnalyzer for suite categorization
  - TestOptimizer for performance optimization
  - PerformanceTracker for benchmarking
  - TestDataFactory for test data generation

### Enhanced
- **Code Quality**: All TypeScript compilation errors resolved
- **Build System**: Incremental builds and optimized scripts
- **Dependencies**: Clean dependency tree, no unused imports

### Fixed
- Missing benchmark helper utilities
- Build configuration optimization
- Proper error handling and type safety

## [2.1.0] - 2025-09-20

### Added
- **Enhanced Dependency Analysis**: Named import usage tracking with dead code detection
- **Tree-shaking Optimization**: Bundle size reduction recommendations
- **Usage Pattern Analysis**: Method call frequency and dependency utilization metrics

### Enhanced
- **CLI Interface**: Improved command-line options and help system
- **Performance**: <200ms per file analysis with optimized caching
- **Documentation**: Comprehensive examples and integration guides

## [2.0.0] - 2025-09-15

### Major Release
- **Multi-Language Architecture**: Support for TypeScript, Go, Java, Markdown
- **Plugin System**: Extensible extractors and interpreters
- **Advanced Caching**: Multi-tier caching with memory and file storage
- **Batch Processing**: Concurrent analysis with resource monitoring
- **CLI Tool**: Complete command-line interface

### Breaking Changes
- Restructured package architecture for modularity
- Updated API interfaces for consistency
- Changed configuration format for enhanced flexibility

### Added
- TypeScript analyzer with dependency injection
- Factory functions for simple API usage
- Event system for progress tracking
- Multiple output formats (JSON, CSV, table, tree)

### Performance
- Parse time: <200ms per file
- Memory usage: <100MB per session
- Cache hit rate: >80%
- Concurrency: 10 parallel analyses

## [1.0.0] - 2025-09-01

### Initial Release
- Basic TypeScript dependency analysis
- AST-based parsing with tree-sitter
- Simple CLI interface
- JSON output format
- File-based caching