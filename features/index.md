# Dependency Linker - Features Overview

**Version**: 3.0.0
**Last Updated**: 2025-10-02

---

## 🎯 Big Picture

Dependency Linker는 멀티 언어 AST 분석 프레임워크로, TypeScript/JavaScript, Java, Python, Go를 지원하며 다음 핵심 기능을 제공합니다:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dependency Linker                             │
│                                                                   │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Source Code  │  │  GraphDB     │  │  Context Docs    │     │
│  │  (Multi-Lang) │─▶│  (SQLite)    │─▶│  (Markdown)      │     │
│  └───────────────┘  └──────────────┘  └──────────────────┘     │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌───────────────────────────────────────────────────────┐      │
│  │           Namespace Organization                       │      │
│  │  • source  • tests  • docs  • configs                 │      │
│  └───────────────────────────────────────────────────────┘      │
│         │                                                         │
│         ▼                                                         │
│  ┌───────────────────────────────────────────────────────┐      │
│  │         Cross-Namespace Dependencies                   │      │
│  │  tests → source: 22 deps                              │      │
│  │  docs → source: 3 deps                                │      │
│  └───────────────────────────────────────────────────────┘      │
│         │                                                         │
│         ▼                                                         │
│  ┌───────────────────────────────────────────────────────┐      │
│  │           Inference & Context System                   │      │
│  │  • File-level context documents                       │      │
│  │  • Symbol-level context documents                     │      │
│  │  • Dependency-aware LLM context                       │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 시스템 확장 철학

dependency-linker는 **명세 기반 수평 확장(Specification-Based Horizontal Scaling)**을 따릅니다:

### 두 가지 확장 레이어

#### 1. **Scenario System** (분석 레이어)
**목적**: 분석 방법을 명세(Spec)로 정의하여 수평적 확장
```typescript
// 분석 방법 = Spec 작성 (코드 변경 없음)
new ScenarioSpec({
  id: "symbol-dependency",
  nodeTypes: ["class", "function", "method"],
  edgeTypes: ["calls", "instantiates"]
})
```

**확장 방식**:
- 새 분석 = 새 ScenarioSpec 등록
- Namespace가 scenarios 선택 → 다양한 분석 조합 실현

#### 2. **features/** (구성 레이어)
**목적**: 시스템 구성 요소(심볼 파싱, 추론 엔진 등)를 모듈로 정의하여 수평적 업데이트

```markdown
features/rdf-addressing/
├── README.md        # 심볼 식별 체계 모듈 명세
│   ├─ 구성 요소: RDF 주소 형식, NodeIdentifier
│   ├─ 통합 포인트: STORAGE 단계 (2.1)
│   └─ 시스템 영향: NodeContext, Analyzer들
└── todos.md         # Phase별 통합 태스크
```

**확장 방식**:
- 새 구성 = features/[module-name]/ 명세 작성
- PIPELINE_INTEGRATION.md에 통합 계획 수립
- 명세대로 시스템 구성 업데이트 (코드 변경 최소화)

### 핵심 원칙

> **"코드 변경이 아닌, 명세 추가로 시스템을 확장한다"**

