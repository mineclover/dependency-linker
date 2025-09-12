# Feature Specification: API Modularization

## Overview

**Feature ID**: 002-api-modularization  
**Feature Name**: Programmatic API for TypeScript File Analyzer  
**Status**: Specification  
**Priority**: High  
**Created**: 2024-09-12  

## Problem Statement

Currently, the TypeScript File Analyzer can only be used through a CLI interface. This limits its reusability and integration potential. The tight coupling between the CLI layer and core analysis logic makes it difficult to:

1. **Programmatic Usage**: Cannot be called as a library from other Node.js applications
2. **Flexible Integration**: Cannot be embedded into build tools, IDEs, or other development workflows
3. **Customizable Analysis**: Cannot easily modify analysis behavior or add custom processing
4. **Reusable Components**: Core dependency extraction logic is not modular for reuse

## Goals

### Primary Goals
1. **API Extraction**: Create a clean, programmatic API that separates core functionality from CLI concerns
2. **Backward Compatibility**: Maintain existing CLI functionality without breaking changes
3. **Modularity**: Enable reuse of individual components (parser, analyzer, formatter) independently
4. **Flexibility**: Allow customization of analysis parameters and processing pipeline

### Secondary Goals
1. **TypeScript Integration**: Provide proper TypeScript definitions for API consumers
2. **Error Handling**: Implement consistent error handling across both CLI and API usage
3. **Performance**: Maintain or improve current analysis performance
4. **Documentation**: Comprehensive API documentation with examples

## Solution Design

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Layer     │    │   API Layer     │    │   Core Layer    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │CommandParser│ │    │ │AnalyzeAPI  │ │    │ │FileAnalyzer│ │
│ │             │ │───▶│ │             │ │───▶│ │             │ │
│ │analyze-file │ │    │ │Public API   │ │    │ │TypeScript   │ │
│ │             │ │    │ │             │ │    │ │Parser       │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ │Dependency   │ │
└─────────────────┘    └─────────────────┘    │ │Classifier   │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

### API Layer Design

#### 1. Main API Class: `TypeScriptAnalyzer`

```typescript
export class TypeScriptAnalyzer {
  constructor(options?: AnalyzerOptions);
  
  // Primary analysis methods
  analyzeFile(filePath: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  analyzeFiles(filePaths: string[], options?: BatchAnalysisOptions): Promise<BatchAnalysisResult>;
  analyzeSource(source: string, options?: SourceAnalysisOptions): Promise<AnalysisResult>;
  
  // Advanced methods
  extractDependencies(filePath: string): Promise<DependencyInfo[]>;
  getImports(filePath: string): Promise<ImportInfo[]>;
  getExports(filePath: string): Promise<ExportInfo[]>;
  
  // Utility methods
  validateFile(filePath: string): Promise<ValidationResult>;
  getSupportedExtensions(): string[];
}
```

#### 2. Factory Functions (Alternative Simple API)

```typescript
// Simple function-based API for quick usage
export function analyzeTypeScriptFile(
  filePath: string, 
  options?: AnalysisOptions
): Promise<AnalysisResult>;

export function extractDependencies(filePath: string): Promise<string[]>;

export function getBatch Analysis(
  filePaths: string[], 
  options?: BatchOptions
): Promise<BatchResult[]>;
```

#### 3. Configuration and Options

```typescript
export interface AnalyzerOptions {
  parseTimeout?: number;
  includeSourceLocations?: boolean;
  enableCaching?: boolean;
  customClassifiers?: DependencyClassifier[];
}

export interface AnalysisOptions extends AnalyzerOptions {
  format?: OutputFormat;
  includeSources?: boolean;
  includeTypeImports?: boolean;
  filterTypes?: DependencyType[];
}
```

### Refactoring Plan

#### Phase 1: Core Layer Separation
1. **Extract Pure Functions**: Move dependency classification and parsing logic into pure functions
2. **Interface Definition**: Create clear interfaces between components
3. **Dependency Injection**: Allow custom parsers and classifiers to be injected

#### Phase 2: API Layer Creation
1. **Main API Class**: Implement `TypeScriptAnalyzer` class with complete functionality
2. **Factory Functions**: Create convenience functions for common use cases
3. **Error Handling**: Standardize error handling with custom error classes

