# Type System

GraphDB의 Node Type과 Edge Type 정의 시스템 (대상 및 관계 식별)

## 목차
- [개요](#개요)
  - [Type의 목적](#type의-목적)
  - [Type vs Semantic Tags](#type-vs-semantic-tags)
- [Node Type 분류](#node-type-분류)
  - [1. File & Resource Types](#1-file--resource-types)
  - [2. Code Symbol Types](#2-code-symbol-types)
  - [3. Declaration Types](#3-declaration-types)
  - [4. Documentation Types](#4-documentation-types)
  - [5. Error Types](#5-error-types)
- [Edge Type 분류](#edge-type-분류)
  - [1. Structural Relationships](#1-structural-relationships-구조적-관계)
  - [2. Dependency Relationships](#2-dependency-relationships-의존성-관계)
  - [3. Code Execution Relationships](#3-code-execution-relationships-실행-관계)
  - [4. Type System Relationships](#4-type-system-relationships-타입-관계)
  - [5. Modification Relationships](#5-modification-relationships-변경-관계)
  - [6. Documentation Relationships](#6-documentation-relationships-문서-관계)
  - [7. Meta Relationships](#7-meta-relationships-메타-관계)
- [Type-to-SemanticTag 매핑](#type-to-semantictag-매핑)
- [Type Registry 구현](#type-registry-구현)
- [Type 계층 구조](#type-계층-구조)
- [Best Practices](#best-practices)

## 개요

**Type은 노드와 엣지의 대상을 식별합니다.**

- **Node Type**: 노드가 **무엇을 수식하는지** 식별 (file, class, method, function 등)
- **Edge Type**: 관계가 **어떤 유형인지** 식별 (imports, extends, calls 등)

### Type의 목적

**Node Type**: 대상 식별
- 파일을 수식: `type: "file"`
- 메서드를 수식: `type: "method"`
- 클래스를 수식: `type: "class"`
- 특정 심볼을 수식: `type: "function"`, `type: "variable"`

**Edge Type**: 관계 유형 식별
- Import 관계: `type: "imports"`
- 호출 관계: `type: "calls"`
- 상속 관계: `type: "extends"`

### Type vs Semantic Tags

```typescript
// Node Type: 대상 식별 (필수)
type: "class"              // "이 노드는 클래스를 수식한다"

// Semantic Tags: 복합적 의미 표현 (선택적)
// - 노드가 담고 있는 정보가 많을 때
// - 복합적인 의미를 가진 노드일 때
semanticTags: [
  "service-layer",         // 아키텍처 레이어
  "auth-domain",           // 비즈니스 도메인
  "public-api"             // 접근 범위
]
```

**핵심 차이점:**
- **Node Type**: "무엇을 수식하는가?" (What does it represent?) - 대상 식별 (필수)
- **Edge Type**: "어떤 관계인가?" (What kind of relationship?) - 관계 유형 (필수)
- **Semantic Tags**: "어떤 복합적 의미인가?" (What complex meaning?) - 추가 컨텍스트 (선택적)

## Node Type 분류

### 1. File & Resource Types
코드 파일과 리소스를 나타냅니다.

| Type | 설명 | 예시 |
|------|------|------|
| `file` | 소스 코드 파일 | `src/auth/UserService.ts` |
| `external-resource` | 외부 리소스 (URL 등) | `https://api.example.com` |
| `missing-file` | 존재하지 않는 파일 참조 | 깨진 import |
| `library` | 외부 라이브러리 | `react`, `express` |
| `package` | NPM 패키지 | `@types/node` |

### 2. Code Symbol Types
코드 심볼 (LSP SymbolKind 기반)

| Type | 설명 | 예시 |
|------|------|------|
| `class` | 클래스 정의 | `class UserService` |
| `interface` | 인터페이스 정의 | `interface IUser` |
| `function` | 함수 정의 | `function calculate()` |
| `method` | 메서드 정의 | `class.method()` |
| `property` | 속성/필드 | `class.field` |
| `variable` | 변수 | `const user` |
| `constant` | 상수 | `const MAX_SIZE = 100` |
| `type` | 타입 별칭 | `type UserId = string` |
| `enum` | 열거형 | `enum Status` |
| `constructor` | 생성자 | `constructor()` |

### 3. Declaration Types
선언 및 export/import 관련

| Type | 설명 | 예시 |
|------|------|------|
| `export` | Export 선언 | `export { User }` |
| `import` | Import 선언 | `import { User }` |

### 4. Documentation Types
문서화 관련 노드

| Type | 설명 | 예시 |
|------|------|------|
| `heading-symbol` | 마크다운 헤딩 심볼 | `# Architecture` |
| `symbol` | 심볼 참조 | `@UserService` |

### 5. Error Types
오류 및 누락 관련

| Type | 설명 | 예시 |
|------|------|------|
| `file_not_found` | 파일을 찾을 수 없음 | 깨진 import |
| `broken_reference` | 깨진 참조 | 존재하지 않는 심볼 |

## Edge Type 분류

### 1. Structural Relationships (구조적 관계)
코드 구조를 나타내는 기본 관계

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `contains` | A → B | A가 B를 포함 | File contains Class |
| `declares` | A → B | A가 B를 선언 | File declares Function |
| `belongs_to` | A → B | A가 B에 속함 | Method belongs_to Class |

**특성**:
- `contains`: Transitive (전이적), Inheritable (상속 가능)
- `declares`: Inheritable (상속 가능)
- `belongs_to`: Transitive (전이적)

### 2. Dependency Relationships (의존성 관계)
코드 간 의존성을 나타냄

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `depends_on` | A → B | A가 B에 의존 | ServiceA depends_on ServiceB |
| `imports` | A → B | A가 B를 import | File imports Module |
| `imports_library` | A → B | A가 라이브러리 B를 import | File imports_library React |
| `imports_file` | A → B | A가 파일 B를 import | File imports_file Utils |
| `exports_to` | A → B | A가 B로 export | Module exports_to Public |

**특성**:
- `depends_on`: Transitive (전이적)
- `imports`: Parent는 `depends_on`

### 3. Code Execution Relationships (실행 관계)
런타임 실행 관계

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `calls` | A → B | A가 B를 호출 | functionA calls functionB |
| `instantiates` | A → B | A가 B의 인스턴스 생성 | Service instantiates Model |
| `uses` | A → B | A가 B를 사용 | Component uses Hook |
| `accesses` | A → B | A가 B에 접근 | Method accesses Property |

**특성**:
- `calls`: Parent는 `depends_on`
- `instantiates`: Parent는 `depends_on`
- `uses`: Parent는 `depends_on`

### 4. Type System Relationships (타입 관계)
타입 시스템 관련 관계

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `extends` | A → B | A가 B를 상속 | SubClass extends BaseClass |
| `implements` | A → B | A가 B를 구현 | Class implements Interface |
| `has_type` | A → B | A가 타입 B를 가짐 | Variable has_type String |
| `returns` | A → B | A가 타입 B를 반환 | Function returns User |
| `throws` | A → B | A가 예외 B를 던짐 | Function throws Error |

**특성**:
- `extends`: Parent는 `depends_on`, Inheritable (상속 가능)
- `implements`: Parent는 `depends_on`, Inheritable (상속 가능)

### 5. Modification Relationships (변경 관계)
코드 변경 및 재정의

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `overrides` | A → B | A가 B를 오버라이드 | ChildMethod overrides ParentMethod |
| `shadows` | A → B | A가 B를 가림 | LocalVar shadows OuterVar |
| `assigns_to` | A → B | A가 B에 할당 | Expression assigns_to Variable |

### 6. Documentation Relationships (문서 관계)
마크다운 및 문서 관련

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `md-link` | A → B | 마크다운 링크 | Doc links to Doc |
| `md-image` | A → B | 마크다운 이미지 | Doc includes Image |
| `md-wikilink` | A → B | 위키 스타일 링크 | Doc wikilinks Doc |
| `md-symbol-ref` | A → B | 심볼 참조 | Doc references Class |
| `md-include` | A → B | 파일 포함 | Doc includes Snippet |
| `md-code-ref` | A → B | 코드 블록 참조 | Doc references CodeFile |
| `md-anchor` | A → B | 내부 앵커 | Section links Anchor |
| `md-hashtag` | A → B | 해시태그 참조 | Doc tags Topic |
| `md-contains-heading` | A → B | 헤딩 포함 | Doc contains Heading |

**특성**:
- `md-link`, `md-wikilink`, `md-symbol-ref`, `md-include`: Transitive (전이적)
- `md-contains-heading`: Hierarchical (계층적)

### 7. Meta Relationships (메타 관계)
추가적인 관계

| Type | 방향 | 설명 | 예시 |
|------|------|------|------|
| `annotated_with` | A → B | A가 B로 데코레이트됨 | Class annotated_with @Injectable |
| `references` | A → B | A가 B를 참조 | Code references Symbol |

## Type-to-SemanticTag 매핑

각 타입별로 적합한 semantic tags 조합

### Node Type별 추천 Semantic Tags

#### File Types
```typescript
// 일반 소스 파일
type: "file"
semanticTags: ["arch/backend", "domain/auth"]

// 라이브러리
type: "library"
semanticTags: ["access/external", "domain/database"]
```

#### Code Symbol Types
```typescript
// 추상 클래스
type: "class"
semanticTags: ["code/abstract", "arch/service", "pattern/template-method"]

// 구현 클래스
type: "class"
semanticTags: ["code/implementation", "arch/repository", "domain/database"]

// 인터페이스
type: "interface"
semanticTags: ["code/interface", "spec/contract", "access/public"]

// 공개 함수
type: "function"
semanticTags: ["code/utility", "access/public", "quality/pure"]

// 비공개 메서드
type: "method"
semanticTags: ["access/private", "quality/async"]

// 상수
type: "constant"
semanticTags: ["code/constant", "access/public"]
```

#### Documentation Types
```typescript
// 아키텍처 문서 헤딩
type: "heading-symbol"
semanticTags: ["doc/architecture", "arch/backend", "spec/design"]

// API 문서 헤딩
type: "heading-symbol"
semanticTags: ["doc/api", "spec/api", "access/public"]
```

### Edge Type별 의미

```typescript
// Import 관계
type: "imports"
// 의미: 파일 A가 파일/모듈 B를 import함
// 추론: depends_on 관계로 전파

// Extends 관계
type: "extends"
// 의미: 클래스 A가 클래스 B를 상속
// 추론: depends_on 관계로 전파, 상속 가능

// Calls 관계
type: "calls"
// 의미: 함수 A가 함수 B를 호출
// 추론: depends_on 관계로 전파
```

## Type Registry 구현

### TypeScript Enum 정의

```typescript
// Node Type Enum
export enum NodeType {
  // File & Resource
  File = "file",
  ExternalResource = "external-resource",
  MissingFile = "missing-file",
  Library = "library",
  Package = "package",

  // Code Symbols (from SymbolKind)
  Class = "class",
  Interface = "interface",
  Function = "function",
  Method = "method",
  Property = "property",
  Field = "field",
  Variable = "variable",
  Constant = "constant",
  Type = "type",
  Enum = "enum",
  EnumMember = "enum-member",
  Constructor = "constructor",

  // Declarations
  Export = "export",
  Import = "import",

  // Documentation
  HeadingSymbol = "heading-symbol",
  Symbol = "symbol",

  // Error Types
  FileNotFound = "file_not_found",
  BrokenReference = "broken_reference"
}

// Edge Type Enum (이미 schema.sql에 정의됨)
export enum EdgeType {
  // Structural
  Contains = "contains",
  Declares = "declares",
  BelongsTo = "belongs_to",

  // Dependency
  DependsOn = "depends_on",
  Imports = "imports",
  ImportsLibrary = "imports_library",
  ImportsFile = "imports_file",
  ExportsTo = "exports_to",

  // Execution
  Calls = "calls",
  Instantiates = "instantiates",
  Uses = "uses",
  Accesses = "accesses",

  // Type System
  Extends = "extends",
  Implements = "implements",
  HasType = "has_type",
  Returns = "returns",
  Throws = "throws",

  // Modification
  Overrides = "overrides",
  Shadows = "shadows",
  AssignsTo = "assigns_to",

  // Documentation
  MdLink = "md-link",
  MdImage = "md-image",
  MdWikilink = "md-wikilink",
  MdSymbolRef = "md-symbol-ref",
  MdInclude = "md-include",
  MdCodeRef = "md-code-ref",
  MdAnchor = "md-anchor",
  MdHashtag = "md-hashtag",
  MdContainsHeading = "md-contains-heading",

  // Meta
  AnnotatedWith = "annotated_with",
  References = "references"
}
```

### Type Validation

```typescript
// Node Type 검증
export function isValidNodeType(type: string): type is NodeType {
  return Object.values(NodeType).includes(type as NodeType);
}

// Edge Type 검증
export function isValidEdgeType(type: string): type is EdgeType {
  return Object.values(EdgeType).includes(type as EdgeType);
}

// Semantic Tags 추천
export function getRecommendedSemanticTags(nodeType: NodeType): string[] {
  const recommendations: Record<NodeType, string[]> = {
    [NodeType.Class]: ["code/implementation", "code/abstract"],
    [NodeType.Interface]: ["code/interface", "spec/contract"],
    [NodeType.Function]: ["code/utility", "quality/pure"],
    [NodeType.File]: ["arch/*", "domain/*"],
    [NodeType.HeadingSymbol]: ["doc/*", "arch/*", "spec/*"],
    // ... 나머지 매핑
  };

  return recommendations[nodeType] || [];
}
```

## Type 계층 구조

### Node Type 계층

```
Node Types
├── File & Resource
│   ├── file
│   ├── external-resource
│   ├── missing-file
│   ├── library
│   └── package
├── Code Symbols
│   ├── class
│   ├── interface
│   ├── function
│   ├── method
│   ├── property
│   ├── field
│   ├── variable
│   ├── constant
│   ├── type
│   ├── enum
│   ├── enum-member
│   └── constructor
├── Declarations
│   ├── export
│   └── import
├── Documentation
│   ├── heading-symbol
│   └── symbol
└── Error Types
    ├── file_not_found
    └── broken_reference
```

### Edge Type 계층

```
Edge Types
├── Structural
│   ├── contains (transitive, inheritable)
│   ├── declares (inheritable)
│   └── belongs_to (transitive)
├── Dependency
│   ├── depends_on (transitive) [parent]
│   ├── imports → depends_on
│   ├── imports_library
│   ├── imports_file
│   └── exports_to
├── Execution
│   ├── calls → depends_on
│   ├── instantiates → depends_on
│   ├── uses → depends_on
│   └── accesses → depends_on
├── Type System
│   ├── extends → depends_on (inheritable)
│   ├── implements → depends_on (inheritable)
│   ├── has_type
│   ├── returns
│   └── throws
├── Modification
│   ├── overrides
│   ├── shadows
│   └── assigns_to
├── Documentation
│   ├── md-link (transitive)
│   ├── md-image
│   ├── md-wikilink (transitive)
│   ├── md-symbol-ref (transitive)
│   ├── md-include (transitive)
│   ├── md-code-ref
│   ├── md-anchor
│   ├── md-hashtag
│   └── md-contains-heading (hierarchical)
└── Meta
    ├── annotated_with
    └── references → depends_on
```

## Best Practices

### 1. Type 선택 가이드

**✅ Good**
```typescript
// 구체적이고 명확한 타입 사용
{
  type: "class",
  semanticTags: ["code/implementation", "arch/service"]
}

// 계층 구조 활용
{
  type: "method",
  semanticTags: ["access/public", "quality/async"]
}
```

**❌ Avoid**
```typescript
// 너무 일반적인 타입
{
  type: "code",  // ❌ 구체적이지 않음
  semanticTags: ["something"]
}

// Type과 중복되는 semantic tag
{
  type: "class",
  semanticTags: ["class", "code/class"]  // ❌ 중복
}
```

### 2. Type 확장 전략

새로운 도메인 특화 타입 추가:
```typescript
// 커스텀 Node Type 확장
export enum CustomNodeType {
  Component = "component",      // React 컴포넌트
  Hook = "hook",                // React Hook
  Middleware = "middleware",    // Express 미들웨어
  Model = "model",              // 데이터 모델
  Controller = "controller"     // 컨트롤러
}

// Semantic Tags로 추가 컨텍스트
{
  type: "component",
  semanticTags: ["arch/frontend", "pattern/container", "access/public"]
}
```

### 3. Migration Strategy

기존 string 타입을 Enum으로 전환:
```typescript
// Before
const node = {
  type: "class",  // string
  // ...
};

// After
const node = {
  type: NodeType.Class,  // enum
  // ...
};
```

## 참고

- **Type은 필수**: 모든 Node와 Edge는 반드시 type을 가져야 함
- **Semantic Tags는 선택**: type의 추가 컨텍스트를 제공하는 보조 수단
- **확장 가능**: 프로젝트 요구사항에 따라 새 타입 추가 가능
- **일관성 유지**: 타입 네이밍은 일관된 규칙 적용 (소문자, 하이픈 구분)

---

*Last Updated: 2025-10-03*
