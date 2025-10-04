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

## 🗂️ Feature Categories

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

### 5. [Dependency Query](./query/)
**핵심**: GraphDB에 저장된 의존성 정보 조회

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

---

### 6. [Inference System](./inference/)
**핵심**: 의존성 정보를 활용한 추론 및 컨텍스트 생성

**Components**:
- InferenceEngine - 간접 의존성 추론
- Edge Type Registry - 엣지 타입 관리
- Context Integration - 의존성 + 컨텍스트 결합

**Use Cases**:
- 최근접 노드 추출
- 전이적 의존성 추적
- LLM 컨텍스트 자동 구성

---

### 7. [Scenario System](./scenario-system/)
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

### 8. [Namespace-Scenario Integration](./namespace-scenario-integration/)
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

### In Development 🚧
- **Namespace-Scenario Integration** - 수평적 확장 가능한 분석 시스템
- Symbol-level context documents
- Advanced inference algorithms
- Visualization tools
- Performance optimizations

### Planned 📋
- Real-time dependency monitoring
- Incremental analysis
- Graph query language
- CI/CD integration

---

## 📚 Documentation

- [Dependency Analysis](./dependency-analysis/) - 의존성 분석 상세 가이드
- [Namespace Management](./namespace-management/) - 네임스페이스 관리
- [Cross-Namespace Dependencies](./cross-namespace/) - 크로스 네임스페이스
- [Context Documents](./context-documents/) - 컨텍스트 문서 시스템
- [Query System](./query/) - 의존성 쿼리
- [Inference System](./inference/) - 추론 시스템
- [Scenario System](./scenario-system/) - 시나리오 기반 분석 아키텍처
- [Namespace-Scenario Integration](./namespace-scenario-integration/) - 수평적 확장 시스템

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

**Last Updated**: 2025-10-02
**Version**: 3.0.0
