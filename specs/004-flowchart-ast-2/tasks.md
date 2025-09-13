# Tasks: AST-Based Code Analysis Framework Refactoring

**Input**: Design documents from `/specs/004-flowchart-ast-2/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents: ✅
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category: ✅
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules: ✅
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness: ✅
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Single project structure** (from plan.md):
```
src/
├── models/              # AnalysisResult, ExtractedData, etc.
├── services/            # AnalysisEngine, ParserRegistry
├── parsers/             # Language-specific parsers
├── extractors/          # Data extraction plugins
├── interpreters/        # Data interpretation plugins
├── cli/                 # Command-line interface
└── lib/                 # Core library exports

tests/
├── contract/            # Plugin interface contracts
├── integration/         # Multi-language analysis tests
└── unit/                # Component-specific tests
```

## Phase 3.1: Setup

- [ ] **T001** Create project structure directories: `src/{models,services,parsers,extractors,interpreters,cli,lib}` and `tests/{contract,integration,unit}`
- [ ] **T002** Install TypeScript dependencies: tree-sitter, tree-sitter-typescript, tree-sitter-go, tree-sitter-java, @types/node
- [ ] **T003** [P] Configure build tools: TypeScript config with ES2020, strict mode, declaration files
- [ ] **T004** [P] Configure linting: ESLint with TypeScript rules, Prettier formatting
- [ ] **T005** [P] Configure testing: Jest with TypeScript support, coverage reporting
- [ ] **T006** [P] Configure package.json: library exports, CLI binary, version 2.0.0

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests (Parallel - Different Files)
- [ ] **T007** [P] Create contract test for IAnalysisEngine interface at `tests/contract/analysis-engine.contract.test.ts`
- [ ] **T008** [P] Create contract test for ILanguageParser interface at `tests/contract/language-parser.contract.test.ts`
- [ ] **T009** [P] Create contract test for IDataExtractor interface at `tests/contract/data-extractor.contract.test.ts`
- [ ] **T010** [P] Create contract test for IDataInterpreter interface at `tests/contract/data-interpreter.contract.test.ts`

### Integration Tests (Parallel - Different Files)
- [ ] **T011** [P] Create multi-language analysis test at `tests/integration/multi-language-analysis.test.ts`
- [ ] **T012** [P] Create plugin system test at `tests/integration/plugin-system.test.ts`
- [ ] **T013** [P] Create AST caching test at `tests/integration/ast-caching.test.ts`
- [ ] **T014** [P] Create performance benchmark test at `tests/integration/performance.test.ts`

### User Story Tests (Parallel - Different Files)
- [ ] **T015** [P] Create dependency analysis compatibility test at `tests/integration/dependency-compatibility.test.ts`
- [ ] **T016** [P] Create extensible analyzer test at `tests/integration/extensible-analyzer.test.ts`
- [ ] **T017** [P] Create batch analysis test at `tests/integration/batch-analysis.test.ts`

## Phase 3.3: Core Models (Parallel - Different Files)

- [ ] **T018** [P] Create AnalysisResult model at `src/models/AnalysisResult.ts`
- [ ] **T019** [P] Create ExtractedData model at `src/models/ExtractedData.ts`
- [ ] **T020** [P] Create AnalysisConfig model at `src/models/AnalysisConfig.ts`
- [ ] **T021** [P] Create CacheEntry model at `src/models/CacheEntry.ts`
- [ ] **T022** [P] Create PerformanceMetrics model at `src/models/PerformanceMetrics.ts`
- [ ] **T023** [P] Create AnalysisError model at `src/models/AnalysisError.ts`

## Phase 3.4: Core Interfaces (Parallel - Different Files)

- [ ] **T024** [P] Create IAnalysisEngine interface at `src/services/IAnalysisEngine.ts`
- [ ] **T025** [P] Create ILanguageParser interface at `src/parsers/ILanguageParser.ts`
- [ ] **T026** [P] Create IDataExtractor interface at `src/extractors/IDataExtractor.ts`
- [ ] **T027** [P] Create IDataInterpreter interface at `src/interpreters/IDataInterpreter.ts`
- [ ] **T028** [P] Create ICacheManager interface at `src/services/ICacheManager.ts`

## Phase 3.5: Registry System (Sequential - Shared Dependencies)

- [ ] **T029** Create ParserRegistry service at `src/services/ParserRegistry.ts`
- [ ] **T030** Create ExtractorRegistry service at `src/services/ExtractorRegistry.ts`
- [ ] **T031** Create InterpreterRegistry service at `src/services/InterpreterRegistry.ts`
- [ ] **T032** Create CacheManager service at `src/services/CacheManager.ts`

## Phase 3.6: Language Parsers (Parallel - Different Files)

- [ ] **T033** [P] Create TypeScriptParser at `src/parsers/TypeScriptParser.ts`
- [ ] **T034** [P] Create GoParser at `src/parsers/GoParser.ts`
- [ ] **T035** [P] Create JavaParser at `src/parsers/JavaParser.ts`
- [ ] **T036** [P] Create JavaScriptParser at `src/parsers/JavaScriptParser.ts`

## Phase 3.7: Core Engine Implementation

- [ ] **T037** Create AnalysisEngine core implementation at `src/services/AnalysisEngine.ts`
- [ ] **T038** Integrate registries with AnalysisEngine in `src/services/AnalysisEngine.ts`
- [ ] **T039** Add AST caching logic to AnalysisEngine in `src/services/AnalysisEngine.ts`

## Phase 3.8: Built-in Extractors (Parallel - Different Files)

- [ ] **T040** [P] Create DependencyExtractor at `src/extractors/DependencyExtractor.ts`
- [ ] **T041** [P] Create IdentifierExtractor at `src/extractors/IdentifierExtractor.ts`
- [ ] **T042** [P] Create ComplexityExtractor at `src/extractors/ComplexityExtractor.ts`

## Phase 3.9: Built-in Interpreters (Parallel - Different Files)

- [ ] **T043** [P] Create DependencyAnalysisInterpreter at `src/interpreters/DependencyAnalysisInterpreter.ts`
- [ ] **T044** [P] Create IdentifierAnalysisInterpreter at `src/interpreters/IdentifierAnalysisInterpreter.ts`

## Phase 3.10: API Compatibility Layer

- [ ] **T045** Create TypeScriptAnalyzer compatibility facade at `src/lib/TypeScriptAnalyzer.ts`
- [ ] **T046** Update existing API to use new engine in `src/lib/TypeScriptAnalyzer.ts`
- [ ] **T047** Add deprecation warnings for old APIs in `src/lib/TypeScriptAnalyzer.ts`

## Phase 3.11: CLI Implementation

- [ ] **T048** Create CLI entry point at `src/cli/index.ts`
- [ ] **T049** Add analysis commands to CLI at `src/cli/commands/analyze.ts`
- [ ] **T050** Add help and version commands at `src/cli/commands/help.ts`

## Phase 3.12: Library Exports

- [ ] **T051** Create main library exports at `src/lib/index.ts`
- [ ] **T052** Export types and interfaces at `src/lib/types.ts`
- [ ] **T053** Create convenience factory functions at `src/lib/factory.ts`

## Phase 3.13: Integration & Polish

### Performance Optimization (Parallel - Different Files)
- [ ] **T054** [P] Add performance monitoring to AnalysisEngine at `src/services/AnalysisEngine.ts`
- [ ] **T055** [P] Optimize AST parsing performance at `src/services/CacheManager.ts`
- [ ] **T056** [P] Add memory usage tracking at `src/models/PerformanceMetrics.ts`

### Logging & Observability (Parallel - Different Files)
- [ ] **T057** [P] Add structured logging to AnalysisEngine at `src/services/AnalysisEngine.ts`
- [ ] **T058** [P] Add error context tracking at `src/models/AnalysisError.ts`
- [ ] **T059** [P] Add analysis metrics collection at `src/services/MetricsCollector.ts`

### Unit Tests (Parallel - Different Files)
- [ ] **T060** [P] Create unit tests for AnalysisEngine at `tests/unit/services/AnalysisEngine.test.ts`
- [ ] **T061** [P] Create unit tests for ParserRegistry at `tests/unit/services/ParserRegistry.test.ts`
- [ ] **T062** [P] Create unit tests for extractors at `tests/unit/extractors/`
- [ ] **T063** [P] Create unit tests for interpreters at `tests/unit/interpreters/`
- [ ] **T064** [P] Create unit tests for parsers at `tests/unit/parsers/`

### Documentation & Examples
- [ ] **T065** [P] Create API documentation at `docs/api.md`
- [ ] **T066** [P] Create migration guide at `docs/migration.md`
- [ ] **T067** [P] Create example plugins at `examples/custom-plugins/`

## Dependency Graph

```
Setup (T001-T006)
    ↓
