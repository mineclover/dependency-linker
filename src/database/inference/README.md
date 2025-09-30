# Inference Module

Centralized module for graph inference capabilities.

## Structure

```
src/database/inference/
├── index.ts                 # Module exports
├── InferenceEngine.ts       # Core inference engine
├── InferenceTypes.ts        # Type definitions
├── EdgeTypeRegistry.ts      # Edge type management
└── README.md               # This file
```

## Modules

### EdgeTypeRegistry
Central registry for all edge type definitions and hierarchy management.

**Features**:
- Edge type hierarchy (parent-child relationships)
- Type validation (no cycles, parent existence)
- Helper methods: `getChildren()`, `getHierarchyPath()`, `validateHierarchy()`

**Usage**:
```typescript
import { EdgeTypeRegistry } from './database/inference';

// Get edge type definition
const edgeType = EdgeTypeRegistry.get('imports_file');

// Get all child types
const children = EdgeTypeRegistry.getChildren('imports');

// Validate hierarchy
const validation = EdgeTypeRegistry.validateHierarchy();
```

### InferenceEngine
SQL Recursive CTE-based inference engine supporting three inference types.

**Features**:
- Hierarchical inference (parent type queries)
- Transitive inference (A→B→C chains)
- Inheritable inference (relationship propagation)
- Configurable cache strategies (eager/lazy/manual)

**Usage**:
```typescript
import { InferenceEngine } from './database/inference';

const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// Hierarchical: Query all imports (includes child types)
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true
});

// Transitive: Find all dependencies
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10
});

// Run all inferences
const result = await engine.inferAll(nodeId);
```

### InferenceTypes
Complete TypeScript type definitions for type-safe inference operations.

**Key Types**:
- `InferredRelationType`: 'hierarchical' | 'transitive' | 'inheritable'
- `InferredRelationship`: Result with path tracking
- `HierarchicalQueryOptions`: Options for hierarchical queries
- `TransitiveQueryOptions`: Options for transitive queries
- `InheritableQueryOptions`: Options for inheritable queries
- `InferenceEngineConfig`: Configuration for cache and strategies

## Integration

### From Database Module
```typescript
// Single import for all inference capabilities
import { InferenceEngine, EdgeTypeRegistry } from './database/inference';
```

### From Application Code
```typescript
import {
  InferenceEngine,
  EdgeTypeRegistry,
  InferenceEngineConfig
} from '@context-action/dependency-linker';
```

## Architecture

The inference module is designed to be:
- **Self-contained**: All inference logic in one place
- **Type-safe**: Complete TypeScript interfaces
- **SQL-based**: Efficient Recursive CTE traversal
- **Maintainable**: Clear separation from core database logic

## Related Documentation

- **API Documentation**: `/docs/inference-system.md`
- **Maintenance Guide**: `/docs/graph-maintenance-conventions.md`
- **Status Report**: `/docs/inference-system-status-report.md`
- **Examples**: `/examples/inference-system-demo.ts`