# Dependency Linker: Glossary and Concepts

**Version**: 2.1.0
**Last Updated**: 2025-10-02

This glossary defines key concepts, terminology, and generalized patterns used in the Dependency Linker system. It serves as a reference for understanding the architecture and implementing similar systems.

---

## 📚 Table of Contents

1. [Core Concepts](#core-concepts)
2. [Architecture Components](#architecture-components)
3. [Data Structures](#data-structures)
4. [Analysis Pipeline](#analysis-pipeline)
5. [Generalized Patterns](#generalized-patterns)
6. [Domain-Specific Terms](#domain-specific-terms)

---

## Core Concepts

### Dependency
**Definition**: A relationship where one code entity relies on or references another code entity.

**Types**:
- **Import Dependency**: One file imports/requires another
- **Type Dependency**: Code uses types defined elsewhere
- **Call Dependency**: Function/method calls another function/method
- **Inheritance Dependency**: Class extends/implements another class/interface

**Properties**:
- **Direction**: Dependencies are directed (A depends on B ≠ B depends on A)
- **Type**: Categorizes the nature of dependency (import, call, extends, etc.)
- **Scope**: Internal (same project) or external (npm package, built-in)

**In This System**: Represented as edges in dependency graph.

---

### Graph

**Definition**: A data structure consisting of nodes (vertices) and edges connecting them.

**Components**:
- **Node**: Represents a code entity (file, class, method, etc.)
- **Edge**: Represents a dependency relationship between two nodes
- **Direction**: Edges have a source (from) and target (to)

**Properties**:
- **Connected**: Edges define relationships between nodes
- **Directed**: Dependencies flow in specific directions
- **Weighted**: Edges may have weights (strength, count, etc.)
- **Attributed**: Nodes and edges can store metadata

**In This System**: Core data structure for dependency analysis.

**Example**:
```
Node A (file: user.ts)
  ↓ (edge: imports)
Node B (file: types.ts)
```

---

### Node

**Definition**: A vertex in the dependency graph representing a code entity.

**Attributes**:
- **id**: Unique identifier in database
- **identifier**: Unique string identifier (e.g., file path)
- **type**: Category of entity (file, class, method, etc.)
- **name**: Human-readable name
- **sourceFile**: File containing this entity
- **language**: Programming language
- **metadata**: Additional properties (namespace, etc.)
- **location**: Source code position (line, column)

**Types**:
- **File Node**: Represents a source file
- **Class Node**: Represents a class definition
- **Method Node**: Represents a method/function
- **Type Node**: Represents a type definition

**In This System**: File-level nodes are primary; method/class nodes optional.

---

### Edge

**Definition**: A directed connection in the dependency graph representing a dependency relationship.

**Attributes**:
- **id**: Unique identifier in database
- **fromNodeId**: Source node (depends on target)
- **toNodeId**: Target node (depended upon)
- **type**: Relationship type (imports, calls, extends, etc.)
- **label**: Human-readable description
- **metadata**: Additional properties (line number, etc.)
- **weight**: Strength or count of relationship
- **sourceFile**: File where relationship originates

**Types**:
- **Import Edge**: A imports B
- **Call Edge**: A calls B
- **Inheritance Edge**: A extends B
- **Reference Edge**: A references B

**In This System**: Edges connect file nodes with type information.

---

### Namespace

**Definition**: A logical grouping of files based on purpose, not directory structure.

**Purpose**:
- **Organization**: Group files by role (source, tests, docs)
- **Analysis**: Enable targeted dependency analysis
- **Separation**: Distinguish test complexity from business complexity
- **Tracking**: Identify cross-boundary dependencies

**Properties**:
- **Name**: Unique identifier (e.g., "source", "tests")
- **File Patterns**: Glob patterns defining membership
- **Exclude Patterns**: Patterns to exclude files
- **Description**: Human-readable purpose

**Key Insight**: Namespaces separate files by purpose, but dependencies flow freely across namespace boundaries.

**Example**:
```json
{
  "source": {
    "filePatterns": ["src/**/*.ts"],
    "excludePatterns": ["**/*.test.ts"],
    "description": "Source code files"
  },
  "tests": {
    "filePatterns": ["tests/**/*.ts", "**/*.test.ts"],
    "description": "Test files"
  }
}
```

---

### Cross-Namespace Dependency

**Definition**: A dependency where the source file and target file belong to different namespaces.

**Significance**:
- **Architectural Insight**: Shows how different parts of codebase relate
- **Test Coverage**: Tests depending on source code
- **Documentation**: Docs referencing code examples
- **Boundary Violations**: Unintended dependencies across boundaries

**Properties**:
- **Source Namespace**: Namespace of depending file
- **Target Namespace**: Namespace of depended-upon file
- **Dependency Type**: Nature of relationship
- **Files**: Specific files involved

**Expected Patterns**:
- ✅ tests → source (normal)
- ✅ docs → source (normal)
- ⚠️ source → tests (unusual, possible issue)
- ⚠️ source → docs (unusual, possible issue)

**In This System**: Detected and tracked explicitly with namespace metadata on edges.

---

### Unified Graph

**Definition**: A single dependency graph containing nodes and edges from all namespaces.

**Purpose**:
- **Complete Picture**: See entire codebase structure
- **Cross-Namespace Detection**: Identify dependencies across boundaries
- **Efficiency**: Single analysis pass for all code
- **Consistency**: Single source of truth

**Construction**:
1. Collect all files from all namespaces
2. Build dependency graph with all files
3. Tag nodes with namespace metadata
4. Tag edges with source/target namespace

**Benefits**:
- No duplicate analysis work
- Natural cross-namespace dependency detection
- Consistent dependency resolution
- Easier maintenance

**In This System**: Created by `analyzeAll()` method.

---

### Inference

**Definition**: The process of deriving new knowledge from existing dependency information.

**Types**:
- **Transitive Inference**: If A depends on B and B depends on C, then A transitively depends on C
- **Hierarchical Inference**: If A contains B and B depends on C, then A hierarchically depends on C
- **Impact Analysis**: Given a change to X, what depends on X (directly or transitively)?
- **Nearest Neighbors**: What are the immediate dependencies of a node?

**Applications**:
- **Impact Analysis**: What code is affected by changes?
- **Test Selection**: What tests to run for a change?
- **Code Navigation**: What's related to current code?
- **Refactoring**: What else needs to change?

**In This System**: Nearest neighbor inference implemented via GraphDB queries.

---

## Architecture Components

### Parser

**Definition**: Component that converts source code into an Abstract Syntax Tree (AST).

**Responsibilities**:
- Parse source code text
- Generate AST representation
- Handle language-specific syntax
- Report parsing errors

**Technologies**:
- **tree-sitter**: Universal parser generator
- **Language Grammars**: Language-specific parsers (typescript, java, python, etc.)

**In This System**: `ParserFactory` and language-specific parsers (TypeScriptParser, JavaParser, etc.)

---

### Query Engine

**Definition**: Component that executes queries against AST to extract code patterns.

**Responsibilities**:
- Execute tree-sitter query strings
- Extract matching nodes from AST
- Transform matches into structured results
- Support multiple languages

**Query Types**:
- **Pattern Matching**: Find specific syntax patterns
- **Node Extraction**: Extract specific node types
- **Relationship Detection**: Identify connections between nodes

**In This System**: `QueryEngine` and `TreeSitterQueryEngine`

---

### Analyzer

**Definition**: Component that processes query results to extract dependency information.

**Responsibilities**:
- Process query matches
- Extract import statements
- Resolve file paths
- Classify dependencies (internal, external, builtin)
- Build dependency relationships

**Pipeline**:
```
Source Code → Parser → AST → Query Engine → Matches → Analyzer → Dependencies
```

**In This System**: `analyzeDependencies()`, `analyzeImports()`, `DependencyGraphBuilder`

---

### Graph Database

**Definition**: Persistent storage system for graph data (nodes and edges).

**Responsibilities**:
- Store nodes and edges
- Query graph structure
- Find dependencies
- Detect circular dependencies
- Support metadata

**Schema**:
- **nodes**: Entity storage
- **edges**: Relationship storage
- **edge_types**: Relationship type definitions
- **projects**: Project metadata
- **analysis_sessions**: Analysis tracking

**Operations**:
- **upsertNode()**: Create or update node
- **upsertRelationship()**: Create or update edge
- **findNodes()**: Query nodes by criteria
- **findNodeDependencies()**: Get dependencies of node
- **findCircularDependencies()**: Detect cycles

**In This System**: `GraphDatabase` class using SQLite

---

### Namespace Manager

**Definition**: Component that manages namespace configuration and file organization.

**Responsibilities**:
- Load namespace configuration
- Match files to namespaces
- List files in namespace
- Validate namespace definitions

**Configuration**:
```json
{
  "default": "source",
  "namespaces": {
    "source": {
      "filePatterns": ["src/**/*.ts"],
      "excludePatterns": ["**/*.test.ts"]
    }
  }
}
```

**In This System**: `ConfigManager` and `FilePatternMatcher`

---

### Dependency Graph Builder

**Definition**: Component that constructs dependency graph from file analysis.

**Responsibilities**:
- Analyze multiple files
- Build nodes for files
- Create edges for dependencies
- Resolve import paths
- Handle circular dependencies
- Aggregate metadata

**Process**:
1. Analyze each entry point file
2. Extract dependencies from each file
3. Recursively analyze dependencies
4. Build graph structure
5. Detect circular dependencies

**In This System**: `DependencyGraphBuilder` class

---

## Data Structures

### DependencyGraph

**Definition**: Complete representation of code dependencies.

**Structure**:
```typescript
interface DependencyGraph {
  projectRoot: string;
  nodes: Map<string, GraphNode>;  // filepath -> node
  edges: Array<GraphEdge>;
  metadata: GraphMetadata;
}
```

**Properties**:
- **projectRoot**: Base directory for analysis
- **nodes**: All analyzed entities (indexed by file path)
- **edges**: All dependency relationships
- **metadata**: Analysis statistics and configuration

**Operations**:
- Add node
- Add edge
- Find node by path
- Get dependencies of node
- Detect cycles

---

### GraphNode

**Definition**: Database representation of a code entity.

**Structure**:
```typescript
interface GraphNode {
  id?: number;              // Database ID
  identifier: string;       // Unique identifier
  type: string;             // Node type (file, class, etc.)
  name: string;             // Display name
  sourceFile: string;       // File path
  language: SupportedLanguage;
  metadata?: Record<string, any>;  // Namespace, etc.
  startLine?: number;       // Source location
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}
```

**Metadata Examples**:
- `namespace`: Namespace name
- `exists`: File existence flag
- `filePath`: Absolute file path

---

### GraphEdge

**Definition**: Database representation of a dependency relationship.

**Structure**:
```typescript
interface GraphRelationship {
  id?: number;              // Database ID
  fromNodeId: number;       // Source node
  toNodeId: number;         // Target node
  type: string;             // Relationship type
  label?: string;           // Description
  metadata?: Record<string, any>;
  weight?: number;          // Strength
  sourceFile?: string;      // Origin file
}
```

**Edge Types**:
- `imports`: Import/require relationship
- `calls`: Function call relationship
- `extends`: Class inheritance
- `implements`: Interface implementation
- `depends_on`: General dependency

**Metadata Examples**:
- `sourceNamespace`: Source file's namespace
- `targetNamespace`: Target file's namespace
- `importStatement`: Original import text
- `lineNumber`: Line where dependency occurs

---

### AnalysisResult

**Definition**: Output of file or namespace analysis.

**Structure**:
```typescript
interface AnalysisResult {
  queryResults: Record<string, QueryResult[]>;  // Query outputs
  performanceMetrics: PerformanceMetrics;       // Timing data
  parseMetadata: ParseMetadata;                 // AST info
  customResults?: Record<string, any>;          // User mapping
}
```

**Components**:
- **queryResults**: Raw query outputs
- **performanceMetrics**: Performance data
- **parseMetadata**: Parse information
- **customResults**: Processed results

---

### NamespaceResult

**Definition**: Output of namespace-specific analysis.

**Structure**:
```typescript
interface NamespaceDependencyResult {
  namespace: string;
  totalFiles: number;
  analyzedFiles: number;
  failedFiles: string[];
  errors: Array<{file: string; error: string}>;
  graphStats: {
    nodes: number;
    edges: number;
    circularDependencies: number;
  };
}
```

**Purpose**: Summarize analysis results for a single namespace.

---

## Analysis Pipeline

### Stage 1: File Discovery

**Purpose**: Identify files to analyze based on namespace configuration.

**Process**:
1. Load namespace configuration
2. Apply glob patterns to find matching files
3. Apply exclude patterns to filter files
4. Return list of absolute file paths

**Components**:
- `ConfigManager.listFiles()`
- `FilePatternMatcher`

**Output**: List of file paths

---

### Stage 2: Code Parsing

**Purpose**: Convert source code into analyzable AST.

**Process**:
1. Read file content
2. Detect language from file extension
3. Get appropriate parser for language
4. Parse code into AST
5. Handle parsing errors

**Components**:
- `ParserFactory`
- Language-specific parsers
- tree-sitter library

**Output**: AST (Abstract Syntax Tree)

---

### Stage 3: Query Execution

**Purpose**: Extract specific patterns from AST.

**Process**:
1. Select queries for language
2. Execute tree-sitter queries on AST
3. Extract matching nodes
4. Convert to QueryMatch objects

**Components**:
- `TreeSitterQueryEngine`
- Query definitions (e.g., `ts-import-sources`)

**Output**: QueryMatch[] (matching AST nodes)

---

### Stage 4: Result Processing

**Purpose**: Transform query matches into structured dependency information.

**Process**:
1. Process query matches with processors
2. Extract import statements
3. Resolve file paths
4. Classify dependencies
5. Build structured results

**Components**:
- Query processors
- `analyzeDependencies()`
- Path resolution logic

**Output**: Dependency information (imports, exports, etc.)

---

### Stage 5: Graph Construction

**Purpose**: Build complete dependency graph from individual file analyses.

**Process**:
1. Analyze all files
2. Create nodes for each file
3. Create edges for dependencies
4. Detect circular dependencies
5. Aggregate metadata

**Components**:
- `DependencyGraphBuilder`
- Circular dependency detector

**Output**: DependencyGraph

---

### Stage 6: Storage

**Purpose**: Persist graph to database for querying.

**Process**:
1. Initialize database
2. Create/update nodes with metadata
3. Create/update edges with metadata
4. Store analysis metadata
5. Build indexes for efficient queries

**Components**:
- `GraphDatabase`
- `NamespaceGraphDB`
- SQLite database

**Output**: Persistent graph in database

---

### Stage 7: Query and Inference

**Purpose**: Extract insights from stored graph.

**Process**:
1. Execute database queries
2. Find dependencies
3. Detect patterns
4. Infer relationships
5. Generate reports

**Components**:
- Database query methods
- `getCrossNamespaceDependencies()`
- Inference logic

**Output**: Analysis results, dependency lists, metrics

---

## Generalized Patterns

### Pattern 1: Multi-Level Abstraction

**Concept**: System operates at multiple levels of abstraction.

**Levels**:
1. **File Level**: Files depend on other files
2. **Entity Level**: Classes/methods depend on other classes/methods
3. **Namespace Level**: Namespaces have cross-dependencies
4. **Project Level**: Projects depend on external libraries

**Implementation**:
- Use node types to distinguish levels
- Store hierarchical metadata
- Support queries at each level

**Benefits**:
- Flexible analysis granularity
- Consistent data model
- Easy to extend

**In This System**: Currently file-level, extensible to entity-level.

---

### Pattern 2: Metadata-Driven Queries

**Concept**: Store rich metadata to enable flexible queries without schema changes.

**Implementation**:
```typescript
metadata: {
  namespace: "source",
  sourceNamespace: "tests",
  targetNamespace: "source",
  // Any future properties
}
```

**Benefits**:
- No schema migrations for new properties
- Flexible query capabilities
- Backward compatible
- Easy to extend

**Applications**:
- Namespace filtering
- Cross-namespace detection
- Custom grouping
- Feature flags

---

### Pattern 3: Unified Graph with Partitions

**Concept**: Build single graph, partition for analysis, but maintain global view.

**Process**:
1. Build unified graph with all code
2. Tag nodes/edges with partition info (namespace)
3. Query globally or by partition
4. Detect cross-partition relationships

**Benefits**:
- Complete dependency picture
- Efficient cross-partition analysis
- Consistent dependency resolution
- Single analysis pass

**Implementation**: `analyzeAll()` builds unified graph, namespace tags enable partitioning

---

### Pattern 4: Pipeline Architecture

**Concept**: Break analysis into sequential stages with clear interfaces.

**Stages**:
```
Input → Parse → Query → Process → Build → Store → Query
```

**Benefits**:
- Clear separation of concerns
- Easy to test each stage
- Pluggable components
- Easy to debug

**Implementation**: Each stage has defined input/output types

---

### Pattern 5: Incremental Analysis

**Concept**: Only re-analyze what changed.

**Algorithm**:
1. Track file modification times
2. Identify changed files
3. Re-analyze changed files only
4. Update affected edges
5. Maintain unchanged parts

**Benefits**:
- Faster re-analysis
- Scales to large codebases
- Efficient CI/CD integration

**Status**: Planned for future implementation

---

### Pattern 6: Type-Safe Queries

**Concept**: Leverage TypeScript's type system for compile-time query validation.

**Implementation**:
```typescript
type QueryKey = keyof UnifiedQueryResultMap;
type QueryResult<K extends QueryKey> = UnifiedQueryResultMap[K];

function execute<K extends QueryKey>(
  key: K
): QueryResult<K> {
  // TypeScript knows exact return type
}
```

**Benefits**:
- Compile-time validation
- Auto-complete in IDEs
- Type safety
- Self-documenting

---

### Pattern 7: Bidirectional Tracking

**Concept**: Track both dependencies (what I depend on) and dependents (what depends on me).

**Queries**:
- **Dependencies**: `findNodeDependencies(nodeId)` - what does this depend on?
- **Dependents**: `findNodeDependents(nodeId)` - what depends on this?

**Benefits**:
- Impact analysis (find dependents)
- Navigation (find dependencies)
- Complete relationship view
- Efficient queries

**Implementation**: Database indexes on both `fromNodeId` and `toNodeId`

---

## Domain-Specific Terms

### Entry Point

**Definition**: A file explicitly specified for analysis (not discovered through imports).

**Purpose**: Starting point for dependency analysis.

**Example**: In a CLI tool, `index.ts` might be an entry point.

---

### Internal Dependency

**Definition**: A dependency on a file within the same project.

**Characteristics**:
- Relative import path (./file, ../dir/file)
- Path alias (@/file)
- Resolved to local file

**Example**: `import { foo } from './utils'`

---

### External Dependency

**Definition**: A dependency on an npm package or external library.

**Characteristics**:
- Package name (no ./ prefix)
- Resolved to node_modules
- May have version

**Example**: `import React from 'react'`

---

### Built-in Dependency

**Definition**: A dependency on Node.js built-in module.

**Characteristics**:
- Node.js core module (fs, path, http, etc.)
- No file extension
- No installation needed

**Example**: `import { readFile } from 'fs'`

---

### Circular Dependency

**Definition**: A cycle in the dependency graph where A depends on B and B depends on A (directly or transitively).

**Detection**: Graph cycle detection algorithm.

**Impact**: Can cause initialization issues, harder to understand code.

**Example**: `A imports B`, `B imports C`, `C imports A`

---

### Transitive Dependency

**Definition**: Indirect dependency through intermediate dependencies.

**Example**: If A depends on B and B depends on C, then C is a transitive dependency of A.

**Inference**: Computed by following dependency chains.

---

### Tree-sitter Query

**Definition**: Pattern matching query language for AST nodes.

**Syntax**:
```scheme
(import_statement
  source: (string) @source)
```

**Purpose**: Extract specific syntax patterns from code.

---

### Query Match

**Definition**: Result of executing a tree-sitter query, containing matched AST nodes.

**Structure**:
```typescript
interface QueryMatch {
  queryName: string;
  captures: Array<{
    name: string;
    node: SyntaxNode;
  }>;
}
```

---

### File-level vs Entity-level

**File-level**: Dependencies between files.
- Example: `user.ts` depends on `types.ts`

**Entity-level**: Dependencies between classes, functions, etc.
- Example: `UserClass` depends on `UserType`

**Trade-off**: File-level is simpler, entity-level is more granular.

---

### Namespace Boundary

**Definition**: The conceptual boundary between two namespaces.

**Crossing**: A cross-namespace dependency crosses this boundary.

**Enforcement**: Can be validated (e.g., source shouldn't depend on tests).

---

## Usage Examples

### Creating a Dependency Graph

```typescript
import { createDependencyGraphBuilder } from './graph/DependencyGraphBuilder';

const builder = createDependencyGraphBuilder({
  projectRoot: '/path/to/project',
  entryPoints: ['src/index.ts']
});

const { graph, analysis } = await builder.build();

console.log(`Nodes: ${graph.nodes.size}`);
console.log(`Edges: ${graph.edges.length}`);
console.log(`Circular: ${analysis.circularDependencies.totalCycles}`);
```

### Analyzing Cross-Namespace Dependencies

```typescript
import { namespaceDependencyAnalyzer } from './namespace/NamespaceDependencyAnalyzer';

const { results, graph, crossNamespaceDependencies } =
  await namespaceDependencyAnalyzer.analyzeAll('deps.config.json');

for (const dep of crossNamespaceDependencies) {
  console.log(`${dep.sourceNamespace} → ${dep.targetNamespace}`);
  console.log(`  ${dep.source} → ${dep.target}`);
}
```

### Querying GraphDB

```typescript
import { NamespaceGraphDB } from './namespace/NamespaceGraphDB';

const db = new NamespaceGraphDB('.dependency-linker/graph.db');
await db.initialize();

// Get file's dependencies
const nodes = await db.db.findNodes({
  sourceFiles: ['src/index.ts']
});

const deps = await db.db.findNodeDependencies(nodes[0].id);

console.log(`Dependencies: ${deps.length}`);

await db.close();
```

---

## Implementation Checklist

When implementing a similar system, consider:

- [ ] **Parser Integration**: Support for target languages
- [ ] **Query Definitions**: Language-specific query patterns
- [ ] **Graph Storage**: Database schema for nodes and edges
- [ ] **Namespace Support**: Logical file grouping
- [ ] **Metadata System**: Flexible property storage
- [ ] **Cross-Partition Tracking**: Unified graph with partitions
- [ ] **API Design**: Type-safe, well-documented interfaces
- [ ] **CLI Tools**: User-friendly command-line interface
- [ ] **Performance**: Efficient analysis and queries
- [ ] **Testing**: Comprehensive validation with real code
- [ ] **Documentation**: Clear concepts and examples

---

## References

### Internal Documentation
- `README.md`: User-facing documentation
- `CLAUDE.md`: Project context for Claude Code
- `CHECKPOINT-*.md`: Implementation milestones
- `WORK-REPORT-*.md`: Session summaries

### External Resources
- [tree-sitter](https://tree-sitter.github.io/): Parser generator
- [SQLite](https://www.sqlite.org/): Database engine
- [TypeScript](https://www.typescriptlang.org/): Type system

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-02
**Maintained By**: dependency-linker project