Contract Tests (T007-T010) [P]
    ↓
Integration Tests (T011-T017) [P]
    ↓
Models (T018-T023) [P]
    ↓
Interfaces (T024-T028) [P]
    ↓
Registries (T029-T032)
    ↓
Parsers (T033-T036) [P]
    ↓
Core Engine (T037-T039)
    ↓
Extractors (T040-T042) [P] & Interpreters (T043-T044) [P]
    ↓
API Compatibility (T045-T047)
    ↓
CLI (T048-T050) & Library Exports (T051-T053) [P]
    ↓
Polish & Optimization (T054-T067) [P]
```

## Parallel Execution Examples

### Contract Tests Phase (Tasks 7-10)
```bash
# Run all contract tests in parallel
Task agent-1: "Create contract test for IAnalysisEngine interface"
Task agent-2: "Create contract test for ILanguageParser interface"
Task agent-3: "Create contract test for IDataExtractor interface"
Task agent-4: "Create contract test for IDataInterpreter interface"
```

### Models Phase (Tasks 18-23)
```bash
# Create all model files in parallel
Task agent-1: "Create AnalysisResult model at src/models/AnalysisResult.ts"
Task agent-2: "Create ExtractedData model at src/models/ExtractedData.ts"
Task agent-3: "Create AnalysisConfig model at src/models/AnalysisConfig.ts"
Task agent-4: "Create CacheEntry model at src/models/CacheEntry.ts"
# etc...
```

### Language Parsers Phase (Tasks 33-36)
```bash
# Implement all language parsers in parallel
Task agent-1: "Create TypeScriptParser at src/parsers/TypeScriptParser.ts"
Task agent-2: "Create GoParser at src/parsers/GoParser.ts"
Task agent-3: "Create JavaParser at src/parsers/JavaParser.ts"
Task agent-4: "Create JavaScriptParser at src/parsers/JavaScriptParser.ts"
```

## Validation Checklist

### All Contracts Have Tests ✅
- [x] IAnalysisEngine → T007
- [x] ILanguageParser → T008
- [x] IDataExtractor → T009
- [x] IDataInterpreter → T010

### All Entities Have Models ✅
- [x] AnalysisResult → T018
- [x] ExtractedData → T019
- [x] AnalysisConfig → T020
- [x] CacheEntry → T021
- [x] PerformanceMetrics → T022
- [x] AnalysisError → T023

### All Core Components Implemented ✅
- [x] AnalysisEngine → T037-T039
- [x] Registry System → T029-T032
- [x] Language Parsers → T033-T036
- [x] Plugin System → T040-T044
- [x] API Compatibility → T045-T047

### TDD Order Enforced ✅
- [x] Contract tests before implementations
- [x] Integration tests before core components
- [x] Models before services
- [x] Interfaces before implementations

**Total Tasks**: 67 tasks
**Parallel Tasks**: 45 tasks (67% parallelizable)
**Sequential Tasks**: 22 tasks (critical path dependencies)

---
*Ready for Phase 4: Implementation execution following TDD principles*