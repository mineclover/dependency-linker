# Baseline Failure Analysis - Test Isolation Investigation

**Created**: 2025-10-04
**Baseline**: 19 test failures in full suite, most tests pass individually

## Executive Summary

We have confirmed the baseline of **19 test failures** when running the full test suite. The investigation reveals two distinct categories of failures:

1. **Stats Accumulation Issue** (1 test): Fails both individually and in suite due to `filesProcessed` counter not being reset
2. **State Pollution Issue** (18 tests): Pass individually but fail when run in full suite, indicating parser state pollution between test suites

**Critical Finding**: Adding `afterEach` cache clearing **makes the problem worse** (19 → 27-32 failures), suggesting that parser cache clearing during test execution disrupts parser state in ways that cause additional failures.

## Test Results Summary

### Individual Execution Results
```
✅ symbol-dependency-tracking.test.ts:     7/7 passed
⚠️ essential-parser-tests.test.ts:        6/7 passed (1 stats issue)
✅ SingleFileAnalysis.test.ts:           19/19 passed
✅ incremental-analysis.test.ts:          6/6 passed
─────────────────────────────────────────────────────
   Total individually:                   38/39 passed
```

### Full Suite Execution Results
```
❌ Test Suites: 4 failed, 1 skipped, 16 passed, 20 of 21 total
❌ Tests:       19 failed, 30 skipped, 295 passed, 344 total
```

### Failing Test Suites
1. **symbol-dependency-tracking.test.ts** (7 failures)
2. **incremental-analysis.test.ts** (6 failures)
3. **essential-parser-tests.test.ts** (5 failures)
4. **SingleFileAnalysis.test.ts** (1 failure - but 14 tests fail in full suite context)

## Failure Categories

### Category 1: Stats Accumulation (1 test)

**Test**: `Essential Parser System Tests › Parser Manager Performance › should efficiently reuse parser instances`

**Error**:
```
expect(received).toBe(expected) // Object.is equality
Expected: 10
Received: 13
```

**Root Cause**:
- The test processes 10 files and expects `stats.typescript.filesProcessed === 10`
- Stats accumulate from previous test runs (3 extra files from earlier tests)
- The `globalParserManager.stats` is never reset between tests

**Why It Fails**: Fails BOTH individually and in full suite because stats persist across tests within the same test file.

**Location**: `tests/essential-parser-tests.test.ts:92`

### Category 2: State Pollution (18 tests)

**Pattern**: Tests pass individually but fail when run in full test suite.

**Common Error**:
```
TypeScript parsing failed: Failed to parse TypeScript code: No tree or rootNode returned
```

**Root Cause**:
- Parser instances are shared via `globalParserManager`
- Parser internal state becomes corrupted after many sequential parses
- The tree-sitter parser state is not being properly reset between test suites

**Affected Tests**:
- All 7 tests in `symbol-dependency-tracking.test.ts`
- All 6 tests in `incremental-analysis.test.ts`
- 4 tests in `essential-parser-tests.test.ts` (excluding the stats test)
- Variable number in `SingleFileAnalysis.test.ts` depending on execution order

## What Doesn't Work

### ❌ Attempt 1: Adding `afterEach` Cache Clearing
```typescript
afterEach(() => {
  globalParserManager.clearCache();
});
```

**Result**: 19 → 27 failures (WORSE)
**Why**: Clearing parser cache during test execution disrupts parser state, causing "No tree or rootNode" errors

### ❌ Attempt 2: Adding Stats Reset to clearCache()
```typescript
clearCache(): void {
  for (const parser of this.parsers.values()) {
    parser.clearCache();
  }
  this.initializeStats(); // Reset stats
}
```

**Result**: 19 → 27 failures (WORSE)
**Why**: Stats initialization during cache clearing appears to interfere with parser lifecycle

### ❌ Attempt 3: Adding beforeEach Cache Clearing
```typescript
beforeEach(() => {
  globalParserManager.clearCache();
});
```

**Result**: 19 → 29-33 failures (WORSE)
**Why**: Clearing before tests removes necessary parser initialization

### ❌ Attempt 4: Combining beforeAll + afterEach
```typescript
beforeAll(() => {
  globalParserManager.clearCache();
});

afterEach(() => {
  globalParserManager.clearCache();
});
```

**Result**: 19 → 32 failures (WORSE)
**Why**: Combined clearing compounds the state disruption issues

## Root Cause Analysis

### Parser Architecture Issue
The `globalParserManager` singleton pattern creates persistent parser state:

```typescript
// ParserManager.ts
export class ParserManager {
  private parsers = new Map<SupportedLanguage, BaseParser>();
  private stats = new Map<SupportedLanguage, { ... }>();
}

// Singleton export
export const globalParserManager = new ParserManager();
```

**Problem**:
- Parser instances are created once and reused across ALL tests
- Tree-sitter parser internal state accumulates across parses
- No mechanism to fully reset parser to clean state without recreating instances

