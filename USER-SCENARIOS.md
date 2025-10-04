# User Scenarios

**Version**: 1.0.0
**Last Updated**: 2025-10-05

사용자 관점에서 Dependency Linker의 주요 사용 시나리오를 설명합니다.

---

## 시나리오 개요

| # | 시나리오 | 목적 | 난이도 | 소요 시간 |
|---|---------|------|--------|----------|
| 1 | [프로젝트 초기 분석](#시나리오-1-프로젝트-초기-분석) | 전체 의존성 파악 | ⭐ 쉬움 | 5분 |
| 2 | [특정 파일 의존성 추적](#시나리오-2-특정-파일-의존성-추적) | 파일별 상세 분석 | ⭐⭐ 보통 | 3분 |
| 3 | [네임스페이스 생성 및 관리](#시나리오-3-네임스페이스-생성-및-관리) | 코드 조직화 | ⭐⭐ 보통 | 10분 |
| 4 | [크로스 네임스페이스 분석](#시나리오-4-크로스-네임스페이스-분석) | 경계 넘는 의존성 확인 | ⭐⭐ 보통 | 5분 |
| 5 | [LLM 컨텍스트 문서 생성](#시나리오-5-llm-컨텍스트-문서-생성) | AI 도구 통합 | ⭐ 쉬움 | 7분 |
| 6 | [단일 파일 증분 분석](#시나리오-6-단일-파일-증분-분석) | 빠른 재분석 | ⭐⭐⭐ 고급 | 2분 |
| 7 | [시나리오 기반 맞춤 분석](#시나리오-7-시나리오-기반-맞춤-분석) | 최적화된 분석 | ⭐⭐⭐ 고급 | 15분 |

---

## 시나리오 1: 프로젝트 초기 분석

### 목적
새 프로젝트에 Dependency Linker를 적용하여 전체 코드베이스의 의존성 구조를 파악합니다.

### 사전 요구사항
- Node.js 18+ 설치
- 프로젝트 빌드 완료 (`npm run build`)

### 단계별 실행

#### Step 1: 네임스페이스 확인
```bash
node dist/cli/namespace-analyzer.js list-namespaces
```

**예상 출력**:
```
📋 Configured Namespaces:
  ✓ source (41 files) - Production source code
  ✓ tests (28 files) - Test files
  ✓ docs (12 files) - Documentation
  ✓ configs (4 files) - Configuration files
```

#### Step 2: 전체 의존성 분석
```bash
node dist/cli/namespace-analyzer.js analyze-all
```

**예상 출력**:
```
🚀 Analyzing all namespaces...
  ✓ source: 41 files → 95 nodes, 153 edges
  ✓ tests: 28 files → 42 nodes, 68 edges
  ✓ docs: 12 files → 15 nodes, 22 edges
  ✓ configs: 4 files → 5 nodes, 3 edges

📊 Total: 157 nodes, 246 edges
💾 Saved to: .dependency-linker/graph.db
```

#### Step 3: 크로스 네임스페이스 의존성 확인
```bash
node dist/cli/namespace-analyzer.js cross-namespace --detailed
```

**예상 출력**:
```
🔗 Cross-Namespace Dependencies:

tests → source: 22 dependencies
  src/database/GraphDatabase.ts ← tests/database/graph-analysis.test.ts
  src/namespace/ConfigManager.ts ← tests/namespace-config.test.ts
  ...

docs → source: 3 dependencies
  src/api/analysis.ts ← docs/api-reference.md
  ...
```

#### Step 4: 컨텍스트 문서 생성
```bash
node dist/cli/namespace-analyzer.js generate-context-all
```

**예상 출력**:
```
📄 Generating context documents...
  ✓ src/database/GraphDatabase.ts → .dependency-linker/context/files/src/database/GraphDatabase.md
  ✓ src/namespace/ConfigManager.ts → .dependency-linker/context/files/src/namespace/ConfigManager.md
  ...

📊 Generated: 85 file contexts
💾 Saved to: .dependency-linker/context/files/
```

### 결과 활용
- **GraphDB**: `.dependency-linker/graph.db`에서 SQL 쿼리 가능
- **컨텍스트 문서**: `.dependency-linker/context/files/`에서 LLM 컨텍스트 제공
- **시각화**: 의존성 그래프 데이터를 외부 도구로 시각화

### 다음 단계
- [시나리오 4](#시나리오-4-크로스-네임스페이스-분석): 크로스 네임스페이스 의존성 상세 분석
- [시나리오 5](#시나리오-5-llm-컨텍스트-문서-생성): 생성된 컨텍스트 문서 활용

---

## 시나리오 2: 특정 파일 의존성 추적

### 목적
특정 파일의 의존성을 상세히 분석하여 영향 범위를 파악합니다.

### 사용 사례
- 리팩토링 전 영향 분석
- 순환 의존성 탐지
- 의존성 깊이 확인

### 단계별 실행

#### Step 1: 파일이 속한 네임스페이스 분석
```bash
node dist/cli/namespace-analyzer.js analyze source
```

#### Step 2: 특정 파일 컨텍스트 생성
```bash
node dist/cli/namespace-analyzer.js generate-context src/database/GraphDatabase.ts
```

**예상 출력**:
```
📄 Generating context for: src/database/GraphDatabase.ts

✓ File context created
  Location: .dependency-linker/context/files/src/database/GraphDatabase.md

📊 Dependencies:
  Imports: 8 files
  Exported symbols: 12
  Used by: 24 files
```

**생성된 문서 예시** (`.dependency-linker/context/files/src/database/GraphDatabase.md`):
```markdown
# GraphDatabase.ts

## 파일 정보
- **경로**: src/database/GraphDatabase.ts
- **타입**: file
- **언어**: TypeScript

## 의존성
### Imports (8)
- better-sqlite3
- ../types/graph
- ./services/FileDependencyAnalyzer
...

### Exported Symbols (12)
- GraphDatabase (class)
- NodeQuery (interface)
...

## 사용처 (24)
- tests/database/graph-analysis.test.ts
- src/namespace/NamespaceGraphDB.ts
...
```

#### Step 3: 의존성 쿼리
```bash
node dist/cli/namespace-analyzer.js query source
```

**예상 출력**:
```
🔍 Querying namespace: source

📊 Dependency Statistics:
  Total files: 41
  Total dependencies: 153
  Circular dependencies: 2
  Max depth: 5

⚠️ Circular Dependencies:
  1. src/database/GraphDatabase.ts ↔ src/database/services/FileDependencyAnalyzer.ts
  2. src/namespace/ConfigManager.ts ↔ src/namespace/FilePatternMatcher.ts
```

### 고급 쿼리 (프로그래매틱 API)

```typescript
import { analyzeSingleFile } from './src/api/analysis';

const result = await analyzeSingleFile({
  filePath: '/src/database/GraphDatabase.ts',
  language: 'typescript',
  dbPath: '.dependency-linker/graph.db'
});

console.log('Dependencies:', result.dependencies);
console.log('Circular deps:', result.circularDependencies);
```

### 결과 활용
- **리팩토링 계획**: 순환 의존성 제거 우선순위 결정
- **영향 분석**: 변경 시 영향받는 파일 목록 확보
- **코드 리뷰**: 의존성 복잡도 기반 리뷰 우선순위

---

## 시나리오 3: 네임스페이스 생성 및 관리

### 목적
프로젝트를 목적별로 조직화하여 분리된 분석을 수행합니다.

### 사용 사례
- 모노레포 패키지별 분석
- 레이어드 아키텍처 경계 관리
- 도메인별 코드 분리

### 단계별 실행

#### Step 1: 새 네임스페이스 생성
```bash
node dist/cli/namespace-analyzer.js create-namespace integration-tests \
  --patterns "tests/integration/**/*" \
  --description "Integration test files" \
  --tags "test,integration"
```

**예상 출력**:
```
✓ Namespace 'integration-tests' created successfully

📋 Configuration:
  Name: integration-tests
  Patterns: ["tests/integration/**/*"]
  Description: Integration test files
  Tags: ["test", "integration"]

💾 Updated: deps.config.json
```

#### Step 2: 생성된 네임스페이스 확인
```bash
node dist/cli/namespace-analyzer.js list-files integration-tests
```

**예상 출력**:
```
📁 Files in namespace 'integration-tests':

  tests/integration/
  ✓ SingleFileAnalysis.test.ts
  ✓ incremental-analysis.test.ts

📊 Total: 2 files
```

#### Step 3: 네임스페이스 분석
```bash
node dist/cli/namespace-analyzer.js analyze integration-tests
```

**예상 출력**:
```
🚀 Analyzing namespace: integration-tests

📊 Analysis Results:
  Files: 2
  Nodes: 15
  Edges: 8

💾 Saved to: .dependency-linker/graph.db
```

### deps.config.json 예시

```json
{
  "namespaces": {
    "source": {
      "filePatterns": ["src/**/*.ts"],
      "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"],
      "description": "Production source code",
      "semanticTags": ["source", "production"]
    },
    "integration-tests": {
      "filePatterns": ["tests/integration/**/*"],
      "description": "Integration test files",
      "semanticTags": ["test", "integration"],
      "scenarios": ["basic-structure", "file-dependency"]
    }
  }
}
```

### 네임스페이스 삭제

```bash
node dist/cli/namespace-analyzer.js delete-namespace integration-tests
```

### 결과 활용
- **아키텍처 검증**: 계층 간 의존성 규칙 강제
- **모듈화 측정**: 네임스페이스별 결합도 분석
- **팀별 분리**: 팀 소유 코드 영역 명확화

---

## 시나리오 4: 크로스 네임스페이스 분석

### 목적
네임스페이스 경계를 넘는 의존성을 추적하여 아키텍처 규칙을 검증합니다.

### 사용 사례
- 레이어드 아키텍처 검증
- 테스트 커버리지 분석
- 순환 의존성 탐지

### 단계별 실행

#### Step 1: 전체 분석 (필요시)
```bash
node dist/cli/namespace-analyzer.js analyze-all
```

#### Step 2: 크로스 네임스페이스 의존성 조회
```bash
node dist/cli/namespace-analyzer.js cross-namespace
```

**예상 출력**:
```
🔗 Cross-Namespace Dependencies Summary:

tests → source: 22 dependencies
docs → source: 3 dependencies
configs → source: 0 dependencies
source → tests: 0 dependencies ✓ (No reverse dependency)
```

#### Step 3: 상세 정보 조회
```bash
node dist/cli/namespace-analyzer.js cross-namespace --detailed
```

**예상 출력**:
```
🔗 Cross-Namespace Dependencies (Detailed):

tests → source (22 dependencies):
  ✓ src/database/GraphDatabase.ts
    ← tests/database/graph-analysis.test.ts
    ← tests/database/circular-dependency.test.ts
    ← tests/database/edge-type-workflows.test.ts

  ✓ src/namespace/ConfigManager.ts
    ← tests/namespace-config.test.ts
    ← tests/namespace-scenario-integration.test.ts

docs → source (3 dependencies):
  ✓ src/api/analysis.ts
    ← docs/api-reference.md
```

### 아키텍처 규칙 검증

**허용된 의존성**:
```
tests → source  ✓
docs → source   ✓
```

**금지된 의존성**:
```
source → tests  ✗ (테스트 코드에 의존하면 안됨)
source → docs   ✗ (문서에 의존하면 안됨)
```

### 프로그래매틱 검증

```typescript
import { NamespaceGraphDB } from './src/namespace/NamespaceGraphDB';

const graphDB = new NamespaceGraphDB('.dependency-linker/graph.db');
const crossDeps = await graphDB.getCrossNamespaceDependencies();

// 금지된 의존성 체크
const violations = crossDeps.filter(dep =>
  (dep.from === 'source' && dep.to === 'tests') ||
  (dep.from === 'source' && dep.to === 'docs')
);

if (violations.length > 0) {
  console.error('❌ Architecture violations:', violations);
  process.exit(1);
}
```

### 결과 활용
- **CI/CD 통합**: 아키텍처 규칙 자동 검증
- **리팩토링 가이드**: 의존성 제거 우선순위 결정
- **문서화**: 실제 의존성 구조 문서화

---

## 시나리오 5: LLM 컨텍스트 문서 생성

### 목적
AI 도구(Claude, ChatGPT 등)에 제공할 코드베이스 컨텍스트를 자동 생성합니다.

### 사용 사례
- AI 코드 리뷰
- AI 기반 리팩토링
- 신규 개발자 온보딩

### 단계별 실행

#### Step 1: 전체 컨텍스트 생성
```bash
node dist/cli/namespace-analyzer.js generate-context-all
```

**예상 출력**:
```
📄 Generating context documents for all files...

source namespace (41 files):
  ✓ src/database/GraphDatabase.ts
  ✓ src/namespace/ConfigManager.ts
  ...

tests namespace (28 files):
  ✓ tests/database/graph-analysis.test.ts
  ...

📊 Summary:
  Total files: 85
  Context documents: 85
  Storage: .dependency-linker/context/files/

💾 Total size: 2.3 MB
```

#### Step 2: 특정 파일 컨텍스트 생성
```bash
node dist/cli/namespace-analyzer.js generate-context src/database/GraphDatabase.ts
```

#### Step 3: 생성된 컨텍스트 목록 확인
```bash
node dist/cli/namespace-analyzer.js list-context
```

**예상 출력**:
```
📋 Available Context Documents:

.dependency-linker/context/files/
├── src/
│   ├── database/
│   │   ├── GraphDatabase.md (12 KB)
│   │   ├── services/
│   │   │   └── FileDependencyAnalyzer.md (8 KB)
│   └── namespace/
│       └── ConfigManager.md (5 KB)
└── tests/
    └── database/
        └── graph-analysis.test.md (6 KB)

📊 Total: 85 documents (2.3 MB)
```

### 생성된 컨텍스트 문서 구조

```markdown
# GraphDatabase.ts

## 파일 정보
- **경로**: src/database/GraphDatabase.ts
- **타입**: file
- **언어**: TypeScript
- **RDF 주소**: dependency-linker/src/database/GraphDatabase.ts#File:GraphDatabase.ts

## 의존성

### Imports (8)
- `better-sqlite3` (library)
- `../types/graph` (relative)
- `./services/FileDependencyAnalyzer` (relative)

### Exports (12)
- `GraphDatabase` (class) - Main database interface
- `NodeQuery` (interface) - Query parameters for nodes
- `RelationshipQuery` (interface) - Query parameters for relationships

### Dependencies (5 files)
1. src/types/graph.ts
2. src/database/services/FileDependencyAnalyzer.ts
3. src/database/inference/EdgeTypeRegistry.ts

## 사용처 (24 files)
1. tests/database/graph-analysis.test.ts
2. src/namespace/NamespaceGraphDB.ts
...

## 심볼 정보

### Class: GraphDatabase
- **메서드**: initialize(), upsertNode(), findNodes(), upsertRelationship()
- **역할**: SQLite 기반 의존성 그래프 저장 및 쿼리

## 메타데이터
- **생성일**: 2025-10-05
- **Namespace**: source
- **Semantic Tags**: ["source", "production", "database"]
```

### LLM 프롬프트 예시

```
다음 파일의 리팩토링을 도와주세요:

[Context]
{.dependency-linker/context/files/src/database/GraphDatabase.md 내용}

[Task]
- GraphDatabase 클래스를 여러 작은 클래스로 분리
- 순환 의존성 제거
- 테스트 커버리지 향상 방안 제시

[Constraints]
- 사용처 24곳에 영향 최소화
- 하위 호환성 유지
```

### 결과 활용
- **AI 코드 리뷰**: 컨텍스트 기반 정확한 리뷰
- **자동 문서화**: 의존성 포함 API 문서
- **온보딩**: 신규 개발자용 코드베이스 가이드

---

## 시나리오 6: 단일 파일 증분 분석

### 목적
파일 변경 시 전체 재분석 없이 해당 파일만 빠르게 재분석합니다.

### 사용 사례
- 개발 중 실시간 의존성 추적
- CI/CD 파이프라인 최적화
- 대규모 프로젝트 성능 개선

### 단계별 실행

#### Step 1: 초기 전체 분석
```bash
node dist/cli/namespace-analyzer.js analyze-all
```

#### Step 2: 파일 변경 후 단일 파일 분석

**프로그래매틱 API 사용**:

```typescript
import { analyzeSingleFile } from './src/api/analysis';

// 변경된 파일만 재분석
const result = await analyzeSingleFile({
  filePath: '/Users/project/src/database/GraphDatabase.ts',
  language: 'typescript',
  dbPath: '.dependency-linker/graph.db',
  projectRoot: '/Users/project'
});

console.log('✓ Updated in:', result.analysisTime, 'ms');
console.log('Dependencies:', result.dependencies.length);
console.log('Changes detected:', result.changesDetected);
```

**예상 출력**:
```
✓ Updated in: 85 ms
Dependencies: 8
Changes detected: {
  added: ['./services/NewAnalyzer'],
  removed: ['./services/OldAnalyzer'],
  modified: []
}
```

#### Step 3: Watch 모드 구현 (예시)

```typescript
import { watch } from 'chokidar';
import { analyzeSingleFile } from './src/api/analysis';

const watcher = watch('src/**/*.ts', {
  ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  persistent: true
});

watcher.on('change', async (filePath) => {
  console.log(`📝 File changed: ${filePath}`);

  try {
    const result = await analyzeSingleFile({
      filePath,
      language: 'typescript',
      dbPath: '.dependency-linker/graph.db'
    });

    console.log(`✓ Analysis updated (${result.analysisTime}ms)`);
  } catch (error) {
    console.error(`❌ Analysis failed:`, error);
  }
});

console.log('👀 Watching for file changes...');
```

### 성능 비교

| 분석 방식 | 파일 수 | 소요 시간 | 사용 사례 |
|----------|--------|----------|----------|
| 전체 분석 | 85 | ~3.5초 | 초기 분석, 대규모 변경 |
| 단일 파일 | 1 | ~85ms | 개발 중, 소규모 변경 |
| 증분 분석 (10개) | 10 | ~500ms | CI/CD, 중규모 변경 |

### 결과 활용
- **실시간 피드백**: 저장 시 즉시 의존성 업데이트
- **빠른 CI/CD**: 변경된 파일만 재분석
- **대규모 프로젝트**: 성능 병목 제거

---

## 시나리오 7: 시나리오 기반 맞춤 분석

### 목적
프로젝트 특성에 맞는 최적화된 분석을 수행하여 비용과 시간을 절감합니다.

### 사용 사례
- 모노레포에서 패키지별 다른 분석
- 프론트엔드/백엔드 분리 분석
- 문서 전용 경량 분석

### 사전 지식
- [Scenario System](./features/scenario-system/) 이해
- [Namespace-Scenario Integration](./features/namespace-scenario-integration/) 이해

### 단계별 실행

#### Step 1: 사용 가능한 시나리오 확인
```bash
node dist/cli/namespace-analyzer.js scenarios
```

**예상 출력**:
```
📋 Available Scenarios:

1. basic-structure (Foundation)
   - Extracts: file, directory nodes
   - Use case: All projects

2. file-dependency (File-level analysis)
   - Extracts: imports/exports, file relationships
   - Use case: TypeScript/JavaScript projects

3. symbol-dependency (Symbol-level analysis)
   - Extracts: function calls, class usage
   - Use case: Detailed analysis

4. markdown-linking (Documentation analysis)
   - Extracts: markdown links, wiki links
   - Use case: Documentation projects
```

#### Step 2: deps.config.json 설정

```json
{
  "namespaces": {
    "frontend": {
      "filePatterns": ["packages/web/src/**/*.tsx"],
      "description": "React web application",
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"],
      "scenarioConfig": {
        "symbol-dependency": {
          "trackMethodCalls": true,
          "trackFieldAccess": true
        }
      },
      "semanticTags": ["frontend", "react", "web"]
    },

    "backend": {
      "filePatterns": ["packages/api/src/**/*.ts"],
      "excludePatterns": ["**/*.spec.ts"],
      "description": "NestJS API server",
      "scenarios": ["basic-structure", "file-dependency"],
      "semanticTags": ["backend", "api", "nestjs"]
    },

    "documentation": {
      "filePatterns": ["docs/**/*.md"],
      "description": "Project documentation",
      "scenarios": ["markdown-linking"],
      "semanticTags": ["documentation"]
    }
  }
}
```

#### Step 3: 시나리오 기반 분석 실행

**Frontend (상세 분석)**:
```bash
node dist/cli/namespace-analyzer.js analyze frontend
```

**예상 출력**:
```
🚀 Analyzing namespace: frontend

🎯 Scenarios: basic-structure → file-dependency → symbol-dependency

🔄 Executing scenario: Basic Code Structure Extraction
  ✓ App.tsx (class: 1, function: 3)
  ✓ Button.tsx (class: 1, function: 1)
  ... (42 files)

🔄 Executing scenario: File-level Dependency Analysis
  ✓ App.tsx (imports: 5, exports: 1)
  ✓ Button.tsx (imports: 2, exports: 1)
  ... (42 files)

🔄 Executing scenario: Symbol-level Dependency Analysis
  ✓ App.tsx (calls: 12, accesses: 5)
  ✓ Button.tsx (calls: 3, accesses: 2)
  ... (42 files)

🏷️  Applying semantic tags: [frontend, react, web]

📊 Analysis Complete:
  ✓ 42/42 files analyzed
  📈 Graph: 156 nodes, 287 edges
  🔗 Circular dependencies: 0
  ⏱️  Duration: 2.3s
```

**Documentation (경량 분석)**:
```bash
node dist/cli/namespace-analyzer.js analyze documentation
```

**예상 출력**:
```
🚀 Analyzing namespace: documentation

🎯 Scenarios: markdown-linking

🔄 Executing scenario: Markdown Link Analysis
  ✓ README.md (links: 8)
  ✓ api-reference.md (links: 12)
  ... (15 files)

📊 Analysis Complete:
  ✓ 15/15 files analyzed
  📈 Graph: 23 nodes, 34 edges
  ⏱️  Duration: 0.4s
```

### 시나리오 오버라이드

**CLI에서 시나리오 선택**:
```bash
# 기본 시나리오 대신 특정 시나리오만 실행
node dist/cli/namespace-analyzer.js analyze frontend \
  --scenarios basic-structure,file-dependency
```

**시나리오 설정 오버라이드**:
```bash
node dist/cli/namespace-analyzer.js analyze frontend \
  --scenario-config '{"symbol-dependency":{"trackMethodCalls":false}}'
```

### 특정 네임스페이스의 시나리오 확인

```bash
node dist/cli/namespace-analyzer.js scenarios frontend
```

**예상 출력**:
```
📋 Scenarios for namespace: frontend

Configured scenarios:
1. basic-structure (extends: none)
2. file-dependency (extends: basic-structure)
3. symbol-dependency (extends: basic-structure, file-dependency)

Execution order:
  basic-structure → file-dependency → symbol-dependency

Configuration:
  symbol-dependency:
    trackMethodCalls: true
    trackFieldAccess: true
```

### 성능 및 비용 비교

| Namespace | Scenarios | Files | Time | Graph Size |
|-----------|-----------|-------|------|------------|
| frontend | 3 scenarios | 42 | 2.3s | 156 nodes, 287 edges |
| backend | 2 scenarios | 35 | 1.1s | 98 nodes, 145 edges |
| documentation | 1 scenario | 15 | 0.4s | 23 nodes, 34 edges |
| **Total** | - | 92 | **3.8s** | **277 nodes, 466 edges** |

**전체 분석 비교** (모든 파일에 3 scenarios 적용):
- 시간: 6.5s (70% 증가)
- 노드: 412 nodes (49% 증가)
- **비용**: 불필요한 문서 심볼 분석

### 결과 활용
- **비용 최적화**: 필요한 분석만 실행
- **맥락 기반**: 같은 파일도 네임스페이스에 따라 다르게 분석
- **확장성**: 새 시나리오 추가 시 설정만 변경

---

## 부록

### A. 자주 사용하는 명령어

```bash
# 초기 설정
npm run build
node dist/cli/namespace-analyzer.js list-namespaces

# 일상 작업
node dist/cli/namespace-analyzer.js analyze-all
node dist/cli/namespace-analyzer.js cross-namespace --detailed
node dist/cli/namespace-analyzer.js generate-context src/path/to/file.ts

# 네임스페이스 관리
node dist/cli/namespace-analyzer.js create-namespace <name> --patterns "<glob>"
node dist/cli/namespace-analyzer.js list-files <namespace>
node dist/cli/namespace-analyzer.js analyze <namespace>

# 시나리오 관리
node dist/cli/namespace-analyzer.js scenarios
node dist/cli/namespace-analyzer.js scenarios <namespace>
node dist/cli/namespace-analyzer.js analyze <namespace> --scenarios <list>
```

### B. 디렉토리 구조

```
프로젝트 루트/
├── .dependency-linker/          # 분석 결과 저장
│   ├── graph.db                 # SQLite 의존성 그래프
│   └── context/
│       └── files/               # 파일별 컨텍스트 문서
│           └── src/
│               └── database/
│                   └── GraphDatabase.md
├── deps.config.json             # 네임스페이스 설정
├── src/                         # 소스 코드
├── tests/                       # 테스트 코드
└── docs/                        # 문서
```

### C. API 레퍼런스

**단일 파일 분석**:
```typescript
import { analyzeSingleFile } from './src/api/analysis';

const result = await analyzeSingleFile({
  filePath: '/absolute/path/to/file.ts',
  language: 'typescript',
  dbPath: '.dependency-linker/graph.db',
  projectRoot: '/absolute/path/to/project'
});
```

**네임스페이스 쿼리**:
```typescript
import { NamespaceGraphDB } from './src/namespace/NamespaceGraphDB';

const graphDB = new NamespaceGraphDB('.dependency-linker/graph.db');
const crossDeps = await graphDB.getCrossNamespaceDependencies();
```

### D. 문제 해결

**Q: 분석이 너무 느림**
- A: 시나리오를 최소화하거나 excludePatterns 활용

**Q: 순환 의존성 탐지 안됨**
- A: `analyze-all` 후 `cross-namespace --detailed` 실행

**Q: 컨텍스트 문서가 생성되지 않음**
- A: 먼저 `analyze-all` 실행 필요

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