#### Phase 3: CLI Integration
1. **CLI Adapter**: Refactor CLI to use the new API layer internally
2. **Backward Compatibility**: Ensure all existing CLI functionality remains unchanged
3. **Performance Optimization**: Optimize for both CLI and API usage patterns

## Technical Requirements

### API Requirements
1. **Node.js Compatibility**: Support Node.js 16+ (same as current CLI)
2. **TypeScript Support**: Full TypeScript definitions included
3. **Async/Await**: Promise-based API for all async operations
4. **Error Handling**: Comprehensive error types with detailed messages
5. **Memory Efficiency**: Streaming/batch processing for large files

### CLI Requirements (Maintain)
1. **Command Compatibility**: All existing commands must continue to work
2. **Output Formats**: All current output formats (json, text, csv, etc.) maintained
3. **Performance**: CLI performance should not degrade
4. **Environment Variables**: All current environment variable support maintained

### Testing Requirements
1. **API Unit Tests**: Comprehensive unit tests for all API methods
2. **Integration Tests**: Tests for CLI-to-API integration
3. **Backward Compatibility Tests**: Ensure CLI behavior is unchanged
4. **Performance Tests**: Verify performance benchmarks are maintained

## Implementation Details

### File Structure Changes

```
src/
├── api/                    # New API layer
│   ├── TypeScriptAnalyzer.ts
│   ├── factory-functions.ts
│   ├── types.ts
│   └── errors.ts
├── core/                   # Refactored core layer
│   ├── analyzers/
│   ├── parsers/
│   └── classifiers/
├── cli/                    # Existing CLI layer (refactored)
│   ├── analyze-file.ts     # Modified to use API
│   └── CommandParser.ts
└── legacy/                 # Deprecated but maintained for compatibility
```

### Key Classes and Interfaces

#### API Layer
```typescript
// Main analyzer class
export class TypeScriptAnalyzer {
  private parser: TypeScriptParser;
  private classifier: DependencyClassifier;
  private formatter: OutputFormatter;
  
  constructor(options: AnalyzerOptions = {}) {
    this.parser = new TypeScriptParser(options);
    this.classifier = new DependencyClassifier(options);
    this.formatter = new OutputFormatter();
  }
}

// Error classes
export class AnalysisError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class FileNotFoundError extends AnalysisError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
  }
}
```

#### Core Layer Interfaces
```typescript
export interface ITypeScriptParser {
  parse(source: string, options?: ParseOptions): Promise<ParseResult>;
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;
}

export interface IDependencyClassifier {
  classify(source: string): DependencyType;
  getPackageName(source: string): string;
}

export interface IOutputFormatter {
  format(result: AnalysisResult, format: OutputFormat): string;
}
```

## Usage Examples

### Basic API Usage

```typescript
import { TypeScriptAnalyzer, analyzeTypeScriptFile } from 'typescript-file-analyzer';

// Class-based usage
const analyzer = new TypeScriptAnalyzer({
  parseTimeout: 5000,
  includeSourceLocations: true
});

const result = await analyzer.analyzeFile('src/app.tsx');
console.log(`Found ${result.dependencies.length} dependencies`);

// Function-based usage
const simpleResult = await analyzeTypeScriptFile('src/utils.ts');
const externalDeps = simpleResult.dependencies.filter(d => d.type === 'external');
```

### Advanced API Usage

```typescript
import { TypeScriptAnalyzer, DependencyType } from 'typescript-file-analyzer';

const analyzer = new TypeScriptAnalyzer({
  enableCaching: true,
  customClassifiers: [new MyCustomClassifier()]
});

// Batch analysis
const results = await analyzer.analyzeFiles([
  'src/app.tsx',
  'src/utils.ts',
  'src/types.ts'
], {
  filterTypes: [DependencyType.External],
  includeTypeImports: false
});

// Extract specific information
const dependencies = await analyzer.extractDependencies('src/large-file.ts');
const uniquePackages = [...new Set(dependencies.map(d => d.packageName))];
```

### Integration with Build Tools

```typescript
// Webpack plugin example
import { extractDependencies } from 'typescript-file-analyzer';

class DependencyAnalysisPlugin {
  async apply(compiler) {
    compiler.hooks.compilation.tapAsync('DependencyAnalysis', async (compilation) => {
      const entryFile = compilation.options.entry;
      const deps = await extractDependencies(entryFile);
      
      // Generate dependency report
      compilation.assets['dependency-report.json'] = {
        source: () => JSON.stringify(deps, null, 2),
        size: () => JSON.stringify(deps, null, 2).length
      };
    });
  }
}
```