### Why Individual Tests Pass
- Fresh Jest worker process
- Parser instance is created for first test
- Limited number of parses (typically 1-10)
- Parser state doesn't accumulate enough to cause issues

### Why Full Suite Fails
- Same parser instance processes 50+ files across multiple test suites
- Parser internal state becomes corrupted/polluted
- State pollution manifests as "No tree or rootNode" errors
- Tests that run later in execution order are more likely to fail

## Proposed Solutions

### Solution 1: Per-Test Stats Reset (Quick Fix - Category 1)

**Target**: Fix the 1 stats accumulation failure

**Implementation**:
```typescript
// In essential-parser-tests.test.ts
describe("Parser Manager Performance", () => {
  beforeEach(() => {
    // Reset stats only for performance tests that check them
    globalParserManager.resetStats();
  });

  test("should efficiently reuse parser instances", async () => {
    // ... test code ...
  });
});
```

**Changes Required**:
1. Add `resetStats()` method to `ParserManager`:
```typescript
resetStats(): void {
  this.initializeStats();
}
```

2. Use `beforeEach` only in test suites that verify stats

**Pros**:
- Minimal code change
- Fixes 1 test immediately
- Doesn't interfere with other tests

**Cons**:
- Doesn't address the 18 state pollution failures

### Solution 2: Parser Instance Recreation (Comprehensive - Category 2)

**Target**: Fix all 18 state pollution failures

**Implementation**:
```typescript
// Add to ParserManager
recreateParser(language: SupportedLanguage): void {
  // Delete existing instance
  this.parsers.delete(language);

  // Clear stats for this language
  this.stats.set(language, {
    filesProcessed: 0,
    totalParseTime: 0,
    lastUsed: new Date(),
  });

  // Next getParser() call will create fresh instance
  console.log(`♻️ Recreated ${language} parser`);
}

recreateAllParsers(): void {
  this.parsers.clear();
  this.initializeStats();
  console.log("♻️ Recreated all parsers");
}
```

**Usage in tests**:
```typescript
// In test setup.ts or individual test files
afterAll(() => {
  // After each test suite completes, recreate parsers
  globalParserManager.recreateAllParsers();
});
```

**Pros**:
- Complete state reset between test suites
- Maintains parser reuse within individual test suites
- Addresses root cause of state pollution

**Cons**:
- Slightly higher memory/CPU usage (creating new parser instances)
- Need to identify right lifecycle hook (afterAll per suite)

### Solution 3: Worker-Isolated Parsers (Advanced)

**Target**: Complete test isolation through worker-level parser instances

**Implementation**:
```typescript
// Create per-worker parser manager
let workerParserManager: ParserManager | null = null;

export function getWorkerParserManager(): ParserManager {
  if (!workerParserManager) {
    workerParserManager = new ParserManager();
  }
  return workerParserManager;
}
```

**Pros**:
- Complete isolation between test suites
- Each worker has clean parser state
- No cross-contamination

**Cons**:
- Requires refactoring all test files
- Higher memory usage (multiple parser instances)
- Complexity in managing worker lifecycle

## Recommended Approach

### Phase 1: Quick Win (Immediate)
1. Implement **Solution 1** to fix the stats accumulation test
2. Time estimate: 15 minutes
3. Impact: 19 → 18 failures

### Phase 2: Comprehensive Fix (Next)
1. Implement **Solution 2** parser recreation
2. Add `afterAll` hooks to test files that need parser state reset
3. Test incrementally with each test suite
4. Time estimate: 1-2 hours
5. Impact: 18 → 0 failures (target)

### Phase 3: Validation (Final)
1. Run full test suite 10 times to verify stability
2. Run tests in different orders (Jest `--randomize`)
3. Verify individual test execution still works
4. Document parser lifecycle guidelines for future test authors

## Next Steps

1. ✅ **Confirmed baseline**: 19 failures, patterns identified
2. 🔄 **Implement Solution 1**: Add `resetStats()` for stats test
3. ⏳ **Implement Solution 2**: Add parser recreation mechanism
4. ⏳ **Test iteratively**: Fix one test suite at a time
5. ⏳ **Validate stability**: Full suite passes consistently

## Open Questions

1. **Jest Workers**: Are tests actually running sequentially (maxWorkers: 1)? Need to verify.
2. **Tree-sitter Lifecycle**: Does tree-sitter have recommended cleanup procedures?
3. **Memory Leaks**: Are parser instances accumulating memory over time?
4. **Stats Design**: Should stats be per-session rather than cumulative?

## Conclusion

The test failures are caused by **parser state pollution** when many tests run sequentially using the same `globalParserManager` instance. The solution is NOT to clear cache during test execution (which makes things worse), but rather to **recreate parser instances** between test suites to ensure clean state.

The stats accumulation issue is a separate, simpler problem that can be fixed with a targeted stats reset in the affected test.
