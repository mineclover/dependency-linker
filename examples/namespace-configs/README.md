# Namespace-Scenario Configuration Examples

Real-world configuration examples demonstrating Namespace-Scenario Integration.

## Overview

These examples show how to configure namespaces with different scenario combinations for various project structures. Each example demonstrates the **horizontal scalability** principle: new analysis capabilities via configuration, not code changes.

## Core Concept

```
New Analysis = Namespace Addition + Scenario Combination
```

Same file type (`.ts`) can be analyzed differently based on namespace context:
- `frontend` namespace → React component analysis
- `backend` namespace → API and business logic analysis
- `shared` namespace → Type and utility analysis

---

## Example 1: Monorepo Configuration

**File**: `monorepo-example.json`

**Use Case**: Multi-package monorepo with web, mobile, backend, and shared packages.

**Namespaces**:
- `web`: React web app with full symbol tracking
- `mobile`: React Native app with call and instantiation tracking
- `backend`: API with complete dependency analysis
- `shared`: Shared utilities focusing on types
- `docs`: Markdown documentation with heading symbols
- `tests`: Test files with basic file dependency tracking

**Key Features**:
- Cost optimization: Documentation uses only `markdown-linking`
- Context-based analysis: Different scenarios for web vs. mobile
- Semantic tagging: `frontend`, `backend`, `shared`, `documentation`, `test`

**Usage**:
```bash
# Create namespaces from example
cp examples/namespace-configs/monorepo-example.json deps.config.json

# Analyze specific namespace
node dist/cli/namespace-analyzer.js analyze web

# Analyze all namespaces with cross-namespace dependency detection
node dist/cli/namespace-analyzer.js analyze-all --show-cross

# Query specific namespace scenarios
node dist/cli/namespace-analyzer.js scenarios web
```

**Expected Output**:
- `web`: 3 scenarios (basic-structure, file-dependency, symbol-dependency)
- `docs`: 1 scenario (markdown-linking)
- Cross-namespace dependencies detected between packages

---

## Example 2: Layered Architecture Configuration

**File**: `layered-architecture-example.json`

**Use Case**: Clean architecture / DDD-style layered application.

**Namespaces**:
- `presentation`: UI components (React) with full symbol tracking
- `application`: Use cases and orchestration with interface tracking
- `domain`: Business logic focusing on types and inheritance
- `infrastructure`: External services with implementation tracking
- `shared-kernel`: Common utilities and types
- `tests`: Test suites with file dependency tracking

**Key Features**:
- Architectural enforcement: Each layer has appropriate scenario configuration
- Domain purity: Domain layer uses minimal scenarios (no file-dependency)
- Dependency direction validation: Detects violations via cross-namespace analysis

**Usage**:
```bash
# Create namespaces from example
cp examples/namespace-configs/layered-architecture-example.json deps.config.json

# Analyze domain layer (should have minimal external dependencies)
node dist/cli/namespace-analyzer.js analyze domain

# Check for architectural violations
node dist/cli/namespace-analyzer.js analyze-all --show-cross
# Expected: No dependencies from domain → infrastructure
```

**Architectural Rules Validation**:
- ✅ Presentation → Application → Domain → Infrastructure
- ❌ Domain should NOT depend on Infrastructure
- ❌ Domain should NOT depend on Presentation

---

## Example 3: Multi-Framework Configuration

**File**: `multi-framework-example.json`

**Use Case**: Polyglot project with React, Vue, Angular, Node.js, Python, and Go.

**Namespaces**:
- `react-app`: React SPA with full TypeScript analysis
- `vue-app`: Vue.js SPA with file dependency tracking
- `angular-app`: Angular app with complete symbol tracking
- `node-api`: Express API with call/instantiation tracking
- `python-services`: Python microservices (FastAPI/Django)
- `go-services`: Go microservices
- `shared-types`: TypeScript contracts shared across frameworks
- `documentation`: Markdown docs with wiki links and hashtags

**Key Features**:
- Language-specific scenarios: TypeScript/JavaScript scenarios for TS apps only
- Framework adaptation: Different symbol tracking configs per framework
- Cross-language integration: Shared types tracked separately
- Unified documentation: Single markdown analysis for all frameworks