## Testing Strategy

### API Testing
1. **Unit Tests**: Test each API method independently
2. **Integration Tests**: Test API with real TypeScript files
3. **Error Handling Tests**: Test all error scenarios
4. **Performance Tests**: Benchmark API performance vs CLI

### CLI Compatibility Testing
1. **Regression Tests**: Ensure all existing CLI commands work
2. **Output Format Tests**: Verify all output formats are identical
3. **Error Message Tests**: Ensure error messages remain consistent
4. **Performance Tests**: CLI performance should not degrade

### Example Test Cases

```typescript
describe('TypeScriptAnalyzer API', () => {
  it('should analyze simple TypeScript file', async () => {
    const analyzer = new TypeScriptAnalyzer();
    const result = await analyzer.analyzeFile('test/fixtures/simple.ts');
    
    expect(result.success).toBe(true);
    expect(result.dependencies).toHaveLength(3);
    expect(result.parseTime).toBeLessThan(1000);
  });

  it('should handle file not found error', async () => {
    const analyzer = new TypeScriptAnalyzer();
    
    await expect(analyzer.analyzeFile('nonexistent.ts'))
      .rejects.toThrow(FileNotFoundError);
  });
});
```

## Migration Path

### For Library Users (New)
1. **Install**: Add as dependency to package.json
2. **Import**: Use ESM or CommonJS imports
3. **Instantiate**: Create analyzer instance or use factory functions
4. **Analyze**: Call analysis methods with TypeScript files

### For CLI Users (Existing)
1. **No Changes Required**: All existing CLI commands continue to work
2. **Optional Upgrade**: Can optionally use new output formats or features
3. **Performance**: May see slight performance improvements

## Success Metrics

### Functional Metrics
- [ ] All API methods work correctly with sample TypeScript files
- [ ] CLI maintains 100% backward compatibility
- [ ] Error handling covers all failure scenarios
- [ ] Performance within 5% of current CLI performance

### Quality Metrics
- [ ] 95%+ test coverage for API layer
- [ ] All existing CLI tests pass
- [ ] Documentation covers all API methods
- [ ] TypeScript definitions are complete and accurate

### Usage Metrics (Post-Release)
- [ ] API adoption by at least 3 different projects
- [ ] No regression issues reported by CLI users
- [ ] Positive feedback on API usability

## Documentation Plan

1. **API Reference**: Complete TypeScript documentation with examples
2. **Migration Guide**: How to integrate into existing projects
3. **Tutorial**: Step-by-step guide for common use cases
4. **CLI Compatibility**: Document any minor changes or improvements

## Risk Assessment

### High Risk
- **Breaking Changes**: Risk of accidentally breaking CLI compatibility
  - *Mitigation*: Comprehensive regression testing, gradual refactoring

### Medium Risk
- **Performance Impact**: API layer might add overhead
  - *Mitigation*: Performance testing, optimization where needed
- **Complexity**: Increased codebase complexity
  - *Mitigation*: Clear separation of concerns, good documentation

### Low Risk
- **Adoption**: API might not be adopted by other projects
  - *Mitigation*: Good documentation, examples, community outreach

## Timeline

### Phase 1: Foundation (Week 1-2)
- Extract core logic into separate modules
- Define API interfaces and types
- Set up testing infrastructure

### Phase 2: API Implementation (Week 3-4)
- Implement TypeScriptAnalyzer class
- Create factory functions
- Add comprehensive error handling

### Phase 3: CLI Integration (Week 5)
- Refactor CLI to use new API internally
- Ensure backward compatibility
- Performance testing and optimization

### Phase 4: Documentation & Testing (Week 6)
- Complete API documentation
- Final testing and bug fixes
- Performance benchmarking

## Conclusion

This refactoring will transform the TypeScript File Analyzer from a CLI-only tool into a flexible, reusable library while maintaining full backward compatibility. The modular architecture will enable easier maintenance, testing, and future feature development.

The API-first approach will open up new integration possibilities with IDEs, build tools, and other development workflows, significantly expanding the tool's utility and potential user base.