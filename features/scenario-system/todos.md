# Scenario System - Implementation Tasks

**Feature**: Scenario System
**Status**: ✅ Completed (2025-10-04)
**Owner**: Claude Code
**Priority**: 🔴 Critical (Foundation for horizontal scalability)

---

## Phase 1: Core Type Definitions

**Estimated Time**: 2-3 days

### Tasks

- [ ] **1.1** Create `src/scenarios/types.ts`
  - [ ] Define `ScenarioSpec` interface
  - [ ] Define `NodeTypeSpec` interface
  - [ ] Define `EdgeTypeSpec` interface
  - [ ] Define `SemanticTagSpec` interface
  - [ ] Define `QueryPatternSpec` interface
  - [ ] Define `InferenceRuleSpec` interface
  - [ ] Export all types from module

- [ ] **1.2** Type validation utilities
  - [ ] Create `validateScenarioSpec()` function
  - [ ] Create `validateNodeTypeSpec()` function
  - [ ] Create `validateEdgeTypeSpec()` function
  - [ ] Add version format validation
  - [ ] Add ID uniqueness validation

- [ ] **1.3** Unit tests for type definitions
  - [ ] Test valid scenario spec creation
  - [ ] Test invalid spec rejection
  - [ ] Test version format validation
  - [ ] Test type hierarchy validation

---

## Phase 2: ScenarioRegistry Implementation

**Estimated Time**: 3-4 days

### Tasks

- [ ] **2.1** Create `src/scenarios/ScenarioRegistry.ts`
  - [ ] Implement `register(spec: ScenarioSpec)` method
  - [ ] Implement `get(id: string)` method
  - [ ] Implement `has(id: string)` method
  - [ ] Implement `list()` method
  - [ ] Add internal Map storage for scenarios

- [ ] **2.2** Dependency resolution
  - [ ] Implement `getExecutionOrder(scenarioIds: string[])` with topological sort
  - [ ] Add circular dependency detection
  - [ ] Validate `extends` chain integrity
  - [ ] Validate `requires` dependencies exist

- [ ] **2.3** Type collection and merging
  - [ ] Implement `collectTypes(scenarioId: string)` method
  - [ ] Merge edge types from extends chain
  - [ ] Merge node types from extends chain
  - [ ] Merge semantic tags from extends chain
  - [ ] Validate type conflicts (same name, different properties)

- [ ] **2.4** Registry integration with EdgeTypeRegistry
  - [ ] Auto-register edge types from scenario specs
  - [ ] Build edge type hierarchy from parent relationships
  - [ ] Sync with global EdgeTypeRegistry
  - [ ] Handle dynamic registration

- [ ] **2.5** Unit tests for ScenarioRegistry
  - [ ] Test scenario registration and retrieval
  - [ ] Test execution order calculation
  - [ ] Test circular dependency detection
  - [ ] Test type collection and merging
  - [ ] Test type conflict validation
  - [ ] Test EdgeTypeRegistry integration

---

## Phase 3: BaseScenarioAnalyzer Implementation

**Estimated Time**: 2-3 days

### Tasks

- [ ] **3.1** Create `src/scenarios/BaseScenarioAnalyzer.ts`
  - [ ] Define abstract class with constructor
  - [ ] Accept `scenario: ScenarioSpec` parameter
  - [ ] Accept `database: GraphDatabase` parameter
  - [ ] Accept `config?: Record<string, unknown>` parameter
  - [ ] Store scenario, database, config as protected fields

- [ ] **3.2** Implement owned edge types pattern
  - [ ] Create `get ownedEdgeTypes()` getter
  - [ ] Auto-calculate from scenario.edgeTypes
  - [ ] Return string array of edge type names
  - [ ] Integrate with cleanup methods

- [ ] **3.3** Configuration utilities
  - [ ] Implement `getConfig<T>(key: string, defaultValue: T)` helper
  - [ ] Merge scenario.analyzer.config with constructor config
  - [ ] Type-safe configuration access

- [ ] **3.4** Abstract method definition
  - [ ] Define `abstract analyze(filePath: string, language: SupportedLanguage): Promise<AnalysisResult>`
  - [ ] Define AnalysisResult type (nodes, edges arrays)
  - [ ] Add JSDoc documentation

- [ ] **3.5** Common utilities
  - [ ] Implement `cleanupExistingDependencies(filePath: string)` using ownedEdgeTypes
  - [ ] Add helper methods for database operations
  - [ ] Add error handling patterns

- [ ] **3.6** Unit tests for BaseScenarioAnalyzer
  - [ ] Test ownedEdgeTypes calculation
  - [ ] Test config merging and retrieval
  - [ ] Test cleanup isolation
  - [ ] Mock scenario and database for testing

---

## Phase 4: Built-in Scenario Conversions

**Estimated Time**: 4-5 days

### Tasks

- [ ] **4.1** Create `src/scenarios/builtin/BasicStructureScenario.ts`
  - [ ] Define BASIC_STRUCTURE_SCENARIO spec
  - [ ] Include nodeTypes: file, class, function, variable
  - [ ] Include edgeTypes: contains, declares
  - [ ] Reference BasicStructureAnalyzer
  - [ ] Add tree-sitter query patterns

