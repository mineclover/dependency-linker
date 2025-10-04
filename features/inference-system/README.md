# 추론 시스템 (Inference System)

**Category**: Core Feature
**Status**: 🚧 In Development
**Priority**: High
**Target Version**: 3.2.0

---

## 🎯 왜 필요한가?

### 현재 문제점
- **직접 의존성만 표현**: A → B만 알지, A → B → C 간접 의존성은 쿼리해야만 알 수 있음
- **타입 계층 활용 불가**: `imports_file`과 `imports_package` 모두 조회하려면 별도 쿼리 필요
- **LLM 컨텍스트 수동 구성**: 파일 분석 시 필요한 의존 파일들을 수동으로 찾아야 함
- **관계 추론 불가**: Unknown 노드를 실제 타입으로 자동 연결 불가

### 해결 방법
**3가지 추론 타입**을 SQL Recursive CTE로 구현하여 그래프 기반 자동 추론을 제공합니다.

```typescript
// 1. 계층적 추론 (Hierarchical)
//    imports → imports_file, imports_package

// 2. 전이적 추론 (Transitive)
//    A → B → C ⇒ A → C (간접 의존성)

// 3. 상속 가능 추론 (Inheritable)
//    Parent --extends--> Child일 때
//    Parent의 property → Child도 갖는다
```

---

## 💡 핵심 가치

### 1. 자동 컨텍스트 구성
```typescript
// "App.tsx를 분석해줘" 요청 시
const context = await inferenceEngine.buildContext("App.tsx");

// 자동으로 수집되는 파일들:
// - 직접 import: types.ts, utils.ts
// - 간접 import (전이): config.ts (utils.ts가 import)
// - 타입 정의: React.d.ts (types.ts가 사용)

console.log(context.files);
// → ["types.ts", "utils.ts", "config.ts", "React.d.ts"]
```

### 2. 계층적 쿼리
```typescript
// 모든 종류의 imports를 한번에 조회
const allImports = await engine.queryHierarchical('imports', {
  includeChildren: true
});

// imports_file, imports_package, imports_default 등
// 모든 하위 타입을 자동으로 포함
```

### 3. 전이적 의존성 추적
```typescript
// A → B → C → D 체인 자동 추적
const transitiveDeps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10
});

// 영향 분석: "이 파일을 수정하면 어떤 파일들이 영향받나?"
const impactedFiles = transitiveDeps.map(r => r.path);
```

---

## 🏗️ 3가지 추론 타입

### 1. 계층적 추론 (Hierarchical Inference)

**개념**: Edge 타입 계층 구조를 활용한 쿼리

**예시**:
```
imports (부모)
├── imports_file
├── imports_package
└── imports_default
```

**코드**:
```typescript
// "imports" 타입으로 쿼리하면 모든 하위 타입 포함
const results = await engine.queryHierarchical('imports', {
  includeChildren: true,
  maxDepth: 2
});

// imports_file, imports_package, imports_default 모두 조회됨
```

**SQL**:
```sql
WITH RECURSIVE type_hierarchy AS (
  -- Base: 요청된 타입
  SELECT name, parent_type, 0 as depth
  FROM edge_types
  WHERE name = 'imports'

  UNION

  -- Recursive: 하위 타입들
  SELECT et.name, et.parent_type, th.depth + 1
  FROM edge_types et
  JOIN type_hierarchy th ON et.parent_type = th.name
  WHERE th.depth < 2
)
SELECT * FROM edges
WHERE type IN (SELECT name FROM type_hierarchy);
```

---

### 2. 전이적 추론 (Transitive Inference)

**개념**: A → B → C 체인을 따라 간접 관계 추론

**예시**:
```
App.tsx → types.ts → utils.ts → config.ts

전이적 의존성:
- App.tsx → types.ts (직접)
- App.tsx → utils.ts (간접, depth=2)
- App.tsx → config.ts (간접, depth=3)
```

**코드**:
```typescript
// 최대 깊이 5까지 전이적 의존성 추적
const transitive = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 5,
  direction: 'outgoing'  // outgoing | incoming | both
});

// 결과:
transitive.forEach(rel => {
  console.log(`${rel.path.join(' → ')} (depth: ${rel.pathLength})`);
});
```

**SQL**:
```sql
WITH RECURSIVE dependency_chain AS (
  -- Base: 직접 의존성
  SELECT
    from_node_id as start_node,
    to_node_id as end_node,
    type,
    1 as depth,
    CAST(to_node_id AS TEXT) as path
  FROM edges
  WHERE from_node_id = ? AND type = 'depends_on'

  UNION

  -- Recursive: 간접 의존성
  SELECT
    dc.start_node,
    e.to_node_id,
    e.type,
    dc.depth + 1,
    dc.path || ',' || CAST(e.to_node_id AS TEXT)
  FROM dependency_chain dc
  JOIN edges e ON dc.end_node = e.from_node_id
  WHERE dc.depth < 5
    AND e.type = 'depends_on'
    AND e.to_node_id NOT IN (
      SELECT value FROM json_each('[' || dc.path || ']')
    )  -- 순환 방지
)
SELECT * FROM dependency_chain;
```

