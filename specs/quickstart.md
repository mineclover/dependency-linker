# Quickstart Guide: API Modularization

## Overview

This quickstart guide provides immediate next steps to begin implementing the API modularization feature for the TypeScript File Analyzer.

## Prerequisites

- Node.js 16+
- TypeScript 4.5+
- Jest testing framework
- Git branch: `feature/002-api-modularization`

## Immediate Next Steps (Day 1)

### 1. Set Up Development Environment

```bash
# Ensure you're on the feature branch
git checkout feature/002-api-modularization

# Install dependencies if needed
npm install

# Run existing tests to establish baseline
npm test

# Build current version to ensure everything works
npm run build
```

### 2. Create Core Directory Structure

```bash
# Create new directory structure
mkdir -p src/core/interfaces
mkdir -p src/core/services  
mkdir -p src/core/parsers
mkdir -p src/core/formatters
mkdir -p src/api
mkdir -p src/api/cache
mkdir -p tests/unit/core
mkdir -p tests/unit/api
mkdir -p specs/contracts
```

### 3. Start with Interface Extraction

**Priority Task**: Create `src/core/interfaces/IFileAnalyzer.ts`

```typescript
export interface IFileAnalyzer {
  analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;
  validateFile(filePath: string): Promise<ValidationResult>;
}
```

### 4. Run First Validation

```bash
# Ensure TypeScript compilation still works
npm run build

# Run existing tests to confirm no regressions
npm test
```

## Week 1 Sprint Plan

### Day 1-2: Interface Definition
- [ ] Create `IFileAnalyzer` interface
- [ ] Create `ITypeScriptParser` interface  
- [ ] Create `IOutputFormatter` interface
- [ ] Test TypeScript compilation

### Day 3-4: Service Refactoring
- [ ] Refactor `FileAnalyzer` to implement interface
- [ ] Move to `src/core/services/FileAnalyzer.ts`
- [ ] Update imports and ensure tests pass
- [ ] Add dependency injection support

### Day 5: Parser Consolidation  
- [ ] Consolidate parser logic into single class
- [ ] Move to `src/core/parsers/TypeScriptParser.ts`
- [ ] Implement `ITypeScriptParser` interface
- [ ] Update tests and validate functionality

## Critical Success Criteria

### ✅ Phase 1 Success Metrics
- [ ] All existing tests continue to pass
- [ ] TypeScript compilation successful
- [ ] CLI functionality unchanged
- [ ] No performance regression (>5%)

### 🚨 Risk Mitigation
- **Daily Testing**: Run full test suite after each change
- **Performance Monitoring**: Benchmark CLI performance daily
- **Backup Strategy**: Commit frequently, tag stable points

## Development Commands

### Testing Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration
```

### Build Commands
```bash
# Standard build
npm run build

# Build with type checking
npm run build:check

