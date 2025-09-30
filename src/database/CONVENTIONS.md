# Database Module Conventions

**Purpose**: Graph database system for code analysis with inference capabilities

---

## File Organization

### Directory Structure

```
src/database/
├── CONVENTIONS.md              # This file
├── README.md                   # Usage guide
├── index.ts                    # Module exports
├── GraphDatabase.ts            # Core database class
├── GraphStorage.ts             # Storage operations
├── GraphQueryEngine.ts         # Query engine
│
├── core/                       # Core functionality
│   ├── index.ts
│   ├── DatabaseInitializer.ts
│   └── types.ts
│
├── inference/                  # Inference system (centralized)
│   ├── CONVENTIONS.md
│   ├── README.md
│   ├── index.ts
│   ├── EdgeTypeRegistry.ts    # Edge type management
│   ├── InferenceEngine.ts     # Inference engine
│   └── InferenceTypes.ts      # Type definitions
│
├── services/                   # Service classes
│   ├── FileDependencyAnalyzer.ts
│   └── ...
│
├── types/                      # Type definitions
│   └── ...
│
└── utils/                      # Utility functions
    └── ...
```

### File Naming

- **Core classes**: PascalCase (e.g., `GraphDatabase.ts`)
- **Service classes**: PascalCase with descriptive name (e.g., `FileDependencyAnalyzer.ts`)
- **Utility functions**: camelCase (e.g., `queryHelpers.ts`)
- **Type definitions**: PascalCase or descriptive name (e.g., `GraphTypes.ts`)

---

## Schema Management

### Core Tables

#### 1. nodes
**Purpose**: Store all code entities
**Columns**: id, identifier, type, name, source_file, language, metadata, position

```typescript
// Node identifier format
`${type}:${uniquePath}`
// Examples:
"file:/path/to/file.ts"
"class:/path/to/file.ts:ClassName"
"method:/path/to/file.ts:ClassName.methodName"
```

#### 2. edges
**Purpose**: Store all relationships
**Columns**: id, start_node_id, end_node_id, type, label, metadata, weight

```typescript
// Edge types follow hierarchy
"imports"           // Parent type
"imports_file"      // Child type
"imports_package"   // Child type
```

#### 3. edge_types
**Purpose**: Define edge type hierarchy and inference rules
**Columns**: type, description, is_directed, parent_type, is_transitive, is_inheritable

```typescript
// Edge type definition
{
  type: "imports_file",
  description: "Direct file import",
  is_directed: true,
  parent_type: "imports",
  is_transitive: false,
  is_inheritable: false
}
```

### Schema Conventions

#### DO ✅
- Use `identifier` column for unique identification across project
- Store JSON in `metadata` column for flexible data
- Use `source_file` column to track which file a node came from
- Include position information (start_line, end_line, etc.) when available
- Use lowercase with underscores for edge types (e.g., `imports_file`)

#### DON'T ❌
- Don't store duplicate information in both columns and metadata
- Don't create new tables for specific entity types (use nodes table)
- Don't bypass edge_types registry for custom edge types
- Don't use uppercase or camelCase for edge types

---

## Edge Type Management

### Registry as Single Source of Truth

**EdgeTypeRegistry** (in `inference/EdgeTypeRegistry.ts`) is the **only** place to define edge types.

```typescript
import { EdgeTypeRegistry } from './inference/EdgeTypeRegistry';

// Get edge type definition
const edgeType = EdgeTypeRegistry.get('imports_file');

// Get all children of a parent type
const children = EdgeTypeRegistry.getChildren('imports');

// Validate entire hierarchy
const validation = EdgeTypeRegistry.validateHierarchy();
```

### Edge Type Hierarchy

```
imports (parent)
├── imports_file
├── imports_package
└── imports_module

contains (parent)
├── contains_class
├── contains_function
└── contains_variable

depends_on (parent, transitive)
└── depends_on_file
```

### Adding New Edge Types

