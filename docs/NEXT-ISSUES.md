# Next Issues & Technical Debt - Dependency Linker

**Date:** 2025-10-02
**Last Review:** After Import Analysis System Fix

## 🔴 Critical Issues

### 1. Test Suite Race Condition (Parallel Execution Failure)
**Priority:** CRITICAL
**Status:** 🔴 BLOCKING

**Problem:**
Tests fail when run in parallel but pass when run sequentially (`--runInBand`).

**Symptoms:**
```bash
# Fails in parallel
npm test
# Error: Query "ts-import-sources" not found in registry

# Passes sequentially
npm test -- --runInBand
# All tests pass ✅
```

**Root Cause:**
Global state pollution - `globalQueryEngine` is shared across test suites but initialized independently in each `beforeAll()`.

**Affected Tests:**
- `tests/integration/SingleFileAnalysis.test.ts`
- `tests/core-functionality.test.ts`
- `tests/graph-analysis.test.ts`

**Impact:**
- CI/CD pipelines must use `--runInBand` (slower)
- Developer experience degraded
- Flaky tests in concurrent environments

**Solution Required:**
1. **Option A:** Global singleton initialization
   - Create single `setupTests.ts` file
   - Initialize all systems once before any tests
   - Use Jest `globalSetup` configuration

2. **Option B:** Test isolation
   - Each test suite gets isolated QueryEngine instance
   - Remove global state dependencies
   - Refactor to dependency injection pattern

3. **Option C:** Proper cleanup
   - Add `afterAll()` to clear registries
   - Ensure no cross-test contamination
   - Reset global state between test suites

**Recommendation:** Option A (quickest fix) + gradual migration to Option B (better architecture)

**Files to Modify:**
- `jest.config.js` - Add globalSetup
- `tests/setup.ts` (new) - Global initialization
- All test files - Remove individual `initializeAnalysisSystem()` calls

---

## 🟡 High Priority Issues

### 2. Go Language Query Implementation Missing
**Priority:** HIGH
**Status:** 🟡 TODO

**Problem:**
Go language queries are not implemented despite parser being available.

**Evidence:**
```typescript
// src/core/QueryBridge.ts:32
case "go":
  return {}; // TODO: Go 쿼리 구현 필요
```

**Impact:**
- Go language analysis returns empty results
- Feature gap in multi-language support
- Documentation claims Go support but it's incomplete

**Required Work:**
1. Create `src/queries/go/` directory
2. Implement Go import queries
   - `go-import-sources`
   - `go-import-statements`
3. Implement Go export queries
   - `go-function-declarations`
   - `go-type-declarations`
4. Register queries in `initializeAnalysisSystem()`
5. Add integration tests

**Effort Estimate:** 4-6 hours

**Files to Create:**
- `src/queries/go/imports.ts`
- `src/queries/go/exports.ts`
- `src/queries/go/index.ts`
- `src/queries/go/tree-sitter-queries.ts`
- `tests/queries/go/` (tests)

---

### 3. Inference Engine TODO Items
**Priority:** HIGH
**Status:** 🟡 PARTIAL

**Problem:**
Inference engine has incomplete implementations with TODO comments.

**TODOs Found:**

**3.1 Transitive Relationship Caching**
```typescript
// src/database/GraphDatabase.ts:1313
// TODO: 모든 transitive/inheritable 관계 재계산 및 캐시 저장
resolve(0);
```

**3.2 Inference Recalculation**
```typescript
// src/database/inference/InferenceEngine.ts:373
// TODO: 모든 추론 재계산 및 캐시 저장
resolve(0);
```

**3.3 Circular Reference Validation**
```typescript
// src/database/inference/InferenceEngine.ts:398
// TODO: 순환 참조 검증 로직
validatedCount++;
```

**3.4 Cached Inference Retrieval**
```typescript
// src/database/inference/InferenceEngine.ts:463
cachedInferences: 0, // TODO: 캐시에서 조회
```

