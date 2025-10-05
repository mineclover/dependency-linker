# Edge Type Management

Edge type 계층 구조를 코드단에서 명확하게 관리하는 시스템

## 🎯 목적

1. **중앙 집중식 관리**: 모든 edge type 정의를 코드로 명확히 관리
2. **계층 구조 일관성**: parent-child 관계의 일관성 보장
3. **자동 검증**: 순환 참조, 존재하지 않는 parent 탐지
4. **schema.sql 동기화**: DB schema와 코드의 동기화 기준점 제공

## 📦 구조

### EdgeTypeRegistry

모든 edge type 정의의 중앙 레지스트리

```typescript
import { EdgeTypeRegistry } from './database/types/EdgeTypeRegistry';

// 모든 edge types 조회
const allTypes = EdgeTypeRegistry.getAll();

// Core types (schema.sql에 정의)
const coreTypes = EdgeTypeRegistry.getCoreTypes();

// Extended types (동적 등록 필요)
const extendedTypes = EdgeTypeRegistry.getExtendedTypes();
```

## 🏗️ Edge Type 분류

### 1. Core Types (20개)

schema.sql에 INSERT 문으로 정의된 기본 타입들

```sql
-- schema.sql
INSERT INTO edge_types (type, description, parent_type, is_transitive, is_inheritable) VALUES
  ('depends_on', 'General dependency relationship', NULL, TRUE, FALSE),
  ('imports', 'File imports another file', 'depends_on', FALSE, FALSE),
  ('calls', 'Method calls another method', 'depends_on', FALSE, FALSE),
  -- ...
```

**관리 원칙**:
- schema.sql과 EdgeTypeRegistry.CORE_TYPES가 **정확히 일치**해야 함
- 새로운 core type 추가 시 **두 곳 모두 수정** 필요

### 2. Extended Types (2개)

애플리케이션에서 동적으로 추가하는 타입들

```typescript
// EdgeTypeRegistry.EXTENDED_TYPES
static readonly EXTENDED_TYPES = [
  {
    type: 'imports_library',
    description: 'Imports external library or package',
    parentType: 'imports',
    // ...
  },
  {
    type: 'imports_file',
    description: 'Imports local file or module',
    parentType: 'imports',
    // ...
  }
];
```

**동적 등록**:
```typescript
// FileDependencyAnalyzer.ts
private async ensureEdgeTypes() {
  const typesToRegister = EdgeTypeRegistry.getTypesForDynamicRegistration();

  for (const edgeTypeDef of typesToRegister) {
    await this.database.createEdgeType(edgeTypeDef);
  }
}
```

## 🌳 계층 구조

### 주요 계층

```
depends_on (최상위 의존성)
  ├─ imports (파일 import)
  │   ├─ imports_library (라이브러리 import)
  │   └─ imports_file (로컬 파일 import)
  ├─ calls (메서드 호출)
  ├─ references (참조)
  ├─ extends (상속)
  ├─ implements (인터페이스 구현)
  ├─ uses (사용)
  ├─ instantiates (인스턴스 생성)
  └─ accesses (접근)

contains (포함 관계)
  └─ declares (선언)

belongs_to (소속)

exports_to (export)
```

### 계층 경로 조회

```typescript
const path = EdgeTypeRegistry.getHierarchyPath('imports_library');
// ['imports_library', 'imports', 'depends_on']
```

### 자식 타입 조회

```typescript
const children = EdgeTypeRegistry.getChildTypes('imports');
// [imports_library, imports_file]
```

## ✅ 검증

### 자동 검증

```typescript
const validation = EdgeTypeRegistry.validateHierarchy();

if (!validation.valid) {
  console.error('Errors:', validation.errors);
  // - "imports_library: parent type 'imports' does not exist"
  // - "circular: circular hierarchy detected"
}
```

### 검증 항목

1. **Parent 존재 확인**: parentType이 실제로 존재하는지
2. **순환 참조 방지**: A → B → A 같은 순환 구조 탐지
3. **타입 고유성**: 같은 type 이름 중복 방지

### 검증 데모 실행

```bash
npx ts-node examples/edge-type-validation-demo.ts
```

## 💡 추론 규칙

### Transitive (전이적)

**정의**: A→B, B→C이면 A→C도 성립

**Transitive Types**:
- `depends_on`
- `contains`
- `belongs_to`

**예시**:
```typescript
App.tsx --[depends_on]--> helpers.ts
helpers.ts --[depends_on]--> math.ts
⇒ App.tsx --[depends_on]--> math.ts (추론됨)
```

### Inheritable (상속 가능)

**정의**: parent(A,B), rel(B,C)이면 rel(A,C)도 성립

**Inheritable Types**:
- `contains`
- `declares`
- `extends`
- `implements`

**예시**:
```typescript
File --[contains]--> Class
Class --[contains]--> Method
⇒ File --[contains]--> Method (상속)
```

### Hierarchical (계층적)

**정의**: 자식 타입은 부모 타입을 암시