1. **Define in EdgeTypeRegistry.ts**:
```typescript
{
  type: 'new_edge_type',
  description: 'Clear description of relationship',
  is_directed: true,
  parent_type: 'parent_type_name',  // or null for root
  is_transitive: false,              // A→B, B→C ⇒ A→C
  is_inheritable: false              // A contains B, B rel C ⇒ A rel C
}
```

2. **Update Analyzer**: Add to analyzer's `OWNED_EDGE_TYPES`:
```typescript
class MyAnalyzer {
  public static readonly OWNED_EDGE_TYPES = [
    'new_edge_type',
    'related_edge_type'
  ] as const;
}
```

3. **Document**: Update edge type documentation
4. **Test**: Add tests for new edge type behavior

### Edge Type Validation

```typescript
// Validate before using
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  throw new Error(`Edge type errors: ${validation.errors.join(', ')}`);
}
```

---

## Analyzer Ownership Pattern

### OWNED_EDGE_TYPES Convention

Each analyzer **must** declare which edge types it owns:

```typescript
export class FileDependencyAnalyzer {
  // Declare owned edge types
  public static readonly OWNED_EDGE_TYPES = [
    'imports_file',
    'imports_package',
    'depends_on_file'
  ] as const;

  async analyze(file: string): Promise<AnalysisResult> {
    // Analysis implementation
  }
}
```

### Cleanup Isolation

Analyzers only clean up edges they own:

```typescript
// Before re-analyzing file
const edgeTypesToClean = MyAnalyzer.OWNED_EDGE_TYPES;

await db.run(`
  DELETE FROM edges
  WHERE type IN (${edgeTypesToClean.map(() => '?').join(',')})
    AND start_node_id IN (
      SELECT id FROM nodes WHERE source_file = ?
    )
`, [...edgeTypesToClean, sourceFile]);
```

### Multi-Analyzer Coordination

```typescript
// Different analyzers own different edge types
class ImportAnalyzer {
  static OWNED_EDGE_TYPES = ['imports_file', 'imports_package'];
}

class CallGraphAnalyzer {
  static OWNED_EDGE_TYPES = ['calls_function', 'calls_method'];
}

class TypeAnalyzer {
  static OWNED_EDGE_TYPES = ['implements_interface', 'extends_class'];
}
```

---

## Inference System

### Inference Types

1. **Hierarchical Inference**: Query parent type includes all child types
2. **Transitive Inference**: A→B→C implies A→C
3. **Inheritable Inference**: A contains B, B rel C implies A rel C

### Using Inference Engine

```typescript
import { InferenceEngine } from './inference';

const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// Hierarchical: Get all imports (including child types)
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true
});

// Transitive: Find all dependencies
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10
});

// Inheritable: Propagate through containment
const inherited = await engine.queryInheritable(nodeId, 'contains', 'declares');
```

### Cache Strategies

- **eager**: Update cache immediately on data changes
- **lazy**: Update cache on query if stale
- **manual**: Explicit cache invalidation

```typescript
// Manual cache invalidation
await engine.invalidateCache();

// Selective cache refresh
await engine.refreshCacheForEdgeType('imports');
```

---

## Query Optimization

### Indexing Strategy

```sql
-- Automatically created indexes
CREATE INDEX idx_nodes_identifier ON nodes(identifier);
CREATE INDEX idx_nodes_source_file ON nodes(source_file);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_edges_start_node ON edges(start_node_id);
CREATE INDEX idx_edges_end_node ON edges(end_node_id);
CREATE INDEX idx_edges_type ON edges(type);
```

### Query Patterns

#### DO ✅

```typescript
// Use parameterized queries
const stmt = db.prepare('SELECT * FROM nodes WHERE type = ?');
const nodes = stmt.all('file');

// Use indexes
const result = await db.all(`
  SELECT * FROM nodes
  WHERE source_file = ? AND type = ?
