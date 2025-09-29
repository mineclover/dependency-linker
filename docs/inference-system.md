# Inference System

관계 추론 시스템 - Hierarchical, Transitive, Inheritable 추론 엔진

## 개요

Inference System은 SQLite 그래프 데이터베이스에서 직접 관계를 넘어 간접적인 관계를 추론하는 시스템입니다. SQL Recursive CTE를 활용하여 효율적인 그래프 순회를 수행하며, 타입 안전한 API를 제공합니다.

## 추론 타입

### 1. Hierarchical Inference (계층적 추론)

**개념**: 자식 타입들을 부모 타입으로 조회

```
imports_library → imports → depends_on
imports_file    → imports → depends_on

Query: "imports" 타입 조회
Result: imports_library + imports_file 관계 모두 반환
```

**사용 예시**:
```typescript
import { GraphDatabase } from './database/GraphDatabase';

const db = new GraphDatabase('./graph.db');
await db.initialize();

// 'imports' 타입으로 조회하면 자식 타입들도 포함
const allImports = await db.queryHierarchicalRelationships('imports', {
  includeChildren: true,   // imports_library, imports_file 포함
  includeParents: false    // depends_on 제외
});

console.log(`총 ${allImports.length}개 import 관계 발견`);
```

**활용 사례**:
- "모든 import 관계 조회" - library/file 구분 없이
- "모든 의존성 조회" - imports, calls, references 등 통합
- API 일관성 - 세부 타입 몰라도 상위 타입으로 조회 가능

### 2. Transitive Inference (전이적 추론)

**개념**: A→B, B→C 관계에서 A→C 추론

```
App.tsx --[imports_file]--> helpers.ts
helpers.ts --[imports_file]--> math.ts
⇒ App.tsx --[depends_on]--> math.ts (추론됨)
```

**사용 예시**:
```typescript
// App.tsx 노드 ID 가져오기
const appNodes = await db.findNodes({ sourceFiles: ['/src/App.tsx'] });
const appNodeId = appNodes[0].id!;

// 전이적 의존성 조회 (최대 깊이 10)
const transitiveDeps = await db.queryTransitiveRelationships(
  appNodeId,
  'depends_on',  // transitive 타입만 가능
  10  // max depth
);

// 결과: App.tsx가 직간접적으로 의존하는 모든 파일
transitiveDeps.forEach(rel => {
  console.log(`${rel.fromNodeId} → ${rel.toNodeId}`);
});
```

**SQL 구현** (Recursive CTE):
```sql
WITH RECURSIVE transitive_paths AS (
  -- Base case: 직접 관계
  SELECT
    e.id, e.start_node_id, e.end_node_id,
    1 as depth,
    CAST(e.start_node_id AS TEXT) as visited
  FROM edges e
  WHERE e.start_node_id = ? AND e.type = ?

  UNION ALL

  -- Recursive case: 간접 관계
  SELECT
    e.id, tp.start_node_id, e.end_node_id,
    tp.depth + 1,
    tp.visited || ',' || CAST(e.end_node_id AS TEXT)
  FROM edges e
  INNER JOIN transitive_paths tp ON e.start_node_id = tp.end_node_id
  WHERE tp.depth < ?
    AND e.type = ?
    AND INSTR(tp.visited, CAST(e.end_node_id AS TEXT)) = 0  -- 순환 방지
)
SELECT DISTINCT * FROM transitive_paths
```

**활용 사례**:
- 의존성 트리 전체 조회
- 영향 범위 분석 (파일 변경 시 영향받는 모든 파일)
- 순환 의존성 감지
- 빌드 순서 결정

### 3. Inheritable Inference (상속 가능 추론)

**개념**: parent(A,B), rel(B,C) 관계에서 rel(A,C) 추론

```
File contains Class
Class extends BaseClass
⇒ File extends BaseClass (상속됨)
```

**사용 예시**:
```typescript
// 파일 노드 가져오기
const fileNodes = await db.findNodes({ sourceFiles: ['/src/User.ts'] });
const fileNodeId = fileNodes[0].id!;

// 파일이 포함한 클래스들의 extends 관계를 파일로 상속
const inherited = await db.queryInheritableRelationships(
  fileNodeId,
  'contains',   // 부모 관계 타입
  'extends',    // 상속 가능한 관계 타입
  5  // 최대 상속 깊이
);

// 결과: 파일이 간접적으로 상속하는 모든 관계
```

