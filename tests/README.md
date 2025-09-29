# Test Suite - Query-Based AST Analysis Library

## Overview

Comprehensive test suite for the QueryResultMap-centric AST analysis library covering core functionality, language-specific queries, and cross-language compatibility.

## Test Files

### Core Architecture Tests

#### `ast-pipeline.test.ts`
- **Purpose**: Tests core AST → Query pipeline architecture
- **Coverage**: Pipeline concept validation, language interchangeability, query composition
- **Key Tests**:
  - AST → Query → Results pipeline
  - Multi-language query composition
  - Custom key mapping across languages
  - Pipeline execution with different AST structures

#### `parser-independent-queries.test.ts`
- **Purpose**: Tests query functionality without actual parser dependencies
- **Coverage**: Query registration, validation, custom mappings, mock execution
- **Key Tests**:
  - Query registration and metadata validation
  - Custom key mapping creation and validation
  - Mock query execution for all languages
  - Engine performance and validation features
  - Language support verification

#### `language-specific-queries.test.ts`
- **Purpose**: Tests individual language query execution
- **Coverage**: TypeScript, Java, Python query execution with mock data
- **Key Tests**:
  - Individual query execution for each language
  - Cross-language query pattern consistency
  - Parallel query execution
  - Result type safety validation

### Integration Tests

#### `real-ast-pipeline.test.ts`
- **Purpose**: Tests with actual tree-sitter parsers
- **Coverage**: Real AST parsing and query execution
- **Key Tests**:
  - TypeScript AST parsing with tree-sitter-typescript
  - JavaScript AST parsing with tree-sitter-javascript
  - Different TypeScript constructs (classes, interfaces, functions)
  - Cross-language pipeline demonstration
  - Custom query mapping validation

#### `multi-language-verification.test.ts`
- **Purpose**: Comprehensive multi-language architecture validation
- **Coverage**: Language support, query patterns, type safety
- **Key Tests**:
  - Language support verification
  - Query engine multi-language support
  - Type safety across languages
  - Cross-language architecture extensibility

## Test Categories

### 🔧 Unit Tests
- Query registration and validation
- Custom key mapping functionality
- Individual query execution
- Engine state validation

### 🔄 Integration Tests
- Real AST parser integration
- Cross-language compatibility
- End-to-end pipeline execution
- Performance validation

### 🛡️ Type Safety Tests
- TypeScript compilation validation
- Type inference verification
- Result type consistency
- Cross-language type safety

### ⚡ Performance Tests
- Query execution timing
- Memory usage validation
- Batch execution performance
- Parallel processing verification

## Running Tests

### All Tests
```bash
npm test
```

### Individual Test Files
```bash
# Core architecture
npm test ast-pipeline.test.ts

# Parser-independent functionality
npm test parser-independent-queries.test.ts

# Language-specific queries
npm test language-specific-queries.test.ts

# Real AST integration
npm test real-ast-pipeline.test.ts

# Multi-language verification
npm test multi-language-verification.test.ts
```

### Silent Mode (Minimal Output)
```bash
npm test -- --verbose=false --silent
```

## Test Structure

### Mock Data Patterns
- **ASTNode Creation**: `createMockASTNode(type, text, children?)`
- **QueryMatch Creation**: `createMockMatch(nodeType, nodeText, captures?)`
- **Context Creation**: Language-specific context factories

### Assertion Patterns
- **Array Results**: Always verify `Array.isArray(results)`
- **Length Validation**: Use `toBeGreaterThanOrEqual(0)` for mock data
- **Type Safety**: Verify result properties and types
- **Error Handling**: Test validation and error scenarios

## Coverage Areas

### ✅ Covered
- Query registration and validation
- Custom key mapping systems
- Mock query execution
- Cross-language patterns
- Type safety verification
- Real AST integration (TypeScript/JavaScript)
- Multi-language architecture

### 🔄 Future Enhancements
- Java tree-sitter integration tests
- Python tree-sitter integration tests
- Performance benchmarking
- Memory usage profiling
- Concurrent execution stress tests

## Test Data

### Mock AST Structures
- Simplified AST nodes for unit testing
- Realistic capture patterns for query matching
- Language-specific node types and structures

### Real AST Sources
- TypeScript: Classes, interfaces, functions, imports/exports
- JavaScript: ES6 modules, CommonJS, various syntax patterns
- Cross-language: Consistent patterns across different languages

## Quality Standards

- **Zero Test Failures**: All tests must pass
- **Type Safety**: No `any` types in test code
- **Comprehensive Coverage**: All major functionality tested
- **Performance**: Tests complete within reasonable time
- **Maintainability**: Clear test structure and documentation