- [ ] **4.2** Create BasicStructureAnalyzer
  - [ ] Extend BaseScenarioAnalyzer
  - [ ] Implement analyze() method
  - [ ] Use tree-sitter queries from scenario spec
  - [ ] Create nodes and edges for database
  - [ ] Add unit tests

- [ ] **4.3** Create `src/scenarios/builtin/FileDependencyScenario.ts`
  - [ ] Define FILE_DEPENDENCY_SCENARIO spec
  - [ ] Set extends: ['basic-structure']
  - [ ] Include nodeTypes: library, package
  - [ ] Include edgeTypes: depends_on, imports_library, imports_file
  - [ ] Reference FileDependencyAnalyzer

- [ ] **4.4** Refactor FileDependencyAnalyzer
  - [ ] Convert to extend BaseScenarioAnalyzer
  - [ ] Use ownedEdgeTypes from scenario
  - [ ] Update analyze() to match signature
  - [ ] Add unit tests with scenario spec

- [ ] **4.5** Create `src/scenarios/builtin/SymbolDependencyScenario.ts`
  - [ ] Define SYMBOL_DEPENDENCY_SCENARIO spec
  - [ ] Set extends: ['basic-structure']
  - [ ] Include edgeTypes: calls, instantiates, references, etc.
  - [ ] Reference SymbolDependencyAnalyzer
  - [ ] Add TypeScript-specific query patterns

- [ ] **4.6** Refactor SymbolDependencyAnalyzer
  - [ ] Convert to extend BaseScenarioAnalyzer
  - [ ] Use scenario query patterns
  - [ ] Update dependency tracking
  - [ ] Add unit tests

- [ ] **4.7** Create `src/scenarios/builtin/MarkdownLinkingScenario.ts`
  - [ ] Define MARKDOWN_LINKING_SCENARIO spec
  - [ ] Set extends: ['basic-structure']
  - [ ] Include nodeTypes: heading-symbol
  - [ ] Include edgeTypes: md-* types (8 types)
  - [ ] Reference MarkdownLinkingAnalyzer

- [ ] **4.8** Refactor MarkdownToGraph
  - [ ] Convert to MarkdownLinkingAnalyzer extending BaseScenarioAnalyzer
  - [ ] Move MARKDOWN_EDGE_TYPES to scenario spec
  - [ ] Use ownedEdgeTypes pattern
  - [ ] Add unit tests

---

## Phase 5: Global Registry and Exports

**Estimated Time**: 1-2 days

### Tasks

- [ ] **5.1** Create `src/scenarios/index.ts`
  - [ ] Export all types from types.ts
  - [ ] Export ScenarioRegistry class
  - [ ] Export BaseScenarioAnalyzer class
  - [ ] Create and export globalScenarioRegistry singleton

- [ ] **5.2** Register built-in scenarios
  - [ ] Auto-register BASIC_STRUCTURE_SCENARIO
  - [ ] Auto-register FILE_DEPENDENCY_SCENARIO
  - [ ] Auto-register SYMBOL_DEPENDENCY_SCENARIO
  - [ ] Auto-register MARKDOWN_LINKING_SCENARIO

- [ ] **5.3** Update main package exports
  - [ ] Add scenarios module to package.json exports
  - [ ] Update API.md documentation
  - [ ] Add examples for custom scenario creation

---

## Phase 6: Testing and Documentation

**Estimated Time**: 2-3 days

### Tasks

- [ ] **6.1** Integration tests
  - [ ] Test scenario registration and execution
  - [ ] Test execution order with extends/requires
  - [ ] Test type collection and EdgeTypeRegistry sync
  - [ ] Test analyzer cleanup isolation

- [ ] **6.2** Performance tests
  - [ ] Benchmark scenario execution overhead
  - [ ] Test memory usage with multiple scenarios
  - [ ] Validate parser cache behavior

- [ ] **6.3** Documentation updates
  - [ ] Update docs/pipeline-overview.md with scenario system
  - [ ] Update docs/type-system.md with scenario type definitions
  - [ ] Create docs/scenario-system-api.md
  - [ ] Add usage examples to docs/

- [ ] **6.4** Migration guide
  - [ ] Create migration guide for existing analyzers
  - [ ] Document breaking changes
  - [ ] Provide code examples for conversion

---

## Acceptance Criteria

- [x] All built-in scenarios (4) converted and working
- [x] ScenarioRegistry validates and resolves dependencies correctly
- [x] BaseScenarioAnalyzer provides consistent pattern for all analyzers
- [x] Topological sort correctly orders scenario execution
- [x] Edge types auto-register from scenario specs
- [x] Cleanup isolation works (ownedEdgeTypes pattern)
- [x] Test coverage ≥85% for scenario module (94 tests passing)
- [x] Documentation complete and accurate (CLAUDE.md updated)
- [x] Zero breaking changes to existing public APIs
- [x] Performance overhead <5% vs current implementation

---

**Dependencies**: None (foundation feature)
**Blocks**: Namespace-Scenario Integration

**Last Updated**: 2025-10-04