**SQL 구현** (Recursive CTE):
```sql
WITH RECURSIVE inheritance AS (
  -- Base case: 직접 자식의 관계
  SELECT
    parent.start_node_id as root_node,
    child_rel.id, child_rel.end_node_id,
    1 as depth
  FROM edges parent
  INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
  WHERE parent.start_node_id = ?
    AND parent.type = 'contains'
    AND child_rel.type = 'extends'

  UNION ALL

  -- Recursive case: 간접 자식의 관계
  SELECT
    inh.root_node,
    child_rel.id, child_rel.end_node_id,
    inh.depth + 1
  FROM inheritance inh
  INNER JOIN edges parent ON inh.end_node_id = parent.start_node_id
  INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
  WHERE inh.depth < ?
    AND parent.type = 'contains'
    AND child_rel.type = 'extends'
)
SELECT DISTINCT * FROM inheritance
```

**활용 사례**:
- 파일 수준 의존성 분석
- 모듈 간 관계 추적
- 리팩토링 영향 범위 예측

## InferenceEngine API

InferenceEngine은 고급 추론 기능을 제공하는 타입 안전 API입니다.

### 기본 사용법

```typescript
import { InferenceEngine } from './database/core/InferenceEngine';
import { GraphDatabase } from './database/GraphDatabase';

const db = new GraphDatabase('./graph.db');
await db.initialize();

// InferenceEngine 생성
const inferenceEngine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy',  // 'eager' | 'lazy' | 'manual'
  defaultMaxPathLength: 10,
  defaultMaxHierarchyDepth: Infinity,
  enableCycleDetection: true
});
```

### 메서드

#### queryHierarchical
계층적 타입 조회

```typescript
const hierarchical = await inferenceEngine.queryHierarchical('imports', {
  includeChildren: true,
  includeParents: false,
  maxDepth: 10
});

// 반환: InferredRelationship[]
hierarchical.forEach(rel => {
  console.log(`${rel.type}: ${rel.path.description}`);
  console.log(`  Depth: ${rel.path.depth}`);
  console.log(`  Source: ${rel.sourceFile}`);
});
```

#### queryTransitive
전이적 관계 추론

```typescript
const transitive = await inferenceEngine.queryTransitive(
  nodeId,
  'depends_on',
  {
    maxPathLength: 10,
    detectCycles: true,
    relationshipTypes: ['depends_on', 'imports_file']  // 필터링
  }
);

// 반환: InferredRelationship[]
transitive.forEach(rel => {
  console.log(`Path depth: ${rel.path.depth}`);
  console.log(`Edge IDs in path: ${rel.path.edgeIds.join(' → ')}`);
});
```

#### queryInheritable
상속 가능한 관계 추론

```typescript
const inheritable = await inferenceEngine.queryInheritable(
  nodeId,
  'contains',
  'extends',
  {
    maxInheritanceDepth: 5
  }
);
```

#### inferAll
모든 추론 통합 실행

```typescript
const result = await inferenceEngine.inferAll(nodeId, ['depends_on', 'imports']);

console.log(`Total inferences: ${result.inferences.length}`);
console.log(`Execution time: ${result.executionTime}ms`);
console.log('Statistics:', result.statistics);
```

### InferenceResult 타입

```typescript
interface InferenceResult {
  inferences: InferredRelationship[];
  statistics: {
    directRelationships: number;
    inferredByType: {
      hierarchical: number;
      transitive: number;
      inheritable: number;
    };
    cachedInferences: number;
    averageDepth: number;
    maxDepth: number;
  };
  executionTime: number;  // ms
}
```

## Edge Type 계층 구조

### 계층 정의

```
• depends_on (transitive)
  • imports
    • imports_library
    • imports_file
  • calls
  • references
  • extends (inheritable)
  • implements (inheritable)
  • uses
  • instantiates
  • accesses

• contains (transitive, inheritable)
  • declares (inheritable)

• belongs_to (transitive)
```

### Transitive Types

A→B, B→C ⇒ A→C 추론 가능:
- `contains`
- `belongs_to`
- `depends_on`

### Inheritable Types

parent(A,B), rel(B,C) ⇒ rel(A,C) 추론 가능:
- `contains`
- `declares`
- `extends`
- `implements`

### EdgeTypeRegistry API

