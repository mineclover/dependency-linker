# Glossary - 용어집

**Project**: Dependency Linker
**Date**: 2025-10-02
**Version**: 1.0.0

프로젝트에서 사용되는 주요 용어들의 정의입니다.

---

## Core Concepts

### AST (Abstract Syntax Tree)
추상 구문 트리. 소스 코드의 구조를 트리 형태로 표현한 것.

### Tree-sitter
여러 프로그래밍 언어를 파싱할 수 있는 파서 라이브러리. 본 프로젝트의 핵심 파싱 엔진.

### Query
Tree-sitter에서 AST 노드를 검색하기 위한 패턴 언어. S-expression 형식 사용.

---

## Graph Database Terms

### Node (노드)
그래프 데이터베이스의 기본 단위. 파일, 클래스, 함수 등의 코드 엔티티를 나타냄.

### Edge (엣지) / Relationship (관계)
노드 간의 연결. imports, depends_on, extends 등의 관계를 나타냄.

### Graph Database
노드와 엣지로 구성된 데이터베이스. 의존성 관계를 효율적으로 저장하고 조회.

---

## Node Types

### Internal Node (내부 노드)
프로젝트 내부의 파일이나 모듈을 나타내는 노드.

**특징**:
- `type: 'file'`
- `metadata.isExternal: false`
- import 경로가 `.` 또는 `/`로 시작

**예시**:
```typescript
{
  type: 'file',
  name: 'utils',
  metadata: {
    originalImport: './utils',
    isExternal: false
  }
}
```

**사용 사례**:
- 프로젝트 내부 모듈 간 의존성 추적
- 내부 아키텍처 분석
- 리팩토링 영향도 분석

---

### External Node (외부 노드)
프로젝트 외부의 라이브러리나 패키지를 나타내는 노드.

**특징**:
- `type: 'external'`
- `metadata.isExternal: true`
- `language: 'external'`
- import 경로가 패키지 이름 (`.`, `/`로 시작하지 않음)

**종류**:
1. **NPM 패키지**: `lodash`, `react`, `express` 등
2. **Builtin 모듈**: `fs`, `path`, `http` 등 Node.js 내장 모듈

**예시**:
```typescript
// NPM 패키지
{
  type: 'external',
  name: 'lodash',
  language: 'external',
  metadata: {
    originalImport: 'lodash',
    isExternal: true
  }
}

// Builtin 모듈
{
  type: 'external',
  name: 'fs',
  language: 'external',
  metadata: {
    originalImport: 'fs',
    isExternal: true
  }
}
```

**사용 사례**:
- 외부 의존성 추적
- 라이브러리 사용 현황 분석
- 보안 취약점 스캔 대상 식별

---

### Source File Node (소스 파일 노드)
실제 분석 대상이 되는 소스 코드 파일.

**특징**:
- `type: 'file'`
- `metadata.extension` 존재 (예: `.ts`, `.js`)
- `metadata.isExternal` 없음

**예시**:
```typescript
{
  type: 'file',
  name: 'utils.ts',
  sourceFile: 'src/utils.ts',
  metadata: {
    extension: '.ts',
    size: 1024,
    lastModified: '2025-10-02T...'
  }
}
```

---

## Relationship Types

### imports
파일이 다른 모듈을 import하는 관계.

**방향**: Source File → Import Target

**예시**:
```typescript
// src/math.ts → src/utils.ts
{
  fromNodeId: 1,  // math.ts
  toNodeId: 2,    // utils.ts
  type: 'imports'
}
```

### depends_on
파일이나 모듈이 다른 것에 의존하는 관계.

**방향**: Dependent → Dependency

### declares
파일이 함수, 클래스, 변수 등을 선언하는 관계.

**방향**: File → Declaration

### extends
클래스가 다른 클래스를 상속하는 관계.

**방향**: Subclass → Superclass

### contains
파일이 다른 코드 엔티티를 포함하는 관계.

**방향**: Container → Contained

---

## Inference System

### Inference (추론)
직접적으로 명시되지 않은 관계를 기존 관계들로부터 유도하는 것.

**종류**:
- **Transitive**: A→B, B→C ⇒ A→C
- **Hierarchical**: 계층 구조 기반 추론
- **Inheritable**: 부모-자식 관계를 통한 추론

### Edge Type (엣지 타입)
관계의 종류를 정의하는 타입. EdgeTypeRegistry에서 관리.

