# 타입 관리 시스템 (Type Management System)

**Category**: Core System
**Status**: ✅ Production Ready
**Version**: 3.1.0

---

## 🎯 개요

dependency-linker의 타입 시스템은 **노드 타입(Node Type)**과 **엣지 타입(Edge Type)**으로 구성되며, 의존성 분석을 위한 핵심 컨벤션을 제공합니다.

### 핵심 원칙
> **"Flat Structure, Unlimited Expansion"**
>
> 계층 구조 없이 필요한 타입을 자유롭게 추가

---

## 📋 노드 타입 (Node Type)

### 역할
**RDF 주소의 Fragment Identifier**로 사용되어 심볼의 종류를 식별합니다.

```
dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse
                                                   ^^^^^^
                                                노드 타입
```

### 정의 위치
**파일**: `src/database/core/NodeIdentifier.ts`

```typescript
export type NodeType =
  | "file"
  | "directory"
  | "class"
  | "interface"
  | "method"
  | "function"
  | "variable"
  | "constant"
  | "property"
  | "parameter"
  | "import"
  | "export"
  | "namespace"
  | "type"
  | "enum"
  | "library"
  | "module"
  | "package"
  | "heading"
  | "unknown";
```

### 분류

#### Code Symbols
- `class`, `interface`, `method`, `function`
- 실제 코드에 정의된 심볼

#### Declarations
- `variable`, `constant`, `property`, `parameter`
- 선언문으로 정의된 요소

#### Resources
- `file`, `directory`, `module`, `package`, `library`
- 파일 시스템 및 외부 리소스

#### Documentation
- `heading`
- 마크다운 문서의 헤딩

#### Special
- `unknown`
- **코드 심볼 식별용**: 메서드, 클래스 등 코드 심볼을 나타냄
- 외부 임포트 시 정의 위치를 모를 때 사용
- 정의된 규칙 기반으로 동작 (항상 일관된 방식)

---

## 🔗 엣지 타입 (Edge Type)

### 역할
**의존성 분석을 위한 관계 정의**를 표현합니다.

```
dependency-linker/src/parsers/Example.ts
    > used >
dependency-linker/src/parsers/TypeScriptParser.ts#Unknown:parse
  ^^^^^^
엣지 타입
```

### 정의 위치
**파일**: `src/database/inference/EdgeTypeRegistry.ts`

```typescript
export interface EdgeTypeDefinition {
  type: string;              // 엣지 타입 이름
  description: string;       // 설명
  schema: Record<string, any>;
  isDirected: boolean;
  isTransitive: boolean;     // 추론 속성: A→B, B→C ⇒ A→C
  isInheritable: boolean;    // 상속 속성
  priority: number;
}
```

### 핵심 엣지 타입

#### Structural (구조적)
```typescript
"contains"     // A contains B
"declares"     // A declares B
"belongs_to"   // A belongs to B
```

#### Dependency (의존성)
```typescript
"depends_on"      // 최상위 의존성 관계
"imports"         // 파일 임포트
"calls"           // 메서드 호출
"references"      // 참조
"extends"         // 클래스 상속
"implements"      // 인터페이스 구현
"uses"            // 사용
"instantiates"    // 인스턴스 생성
```

#### Type Relationships (타입 관계)
```typescript
"has_type"     // 변수/파라미터 타입
"returns"      // 함수 반환 타입
"throws"       // 예외 타입
```

#### Unknown System (Unknown 노드 관계)
```typescript
"aliasOf"          // Alias 관계
"imports_library"  // 외부 라이브러리 임포트
"imports_file"     // 로컬 파일 임포트
```

---

## 🚀 의존성 분석 프로세스

### Step 1: 심볼 선언 위치 파싱

**입력**:
```typescript
// TypeScriptParser.ts
export class TypeScriptParser {
  parse(code: string) { ... }
}
```

**생성되는 노드**:
```
dependency-linker/src/parsers/TypeScriptParser.ts#Class:TypeScriptParser
dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse
```

### Step 2: 외부 임포트 파싱 (Unknown 노드)

