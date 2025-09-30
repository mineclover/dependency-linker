# Inference Module Conventions

**Purpose**: Centralized inference capabilities with edge type management and three inference types

---

## Module Overview

The inference module provides:
- **EdgeTypeRegistry**: Single source of truth for all edge type definitions
- **InferenceEngine**: Three inference types (hierarchical, transitive, inheritable)
- **InferenceTypes**: Complete TypeScript type definitions

---

## File Organization

### Module Structure

```
src/database/inference/
├── CONVENTIONS.md           # This file
├── README.md               # Module documentation
├── index.ts                # Module exports
├── EdgeTypeRegistry.ts     # Edge type management
├── InferenceEngine.ts      # Inference engine implementation
└── InferenceTypes.ts       # Type definitions
```

### File Responsibilities

- **EdgeTypeRegistry.ts**: Edge type definitions, hierarchy, validation
- **InferenceEngine.ts**: SQL Recursive CTE-based inference implementation
- **InferenceTypes.ts**: All TypeScript interfaces for type safety
- **index.ts**: Clean module exports

---

## Edge Type Registry

### Single Source of Truth

**CRITICAL**: EdgeTypeRegistry is the **only** place to define edge types. Never define edge types in:
- Analyzer code
- Database schema directly
- Configuration files
- Test fixtures (except for testing registry itself)

### Edge Type Definition

```typescript
{
  type: 'edge_type_name',          // lowercase_with_underscores
  description: 'Clear description',
  is_directed: true,               // Most relationships are directed
  parent_type: 'parent_name',      // null for root types
  is_transitive: false,            // A→B, B→C ⇒ A→C
  is_inheritable: false            // A contains B, B rel C ⇒ A rel C
}
```

### Hierarchy Design

```
Root Type (no parent)
├── Child Type 1 (parent: Root)
│   ├── Grandchild Type 1.1
│   └── Grandchild Type 1.2
└── Child Type 2 (parent: Root)
```

#### DO ✅
- Create logical hierarchies (e.g., `imports` → `imports_file`, `imports_package`)
- Use descriptive type names
- Document parent-child relationships
- Validate hierarchy on initialization
- Keep hierarchy depth reasonable (max 3-4 levels)

#### DON'T ❌
- Don't create cycles in hierarchy
- Don't use types without defining in registry
- Don't bypass registry validation
- Don't modify registry at runtime after initialization

---

## Inference Types

### 1. Hierarchical Inference

**Purpose**: Query parent type automatically includes all child types

```typescript
// Querying "imports" also returns:
// - imports_file
// - imports_package
// - imports_module

const imports = await engine.queryHierarchical('imports', {
  includeChildren: true,  // Default: true
  maxDepth: 3            // Limit traversal depth
});
```

**Use Cases**:
- Getting all relationship types under a category
- Flexible queries that work across edge type changes
- Aggregating similar relationship types

### 2. Transitive Inference

**Purpose**: A→B→C chains imply A→C relationships

```typescript
// If edges: A depends_on B, B depends_on C
// Then inferred: A depends_on C

const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10,     // Limit path length
  includeIntermediate: false  // Only return endpoints
});
```

**Use Cases**:
- Dependency chain analysis
- Impact analysis
- Reachability queries

**Configuration**:
- Set `is_transitive: true` in edge type definition
- Control depth with `maxPathLength`
- Consider performance for large graphs

### 3. Inheritable Inference

**Purpose**: Relationships propagate through containment hierarchy

```typescript
// If edges: File contains Class, Class declares Method
// And "declares" is inheritable
// Then inferred: File declares Method

const inherited = await engine.queryInheritable(nodeId, 'contains', 'declares', {
  maxDepth: 5
});
```

**Use Cases**:
- File-level relationship aggregation
- Module composition analysis
- Hierarchical ownership tracking

**Configuration**:
- Set `is_inheritable: true` in edge type definition
- Define containment relationship (usually `contains`)
- Specify target relationship to propagate

---

## Inference Engine Usage

### Initialization