**속성**:
- `isTransitive`: 전이적 추론 가능 여부
- `isHierarchical`: 계층적 추론 가능 여부
- `isInheritable`: 상속 가능 여부

---

## Analysis Types

### Dependency Analysis (의존성 분석)
파일 간의 import/export 관계를 분석하는 것.

**결과**:
- `internal`: 프로젝트 내부 의존성
- `external`: 외부 패키지 의존성
- `builtin`: Node.js 내장 모듈

### Incremental Analysis (점진적 분석)
파일을 하나씩 추가로 분석하여 그래프를 점진적으로 구축하는 방식.

**장점**:
- 부분적 업데이트 가능
- 대용량 프로젝트에 효율적
- 실시간 분석 지원

### Impact Analysis (영향도 분석)
특정 파일 변경 시 영향받는 다른 파일들을 찾는 분석.

**사용**:
```typescript
const impacted = await findImpactedFiles(changedFileId);
```

---

## Storage & Query

### GraphStorage
파싱 결과를 그래프 DB에 저장하는 컴포넌트.

### GraphQueryEngine
그래프 DB를 조회하고 분석하는 컴포넌트.

### GraphAnalysisSystem
Storage와 QueryEngine을 통합한 시스템.

### DependencyToGraph
의존성 분석과 그래프 저장을 통합한 클래스.

---

## API Methods

### listAllNodes()
모든 노드를 조회하고 유형별로 그룹화하여 반환.

**반환**:
- `nodes`: 전체 노드 배열
- `nodesByType`: 유형별 그룹화
- `stats`: 통계 정보

### listNodesByType(type)
특정 유형의 노드만 조회.

**파라미터**:
- `type`: 'file' 또는 'external'

### analyzeSingleFile(filePath)
단일 파일을 분석하여 그래프 DB에 추가.

**용도**: 점진적 분석

### analyzeAndStore()
전체 프로젝트를 분석하여 그래프 DB에 저장.

**용도**: 초기 전체 분석

---

## Metadata Fields

### extension
파일 확장자 (예: `.ts`, `.js`, `.py`)

**용도**: 소스 파일 식별

### originalImport
원본 import 경로 (예: `'./utils'`, `'lodash'`)

**용도**: import 문 추적

### isExternal
외부 패키지 여부 (`true` / `false`)

**용도**: Internal/External 구분

**값**:
- `true`: NPM 패키지 또는 builtin 모듈
- `false`: 프로젝트 내부 파일
- `undefined`: 실제 소스 파일 (import 대상이 아님)

---

## Classification Rules

### Internal vs External 구분 규칙

| Import Path | Type | isExternal | Category |
|-------------|------|------------|----------|
| `./utils` | `file` | `false` | Internal |
| `../common` | `file` | `false` | Internal |
| `/absolute/path` | `file` | `false` | Internal |
| `lodash` | `external` | `true` | External (NPM) |
| `react` | `external` | `true` | External (NPM) |
| `fs` | `external` | `true` | External (Builtin) |
| `path` | `external` | `true` | External (Builtin) |

**판단 로직**:
```typescript
function isExternalPackage(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}
```

---

## File Organization

### Project Root
프로젝트의 최상위 디렉토리. 모든 경로의 기준점.

### Source File
분석 대상이 되는 소스 코드 파일.

### Parse Result
파일 파싱 결과. imports, exports, declarations 등을 포함.

### Storage Result
그래프 DB 저장 결과. 생성된 노드/관계 개수, 처리 시간 등.

---

## Common Abbreviations

| 약어 | 전체 이름 | 의미 |
|------|----------|------|
| AST | Abstract Syntax Tree | 추상 구문 트리 |
| DB | Database | 데이터베이스 |
| NPM | Node Package Manager | Node.js 패키지 매니저 |
| API | Application Programming Interface | 응용 프로그램 인터페이스 |
| ID | Identifier | 식별자 |

---

## Related Documents

- **NODE-CLASSIFICATION.md**: 노드 분류 상세 가이드
- **NODE-LISTING-API.md**: 노드 조회 API 문서
- **INCREMENTAL-ANALYSIS-TEST-RESULTS.md**: 점진적 분석 테스트 결과
- **INFERENCE-ENGINE-USAGE.md**: 추론 엔진 사용법

---

**Last Updated**: 2025-10-02
**Maintainer**: Development Team
**Status**: Active