- **Scenario System**: 분석 방법 추가 = ScenarioSpec 추가
- **features/**: 구성 요소 업데이트 = 모듈 명세 + 통합 계획 추가
- **공통점**: 기존 시스템 안정성 유지, 점진적 확장

### 시스템 구성 업데이트 프로세스

```
1. 구성 변경 필요성 식별
   ↓ (예: "RDF 주소로 심볼 식별 필요")
2. features/ 모듈 명세 작성
   ↓ (README.md + todos.md)
3. PIPELINE_INTEGRATION.md 업데이트
   ↓ (4단계 파이프라인 통합 계획)
4. 수평적 시스템 업데이트
   ↓ (명세대로 구현)
5. features/index.md 상태 업데이트
```

---

## 🗂️ Feature Categories

> 아래 목록은 **시스템 구성 모듈**들입니다. 각 모듈은 심볼 파싱, 저장, 분석, 추론 등 시스템 구성 요소를 정의합니다.

### 1. [Dependency Analysis](./dependency-analysis/)
**핵심**: 프로젝트 전체 또는 특정 네임스페이스의 의존성 분석

**CLI Commands**:
- `npm run cli -- analyze` - 파일 패턴 기반 의존성 분석
- `npm run cli -- namespace --name <name>` - 특정 네임스페이스 분석
- `npm run cli -- namespace --all` - 모든 네임스페이스 통합 분석

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#analyze`](../../src/cli/main.ts#L50-L93) - Commander.js 기반 CLI 명령어
- **Handler**: [`src/cli/handlers/typescript-handler.ts#runTypeScriptProjectAnalysis`](../../src/cli/handlers/typescript-handler.ts#L24-L33) - TypeScript 프로젝트 분석 실행
- **Core Logic**: [`src/namespace/analysis-namespace.ts#runNamespaceAnalysis`](../../src/namespace/analysis-namespace.ts#L745-L758) - 네임스페이스 분석 실행
- **Graph Builder**: [`src/graph/DependencyGraphBuilder.ts`](../../src/graph/DependencyGraphBuilder.ts) - 의존성 그래프 구성

**Output**: SQLite GraphDB (`.dependency-linker/graph.db`)

**Use Cases**:
- 파일 간 의존성 추적
- 순환 의존성 탐지
- 의존성 그래프 시각화 준비

---

### 2. [Namespace Management](./namespace-management/)
**핵심**: 코드를 목적별로 조직화하고 관리

**CLI Commands**:
- `npm run cli -- namespace --list` - 네임스페이스 목록 조회
- `npm run cli -- namespace --name <name>` - 특정 네임스페이스 실행
- `npm run cli -- namespace --all` - 모든 네임스페이스 실행
- `npm run cli -- namespace --optimize` - 네임스페이스 최적화 (개발 중)

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#namespace`](../../src/cli/main.ts#L218-L252) - 네임스페이스 관리 명령어
- **Core Logic**: [`src/namespace/analysis-namespace.ts#runNamespaceAnalysis`](../../src/namespace/analysis-namespace.ts#L745-L758) - 네임스페이스 분석 실행
- **Config Manager**: [`src/namespace/ConfigManager.ts`](../../src/namespace/ConfigManager.ts) - 네임스페이스 설정 관리
- **Namespace Optimizer**: [`src/cli/namespace-optimizer.ts`](../../src/cli/namespace-optimizer.ts) - 네임스페이스 최적화 (개발 중)

**Configuration**: `deps.config.json`

**Use Cases**:
- 소스 코드와 테스트 분리
- 문서와 설정 파일 격리
- 도메인별 코드 조직화

---

### 3. [Cross-Namespace Dependencies](./cross-namespace/)
**핵심**: 네임스페이스 경계를 넘는 의존성 추적

**CLI Commands**:
- `npm run cli -- namespace --all` - 모든 네임스페이스 분석 후 크로스 의존성 자동 탐지
- `npm run cli -- namespace --name <name>` - 특정 네임스페이스 분석

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#namespace`](../../src/cli/main.ts#L218-L252) - 네임스페이스 명령어
- **Core Logic**: [`src/namespace/NamespaceDependencyAnalyzer.ts#analyzeAll`](../../src/namespace/NamespaceDependencyAnalyzer.ts) - 크로스 네임스페이스 의존성 탐지
- **Database**: [`src/namespace/NamespaceGraphDB.ts#getCrossNamespaceDependencies`](../../src/namespace/NamespaceGraphDB.ts) - 크로스 의존성 조회
- **Analysis**: [`src/namespace/analysis-namespace.ts#runNamespaceAnalysis`](../../src/namespace/analysis-namespace.ts#L745-L758) - 분석 실행

**Key Insight**:
> 네임스페이스는 목적에 따라 분리하지만, 의존성은 같은 차원에 존재합니다.
> 테스트 코드가 구현 코드를 사용하는 것은 정상이지만, 비즈니스 로직 복잡도를 높이지 않습니다.

**Use Cases**:
- 테스트 커버리지 분석
- 문서 유효성 검증
- 아키텍처 경계 강제

---

### 4. [Context Documents](./context-documents/)
**핵심**: 파일과 심볼에 대한 메타데이터 및 개념 문서 생성

**CLI Commands**:
- `npm run cli -- markdown --name <namespace> --action document` - 컨텍스트 문서 생성
- `npm run cli -- markdown --name <namespace> --action analysis` - 마크다운 분석
- `npm run cli -- markdown --name <namespace> --action tags` - 태그 수집

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#markdown`](../../src/cli/main.ts#L99-L146) - 마크다운 분석 명령어
- **Handler**: [`src/cli/handlers/markdown-handler.ts#runTagDocumentGeneration`](../../src/cli/handlers/markdown-handler.ts#L34-L75) - 컨텍스트 문서 생성
- **Parser**: [`src/parsers/markdown/MarkdownParser.ts`](../../src/parsers/markdown/MarkdownParser.ts) - 마크다운 파싱
- **Tag Collector**: [`src/parsers/markdown/MarkdownTagCollector.ts`](../../src/parsers/markdown/MarkdownTagCollector.ts) - 태그 수집
- **Document Generator**: [`src/parsers/markdown/MarkdownTagDocumentGenerator.ts`](../../src/parsers/markdown/MarkdownTagDocumentGenerator.ts) - 문서 생성

**Structure**: 프로젝트 구조 미러링
```
.dependency-linker/context/
├── files/          # 파일 레벨 (프로젝트 구조 미러링)
└── symbols/        # 심볼 레벨 (메서드/클래스)
```

**Use Cases**:
- LLM 컨텍스트 제공
- 코드 리뷰 지원
- 온보딩 자료

---

### 5. [Query System](./query-system/)
**핵심**: GraphDB에 저장된 의존성 정보 조회 (Query only)

**CLI Commands**:
- `npm run cli -- typescript --file <file>` - 단일 파일 분석 및 쿼리
- `npm run cli -- typescript --pattern <pattern>` - 패턴 기반 분석 및 쿼리
- `npm run cli -- analyze --pattern <pattern>` - 파일 패턴 기반 분석

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#typescript`](../../src/cli/main.ts#L152-L189) - TypeScript 분석 명령어
- **Handler**: [`src/cli/handlers/typescript-handler.ts#runTypeScriptAnalysis`](../../src/cli/handlers/typescript-handler.ts#L24-L33) - TypeScript 분석 실행
- **Database**: [`src/database/GraphDatabase.ts`](../../src/database/GraphDatabase.ts) - GraphDB 쿼리 엔진
- **Query Engine**: [`src/core/QueryEngine.ts`](../../src/core/QueryEngine.ts) - 의존성 쿼리 엔진

**Query Types**:
- 파일 간 의존성
- 순환 의존성
- 의존 깊이

**Use Cases**:
- 의존성 탐색
- 영향 분석
- 리팩토링 계획

> 💡 간접 의존성 추론은 [Inference System](./inference-system/)을 참고하세요.

---

### 6. [RDF Addressing](./rdf-addressing/)
**핵심**: RDF 기반 노드 식별 시스템으로 심볼의 정의 위치를 명확히 표현

**Status**: ✅ **Production Ready** (v3.1.0 완료)

**CLI Commands**:
- `npm run cli -- rdf --search <query>` - RDF 주소 검색
- `npm run cli -- rdf --create <address>` - RDF 주소 생성
- `npm run cli -- rdf --validate <address>` - RDF 주소 검증
- `npm run cli -- rdf --stats` - RDF 통계 조회

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#rdf`](../../src/cli/main.ts#L258-L317) - RDF 관련 명령어
- **RDF Address**: [`src/core/RDFAddress.ts`](../../src/core/RDFAddress.ts) - RDF 주소 생성/파싱
- **Node Identifier**: [`src/database/core/NodeIdentifier.ts`](../../src/database/core/NodeIdentifier.ts) - RDF 기반 노드 식별자
- **Database API**: [`src/api/rdf-database-integration.ts`](../../src/api/rdf-database-integration.ts) - RDF 데이터베이스 통합
- **Address Parser**: [`src/core/RDFAddressParser.ts`](../../src/core/RDFAddressParser.ts) - 고급 검색 및 필터링

**Key Features**:
- **명확한 식별**: `dependency-linker/src/parser.ts#Class:TypeScriptParser`
- **역파싱**: RDF 주소 → 파일 위치 자동 변환
- **고유성 보장**: 같은 파일 내 심볼 이름 중복 방지
- **검색 엔진**: CLI 명령어로 심볼 검색 가능
- **메타 태그**: 시멘틱 태그 방식으로 확장 가능한 주소 체계
- **언어별 매핑**: TypeScript, JavaScript, Java, Python, Go 지원
- **고급 검색**: 부분 일치, 필터링, 그룹화, 통계 생성

**Use Cases**:
- 심볼 정의 위치 빠른 탐색
- 에디터 통합 (Go to Definition)
- 문서 간 심볼 참조 표준화
- 파서 검색 엔진으로 활용
- 네임스페이스 기반 심볼 관리

---

### 6.1. [RDF-CLI Integration](./rdf-cli-integration/)
**핵심**: RDF 주소 시스템을 CLI 명령어로 직접 관리

**Status**: 🚧 In Development (v3.1.1 타겟)

**Key Features**:
- **RDF 주소 생성**: `npm run cli -- rdf create`
- **RDF 주소 검색**: `npm run cli -- rdf search`
- **RDF 주소 검증**: `npm run cli -- rdf validate`
- **RDF 주소 통계**: `npm run cli -- rdf stats`

**Use Cases**:
- 심볼 탐색 및 위치 찾기
- RDF 주소 기반 의존성 분석
- 중복 심볼 검증 및 해결

---

### 6.2. [RDF-Database Integration](./rdf-database-integration/)
**핵심**: RDF 주소를 GraphDatabase에 영구 저장하고 고급 쿼리 제공

**Status**: 🚧 In Development (v3.1.2 타겟)

**Key Features**:
- **RDF 주소 저장**: 데이터베이스에 RDF 주소 영구 저장
- **RDF 기반 쿼리**: RDF 주소로 노드 검색 및 관계 추적
- **성능 최적화**: 인덱싱 및 캐싱으로 빠른 검색

**Use Cases**:
- 심볼 의존성 추적
- 프로젝트 구조 분석
- 네임스페이스 간 의존성 분석

---

### 6.3. [RDF-Namespace Integration](./rdf-namespace-integration/)
**핵심**: RDF 주소 시스템과 네임스페이스 시스템 완전 통합

**Status**: 🚧 In Development (v3.1.3 타겟)

**Key Features**:
- **네임스페이스별 RDF 분석**: 네임스페이스별 RDF 주소 생성 및 관리
- **크로스 네임스페이스 RDF 의존성**: 네임스페이스 간 RDF 주소 의존성 추적
- **RDF 기반 파일 그룹화**: RDF 주소로 파일 그룹화 및 분석

**Use Cases**:
- 네임스페이스별 심볼 관리
- RDF 주소 기반 의존성 분석
- 프로젝트 구조 최적화

---

### 7. [Unknown Symbol System](./unknown-symbol-system/)
**핵심**: Import alias 추적 및 점진적 분석을 위한 Dual-Node Pattern

**Status**: ✅ Production Ready (Enhancement Phase)

**CLI Commands**:
- `npm run cli -- analyze --pattern <pattern>` - 파일 분석 시 Unknown 노드 자동 생성
- `npm run cli -- typescript --file <file>` - 단일 파일 분석 시 Alias 추적
- `npm run cli -- namespace --all` - 전체 분석 시 Unknown → Actual 연결

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#analyze`](../../src/cli/main.ts#L50-L93) - 분석 명령어
- **File Analyzer**: [`src/database/services/FileDependencyAnalyzer.ts#createUnknownSymbolNodes`](../../src/database/services/FileDependencyAnalyzer.ts) - Unknown 노드 생성
- **Dual-Node Pattern**: [`src/database/services/FileDependencyAnalyzer.ts`](../../src/database/services/FileDependencyAnalyzer.ts) - Original/Alias 노드 분리
- **Alias Tracking**: [`src/database/inference/EdgeTypeRegistry.ts`](../../src/database/inference/EdgeTypeRegistry.ts) - aliasOf 엣지 타입
- **Inference Engine**: [`src/database/inference/InferenceEngine.ts`](../../src/database/inference/InferenceEngine.ts) - Unknown → Actual 추론

**Key Features**:
- **Dual-Node Pattern**: Original 노드와 Alias 노드 분리
- **Alias 추적**: `import { User as UserType }` → aliasOf edge 생성
- **점진적 분석**: 파일별 분석 후 나중에 연결 가능
- **LLM 컨텍스트 자동 구성**: Unknown 노드 → 의존 파일 자동 추출

**Use Cases**:
- Import alias 관계 명시적 추적
- 대규모 프로젝트 점진적 분석
- LLM에게 필요한 파일만 제공

---

### 8. [Inference System](./inference-system/)
**핵심**: 3가지 추론 타입으로 간접 의존성 자동 추론

**Status**: 🚧 In Development (v3.2.0 타겟)

**CLI Commands**:
- `npm run cli -- analyze --pattern <pattern>` - 분석 시 자동 추론 실행
- `npm run cli -- namespace --all` - 전체 분석 시 추론 엔진 실행
- `npm run cli -- typescript --pattern <pattern>` - TypeScript 분석 시 추론

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#analyze`](../../src/cli/main.ts#L50-L93) - 분석 명령어
- **Inference Engine**: [`src/database/inference/InferenceEngine.ts`](../../src/database/inference/InferenceEngine.ts) - 추론 엔진 핵심
- **Edge Type Registry**: [`src/database/inference/EdgeTypeRegistry.ts`](../../src/database/inference/EdgeTypeRegistry.ts) - 엣지 타입 관리
- **Hierarchical Query**: [`src/database/inference/InferenceEngine.ts#queryHierarchical`](../../src/database/inference/InferenceEngine.ts) - 계층적 추론
- **Transitive Query**: [`src/database/inference/InferenceEngine.ts#queryTransitive`](../../src/database/inference/InferenceEngine.ts) - 전이적 추론
- **Inheritable Query**: [`src/database/inference/InferenceEngine.ts#inferInheritable`](../../src/database/inference/InferenceEngine.ts) - 상속 가능 추론

**Inference Types**:
- **Hierarchical (계층적)**: 타입 계층 활용 (`imports` → `imports_file` + `imports_package`)
- **Transitive (전이적)**: A→B→C 체인 추적 (간접 의존성)
- **Inheritable (상속 가능)**: 부모-자식 관계 전파

**Key Features**:
- SQL Recursive CTE 기반 고성능 추론
- LRU 캐시로 성능 최적화 (3배 향상)
- Incremental inference (변경된 노드만 재추론)

**Use Cases**:
- LLM 컨텍스트 자동 구성 (전이적 의존성 포함)
- 영향 분석 (이 파일 변경 시 영향받는 파일 찾기)
- Unknown 노드 → 실제 타입 자동 연결

---

### 9. [Scenario System](./scenario-system/)
**핵심**: 재사용 가능한 분석 명세로서의 시나리오 시스템

**Status**: 🚧 In Development (v1.0.0)

**CLI Commands**:
- `npm run cli -- analyze --pattern <pattern>` - 기본 시나리오로 분석
- `npm run cli -- namespace --name <name>` - 네임스페이스별 시나리오 실행
- `npm run cli -- markdown --name <namespace> --action analysis` - 마크다운 시나리오

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#analyze`](../../src/cli/main.ts#L50-L93) - 분석 명령어
- **Scenario Registry**: [`src/scenarios/ScenarioRegistry.ts`](../../src/scenarios/ScenarioRegistry.ts) - 시나리오 중앙 관리
- **Base Analyzer**: [`src/scenarios/BaseScenarioAnalyzer.ts`](../../src/scenarios/BaseScenarioAnalyzer.ts) - 기본 분석 패턴
- **Built-in Scenarios**: [`src/scenarios/built-in/`](../../src/scenarios/built-in/) - 내장 시나리오들
- **Type System**: [`src/scenarios/types.ts`](../../src/scenarios/types.ts) - 시나리오 타입 정의

**Components**:
- ScenarioSpec - 분석 방법의 완전한 정의 (nodeTypes, edgeTypes, semanticTags, queryPatterns)
- ScenarioRegistry - 중앙 시나리오 관리 및 검증
- BaseScenarioAnalyzer - 일관된 분석 패턴 제공

**Key Innovation**:
> 분석 방법을 코드가 아닌 명세(Spec)로 정의하여 수평적 확장 가능

**Built-in Scenarios**:
- `basic-structure` - 기본 코드 구조 추출
- `file-dependency` - 파일 레벨 의존성
- `symbol-dependency` - 심볼 레벨 의존성
- `markdown-linking` - 마크다운 링크 추적

**Use Cases**:
- 새 분석 타입 추가 (명세 작성만으로)
- 분석 방법 재사용 (여러 컨텍스트에서)
- 타입 시스템 확장 (EdgeType, NodeType, SemanticTag)

---

### 10. [Namespace-Scenario Integration](./namespace-scenario-integration/)
**핵심**: Namespace가 Scenario를 선택하여 진정한 수평적 확장 실현

**Status**: 🚧 In Development (87.5% 완료)

**CLI Commands**:
- `npm run cli -- namespace --name <name>` - 특정 네임스페이스 시나리오 실행
- `npm run cli -- namespace --all` - 모든 네임스페이스 시나리오 실행
- `npm run cli -- analyze --pattern <pattern>` - 패턴 기반 시나리오 분석

**Implementation**:
- **CLI Entry**: [`src/cli/main.ts#namespace`](../../src/cli/main.ts#L218-L252) - 네임스페이스 명령어
- **Namespace Analyzer**: [`src/namespace/NamespaceDependencyAnalyzer.ts`](../../src/namespace/NamespaceDependencyAnalyzer.ts) - 시나리오 통합 분석
- **Config Manager**: [`src/namespace/ConfigManager.ts`](../../src/namespace/ConfigManager.ts) - 시나리오 설정 관리
- **Scenario Registry**: [`src/scenarios/ScenarioRegistry.ts`](../../src/scenarios/ScenarioRegistry.ts) - 시나리오 중앙 관리
- **Execution Order**: [`src/namespace/NamespaceDependencyAnalyzer.ts#getScenarioExecutionOrder`](../../src/namespace/NamespaceDependencyAnalyzer.ts) - 실행 순서 계산

**Key Concept**:
```
새 분석 = Namespace 추가 + Scenario 조합 선택
```

**Extended NamespaceConfig**:
```json
{
  "frontend": {
    "filePatterns": ["src/**/*.tsx"],
    "scenarios": ["react-component", "file-dependency"],
    "scenarioConfig": {
      "react-component": { "detectPropsDrilling": true }
    }
  }
}
```

**Benefits**:
- **비용 최적화**: 필요한 분석만 실행 (문서는 markdown만, UI는 React 전용)
- **맥락 기반 분석**: 같은 파일도 namespace에 따라 다르게 분석
- **재사용성**: 시나리오 한 번 정의, 여러 namespace에서 재사용
- **확장성**: 코드 변경 없이 설정만으로 새 분석 추가

---

## 🔄 **CLI 핵심 기능**

### **1. 분석 환경 설정 (Namespace Config)**
```bash
# 네임스페이스 설정 관리
npm run cli -- namespace --list                    # 네임스페이스 목록
npm run cli -- namespace --create <name>           # 네임스페이스 생성
npm run cli -- namespace --config <name>            # 네임스페이스 설정 조회
npm run cli -- namespace --update <name>           # 네임스페이스 설정 업데이트
```

### **2. 특정 파일 정보 조회 및 최신 정보 획득**
```bash
# 단일 파일 분석
npm run cli -- analyze --file <path>                # 특정 파일 분석
npm run cli -- analyze --file <path> --fresh        # 최신 정보로 재분석
npm run cli -- analyze --file <path> --info         # 파일 정보만 조회
```

### **3. 네임스페이스 범위 의존성 분석**
```bash
# 네임스페이스 전체 분석
npm run cli -- namespace --name <name>              # 특정 네임스페이스 분석
npm run cli -- namespace --all                     # 모든 네임스페이스 분석
npm run cli -- namespace --name <name> --fresh     # 최신 정보로 재분석
```

### **4. 네임스페이스 특정 범위 의존성 분석**
```bash
# 범위별 분석
npm run cli -- analyze --namespace <name> --pattern "src/**/*.ts"  # 패턴 기반
npm run cli -- analyze --namespace <name> --depth <n>             # 깊이 제한
npm run cli -- analyze --namespace <name> --circular              # 순환 의존성만
```

## 🔄 **Typical Workflows**

### **Workflow 1: 초기 프로젝트 분석**

```bash
# 1. 네임스페이스 확인
npm run cli -- namespace --list