**입력**:
```typescript
// Example.ts
import { TypeScriptParser } from './TypeScriptParser';

const parser = new TypeScriptParser();
parser.parse(code);
```

**생성되는 노드**:
```
dependency-linker/src/parsers/TypeScriptParser.ts#Unknown:TypeScriptParser
dependency-linker/src/parsers/TypeScriptParser.ts#Unknown:parse
```

**노드 이름 구조**:
- Unknown 노드의 `name`은 심볼 이름만 포함 (예: "parse", "TypeScriptParser")
- 항상 **정의된 규칙**에 따라 생성:
  1. Import/require 문에서 심볼 추출
  2. 타겟 파일의 RDF 주소 + `#Unknown:심볼이름` 형식
  3. 코드 심볼 식별이 목적 (메서드, 클래스 등)

**생성되는 엣지**:
```
Example.ts > used > TypeScriptParser.ts#Unknown:TypeScriptParser
Example.ts > instantiates > TypeScriptParser.ts#Unknown:TypeScriptParser
Example.ts > calls > TypeScriptParser.ts#Unknown:parse
```

### Step 3: Unknown → 실제 타입 연결 (정의된 규칙 기반)

**자동 추론 과정**:
```
1. Unknown:parse 노드 발견
   - sourceFile: "src/parsers/TypeScriptParser.ts"
   - name: "parse" (심볼 이름만)

2. 같은 sourceFile에서 같은 name의 실제 타입 노드 검색

3. Method:parse 노드 발견
   - sourceFile: "src/parsers/TypeScriptParser.ts"
   - name: "parse"
   - type: "method"

4. Unknown:parse --resolvedTo--> Method:parse 연결 생성
```

**결과**:
```
Unknown:parse --resolvedTo--> Method:parse (isInferred: true)
```

**매칭 규칙 (정의된 규칙)**:
1. ✅ 같은 `sourceFile` (파일 위치 일치)
2. ✅ 같은 `name` (심볼 이름 일치)
3. ✅ `type` ≠ "unknown" (실제 타입 노드만)
4. ✅ 우선순위: class > function > method > variable (심볼 종류)

### Step 4: Alias 처리 (aliasOf 엣지)

**입력**:
```typescript
// Example.ts
import { User as UserType } from './types';
```

**생성되는 노드**:
```
1. dependency-linker/src/types.ts#Unknown:User (original)
2. dependency-linker/src/Example.ts#Unknown:UserType (alias)
```

**생성되는 엣지**:
```
UserType --aliasOf--> User
```

**Alias 체인 해소**:
```
UserType --aliasOf--> User --resolvedTo--> Class:User
                             ^^^^^^^^^^^
                           이름 기반 매칭
```

---

## 📊 타입 추가 프로세스

### 새 노드 타입 추가

**Step 1**: `NodeIdentifier.ts` 업데이트
```typescript
export type NodeType =
  | "file"
  | "class"
  | "method"
  | "new_node_type";  // ✅ 추가
```

**Step 2**: RDF 주소에서 사용
```typescript
const identifier = nodeIdentifier.createIdentifier(
  "new_node_type",
  "SymbolName",
  context
);

// 결과: "dependency-linker/src/file.ts#NewNodeType:SymbolName"
```

### 새 엣지 타입 추가

**Step 1**: `EdgeTypeRegistry.ts` 업데이트
```typescript
static readonly EXTENDED_TYPES: EdgeTypeDefinition[] = [
  {
    type: "new_edge_type",
    description: "New relationship type",
    schema: {},
    isDirected: true,
    isTransitive: false,
    isInheritable: false,
    priority: 10,
  },
];
```

**Step 2**: GraphDB에서 사용
```typescript
await db.upsertRelationship({
  fromNodeId: node1.id,
  toNodeId: node2.id,
  type: "new_edge_type",
  label: "Node1 has new relationship with Node2"
});
```

---

## 🔍 타입 조회 API

