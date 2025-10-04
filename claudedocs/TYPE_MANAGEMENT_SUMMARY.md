# 타입 관리 컨벤션 요약 보고서

**작성일**: 2025-10-05
**요청자**: User
**작업 범위**: Edge Type & Node Type 관리 컨벤션 조사 및 문서화

---

## 🎯 요청 사항

> "edge type 같은 추론에 필요한 관계 요소들과 노드 타입 같은 것을 리스트업하고 관리해줘야해 해당 컨벤션이 존재함?"

---

## ✅ 결론

**타입 관리 컨벤션이 명확히 존재합니다.**

### 핵심 구조
1. **노드 타입 (Node Type)**: RDF addressing의 fragment identifier
2. **엣지 타입 (Edge Type)**: 의존성 분석을 위한 관계 정의
3. **Flat 구조**: 계층 없이 자유롭게 확장 가능

---

## 📋 주요 발견 사항

### 1. 노드 타입 시스템

**정의 위치**: `src/database/core/NodeIdentifier.ts`

**역할**: 심볼의 종류를 RDF 주소로 식별
```typescript
// RDF 주소 형식
"dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"
//                                                  ^^^^^^ 노드 타입
```

**타입 목록**:
- Code Symbols: `class`, `method`, `function`, `interface`
- Declarations: `variable`, `constant`, `property`, `parameter`
- Resources: `file`, `directory`, `module`, `package`, `library`
- Documentation: `heading`
- Special: `unknown` (외부 임포트, 정의 위치 모름)

### 2. 엣지 타입 시스템

**정의 위치**: `src/database/inference/EdgeTypeRegistry.ts`

**역할**: 의존성 분석을 위한 관계 정의
```typescript
// 관계 정의 예시
Example.ts > used > TypeScriptParser.ts#Unknown:parse
           ^^^^^^ 엣지 타입
```

**핵심 엣지 타입**:
- Structural: `contains`, `declares`, `belongs_to`
- Dependency: `depends_on`, `imports`, `calls`, `references`, `extends`, `implements`, `uses`, `instantiates`
- Type: `has_type`, `returns`, `throws`
- Assignment: `assigns_to`, `accesses`
- Inheritance: `overrides`, `shadows`, `annotated_with`
- Unknown System: `aliasOf`, `imports_library`, `imports_file`

**추론 속성**:
```typescript
interface EdgeTypeDefinition {
  isTransitive: boolean;     // A→B, B→C ⇒ A→C
  isInheritable: boolean;    // 부모-자식 상속 전파
  priority: number;          // 우선순위
}
```

### 3. 중요한 정정: parentType은 사용 안 함

**현재 상태**:
- `EdgeTypeRegistry.ts`에 `parentType` 필드 존재
- 실제로는 **사용하지 않음**
- Flat한 관계 타입 목록으로 관리
- 필요한 관계를 자유롭게 추가

**향후 계획**:
- parentType 필드 제거 예정
- 계층 관련 메서드 제거 (`getChildTypes`, `getHierarchyPath`)

---

## 🚀 실제 의존성 분석 프로세스

### Step 1: 심볼 선언 위치 파싱

**입력**:
```typescript
// TypeScriptParser.ts
export class TypeScriptParser {
  parse(code: string) { ... }
}
```

**생성 노드**:
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

**생성 노드**:
```
dependency-linker/src/parsers/TypeScriptParser.ts#Unknown:TypeScriptParser
```

**생성 엣지**:
```
Example.ts > used > TypeScriptParser.ts#Unknown:TypeScriptParser
Example.ts > instantiates > TypeScriptParser.ts#Unknown:TypeScriptParser
Example.ts > calls > TypeScriptParser.ts#Unknown:parse
```

### Step 3: Alias 처리 (aliasOf 엣지)

**입력**:
```typescript
// Example.ts
import { User as UserType } from './types';
```

**생성 노드**:
```
1. dependency-linker/src/types.ts#Unknown:User (original)
2. dependency-linker/src/Example.ts#Unknown:UserType (alias)
```

**생성 엣지**:
```
UserType --aliasOf--> User
```

---

## 📝 타입 추가 프로세스

### 새 노드 타입 추가
1. `NodeIdentifier.ts`의 `NodeType` union type 확장
2. RDF 주소 파싱 테스트 작성
3. `docs/rdf-addressing.md` 문서 업데이트

### 새 엣지 타입 추가
1. `EdgeTypeRegistry.ts`의 `EXTENDED_TYPES` 배열 확장
2. `isTransitive`, `isInheritable` 속성 정의
3. 관계 생성 로직에서 사용
4. 추론 엔진에 추론 규칙 추가 (필요 시)
5. `docs/type-system.md` 문서 업데이트

---

## 📚 생성된 문서

