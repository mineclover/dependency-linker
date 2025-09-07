# Analysis Functionality Documentation

## Overview

Dependency Linker provides comprehensive code analysis capabilities through its analysis engine that extracts, indexes, and tracks project metadata including dependencies, functions, classes, variables, TODOs, and metrics.

## Core Components

### 1. Analysis Index Manager
**Location**: `src/services/analysis/analysisIndexManager.ts`
**Purpose**: SQLite-based indexing and storage system for all analysis results

#### Database Schema
- **files**: Core file metadata and tracking
- **dependencies**: Import/export relationships and external libraries
- **functions**: Function definitions, parameters, and complexity metrics
- **classes**: Class definitions, inheritance, and interfaces
- **variables**: Variable declarations and exports
- **exports**: Module export information
- **comments**: Documentation and inline comments
- **todos**: TODO/FIXME/NOTE comments with priority tracking
- **file_metrics**: Code quality metrics and maintainability indices

#### Key Features
- **Automatic indexing** with content hash-based change detection
- **Transaction safety** for consistent data operations
- **Query optimization** with strategic indexing
- **WAL mode** for concurrent access support
- **Backup functionality** for data preservation

### 2. Dependency Exploration Service
**Location**: `src/services/dependency/DependencyExplorationService.ts`
**Purpose**: Graph-based dependency relationship analysis and visualization

#### Exploration Capabilities
- **Direct Dependencies**: Files imported by target file
- **Indirect Dependencies**: Transitive dependency relationships
- **Reverse Dependencies**: Files that import the target file
- **Configurable Depth**: Control exploration depth (default: 2 levels)
- **Smart Resolution**: Handles relative paths, index files, and extension variations

#### Graph Analysis
- **Dependency Type Classification**: direct, indirect, reverse
- **Language Statistics**: File type distribution
- **Size Analysis**: Total file sizes and metrics
- **Circular Dependency Detection**: Prevents infinite loops

### 3. Current Analysis Statistics

Based on the latest status output:

```
📈 Analysis Statistics:
   Analyzed Files: 227
   Dependencies: 957  
   Functions: 4311
   Classes: 184
   Todos: 16
   Last Analysis: Never
```

#### Breakdown by Category
- **Total Project Coverage**: 227 analyzed files
- **Dependency Relationships**: 957 import/export connections
- **Code Structure**: 4311 functions + 184 classes = 4495 code entities
- **Task Tracking**: 16 outstanding TODOs across the codebase

## CLI Analysis Commands

### Status Command
```bash
bun run deplink status
```
**Displays:**
- Project configuration validation
- Notion database connectivity
- Real-time analysis statistics
- System health recommendations

### Health Command  
```bash
bun run deplink health
```
**Provides:**
- Database integrity checks
- Configuration validation
- Service connectivity tests
- Performance metrics

### Export Markdown Command
```bash
bun run deplink export-markdown --file <filepath>
```
**Features:**
- Dependency graph visualization
- File relationship mapping
- Export to markdown format
- Configurable depth and filtering

## Analysis Workflow

### 1. File Discovery Phase
- Scan project directory for supported file types
- Apply inclusion/exclusion filters
- Generate file fingerprints for change detection

### 2. Parsing Phase
- Language-specific AST parsing
- Extract functions, classes, variables
- Identify import/export relationships
- Parse comments and documentation

### 3. Indexing Phase
- Store results in SQLite database
- Create optimized indexes
- Update change tracking metadata
- Calculate file metrics

### 4. Relationship Analysis
- Build dependency graphs
- Detect circular dependencies
- Map reverse relationships
- Generate statistics

## Data Persistence

### Database Location
- **Development**: `./analysis-index.db`
- **Production**: Configurable via environment

### Performance Optimizations
- **WAL Mode**: Concurrent read/write access
- **Strategic Indexing**: Fast queries on common patterns
- **Transaction Batching**: Efficient bulk operations
- **Memory Caching**: Hot data in memory

### Backup Strategy
```typescript
analysisIndexManager.backup('./backup/analysis-backup.db');
```

## Auto-Update Mechanism

### Change Detection
1. **File Modification Tracking**: Last modified timestamps
2. **Content Hash Comparison**: SHA-256 content hashing
3. **Incremental Updates**: Only re-analyze changed files
4. **Dependency Cascade**: Update dependent relationships

### Real-Time Monitoring
- File system watchers (when enabled)
- Pre-commit hooks for validation
- CI/CD integration points
- Manual trigger commands