# Clean build
npm run clean && npm run build
```

### Validation Commands
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## File Migration Checklist

### Phase 1 Files to Move/Modify

#### Core Services
- [ ] `src/services/FileAnalyzer.ts` → `src/core/services/FileAnalyzer.ts`
- [ ] `src/services/TypeScriptParser.ts` → `src/core/parsers/TypeScriptParser.ts`
- [ ] `src/formatters/OutputFormatter.ts` → `src/core/formatters/OutputFormatter.ts`

#### New Interface Files
- [ ] `src/core/interfaces/IFileAnalyzer.ts`
- [ ] `src/core/interfaces/ITypeScriptParser.ts`  
- [ ] `src/core/interfaces/IOutputFormatter.ts`

#### Test Files to Update
- [ ] `tests/unit/services/FileAnalyzer.test.ts`
- [ ] `tests/unit/services/TypeScriptParser.test.ts`
- [ ] `tests/unit/formatters/OutputFormatter.test.ts`

## Implementation Order

### Step 1: Interface Extraction (Low Risk)
```typescript
// Start with simplest interface
export interface IFileAnalyzer {
  analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;
  validateFile(filePath: string): Promise<ValidationResult>;
}
```

### Step 2: Service Implementation (Medium Risk)
```typescript
// Update existing service to implement interface
export class FileAnalyzer implements IFileAnalyzer {
  // Existing implementation + interface compliance
}
```

### Step 3: Dependency Injection (Medium Risk)
```typescript
// Add constructor injection
export class FileAnalyzer implements IFileAnalyzer {
  constructor(
    private parser: ITypeScriptParser,
    private formatter: IOutputFormatter
  ) {}
}
```

### Step 4: CLI Integration Test (High Risk)
```bash
# Verify CLI still works after each change
./analyze-file demo/examples/simple-component.tsx --format json
./analyze-file demo/examples/complex-app.tsx --format text
```

## Code Review Checklist

### Before Each Commit
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] CLI functionality verified
- [ ] Code follows existing patterns
- [ ] No new dependencies added without approval

### Weekly Review Points
- [ ] Performance benchmarks maintained
- [ ] Test coverage not decreased
- [ ] Documentation updated
- [ ] Git commit messages clear
- [ ] Feature branch up to date with main

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: Import Path Errors
**Problem**: Moving files breaks import statements
**Solution**: Use find-and-replace to update imports systematically
```bash
# Find all files importing moved service
grep -r "services/FileAnalyzer" src/
# Update imports to new path
```

#### Issue: Test Failures After Refactoring
**Problem**: Tests fail due to interface changes
**Solution**: Update test mocks to implement interfaces
```typescript
// Old mock
const mockAnalyzer = { analyzeFile: jest.fn() };

// New mock with interface
const mockAnalyzer: IFileAnalyzer = { 
  analyzeFile: jest.fn(),
  validateFile: jest.fn()
};
```

#### Issue: Performance Regression
**Problem**: New layers add overhead
**Solution**: Profile and optimize hot paths
```bash
# Run performance tests
npm run test:performance
# Profile specific operations
node --prof analyze-file-test.js
```

## Emergency Rollback Plan

### If Critical Issues Arise

1. **Immediate Rollback**
```bash
git stash
git checkout main
npm test  # Verify main branch works
```

2. **Selective Rollback**
```bash
# Revert specific files
git checkout HEAD~1 -- src/services/FileAnalyzer.ts
npm test
```

3. **Branch Recovery**
```bash
# Create recovery branch from last known good state
git checkout -b feature/002-api-modularization-recovery <commit-hash>
```

## Communication Plan

### Daily Standups
- Progress on current task
- Any blockers or risks
- Performance impact assessment
- Test status update

### Weekly Reviews
- Phase completion status
- Risk assessment updates
- Performance benchmark results
- Next week's priorities

## Success Indicators

### Green Lights 🟢
- All tests passing
- CLI output identical to baseline
- Performance within 5% of baseline
- TypeScript compilation clean
- No new linting errors

### Yellow Lights 🟡  
- Minor test failures
- Performance 5-10% degradation
- Non-critical TypeScript warnings
- Minor CLI output differences

### Red Lights 🔴
- Major test failures
- CLI functionality broken
- Performance >10% degradation
- TypeScript compilation errors
- Critical functionality missing

## Next Phase Preparation

### Preparing for Phase 2 (API Implementation)
- [ ] Document interface designs
- [ ] Plan API class structure
- [ ] Design error handling strategy
- [ ] Prepare integration test plan
- [ ] Set up API documentation framework

## Resources & References

- **Specification**: `specs/002-api-modularization.md`
- **Implementation Plan**: `specs/002-api-modularization-plan.md`
- **API Contracts**: `specs/contracts/api-contracts.md`
- **Current Demo**: `demo/run-demo.sh`
- **Format Demo**: `demo/format-demo.sh`

## Contact & Support

For questions or issues during implementation:
1. Review specification documents
2. Check troubleshooting guide
3. Run validation commands
4. Create detailed issue description with logs

---

**Ready to start?** Begin with Step 1 interface extraction and validate each change thoroughly before proceeding to the next step.