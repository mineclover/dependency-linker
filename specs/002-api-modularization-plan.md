# Implementation Plan: API Modularization

## Overview

**Feature**: API Modularization for TypeScript File Analyzer  
**Status**: Implementation Planning  
**Branch**: feature/002-api-modularization  
**Created**: 2024-09-12  

## Executive Summary

This implementation plan details how to refactor the TypeScript File Analyzer from a CLI-only tool into a reusable API library while maintaining 100% backward compatibility. The plan follows a three-phase approach that ensures minimal risk and maximum compatibility.

## Research & Analysis

### Current Architecture Analysis

The existing codebase has the following structure:
```
src/
├── cli/
│   ├── analyze-file.ts      # CLI entry point
│   └── CommandParser.ts     # CLI argument parsing
├── formatters/
│   └── OutputFormatter.ts   # Output formatting (7 formats)
├── models/
│   ├── AnalysisResult.ts    # Result data structure
│   ├── DependencyInfo.ts    # Dependency data models
│   ├── ImportInfo.ts        # Import data models
│   └── ExportInfo.ts        # Export data models
├── parsers/
│   ├── TypeScriptParserEnhanced.ts
│   └── DependencyClassifierExtracted.ts
└── services/
    ├── FileAnalyzer.ts      # Core analysis service
    └── TypeScriptParser.ts  # Core parsing service
```

### Key Findings

1. **Tight CLI Coupling**: The CLI layer directly instantiates and calls services
2. **Good Separation**: Models and formatters are already well-separated
3. **Service Layer**: Core services exist but need interface extraction
4. **Output Formats**: Already supports 7 output formats (recently added)

### Risk Assessment

- **Low Risk**: Models and formatters are pure and reusable
- **Medium Risk**: Service layer needs interface abstraction
- **High Risk**: CLI integration must maintain exact compatibility

## Data Model & Interfaces

### Core Interfaces

```typescript
// Core service interfaces
export interface IFileAnalyzer {
  analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;
  validateFile(filePath: string): Promise<ValidationResult>;
}

export interface ITypeScriptParser {
  parseFile(filePath: string, options: ParseOptions): Promise<ParseResult>;
  parseSource(source: string, options: ParseOptions): Promise<ParseResult>;
}

export interface IOutputFormatter {
  format(result: AnalysisResult, format: OutputFormat): string;
  getFormatHeader(format: OutputFormat): string;
}

// API-specific interfaces
export interface ITypeScriptAnalyzer {
  // Primary methods
  analyzeFile(filePath: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  analyzeFiles(filePaths: string[], options?: BatchAnalysisOptions): Promise<BatchAnalysisResult>;
  analyzeSource(source: string, options?: SourceAnalysisOptions): Promise<AnalysisResult>;
  
  // Convenience methods
  extractDependencies(filePath: string): Promise<DependencyInfo[]>;
  getImports(filePath: string): Promise<ImportInfo[]>;
  getExports(filePath: string): Promise<ExportInfo[]>;
  
  // Utility methods
  validateFile(filePath: string): Promise<ValidationResult>;
  getSupportedExtensions(): string[];
}
```

### API Options & Configuration

```typescript
export interface AnalyzerOptions {
  parseTimeout?: number;
  includeSourceLocations?: boolean;
  enableCaching?: boolean;
  customParsers?: ITypeScriptParser[];
  customFormatters?: IOutputFormatter[];
}

export interface AnalysisOptions {
  format?: OutputFormat;
  includeSources?: boolean;
  includeTypeImports?: boolean;
  filterTypes?: DependencyType[];
  parseTimeout?: number;
}

export interface BatchAnalysisOptions extends AnalysisOptions {
  maxConcurrency?: number;
  failFast?: boolean;
  progressCallback?: (completed: number, total: number) => void;
}
```

### Error Hierarchy

```typescript
export abstract class AnalysisError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class FileNotFoundError extends AnalysisError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
  }
}

export class ParseTimeoutError extends AnalysisError {
  constructor(filePath: string, timeout: number) {
    super(`Parse timeout (${timeout}ms) exceeded for: ${filePath}`, 'PARSE_TIMEOUT', { filePath, timeout });
  }
}

export class InvalidFileTypeError extends AnalysisError {
  constructor(filePath: string, expectedExtensions: string[]) {
    super(`Invalid file type: ${filePath}. Expected: ${expectedExtensions.join(', ')}`, 'INVALID_FILE_TYPE', { filePath, expectedExtensions });
  }
}
```