# 2. 전체 의존성 분석
npm run cli -- namespace --all

# 3. 크로스 네임스페이스 의존성 확인 (자동 탐지)
npm run cli -- namespace --all

# 4. 컨텍스트 문서 생성
npm run cli -- markdown --name <namespace> --action document
```

### Workflow 2: 특정 파일 분석

```bash
# 1. 특정 네임스페이스 분석
npm run cli -- namespace --name source

# 2. 특정 파일 분석
npm run cli -- typescript --file src/database/GraphDatabase.ts

# 3. 패턴 기반 분석
npm run cli -- analyze --pattern "src/**/*.ts"
```

### Workflow 3: 추론 테스트

```bash
# 1. 전체 분석 (필요시)
npm run cli -- namespace --all

# 2. 특정 파일의 의존성 추출
npm run cli -- typescript --file src/namespace/NamespaceGraphDB.ts

# 3. RDF 주소 검색
npm run cli -- rdf --search "TypeScriptParser"

# 4. 결과 활용 (LLM 컨텍스트 구성 등)
```

### Workflow 4: 네임스페이스 관리

```bash
# 1. 네임스페이스 목록 확인
npm run cli -- namespace --list

# 2. 특정 네임스페이스 실행
npm run cli -- namespace --name source

# 3. 모든 네임스페이스 실행
npm run cli -- namespace --all

