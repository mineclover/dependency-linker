# Core Interfaces

Core interfaces that define the architecture and contracts for the TypeScript Dependency Linker system.

## Interface Overview

Based on test analysis from `tests/unit/core/interfaces/`, the system defines several key interfaces:

## IFileAnalyzer

**Purpose**: Defines the contract for file analysis operations

**Test Coverage** (from `IFileAnalyzer.test.ts`):
- File analysis with various options
- Error handling for invalid files
- Source location extraction
- Performance validation

```typescript
interface IFileAnalyzer {
  analyzeFile(filePath: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  analyzeSource(source: string, options?: SourceAnalysisOptions): Promise<AnalysisResult>;
  validateFile(filePath: string): Promise<ValidationResult>;
}
```

### Methods

#### `analyzeFile(filePath, options?)`

**Test Scenarios**:
- Basic file analysis with default settings
- Custom analysis options (includeSources, format)
- Error handling for non-existent files
- Performance benchmarks (< 10ms for typical files)

**Parameters**:
- `filePath: string` - Path to TypeScript/TSX file
- `options?: AnalysisOptions` - Analysis configuration

**Returns**: `Promise<AnalysisResult>`

#### `analyzeSource(source, options?)`

**Test Scenarios**:
- In-memory source code analysis
- Virtual file name handling
- Source mapping accuracy
- Syntax error recovery

**Parameters**:
- `source: string` - TypeScript source code
- `options?: SourceAnalysisOptions` - Source analysis options

#### `validateFile(filePath)`

**Test Scenarios**:
- File existence validation
- TypeScript syntax validation
- File type verification
- Access permission checks

**Returns**: `Promise<ValidationResult>`

## IOutputFormatter

**Purpose**: Defines output formatting contracts for analysis results

**Test Coverage** (from `IOutputFormatter.test.ts`):
- Multiple output formats (JSON, table, summary, CSV)
- Source location formatting
- Error message formatting
- Performance optimization

```typescript
interface IOutputFormatter {
  format(result: AnalysisResult, format: OutputFormat): string;
  formatBatch(results: BatchResult, format: OutputFormat): string;
  formatError(error: Error, format: OutputFormat): string;
}
```

### Methods

#### `format(result, format)`

**Test Scenarios**:
- JSON format with complete data structure
- Table format with aligned columns
- Summary format with key metrics
- CSV format for data export

**Parameters**:
- `result: AnalysisResult` - Analysis result to format
- `format: OutputFormat` - Target output format

**Returns**: `string` - Formatted output

#### `formatBatch(results, format)`

**Test Scenarios**:
- Batch result aggregation
- Error summary formatting
- Statistical summaries
- Progress reporting formats

#### `formatError(error, format)`

**Test Scenarios**:
- Structured error formatting
- Error context preservation
- User-friendly error messages
- Debug information inclusion

## ITypeScriptParser

**Purpose**: Defines the contract for TypeScript parsing operations

**Test Coverage** (from `ITypeScriptParser.test.ts`):
- AST parsing with tree-sitter
- Error recovery mechanisms
- Source location mapping
- Performance optimization

```typescript
interface ITypeScriptParser {
  parse(source: string, options?: ParseOptions): Promise<ParseResult>;
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;
  validate(source: string): Promise<ValidationResult>;
}
```

### Methods

#### `parse(source, options?)`

**Test Scenarios**:
- Basic TypeScript parsing
- JSX/TSX parsing support
- Syntax error handling with recovery
- AST node extraction
- Source mapping accuracy

**Parameters**:
- `source: string` - TypeScript source code
- `options?: ParseOptions` - Parsing configuration

**Returns**: `Promise<ParseResult>`

#### `parseFile(filePath, options?)`

**Test Scenarios**:
- File system integration
- Encoding detection and handling
- Large file processing
- Cache integration

**Parameters**:
- `filePath: string` - Path to TypeScript file
- `options?: ParseOptions` - Parsing configuration

#### `validate(source)`

**Test Scenarios**:
- Syntax validation
- TypeScript-specific validation
- Error location reporting
- Quick validation without full parsing

**Returns**: `Promise<ValidationResult>`

## Supporting Types

### AnalysisOptions

Based on test usage patterns:

```typescript
interface AnalysisOptions {
  format?: OutputFormat;               // Output format preference
  includeSources?: boolean;            // Include source locations
  parseTimeout?: number;               // Parser timeout (ms)
  enablePartialResults?: boolean;      // Return partial results on errors
}
```

### SourceAnalysisOptions

```typescript
interface SourceAnalysisOptions extends AnalysisOptions {
  fileName?: string;                   // Virtual filename for error reporting
  baseDir?: string;                    // Base directory for relative imports
}
```

### ParseOptions

```typescript
interface ParseOptions {
  timeout?: number;                    // Parse timeout (ms)
  enableRecovery?: boolean;            // Enable error recovery
  preserveWhitespace?: boolean;        // Preserve whitespace in AST
  includeComments?: boolean;           // Include comments in results
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;                    // Overall validation result
  errors: ParseError[];                // Syntax/parse errors
  warnings: ParseWarning[];            // Non-fatal warnings
  performance: {
    parseTimeMs: number;               // Parsing time
    validationTimeMs: number;          // Validation time
  };
}
```

### ParseResult

```typescript
interface ParseResult {
  success: boolean;                    // Parse success status
  ast?: any;                          // Abstract Syntax Tree (tree-sitter)
  errors: ParseError[];               // Parse errors
  sourceMap: SourceLocation[];        // Source location mappings
  performance: {
    parseTimeMs: number;              // Parse duration
    astNodeCount: number;             // Total AST nodes
  };
}
```

## Interface Implementation Patterns

### Error Handling Contract

All interfaces must implement consistent error handling:

```typescript
// Common error handling pattern (from tests)
try {
  const result = await analyzer.analyzeFile(filePath);
  if (!result.success) {
    // Handle analysis errors
    console.error('Analysis failed:', result.errors);
  }
} catch (error) {
  // Handle system errors (file not found, permissions, etc.)
  if (error instanceof FileNotFoundError) {
    console.error('File not found:', error.filePath);
  }
}
```

### Performance Contract

All implementations must meet performance requirements validated in tests:

- Parse operations: < 10ms for files under 1MB
- Analysis operations: < 50ms including dependency resolution
- Memory usage: < 100MB for batch operations
- Error recovery: < 5ms additional overhead

### Caching Contract

Interfaces support optional caching with consistent behavior:

```typescript
// Cache integration pattern (from tests)
interface CachableInterface {
  enableCache?: boolean;               // Enable result caching
  clearCache(): void;                  // Clear cached results
  getCacheStats(): CacheStatistics;   // Cache performance metrics
}
```

## Interface Compatibility

All core interfaces are designed for:

- **Backward Compatibility**: New methods added as optional
- **Forward Compatibility**: Extensible option objects
- **Cross-Platform**: Node.js and browser environments
- **Type Safety**: Full TypeScript type definitions

## Testing Integration

Each interface includes comprehensive test coverage:

- **Contract Tests**: Validate interface compliance
- **Performance Tests**: Benchmark implementations
- **Error Tests**: Validate error handling
- **Integration Tests**: Cross-interface compatibility

The test files provide detailed examples of proper interface usage and expected behaviors.