## Implementation Tasks

### Phase 1: Core Layer Refactoring (Week 1-2)

#### Task 1.1: Extract Service Interfaces
- **Objective**: Create interfaces for existing services
- **Files**: 
  - `src/core/interfaces/IFileAnalyzer.ts`
  - `src/core/interfaces/ITypeScriptParser.ts`
  - `src/core/interfaces/IOutputFormatter.ts`
- **Acceptance Criteria**:
  - All existing services implement new interfaces
  - Interfaces cover all public methods
  - No breaking changes to existing functionality

#### Task 1.2: Refactor FileAnalyzer Service
- **Objective**: Make FileAnalyzer implement IFileAnalyzer interface
- **Files**: 
  - `src/services/FileAnalyzer.ts` → `src/core/services/FileAnalyzer.ts`
- **Changes**:
  - Implement IFileAnalyzer interface
  - Add dependency injection for parser and formatter
  - Maintain all existing method signatures

#### Task 1.3: Refactor Parser Services
- **Objective**: Extract parser logic into interface implementations
- **Files**: 
  - `src/services/TypeScriptParser.ts` → `src/core/parsers/TypeScriptParser.ts`
  - `src/parsers/TypeScriptParserEnhanced.ts` → `src/core/parsers/EnhancedParser.ts`
- **Changes**:
  - Implement ITypeScriptParser interface
  - Consolidate parser logic
  - Add configuration injection

#### Task 1.4: Update Output Formatter
- **Objective**: Ensure formatter implements interface
- **Files**: 
  - `src/formatters/OutputFormatter.ts` → `src/core/formatters/OutputFormatter.ts`
- **Changes**:
  - Implement IOutputFormatter interface
  - Keep all 7 output formats
  - Add extensibility for custom formatters

#### Task 1.5: Core Layer Testing
- **Objective**: Test all core components independently
- **Files**: 
  - `tests/unit/core/services/FileAnalyzer.test.ts`
  - `tests/unit/core/parsers/TypeScriptParser.test.ts`
  - `tests/unit/core/formatters/OutputFormatter.test.ts`
- **Coverage**: 95%+ for all core components

### Phase 2: API Layer Implementation (Week 3-4)

#### Task 2.1: Main API Class Implementation
- **Objective**: Create TypeScriptAnalyzer class
- **Files**: 
  - `src/api/TypeScriptAnalyzer.ts`
  - `src/api/types.ts`
  - `src/api/errors.ts`
- **Features**:
  - All methods from specification
  - Dependency injection support
  - Configuration options
  - Error handling

#### Task 2.2: Factory Functions
- **Objective**: Create convenience functions for simple usage
- **Files**: 
  - `src/api/factory-functions.ts`
- **Functions**:
  - `analyzeTypeScriptFile()`
  - `extractDependencies()`
  - `getBatchAnalysis()`
  - `analyzeDirectory()`

#### Task 2.3: Batch Processing
- **Objective**: Implement batch analysis capabilities
- **Files**: 
  - `src/api/BatchAnalyzer.ts`
- **Features**:
  - Concurrent file processing
  - Progress tracking
  - Error aggregation
  - Memory optimization

#### Task 2.4: Caching System
- **Objective**: Implement analysis result caching
- **Files**: 
  - `src/api/cache/FileCache.ts`
  - `src/api/cache/MemoryCache.ts`
- **Features**:
  - File-based caching
  - Memory caching
  - Cache invalidation
  - Configurable TTL

#### Task 2.5: API Layer Testing
- **Objective**: Comprehensive API testing
- **Files**: 
  - `tests/unit/api/TypeScriptAnalyzer.test.ts`
  - `tests/unit/api/factory-functions.test.ts`
  - `tests/unit/api/BatchAnalyzer.test.ts`
- **Coverage**: 95%+ for all API components

### Phase 3: CLI Integration & Compatibility (Week 5)

#### Task 3.1: CLI Adapter Layer
- **Objective**: Refactor CLI to use API internally
- **Files**: 
  - `src/cli/analyze-file.ts` (refactor)
  - `src/cli/CLIAdapter.ts` (new)
- **Changes**:
  - CLI calls API layer instead of services directly
  - Maintain exact same CLI behavior
  - Keep all existing error messages