### 노드 타입
```typescript
import type { NodeType } from './database/core/NodeIdentifier';

const validTypes: NodeType[] = [
  "file", "class", "method", "function", "unknown"
];
```

### 엣지 타입
```typescript
import { EdgeTypeRegistry } from './database/inference/EdgeTypeRegistry';

// 모든 엣지 타입
const allEdgeTypes = EdgeTypeRegistry.getAll();

// 특정 엣지 타입
const callsType = EdgeTypeRegistry.get("calls");
console.log(callsType.isTransitive);  // false
```

---

## 📝 타입 관리 체크리스트

### 노드 타입 추가 시
- [ ] `NodeIdentifier.ts`의 `NodeType` 타입 확장
- [ ] RDF 주소 형식 문서 업데이트 (`docs/rdf-addressing.md`)
- [ ] 파서에서 새 노드 타입 생성 로직 추가
- [ ] 테스트 작성 (RDF 주소 파싱, 검증)

### 엣지 타입 추가 시
- [ ] `EdgeTypeRegistry.ts`의 `EXTENDED_TYPES` 배열 확장
- [ ] `isTransitive`, `isInheritable` 속성 정의
- [ ] 관계 생성 로직에서 사용
- [ ] 추론 엔진에 추론 규칙 추가 (필요 시)
- [ ] 테스트 작성 (관계 생성, 추론 검증)

### 문서 업데이트
- [ ] `docs/type-system.md` - 타입 분류표 업데이트
- [ ] `features/type-management/README.md` - 예제 추가
- [ ] `CHANGELOG.md` - 변경 사항 기록

---

## 🎓 핵심 개념

### 노드 타입 vs 엣지 타입

| 구분 | 노드 타입 | 엣지 타입 |
|------|-----------|-----------|
| **역할** | 심볼의 종류 식별 | 관계 정의 |
| **사용 위치** | RDF 주소 fragment | 의존성 그래프 엣지 |
| **예시** | `Method:`, `Class:`, `Unknown:` | `calls`, `imports`, `aliasOf` |
| **정의 파일** | `NodeIdentifier.ts` | `EdgeTypeRegistry.ts` |
| **확장 방식** | TypeScript union type | EdgeTypeRegistry 배열 추가 |

### Unknown 노드의 본질

**목적**: 코드 심볼(메서드, 클래스 등)을 식별하기 위해 존재

**3가지 역할**:
1. **코드 심볼 식별**: 메서드, 클래스, 함수 등 코드 요소 표현
2. **의존성 추적**: Import 관계를 그래프로 표현
3. **추론 대상**: 정의된 규칙 기반으로 실제 타입과 연결

**정의된 규칙 기반 매칭**:
- Unknown 노드는 항상 일관된 규칙으로 생성
- `sourceFile`과 `name` (심볼 이름)을 기준으로 실제 타입 노드 검색
- 같은 파일에서 같은 이름을 가진 실제 타입 노드를 찾아 `resolvedTo` 관계 생성
- 예: `Unknown:parse` → `Method:parse`
  - sourceFile: "TypeScriptParser.ts" (일치)
  - name: "parse" (일치)
  - type: "unknown" → "method" (연결)

### 관계 확장성

- ✅ **Flat 구조**: 계층 없이 자유롭게 추가
- ✅ **무제한 확장**: 추론에 필요한 관계를 계속 정의 가능
- ✅ **추론 속성**: `isTransitive`, `isInheritable`로 추론 동작 제어

---

## 🔗 관련 문서

- **Implementation Tasks**: [todos.md](./todos.md) - 향후 개선 사항 및 구현 계획
- **RDF Addressing**: [../rdf-addressing/README.md](../rdf-addressing/README.md)
- **Unknown Symbol System**: [../unknown-symbol-system/README.md](../unknown-symbol-system/README.md)
- **Inference System**: [../inference-system/README.md](../inference-system/README.md)
- **Type System Spec**: [../../docs/type-system.md](../../docs/type-system.md)

---

**Last Updated**: 2025-10-05
**Version**: 3.1.0
**Status**: ✅ Production Ready