```typescript
import { InferenceEngine } from './database/inference';

const engine = new InferenceEngine(db, {
  enableCache: true,              // Enable caching
  cacheSyncStrategy: 'lazy',      // 'eager' | 'lazy' | 'manual'
  maxCacheSize: 10000,           // Max cached entries
  cacheExpiry: 3600000           // 1 hour expiry
});
```

### Cache Strategies

#### Eager Strategy
```typescript
// Updates cache immediately on data changes
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'eager'
});

// Cache auto-updates after insertions
await db.run('INSERT INTO edges ...');
// Cache is already updated
```

**Use When**:
- Real-time applications
- Frequent queries, infrequent updates
- Cache consistency is critical

#### Lazy Strategy
```typescript
// Updates cache on query if stale
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'lazy',
  cacheExpiry: 300000  // 5 minutes
});

// Cache updates if expired
const result = await engine.queryTransitive(...);
```

**Use When**:
- Query performance is priority
- Can tolerate slightly stale data
- Update frequency is moderate

#### Manual Strategy
```typescript
// Explicit cache control
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'manual'
});

// Explicit cache refresh
await engine.invalidateCache();
await engine.refreshCacheForEdgeType('depends_on');
```

**Use When**:
- Batch operations
- Specific cache invalidation patterns
- Fine-grained control needed

---

## SQL Recursive CTE Implementation

### Query Pattern

```sql
-- Transitive inference example
WITH RECURSIVE transitive_closure(start_id, end_id, depth) AS (
  -- Base case: direct edges
  SELECT start_node_id, end_node_id, 1
  FROM edges
  WHERE type = ? AND start_node_id = ?

  UNION ALL

  -- Recursive case: follow edges
  SELECT tc.start_id, e.end_node_id, tc.depth + 1
  FROM transitive_closure tc
  JOIN edges e ON tc.end_id = e.start_node_id
  WHERE e.type = ? AND tc.depth < ?
)
SELECT DISTINCT * FROM transitive_closure;
```

### Performance Considerations

#### DO ✅
- Use depth limits to prevent infinite recursion
- Index start_node_id and end_node_id
- Cache results for repeated queries
- Use DISTINCT to avoid duplicates
- Monitor query performance

#### DON'T ❌
- Don't allow unlimited recursion depth
- Don't query transitive closure without indexes
- Don't ignore performance for large graphs
- Don't cache indefinitely without expiry

---

## Type Safety

### TypeScript Interfaces

```typescript
import type {
  InferredRelationType,
  InferredRelationship,
  HierarchicalQueryOptions,
  TransitiveQueryOptions,
  InheritableQueryOptions,
  InferenceEngineConfig,
  InferenceResult
} from './database/inference';
```

### Type Guards

```typescript
function isHierarchicalResult(
  result: InferenceResult
): result is HierarchicalInferenceResult {
  return result.type === 'hierarchical';
}
```

### Strict Type Requirements

#### DO ✅
- Use proper TypeScript types for all function parameters
- Export types from InferenceTypes.ts
- Use type guards for runtime type checking
- Document type constraints in JSDoc

#### DON'T ❌
- Don't use `any` type
- Don't bypass type checking with assertions
- Don't duplicate type definitions
- Don't forget to export types

---

## Error Handling

### Common Error Cases

```typescript
// Edge type not found
try {
  const result = await engine.queryHierarchical('invalid_type');
} catch (error) {
  if (error.code === 'EDGE_TYPE_NOT_FOUND') {
    // Handle missing edge type
  }
}

// Circular hierarchy detected
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  throw new Error(`Hierarchy errors: ${validation.errors.join(', ')}`);
}

// Query timeout
try {
  const result = await engine.queryTransitive(nodeId, 'depends_on', {
    timeout: 5000  // 5 seconds
  });
} catch (error) {
  if (error.code === 'QUERY_TIMEOUT') {
    // Handle timeout
  }
}
```

---

## Testing Conventions

### Unit Tests

```typescript
describe('EdgeTypeRegistry', () => {
  test('validates hierarchy', () => {
    const result = EdgeTypeRegistry.validateHierarchy();
    expect(result.valid).toBe(true);
  });

  test('detects cycles', () => {
    // Test cycle detection
  });
});

describe('InferenceEngine', () => {
  test('hierarchical inference includes children', async () => {
    const result = await engine.queryHierarchical('imports');
    expect(result.edgeTypes).toContain('imports_file');
  });

  test('transitive inference follows chains', async () => {
    // Test A→B→C implies A→C
  });
});
```