**Usage**:
```bash
# Create namespaces from example
cp examples/namespace-configs/multi-framework-example.json deps.config.json

# Analyze TypeScript applications
node dist/cli/namespace-analyzer.js analyze react-app
node dist/cli/namespace-analyzer.js analyze angular-app

# Analyze backend services
node dist/cli/namespace-analyzer.js analyze node-api
node dist/cli/namespace-analyzer.js analyze python-services
node dist/cli/namespace-analyzer.js analyze go-services

# Check integration points
node dist/cli/namespace-analyzer.js cross-namespace --detailed
```

**Integration Patterns**:
- Frontend apps → `shared-types` (contract dependencies)
- Backend services → `shared-types` (API contracts)
- All apps → `documentation` (documentation references)

---

## Scenario Configuration Options

### Symbol Dependency Options

```json
"scenarioConfig": {
  "symbol-dependency": {
    "trackCalls": true,           // Track function/method calls
    "trackInstantiations": true,  // Track class instantiation (new)
    "trackTypeReferences": true,  // Track type usage in annotations
    "trackExtends": true,         // Track class inheritance
    "trackImplements": true       // Track interface implementation
  }
}
```

### Markdown Linking Options

```json
"scenarioConfig": {
  "markdown-linking": {
    "extractHashtags": true,        // Extract inline hashtags
    "extractHeadingSymbols": true,  // Extract heading symbols with semantic types
    "trackWikiLinks": true          // Track wiki-style [[links]]
  }
}
```

### File Dependency Options

```json
"scenarioConfig": {
  "file-dependency": {
    "trackDynamicImports": true   // Track dynamic import() statements
  }
}
```

---

## Testing Examples

### Test Individual Example

```bash
# 1. Copy example configuration
cp examples/namespace-configs/monorepo-example.json /tmp/test-config.json

# 2. Create minimal test project structure
mkdir -p /tmp/test-project/packages/{web,backend,docs}
echo "export const WebComponent = () => {}" > /tmp/test-project/packages/web/App.tsx
echo "export class APIService {}" > /tmp/test-project/packages/backend/api.ts
echo "# Documentation" > /tmp/test-project/packages/docs/README.md

# 3. Analyze with configuration
cd /tmp/test-project
node /path/to/dist/cli/namespace-analyzer.js analyze web -c /tmp/test-config.json
```

### Validate Configuration

```bash
# Check scenario validity
node dist/cli/namespace-analyzer.js scenarios

# Verify namespace configuration
node dist/cli/namespace-analyzer.js list-namespaces -c examples/namespace-configs/monorepo-example.json
```

---

## Benefits Demonstrated

### 1. Cost Optimization
- **Documentation**: Only `markdown-linking` scenario (no AST parsing)
- **UI Analysis**: Full symbol tracking for components
- **Shared Code**: Type-focused analysis (minimal overhead)

### 2. Context-Based Analysis
Same `.ts` file analyzed differently:
- In `frontend` namespace → Component and hook analysis
- In `backend` namespace → API and service analysis
- In `shared` namespace → Type and interface analysis

### 3. Horizontal Scalability
Add new analysis without code changes:
```json
{
  "graphql-schema": {
    "filePatterns": ["src/**/*.graphql"],
    "scenarios": ["graphql-schema"]  // ← Just add new scenario ID
  }
}
```

---

## Next Steps

1. **Customize Examples**: Adapt configurations to your project structure
2. **Add Scenarios**: Combine built-in scenarios or create custom ones
3. **Validate Architecture**: Use cross-namespace analysis to enforce rules
4. **Optimize Performance**: Adjust scenario configs to reduce analysis overhead

---

## Related Documentation

- [Scenario System](../../docs/scenario-system.md) - Complete scenario architecture
- [Namespace Guide](../../docs/namespace-guide.md) - Namespace configuration
- [CLI Reference](../../docs/cli-reference.md) - Command-line interface
- [NEXT_TASKS.md](../../features/NEXT_TASKS.md) - Implementation roadmap

---

**Last Updated**: 2025-10-04