---

### 3. 상속 가능 추론 (Inheritable Inference)

**개념**: 관계가 상속 가능한 경우 자동으로 전파

**예시**:
```typescript
// TypeScript 클래스 상속
class Animal {
  name: string;  // property
}

class Dog extends Animal {
  // Dog도 name property를 갖는다 (상속)
}

// GraphDB:
Animal --has-property--> name
Animal --extends--> Dog

// 추론:
Dog --has-property--> name (inferred)
```

**코드**:
```typescript
// 상속 가능한 edge 타입 정의
EdgeTypeRegistry.registerEdgeType({
  name: 'has-property',
  isInheritable: true,
  parentType: 'has-member'
});

// 추론 실행
await engine.inferInheritable(nodeId, {
  edgeTypes: ['has-property', 'has-method'],
  maxInheritanceDepth: 3
});

// 결과: Dog 노드에 Animal의 모든 property/method가 추론됨
```

**SQL**:
```sql
WITH RECURSIVE inheritance_chain AS (
  -- Base: 현재 클래스
  SELECT
    id as class_id,
    0 as depth
  FROM nodes
  WHERE id = ?

  UNION

  -- Recursive: 부모 클래스들
  SELECT
    e.to_node_id,
    ic.depth + 1
  FROM inheritance_chain ic
  JOIN edges e ON ic.class_id = e.from_node_id
  WHERE e.type = 'extends'
    AND ic.depth < 3
)
-- 부모들의 property/method를 자식에 추론
INSERT INTO inferred_edges (from_node_id, to_node_id, type, metadata)
SELECT
  ?.class_id as from_node_id,
  e.to_node_id,
  e.type,
  json_object('inferred', true, 'source_class', ic.class_id)
FROM inheritance_chain ic
JOIN edges e ON ic.class_id = e.from_node_id
WHERE e.type IN ('has-property', 'has-method')
  AND ic.depth > 0;
```

---

## 🚀 실전 사용 예제

### 예제 1: LLM 컨텍스트 자동 구성

```typescript
import { InferenceEngine } from './database/inference';

const engine = new InferenceEngine(db);

// App.tsx 분석을 위한 컨텍스트 수집
async function buildLLMContext(targetFile: string) {
  // 1. 타겟 파일의 노드 찾기
  const nodes = await db.findNodes({ sourceFiles: [targetFile] });
  const targetNode = nodes[0];

  // 2. 전이적 의존성 추론 (최대 3단계)
  const deps = await engine.queryTransitive(targetNode.id, 'depends_on', {
    maxPathLength: 3,
    direction: 'outgoing'
  });

  // 3. 고유한 파일 목록 추출
  const files = new Set<string>();
  for (const dep of deps) {
    const node = await db.getNode(dep.targetNodeId);
    if (node.sourceFile) files.add(node.sourceFile);
  }

  // 4. 컨텍스트 문서 읽기
  const contexts = [];
  for (const file of files) {
    const content = await readContextFile(file);
    contexts.push({ file, content });
  }

  return contexts;
}

// 사용
const context = await buildLLMContext("src/App.tsx");
// → types.ts, utils.ts, config.ts의 컨텍스트 자동 수집
```

### 예제 2: 영향 분석 (Impact Analysis)

```typescript
// "이 파일을 수정하면 어떤 파일들이 영향받나?"
async function analyzeImpact(targetFile: string) {
  const nodes = await db.findNodes({ sourceFiles: [targetFile] });
  const node = nodes[0];

  // 역방향 전이적 의존성 (이 파일에 의존하는 모든 파일)
  const impacted = await engine.queryTransitive(node.id, 'depends_on', {
    maxPathLength: 10,
    direction: 'incoming'  // 역방향
  });

  // 영향받는 파일 목록
  const impactedFiles = new Set<string>();
  for (const rel of impacted) {
    const n = await db.getNode(rel.sourceNodeId);
    if (n.sourceFile) impactedFiles.add(n.sourceFile);
  }

  console.log(`${targetFile}을 수정하면 영향받는 파일 (${impactedFiles.size}개):`);
  for (const file of impactedFiles) {
    console.log(`  - ${file}`);
  }

  return Array.from(impactedFiles);
}

// 사용
await analyzeImpact("src/core/QueryEngine.ts");
// → api/analysis.ts, cli/analyze.ts 등 영향받는 파일 목록
```

### 예제 3: Unknown 노드 추론

