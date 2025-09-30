# Scenarios

**Purpose**: Real-world usage scenarios and demonstrations separate from core examples

---

## Overview

This directory contains real-world usage scenarios and demonstrations that show how to integrate the Dependency Linker into various development workflows. Unlike the `examples/` directory which contains basic API usage examples, scenarios focus on complete, production-ready integration patterns.

---

## Directory Purpose

### Scenarios vs Examples

| Aspect | `scenarios/` | `examples/` |
|--------|--------------|-------------|
| **Purpose** | Real-world integrations | Basic API demonstrations |
| **Complexity** | Production-ready workflows | Simple, focused examples |
| **Scope** | Complete use cases | Individual features |
| **Maintenance** | Separate from core code | Maintained with API changes |
| **Updates** | Updated for new patterns | Updated for API changes |

---

## Available Scenarios

### Single File Analysis (`single-file-analysis-demo.ts`)

Demonstrates single file analysis API integration patterns:

1. **Basic single file analysis**
2. **Custom database path configuration**
3. **Multiple files batch processing**
4. **Analyzer instance reuse for performance**
5. **Error handling patterns**
6. **Explicit language specification**
7. **Analysis without inference**

**Run the scenario:**
```bash
npm run build
node scenarios/single-file-analysis-demo.js
```

**Use cases covered:**
- File watcher integration
- CI/CD pipeline integration
- IDE extension development
- Incremental build systems

---

## Creating New Scenarios

### Scenario Template

```typescript
/**
 * [Scenario Name]
 * [Brief description of the scenario]
 */

import { /* required APIs */ } from '../src/integration';

// Configuration
const config = {
  // scenario-specific configuration
};

/**
 * Scenario function
 */
async function scenarioName() {
  console.log('\n=== [Scenario Name] ===\n');

  try {
    // Scenario implementation

    console.log('✅ Scenario completed');
  } catch (error) {
    console.error('❌ Scenario failed:', error);
  }
}

// Main execution
if (require.main === module) {
  scenarioName().catch(console.error);
}

export { scenarioName };
```

### Guidelines

#### DO ✅
- Focus on complete, real-world use cases
- Include error handling and cleanup
- Document prerequisites and setup
- Provide clear console output
- Show production-ready patterns
- Include performance considerations
- Add comments explaining decisions

#### DON'T ❌
- Don't duplicate basic examples
- Don't mix with core API examples
- Don't skip error handling
- Don't use unrealistic patterns
- Don't ignore resource cleanup
- Don't assume environment setup

---

## Scenario Categories

### 1. Integration Scenarios
Integrating with external tools and frameworks:
- File watchers (chokidar, node:fs.watch)
- Build tools (Webpack, Vite, esbuild)
- CI/CD pipelines (GitHub Actions, Jenkins)
- IDE extensions (VS Code, IntelliJ)

### 2. Workflow Scenarios
Development workflow integrations:
- Incremental analysis
- Monorepo management
- Dependency tracking
- Impact analysis

### 3. Production Scenarios
Production-ready implementations:
- High-volume file processing
- Memory optimization
- Error recovery
- Performance monitoring

### 4. Advanced Scenarios
Complex usage patterns:
- Custom analyzers
- Plugin development
- Database optimization
- Multi-project analysis

---

## Running Scenarios

### Build First
```bash
npm run build
```

### Run Individual Scenario
```bash
node scenarios/single-file-analysis-demo.js
```

### Run with Debug Output
```bash
DEBUG=1 node scenarios/[scenario-name].js
```

### Run with Custom Configuration
```bash
PROJECT_ROOT=/path/to/project node scenarios/[scenario-name].js
```

---

## Scenario Maintenance

### When to Update
1. **API Changes**: When integration APIs are updated
2. **New Patterns**: When new usage patterns emerge
3. **Bug Fixes**: When issues are discovered
4. **Performance**: When optimization opportunities found

### Update Process
1. Test scenario with latest API
2. Update imports and API calls
3. Verify scenario still works
4. Update documentation if needed
5. Commit with descriptive message

---

## Contributing Scenarios

### Proposal Process
1. **Identify Use Case**: Find real-world integration need
2. **Check Existing**: Ensure not already covered
3. **Create Issue**: Propose new scenario with description
4. **Implement**: Follow template and guidelines
5. **Test**: Verify scenario works correctly
6. **Document**: Add to this README
7. **Submit PR**: Request review

### Review Criteria
- ✅ Represents real-world use case
- ✅ Complete and runnable
- ✅ Well-documented with comments
- ✅ Includes error handling
- ✅ Production-ready patterns
- ✅ Performance considerations
- ✅ Resource cleanup

---

## Testing Scenarios

### Manual Testing
```bash
# Build project
npm run build

# Run scenario
node scenarios/[scenario-name].js

# Verify output and results
```

### Automated Testing
```bash
# Run scenario tests (if available)
npm test -- scenarios
```

### Integration Testing
- Test with real project files
- Verify database creation
- Check analysis results
- Validate performance

---

## Related Documentation

- [Examples README](../examples/README.md) - Basic API examples
- [Single File Analysis API](../docs/single-file-analysis-api.md) - API reference
- [Integration Guide](../docs/API.md) - Integration documentation
- [Module Organization](../docs/module-organization.md) - Project structure

---

## Scenario Index

| Scenario | Description | Complexity | Status |
|----------|-------------|------------|--------|
| [single-file-analysis-demo.ts](single-file-analysis-demo.ts) | Single file analysis patterns | Medium | ✅ |

---

**Last Updated**: 2025-09-30
**Maintainer**: Scenarios Team