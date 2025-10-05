# Inference Engine 사용 가이드

**버전**: 3.0.0
**업데이트**: 2025-10-02

## 목차
1. [개요](#개요)
2. [핵심 개념](#핵심-개념)
3. [시작하기](#시작하기)
4. [주요 기능](#주요-기능)
5. [실전 예제](#실전-예제)
6. [API 레퍼런스](#api-레퍼런스)
7. [모범 사례](#모범-사례)
8. [문제 해결](#문제-해결)

---

## 개요

InferenceEngine은 그래프 데이터베이스에서 **직접적으로 표현되지 않은 관계**를 추론하는 시스템입니다.

### 지원하는 추론 타입

1. **Hierarchical (계층적)** - 타입 계층 구조를 이용한 추론
2. **Transitive (전이적)** - A→B, B→C ⇒ A→C
3. **Inheritable (상속 가능)** - parent(A,B), rel(B,C) ⇒ rel(A,C)

### 주요 특징

✅ **SQL 기반 고성능** - Recursive CTE 활용
✅ **자동 캐싱** - 계산된 추론 자동 저장
✅ **순환 감지** - 무한 루프 방지
✅ **유연한 설정** - eager/lazy/manual 전략

---

## 핵심 개념

### Edge Type (관계 타입)

모든 관계는 타입을 가지며, 각 타입은 추론 규칙을 정의합니다:

```typescript
{
  type: 'depends_on',           // 타입 이름
  isTransitive: true,           // 전이적 추론 가능
  isInheritable: false,         // 상속 가능 추론 불가
  parentType: undefined,        // 부모 타입 (계층 구조)
}
```

### Inference Path (추론 경로)

추론된 관계는 경로 정보를 포함합니다:

```typescript
{
  fromNodeId: 1,
  toNodeId: 3,
  type: 'depends_on',
  path: {
    edgeIds: [10, 11],          // 1→2→3의 경로
    depth: 2,                    // 경로 깊이
    inferenceType: 'transitive', // 추론 타입
    description: 'A → B → C'     // 설명
  }
}
```

---

## 시작하기

### 설치

```bash
npm install @context-action/dependency-linker
```

### 기본 사용법

```typescript
import { createGraphDatabase } from '@context-action/dependency-linker';
import { InferenceEngine } from '@context-action/dependency-linker/database/inference';

// 1. 데이터베이스 생성
const db = createGraphDatabase('./graph.db');
await db.initialize();

// 2. InferenceEngine 생성
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy',
  defaultMaxPathLength: 10,
  enableCycleDetection: true,
});

// 3. 전이적 추론 실행
const nodeId = 1;
const inferences = await engine.queryTransitive(nodeId, 'depends_on');

// 4. 결과 확인
console.log(`Found ${inferences.length} inferred relationships`);
for (const inf of inferences) {
  console.log(`${inf.fromNodeId} → ${inf.toNodeId} (depth: ${inf.path.depth})`);
}
```

---

## 주요 기능

### 1. Transitive Inference (전이적 추론)

**A depends on B, B depends on C ⇒ A depends on C**

```typescript
// 기본 사용
const inferences = await engine.queryTransitive(nodeId, 'depends_on');

// 옵션 지정
const inferences = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 5,          // 최대 경로 길이
  detectCycles: true,        // 순환 감지 활성화
  relationshipTypes: ['depends_on', 'imports'], // 여러 타입 허용
});
```

**실제 예시: 파일 의존성 체인**
```typescript
// file1.ts imports file2.ts
// file2.ts imports file3.ts
// => file1.ts transitively depends on file3.ts

const file1Id = 101;
const deps = await engine.queryTransitive(file1Id, 'imports');

// 결과: file1 → file2 → file3
console.log(deps); // [{fromNodeId: 101, toNodeId: 103, path: {...}}]
```

---

### 2. Hierarchical Inference (계층적 추론)

**타입 계층 구조를 이용한 포괄 쿼리**

```typescript
// imports_library, imports_file 모두를 'imports'로 조회
const allImports = await engine.queryHierarchical('imports', {
  includeChildren: true,   // 자식 타입 포함
  includeParents: false,   // 부모 타입 제외
  maxDepth: 3,            // 최대 계층 깊이
});
```

**타입 계층 예시:**
```
depends_on (루트)
├─ imports
│  ├─ imports_library
│  └─ imports_file
├─ calls
└─ references
```

---

### 3. Inheritable Inference (상속 가능 추론)

**File contains Class, Class extends Base ⇒ File extends Base**

```typescript
const fileNodeId = 201;

const inherited = await engine.queryInheritable(
  fileNodeId,
  'contains',    // 부모 관계 타입
  'extends',     // 상속될 관계 타입
  {
    maxInheritanceDepth: 3
  }
);
```

**실제 예시:**
```typescript
// file1.ts contains MyClass
// MyClass extends BaseClass
// => file1.ts (transitively) extends BaseClass

// 이런 추론이 유용한 경우:
// - 파일 레벨 영향 분석
// - 컴파일 순서 결정
// - 빌드 의존성 계산
```

---

### 4. 캐시 관리

**자동 캐싱으로 성능 향상**

```typescript
// 캐시 동기화 (모든 추론 재계산)
const cachedCount = await engine.syncCache(true);
console.log(`Cached ${cachedCount} inferences`);

// 캐시 전략 선택
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'eager',  // 즉시 동기화
  // cacheSyncStrategy: 'lazy',   // 첫 쿼리 시 동기화
  // cacheSyncStrategy: 'manual', // 수동 동기화만
});
```

**성능 비교:**
```
without cache: ~500ms (10,000 노드)
with cache:    ~50ms  (90% 향상)
```

---

### 5. 순환 참조 감지

**순환 의존성 자동 검출**

```typescript
// 전체 그래프 검증
const validation = await engine.validate();

if (!validation.valid) {
  console.error('Circular dependencies detected!');
  console.error('Errors:', validation.errors);
  console.error('Warnings:', validation.warnings);
}

// 출력 예시:
// Errors: ['Circular reference detected in depends_on: 2 cycles found']
// Warnings: ['  Cycle: 1 → 2 → 3 → 1', '  Cycle: 4 → 5 → 4']
```

---

### 6. 통합 추론 (inferAll)

**한 번에 모든 타입 추론**

```typescript
const result = await engine.inferAll(nodeId);

console.log(`Total inferences: ${result.inferences.length}`);
console.log(`Execution time: ${result.executionTime}ms`);
console.log('Statistics:', result.statistics);

// Statistics 예시:
// {
//   directRelationships: 120,
//   inferredByType: {
//     hierarchical: 45,
//     transitive: 78,
//     inheritable: 12
//   },
//   cachedInferences: 135,
//   averageDepth: 2.3,
//   maxDepth: 5
// }
```

---

## 실전 예제

### 예제 1: 파일 의존성 분석

```typescript
import { createGraphDatabase, InferenceEngine } from '@context-action/dependency-linker';

async function analyzeFileDependencies(projectPath: string) {
  const db = createGraphDatabase(`${projectPath}/.dependency-linker/graph.db`);
  await db.initialize();

  const engine = new InferenceEngine(db, {
    enableCache: true,
    cacheSyncStrategy: 'eager',
  });

  // 1. 모든 파일 노드 조회
  const files = await db.findNodes({ nodeTypes: ['file'] });

  // 2. 각 파일의 전체 의존성 트리 추론
  const allDeps = new Map<number, InferredRelationship[]>();

  for (const file of files) {
    const deps = await engine.queryTransitive(file.id!, 'imports');
    allDeps.set(file.id!, deps);
  }

  // 3. 가장 많이 의존하는 파일 찾기
  const sorted = Array.from(allDeps.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  console.log('Top 10 files with most dependencies:');
  for (const [fileId, deps] of sorted) {
    const file = files.find(f => f.id === fileId);
    console.log(`${file?.name}: ${deps.length} dependencies`);
  }

  await db.close();
}
```

### 예제 2: 빌드 순서 계산

```typescript
async function calculateBuildOrder(db: GraphDatabase) {
  const engine = new InferenceEngine(db);

  // 1. 순환 의존성 체크
  const validation = await engine.validate();
  if (!validation.valid) {
    throw new Error('Cannot build: circular dependencies detected');
  }

  // 2. 모든 파일과 의존성 수집
  const files = await db.findNodes({ nodeTypes: ['file'] });
  const dependencies = new Map<number, number[]>();

  for (const file of files) {
    const deps = await engine.queryTransitive(file.id!, 'depends_on');
    dependencies.set(
      file.id!,
      deps.map(d => d.toNodeId)
    );
  }

  // 3. 토폴로지 정렬
  const buildOrder: number[] = [];
  const visited = new Set<number>();

  function visit(fileId: number) {
    if (visited.has(fileId)) return;
    visited.add(fileId);

    const deps = dependencies.get(fileId) || [];
    for (const depId of deps) {
      visit(depId);
    }

    buildOrder.push(fileId);
  }

  for (const file of files) {
    visit(file.id!);
  }

  return buildOrder;
}
```

### 예제 3: 영향 분석 (Impact Analysis)

```typescript
async function findImpactedFiles(
  db: GraphDatabase,
  changedFileId: number
): Promise<Set<number>> {
  const engine = new InferenceEngine(db);

  // 역방향 추론: 이 파일에 의존하는 모든 파일
  const allFiles = await db.findNodes({ nodeTypes: ['file'] });
  const impacted = new Set<number>();

  for (const file of allFiles) {
    const deps = await engine.queryTransitive(file.id!, 'imports');

    // changedFileId에 의존하는가?
    if (deps.some(d => d.toNodeId === changedFileId)) {
      impacted.add(file.id!);
    }
  }

  return impacted;
}

// 사용
const changedFile = 42;
const affected = await findImpactedFiles(db, changedFile);
console.log(`${affected.size} files will be affected by changes`);
```

### 예제 4: 클래스 상속 체인 분석

```typescript
async function analyzeInheritanceChain(
  db: GraphDatabase,
  classNodeId: number
) {
  const engine = new InferenceEngine(db);

  // 1. 직접 부모 클래스들
  const directParents = await db.findRelationships({
    startNodeId: classNodeId,
    relationshipTypes: ['extends'],
  });

  // 2. 전체 상속 체인
  const fullChain = await engine.queryTransitive(
    classNodeId,
    'extends',
    { maxPathLength: 10 }
  );

  // 3. 이 클래스가 포함된 파일
  const fileRels = await db.findRelationships({
    endNodeId: classNodeId,
    relationshipTypes: ['contains'],
  });

  // 4. 파일이 상속하는 클래스들 (inheritable)
  const fileInheritances = [];
  for (const rel of fileRels) {
    const inherited = await engine.queryInheritable(
      rel.fromNodeId,
      'contains',
      'extends'
    );
    fileInheritances.push(...inherited);
  }

  return {
    directParents: directParents.length,
    totalAncestors: fullChain.length,
    fileInheritances: fileInheritances.length,
  };
}
```

---

## API 레퍼런스

### InferenceEngine 생성

```typescript
new InferenceEngine(database: GraphDatabase, config?: InferenceEngineConfig)
```

**Config Options:**
```typescript
interface InferenceEngineConfig {
  enableCache?: boolean;              // 기본값: true
  cacheSyncStrategy?: 'eager' | 'lazy' | 'manual';  // 기본값: 'lazy'
  defaultMaxPathLength?: number;      // 기본값: 10
  defaultMaxHierarchyDepth?: number;  // 기본값: Infinity
  enableCycleDetection?: boolean;     // 기본값: true
}
```

### 주요 메서드

#### `queryTransitive()`
```typescript
async queryTransitive(
  fromNodeId: number,
  edgeType: string,
  options?: TransitiveQueryOptions
): Promise<InferredRelationship[]>

interface TransitiveQueryOptions {
  maxPathLength?: number;
  detectCycles?: boolean;
  relationshipTypes?: string[];
}
```

#### `queryHierarchical()`
```typescript
async queryHierarchical(
  edgeType: string,
  options?: HierarchicalQueryOptions
): Promise<InferredRelationship[]>

interface HierarchicalQueryOptions {
  includeChildren?: boolean;
  includeParents?: boolean;
  maxDepth?: number;
}
```

#### `queryInheritable()`
```typescript
async queryInheritable(
  fromNodeId: number,
  parentRelationshipType: string,
  inheritableType: string,
  options?: InheritableQueryOptions
): Promise<InferredRelationship[]>

interface InheritableQueryOptions {
  maxInheritanceDepth?: number;
}
```

#### `inferAll()`
```typescript
async inferAll(
  fromNodeId: number,
  edgeTypes?: string[]
): Promise<InferenceResult>

interface InferenceResult {
  inferences: InferredRelationship[];
  statistics: InferenceStatistics;
  executionTime: number;
}
```

#### `syncCache()`
```typescript
async syncCache(force?: boolean): Promise<number>
```

#### `validate()`
```typescript
async validate(): Promise<InferenceValidationResult>

interface InferenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  validatedCount: number;
}
```

---

## 모범 사례

### 1. 캐시 전략 선택

```typescript
// 🟢 실시간 시스템 - eager
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'eager'  // 매 변경마다 즉시 동기화
});

// 🟡 일반 애플리케이션 - lazy (권장)
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'lazy'   // 첫 쿼리 시 동기화
});

// 🔵 배치 처리 - manual
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'manual'
});

// 대량 작업 후 수동 동기화
await bulkInsertData();
await engine.syncCache(true);
```

### 2. 순환 의존성 방지

```typescript
// ✅ Good: 작업 전 검증
const validation = await engine.validate();
if (!validation.valid) {
  throw new Error('Cannot proceed: cycles detected');
}

// ❌ Bad: 검증 없이 진행
await engine.inferAll(nodeId); // 순환 시 무한 루프!
```

### 3. 성능 최적화

```typescript
// ✅ Good: 경로 길이 제한
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 5  // 대부분의 경우 충분
});

// ❌ Bad: 무제한 탐색
const deps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: Infinity  // 매우 느릴 수 있음
});
```

### 4. 에러 처리

```typescript
try {
  const inferences = await engine.queryTransitive(nodeId, 'custom_type');
} catch (error) {
  if (error.message.includes('not transitive')) {
    console.warn('Edge type is not configured for transitive inference');
  } else if (error.message.includes('not found')) {
    console.error('Edge type does not exist');
  } else {
    throw error;
  }
}
```

---

## 문제 해결

### Q: 캐시된 추론 수가 항상 0으로 표시됩니다

**A:** `inferAll()` 사용 시 `statistics.cachedInferences`가 정확히 표시됩니다. 개별 쿼리 메서드에서는 성능상의 이유로 0을 반환합니다.

```typescript
// ✅ 정확한 캐시 수 확인
const result = await engine.inferAll(nodeId);
console.log(result.statistics.cachedInferences); // 실제 캐시 수
```

---

### Q: 전이적 추론이 작동하지 않습니다

**A:** Edge type이 `isTransitive: true`로 설정되었는지 확인하세요.

```typescript
// EdgeTypeRegistry 확인
const edgeType = EdgeTypeRegistry.get('my_type');
console.log(edgeType?.isTransitive); // true 여야 함
```

---

### Q: 성능이 느립니다

**A:** 다음을 시도해보세요:

1. **캐시 활성화**
   ```typescript
   const engine = new InferenceEngine(db, {
     enableCache: true,
     cacheSyncStrategy: 'eager'
   });
   ```

2. **경로 길이 제한**
   ```typescript
   const deps = await engine.queryTransitive(nodeId, 'depends_on', {
     maxPathLength: 5
   });
   ```

3. **인덱스 확인**
   - `edge_inference_cache` 테이블에 인덱스가 있는지 확인
   - `schema.sql`이 올바르게 적용되었는지 확인

---

### Q: 순환 의존성이 감지되지 않습니다

**A:** Cycle detection이 활성화되었는지 확인하세요.

```typescript
const engine = new InferenceEngine(db, {
  enableCycleDetection: true  // 기본값이지만 명시적으로 설정
});

const validation = await engine.validate();
// validation.errors에 순환 참조 정보 표시됨
```

---

## 추가 리소스

- **Implementation Details**: `docs/INFERENCE-ENGINE-IMPLEMENTATION.md`
- **Bug Fixes**: `docs/BUG-FIXES-2025-10-02.md`
- **Test Suite**: `tests/database/inference-engine.test.ts`
- **Edge Types**: `src/database/inference/EdgeTypeRegistry.ts`

---

**마지막 업데이트**: 2025-10-02
**작성자**: Dependency Linker Team
