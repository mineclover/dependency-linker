# Analyzer Ownership Pattern

## 개요

각 Analyzer는 자신이 생성/관리하는 edge type을 명시적으로 선언하여, 파일 재분석 시 다른 Analyzer의 관계를 보존하면서 자신의 관계만 정확히 업데이트합니다.

## 핵심 원칙

### 1. **Edge Type 소유권 명시**

각 Analyzer는 `OWNED_EDGE_TYPES` 상수로 관리하는 edge type을 선언합니다.

```typescript
export class FileDependencyAnalyzer {
  /**
   * 이 Analyzer가 소유하고 관리하는 edge types
   * cleanup 시 이 타입들만 삭제하여 다른 Analyzer의 관계는 보존
   */
  private static readonly OWNED_EDGE_TYPES = [
    'imports_library',
    'imports_file'
  ];
}
```

### 2. **source_file 기반 정확한 삭제**

`edges` 테이블에 `source_file` 컬럼을 포함하여 특정 파일의 특정 타입 관계만 삭제 가능:

```sql
-- FileDependencyAnalyzer가 App.tsx를 재분석할 때
DELETE FROM edges
WHERE source_file = '/src/App.tsx'
  AND type IN ('imports_library', 'imports_file');

-- 다른 Analyzer의 관계는 그대로 유지됨
-- type IN ('calls', 'extends', 'has_type') 등은 삭제되지 않음
```

### 3. **Analyzer별 Cleanup 메서드**

```typescript
private async cleanupExistingDependencies(filePath: string): Promise<void> {
  // 이 Analyzer가 소유한 edge types만 정확히 삭제
  const deletedCount = await this.database.cleanupRelationshipsBySourceAndTypes(
    filePath,
    FileDependencyAnalyzer.OWNED_EDGE_TYPES
  );
}
```

## 구현 가이드

### 새로운 Analyzer 추가 시

#### 1. Edge Type 소유권 선언

```typescript
export class MethodCallAnalyzer {
  /**
   * 이 Analyzer가 소유하고 관리하는 edge types
   */
  private static readonly OWNED_EDGE_TYPES = [
    'calls',
    'calls_async',
    'calls_recursive'
  ];
}
```

#### 2. Cleanup 로직 구현

```typescript
async analyzeFile(filePath: string, language: SupportedLanguage, callSources: CallSource[]) {
  // 1. 이 Analyzer가 소유한 관계만 삭제
  await this.cleanupExistingDependencies(filePath);

  // 2. 새로운 관계 생성
  const relationships = await this.createCallRelationships(...);

  return result;
}

private async cleanupExistingDependencies(filePath: string): Promise<void> {
  await this.database.cleanupRelationshipsBySourceAndTypes(
    filePath,
    MethodCallAnalyzer.OWNED_EDGE_TYPES
  );
}
```

#### 3. Relationship 생성 시 sourceFile 포함

```typescript
const relationship: GraphRelationship = {
  fromNodeId: callerNode.id,
  toNodeId: calleeNode.id,
  type: 'calls',
  label: `calls ${calleeNode.name}`,
  metadata: { ... },
  weight: 1.0,
  sourceFile: callerNode.sourceFile  // 필수!
};

await this.database.upsertRelationship(relationship);
```

## 병렬 실행 안전성

### 같은 파일을 여러 Analyzer가 동시에 분석

```typescript
const file = '/src/App.tsx';

// 각 Analyzer가 자신의 edge types만 관리하므로 안전
await Promise.all([
  fileDependencyAnalyzer.analyzeFile(file, lang, imports),
  // → imports_library, imports_file 삭제/생성

  methodCallAnalyzer.analyzeFile(file, lang, calls),
  // → calls, calls_async, calls_recursive 삭제/생성

  classAnalyzer.analyzeFile(file, lang, extends),
  // → extends, implements 삭제/생성

  typeAnalyzer.analyzeFile(file, lang, types)
  // → has_type, returns, throws 삭제/생성
]);
```

### 결과

- ✅ 각 Analyzer는 자신의 관계만 업데이트
- ✅ 다른 Analyzer의 관계는 보존됨
- ✅ 잔여 관계 없음
- ✅ 데이터 일관성 보장

## 부분 업데이트 시나리오

### 시나리오 1: import만 변경

```typescript
// App.tsx의 import 구문만 수정됨
await fileDependencyAnalyzer.analyzeFile('/src/App.tsx', 'typescript', newImports);

// 결과:
// ✅ imports_library, imports_file 관계 업데이트됨
// ✅ calls, extends, has_type 등 다른 관계는 그대로 유지
```

### 시나리오 2: 메서드 호출만 변경

```typescript
// App.tsx의 메서드 호출만 수정됨
await methodCallAnalyzer.analyzeFile('/src/App.tsx', 'typescript', newCalls);

// 결과:
// ✅ calls 관련 관계만 업데이트됨
// ✅ imports, extends, has_type 등은 그대로 유지
```

## Edge Type 소유권 매핑

| Analyzer | Owned Edge Types | 설명 |
|----------|------------------|------|
| FileDependencyAnalyzer | `imports_library`, `imports_file` | 파일 import 관계 |
| MethodCallAnalyzer | `calls`, `calls_async`, `calls_recursive` | 메서드 호출 관계 |
| ClassAnalyzer | `extends`, `implements` | 클래스 상속/구현 관계 |
| TypeAnalyzer | `has_type`, `returns`, `throws` | 타입 관계 |
| StructureAnalyzer | `contains`, `declares` | 구조적 관계 |
| PropertyAnalyzer | `accesses`, `assigns_to` | 속성 접근 관계 |

