# Implementation Plan: AST-Based Code Analysis Framework Refactoring

**Branch**: `004-flowchart-ast-2` | **Date**: 2025-09-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-flowchart-ast-2/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✅
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below ✅
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md ✅
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file ✅
6. Re-evaluate Constitution Check section ✅
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md) ✅
8. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Refactor the existing TypeScript dependency analysis system into an extensible, multi-language AST-based code analysis framework that supports pluggable analyzers while maintaining current functionality. The system will follow a three-module architecture: Code Parser → Meaningful Information Extraction → Information Processing, enabling support for Go, Java, TypeScript and additional analysis types beyond dependency tracking.

## Technical Context
**Language/Version**: TypeScript 5.x, Node.js 18+
**Primary Dependencies**: tree-sitter, tree-sitter-typescript, tree-sitter-go, tree-sitter-java
**Storage**: File-based caching with JSON serialization
**Testing**: Jest with integration test suite
**Target Platform**: Node.js library with CLI interface
**Project Type**: single (library-first architecture)
**Performance Goals**: <200ms per file analysis, AST reuse across analyzers
**Constraints**: Maintain existing API compatibility, support multiple language parsers
**Scale/Scope**: Support 10k+ file analysis, extensible to 5+ programming languages

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (core analysis library)
- Using framework directly? (direct tree-sitter usage, no wrappers)
- Single data model? (unified AnalysisResult format)
- Avoiding patterns? (direct plugin interfaces, no complex abstractions)

**Architecture**:
- EVERY feature as library? (core analysis library with pluggable analyzers)
- Libraries listed: ast-analysis-core (multi-language AST parsing and analysis)
- CLI per library: analysis-cli with --help/--version/--format support
- Library docs: llms.txt format planned

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (tests written first for new analyzer interfaces)
- Git commits show tests before implementation? (contract tests before plugin system)
- Order: Contract→Integration→E2E→Unit strictly followed
- Real dependencies used? (actual tree-sitter parsers, real code files)
- Integration tests for: new analyzer interfaces, multi-language support, plugin contracts
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? (analysis metrics, parser performance)
- Frontend logs → backend? (N/A - library focused)
- Error context sufficient? (parse errors, analysis failures with context)

**Versioning**:
- Version number assigned? (2.0.0 - breaking changes for extensibility)
- BUILD increments on every change? (automatic via CI)
- Breaking changes handled? (compatibility layer for existing API)

## Project Structure

### Documentation (this feature)
```
specs/004-flowchart-ast-2/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
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

**Structure Decision**: Option 1 (single project) - library-first architecture with clear separation of concerns

## Phase 0: Outline & Research ✅

### Research Tasks Completed
1. **Multi-language tree-sitter integration**: Researched tree-sitter bindings for Go, Java, Python
2. **Plugin architecture patterns**: Investigated extensible analyzer patterns in TypeScript
3. **AST caching strategies**: Researched efficient AST storage and reuse mechanisms
4. **Performance optimization**: Studied tree-sitter performance characteristics and optimization techniques

**Output**: research.md with all NEEDS CLARIFICATION resolved ✅

## Phase 1: Design & Contracts ✅

1. **Extract entities from feature spec** → `data-model.md`: ✅ COMPLETE
   - Core entities: AnalysisEngine, LanguageParser, IDataExtractor, IDataInterpreter
   - Validation rules and relationships defined
   - State transitions documented

2. **Generate API contracts** from functional requirements: ✅ COMPLETE
   - Plugin interfaces for extensibility
   - Analysis engine contracts
   - Data extractor/interpreter contracts
   - Language parser registry contracts

3. **Generate contract tests** from contracts: ⏳ PENDING FOR /tasks
   - Plugin interface compliance tests
   - Multi-language parsing tests
   - Analysis pipeline integration tests

4. **Extract test scenarios** from user stories: ✅ COMPLETE
   - Quickstart guide with usage examples
   - Multi-language analysis scenarios
   - Custom plugin development examples

5. **Update agent file incrementally**: ⏳ PENDING
   - Claude context update required

**Output**: data-model.md ✅, /contracts/* ✅, quickstart.md ✅, failing tests (pending), agent-specific file (pending)

## Re-evaluate Constitution Check ✅
*Post-Design Constitution Check*

**Simplicity**: ✅ Single project maintained, direct tree-sitter usage, unified data model
**Architecture**: ✅ Plugin-based library architecture with clear contracts
**Testing**: ✅ Contract tests defined for plugin interfaces
**Observability**: ✅ Structured logging and performance metrics planned
**Versioning**: ✅ Breaking change version (2.0.0) with compatibility layer

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract interface → contract test task [P]
- Each plugin type → implementation task [P]
- Each user story → integration test task
- Performance optimization tasks
- API compatibility layer tasks

**Ordering Strategy**:
- TDD order: Contract tests before plugin implementations
- Dependency order: Core interfaces before plugin implementations
- Integration order: Parser registry before extractors before interpreters
- Mark [P] for parallel execution (independent plugin development)

**Key Task Categories**:
1. Contract Tests (5-7 tasks) [P]
2. Core Engine Implementation (3-4 tasks)
3. Plugin System Implementation (4-5 tasks) [P]
4. Language Parser Integration (3-4 tasks) [P]
5. API Compatibility Layer (2-3 tasks)
6. Performance Optimization (2-3 tasks)
7. Integration Testing (3-4 tasks)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations identified - all requirements align with architectural principles*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

**Deliverables Status**:
- [x] research.md created
- [x] data-model.md created
- [x] contracts/ directory with all interface definitions
- [x] quickstart.md with usage examples
- [x] CLAUDE.md agent context file created
- [ ] Contract tests (pending - for /tasks command)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*