```typescript
import { EdgeTypeRegistry } from './database/types/EdgeTypeRegistry';

// Edge type 조회
const edgeTypeDef = EdgeTypeRegistry.get('imports_library');
console.log(edgeTypeDef.isTransitive);  // false
console.log(edgeTypeDef.isInheritable); // false
console.log(edgeTypeDef.parentType);    // 'imports'

// 계층 경로 조회
const path = EdgeTypeRegistry.getHierarchyPath('imports_library');
console.log(path);  // ['imports_library', 'imports', 'depends_on']

// 자식 타입 조회
const children = EdgeTypeRegistry.getChildren('imports');
console.log(children);  // ['imports_library', 'imports_file']

// 계층 구조 검증
const validation = EdgeTypeRegistry.validateHierarchy();
if (!validation.valid) {
  console.error('Hierarchy errors:', validation.errors);
}

// 계층 구조 시각화
console.log(EdgeTypeRegistry.printHierarchy());
```

## 캐시 시스템

### edge_inference_cache 테이블

추론된 관계를 캐시하여 반복 쿼리 성능 최적화:

```sql
CREATE TABLE edge_inference_cache (
  start_node_id INTEGER NOT NULL,
  end_node_id INTEGER NOT NULL,
  inferred_type TEXT NOT NULL,
  edge_path TEXT NOT NULL,  -- JSON: [edge_id, edge_id, ...]
  depth INTEGER NOT NULL,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (start_node_id, end_node_id, inferred_type)
);
```

### 캐시 동기화

```typescript
// 수동 캐시 동기화
await db.syncInferenceCache();

// 또는 InferenceEngine 설정
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'eager'  // 즉시 동기화
});

// 강제 동기화
await engine.syncCache(true);
```

### 캐시 전략

#### Eager (즉시 동기화)
- 관계 생성/삭제 시 즉시 캐시 재계산
- 쿼리 성능 최고
- 쓰기 성능 낮음
- 실시간 정확성 보장

#### Lazy (지연 동기화)
- 첫 쿼리 시 캐시 계산
- 균형잡힌 성능
- 추천 전략

#### Manual (수동 동기화)
- 명시적 호출 시만 동기화
- 배치 처리에 적합
- 개발자가 타이밍 제어

## 성능 최적화

### 인덱스 활용

```sql
-- 추론 쿼리 최적화를 위한 인덱스
CREATE INDEX idx_edges_start_type ON edges (start_node_id, type);
CREATE INDEX idx_edges_end_type ON edges (end_node_id, type);
CREATE INDEX idx_edges_source_file_type ON edges (source_file, type);

-- 캐시 조회 최적화
CREATE INDEX idx_inference_start ON edge_inference_cache (start_node_id);
CREATE INDEX idx_inference_end ON edge_inference_cache (end_node_id);
CREATE INDEX idx_inference_type ON edge_inference_cache (inferred_type);
CREATE INDEX idx_inference_depth ON edge_inference_cache (depth);
```

### 쿼리 최적화 팁

1. **최대 깊이 제한**: 무한 순회 방지
```typescript
const result = await db.queryTransitiveRelationships(nodeId, 'depends_on', 5);
```

2. **타입 필터링**: 필요한 타입만 조회
```typescript
const result = await inferenceEngine.queryTransitive(nodeId, 'depends_on', {
  relationshipTypes: ['depends_on', 'imports_file']
});
```

3. **순환 감지 활성화**: 무한 루프 방지
```typescript
const engine = new InferenceEngine(db, {
  enableCycleDetection: true
});
```

