# Namespace-Based Dependency Analysis

Complete integration of namespace-based file discovery with dependency analysis and GraphDB storage.

## Overview

The namespace analyzer combines:
- **Namespace-based file pattern matching** from deps-cli
- **Individual file dependency analysis** from dependency-linker
- **GraphDB storage** for querying and analyzing dependencies

## Features

- ✅ Namespace configuration management (create, list, delete)
- ✅ File pattern matching with glob support
- ✅ Automatic dependency analysis for all files in a namespace
- ✅ GraphDB storage with metadata tracking
- ✅ Cross-namespace dependency detection
- ✅ Circular dependency detection
- ✅ CLI tool for easy usage

## Configuration

Create a `deps.config.json` file:

```json
{
  "default": "source",
  "namespaces": {
    "source": {
      "filePatterns": ["src/**/*.ts"],
      "excludePatterns": ["**/*.d.ts", "**/*.test.ts"],
      "description": "Source code files"
    },
    "tests": {
      "filePatterns": ["tests/**/*.ts", "**/*.test.ts"],
      "excludePatterns": [],
      "description": "Test files"
    }
  }
}
```

## CLI Commands

### List Namespaces
```bash
node dist/cli/namespace-analyzer.js list-namespaces
```

### List Files in Namespace
```bash
node dist/cli/namespace-analyzer.js list-files source
```

### Analyze Namespace Dependencies
```bash
# Human-readable output
node dist/cli/namespace-analyzer.js analyze source

# JSON output
node dist/cli/namespace-analyzer.js analyze source --json
```

### Analyze All Namespaces
```bash
node dist/cli/namespace-analyzer.js analyze-all
```

### Query Namespace Data
```bash
# Show all data
node dist/cli/namespace-analyzer.js query source

# Show specific data
node dist/cli/namespace-analyzer.js query source --stats
node dist/cli/namespace-analyzer.js query source --files
node dist/cli/namespace-analyzer.js query source --deps
node dist/cli/namespace-analyzer.js query source --circular
```

### Cross-Namespace Dependencies
```bash
node dist/cli/namespace-analyzer.js cross-namespace
```

## Programmatic Usage

```typescript
import {
  configManager,
  namespaceDependencyAnalyzer,
  NamespaceGraphDB
} from '@context-action/dependency-linker';

// List files in namespace
const files = await configManager.listFiles(
  'source',
  'deps.config.json'
);

// Analyze namespace
const result = await namespaceDependencyAnalyzer.analyzeNamespace(
  'source',
  'deps.config.json',
  { projectRoot: process.cwd() }
);

// Store in database
const db = new NamespaceGraphDB('.dependency-linker/graph.db');
await db.initialize();
await db.storeNamespaceDependencies('source', graph, projectRoot);

// Query from database
const stats = await db.getNamespaceStats('source');
const deps = await db.getNamespaceDependencies('source');
const circular = await db.findNamespaceCircularDependencies('source');
await db.close();
```

## Example Output

### Analyze Command
```bash
$ node dist/cli/namespace-analyzer.js analyze source

🔍 Analyzing namespace: source
📂 Base directory: /Users/user/project

✅ Analysis complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Namespace: source
Total files: 76
Analyzed files: 76
Failed files: 0

Graph Statistics:
  Nodes: 76
  Edges: 245
  Circular dependencies: 2

Database:
  Path: /Users/user/project/.dependency-linker/graph.db
  Stored nodes: 76
  Stored edges: 245
  Stored files: 76
```

### JSON Output
```json
{
  "namespace": "source",
  "totalFiles": 76,
  "analyzedFiles": 76,
  "failedFiles": [],
  "errors": [],
  "graphStats": {
    "nodes": 76,
    "edges": 245,
    "circularDependencies": 2
  },
  "database": {
    "path": "/Users/user/project/.dependency-linker/graph.db",
    "stats": {
      "nodes": 76,
      "edges": 245,
      "files": ["src/index.ts", "src/api/analysis.ts", ...]
    }
  }
}
```

## Architecture

### File Structure
```
src/namespace/
├── types.ts                        # Type definitions
├── FilePatternMatcher.ts           # Glob pattern matching
├── ConfigManager.ts                # Configuration management
├── NamespaceDependencyAnalyzer.ts  # Analysis coordinator
├── NamespaceGraphDB.ts             # GraphDB integration
└── index.ts                        # Public exports

src/cli/
└── namespace-analyzer.ts           # CLI interface
```

### Data Flow
```
1. Configuration → FilePatternMatcher → List of files
2. Files → DependencyGraphBuilder → Dependency graph
3. Dependency graph → NamespaceGraphDB → SQLite storage
4. SQLite → Query interface → Results
```

## Integration Points

### From deps-cli
- Namespace configuration system
- File pattern matching with glob
- Configuration file management

### From dependency-linker
- AST-based dependency analysis
- Multi-language support (TS, JS, Java, Python, Go)
- DependencyGraphBuilder
- GraphDatabase with query capabilities

### New Capabilities
- Namespace metadata in graph nodes
- Cross-namespace dependency tracking
- Namespace-scoped queries
- Batch analysis of multiple namespaces

## Future Enhancements

- [ ] Incremental analysis (only analyze changed files)
- [ ] Namespace dependency visualization
- [ ] Dependency impact analysis
- [ ] Export to different formats (dot, mermaid, etc.)
- [ ] Watch mode for continuous analysis
- [ ] Performance metrics and optimization
- [ ] Advanced querying with custom filters

## Testing

The integration has been tested with the dependency-linker codebase itself:
- ✅ 76 source files analyzed successfully
- ✅ All files stored in GraphDB
- ✅ Zero analysis errors
- ✅ Complete end-to-end workflow validated

## Build and Development

```bash
# Build the project
npm run build

# Copy SQL schema (required after build)
cp src/database/schema.sql dist/database/

# Run analysis
node dist/cli/namespace-analyzer.js analyze source

# Create namespace
node dist/cli/namespace-analyzer.js create-namespace my-namespace \
  --patterns "src/**/*.ts" \
  --exclude "**/*.test.ts"
```

## Version

- **dependency-linker**: v3.0.0
- **Namespace integration**: 2025-10-02

---

Created by integrating deps-cli namespace functionality into dependency-linker for comprehensive codebase dependency analysis.
