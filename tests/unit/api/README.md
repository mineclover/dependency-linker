# API Unit Tests

This directory contains comprehensive unit tests for the TypeScript Dependency Linker API.

## Structure

```
tests/unit/api/
├── README.md                           # This file
├── contract-tests/                     # API contract and interface tests
├── memory/                            # Memory usage and leak detection tests
├── performance/                       # Performance and benchmarking tests
├── batch-processing.test.ts           # Existing batch processing tests
├── dependency-injection.test.ts       # Existing dependency injection tests
├── factory-functions.test.ts          # Existing factory functions tests
└── ITypeScriptAnalyzer.test.ts       # Existing analyzer interface tests
```

## Test Categories

### Contract Tests (`contract-tests/`)
- API interface contract validation
- Input/output format verification
- Error handling contract compliance
- Type safety and schema validation

### Memory Tests (`memory/`)
- Memory usage monitoring during analysis
- Memory leak detection
- Resource cleanup validation
- Large file handling memory efficiency

### Performance Tests (`performance/`)
- Analysis speed benchmarking
- Scalability testing
- Resource utilization optimization
- Concurrent processing performance

## Test Utilities

The following test utilities are available in `tests/helpers/`:

- **memory-test-utils.ts**: Memory monitoring, leak detection, and usage measurement
- **resource-test-utils.ts**: System resource management, temp files, and cleanup
- **factory-mocks.ts**: Mock analyzer instances, test data builders, and controlled test doubles

## Running Tests

```bash
# Run all API tests
npm test -- tests/unit/api/

# Run specific test category
npm test -- tests/unit/api/contract-tests/
npm test -- tests/unit/api/memory/
npm test -- tests/unit/api/performance/

# Run with coverage
npm run test:coverage -- tests/unit/api/

# Run in watch mode
npm run test:watch -- tests/unit/api/
```

## Test Patterns

### Using Memory Testing
```typescript
import { measureMemory, MemoryMonitor } from '../../helpers/memory-test-utils';

test('should not leak memory during analysis', async () => {
  const { result, memory } = await measureMemory(async () => {
    return await analyzeTypeScriptFile('/path/to/file.ts');
  });

  expect(memory.delta.heapUsed).toBeLessThan(10 * 1024 * 1024); // 10MB limit
});
```

### Using Resource Management
```typescript
import { TempResourceManager } from '../../helpers/resource-test-utils';

describe('File Analysis', () => {
  let tempManager: TempResourceManager;

  beforeEach(() => {
    tempManager = new TempResourceManager();
  });

  afterEach(async () => {
    await tempManager.cleanupAll();
  });

  test('should analyze temporary files', async () => {
    const file = await tempManager.createTempFile('export const x = 1;');
    const result = await analyzeTypeScriptFile(file.path);
    expect(result.fileName).toBeDefined();
  });
});
```

### Using Mock Factories
```typescript
import { MockAnalyzerFactory, mockAnalysisResults } from '../../helpers/factory-mocks';

test('should handle analysis failures gracefully', async () => {
  const analyzer = MockAnalyzerFactory.createMockAnalyzer({ shouldFail: true });
  
  await expect(analyzer.analyze('/test/file.ts')).rejects.toThrow();
});
```

## Guidelines

1. **Memory Testing**: Always include memory tests for operations that process large files or multiple files
2. **Resource Cleanup**: Use `TempResourceManager` for file-based tests to ensure proper cleanup
3. **Mock Usage**: Use appropriate mocks from `factory-mocks.ts` to control test scenarios
4. **Performance Baselines**: Include performance expectations and validate against them
5. **Error Scenarios**: Test both success and failure paths thoroughly