4. **캐시 활용**: 반복 쿼리 최적화
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});
```

## 실전 예제

### 예제 1: 파일 변경 영향 범위 분석

```typescript
async function analyzeImpact(filePath: string, db: GraphDatabase) {
  // 파일 노드 찾기
  const nodes = await db.findNodes({ sourceFiles: [filePath] });
  if (nodes.length === 0) return;

  const fileNode = nodes[0];

  // 이 파일이 영향을 주는 모든 파일 찾기 (역방향 전이 의존성)
  const impactedFiles = await db.queryTransitiveRelationships(
    fileNode.id!,
    'depends_on',
    10
  );

  console.log(`${filePath} 변경 시 영향받는 파일: ${impactedFiles.length}개`);

  // 직접/간접 영향 구분
  const direct = impactedFiles.filter(r => r.metadata?.depth === 1);
  const indirect = impactedFiles.filter(r => (r.metadata?.depth || 0) > 1);

  console.log(`  직접 영향: ${direct.length}개`);
  console.log(`  간접 영향: ${indirect.length}개`);

  return impactedFiles;
}
```

### 예제 2: 모듈 간 의존성 시각화

```typescript
async function visualizeDependencies(moduleRoot: string, db: GraphDatabase) {
  const engine = new InferenceEngine(db);

  // 모듈 내 모든 파일 노드
  const moduleNodes = await db.findNodes({
    sourceFiles: [moduleRoot]  // prefix match
  });

  // 각 노드의 계층적 의존성 조회
  const allDependencies = new Map<number, InferredRelationship[]>();

  for (const node of moduleNodes) {
    const deps = await engine.queryHierarchical('depends_on', {
      includeChildren: true
    });
    allDependencies.set(node.id!, deps);
  }

  // Mermaid 다이어그램 생성
  console.log('```mermaid');
  console.log('graph TD');

  for (const [nodeId, deps] of allDependencies) {
    const node = moduleNodes.find(n => n.id === nodeId);
    deps.forEach(dep => {
      const targetNode = moduleNodes.find(n => n.id === dep.toNodeId);
      if (node && targetNode) {
        console.log(`  ${node.name}-->${targetNode.name}`);
      }
    });
  }

  console.log('```');
}
```

### 예제 3: 순환 의존성 감지

```typescript
async function detectCircularDependencies(db: GraphDatabase) {
  const engine = new InferenceEngine(db, {
    enableCycleDetection: true
  });

  const allNodes = await db.findNodes({});
  const circularPaths: Array<{ nodes: number[]; type: string }> = [];

  for (const node of allNodes) {
    try {
      const transitive = await db.queryTransitiveRelationships(
        node.id!,
        'depends_on',
        20
      );

      // 자기 자신으로 돌아오는 경로 찾기
      const cycles = transitive.filter(rel => rel.toNodeId === node.id);

      if (cycles.length > 0) {
        circularPaths.push({
          nodes: [node.id!, ...cycles.map(c => c.toNodeId)],
          type: 'depends_on'
        });
      }
    } catch (error) {
      console.warn(`Cycle detection failed for node ${node.id}:`, error);
    }
  }

  console.log(`발견된 순환 의존성: ${circularPaths.length}개`);

  return circularPaths;
}
```

## 타입 정의

### InferredRelationship

```typescript
interface InferredRelationship {
  fromNodeId: number;
  toNodeId: number;
  type: string;  // 추론된 관계 타입
  path: InferencePath;
  inferredAt: Date;
  sourceFile: string;
}
```

### InferencePath

```typescript
interface InferencePath {
  edgeIds: number[];  // 경로를 구성하는 직접 관계 ID들
  depth: number;      // 경로 깊이 (1 = 직접, >1 = 추론)
  inferenceType: 'hierarchical' | 'transitive' | 'inheritable';
  description: string;  // 경로 설명
}
```

### InferenceEngineConfig

```typescript
interface InferenceEngineConfig {
  enableCache?: boolean;  // 기본: true
  cacheSyncStrategy?: 'eager' | 'lazy' | 'manual';  // 기본: 'lazy'
  defaultMaxPathLength?: number;  // 기본: 10
  defaultMaxHierarchyDepth?: number;  // 기본: Infinity
  enableCycleDetection?: boolean;  // 기본: true
}
```

## 문제 해결

### 순환 참조 감지됨

**증상**: Transitive 쿼리에서 "Cycle detected" 오류

**원인**: A→B→C→A 같은 순환 구조

**해결**:
```typescript
// 순환 감지 활성화 (기본값)
const result = await db.queryTransitiveRelationships(nodeId, 'depends_on', 10);

// 순환 무시하고 최대 깊이까지 조회 (주의!)
// 직접 SQL 수정 필요
```

### 성능 저하

**증상**: 추론 쿼리가 느림 (>1초)

**원인**:
- 깊이 제한 너무 큼
- 캐시 비활성화
- 인덱스 부족

**해결**:
```typescript
// 1. 깊이 제한
const result = await db.queryTransitiveRelationships(nodeId, 'depends_on', 5);

// 2. 캐시 활성화
const engine = new InferenceEngine(db, { enableCache: true });

// 3. 인덱스 확인
// schema.sql의 인덱스 생성 확인
```

### 캐시 불일치

**증상**: 추론 결과가 실제 데이터와 다름

**원인**: 캐시가 오래됨

**해결**:
```typescript
// 캐시 강제 동기화
await db.syncInferenceCache();

// 또는 Eager 전략 사용
const engine = new InferenceEngine(db, {
  cacheSyncStrategy: 'eager'
});
```

## 참고 자료

- [Analyzer Ownership Pattern](./analyzer-ownership-pattern.md) - 소유권 기반 관계 관리
- [Edge Type Management](./edge-type-management.md) - Edge type 계층 구조
- [GraphDatabase API](../src/database/GraphDatabase.ts) - 데이터베이스 API
- [InferenceEngine](../src/database/core/InferenceEngine.ts) - 추론 엔진 구현
- [InferenceTypes](../src/database/types/InferenceTypes.ts) - 타입 정의