**Impact:**
- Performance degradation for large graphs
- Potential circular reference issues
- Missing optimization opportunities

**Solution Required:**
- Implement caching layer for transitive relationships
- Add circular reference detection
- Performance metrics for cache hit rates

**Effort Estimate:** 8-12 hours

---

### 4. Excessive Console Logging
**Priority:** MEDIUM
**Status:** 🟡 CODE SMELL

**Problem:**
Production code contains debug `console.warn()` and `console.error()` calls.

**Affected Files:**
- `src/database/types/EdgeTypeManager.ts` (4 instances)
- `src/database/services/FileDependencyAnalyzer.ts` (4 instances)
- `src/parsers/typescript/TypeScriptParser.ts` (1 instance)
- `src/core/TreeSitterQueryEngine.ts` (1 instance)
- `src/core/QueryEngine.ts` (1 instance)
- `src/core/QueryBridge.ts` (3 instances)
- `src/integration/SingleFileAnalysis.ts` (1 instance)

**Impact:**
- Noisy logs in production
- No log level control
- Difficult to filter important messages

**Solution Required:**
1. Implement proper logging system (winston, pino, or custom)
2. Add log levels (ERROR, WARN, INFO, DEBUG)
3. Environment-based log configuration
4. Replace all `console.*` with logger

**Effort Estimate:** 3-4 hours

**Example Implementation:**
```typescript
// src/utils/logger.ts
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// Usage
logger.warn('Missing file:', { source, attempted });
logger.error('Query execution failed:', { queryName, error });
```

---

## 🟢 Medium Priority Issues

### 5. TypeScript `any` Type Usage
**Priority:** MEDIUM
**Status:** 🟢 REFACTOR

**Problem:**
Despite `strict: true` and `noImplicitAny: true`, some files use `any` type.

**Affected Files:**
- `src/database/types/EdgeTypeManager.ts`
- `src/database/core/NodeCentricAnalyzer.ts`
- `src/database/core/NodeIdentifier.ts`
- `src/database/GraphStorage.ts`
- `src/database/GraphQueryEngine.ts`
- `src/database/inference/EdgeTypeRegistry.ts`
- `src/database/inference/InferenceEngine.ts`
- `src/database/GraphDatabase.ts`
- `src/parsers/base.ts`
- `src/parsers/ParserManager.ts`

**Impact:**
- Type safety compromised
- Runtime errors possible
- Harder to refactor

**Solution Required:**
- Audit each `any` usage
- Replace with proper types or generics
- Use `unknown` where type is truly unknown
- Add type guards for runtime checks

**Effort Estimate:** 6-8 hours

---

### 6. Error Handling Consistency
**Priority:** MEDIUM
**Status:** 🟢 IMPROVEMENT

**Problem:**
Inconsistent error handling patterns across codebase.

**Examples:**

**Pattern A: Try-catch with console.error**
```typescript
try {
  // operation
} catch (error) {
  console.error('Failed:', error);
}
```

**Pattern B: Custom error classes**
```typescript
throw new SingleFileAnalysisError(
  'Failed to analyze file',
  'ANALYSIS_FAILED',
  filePath
);
```

**Pattern C: Silent failures**
```typescript
if (!parser) {
  return {}; // Silent failure
}
```

**Solution Required:**
1. Define error taxonomy
2. Create custom error classes hierarchy
3. Standardize error handling patterns
4. Add error recovery strategies
5. Document error codes

**Effort Estimate:** 4-6 hours

---

## 🔵 Low Priority / Technical Debt

### 7. Missing Integration Tests for Helper Functions
**Priority:** LOW
**Status:** 🔵 TEST COVERAGE

**Problem:**
Helper functions in test files lack their own tests.

**Example:**
```typescript
// tests/test-helpers.ts
export function createMockQueryFunction(name: string) {
  // No tests for this helper
}
```

