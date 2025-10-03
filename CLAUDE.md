# Multi-Language Dependency Linker - Claude Code Context

## Project Overview
Query-based AST analysis library with QueryResultMap-centric architecture. TypeScript-first multi-language AST analysis framework supporting TypeScript, JavaScript, Java, Python, and Go through tree-sitter parsers.

## Current Architecture (v3.0.0)
- **Version**: 3.0.0
- **Language**: TypeScript 5.x, Node.js 18+
- **Architecture**: QueryResultMap-centric with type-safe query system + Namespace integration
- **Dependencies**: tree-sitter with language-specific parsers
- **Testing**: Jest with 157+ passing tests (94 scenario tests, 63+ core tests)
- **Type Safety**: Zero `any` types, complete type inference
- **Namespace System**: Glob-based file organization with batch dependency analysis

## Core Components
```
QueryEngine (central coordinator)
├── QueryResultMap (unified type system)
├── TreeSitterQueryEngine (tree-sitter execution)
├── QueryBridge (parser-query integration)
├── ParserFactory (parser creation)
├── ParserManager (parser caching & high-level APIs)
└── CustomKeyMapper (user-friendly query composition)

Namespace Module (file organization)
├── ConfigManager (namespace configuration)
├── FilePatternMatcher (glob pattern matching)
├── NamespaceDependencyAnalyzer (batch analysis)
├── NamespaceGraphDB (GraphDB integration)
└── CLI (namespace-analyzer tool)
```

## Query-Based Architecture
- **QueryResultMap**: Central type system with language-namespaced queries (ts-*, java-*, python-*)
- **QueryEngine**: Type-safe query execution with automatic inference
- **TreeSitterQueryEngine**: Direct tree-sitter query execution
- **QueryBridge**: Seamless tree-sitter ↔ processor integration
- **CustomKeyMapper**: User-defined key mapping with full type preservation

## Three-Layer Architecture
1. **Parser Layer**: Language detection → AST generation via tree-sitter
2. **Query Layer**: Tree-sitter queries → QueryMatch generation
3. **Processor Layer**: Type-safe result processing → Structured output

## Key Interfaces
- `QueryKey`: Typed query identifier from UnifiedQueryResultMap
- `QueryResult<K>`: Automatically inferred result type for query K
- `QueryExecutionContext`: Execution environment (AST, language, source)
- `CustomKeyMapping`: User-friendly query composition system

## Performance Targets
- Parse: <200ms per file
- Memory: <100MB per session
- Cache hit rate: >80%
- Concurrency: 10 parallel analyses

## Recent Architecture Improvements

### Phase 1: Core System Stabilization
- **Parser Initialization**: Automatic parser registration via `initializeAnalysisSystem()`
- **Type Safety**: Fixed `GraphRelationship.sourceFile` optional field
- **Export Structure**: Cleaned up duplicate exports and resolved naming conflicts
- **Import Paths**: Corrected module import paths (`ParseResult` from `parsers/base`)
- **Test Coverage**: Core parser and query tests at 100% pass rate

### Phase 2: Namespace Integration (2025-10-02)
- **Namespace System**: Integrated namespace-based file organization from deps-cli
- **Batch Analysis**: NamespaceDependencyAnalyzer for analyzing multiple files by namespace
- **CLI Tool**: Complete namespace-analyzer CLI with 9 commands (list, create, delete, analyze, query, cross-namespace)
- **GraphDB Integration**: NamespaceGraphDB for storing namespace-tagged dependency data
- **Glob Patterns**: FilePatternMatcher with include/exclude pattern support
- **Test Results**: 76 files analyzed with 95% feature pass rate (42/44 tests passed)
- **Issue #1 Fixed**: Edge detection working (0 → 153 edges) - file content reading added
- **Issue #2 Fixed**: Safe database re-initialization with IF NOT EXISTS clauses
- **Issue #3 Implemented**: Cross-namespace dependency tracking (27 cross-deps detected)
  - Unified graph analysis with `analyzeAll()` method
  - Database storage with namespace metadata on edges
  - CLI commands for cross-namespace analysis and querying