### 1. features/TYPE_MANAGEMENT.md (NEW)
**내용**:
- 노드 타입 vs 엣지 타입 명확한 구분
- 실제 의존성 분석 프로세스 상세 설명
- Unknown 노드의 역할과 Alias 처리
- 타입 추가 체크리스트
- 향후 개선 사항 (parentType 제거 계획)

**위치**: `/Users/junwoobang/project/dependency-linker/features/TYPE_MANAGEMENT.md`

### 2. features/index.md (UPDATED)
**변경 사항**:
- Production Ready 섹션에 "Type Management Convention" 추가
- Feature Documentation 섹션에 링크 추가

---

## 🔑 핵심 개념 정리

### 노드 타입 vs 엣지 타입

| 구분 | 노드 타입 | 엣지 타입 |
|------|-----------|-----------|
| **역할** | 심볼의 종류 식별 | 관계 정의 |
| **사용 위치** | RDF 주소 fragment | 의존성 그래프 엣지 |
| **예시** | `Method:`, `Class:`, `Unknown:` | `calls`, `imports`, `aliasOf` |
| **정의 파일** | `NodeIdentifier.ts` | `EdgeTypeRegistry.ts` |
| **확장 방식** | TypeScript union type | EdgeTypeRegistry 배열 추가 |

### Unknown 노드의 3가지 역할
1. **임시 플레이스홀더**: 정의 위치를 모를 때 생성
2. **의존성 추적**: Import 관계를 그래프로 표현
3. **추론 대상**: 나중에 실제 타입으로 연결

### 관계 확장성
- ✅ **Flat 구조**: 계층 없이 자유롭게 추가
- ✅ **무제한 확장**: 추론에 필요한 관계를 계속 정의 가능
- ✅ **추론 속성**: `isTransitive`, `isInheritable`로 추론 동작 제어

---

## 🔗 관련 문서 체인

```
features/TYPE_MANAGEMENT.md (컨벤션 정의)
    ↓ 사용
features/rdf-addressing/ (노드 타입 활용)
    ↓ 연동
features/unknown-symbol-system/ (Unknown 노드 & Alias)
    ↓ 기반
features/inference-system/ (엣지 타입 추론)
    ↓ 통합
docs/type-system.md (전체 타입 시스템)
```

---

## 🎓 학습 포인트

### 사용자 정정 사항
1. **parentType은 없어**: EdgeTypeRegistry에 정의되어 있지만 실제로는 사용 안 함
2. **노드 타입 = RDF fragment identifier**: `Method:`, `Class:`, `Unknown:` 등
3. **엣지 타입 = 관계 정의**: `used`, `calls`, `imports`, `aliasOf` 등
4. **Unknown 노드의 본질**:
   - 코드 심볼(메서드, 클래스 등)을 식별하기 위해 존재
   - name은 심볼 이름만 포함 (예: "parse")
   - 항상 정의된 규칙 기반으로 동작
5. **RDF의 양방향 동작**:
   - **파싱**: 코드 → RDF 주소 생성
   - **검색**: RDF 주소 → 파일 위치 찾기
   - 둘 다 구현되어야 완전한 시스템

### 시스템 이해
- **Flat Structure, Unlimited Expansion**: 계층 없이 필요한 관계를 자유롭게 추가
- **추론 속성 기반**: `isTransitive`, `isInheritable`로 추론 동작 제어
- **점진적 분석**: Unknown 노드로 시작, 정의된 규칙으로 실제 타입과 연결
- **RDF 기반 검색**: RDF 주소로 심볼의 파일 위치를 찾을 수 있어야 함

---

## ✅ 작업 완료 사항

1. ✅ 타입 관리 컨벤션 조사 완료
2. ✅ EdgeTypeRegistry 분석 (parentType 미사용 확인)
3. ✅ NodeIdentifier 분석 (RDF addressing 연동)
4. ✅ Unknown Symbol System 분석 (Dual-Node Pattern)
5. ✅ 실제 의존성 분석 프로세스 문서화
6. ✅ **Unknown 노드 본질 명확화** (코드 심볼 식별용, 정의된 규칙 기반)
7. ✅ **RDF 양방향 동작 문서화** (파싱 + 검색)
8. ✅ features/type-management/ 디렉토리 생성
   - README.md (컨벤션 정의)
   - todos.md (8개 구현 태스크, Phase 2에 RDF 검색 추가)
9. ✅ features/index.md 업데이트
10. ✅ 종합 보고서 작성 및 업데이트 (본 문서)

---

**Last Updated**: 2025-10-05
**Status**: ✅ Complete
**Next Steps**:
- **Phase 2 Task 2.1**: RDF 기반 검색 시스템 구현 (High Priority)
  - RdfSearchEngine 클래스 생성
  - RDF 주소 → 파일 위치 + 심볼 정의 위치 찾기
  - CLI 명령어: `find-symbol <rdf-address>`
- Inference System 개발 시 이 컨벤션 기반으로 추론 타입 확장
- parentType 제거 계획 수립 (EdgeTypeRegistry 리팩토링)
