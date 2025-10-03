# Namespace-Scenario Integration - Implementation Tasks

**Feature**: Namespace-Scenario Integration
**Status**: 🚧 Not Started
**Owner**: TBD
**Priority**: 🔴 Critical (Enables horizontal scalability)
**Dependencies**: Scenario System must be complete

---

## Phase 1: Type Extensions

**Estimated Time**: 1-2 days

### Tasks

- [ ] **1.1** Extend NamespaceConfig interface
  - [ ] Add `scenarios?: string[]` field to `src/namespace/types.ts`
  - [ ] Add `scenarioConfig?: Record<string, Record<string, unknown>>` field
  - [ ] Update JSDoc documentation with examples
  - [ ] Add default value documentation

- [ ] **1.2** Update ConfigManager
  - [ ] Handle scenarios field in config validation
  - [ ] Validate scenario IDs exist in ScenarioRegistry
  - [ ] Merge namespace scenarioConfig with scenario defaults
  - [ ] Add validation for scenarioConfig structure

- [ ] **1.3** Unit tests for type extensions
  - [ ] Test valid namespace config with scenarios
  - [ ] Test invalid scenario ID rejection
  - [ ] Test scenarioConfig validation
  - [ ] Test default scenario selection (basic-structure, file-dependency)

---

## Phase 2: NamespaceDependencyAnalyzer Refactoring

**Estimated Time**: 3-4 days

### Tasks

- [ ] **2.1** Update NamespaceDependencyAnalyzer constructor
  - [ ] Add `scenarioRegistry: ScenarioRegistry` parameter
  - [ ] Store as private field
  - [ ] Keep `database: GraphDatabase` parameter
  - [ ] Update dependency injection

- [ ] **2.2** Refactor analyzeNamespace() method
  - [ ] Get namespace config and files from ConfigManager
  - [ ] Extract scenarios from config (default: ['basic-structure', 'file-dependency'])
  - [ ] Call `scenarioRegistry.getExecutionOrder(scenarioIds)`
  - [ ] Log execution order for visibility

- [ ] **2.3** Implement scenario execution loop
  - [ ] For each scenario in execution order:
    - [ ] Get scenario spec from registry
    - [ ] Create analyzer instance using scenario.analyzer.className
    - [ ] Merge namespace scenarioConfig with scenario config
    - [ ] Execute analyzer.analyze() for each file
  - [ ] Track execution metrics (time, files processed)

- [ ] **2.4** Implement createAnalyzer() factory method
  - [ ] Map className to actual Analyzer class
  - [ ] Pass scenario spec to analyzer constructor
  - [ ] Pass merged config to analyzer
  - [ ] Handle analyzer creation errors

- [ ] **2.5** Update semantic tag application
  - [ ] Move semantic tag logic after scenario execution
  - [ ] Apply namespace.semanticTags to all analyzed nodes
  - [ ] Maintain source_file tracking

- [ ] **2.6** Add execution logging and metrics
  - [ ] Log scenario execution start/end
  - [ ] Log per-file analysis results
  - [ ] Collect and report execution statistics
  - [ ] Add progress indicators for CLI

---

## Phase 3: CLI Integration

**Estimated Time**: 2-3 days

### Tasks

- [ ] **3.1** Update namespace analyze command
  - [ ] Add `--scenarios` flag for override: `--scenarios react-component,file-dependency`
  - [ ] Add `--scenario-config` flag for config override (JSON string)
  - [ ] Parse and validate CLI scenario options
  - [ ] Pass to NamespaceDependencyAnalyzer

- [ ] **3.2** Create namespace scenarios command
  - [ ] List all available scenarios from registry
  - [ ] Show scenario details (name, description, version)
  - [ ] Display extends/requires relationships
  - [ ] Show nodeTypes and edgeTypes for each scenario

- [ ] **3.3** Create namespace scenarios <namespace> command
  - [ ] Show scenarios configured for specific namespace
  - [ ] Display effective execution order
  - [ ] Show merged configuration
  - [ ] List files that will be analyzed

- [ ] **3.4** Update analyze-all command
  - [ ] Support --scenarios override for all namespaces
  - [ ] Show per-namespace execution order
  - [ ] Aggregate execution statistics

- [ ] **3.5** Update CLI help and documentation
  - [ ] Add examples for scenario selection
  - [ ] Document scenario config override syntax
  - [ ] Add troubleshooting section

---

## Phase 4: Configuration Examples and Validation

**Estimated Time**: 1-2 days

### Tasks

- [ ] **4.1** Create example configurations
  - [ ] Monorepo example (web, mobile, backend, shared, docs)
  - [ ] Layered architecture example (presentation, business, data, infrastructure)
  - [ ] Multi-framework example (React, Vue, Angular in same repo)
  - [ ] Add to docs/examples/

- [ ] **4.2** Config validation enhancements
  - [ ] Validate scenario combinations (compatibility check)
  - [ ] Warn on conflicting edge types
  - [ ] Suggest optimal scenario combinations
  - [ ] Detect unused scenarios in config

- [ ] **4.3** Migration utilities
  - [ ] Create migration helper for existing configs
  - [ ] Auto-detect appropriate scenarios from file patterns
  - [ ] Generate recommended scenario configuration
  - [ ] Add to CLI tools

---

## Phase 5: Backward Compatibility and Testing

