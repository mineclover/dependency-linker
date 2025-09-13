# Core Logic and Architecture

## Overview

TypeScript Dependency Linker is built on a layered architecture that provides both command-line interface (CLI) and programmatic API access. The system uses tree-sitter for high-performance TypeScript/TSX parsing and analysis.

## Architecture Layers

### 1. Core Layer (`src/core/`)
The foundation of the system, providing the essential parsing and analysis capabilities:

- **Parser**: Tree-sitter based TypeScript/TSX parser
- **Analyzer**: Core dependency extraction and AST traversal logic
- **Error Recovery**: Robust error handling with partial parsing support

### 2. Service Layer (`src/services/`)
Business logic and advanced features:

- **Dependency Resolution**: Resolves and categorizes dependencies (external/internal)
- **Cache Management**: Multi-tier caching system for performance optimization
- **Batch Processing**: Concurrent file analysis with resource monitoring

### 3. API Layer (`src/api/`)
Programmatic interface for integration:

- **TypeScriptAnalyzer**: Main class-based API with dependency injection
- **BatchAnalyzer**: Advanced batch processing with concurrency control
- **Factory Functions**: Simple function-based API for quick integration
  - `analyzeTypeScriptFile()`
  - `extractDependencies()`
  - `getBatchAnalysis()`

### 4. CLI Layer (`src/cli/`)
Command-line interface:

- **CommandParser**: Parses command-line arguments and options
- **CLIAdapter**: Bridges CLI commands to API calls
- **analyze-file**: Main CLI entry point

## Data Flow

```
User Input (CLI/API)
    ↓
Input Validation
    ↓
File Reading
    ↓
Tree-sitter Parsing
    ↓
AST Traversal
    ↓
Dependency Extraction
    ↓
Result Formatting
    ↓
Output (JSON/Summary/Table)
```

## CLI to API Integration

The CLI and API layers are designed to work seamlessly together:

1. **CLI Entry**: User runs `./analyze-file <file> [options]`
2. **Command Parsing**: CommandParser extracts file path and options
3. **Adapter Layer**: CLIAdapter translates CLI options to API parameters
4. **API Call**: TypeScriptAnalyzer performs the actual analysis
5. **Result Formatting**: Output formatted based on user preference
6. **Display**: Results shown in terminal or saved to file

### Example Flow

```bash
./analyze-file src/component.tsx --format json --include-sources
```

Translates to:

```javascript
analyzer.analyzeFile('src/component.tsx', {
  format: 'json',
  includeSources: true
});
```

## Key Components

### TypeScriptAnalyzer
Main analysis engine with:
- File parsing and validation
- Dependency extraction
- Import/export analysis
- Error recovery mechanisms
- Caching support

### BatchAnalyzer
Handles multiple files with:
- Concurrency control (configurable workers)
- Progress tracking and events
- Resource monitoring
- Error aggregation

### Parser Service
Core parsing logic:
- Tree-sitter initialization
- AST generation
- Syntax error handling
- Performance optimization

## Performance Optimizations

1. **Multi-tier Caching**
   - Memory cache (LRU)
   - File system cache
   - Session-based cache

2. **Lazy Loading**
   - Tree-sitter grammars loaded on demand
   - Parser instances reused

3. **Batch Processing**
   - Concurrent file analysis
   - Worker pool management
   - Resource throttling

4. **Parse Optimization**
   - Incremental parsing for changes
   - Partial parsing on errors
   - AST node reuse

## Error Handling Strategy

The system implements a robust error recovery mechanism:

1. **Graceful Degradation**: Continue parsing despite syntax errors
2. **Partial Results**: Extract what's possible from broken code
3. **Error Context**: Provide detailed error information with location
4. **Fallback Strategies**: Multiple parsing approaches for edge cases

## Testing Architecture

Comprehensive test coverage across all layers:

- **Unit Tests** (`tests/unit/`): Individual component testing
  - `api/`: API layer components
  - `core/`: Core parsing and analysis logic
  - `models/`: Data models and structures
  - `services/`: Service layer functionality

- **Integration Tests** (`tests/integration/`): Cross-layer functionality
  - Dependency extraction workflows
  - Error handling scenarios
  - File analysis pipelines

- **Contract Tests** (`tests/contract/`): API/CLI contract validation
  - CLI command verification
  - API response formats
  - Backward compatibility

- **Performance Tests** (`tests/performance/`): Speed and resource benchmarks
  - Parse time measurements
  - Memory usage monitoring
  - Batch processing efficiency

## Extension Points

The architecture supports extensions through:

1. **Custom Analyzers**: Extend TypeScriptAnalyzer class
2. **Format Plugins**: Add new output formats
3. **Parser Enhancements**: Custom AST visitors
4. **Cache Strategies**: Implement custom caching logic

## Configuration

System behavior can be customized via:

- **API Options**: Pass configuration to analyzer instances
- **CLI Flags**: Command-line arguments for behavior modification
- **Environment Variables**: System-wide settings
- **Config Files**: Project-specific configurations (future)

## Best Practices

1. **Use Factory Functions** for simple use cases
2. **Leverage Caching** for repeated analyses
3. **Enable Batch Processing** for multiple files
4. **Handle Errors Gracefully** with try-catch blocks
5. **Monitor Resources** in production environments

## Future Enhancements

Planned improvements include:

- WebAssembly support for browser environments
- Incremental analysis for large projects
- Language server protocol (LSP) integration
- Real-time file watching and analysis
- Distributed analysis for monorepos