**예시**:
```typescript
A --[imports_library]--> B
⇒ A --[imports]--> B (암시)
⇒ A --[depends_on]--> B (암시)
```

## 🎯 실제 사용

### 1. 새로운 Analyzer 추가

```typescript
export class MethodAnalyzer {
  constructor(private database: GraphDatabase) {
    this.ensureEdgeTypes();
  }

  private async ensureEdgeTypes() {
    // 필요한 edge types를 EdgeTypeRegistry에 먼저 추가
    const methodTypes = [
      {
        type: 'calls_async',
        description: 'Async method call',
        parentType: 'calls',
        // ...
      }
    ];

    for (const edgeType of methodTypes) {
      await this.database.createEdgeType(edgeType);
    }
  }
}
```

**절차**:
1. `EdgeTypeRegistry.EXTENDED_TYPES`에 정의 추가
2. `getTypesForDynamicRegistration()`이 반환하도록 수정
3. Analyzer에서 자동 등록

### 2. 쿼리 작성

```typescript
// 세밀한 쿼리 - 라이브러리 import만
const libraryImports = await db.getEdgesByType('imports_library');

// 중간 쿼리 - 모든 import (라이브러리 + 파일)
const allImports = await db.getEdgesByType('imports');

// 광범위 쿼리 - 모든 의존성 (import + call + reference + ...)
const allDeps = await db.getEdgesByType('depends_on');
```

### 3. 계층 추론 활용

```sql
-- imports의 모든 자식 타입 포함 쿼리
WITH RECURSIVE edge_hierarchy AS (
  SELECT type FROM edge_types WHERE type = 'imports'
  UNION ALL
  SELECT et.type
  FROM edge_types et
  JOIN edge_hierarchy eh ON et.parent_type = eh.type
)
SELECT * FROM edges
WHERE type IN (SELECT type FROM edge_hierarchy);
```

## 📋 관리 체크리스트

### 새로운 Core Type 추가 시

- [ ] `schema.sql`의 INSERT 문에 추가
- [ ] `EdgeTypeRegistry.CORE_TYPES`에 추가
- [ ] 계층 구조 검증 (`validateHierarchy()`)
- [ ] 테스트 작성

### 새로운 Extended Type 추가 시

- [ ] `EdgeTypeRegistry.EXTENDED_TYPES`에 추가
- [ ] Parent type이 존재하는지 확인
- [ ] 계층 구조 검증
- [ ] 해당 Analyzer에서 등록 로직 구현
- [ ] 테스트 작성

### 기존 Type 수정 시

- [ ] schema.sql과 EdgeTypeRegistry 동기화
- [ ] 마이그레이션 스크립트 작성 (필요 시)
- [ ] 기존 데이터 호환성 확인
- [ ] 테스트 업데이트

## 🚨 주의사항

### 1. schema.sql과 동기화

**문제**: schema.sql과 EdgeTypeRegistry가 불일치하면 혼란 발생

**해결**:
```typescript
// 검증 스크립트 실행
npx ts-node examples/edge-type-validation-demo.ts

// Core types 수가 일치하는지 확인
const coreTypes = EdgeTypeRegistry.getCoreTypes();
// → 20개 (schema.sql의 INSERT 문과 일치해야 함)
```

### 2. Parent Type 존재 확인

**문제**: 존재하지 않는 parent를 참조하면 계층 구조 깨짐

**해결**:
```typescript
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  throw new Error(`Invalid hierarchy: ${validation.errors.join(', ')}`);
}
```

### 3. 순환 참조 방지

**문제**: A → B → C → A 같은 순환 구조는 무한 루프 발생

**해결**: `validateHierarchy()`가 자동으로 탐지

```typescript
// 잘못된 예시
{
  type: 'typeA',
  parentType: 'typeB'
},
{
  type: 'typeB',
  parentType: 'typeA'  // ❌ 순환!
}
```

## 📊 통계

- **Total Edge Types**: 22개
- **Core Types**: 20개 (schema.sql)
- **Extended Types**: 2개 (동적 등록)
- **Transitive Types**: 3개
- **Inheritable Types**: 4개
- **최대 계층 깊이**: 3단계 (depends_on → imports → imports_library)

## 🔗 관련 파일

- `src/database/types/EdgeTypeRegistry.ts` - Edge type 정의
- `src/database/schema.sql` - DB schema
- `src/database/services/FileDependencyAnalyzer.ts` - 사용 예시
- `examples/edge-type-validation-demo.ts` - 검증 데모
- `examples/relationship-inference-demo.ts` - 추론 데모

## 📚 참고

### 계층 구조 시각화

```bash
npx ts-node examples/edge-type-validation-demo.ts
```

### 실제 추론 데모

```bash
npx ts-node examples/relationship-inference-demo.ts
```

### Edge Type 추가 가이드

1. 타입이 Core인지 Extended인지 결정
2. EdgeTypeRegistry에 정의 추가
3. Parent type 설정 (계층 구조)
4. 추론 규칙 설정 (transitive, inheritable)
5. 검증 실행
6. 필요한 Analyzer에서 등록 로직 구현