```typescript
// Unknown 노드를 실제 타입으로 자동 연결
async function resolveUnknownNodes() {
  const unknownNodes = await db.findNodes({ type: 'unknown' });

  for (const unknown of unknownNodes) {
    // 1. Unknown 노드의 타겟 파일 찾기
    const targetFile = unknown.metadata?.importedFrom;
    if (!targetFile) continue;

    // 2. 타겟 파일에서 실제 심볼 찾기
    const actualNodes = await db.findNodes({
      sourceFiles: [targetFile],
      names: [unknown.metadata?.originalName || unknown.name]
    });

    if (actualNodes.length === 0) continue;
    const actual = actualNodes[0];

    // 3. Unknown → Actual 추론 edge 생성
    await db.upsertRelationship({
      fromNodeId: unknown.id,
      toNodeId: actual.id,
      type: 'resolved-to',
      metadata: {
        isInferred: true,
        inferenceType: 'unknown-resolution',
        confidence: 1.0
      }
    });

    console.log(`✅ Resolved: ${unknown.name} → ${actual.type}:${actual.name}`);
  }
}

// 사용
await resolveUnknownNodes();
// → Unknown:User → Class:User
// → Unknown:formatDate → Function:formatDate
```

---

## 📊 InferenceEngine API

### 초기화
```typescript
import { InferenceEngine } from './database/inference';

const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'  // 'eager' | 'lazy' | 'manual'
});
```

### 계층적 쿼리
```typescript
const results = await engine.queryHierarchical('imports', {
  includeChildren: true,
  maxDepth: 2
});
```

### 전이적 쿼리
```typescript
const transitive = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 5,
  direction: 'outgoing'  // 'incoming' | 'both'
});
```

### 상속 가능 추론
```typescript
const inherited = await engine.inferInheritable(nodeId, {
  edgeTypes: ['has-property', 'has-method'],
  maxInheritanceDepth: 3
});
```

### 전체 추론 실행
```typescript
const result = await engine.inferAll(nodeId);
// → 계층적 + 전이적 + 상속 가능 추론 모두 실행
```

---

## 🏗️ 아키텍처

### 모듈 구조
```
src/database/inference/
├── index.ts                 # 모듈 exports
├── InferenceEngine.ts       # 핵심 추론 엔진
├── InferenceTypes.ts        # 타입 정의
├── EdgeTypeRegistry.ts      # Edge 타입 관리
└── README.md
```

### 데이터 플로우
```
GraphDB
   ↓
InferenceEngine
   ├─→ EdgeTypeRegistry (타입 계층 조회)
   ├─→ SQL Recursive CTE (추론 실행)
   └─→ Inferred Edges (결과 저장)
```

---

## 📈 성능 지표

### Query Performance
- **계층적 쿼리**: ~20ms (75 nodes, 153 edges)
- **전이적 쿼리** (depth 5): ~50ms
- **상속 가능 추론** (depth 3): ~100ms

### Scalability
- **141 nodes, 184 edges**: Full inference ~500ms
- **알고리즘**: Recursive CTE (SQL 최적화)
- **순환 방지**: Path tracking으로 무한 루프 방지

---

## 🚧 현재 상태

### ✅ 완료된 작업
- [x] EdgeTypeRegistry 구현
- [x] InferenceEngine 핵심 로직
- [x] 3가지 추론 타입 구현
- [x] SQL Recursive CTE 기반 구현
- [x] 순환 의존성 방지 로직

### 🚧 진행 중인 작업
- [ ] 캐시 최적화
- [ ] Incremental inference
- [ ] Symbol-level inference
- [ ] 테스트 커버리지 확대

### 📋 향후 작업
- [ ] Cypher-like 쿼리 언어
- [ ] 커스텀 추론 규칙
- [ ] Real-time inference (file watcher)
- [ ] Visual debugging tools

---

## 🐛 Known Issues

### Issue 1: File-Level Only
**Description**: 현재는 파일 레벨 의존성만 추론 가능
**Limitation**: 메서드/클래스 레벨 추론 불가
**Future**: Symbol-level inference 추가 예정

### Issue 2: No Incremental Inference
**Description**: 변경 사항에 대해 전체 재추론 필요
**Impact**: 대규모 프로젝트에서 느림
**Future**: Incremental inference 개발 예정

---

## 🎓 핵심 개념 정리

### 추론의 3가지 차원
1. **계층적 (Hierarchical)**: 타입 계층 활용
2. **전이적 (Transitive)**: 체인 따라가기
3. **상속 가능 (Inheritable)**: 관계 전파

### 추론의 가치
- **자동화**: 수동 쿼리 불필요
- **완전성**: 간접 관계도 파악
- **효율성**: SQL CTE로 최적화
- **확장성**: 커스텀 규칙 추가 가능

---

## 🔗 관련 문서

- **InferenceEngine**: [src/database/inference/InferenceEngine.ts](../../src/database/inference/InferenceEngine.ts)
- **EdgeTypeRegistry**: [src/database/inference/EdgeTypeRegistry.ts](../../src/database/inference/EdgeTypeRegistry.ts)
- **Query & Inference**: [features/query-and-inference/README.md](../query-and-inference/README.md)
- **Type System**: [docs/type-system.md](../../docs/type-system.md)

---

**Last Updated**: 2025-10-05
**Next Review**: 2025-10-12
