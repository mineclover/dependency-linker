# Graph Database & Inference System Maintenance Conventions

**Purpose**: Establish clear conventions for maintaining graph database schema, edge types, analyzers, and inference system to ensure consistency, type safety, and synchronization across the system.

---

## Table of Contents

1. [Edge Type Management](#edge-type-management)
2. [Analyzer Ownership Pattern](#analyzer-ownership-pattern)
3. [Schema Synchronization](#schema-synchronization)
4. [Inference System Maintenance](#inference-system-maintenance)
5. [Type Safety Requirements](#type-safety-requirements)
6. [Testing Requirements](#testing-requirements)
7. [Performance Monitoring](#performance-monitoring)
8. [Migration Guidelines](#migration-guidelines)

---

## Edge Type Management

### 1.1 Edge Type Registry as Single Source of Truth

**Convention**: `EdgeTypeRegistry` is the authoritative source for all edge type definitions.

**Rules**:
- All edge types MUST be defined in `EdgeTypeRegistry.CORE_TYPES` or `EdgeTypeRegistry.EXTENDED_TYPES`
- Never hardcode edge type strings in analyzer code
- Always use `EdgeTypeRegistry.get(type)` to retrieve edge type definitions
- Validate hierarchy before application startup

**Example**:
```typescript
// ✅ Good - Use registry
const edgeType = EdgeTypeRegistry.get('imports_file');
if (!edgeType) {
  throw new Error('Edge type not registered');
}

// ❌ Bad - Hardcoded string
await db.upsertRelationship({
  type: 'imports_file', // No validation, no hierarchy info
  ...
});
```

### 1.2 Adding New Edge Types

**Process**:

1. **Define in Registry** (`EdgeTypeRegistry.ts`):
```typescript
{
  type: 'new_relationship',
  description: 'Clear description of relationship',
  schema: { /* metadata fields */ },
  isDirected: true,
  parentType: 'parent_type', // or undefined for root
  isTransitive: false,
  isInheritable: false,
  priority: 5
}
```

2. **Update Schema** if needed (`schema.sql`):
- Add to `edge_types` table if it's a CORE_TYPE
- Add to dynamic registration if it's an EXTENDED_TYPE

3. **Validate Hierarchy**:
```typescript
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  console.error('Hierarchy errors:', validation.errors);
}
```

4. **Update Documentation**:
- Add to hierarchy diagram
- Document inference behavior
- Add usage examples

### 1.3 Edge Type Hierarchy Rules

**Hierarchy Principles**:
- Maximum depth: 3 levels (root → parent → child)
- No circular dependencies
- Child types inherit transitive/inheritable properties from ancestors
- Parent type must exist before adding children

**Hierarchy Validation**:
```typescript
// Run validation in tests and on startup
EdgeTypeRegistry.initialize();
const validation = EdgeTypeRegistry.validateHierarchy();
expect(validation.valid).toBe(true);
```

**Current Hierarchy** (as of 2025-09-30):
```
• contains (transitive, inheritable)
  • declares (inheritable)
• belongs_to (transitive)
• depends_on (transitive)
  • imports
    • imports_library
    • imports_file
  • calls
  • references
  • extends (inheritable)
  • implements (inheritable)
  • uses
  • instantiates
  • accesses
• has_type
• returns
• throws
• assigns_to
• overrides
• shadows
• annotated_with
• exports_to
```

---

## Analyzer Ownership Pattern

### 2.1 Owned Edge Types Declaration

**Convention**: Each analyzer declares its owned edge types using `OWNED_EDGE_TYPES` constant.

**Rules**:
- Declare `static readonly OWNED_EDGE_TYPES: string[]` in analyzer class
- Include only edge types the analyzer creates/manages
- Use for cleanup operations to avoid affecting other analyzers' data

**Example**:
```typescript
export class FileDependencyAnalyzer {
  static readonly OWNED_EDGE_TYPES = [
    'imports_library',
    'imports_file',
    'exports_to'
  ];

  async cleanupRelationships(sourceFile: string): Promise<void> {
    await this.database.cleanupRelationshipsBySourceAndTypes(
      sourceFile,
      FileDependencyAnalyzer.OWNED_EDGE_TYPES
    );
  }
}
```

### 2.2 Source File Tracking

**Convention**: Every edge MUST have a `source_file` value indicating its origin.

**Rules**:
- `source_file` column is required in all edge creation
- Format: Absolute path or relative path from project root
- Use for analyzer-specific cleanup operations
- Never delete edges from other source files

**Schema**:
```sql
CREATE TABLE edges (
  ...
  source_file TEXT NOT NULL,
  ...
);

CREATE INDEX idx_edges_source_file ON edges(source_file);
```

### 2.3 Cleanup Operations

**Convention**: Analyzers clean up their own edges before re-analysis.

**Process**:
1. Before analyzing a file, cleanup previous edges
2. Use `cleanupRelationshipsBySourceAndTypes()`
3. Only delete owned edge types from the source file

**Implementation**:
```typescript
async analyzeFile(filePath: string): Promise<void> {
  // 1. Cleanup previous analysis results
  await this.cleanupRelationships(filePath);

  // 2. Perform new analysis
  const dependencies = await this.extractDependencies(filePath);

  // 3. Create new edges
  for (const dep of dependencies) {
    await this.database.upsertRelationship({
      ...dep,
      sourceFile: filePath // Always set source_file
    });
  }
}
```

---

## Schema Synchronization

### 3.1 Schema.sql as Source of Truth

**Convention**: `schema.sql` defines database structure, must stay in sync with code.

**Synchronization Points**:
1. **Edge Types Table**: Core types from `EdgeTypeRegistry.CORE_TYPES`
2. **Indexes**: Performance-critical queries
3. **Cache Tables**: Inference cache structure

### 3.2 Schema Migration Process

**When to Migrate**:
- Adding new edge types to CORE_TYPES
- Changing edge metadata structure
- Adding indexes for performance
- Modifying inference cache structure

**Migration Steps**:

1. **Create Migration File** (`migrations/YYYYMMDD_description.sql`):
```sql
-- Migration: Add new edge type
-- Date: 2025-09-30
-- Author: Developer Name

-- Add to edge_types table
INSERT INTO edge_types (type, description, is_directed, parent_type, is_transitive, is_inheritable, priority)
VALUES ('new_type', 'Description', 1, 'parent_type', 0, 0, 5);

-- Add any necessary indexes
CREATE INDEX IF NOT EXISTS idx_edges_new_type ON edges(type) WHERE type = 'new_type';
```

2. **Update EdgeTypeRegistry**:
```typescript
static readonly CORE_TYPES: EdgeTypeDefinition[] = [
  // ... existing types
  {
    type: 'new_type',
    description: 'Description',
    // ... properties matching SQL
  }
];
```

3. **Update Schema.sql**:
```sql
-- Add to edge_types INSERT statements
INSERT INTO edge_types (type, description, ...) VALUES
  ('new_type', 'Description', ...);
```

4. **Run Validation**:
```bash
npm run test:schema-sync
```

### 3.3 Schema Validation Tests

**Required Tests**:
```typescript
describe('Schema Synchronization', () => {
  it('should have all CORE_TYPES in database', async () => {
    const dbTypes = await db.getEdgeTypes();
    const registryTypes = EdgeTypeRegistry.getCoreTypes();

    for (const regType of registryTypes) {
      const dbType = dbTypes.find(t => t.type === regType.type);
      expect(dbType).toBeDefined();
      expect(dbType.isTransitive).toBe(regType.isTransitive);
      expect(dbType.isInheritable).toBe(regType.isInheritable);
    }
  });

  it('should have consistent hierarchy in DB and code', async () => {
    const validation = EdgeTypeRegistry.validateHierarchy();
    expect(validation.valid).toBe(true);

    const dbHierarchy = await db.getEdgeTypeHierarchy();
    // Verify DB hierarchy matches registry
  });
});
```

---

## Inference System Maintenance

### 4.1 Inference Type Properties

**Convention**: Edge type properties determine inference behavior.

**Properties**:
- `isTransitive`: Can use SQL Recursive CTE for A→B→C ⇒ A→C
- `isInheritable`: Can propagate through parent relationships
- `parentType`: Enables hierarchical queries

**Rules**:
- Set properties based on semantic meaning
- Document reasoning for each property value
- Test inference behavior when changing properties

**Examples**:
```typescript
// Transitive: Dependencies chain
{
  type: 'depends_on',
  isTransitive: true,  // A depends on B, B depends on C ⇒ A depends on C
  isInheritable: false // Dependencies don't inherit through containment
}

// Inheritable: Class relationships
{
  type: 'extends',
  isTransitive: false,   // A extends B, B extends C doesn't mean direct A→C edge
  isInheritable: true    // File contains Class, Class extends Base ⇒ File extends Base
}

// Both: Structural containment
{
  type: 'contains',
  isTransitive: true,    // A contains B, B contains C ⇒ A contains C
  isInheritable: true    // Relationships can inherit through containment
}
```

### 4.2 Inference Cache Management

**Cache Strategies**:

1. **Eager** (Real-time systems):
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'eager' // Recompute on every edge change
});
```

2. **Lazy** (Balanced):
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy' // Recompute on first query after change
});
```

3. **Manual** (Batch processing):
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'manual'
});

// Explicitly sync when ready
await db.syncInferenceCache();
```

**Cache Invalidation**:
```typescript
// After bulk edge operations
await db.transaction(async () => {
  // ... many edge insertions
});
await db.syncInferenceCache(); // Rebuild cache once
```

### 4.3 Performance Optimization

**Index Requirements**:
```sql
-- Essential for transitive queries
CREATE INDEX idx_edges_start_type ON edges(start_node_id, type);
CREATE INDEX idx_edges_end_type ON edges(end_node_id, type);

-- For hierarchical queries
CREATE INDEX idx_edges_type ON edges(type);

-- For cleanup operations
CREATE INDEX idx_edges_source_file ON edges(source_file);
CREATE INDEX idx_edges_source_type ON edges(source_file, type);
```

**Query Optimization**:
```typescript
// ✅ Good - Use specific type
const deps = await db.queryTransitiveRelationships(
  nodeId,
  'depends_on',
  5 // Reasonable depth limit
);

// ⚠️ Careful - Too deep
const deps = await db.queryTransitiveRelationships(
  nodeId,
  'depends_on',
  100 // May be slow for large graphs
);

// ✅ Good - Cache for repeated queries
const engine = new InferenceEngine(db, { enableCache: true });
await engine.queryHierarchical('imports'); // First query caches
await engine.queryHierarchical('imports'); // Uses cache
```

---

## Type Safety Requirements

### 5.1 TypeScript Interfaces

**Required Interfaces**:

1. **Edge Type Definition**:
```typescript
interface EdgeTypeDefinition {
  type: string;
  description: string;
  schema: Record<string, any>;
  isDirected: boolean;
  parentType?: string;
  isTransitive: boolean;
  isInheritable: boolean;
  priority: number;
}
```

2. **Inference Types**:
```typescript
type InferredRelationType = 'hierarchical' | 'transitive' | 'inheritable';

interface InferredRelationship {
  fromNodeId: number;
  toNodeId: number;
  type: string;
  path: InferencePath;
  inferredAt: Date;
  sourceFile: string;
}
```

3. **Query Options**:
```typescript
interface HierarchicalQueryOptions {
  includeChildren?: boolean;
  includeParents?: boolean;
  maxDepth?: number;
}

interface TransitiveQueryOptions {
  maxPathLength?: number;
  detectCycles?: boolean;
  relationshipTypes?: string[];
}

interface InheritableQueryOptions {
  parentRelationshipType?: string;
  inheritableTypes?: string[];
  maxInheritanceDepth?: number;
}
```

### 5.2 Type Guards and Validation

**Runtime Validation**:
```typescript
function validateEdgeType(type: string): void {
  const definition = EdgeTypeRegistry.get(type);
  if (!definition) {
    throw new Error(`Unknown edge type: ${type}`);
  }
}

function validateInferenceOptions(
  type: string,
  options: any
): void {
  const definition = EdgeTypeRegistry.get(type);

  if (options.maxDepth && !definition.isTransitive) {
    throw new Error(`Edge type ${type} is not transitive, cannot query with maxDepth`);
  }
}
```

---

## Testing Requirements

### 6.1 Edge Type Tests

**Required Test Coverage**:

1. **Hierarchy Validation**:
```typescript
describe('EdgeTypeRegistry', () => {
  it('should have valid hierarchy with no cycles', () => {
    const validation = EdgeTypeRegistry.validateHierarchy();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should have all parent types defined', () => {
    const types = EdgeTypeRegistry.getAll();
    for (const type of types) {
      if (type.parentType) {
        const parent = EdgeTypeRegistry.get(type.parentType);
        expect(parent).toBeDefined();
      }
    }
  });
});
```

2. **Analyzer Ownership**:
```typescript
describe('FileDependencyAnalyzer', () => {
  it('should only clean up owned edge types', async () => {
    const analyzer = new FileDependencyAnalyzer(db, '/project');

    // Create edges from different analyzers
    await db.upsertRelationship({
      type: 'imports_file', // Owned by FileDependencyAnalyzer
      sourceFile: '/test.ts',
      ...
    });

    await db.upsertRelationship({
      type: 'calls', // Not owned by FileDependencyAnalyzer
      sourceFile: '/test.ts',
      ...
    });

    await analyzer.cleanupRelationships('/test.ts');

    // imports_file should be deleted, calls should remain
    const remaining = await db.findRelationships({
      sourceFiles: ['/test.ts']
    });

    expect(remaining.find(r => r.type === 'imports_file')).toBeUndefined();
    expect(remaining.find(r => r.type === 'calls')).toBeDefined();
  });
});
```

3. **Inference Correctness**:
```typescript
describe('Inference System', () => {
  it('should find transitive dependencies', async () => {
    // A → B → C
    await createEdge(nodeA, nodeB, 'depends_on');
    await createEdge(nodeB, nodeC, 'depends_on');

    const transitive = await db.queryTransitiveRelationships(
      nodeA.id,
      'depends_on',
      10
    );

    expect(transitive).toContainEqual(
      expect.objectContaining({
        fromNodeId: nodeA.id,
        toNodeId: nodeC.id
      })
    );
  });

  it('should detect cycles', async () => {
    // A → B → C → A (cycle)
    await createEdge(nodeA, nodeB, 'depends_on');
    await createEdge(nodeB, nodeC, 'depends_on');
    await createEdge(nodeC, nodeA, 'depends_on');

    const transitive = await db.queryTransitiveRelationships(
      nodeA.id,
      'depends_on',
      10
    );

    // Should not infinite loop, should complete
    expect(transitive.length).toBeGreaterThan(0);
  });
});
```

### 6.2 Integration Tests

**End-to-End Scenarios**:
```typescript
describe('Graph System Integration', () => {
  it('should handle complete analysis workflow', async () => {
    // 1. Analyze file
    const analyzer = new FileDependencyAnalyzer(db, '/project');
    await analyzer.analyzeFile('/src/App.tsx');

    // 2. Verify edges created
    const edges = await db.findRelationships({
      sourceFiles: ['/src/App.tsx']
    });
    expect(edges.length).toBeGreaterThan(0);

    // 3. Run inference
    const deps = await db.queryTransitiveRelationships(
      appNode.id,
      'depends_on',
      5
    );

    // 4. Re-analyze (should cleanup and recreate)
    await analyzer.analyzeFile('/src/App.tsx');
    const newEdges = await db.findRelationships({
      sourceFiles: ['/src/App.tsx']
    });

    // Edge count should be similar (no duplicates)
    expect(Math.abs(newEdges.length - edges.length)).toBeLessThan(2);
  });
});
```

---

## Performance Monitoring

### 7.1 Metrics to Track

**Query Performance**:
```typescript
interface QueryMetrics {
  queryType: 'hierarchical' | 'transitive' | 'inheritable';
  edgeType: string;
  startNodeId: number;
  executionTimeMs: number;
  resultCount: number;
  cacheHit: boolean;
}

// Log slow queries
if (executionTime > 1000) {
  console.warn('Slow inference query', {
    type: inferenceType,
    time: executionTime,
    resultCount: results.length
  });
}
```

**Cache Effectiveness**:
```typescript
interface CacheStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number; // hits / total
  avgHitTime: number;
  avgMissTime: number;
}
```

### 7.2 Performance Thresholds

**Target Performance** (for graphs <100K edges):
- Direct relationship query: <50ms
- Hierarchical query: <100ms
- Transitive query (depth 5): <500ms
- Inheritable query: <300ms
- Cache hit: <10ms

**Alerts**:
- Query >1s: Log warning
- Query >5s: Trigger investigation
- Cache hit rate <70%: Consider cache strategy adjustment

---

## Migration Guidelines

### 8.1 Breaking Changes

**When Breaking Changes Are Necessary**:
- Fundamental schema changes
- Edge type semantics changes
- Inference algorithm improvements

**Migration Process**:

1. **Version the Change**:
```typescript
// migrations/v2_inference_cache.ts
export async function migrateV2InferenceCache(db: Database): Promise<void> {
  // 1. Backup existing data
  await db.run('CREATE TABLE edges_backup AS SELECT * FROM edges');

  // 2. Apply schema changes
  await db.run('ALTER TABLE edges ADD COLUMN new_field TEXT');

  // 3. Migrate data
  await db.run('UPDATE edges SET new_field = ...');

  // 4. Validate
  const validation = await validateMigration(db);
  if (!validation.success) {
    await rollback(db);
    throw new Error('Migration failed');
  }
}
```

2. **Provide Rollback**:
```typescript
export async function rollbackV2InferenceCache(db: Database): Promise<void> {
  await db.run('DROP TABLE edges');
  await db.run('ALTER TABLE edges_backup RENAME TO edges');
}
```

3. **Document Changes**:
```markdown
# Migration V2: Inference Cache Improvements

## Changes
- Added `computed_at` column to inference cache
- Updated cache sync logic for better performance

## Breaking Changes
- InferenceEngine constructor signature changed
- Cache table schema modified

## Migration Steps
1. Backup database: `cp graph.db graph.db.backup`
2. Run migration: `npm run migrate:v2`
3. Verify: `npm run test:migration`

## Rollback
If issues occur: `npm run migrate:rollback:v2`
```

### 8.2 Non-Breaking Changes

**Safe to Add**:
- New edge types (as long as they don't conflict)
- New inference options (with defaults)
- New indexes
- New analyzer classes

**Process**:
1. Add to EdgeTypeRegistry
2. Update schema.sql
3. Add tests
4. Document in changelog

---

## Checklist for Changes

### Adding New Edge Type
- [ ] Define in EdgeTypeRegistry (CORE_TYPES or EXTENDED_TYPES)
- [ ] Set correct hierarchy (parentType)
- [ ] Set inference properties (isTransitive, isInheritable)
- [ ] Update schema.sql if CORE_TYPE
- [ ] Add to analyzer OWNED_EDGE_TYPES if applicable
- [ ] Validate hierarchy with tests
- [ ] Document in hierarchy diagram
- [ ] Add usage examples
- [ ] Run full test suite

### Creating New Analyzer
- [ ] Declare OWNED_EDGE_TYPES constant
- [ ] Implement cleanupRelationships()
- [ ] Always set sourceFile in edges
- [ ] Add integration tests
- [ ] Document analyzer ownership
- [ ] Update analyzer registry if needed

### Modifying Inference Behavior
- [ ] Update edge type properties
- [ ] Update InferenceEngine if algorithm changes
- [ ] Add/update inference tests
- [ ] Document behavior changes
- [ ] Check performance impact
- [ ] Update inference-system.md docs

### Schema Changes
- [ ] Create migration file
- [ ] Update schema.sql
- [ ] Update TypeScript interfaces
- [ ] Provide rollback procedure
- [ ] Test migration on sample database
- [ ] Document breaking changes
- [ ] Update version number

---

## References

- **Implementation**: `/src/database/`
- **Types**: `/src/database/types/InferenceTypes.ts`, `/src/database/types/EdgeTypeRegistry.ts`
- **Schema**: `/src/database/schema.sql`
- **Documentation**: `/docs/inference-system.md`
- **Examples**: `/examples/inference-system-demo.ts`

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Development Team