### Integration Tests

```typescript
describe('Inference System Integration', () => {
  let db: Database;
  let engine: InferenceEngine;

  beforeEach(async () => {
    db = new Database(':memory:');
    await initializeSchema(db);
    engine = new InferenceEngine(db);
  });

  test('full inference workflow', async () => {
    // Insert test data
    // Run all inference types
    // Verify results
  });
});
```

---

## Performance Guidelines

### Query Optimization

```typescript
// ✅ Good: Use specific edge types when possible
const result = await engine.queryHierarchical('imports_file');

// ⚠️ Careful: Root types query all children
const result = await engine.queryHierarchical('imports'); // All import types

// ✅ Good: Limit depth for transitive queries
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 5  // Reasonable limit
});

// ❌ Bad: Unlimited depth on large graphs
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 999999  // Too large
});
```

### Cache Management

```typescript
// ✅ Good: Enable caching for repeated queries
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// ✅ Good: Invalidate cache after bulk updates
await bulkInsertEdges(edges);
await engine.invalidateCache();

// ❌ Bad: No cache for repeated queries
const engine = new InferenceEngine(db, {
  enableCache: false  // Miss opportunities
});
```

### Memory Management

```typescript
// ✅ Good: Clear cache periodically
if (engine.getCacheSize() > 100000) {
  await engine.clearCache();
}

// ✅ Good: Use streaming for large results
for await (const batch of engine.queryTransitiveStream(nodeId, 'depends_on')) {
  processBatch(batch);
}
```

---

## Integration Patterns

### From Database Module

```typescript
// GraphDatabase integration
export class GraphDatabase {
  private inferenceEngine?: InferenceEngine;

  async enableInference(config?: InferenceEngineConfig) {
    const { InferenceEngine } = await import('./inference');
    this.inferenceEngine = new InferenceEngine(this.db, config);
  }

  async queryWithInference(edgeType: string, options: QueryOptions) {
    if (!this.inferenceEngine) {
      throw new Error('Inference not enabled');
    }
    return this.inferenceEngine.queryHierarchical(edgeType, options);
  }
}
```

### From Analyzers

```typescript
// Analyzer using inference
export class DependencyAnalyzer {
  async findAllDependencies(fileId: string) {
    const engine = new InferenceEngine(this.db);

    // Get direct + transitive dependencies
    return engine.queryTransitive(fileId, 'depends_on', {
      maxPathLength: 10
    });
  }
}
```

---

## Documentation Requirements

### Code Documentation

```typescript
/**
 * Performs hierarchical inference query.
 *
 * Queries the specified edge type and optionally includes all child types
 * in the edge type hierarchy.
 *
 * @param edgeType - Parent edge type to query
 * @param options - Query options including child inclusion and depth
 * @returns Inference result with all matching relationships
 *
 * @example
 * ```typescript
 * // Get all import relationships
 * const imports = await engine.queryHierarchical('imports', {
 *   includeChildren: true,
 *   maxDepth: 3
 * });
 * ```
 */
async queryHierarchical(
  edgeType: string,
  options?: HierarchicalQueryOptions
): Promise<InferenceResult> {
  // Implementation
}
```

### Edge Type Documentation

```typescript
// In EdgeTypeRegistry.ts
const EDGE_TYPE_DEFINITIONS: EdgeTypeDefinition[] = [
  {
    type: 'depends_on',
    description: `
      Represents dependency relationship between nodes.
      Used for impact analysis and transitive dependency resolution.
      Supports transitive inference: A→B→C implies A→C.
    `,
    is_directed: true,
    parent_type: null,
    is_transitive: true,
    is_inheritable: false
  }
];
```

---

## Related Documentation

- [Inference System Guide](../../../docs/inference-system.md) - Complete API guide
- [Database Conventions](../CONVENTIONS.md) - Database module conventions
- [Maintenance Guide](../../../docs/graph-maintenance-conventions.md) - Maintenance procedures
- [Module Organization](../../../docs/module-organization.md) - Overall structure

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Inference Module Team