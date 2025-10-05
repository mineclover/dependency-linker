# Module Organization

**Purpose**: Document the organizational structure of the dependency-linker codebase for maintainability and clarity.

---

## Table of Contents

1. [Overall Structure](#overall-structure)
2. [Core Modules](#core-modules)
3. [Database Module](#database-module)
4. [Inference Module](#inference-module)
5. [Integration Module](#integration-module)
6. [Module Dependencies](#module-dependencies)
7. [Import Conventions](#import-conventions)
8. [Adding New Modules](#adding-new-modules)

---

## Overall Structure

```
dependency-linker/
├── src/
│   ├── core/              # Core analysis engine
│   ├── database/          # Graph database system
│   │   ├── inference/     # ⭐ Inference module (NEW)
│   │   ├── core/          # Core database components
│   │   ├── services/      # Database services
│   │   ├── types/         # Database type definitions
│   │   └── utils/         # Database utilities
│   ├── graph/             # Graph analysis tools
│   ├── integration/       # System integrations
│   └── index.ts           # Main entry point
├── examples/              # Usage examples
├── tests/                 # Test suites
└── docs/                  # Documentation
    ├── inference-system.md              # Inference API docs
    ├── graph-maintenance-conventions.md # Maintenance guide
    ├── inference-system-status-report.md # Status report
    └── module-organization.md           # This file
```

---

## Core Modules

### `/src/core/`
**Purpose**: Core analysis engine for multi-language AST parsing and extraction.

**Key Components**:
- `AnalysisEngine.ts` - Main analysis coordinator
- `LanguageParser.ts` - Multi-language parser interface
- `DataExtractor.ts` - Data extraction plugins
- `DataInterpreter.ts` - Data processing plugins

**Responsibilities**:
- AST parsing (TypeScript, JavaScript, Go, Java, Markdown)
- Plugin management (extractors, interpreters)
- Cache management
- Language detection

**Dependencies**:
- tree-sitter parsers
- Language-specific grammar files

---

## Database Module

### `/src/database/`
**Purpose**: Graph database system for storing and querying code relationships.

```
database/
├── GraphDatabase.ts          # Main database interface
├── GraphStorage.ts           # Storage layer
├── GraphQueryEngine.ts       # Query engine
├── schema.sql               # Database schema
├── index.ts                 # Module exports
│
├── inference/               # ⭐ Inference module
│   ├── InferenceEngine.ts   # Core inference engine
│   ├── EdgeTypeRegistry.ts  # Edge type hierarchy
│   ├── InferenceTypes.ts    # Type definitions
│   ├── index.ts            # Module exports
│   └── README.md           # Module docs
│
├── core/                    # Core database components
│   ├── NodeIdentifier.ts
│   ├── CircularDependencyDetector.ts
│   └── NodeCentricAnalyzer.ts
│
├── services/                # Database services
│   └── FileDependencyAnalyzer.ts
│
├── types/                   # Type definitions
│   └── [database types]
│
└── utils/                   # Utilities
    └── IdentifierGenerator.ts
```

### Key Files

#### `GraphDatabase.ts`
**Role**: Main database interface and facade.

**Responsibilities**:
- Node and relationship CRUD operations
- Query coordination
- Transaction management
- Schema initialization
- **Inference query methods** (hierarchical, transitive, inheritable)

**Key Methods**:
```typescript
// Node operations
async upsertNode(node: GraphNode): Promise<GraphNode>
async findNodes(options: GraphQueryOptions): Promise<GraphNode[]>

// Relationship operations
async upsertRelationship(rel: GraphRelationship): Promise<GraphRelationship>
async findRelationships(options: GraphQueryOptions): Promise<GraphRelationship[]>

// Inference operations
async queryHierarchicalRelationships(edgeType: string, options): Promise<GraphRelationship[]>
async queryTransitiveRelationships(fromNodeId: number, edgeType: string, maxDepth: number): Promise<GraphRelationship[]>
async queryInheritableRelationships(fromNodeId: number, parentType: string, inheritableType: string, maxDepth: number): Promise<GraphRelationship[]>
async syncInferenceCache(): Promise<number>
```

#### `GraphStorage.ts`
**Role**: Storage layer for analysis results.

**Responsibilities**:
- Store analysis results
- Retrieve file dependencies
- Project statistics
- Circular dependency detection

#### `GraphQueryEngine.ts`
**Role**: Advanced query capabilities.

**Responsibilities**:
- Complex graph queries
- Pattern matching
- Relationship inference

---

## Inference Module

### `/src/database/inference/` ⭐

**Purpose**: Centralized module for graph inference capabilities.

**Philosophy**:
- Self-contained inference logic
- Type-safe APIs
- SQL-based efficient traversal
- Clear separation from core database logic

### Module Structure

```
inference/
├── EdgeTypeRegistry.ts    # Edge type hierarchy management
├── InferenceEngine.ts     # Core inference engine
├── InferenceTypes.ts      # Type definitions
├── index.ts              # Unified exports
└── README.md             # Module documentation
```

### Components

#### `EdgeTypeRegistry.ts`
**Role**: Single source of truth for all edge type definitions.

**Responsibilities**:
- Edge type definitions (CORE_TYPES + EXTENDED_TYPES)
- Hierarchy management (parent-child relationships)
- Hierarchy validation (no cycles, parent existence)
- Helper methods

**Key Features**:
```typescript
// Edge type hierarchy
const edgeType = EdgeTypeRegistry.get('imports_file');
const children = EdgeTypeRegistry.getChildren('imports');
const path = EdgeTypeRegistry.getHierarchyPath('imports_library');

// Validation
const validation = EdgeTypeRegistry.validateHierarchy();

// Visualization
const hierarchy = EdgeTypeRegistry.printHierarchy();
```

**Edge Type Hierarchy**:
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

#### `InferenceEngine.ts`
**Role**: Core inference engine with three inference types.

**Inference Types**:

1. **Hierarchical Inference**
   - Query parent type → get all child types
   - Example: Query 'imports' → includes 'imports_library' + 'imports_file'
   - Use case: Aggregate queries across type hierarchy

2. **Transitive Inference**
   - A→B→C chains ⇒ A→C
   - SQL Recursive CTE implementation
   - Cycle detection with visited node tracking
   - Use case: Find all indirect dependencies

3. **Inheritable Inference**
   - parent(A,B), rel(B,C) ⇒ rel(A,C)
   - Relationship propagation through containment
   - Use case: File-level relationships from class-level relationships

**Key Features**:
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// Hierarchical
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true
});

// Transitive
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10,
  detectCycles: true
});

// Inheritable
const inherited = await engine.queryInheritable(nodeId, 'contains', 'extends', {
  maxInheritanceDepth: 5
});

// All inferences
const result = await engine.inferAll(nodeId);
```

**Cache Strategies**:
- **Eager**: Recompute on every edge change (real-time systems)
- **Lazy**: Recompute on first query after change (balanced)
- **Manual**: Developer controls timing (batch processing)

#### `InferenceTypes.ts`
**Role**: Complete TypeScript type definitions.

**Key Types**:
```typescript
// Core types
type InferredRelationType = 'hierarchical' | 'transitive' | 'inheritable';

interface InferredRelationship {
  fromNodeId: number;
  toNodeId: number;
  type: string;
  path: InferencePath;
  inferredAt: Date;
  sourceFile: string;
}

interface InferencePath {
  edgeIds: number[];
  depth: number;
  inferenceType: InferredRelationType;
  description: string;
}

// Query options
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

// Configuration
interface InferenceEngineConfig {
  enableCache?: boolean;
  cacheSyncStrategy?: 'eager' | 'lazy' | 'manual';
  defaultMaxPathLength?: number;
  defaultMaxHierarchyDepth?: number;
  enableCycleDetection?: boolean;
}

// Results
interface InferenceResult {
  inferences: InferredRelationship[];
  statistics: InferenceStatistics;
  executionTime: number;
}

interface InferenceStatistics {
  directRelationships: number;
  inferredByType: Record<InferredRelationType, number>;
  cachedInferences: number;
  averageDepth: number;
  maxDepth: number;
}
```

#### `index.ts`
**Role**: Unified module exports.

**Exports**:
```typescript
// Core inference engine
export { InferenceEngine } from './InferenceEngine';

// Edge type management
export { EdgeTypeRegistry } from './EdgeTypeRegistry';
export type { EdgeTypeDefinition } from './EdgeTypeRegistry';

// Type definitions
export type {
  InferredRelationType,
  InferencePath,
  InferredRelationship,
  HierarchicalQueryOptions,
  TransitiveQueryOptions,
  InheritableQueryOptions,
  InferenceCacheEntry,
  InferenceStatistics,
  InferenceEngineConfig,
  InferenceResult,
  EdgeTypeInferenceRule,
  InferenceValidationResult,
} from './InferenceTypes';
```

### Usage Examples

#### From Database Module
```typescript
import { InferenceEngine, EdgeTypeRegistry } from './database/inference';

// Validate hierarchy on startup
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  console.error('Hierarchy errors:', validation.errors);
}

// Create inference engine
const engine = new InferenceEngine(db);
const result = await engine.inferAll(nodeId);
```

#### From Application Code
```typescript
import {
  InferenceEngine,
  EdgeTypeRegistry,
  InferenceEngineConfig
} from '@context-action/dependency-linker';

// Configure and use
const config: InferenceEngineConfig = {
  enableCache: true,
  cacheSyncStrategy: 'lazy',
  defaultMaxPathLength: 10
};

const engine = new InferenceEngine(db, config);
```

#### From Examples
```typescript
import { EdgeTypeRegistry, InferenceEngine } from '../src/database/inference';

// Query hierarchical relationships
const allImports = await db.queryHierarchicalRelationships('imports', {
  includeChildren: true
});

// Use inference engine
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10,
  detectCycles: true
});
```

---

## Integration Module

### `/src/integration/`
**Purpose**: Integration points between analysis and database systems.

**Key Components**:
- `DependencyToGraph.ts` - Convert analysis results to graph nodes/edges
- Integration adapters for various analysis types

**Responsibilities**:
- Transform analysis results to graph format
- Coordinate between core and database modules
- Handle data format conversions

---

## Module Dependencies

### Dependency Graph

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  index  │
    └────┬────┘
         │
    ┌────▼─────────────────────────┐
    │                               │
┌───▼────┐              ┌──────────▼────────┐
│  core  │              │     database      │
└───┬────┘              └──────────┬────────┘
    │                              │
    │                   ┌──────────▼──────────┐
    │                   │                      │
    │              ┌────▼──────┐    ┌────────▼────────┐
    │              │ inference │    │   core/services  │
    │              └───────────┘    └─────────────────┘
    │                      │
    └──────────────────────┼─────────────────┐
                           │                 │
                      ┌────▼────┐      ┌────▼────────┐
                      │  graph  │      │ integration │
                      └─────────┘      └─────────────┘
```

### Dependency Rules

1. **Core Module**: No dependencies on database or inference
2. **Database Module**: Can depend on core, no circular dependencies
3. **Inference Module**: Self-contained, only depends on GraphDatabase
4. **Integration Module**: Can depend on both core and database
5. **Graph Module**: Can depend on database and inference

### Import Hierarchy

```typescript
// ✅ Good - Follows hierarchy
import { AnalysisEngine } from './core';
import { GraphDatabase } from './database';
import { InferenceEngine } from './database/inference';

// ✅ Good - Inference uses GraphDatabase
import { GraphDatabase } from '../GraphDatabase';

// ❌ Bad - Core depending on database
import { GraphDatabase } from '../database'; // in core module

// ❌ Bad - Database depending on integration
import { DependencyToGraph } from '../integration'; // in database module
```

---

## Import Conventions

### Internal Imports (within same module)

```typescript
// ✅ Good - Relative imports within module
import { EdgeTypeRegistry } from './EdgeTypeRegistry';
import { InferenceTypes } from './InferenceTypes';

// ❌ Bad - Absolute imports within module
import { EdgeTypeRegistry } from '@context-action/dependency-linker/database/inference';
```

### Cross-Module Imports

```typescript
// ✅ Good - Import from module index
import { InferenceEngine, EdgeTypeRegistry } from './database/inference';
import { GraphDatabase } from './database';

// ✅ Good - Specific imports when needed
import { EdgeTypeRegistry } from './database/inference/EdgeTypeRegistry';

// ⚠️  Avoid - Direct file imports bypass module interface
import { InferenceEngine } from './database/inference/InferenceEngine';
```

### Dynamic Imports (avoiding circular dependencies)

```typescript
// ✅ Good - Dynamic import to break circular dependency
async queryHierarchicalRelationships(edgeType: string) {
  const { EdgeTypeRegistry } = await import('./inference/EdgeTypeRegistry');
  // Use EdgeTypeRegistry
}

// ❌ Bad - Static import causes circular dependency
import { EdgeTypeRegistry } from './inference/EdgeTypeRegistry';
```

### External Imports

```typescript
// ✅ Good - Import from package
import {
  InferenceEngine,
  EdgeTypeRegistry
} from '@context-action/dependency-linker';

// ✅ Good - Specific module import
import { InferenceEngine } from '@context-action/dependency-linker/database/inference';
```

---

## Adding New Modules

### Checklist for New Module

1. **Create Module Directory**
   ```bash
   mkdir src/module-name
   ```

2. **Create index.ts**
   ```typescript
   // src/module-name/index.ts
   export { ComponentA } from './ComponentA';
   export { ComponentB } from './ComponentB';
   export type { TypeA, TypeB } from './types';
   ```

3. **Create README.md**
   ```markdown
   # Module Name

   Purpose and overview

   ## Structure
   ## Components
   ## Usage
   ## Dependencies
   ```

4. **Update Parent Module**
   ```typescript
   // src/index.ts or src/database/index.ts
   export * from './module-name';
   ```

5. **Document Dependencies**
   - Update `module-organization.md` (this file)
   - Add to dependency graph
   - Document import conventions

6. **Add Tests**
   ```bash
   mkdir tests/module-name
   ```

7. **Update Main Documentation**
   - Add to README.md
   - Update API documentation
   - Add usage examples

### Module Naming Conventions

- **Directory names**: lowercase-with-hyphens or camelCase
- **File names**: PascalCase for classes, camelCase for utilities
- **Module exports**: Use index.ts for public interface

### Module Structure Template

```
module-name/
├── index.ts              # Public exports
├── README.md             # Module documentation
├── ComponentA.ts         # Main components
├── ComponentB.ts
├── types.ts             # Type definitions
└── utils/               # Module-specific utilities
    └── helper.ts
```

---

## Best Practices

### Module Design

1. **Single Responsibility**: Each module has one clear purpose
2. **Clear Interface**: Export only what's necessary through index.ts
3. **Self-Contained**: Minimize external dependencies
4. **Documentation**: Every module has README.md
5. **Type Safety**: Use TypeScript interfaces and types

### File Organization

1. **Group by Feature**: Related files stay together
2. **Logical Hierarchy**: Follow natural dependencies
3. **Flat When Possible**: Avoid deep nesting unless necessary
4. **Index Files**: Use for public interfaces

### Import Strategy

1. **Module Index**: Import from module index when possible
2. **Specific Imports**: Use when you need one thing
3. **Dynamic Imports**: Use to break circular dependencies
4. **No Wildcards**: Avoid `import *` for clarity

### Circular Dependency Prevention

1. **Dependency Direction**: Follow hierarchy top-down
2. **Dynamic Imports**: Use when static causes cycles
3. **Interface Segregation**: Split interfaces to break cycles
4. **Dependency Injection**: Pass dependencies rather than import

---

## Module Maintenance

### Regular Tasks

1. **Validate Structure**: Ensure modules follow conventions
2. **Check Dependencies**: Verify no circular dependencies
3. **Update Documentation**: Keep module docs current
4. **Review Exports**: Ensure clean public interface

### When to Refactor

1. **Circular Dependencies**: Break into separate modules
2. **Growing Files**: Split into submodules
3. **Unclear Purpose**: Reorganize by responsibility
4. **Too Many Exports**: Review public interface

### Deprecation Process

1. **Mark as Deprecated**: Add JSDoc `@deprecated` tag
2. **Provide Alternative**: Document replacement
3. **Migration Guide**: Show how to migrate
4. **Grace Period**: Allow time for migration (1-2 versions)
5. **Remove**: Delete after grace period

---

## Related Documentation

- **Inference System**: `/docs/inference-system.md`
- **Maintenance Guide**: `/docs/graph-maintenance-conventions.md`
- **Status Report**: `/docs/inference-system-status-report.md`
- **Inference Module**: `/src/database/inference/README.md`

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Development Team