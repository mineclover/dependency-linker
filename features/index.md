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

**Commands**:
- `analyze` - 특정 네임스페이스 분석
- `analyze-all` - 모든 네임스페이스 통합 분석

**Output**: SQLite GraphDB (`.dependency-linker/graph.db`)

**Use Cases**:
- 파일 간 의존성 추적
- 순환 의존성 탐지
- 의존성 그래프 시각화 준비

---

### 2. [Namespace Management](./namespace-management/)
**핵심**: 코드를 목적별로 조직화하고 관리

**Commands**:
- `list-namespaces` - 네임스페이스 목록 조회
- `create-namespace` - 새 네임스페이스 생성
- `delete-namespace` - 네임스페이스 삭제
- `list-files` - 네임스페이스 내 파일 목록

**Configuration**: `deps.config.json`

**Use Cases**:
- 소스 코드와 테스트 분리
- 문서와 설정 파일 격리
- 도메인별 코드 조직화

---

### 3. [Cross-Namespace Dependencies](./cross-namespace/)
**핵심**: 네임스페이스 경계를 넘는 의존성 추적

**Commands**:
- `cross-namespace` - 크로스 네임스페이스 의존성 조회

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

**Commands**:
- `generate-context` - 특정 파일 컨텍스트 생성
- `generate-context-all` - 모든 파일 컨텍스트 생성
- `list-context` - 생성된 컨텍스트 문서 목록

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

**Commands**:
- `query` - 네임스페이스별 의존성 쿼리

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

**Key Features**:
- **명확한 식별**: `dependency-linker/src/parser.ts#Class:TypeScriptParser`
- **역파싱**: RDF 주소 → 파일 위치 자동 변환
- **고유성 보장**: 같은 파일 내 심볼 이름 중복 방지
- **검색 엔진**: CLI 명령어로 심볼 검색 가능
- **메타 태그**: 시멘틱 태그 방식으로 확장 가능한 주소 체계
- **언어별 매핑**: TypeScript, JavaScript, Java, Python, Go 지원
- **고급 검색**: 부분 일치, 필터링, 그룹화, 통계 생성

**Architecture Components**:
- **RDFAddress.ts**: 핵심 RDF 주소 생성/파싱
- **RDFNodeIdentifier.ts**: RDF 기반 노드 식별자 관리
- **RDFAddressParser.ts**: 고급 검색 및 필터링
- **RDFUniquenessValidator.ts**: 고유성 검증 및 충돌 해결
- **rdf-analysis.ts**: RDF 기반 분석 API

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

**CLI Commands**:
- `analyze <namespace> --scenarios <list>` - 시나리오 선택
- `scenarios` - 사용 가능한 시나리오 목록
- `scenarios <namespace>` - 특정 namespace의 시나리오 확인

---

## 🔄 Typical Workflows

### Workflow 1: 초기 프로젝트 분석

```bash
# 1. 네임스페이스 확인
node dist/cli/namespace-analyzer.js list-namespaces

# 2. 전체 의존성 분석
node dist/cli/namespace-analyzer.js analyze-all

# 3. 크로스 네임스페이스 의존성 확인
node dist/cli/namespace-analyzer.js cross-namespace --detailed

# 4. 컨텍스트 문서 생성
node dist/cli/namespace-analyzer.js generate-context-all
```

### Workflow 2: 특정 파일 분석

```bash
# 1. 특정 네임스페이스 분석
node dist/cli/namespace-analyzer.js analyze source

# 2. 특정 파일 컨텍스트 생성
node dist/cli/namespace-analyzer.js generate-context src/database/GraphDatabase.ts

# 3. 의존성 쿼리
node dist/cli/namespace-analyzer.js query source
```

### Workflow 3: 추론 테스트

```bash
# 1. 전체 분석 (필요시)
node dist/cli/namespace-analyzer.js analyze-all

# 2. 특정 파일의 의존성 추출
npx tsx test-inference.ts src/namespace/NamespaceGraphDB.ts

# 3. 결과 활용 (LLM 컨텍스트 구성 등)
```

### Workflow 4: 네임스페이스 관리

```bash
# 1. 새 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace integration-tests \
  --patterns "tests/integration/**/*" \
  --description "Integration test files"

# 2. 파일 목록 확인
node dist/cli/namespace-analyzer.js list-files integration-tests

# 3. 분석 실행
node dist/cli/namespace-analyzer.js analyze integration-tests
```

---

## 📊 Data Flow

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