`, sourceFile, nodeType);

// Batch operations
const stmt = db.prepare('INSERT INTO nodes VALUES (?, ?, ?)');
const insertMany = db.transaction((nodes) => {
  for (const node of nodes) {
    stmt.run(node.id, node.identifier, node.type);
  }
});
insertMany(nodeArray);
```

#### DON'T ❌

```typescript
// Don't use string concatenation (SQL injection risk)
const bad = `SELECT * FROM nodes WHERE type = '${userInput}'`;

// Don't query without indexes
const bad = `SELECT * FROM nodes WHERE metadata LIKE '%pattern%'`;

// Don't do many small individual inserts
for (const node of nodes) {
  await db.run('INSERT INTO nodes ...', node); // Slow!
}
```

---

## Module Integration

### Import Patterns

```typescript
// From other modules
import { GraphDatabase } from './database';
import { InferenceEngine, EdgeTypeRegistry } from './database/inference';

// Dynamic imports (avoid circular dependencies)
const { EdgeTypeRegistry } = await import('./inference/EdgeTypeRegistry');
```

### Export Patterns

```typescript
// src/database/index.ts
export { GraphDatabase } from './GraphDatabase';
export { GraphStorage } from './GraphStorage';
export { GraphQueryEngine } from './GraphQueryEngine';

// Re-export inference module
export * from './inference';
```

---

## Error Handling

### Database Errors

```typescript
try {
  await db.run('INSERT INTO nodes ...');
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT') {
    // Handle duplicate identifier
  } else if (error.code === 'SQLITE_BUSY') {
    // Retry or wait
  } else {
    throw error;
  }
}
```

### Transaction Patterns

```typescript
// Use transactions for multi-operation changes
const transaction = db.transaction((operations) => {
  db.run('DELETE FROM edges WHERE ...');
  db.run('INSERT INTO edges ...');
  db.run('UPDATE nodes ...');
});

try {
  transaction();
} catch (error) {
  // Transaction automatically rolled back
  console.error('Transaction failed:', error);
}
```

---

## Testing Conventions

### Test Database Setup

```typescript
// Use in-memory database for tests
const testDb = new Database(':memory:');

// Initialize schema
await initializeSchema(testDb);

// Clean up after tests
afterAll(() => {
  testDb.close();
});
```

### Test Data Patterns

```typescript
// Use consistent test data
const testNodes = [
  { identifier: 'file:/test/file1.ts', type: 'file', name: 'file1.ts' },
  { identifier: 'class:/test/file1.ts:TestClass', type: 'class', name: 'TestClass' }
];

// Use fixtures for complex scenarios
import { loadFixture } from '../fixtures/database-fixtures';
const fixture = loadFixture('complex-graph');
```

---

## Performance Guidelines

### DO ✅
- Use transactions for bulk operations
- Prepare statements for repeated queries
- Use appropriate indexes
- Cache inference results when appropriate
- Batch database operations
- Monitor query performance in production

### DON'T ❌
- Don't load entire graph into memory
- Don't perform N+1 queries
- Don't skip transaction for multi-step operations
- Don't query during tight loops
- Don't ignore database locks

---

## Migration Strategy

### Rescan-Based Approach

**NO MIGRATION SCRIPTS** - Delete database and rescan:

```typescript
// Simple rescan procedure
1. Delete old database file
2. Create new database with current schema
3. Re-run all analyzers on source files
4. Rebuild inference cache
```

### Schema Updates

1. Update `GraphDatabase.ts` schema initialization
2. Update EdgeTypeRegistry if edge types changed
3. Document schema changes
4. Users delete old DB and rescan

---

## Related Documentation

- [Database README](README.md) - Usage guide and examples
- [Inference Module README](inference/README.md) - Inference system details
- [Inference Conventions](inference/CONVENTIONS.md) - Inference-specific conventions
- [Maintenance Guide](../../docs/graph-maintenance-conventions.md) - Maintenance procedures
- [Module Organization](../../docs/module-organization.md) - Overall structure

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Database Module Team