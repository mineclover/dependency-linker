# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-10-04

### 🚀 Namespace-Scenario Integration - Horizontal Scalability

**Major Feature**: Namespaces can now select analysis scenarios for true horizontal scalability.

### Added
- **🎯 Scenario System**: Reusable analysis specifications with type inheritance and execution lifecycle
  - Built-in scenarios: `basic-structure`, `file-dependency`, `symbol-dependency`, `markdown-linking`
  - Scenario dependencies: `extends` (type inheritance), `requires` (execution order)
  - Topological sort (Kahn's Algorithm) for automatic execution order calculation
  - BaseScenarioAnalyzer with beforeAnalyze/analyze/afterAnalyze hooks
  - Global registry with auto-initialization and type consistency validation

- **📋 Namespace-Scenario Integration**: Configure analysis scenarios per namespace
  - `scenarios` field in NamespaceConfig for scenario selection
  - `scenarioConfig` field for scenario-specific configuration
  - Default scenarios: `["basic-structure", "file-dependency"]` for backward compatibility
  - Automatic scenario execution order calculation based on dependencies

- **🔧 CLI Enhancements**: Complete scenario management commands
  - `scenarios` - List all available scenarios
  - `scenarios <namespace>` - Show namespace scenario configuration
  - `analyze --scenarios <list>` - Override scenarios for analysis
  - `analyze --scenario-config <json>` - Provide scenario-specific configuration
  - `create-namespace --scenarios <list>` - Create namespace with scenarios

- **📚 Configuration Examples**: 3 real-world configuration examples
  - Monorepo example (6 namespaces): web, mobile, backend, shared, docs, tests
  - Layered Architecture example (6 namespaces): presentation, application, domain, infrastructure, shared-kernel, tests
  - Multi-framework example (8 namespaces): React, Vue, Angular, Node.js, Python, Go, shared-types, documentation

- **📖 Comprehensive Documentation**: Complete user-facing documentation
  - `docs/namespace-scenario-guide.md` (805 lines): Complete integration guide
  - `docs/pipeline-overview.md`: Added "Scenario-Based Analysis" section
  - `docs/README.md`: Updated documentation index
  - Migration guide with backward compatibility explanation
  - Real-world examples, CLI usage, best practices, troubleshooting

### Changed
- **NamespaceConfig Interface**: Extended with `scenarios` and `scenarioConfig` fields
- **NamespaceDependencyAnalyzer**: Integrated ScenarioRegistry for scenario execution
  - Added `getScenarioExecutionOrder()` method
  - Added `scenariosExecuted` field to NamespaceDependencyResult
  - Automatic default scenario application for backward compatibility

- **ConfigManager**: Added scenario validation logic
  - `validateScenarios()` method for scenario ID validation
  - Integration with ScenarioRegistry for scenario lookup

### Technical
- **Test Coverage**: 37 integration tests for namespace-scenario integration
  - 12 tests: Phase 1 (Type Extensions)
  - 10 tests: Phase 2 (Analyzer Refactoring)
  - 15 tests: Phase 5 (Comprehensive Testing)
  - All tests passing with backward compatibility verification

- **Core Value**:
  - **Cost Optimization**: Run only necessary scenarios (e.g., `markdown-linking` for docs)
  - **Context-Based Analysis**: Same file analyzed differently per namespace
  - **Horizontal Scalability**: Add new analysis via configuration, not code changes

### Migration
- **Backward Compatible**: Existing configurations work without modification
- **Optional Feature**: `scenarios` field is optional, defaults to `["basic-structure", "file-dependency"]`
- **Gradual Migration**: Can mix old and new configurations in same project

## [3.0.0] - 2025-09-29

### 🚀 Major Release - Complete QueryResultMap-Centric Redesign

### Added
- **🎯 QueryResultMap-Centric Architecture**: Complete redesign around unified type system
- **🌐 Multi-Language Support**: Full support for TypeScript, Java, and Python
- **📋 TypeScript Queries**: 6 queries including imports, exports, and type analysis
- **☕ Java Queries**: 8 queries covering imports, classes, interfaces, enums, and methods
- **🐍 Python Queries**: 8 queries for imports, functions, classes, variables, and methods
- **🔧 Custom Key Mapping**: User-friendly abstraction with full type preservation
- **⚡ Global QueryEngine**: Singleton pattern with convenient global instance access
- **📊 Performance Monitoring**: Built-in execution metrics and performance tracking
- **🔍 Real AST Integration**: Actual tree-sitter parser integration for all languages
- **✅ Comprehensive Testing**: Multi-language verification and pipeline testing

### Changed
- **🔒 Complete Type Safety**: Eliminated all `any` types for maximum type safety
- **🏗️ Language Namespacing**: Clear separation and namespacing for all language queries
- **⚡ Parallel Execution**: Independent queries execute concurrently by default
- **🎼 Functional Architecture**: Pure functions with composable query operations
- **📚 Enhanced Documentation**: Complete usage guides, architecture docs, and examples

### Removed
- **🧹 Legacy Code Cleanup**: Removed outdated integration tests and compatibility layers
- **📁 Outdated Test Files**: Cleaned up legacy unit tests for old architecture
- **🗂️ Temporary Files**: Removed development artifacts and temporary test directories

### Technical
- **📦 Package**: Updated to `@context-action/dependency-linker` v3.0.0
- **🔧 Linting**: Biome linter with strict formatting and organization standards
- **🧪 Testing**: Real AST pipeline tests with actual tree-sitter parsers
- **📖 Documentation**: Updated README, USAGE, and ARCHITECTURE for new design

### Migration
- **Breaking Change**: Complete API redesign requires migration from v2.x
- **Type Safety**: All query results now have complete type inference
- **Global Access**: Use `QueryEngine.globalInstance` for convenient access
- **Language Support**: Update query keys to use language prefixes (ts-, java-, python-)

## [2.3.2] - 2025-09-26

### Documentation
- **Parser-Specific Organization**: Restructured documentation to group capabilities by language
  - 🔤 **TypeScript/JavaScript Stack**: Comprehensive dependency, export, and usage analysis
  - 📄 **Markdown Stack**: Link analysis with security, performance, and accessibility checks
  - ☕ **Java Stack**: Package analysis, class structure, and method tracking
  - 🐹 **Go Stack**: Module analysis, function tracking, and struct analysis
  - 🔄 **Cross-Language Features**: Unified interfaces and universal capabilities
- **Improved Structure**: Clear separation between language-specific and shared features
- **Better Navigation**: Enhanced organization for easier feature discovery
- **Practical Examples**: Language-specific usage examples and integration patterns

### Enhanced
- **Documentation Quality**: Consolidated and organized parser capabilities for better understanding
- **User Experience**: Clearer presentation of language-specific features and capabilities

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