#### Task 3.2: Backward Compatibility Testing
- **Objective**: Ensure CLI behavior is identical
- **Files**: 
  - `tests/integration/cli-compatibility.test.ts`
  - `tests/integration/output-formats.test.ts`
- **Tests**:
  - All existing CLI tests pass
  - Output format comparison
  - Error message verification
  - Performance regression tests

#### Task 3.3: Performance Optimization
- **Objective**: Ensure no performance degradation
- **Activities**:
  - Benchmark API vs direct service calls
  - Optimize hot paths
  - Memory usage analysis
  - Concurrent processing optimization

#### Task 3.4: Documentation Updates
- **Objective**: Update all documentation
- **Files**: 
  - `README.md` (add API usage)
  - `docs/api-reference.md` (new)
  - `docs/migration-guide.md` (new)
- **Content**:
  - API usage examples
  - Migration guide for library users
  - CLI compatibility notes

### Phase 4: Package & Distribution (Week 6)

#### Task 4.1: Package Configuration
- **Objective**: Configure npm package for API usage
- **Files**: 
  - `package.json` (update main/types fields)
  - `src/index.ts` (new entry point)
- **Changes**:
  - Dual entry points (CLI + API)
  - Proper TypeScript definitions
  - ESM/CommonJS compatibility

#### Task 4.2: Integration Examples
- **Objective**: Create real-world usage examples
- **Files**: 
  - `examples/basic-usage.js`
  - `examples/webpack-plugin.js`
  - `examples/vscode-extension.js`
  - `examples/build-tool-integration.js`
- **Examples**:
  - Basic API usage
  - Build tool integration
  - IDE extension
  - Custom analysis pipeline

#### Task 4.3: Final Testing & Validation
- **Objective**: Comprehensive end-to-end testing
- **Activities**:
  - Integration with example projects
  - Performance benchmarking
  - Memory leak testing
  - Cross-platform compatibility

## File Structure Changes

### Target Architecture

```
src/
├── index.ts                     # New API entry point
├── api/                         # New API layer
│   ├── TypeScriptAnalyzer.ts    # Main API class
│   ├── factory-functions.ts     # Convenience functions
│   ├── BatchAnalyzer.ts         # Batch processing
│   ├── types.ts                 # API type definitions
│   ├── errors.ts                # API error classes
│   └── cache/                   # Caching system
│       ├── FileCache.ts
│       └── MemoryCache.ts
├── core/                        # Refactored core layer
│   ├── interfaces/              # Service interfaces
│   │   ├── IFileAnalyzer.ts
│   │   ├── ITypeScriptParser.ts
│   │   └── IOutputFormatter.ts
│   ├── services/                # Core services
│   │   └── FileAnalyzer.ts
│   ├── parsers/                 # Parser implementations
│   │   ├── TypeScriptParser.ts
│   │   └── EnhancedParser.ts
│   └── formatters/              # Formatter implementations
│       └── OutputFormatter.ts
├── cli/                         # Existing CLI layer (refactored)
│   ├── analyze-file.ts          # CLI entry (uses API)
│   ├── CommandParser.ts         # CLI argument parsing
│   └── CLIAdapter.ts            # CLI to API adapter
├── models/                      # Existing models (unchanged)
│   ├── AnalysisResult.ts
│   ├── DependencyInfo.ts
│   ├── ImportInfo.ts
│   └── ExportInfo.ts
└── utils/                       # Shared utilities
    ├── file-utils.ts
    └── validation.ts
```

### Migration Map

| Current Path | New Path | Changes |
|--------------|----------|---------|
| `src/services/FileAnalyzer.ts` | `src/core/services/FileAnalyzer.ts` | Implement interface, add DI |
| `src/services/TypeScriptParser.ts` | `src/core/parsers/TypeScriptParser.ts` | Implement interface |
| `src/formatters/OutputFormatter.ts` | `src/core/formatters/OutputFormatter.ts` | Implement interface |
| `src/cli/analyze-file.ts` | `src/cli/analyze-file.ts` | Refactor to use API |
| N/A | `src/api/TypeScriptAnalyzer.ts` | New main API class |
| N/A | `src/index.ts` | New package entry point |

## Testing Strategy