**Solution Required:**
- Add tests for test helpers
- Ensure test utilities are reliable
- Document helper function usage

**Effort Estimate:** 2-3 hours

---

### 8. Documentation Gaps
**Priority:** LOW
**Status:** 🔵 DOCS

**Missing Documentation:**
- API reference for public functions
- Architecture decision records (ADRs)
- Migration guides for breaking changes
- Performance tuning guide
- Troubleshooting guide

**Solution Required:**
- Generate API docs from JSDoc
- Create ADR template and backfill decisions
- Document common issues and solutions

**Effort Estimate:** 8-10 hours

---

### 9. Performance Optimization Opportunities
**Priority:** LOW
**Status:** 🔵 OPTIMIZATION

**Potential Improvements:**

**9.1 Parser Instance Caching**
Already implemented in recent fix ✅

**9.2 Query Result Caching**
```typescript
// Cache query results for identical inputs
const cacheKey = `${language}:${queryName}:${hash(sourceCode)}`;
if (queryCache.has(cacheKey)) {
  return queryCache.get(cacheKey);
}
```

**9.3 Batch Query Execution**
```typescript
// Execute multiple queries in parallel
const results = await Promise.all(
  queries.map(q => executeQuery(q, context))
);
```

**Effort Estimate:** 4-6 hours each

---

### 10. Build and Deployment Improvements
**Priority:** LOW
**Status:** 🔵 DEVOPS

**Opportunities:**

**10.1 Build Optimization**
- Incremental builds ✅ (already configured)
- Build caching for CI/CD
- Source maps for debugging

**10.2 Package Publishing**
- Automated version bumping
- Changelog generation
- Pre-publish validation
- npm provenance

**10.3 CI/CD Pipeline**
- Automated testing on PR
- Parallel test execution (after fixing race condition)
- Performance regression detection
- Automated releases

**Effort Estimate:** 6-8 hours

---

## Prioritized Action Plan

### Sprint 1: Critical Fixes (1-2 days)
1. ✅ Fix import analysis system (COMPLETED)
2. 🔴 **Fix test suite race condition** (4-6 hours)
3. 🟡 **Implement Go language queries** (4-6 hours)

### Sprint 2: High Priority (3-4 days)
4. 🟡 **Implement inference engine TODOs** (8-12 hours)
5. 🟡 **Add proper logging system** (3-4 hours)
6. 🟢 **Remove TypeScript any types** (6-8 hours)

### Sprint 3: Code Quality (2-3 days)
7. 🟢 **Standardize error handling** (4-6 hours)
8. 🔵 **Add missing tests** (2-3 hours)
9. 🔵 **Performance optimizations** (4-6 hours)

### Sprint 4: Polish (1-2 days)
10. 🔵 **Documentation** (8-10 hours)
11. 🔵 **CI/CD improvements** (6-8 hours)

---

## Issue Tracking

Use GitHub Issues to track these items:

```bash
# Create issues from this document
gh issue create --title "Fix test suite race condition" --label "bug,critical" --body "..."
gh issue create --title "Implement Go language queries" --label "feature,high-priority" --body "..."
# ... etc
```

---

## Success Metrics

- [ ] All tests pass in parallel mode
- [ ] Test execution time < 5 seconds
- [ ] Zero TypeScript `any` types in core modules
- [ ] 90%+ test coverage
- [ ] All languages (TS/JS/Java/Python/Go) fully supported
- [ ] Zero console.log/warn/error in production code
- [ ] Complete API documentation
- [ ] Automated CI/CD pipeline

---

## Notes

- Import analysis system fix completed ✅ (2025-10-02)
- Documentation for fix available in `IMPORT-ANALYSIS-FIX-2025-10-02.md`
- All new issues discovered during import analysis investigation
- Current test pass rate: 122/127 (96%) when run sequentially

**Next Review:** After Sprint 1 completion
