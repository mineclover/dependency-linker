# Essential Development Commands

## Build and Development
```bash
# Build project
npm run build

# Watch mode for development
npm run dev

# Start CLI tool
npm start
```

## Testing
```bash
# Run all tests
npm test

# Watch mode testing
npm test:watch

# Test with coverage
npm test:coverage

# Performance measurement
node scripts/measure-test-performance.js
```

## Code Quality
```bash
# Lint code (Biome)
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## CLI Usage
```bash
# Make CLI executable
chmod +x analyze-file

# Analyze TypeScript file
./analyze-file src/component.tsx

# Human-readable format
./analyze-file src/component.tsx --format summary

# Include source locations
./analyze-file src/component.tsx --include-sources

# Help
./analyze-file --help
```

## Verification Commands
```bash
# Verify project separation
npm run verify-separation

# Validate types
npm run validate-types

# Run benchmarks
npm run benchmark

# Quick benchmark
npm run benchmark:quick

# Diagnostic tool
npm run diagnostic
```

## Git and System Commands (macOS)
```bash
# Git operations
git status
git add .
git commit -m "message"
git push

# File operations
ls -la
find . -name "*.ts"
grep -r "pattern" src/
```

## Task Completion Checklist
When completing a task, always run:
1. `npm run build` - Ensure build succeeds
2. `npm run lint` - Check code quality
3. `npm test` - Verify tests pass
4. `npm run format` - Format code