**Estimated Time**: 2-3 days

### Tasks

- [ ] **5.1** Backward compatibility layer
  - [ ] Ensure configs without scenarios field work
  - [ ] Apply default scenarios (basic-structure, file-dependency)
  - [ ] Log when defaults are used
  - [ ] No breaking changes to existing APIs

- [ ] **5.2** Integration tests
  - [ ] Test namespace with explicit scenarios
  - [ ] Test namespace with default scenarios
  - [ ] Test scenario execution order correctness
  - [ ] Test scenarioConfig merging
  - [ ] Test cross-namespace with different scenarios

- [ ] **5.3** E2E workflow tests
  - [ ] Test full analysis workflow with scenarios
  - [ ] Test CLI commands with scenario flags
  - [ ] Test error cases (invalid scenario, missing deps)
  - [ ] Test performance with multiple scenarios

- [ ] **5.4** Edge case testing
  - [ ] Empty scenarios array
  - [ ] Scenario with circular extends
  - [ ] Non-existent scenario ID
  - [ ] Conflicting scenarioConfig values

---

## Phase 6: Performance and Optimization

**Estimated Time**: 2-3 days

### Tasks

- [ ] **6.1** Analyzer instance caching
  - [ ] Cache analyzer instances per scenario ID
  - [ ] Reuse for multiple files
  - [ ] Clear cache after namespace completion
  - [ ] Measure performance improvement

- [ ] **6.2** Parallel execution investigation
  - [ ] Identify independent scenarios
  - [ ] Design parallel execution strategy
  - [ ] Implement prototype (if feasible)
  - [ ] Benchmark vs sequential execution

- [ ] **6.3** Query optimization
  - [ ] Minimize duplicate tree-sitter parsing
  - [ ] Share AST across compatible scenarios
  - [ ] Optimize database writes (batch operations)

- [ ] **6.4** Performance benchmarks
  - [ ] Baseline: current DependencyGraphBuilder approach
  - [ ] Scenario-based: new architecture
  - [ ] Compare execution time, memory usage
  - [ ] Document performance characteristics

---

## Phase 7: Documentation and Examples

**Estimated Time**: 2-3 days

### Tasks

- [ ] **7.1** Update architecture documentation
  - [ ] Update docs/pipeline-overview.md with scenario integration
  - [ ] Update docs/module-organization.md with scenario module
  - [ ] Create docs/namespace-scenario-guide.md

- [ ] **7.2** API documentation
  - [ ] Document extended NamespaceConfig interface
  - [ ] Document NamespaceDependencyAnalyzer changes
  - [ ] Document CLI scenario commands
  - [ ] Add JSDoc to all public methods

- [ ] **7.3** Usage examples
  - [ ] Create examples/namespace-scenarios/ directory
  - [ ] Add monorepo configuration example
  - [ ] Add layered architecture example
  - [ ] Add custom scenario creation example

- [ ] **7.4** Migration guide
  - [ ] Document migration from current system
  - [ ] Provide step-by-step upgrade path
  - [ ] List breaking changes (if any)
  - [ ] Include troubleshooting section

---

## Phase 8: Production Readiness

**Estimated Time**: 1-2 days

### Tasks

- [ ] **8.1** Error handling review
  - [ ] Graceful handling of analyzer failures
  - [ ] Clear error messages for config issues
  - [ ] Fallback behavior for missing scenarios
  - [ ] Add error recovery strategies

- [ ] **8.2** Logging and observability
  - [ ] Structured logging for scenario execution
  - [ ] Performance metrics collection
  - [ ] Debug mode for troubleshooting
  - [ ] Add execution traces

- [ ] **8.3** Final validation
  - [ ] All tests passing (unit + integration + E2E)
  - [ ] Test coverage ≥85%
  - [ ] Performance benchmarks meet targets
  - [ ] Documentation complete and accurate

- [ ] **8.4** Release preparation
  - [ ] Update CHANGELOG.md
  - [ ] Bump version in package.json
  - [ ] Update README.md with new features
  - [ ] Prepare release notes

---

## Acceptance Criteria

- [ ] NamespaceConfig supports scenarios and scenarioConfig fields
- [ ] NamespaceDependencyAnalyzer orchestrates scenario-based analysis
- [ ] CLI supports scenario selection and override
- [ ] Backward compatibility maintained (100% of existing tests pass)
- [ ] Execution order correctly calculated via topological sort
- [ ] Configuration examples cover common use cases
- [ ] Test coverage ≥85% for integration code
- [ ] Performance overhead <10% vs current implementation
- [ ] Documentation complete with migration guide
- [ ] Zero breaking changes to public APIs

---

## Known Challenges

1. **Analyzer Instance Creation**: Dynamic creation of analyzers from className string
   - Solution: Registry mapping of className → constructor

2. **Config Merging Complexity**: Multiple levels (scenario default → namespace config → CLI override)
   - Solution: Clear precedence rules and validation

3. **Backward Compatibility**: Existing configs must work without scenarios field
   - Solution: Default scenario selection logic

4. **Performance**: Sequential scenario execution may be slower
   - Solution: Optimize hot paths, investigate parallel execution (future)

---

**Dependencies**: Scenario System (must be complete first)
**Blocks**: ReactDependencyAnalyzer implementation

**Last Updated**: 2025-10-04