### Test Coverage Goals
- **Core Layer**: 95%+ coverage
- **API Layer**: 95%+ coverage  
- **CLI Layer**: 90%+ coverage (focus on integration)
- **Overall**: 90%+ coverage

### Test Categories

#### Unit Tests
```typescript
// Core service tests
describe('FileAnalyzer', () => {
  it('should analyze TypeScript files correctly');
  it('should handle file not found errors');
  it('should respect timeout settings');
});

// API tests
describe('TypeScriptAnalyzer', () => {
  it('should provide programmatic access to analysis');
  it('should support batch processing');
  it('should handle custom configuration');
});
```

#### Integration Tests
```typescript
// CLI compatibility tests
describe('CLI Compatibility', () => {
  it('should produce identical output to original CLI');
  it('should handle all command line arguments');
  it('should maintain error message format');
});
```

#### Performance Tests
```typescript
describe('Performance', () => {
  it('should analyze files within time bounds');
  it('should not degrade CLI performance');
  it('should handle batch processing efficiently');
});
```

## Documentation Plan

### API Documentation

1. **README.md Updates**
   - Add API usage section
   - Keep CLI documentation
   - Add installation instructions

2. **API Reference** (`docs/api-reference.md`)
   - Complete method documentation
   - Parameter descriptions
   - Return type definitions
   - Error handling guide

3. **Migration Guide** (`docs/migration-guide.md`)
   - How to integrate API into projects
   - CLI to API migration examples
   - Best practices and patterns

4. **Examples Directory**
   - Basic usage examples
   - Integration examples
   - Advanced usage patterns

### Code Documentation

- **JSDoc Comments**: All public API methods
- **TypeScript Definitions**: Complete type coverage
- **Inline Comments**: Complex logic explanation
- **README Updates**: Installation and usage

## Risk Mitigation

### High-Risk Items

1. **CLI Compatibility Breaking**
   - **Mitigation**: Comprehensive regression testing
   - **Validation**: Automated CLI output comparison
   - **Rollback**: Maintain ability to revert changes

2. **Performance Degradation**
   - **Mitigation**: Continuous performance monitoring
   - **Validation**: Benchmark suite with alerts
   - **Optimization**: Profile and optimize hot paths

### Medium-Risk Items

1. **API Design Complexity**
   - **Mitigation**: Simple factory functions alongside full API
   - **Validation**: User testing with example projects
   - **Iteration**: Refine API based on feedback

2. **Testing Coverage Gaps**
   - **Mitigation**: Automated coverage reporting
   - **Validation**: Coverage gates in CI/CD
   - **Monitoring**: Regular coverage reviews

## Success Metrics

### Functional Success
- [ ] All API methods work with real TypeScript files
- [ ] CLI maintains 100% backward compatibility
- [ ] All output formats work identically
- [ ] Error handling covers all failure scenarios

### Quality Success  
- [ ] 95%+ test coverage for new API layer
- [ ] All existing tests continue to pass
- [ ] Performance within 5% of current benchmarks
- [ ] Zero memory leaks in long-running processes

### Adoption Success
- [ ] API successfully integrated into at least 2 example projects
- [ ] Documentation rated as clear and complete
- [ ] No critical issues reported in first month
- [ ] Positive community feedback on API design

## Timeline & Milestones

### Week 1-2: Foundation
- **Milestone**: Core layer refactored with interfaces
- **Deliverables**: 
  - Service interfaces defined
  - Core components refactored
  - Unit tests for core layer

### Week 3-4: API Implementation  
- **Milestone**: Complete API layer implemented
- **Deliverables**:
  - TypeScriptAnalyzer class complete
  - Factory functions implemented
  - API layer tested

### Week 5: CLI Integration
- **Milestone**: CLI successfully uses API internally
- **Deliverables**:
  - CLI refactored to use API
  - Backward compatibility verified
  - Performance optimized

### Week 6: Polish & Release
- **Milestone**: Production-ready package
- **Deliverables**:
  - Documentation complete
  - Examples created
  - Package configured for distribution

## Next Steps

1. **Phase 1 Start**: Begin core layer refactoring
2. **Test Setup**: Establish testing infrastructure
3. **Interface Design**: Finalize service interfaces
4. **Risk Validation**: Confirm CLI compatibility approach

This implementation plan provides a structured approach to transforming the TypeScript File Analyzer into a reusable API while maintaining full backward compatibility with the existing CLI interface.