- **Production Status**: ✅ All issues resolved (Issue #1, #2, #3), system production-ready

### Phase 3: Symbol Dependency Tracking (2025-10-03)
- **Symbol Extraction**: Fine-grained symbol-level dependency tracking for TypeScript/JavaScript
- **Dependency Types**: Call, Instantiation, TypeReference, Extends, Implements
- **Tree-sitter Queries**: 6 new dependency tracking queries added
  - `ts-call-expressions`: Function/method calls including super()
  - `ts-new-expressions`: Class instantiation (new operator)
  - `ts-member-expressions`: Property access patterns
  - `ts-type-references`: Type references in annotations
  - `ts-extends-clause`: Class inheritance
  - `ts-implements-clause`: Interface implementation
- **Multi-Capture Fix**: Fixed tree-sitter query processing to handle multiple captures per match
- **Test Coverage**: 9/9 dependency tracking tests passing with comprehensive validation
- **Production Status**: ✅ Symbol dependency tracking production-ready

### Phase 4: Markdown Dependency Tracking (2025-10-03)
- **Markdown Support**: Complete markdown dependency extraction and analysis system
- **Dependency Types**: Link, Image, WikiLink, SymbolReference, Include, CodeBlockReference, Anchor, Hashtag (8 types)
- **GraphDB Integration**: Markdown edge types with transitive relationship support
- **Pattern Extraction**: Regex-based extraction with front matter and heading structure support
- **Heading Symbols**: Headings as first-class symbols with semantic type tagging
  - Headings stored as `heading-symbol` nodes in GraphDB
  - File path + heading text forms unique symbol identifier
  - Semantic types defined via hashtags: `# API Design #architecture #design`
  - Multiple semantic types supported per heading
  - `md-contains-heading` hierarchical relationship from file to headings
- **Features**:
  - Standard markdown links: `[text](url)`
  - Images: `![alt](url)`
  - Wiki-style links: `[[target]]` or `[[target|text]]`
  - Symbol references: `@ClassName`, `@function()`
  - Code block file references: `` ```language:filepath ``
  - Include directives: `<!-- include:path -->`
  - Internal anchors: `[text](#anchor)`
  - Hashtags: `#tag`, `#태그` (inline tags without spaces)
  - Heading symbols: `# Heading Text #type1 #type2`
- **Test Coverage**: 19/19 markdown dependency tests passing (2 heading symbol tests)
- **Production Status**: ✅ Markdown dependency tracking production-ready with heading symbols and semantic tagging

### Phase 5: Namespace-based Semantic Tags (2025-10-03)
- **Namespace Integration**: Semantic tags automatically assigned based on namespace configuration
- **Configuration System**: Extended `NamespaceConfig` with `semanticTags?: string[]` field
- **Path-based Tagging**: Files matched by namespace patterns receive configured semantic tags
- **Database Integration**: NamespaceGraphDB stores and applies semantic tags during analysis
- **CLI Support**: Both `analyze` and `analyze-all` commands support semantic tag assignment
- **Example Tags**:
  - Source files (`src/**/*.ts`) → `["source", "production"]`
  - Test files (`tests/**/*.ts`) → `["test", "quality-assurance"]`
  - Config files (`*.config.*`) → `["config", "infrastructure"]`
  - Documentation (`docs/**/*.md`) → `["documentation", "knowledge"]`
- **Verification**: 158 nodes analyzed with semantic tags correctly applied across 4 namespaces
- **Production Status**: ✅ Namespace-semantic tags integration production-ready

### Phase 6: Parser Cache Management & Test Isolation (2025-10-04)
- **Parser Lifecycle Analysis**: Comprehensive analysis of parser instance management and caching patterns
  - Identified `globalParserManager` singleton pattern (ParserManager.ts:338)
  - Analyzed TypeScript parser dual-cache system (`tsParser`, `tsxParser`)
  - Documented parser instance reuse across all language parsers
- **Cache Clearing Mechanism**: Implemented systematic cache management for test isolation
  - Added `abstract clearCache(): void` to `BaseParser` interface
  - Implemented `clearCache()` in all parser classes (TypeScript, Java, Python, Go)
  - TypeScriptParser clears both `tsParser` and `tsxParser` instances
  - Other parsers clear single parser instance cache
- **ParserManager Cache Control**: High-level cache management API
  - `clearCache()`: Clears internal cache of all registered parsers
  - `resetParser(language)`: Resets and removes specific language parser
  - Integrated with existing `dispose()` for complete cleanup
- **Test Isolation Strategy**: Jest test environment improvements
  - Added `globalParserManager` import to `tests/setup.ts`
  - Documented manual cache clearing for specific tests
  - Avoided global `afterEach` hook due to concurrent execution issues
  - Tests can opt-in to cache clearing per-suite or per-test basis
- **Test Results**: Individual tests all passing, parser cache mechanism working correctly
- **Usage Pattern**:
  ```typescript
  import { globalParserManager } from '../src/parsers/ParserManager';

  afterEach(() => {
    globalParserManager.clearCache(); // Clear parser state between tests
  });
  ```
- **Production Status**: ✅ Parser cache management production-ready, test isolation improved

### Phase 7: Scenario System - Horizontal Scalability (2025-10-04)
- **Scenario Architecture**: Complete reusable analysis specification system for horizontal scalability
- **Core Components**:
  - ScenarioSpec interface with identity, dependencies, type specs, and analyzer config
  - ScenarioRegistry for registration, validation, and dependency resolution
  - BaseScenarioAnalyzer abstract class with execution lifecycle hooks
  - Global registry with auto-initialization of built-in scenarios
- **Type System**:
  - NodeTypeSpec: Node type definitions (file, class, function, symbol, etc.)
  - EdgeTypeSpec: Relationship types with parent hierarchy, transitivity, inheritance
  - SemanticTagSpec: Contextual classification tags with auto-tagging rules
  - TypeCollection: Aggregated types from extends chain
- **Built-in Scenarios** (4 scenarios):
  - `basic-structure`: File/directory nodes for all languages (foundation)
  - `file-dependency`: Import/require tracking (TypeScript/JavaScript)
  - `symbol-dependency`: Symbol-level dependencies (calls, instantiation, type refs)
  - `markdown-linking`: Markdown link analysis (8 dependency types)
- **Scenario Dependencies**:
  - `extends`: Type inheritance - child inherits all parent types
  - `requires`: Execution order - prerequisite scenarios without type inheritance
  - Topological sort (Kahn's algorithm) for execution order calculation
  - Circular dependency detection for both extends and requires
- **Execution Lifecycle**:
  - beforeAnalyze hook: Pre-analysis setup and validation
  - analyze method: Core scenario-specific analysis logic
  - afterAnalyze hook: Post-processing and result transformation
  - AnalysisContext: Shared data and previous results between scenarios
- **Type Hierarchy Examples**:
  - Edge types: `imports_file` → parent: `depends_on` (transitive)
  - Edge types: `calls` → parent: `uses` (transitive)
  - Hierarchical: `contains` (directory → file), `extends-class` (OOP inheritance)
  - Inheritable: `extends-class` (properties pass through inheritance)
- **Global Registry API**:
  - `globalScenarioRegistry`: Pre-configured with built-ins
  - `getScenario(id)`, `hasScenario(id)`, `listScenarios()`
  - `getExecutionOrder(ids)`: Calculate execution sequence
  - `collectTypes(id)`: Aggregate types from extends chain
  - `validateTypeConsistency()`: Cross-scenario type validation
  - `registerScenario(spec)`: Add custom scenarios with validation
- **Test Coverage**: 94 passing tests across 5 test suites
  - 25 tests: Type validation and circular dependency detection
  - 19 tests: Registry operations and execution order
  - 15 tests: BaseScenarioAnalyzer lifecycle and helpers
  - 16 tests: Built-in scenario specifications
  - 19 tests: Global registry and public API
- **Production Status**: ✅ Complete scenario system production-ready with horizontal scalability

## System Capabilities
- **Multi-Language Support**: TypeScript, TSX, JavaScript, JSX, Java, Python, Go, Markdown
- **Graph Database**: SQLite-based code relationship storage with circular dependency detection
- **Namespace Organization**: Glob-based file grouping with batch dependency analysis and semantic tag assignment
- **Symbol Dependency Tracking**: Fine-grained symbol-level relationships (calls, instantiation, inheritance, type refs)
- **Semantic Tags**: Path-based automatic tagging via namespace configuration for contextual classification
- **Inference System**: Hierarchical, transitive, and inheritable edge type inference
- **Scenario System**: Reusable analysis specifications with type inheritance and execution lifecycle
  - 4 built-in scenarios: basic-structure, file-dependency, symbol-dependency, markdown-linking
  - Scenario composition via extends (type inheritance) and requires (execution order)
  - Global registry with auto-initialization and type consistency validation
  - BaseScenarioAnalyzer with beforeAnalyze/analyze/afterAnalyze hooks
- **Custom Queries**: User-defined key mapping with type-safe execution
- **Performance Tracking**: Built-in metrics and benchmarking
- **Parser Cache Management**: Systematic parser lifecycle and cache control for test isolation
- **CLI Tools**: Single-file analysis and namespace batch operations with semantic tagging
- **Markdown Analysis**: Complete markdown dependency tracking with 8 dependency types (including hashtags)
- **Symbol Tracking**: Fine-grained symbol-level dependency analysis for TypeScript/JavaScript

## Code Quality Status
- **TypeScript**: Strict mode enabled, zero `any` types
- **Type Safety**: Complete type inference throughout query pipeline
- **Build System**: Incremental builds with type checking
- **Linting**: Biome with strict rules
- **Testing**: 157+ passing tests with parser cache management and test isolation improvements
- **Test Isolation**: Parser cache clearing mechanism for independent test execution

## Package Distribution
- **Name**: `@context-action/dependency-linker`
- **Version**: 3.0.0
- **Architecture**: QueryResultMap-centric with type safety + Namespace integration
- **Supported Languages**: TypeScript, JavaScript, Java, Python, Go
- **Module System**: ESM with tree-shaking support
- **CLI Tools**: `analyze-file` (single-file), `namespace-analyzer` (batch operations)

## Key Design Patterns
- **Singleton**: `globalQueryEngine`, `globalParserFactory`, `globalTreeSitterQueryEngine`, `globalParserManager`
- **Factory**: `ParserFactory` for language-specific parser creation
- **Builder**: `DependencyGraphBuilder` for graph construction
- **Strategy**: Query processors for language-specific result processing
- **Template Method**: `BaseParser.clearCache()` abstract method for parser-specific cache management

## Documentation References
- **Type System**: [docs/type-system.md](docs/type-system.md) - Node and Edge type definitions, classification hierarchy, and type registry
- **Semantic Tags Guide**: [docs/semantic-tags.md](docs/semantic-tags.md) - Path-based semantic tagging via namespace configuration
- **Development Guide**: [DEVELOPMENT.md](DEVELOPMENT.md) - Development environment setup and structure
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution workflow and code style

## Documentation Guidelines

### 문서 구조
```
프로젝트 루트/
├── README.md              # 프로젝트 개요 및 Quick Start
├── CLAUDE.md              # AI 개발 컨텍스트 (본 문서)
├── CONTRIBUTING.md        # 기여 가이드 및 워크플로우
├── DEVELOPMENT.md         # 개발 환경 구조 및 설정
└── docs/
    ├── README.md          # 문서 인덱스
    ├── pipeline-overview.md        # 아키텍처: 4단계 파이프라인
    ├── implementation-status.md    # 구현 상태 추적
    ├── type-system.md              # 타입 시스템 설계
    ├── semantic-tags.md            # Semantic Tags 가이드
    ├── API.md                      # API 레퍼런스
    ├── GLOSSARY.md                 # 용어집
    └── [feature-name].md           # 기능별 상세 문서
```

### 문서 작성 규칙

#### 1. 문서 헤더 필수 요소
```markdown
# [문서 제목]

[1-2줄 요약]

## 개요
[배경 및 목적]

## 목차
- [섹션 1](#섹션-1)
- [섹션 2](#섹션-2)

---
*Last Updated: YYYY-MM-DD*
```

#### 2. 코드 블록 규칙
- 언어 명시: ` ```typescript `, ` ```bash `
- 실행 가능한 예제 제공
- 주석으로 설명 추가
- 예상 출력 포함

#### 3. 링크 규칙
- 상대 경로 사용: `[text](../path/to/file.md)`
- 내부 링크: `[section](#section-name)`
- 외부 링크: 전체 URL 명시

#### 4. 섹션 구조
```markdown
## 주제
### 하위 주제
#### 상세 설명

**강조 포인트**:
- 항목 1
- 항목 2

```typescript
// 코드 예제
```

**결과**:
[예상 결과나 출력]
```

### 문서 업데이트 규칙

#### 코드 변경 시 문서 업데이트 필수
1. **API 변경**: API.md 업데이트
2. **타입 추가/수정**: type-system.md 업데이트
3. **새 기능**: 해당 기능 문서 작성
4. **파이프라인 변경**: pipeline-overview.md 업데이트
5. **구현 완료**: implementation-status.md 상태 변경

#### 버전 정보 업데이트
```markdown
---
*Last Updated: YYYY-MM-DD*
*Version: X.Y.Z*
```

#### CLAUDE.md 업데이트 시점
- Phase 완료 시 (Phase N 섹션 추가)
- System Capabilities 변경 시
- 주요 아키텍처 결정 시
- 문서 구조 변경 시

### 문서 검증 체크리스트

#### 새 문서 작성 시
- [ ] 제목과 1-2줄 요약 포함
- [ ] 목차 (섹션이 3개 이상인 경우)
- [ ] 코드 예제에 언어 명시
- [ ] 실행 가능한 예제 제공
- [ ] 관련 문서 링크 추가
- [ ] Last Updated 날짜 표시
- [ ] README.md 또는 docs/README.md에 인덱스 추가

#### 문서 업데이트 시
- [ ] Last Updated 날짜 변경
- [ ] 변경된 코드 예제 검증
- [ ] 깨진 링크 확인
- [ ] 관련 문서 일관성 확인
- [ ] CLAUDE.md 업데이트 필요 여부 확인

#### 문서 품질 기준
- [ ] **정확성**: 코드와 문서 일치
- [ ] **완전성**: 필요한 정보 모두 포함
- [ ] **명확성**: 이해하기 쉬운 설명
- [ ] **실행 가능성**: 예제 코드 동작
- [ ] **최신성**: 현재 구현 반영

### 문서 카테고리별 가이드

#### 아키텍처 문서
- 시스템 전체 그림 제공
- 구성 요소 간 관계 명시
- 설계 결정 배경 설명
- 다이어그램 활용 권장

#### API 문서
- 함수 시그니처 명시
- 파라미터 설명
- 반환값 설명
- 사용 예제 필수
- 에러 케이스 문서화

#### 가이드 문서
- Step-by-step 설명
- 실행 가능한 예제
- 일반적인 문제 해결법
- Best practices 포함

#### 상태 추적 문서
- 명확한 상태 정의 (✅ 완료, ⚠️ 진행중, ❌ 미완료)
- 업데이트 날짜 필수
- 다음 단계 명시

### 문서 유지보수

#### 정기 점검 (월 1회)
1. 깨진 링크 확인
2. 코드 예제 검증
3. 버전 정보 업데이트
4. 더 이상 유효하지 않은 문서 아카이브

#### 즉시 업데이트 필요 시점
- Breaking changes 발생
- 새 기능 추가
- API 변경
- 중요 버그 수정

#### 문서 아카이브
- `docs/archive/` 디렉토리 사용
- 아카이브 사유 README에 기록
- 대체 문서 링크 제공

## Testing Best Practices

### Test Structure Guidelines

#### Test Organization
```
tests/
├── unit/                    # 단위 테스트
├── integration/             # 통합 테스트
├── *.test.ts               # 기능별 테스트
└── setup.ts                # Jest 전역 설정
```

#### Test File Naming
- Unit tests: `[component].test.ts`
- Integration tests: `[feature].integration.test.ts`
- E2E tests: `[workflow].e2e.test.ts`

### Test Isolation Principles

#### Parser Cache Management
```typescript
import { globalParserManager } from '../src/parsers/ParserManager';

describe("Feature Tests", () => {
  // Option 1: Clear after each test
  afterEach(() => {
    globalParserManager.clearCache();
  });

  // Option 2: Clear after all tests
  afterAll(() => {
    globalParserManager.clearCache();
  });

  // Option 3: Reset specific parser
  beforeEach(() => {
    globalParserManager.resetParser('typescript');
  });
});
```

#### When to Clear Parser Cache
- **After Each Test**: Tests that parse the same file multiple times
- **After Test Suite**: Tests that create parser state but don't interfere
- **Before Each Test**: Tests that need fresh parser instances
- **Manual**: Tests with specific parser state requirements

#### Analysis System Initialization
```typescript
import { initializeAnalysisSystem } from '../src/api/analysis';

// ✅ Good: Initialize once per worker
beforeAll(() => {
  initializeAnalysisSystem();
});

// ❌ Bad: Initialize before each test (causes race conditions)
beforeEach(() => {
  initializeAnalysisSystem(); // Don't do this
});
```

### Test Data Management

#### Temporary Files
```typescript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});
```

#### Test Code Samples
```typescript
// ✅ Good: Inline test code
const testCode = `
export class TestClass {
  method(): void {}
}
`;

// ❌ Bad: External file dependencies
const testCode = fs.readFileSync('./fixtures/test.ts'); // Fragile
```

### Jest Configuration Best Practices

#### Test Execution
```javascript
// jest.config.js
{
  testMatch: ["**/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/build/", "/dist/"],

  // Test isolation
  clearMocks: true,
  resetMocks: false,  // Don't reset between tests
  restoreMocks: true,

  // Performance
  maxWorkers: "50%",
  maxConcurrency: 4,

  // Resource management
  forceExit: true,
  detectOpenHandles: true,
  workerIdleMemoryLimit: "200MB",
}
```

#### Setup Files
```javascript
// jest.config.js
{
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
}
```

```typescript
// tests/setup.ts
import { initializeAnalysisSystem } from '../src/api/analysis';

// Global initialization (runs once per worker)
if (!(global as any).__ANALYSIS_SYSTEM_INITIALIZED__) {
  initializeAnalysisSystem();
  (global as any).__ANALYSIS_SYSTEM_INITIALIZED__ = true;
}

// Extend timeout for AST operations
jest.setTimeout(10000);
```

### Test Debugging

#### Verbose Output
```bash
npm test -- --verbose
```

#### Run Specific Test
```bash
npm test -- path/to/test.test.ts
npm test -- -t "test name pattern"
```

#### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

#### Parser State Inspection
```typescript
it("should verify parser state", () => {
  const stats = globalParserManager.getStats();
  console.log("Parser stats:", stats);

  expect(stats.typescript.isActive).toBe(true);
});
```

### Performance Testing

#### Test Timeouts
```typescript
it("should parse within time limit", async () => {
  const start = performance.now();

  await parser.parse(sourceCode);

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(200); // < 200ms
}, 10000); // 10s timeout
```

#### Memory Testing
```typescript
it("should not leak memory", async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < 100; i++) {
    await parser.parse(testCode);
    globalParserManager.clearCache();
  }

  global.gc?.(); // Requires --expose-gc
  const finalMemory = process.memoryUsage().heapUsed;
  const leaked = finalMemory - initialMemory;

  expect(leaked).toBeLessThan(10 * 1024 * 1024); // < 10MB
});
```

### Common Testing Patterns

#### Database Testing
```typescript
import { GraphAnalysisSystem } from '../src/integration/GraphAnalysisSystem';

let db: GraphAnalysisSystem;

beforeEach(async () => {
  db = new GraphAnalysisSystem(':memory:');
  await db.initialize();
});

afterEach(async () => {
  await db.close();
});
```

#### Error Testing
```typescript
it("should handle parsing errors", async () => {
  const invalidCode = "class {";

  await expect(parser.parse(invalidCode))
    .rejects
    .toThrow("Failed to parse TypeScript code");
});
```

#### Snapshot Testing (Use Sparingly)
```typescript
it("should match AST structure", async () => {
  const result = await parser.parse(testCode);

  // Only snapshot stable structures
  expect(result.metadata).toMatchSnapshot({
    parseTime: expect.any(Number), // Exclude volatile fields
  });
});
```

### Testing Checklist

#### Before Committing Tests
- [ ] All tests pass individually
- [ ] All tests pass in suite (`npm test`)
- [ ] No console warnings or errors
- [ ] Parser cache cleared appropriately
- [ ] Temporary files cleaned up
- [ ] No hardcoded paths or dependencies
- [ ] Tests run in < 30s total

#### Test Quality Standards
- [ ] **Isolation**: Tests don't depend on execution order
- [ ] **Clarity**: Test names describe what is tested
- [ ] **Coverage**: Critical paths have tests
- [ ] **Speed**: Fast tests (< 1s each)
- [ ] **Reliability**: No flaky tests
- [ ] **Maintainability**: Easy to update when code changes

## Parser Management Guidelines

### Parser Lifecycle

#### Parser Creation
```typescript
// Automatic via ParserManager (recommended)
const manager = new ParserManager();
const result = await manager.analyzeFile(code, 'typescript');

// Manual creation (for specific use cases)
import { TypeScriptParser } from './parsers/typescript';
const parser = new TypeScriptParser();
```

#### Parser Reuse
```typescript
// ✅ Good: Reuse via ParserManager
const manager = new ParserManager();
await manager.analyzeFile(code1, 'typescript'); // Creates parser
await manager.analyzeFile(code2, 'typescript'); // Reuses parser

// ❌ Bad: Create new parser each time
for (const code of files) {
  const parser = new TypeScriptParser(); // Memory waste
  await parser.parse(code);
}
```

#### Parser Cleanup
```typescript
// In production code
const manager = new ParserManager();
// ... use manager ...
manager.dispose(); // Clean up all parsers

// In tests
afterEach(() => {
  globalParserManager.clearCache(); // Clear parser state
});
```

### Cache Management Strategies

#### Strategy 1: No Cache Clearing (Production)
```typescript
// Production: Maximize performance through caching
const manager = new ParserManager();
for (const file of files) {
  await manager.analyzeFile(file.content, file.language);
}
// Parsers cached throughout entire batch
```

#### Strategy 2: Periodic Cache Clearing (Long-running Services)
```typescript
// Long-running service: Balance performance and memory
const manager = new ParserManager();

setInterval(() => {
  manager.cleanup(300000); // Remove idle parsers (5min)
}, 60000); // Check every minute
```

#### Strategy 3: Full Cache Clearing (Testing)
```typescript
// Testing: Ensure isolation between tests
afterEach(() => {
  globalParserManager.clearCache();
});
```

#### Strategy 4: Language-specific Reset
```typescript
// When changing TypeScript configurations
globalParserManager.resetParser('typescript');
globalParserManager.resetParser('tsx');
```

### Performance Optimization

#### Batch Processing
```typescript
// ✅ Good: Batch with single manager
const manager = new ParserManager();
const results = await manager.analyzeFiles(files);

// ❌ Bad: Sequential with new managers
for (const file of files) {
  const manager = new ParserManager(); // Creates new parsers each time
  await manager.analyzeFile(file.content, file.language);
}
```

#### Parallel Analysis
```typescript
// Parallel analysis with shared manager
const manager = new ParserManager();
const results = await Promise.all(
  files.map(file =>
    manager.analyzeFile(file.content, file.language)
  )
);
```

#### Memory Monitoring
```typescript
const stats = manager.getStats();

console.log(`TypeScript parser:
  Files processed: ${stats.typescript.filesProcessed}
  Avg parse time: ${stats.typescript.avgParseTime}ms
  Last used: ${stats.typescript.lastUsed}
  Active: ${stats.typescript.isActive}
`);
```

### Error Handling

#### Parser Errors
```typescript
try {
  const result = await parser.parse(sourceCode);
} catch (error) {
  if (error.message.includes('No tree or rootNode')) {
    // Parser state issue - try clearing cache
    globalParserManager.clearCache();
    const result = await parser.parse(sourceCode);
  } else {
    throw error;
  }
}
```

#### Graceful Degradation
```typescript
async function analyzeWithFallback(code: string) {
  try {
    return await manager.analyzeFile(code, 'typescript');
  } catch (error) {
    console.warn('TypeScript parsing failed, trying JavaScript:', error);
    return await manager.analyzeFile(code, 'javascript');
  }
}
```

---
*Updated - 2025-10-04*