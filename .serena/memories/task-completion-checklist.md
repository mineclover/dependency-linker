# Task Completion Checklist

## Always Run Before Completing Tasks

### 1. Build Verification
```bash
npm run build
```
- Ensures TypeScript compilation succeeds
- Generates dist/ output for CLI usage
- Validates all type definitions

### 2. Code Quality Check
```bash
npm run lint
```
- Runs Biome linter with project rules
- Checks for code style violations
- Enforces naming conventions

### 3. Formatting
```bash
npm run format
```
- Applies consistent code formatting
- Uses Biome formatter with tab indentation
- Maintains double quote style

### 4. Test Execution
```bash
npm test
```
- Runs Jest test suite
- Validates core functionality
- Ensures no regressions

## Optional Quality Checks

### Type Validation
```bash
npm run validate-types
```

### Performance Verification
```bash
npm run benchmark:quick
```

### CLI Functionality
```bash
./analyze-file --help
```

## Current Context (Feature 005)
During test optimization phase, also run:
```bash
node scripts/measure-test-performance.js
```

## Before Commits
1. Verify all checks pass
2. Review git status
3. Ensure no debugging code left
4. Check documentation updates if needed

## Critical Rules
- **Never commit failing tests**
- **Always run build before pushing**
- **Lint must pass without warnings**
- **CLI tool must remain functional**