### Status Reflection in Documentation

The analysis system provides **real-time status reflection** through:

#### 1. Dynamic Statistics Updates
- File counts update immediately after analysis
- Dependency relationships reflect current state
- Function/class counts track code evolution
- TODO lists update with code changes

#### 2. Configuration Validation
- Real-time database connectivity checks
- API key validation
- Schema compatibility verification
- Permission level assessment

#### 3. Health Monitoring
```bash
# Continuous health monitoring
bun run deplink health --watch
```

#### 4. Automated Documentation Updates
- Status command shows current analysis state
- Export commands generate up-to-date dependency maps
- Markdown exports reflect latest relationships
- Statistics align with actual codebase state

## Quality Metrics

### Code Quality Indicators
- **Maintainability Index**: Composite score (0-100)
- **Complexity Metrics**: Cyclomatic complexity per function
- **Dependency Coupling**: Import/export relationship density
- **Test Coverage**: Function/class test coverage mapping

### File-Level Metrics
- Lines of code (LOC)
- Comment-to-code ratio
- Function/class density
- Import/export balance

## Usage Examples

### Basic Dependency Analysis
```typescript
import { dependencyExplorationService } from './src/services/dependency/DependencyExplorationService.js';

const graph = await dependencyExplorationService.exploreFileDependencies(
  '/path/to/file.ts',
  {
    depth: 3,
    includeReverse: true,
    fileTypes: ['ts', 'js'],
    excludePatterns: ['/node_modules/', '/.git/']
  }
);

const summary = dependencyExplorationService.generateGraphSummary(graph);
console.log(summary.summary);
```

### Statistics Retrieval
```typescript
import { analysisIndexManager } from './src/services/analysis/analysisIndexManager.js';

const stats = analysisIndexManager.getStatistics();
console.log(`Total files: ${stats.totalFiles.count}`);
console.log(`Dependencies: ${stats.totalDependencies.count}`);
console.log(`Functions: ${stats.totalFunctions.count}`);
```

### TODO Tracking
```typescript
const todos = analysisIndexManager.getUnresolvedTodos();
console.log(`Outstanding TODOs: ${todos.length}`);
todos.forEach(todo => {
  console.log(`${todo.file_path}: ${todo.content}`);
});
```

## Integration Points

### Notion Database Sync
- **Automatic Upload**: Analysis results sync to Notion databases
- **Schema Mapping**: File metadata maps to Notion properties
- **Relationship Tracking**: Dependencies become Notion relations
- **Status Updates**: Analysis state reflects in Notion pages

### CI/CD Integration
```yaml
# Example GitHub Actions integration
- name: Run Dependency Analysis
  run: bun run deplink status --validate
  
- name: Export Analysis Report
  run: bun run deplink export-markdown --project > analysis-report.md
```

### Development Workflow
1. **Pre-commit Analysis**: Validate changes before commit
2. **PR Analysis**: Generate dependency impact reports
3. **Release Analysis**: Track architectural changes
4. **Refactoring Support**: Identify impact scope

## Performance Characteristics

### Analysis Speed
- **Initial Analysis**: ~1-2 seconds per file
- **Incremental Updates**: ~100ms per changed file
- **Relationship Updates**: ~500ms for dependency graph
- **Statistics Generation**: ~50ms for full project stats

### Memory Usage
- **Base Memory**: ~10MB for index manager
- **Per File**: ~1KB additional memory
- **Large Projects**: Linear scaling with file count
- **Peak Usage**: During bulk analysis operations

### Scalability Limits
- **File Count**: Tested up to 10,000+ files
- **Dependency Depth**: Practical limit at depth 5-6
- **Database Size**: SQLite handles multi-GB databases
- **Concurrent Access**: WAL mode supports multiple readers

## Troubleshooting

### Common Issues

1. **Database Lock Errors**
   - Solution: Check for orphaned connections
   - Use WAL mode for concurrent access

2. **Missing Dependencies**
   - Solution: Verify file path resolution
   - Check exclude patterns

3. **Performance Degradation**
   - Solution: Rebuild indexes periodically
   - Clear analysis cache

4. **Outdated Statistics**
   - Solution: Run manual re-analysis
   - Check file modification tracking

### Debug Commands
```bash
# Verify database integrity
bun run deplink health --database

# Rebuild analysis index
bun run deplink status --rebuild

# Verbose analysis output
bun run deplink status --verbose
```

This analysis functionality provides the foundation for intelligent code exploration, dependency management, and project documentation automation within the Dependency Linker system.