# 4. 네임스페이스 최적화 (개발 중)
npm run cli -- namespace --optimize
```

---

## 🔗 CLI 명령어와 구현 코드 매핑

### CLI 명령어 구조

| CLI 명령어 | 구현 파일 | 핵심 함수 | 기능 |
|------------|-----------|-----------|------|
| `npm run cli -- analyze` | [`src/cli/main.ts#L50-L93`](../../src/cli/main.ts#L50-L93) | `runTypeScriptProjectAnalysis` | 파일 패턴 기반 의존성 분석 |
| `npm run cli -- analyze --file <path>` | [`src/cli/main.ts#L50-L93`](../../src/cli/main.ts#L50-L93) | `runTypeScriptAnalysis` | 특정 파일 분석 |
| `npm run cli -- namespace --list` | [`src/cli/main.ts#L218-L252`](../../src/cli/main.ts#L218-L252) | `runNamespaceAnalysis` | 네임스페이스 목록 조회 |
| `npm run cli -- namespace --name <name>` | [`src/cli/main.ts#L218-L252`](../../src/cli/main.ts#L218-L252) | `runNamespaceAnalysis` | 특정 네임스페이스 분석 |
| `npm run cli -- namespace --all` | [`src/cli/main.ts#L218-L252`](../../src/cli/main.ts#L218-L252) | `runNamespaceAnalysis` | 모든 네임스페이스 분석 |
| `npm run cli -- typescript --file <file>` | [`src/cli/main.ts#L152-L189`](../../src/cli/main.ts#L152-L189) | `runTypeScriptAnalysis` | 단일 파일 TypeScript 분석 |
| `npm run cli -- typescript --pattern <pattern>` | [`src/cli/main.ts#L152-L189`](../../src/cli/main.ts#L152-L189) | `runTypeScriptProjectAnalysis` | 패턴 기반 TypeScript 분석 |
| `npm run cli -- markdown --name <namespace> --action <action>` | [`src/cli/main.ts#L99-L146`](../../src/cli/main.ts#L99-L146) | `runMarkdownAnalysis` | 마크다운 분석 및 문서 생성 |
| `npm run cli -- rdf --search <query>` | [`src/cli/main.ts#L258-L317`](../../src/cli/main.ts#L258-L317) | `RDFDatabaseAPI.searchRDFAddresses` | RDF 주소 검색 |
| `npm run cli -- rdf --create <address>` | [`src/cli/main.ts#L258-L317`](../../src/cli/main.ts#L258-L317) | `createRDFAddress` | RDF 주소 생성 |
| `npm run cli -- rdf --validate <address>` | [`src/cli/main.ts#L258-L317`](../../src/cli/main.ts#L258-L317) | `validateRDFAddress` | RDF 주소 검증 |

### 🚧 **누락된 핵심 CLI 기능들**

| 필요한 CLI 명령어 | 현재 상태 | 구현 필요도 |
|------------------|-----------|-------------|
| `npm run cli -- query <namespace>` | ❌ 누락 | 🔴 높음 |
| `npm run cli -- query --circular` | ❌ 누락 | 🔴 높음 |
| `npm run cli -- query --depth <n>` | ❌ 누락 | 🔴 높음 |
| `npm run cli -- cross-namespace` | ❌ 누락 | 🔴 높음 |
| `npm run cli -- cross-namespace --detailed` | ❌ 누락 | 🔴 높음 |
| `npm run cli -- infer <namespace>` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- infer --hierarchical` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- unknown --list` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- unknown --resolve` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- namespace --create <name>` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- namespace --delete <name>` | ❌ 누락 | 🟡 중간 |
| `npm run cli -- namespace --files <name>` | ❌ 누락 | 🟡 중간 |

### 핸들러별 구현 구조

| 핸들러 | 파일 | 주요 함수 | 역할 |
|--------|------|-----------|------|
| **TypeScript Handler** | [`src/cli/handlers/typescript-handler.ts`](../../src/cli/handlers/typescript-handler.ts) | `runTypeScriptAnalysis`, `runTypeScriptProjectAnalysis` | TypeScript 파일 분석 |
| **Markdown Handler** | [`src/cli/handlers/markdown-handler.ts`](../../src/cli/handlers/markdown-handler.ts) | `runMarkdownAnalysis`, `runTagDocumentGeneration` | 마크다운 분석 및 문서 생성 |
| **Namespace Analysis** | [`src/namespace/analysis-namespace.ts`](../../src/namespace/analysis-namespace.ts) | `runNamespaceAnalysis` | 네임스페이스 분석 실행 |

### 핵심 구현 컴포넌트

| 컴포넌트 | 파일 | 주요 클래스/함수 | 역할 |
|----------|------|------------------|------|
| **Dependency Graph Builder** | [`src/graph/DependencyGraphBuilder.ts`](../../src/graph/DependencyGraphBuilder.ts) | `DependencyGraphBuilder` | 의존성 그래프 구성 |
| **Namespace Dependency Analyzer** | [`src/namespace/NamespaceDependencyAnalyzer.ts`](../../src/namespace/NamespaceDependencyAnalyzer.ts) | `NamespaceDependencyAnalyzer` | 네임스페이스 의존성 분석 |
| **Graph Database** | [`src/database/GraphDatabase.ts`](../../src/database/GraphDatabase.ts) | `GraphDatabase` | GraphDB 쿼리 엔진 |
| **RDF Address** | [`src/core/RDFAddress.ts`](../../src/core/RDFAddress.ts) | `RDFAddress` | RDF 주소 생성/파싱 |
| **Node Identifier** | [`src/database/core/NodeIdentifier.ts`](../../src/database/core/NodeIdentifier.ts) | `NodeIdentifier` | RDF 기반 노드 식별자 |
| **Inference Engine** | [`src/database/inference/InferenceEngine.ts`](../../src/database/inference/InferenceEngine.ts) | `InferenceEngine` | 추론 엔진 |
| **Edge Type Registry** | [`src/database/inference/EdgeTypeRegistry.ts`](../../src/database/inference/EdgeTypeRegistry.ts) | `EdgeTypeRegistry` | 엣지 타입 관리 |

---

## 📊 **시스템 아키텍처**

### **RDF 주소 생성 플로우**
```
Source Code → AST Parsing → Symbol Extraction → RDF Address Generation
     ↓              ↓              ↓                    ↓
  TypeScript    Tree-sitter    Symbol Info      <project>/<file>#<type>:<name>
```

### **검색 및 참조 플로우**
```
RDF Address → Parser → File Location → Editor Navigation
     ↓           ↓           ↓              ↓
  Search Key   Extract    File Path    Open in Editor
```

### **고유성 검증 플로우**
```
Symbols → Group by RDF → Check Duplicates → Resolve Conflicts
   ↓           ↓              ↓                ↓
 Extract   Grouping      Validation      Suggestions
```

### **핵심 데이터 플로우**
```
┌──────────────┐
│ Source Files │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Tree-sitter      │
│ AST Parsing      │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Dependency Analysis  │
│ • imports/exports    │
│ • file references    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Namespace Grouping   │
│ • source             │
│ • tests              │
│ • docs               │
│ • configs            │
└──────┬───────────────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│   GraphDB    │  │ Cross-Namespace  │
│   Storage    │  │   Detection      │
└──────┬───────┘  └─────┬────────────┘
       │                │
       ▼                ▼
┌──────────────────────────────┐
│   Context Documents          │
│   • File-level docs          │
│   • Symbol-level docs        │
│   • Dependency annotations   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│   Inference & Query          │
│   • Nearest nodes            │
│   • Transitive dependencies  │
│   • LLM context preparation  │
└──────────────────────────────┘
```

---

## 🎯 Key Design Principles

### 1. **Namespace Separation ≠ Dependency Isolation**
네임스페이스는 관리 목적으로 분리하지만, 의존성은 자유롭게 존재합니다.

### 2. **Mirrored Structure**
컨텍스트 문서는 프로젝트 구조를 미러링하여 경로 충돌을 완전히 방지합니다.

### 3. **Programmatic Consistency**
모든 식별자와 문서 경로는 프로그래밍적으로 예측 가능하고 일관됩니다.

### 4. **File-Level Focus**
현재는 파일 레벨 의존성에 집중하며, 필요시 심볼 레벨로 확장 가능합니다.

### 5. **User-Editable Context**
자동 생성된 컨텍스트 문서는 사용자가 편집하여 메타데이터를 추가할 수 있습니다.

---

## 🔧 Technology Stack

- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **Parser**: tree-sitter (multi-language support)
- **Database**: SQLite (better-sqlite3)
- **CLI**: Commander.js
- **Testing**: Jest

---

## 📈 Current Status

### Production Ready ✅
- Core dependency analysis (153 edges detected)
- Namespace management (4 namespaces)
- Cross-namespace tracking (27 cross-deps)
- Context document generation (141 documents)
- GraphDB storage with safe re-initialization
- **Scenario System** - 재사용 가능한 분석 명세 아키텍처 (v1.0.0, 2025-10-04)
- **Unknown Symbol System** - Dual-Node Pattern with alias tracking (v3.1.0)
- **Type Management Convention** - 노드 타입 & 엣지 타입 관리 체계 (v3.1.0)
- **RDF Addressing** - 🆕 RDF 기반 노드 식별 시스템 (v3.1.0 완료)

### In Development 🚧
- **RDF-CLI Integration** - CLI 명령어로 RDF 주소 관리 (v3.1.1 타겟)
- **RDF-Database Integration** - GraphDatabase에 RDF 주소 저장 (v3.1.2 타겟)
- **RDF-Namespace Integration** - 네임스페이스와 RDF 주소 완전 통합 (v3.1.3 타겟)
- **Inference System** - 3가지 추론 타입 (계층적/전이적/상속 가능) (v3.2.0 타겟)
- **Namespace-Scenario Integration** - 수평적 확장 가능한 분석 시스템
- Symbol-level context documents
- Visualization tools
- Performance optimizations (캐시, 증분 추론)

### Planned 📋
- Real-time dependency monitoring
- Incremental analysis
- Graph query language
- CI/CD integration

---

## 📚 Documentation

### Feature Documentation
- [Dependency Analysis](./dependency-analysis/) - 의존성 분석 상세 가이드
- [Namespace Management](./namespace-management/) - 네임스페이스 관리
- [Cross-Namespace Dependencies](./cross-namespace/) - 크로스 네임스페이스
- [Context Documents](./context-documents/) - 컨텍스트 문서 시스템
- [Query System](./query-system/) - GraphDB 의존성 조회 (Query only)
- **[RDF Addressing](./rdf-addressing/)** - 🆕 RDF 기반 노드 식별 시스템
- **[Unknown Symbol System](./unknown-symbol-system/)** - 🆕 Dual-Node Pattern과 Alias 추적
- **[Inference System](./inference-system/)** - 🆕 3가지 추론 타입 (계층적/전이적/상속 가능)
- **[Type Management](./type-management/)** - 🆕 노드 타입 & 엣지 타입 관리 컨벤션
- [Scenario System](./scenario-system/) - 시나리오 기반 분석 아키텍처
- [Namespace-Scenario Integration](./namespace-scenario-integration/) - 수평적 확장 시스템

### Technical Documentation
- [Pipeline Integration](./PIPELINE_INTEGRATION.md) - 🆕 파이프라인 통합 계획 (RDF/Unknown/Inference)
- [Single File Analysis](../docs/single-file-analysis-api.md) - 단일 파일 분석 API
- [Type System](../docs/type-system.md) - Node와 Edge 타입 시스템

---

## 🚀 Quick Start

```bash
# 1. 설치
npm install

# 2. 빌드
npm run build

# 3. 초기 분석
node dist/cli/namespace-analyzer.js analyze-all

# 4. 컨텍스트 문서 생성
node dist/cli/namespace-analyzer.js generate-context-all

# 5. 결과 확인
node dist/cli/namespace-analyzer.js cross-namespace --detailed
node dist/cli/namespace-analyzer.js list-context
```

---

## 🤝 Contributing

각 기능별 문서에 구현 세부사항과 확장 가능 지점이 명시되어 있습니다. 새로운 기능 추가 시:

1. `features/<feature-name>/` 디렉토리 생성
2. `README.md`에 기능 정의 문서 작성
3. 이 `index.md`에 새 기능 섹션 추가

---

**Last Updated**: 2025-10-05
**Version**: 3.1.0-dev (RDF Addressing, Unknown Symbol System, Inference System 추가)