## GraphDatabase API

### cleanupRelationshipsBySourceAndTypes

```typescript
/**
 * Analyzer별 관계 정리
 * @param sourceFile - 분석 대상 파일 경로
 * @param edgeTypes - 삭제할 edge type 목록 (Analyzer 소유)
 * @returns 삭제된 관계 수
 */
async cleanupRelationshipsBySourceAndTypes(
  sourceFile: string,
  edgeTypes: string[]
): Promise<number>
```

**SQL 구현:**
```sql
DELETE FROM edges
WHERE source_file = ?
  AND type IN (?, ?, ...)
```

**인덱스:**
```sql
CREATE INDEX idx_edges_source_file_type ON edges (source_file, type);
```

## 검증 방법

### 1. 단일 Analyzer 검증

```typescript
// Before
const beforeEdges = await db.getEdgesByType('imports_library');
console.log(`Before: ${beforeEdges.length} import edges`);

// Analyze
await fileDependencyAnalyzer.analyzeFile(file, lang, imports);

// After
const afterEdges = await db.getEdgesByType('imports_library');
console.log(`After: ${afterEdges.length} import edges`);

// 다른 타입 확인
const callEdges = await db.getEdgesByType('calls');
console.log(`Calls unchanged: ${callEdges.length}`);
```

### 2. 병렬 Analyzer 검증

```typescript
const file = '/src/App.tsx';

// 초기 상태
const initialStats = await db.getStatistics();

// 병렬 분석
await Promise.all([
  fileDependencyAnalyzer.analyzeFile(file, lang, imports),
  methodCallAnalyzer.analyzeFile(file, lang, calls),
  classAnalyzer.analyzeFile(file, lang, extends)
]);

// 결과 확인
const finalStats = await db.getStatistics();

// 각 타입별로 정확히 업데이트되었는지 확인
console.log('imports_library:', finalStats.relationshipsByType['imports_library']);
console.log('calls:', finalStats.relationshipsByType['calls']);
console.log('extends:', finalStats.relationshipsByType['extends']);
```

### 3. 잔여 관계 검증

```typescript
// 파일 삭제 후 해당 파일의 모든 관계가 정리되었는지 확인
const fileNode = await db.findNodes({ sourceFiles: ['/src/deleted.tsx'] });
const edges = await db.findRelationships({
  relationshipTypes: FileDependencyAnalyzer.OWNED_EDGE_TYPES
});

// sourceFile이 '/src/deleted.tsx'인 edge가 없어야 함
const remainingEdges = edges.filter(e =>
  e.metadata?.sourceFile === '/src/deleted.tsx'
);

console.assert(remainingEdges.length === 0, 'No residual relationships');
```

## 마이그레이션 가이드

### 기존 데이터베이스 마이그레이션

기존에 `source_file` 없이 생성된 edges가 있다면:

```sql
-- 1. source_file 컬럼 추가 (NOT NULL 제약 없이)
ALTER TABLE edges ADD COLUMN source_file TEXT;

-- 2. start_node_id에서 source_file 복사
UPDATE edges
SET source_file = (
  SELECT source_file
  FROM nodes
  WHERE nodes.id = edges.start_node_id
);

-- 3. NULL 값 확인
SELECT COUNT(*) FROM edges WHERE source_file IS NULL;

-- 4. NOT NULL 제약 추가 (선택사항)
-- SQLite는 기존 컬럼에 NOT NULL 추가 불가능
-- 새 테이블 생성 후 데이터 복사 필요
```

## 주의사항

### ⚠️ 반드시 지켜야 할 것

1. **모든 Analyzer는 OWNED_EDGE_TYPES 선언 필수**
   ```typescript
   private static readonly OWNED_EDGE_TYPES = ['type1', 'type2'];
   ```

2. **Relationship 생성 시 sourceFile 필수**
   ```typescript
   const relationship: GraphRelationship = {
     // ...
     sourceFile: sourceNode.sourceFile  // 필수!
   };
   ```

3. **cleanupRelationshipsBySourceAndTypes 사용**
   ```typescript
   // ❌ 잘못된 방법
   await this.database.cleanupFileDependencies(filePath);

   // ✅ 올바른 방법
   await this.database.cleanupRelationshipsBySourceAndTypes(
     filePath,
     MyAnalyzer.OWNED_EDGE_TYPES
   );
   ```

### ❌ 하지 말아야 할 것

1. **다른 Analyzer의 edge type 사용 금지**
   ```typescript
   // ❌ FileDependencyAnalyzer에서 'calls' 타입 생성
   const relationship = { type: 'calls', ... };  // 금지!
   ```

2. **전체 edge 삭제 금지**
   ```typescript
   // ❌ 모든 edge 삭제
   await db.deleteNodeRelationships(nodeId, 'both');
   ```

3. **source_file 누락 금지**
   ```typescript
   // ❌ sourceFile 없이 생성
   const relationship: GraphRelationship = {
     fromNodeId: 1,
     toNodeId: 2,
     type: 'imports',
     // sourceFile 누락!
   };
   ```

## 참고 자료

- [Edge Type Registry](./edge-type-management.md) - Edge type 계층 구조 관리
- [GraphDatabase API](../src/database/GraphDatabase.ts) - 데이터베이스 API
- [FileDependencyAnalyzer](../src/database/services/FileDependencyAnalyzer.ts) - 참고 구현