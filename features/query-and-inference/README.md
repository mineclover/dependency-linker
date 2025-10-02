# Query & Inference System

**Category**: Core Feature
**Commands**: `query` + inference scripts
**Status**: ✅ Query Ready, 🚧 Inference In Development

---

## 📋 Overview

쿼리 및 추론 시스템은 GraphDB에 저장된 의존성 정보를 조회하고, 이를 활용하여 간접 의존성을 추론하며, LLM 컨텍스트를 자동 구성합니다.

### Two Major Components

**1. Query System**:
- GraphDB에서 의존성 정보 조회
- 네임스페이스별 필터링
- 순환 의존성 탐지
- 의존 깊이 분석

**2. Inference System**:
- 최근접 노드 추출
- 전이적 의존성 추론
- 계층적 엣지 타입 추론
- LLM 컨텍스트 준비

---

## 🛠️ Query Commands

### `query <namespace>`

특정 네임스페이스의 의존성 정보를 조회합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js query <namespace> [options]
```

**Options**:
- `--cwd <path>` - Working directory
- `-c, --config <path>` - Config file path
- `-d, --db <path>` - Database path
- `--json` - Output as JSON

**Example**:
```bash
# source 네임스페이스 쿼리
node dist/cli/namespace-analyzer.js query source

# JSON 출력
node dist/cli/namespace-analyzer.js query source --json
```

**Output**:
```
📊 Namespace Dependencies: source
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database: .dependency-linker/graph.db

📈 Statistics:
  Total files: 75
  Total edges: 153
  Average degree: 2.04

🔗 Sample Dependencies:
  src/api/analysis.ts
  ├─→ src/core/QueryEngine.ts
  └─→ src/parsers/ParserFactory.ts

  src/core/QueryEngine.ts
  ├─→ src/core/QueryResultMap.ts
  └─→ src/core/types.ts

  src/database/GraphDatabase.ts
  ├─→ src/graph/types.ts
  └─→ src/database/GraphStorage.ts
```

---

## 🧠 Inference System

### test-inference.ts

특정 파일의 의존성을 분석하고 최근접 노드 목록을 추출합니다.

**Usage**:
```bash
npx tsx test-inference.ts <file-path>
```

**Example**:
```bash
# NamespaceGraphDB의 의존성 추론
npx tsx test-inference.ts src/namespace/NamespaceGraphDB.ts
```

**Output**:
```
🔍 Dependency Analysis for Inference Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Target File: src/namespace/NamespaceGraphDB.ts
💾 Database: .dependency-linker/graph.db

📊 Step 1: Finding Target Node
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Target Node Found:
   ID: 88
   Type: internal
   Name: NamespaceGraphDB.ts
   Namespace: source

📊 Step 2: Finding Dependencies (Nearest Nodes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 2 dependency nodes:

Node #35:
  Type: internal
  Name: GraphDatabase.ts
  File: src/database/GraphDatabase.ts
  Namespace: source

Node #63:
  Type: internal
  Name: types.ts
  File: src/graph/types.ts
  Namespace: source

📊 Step 3: Unique File Locations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Nodes: 2
Unique Files: 2

1. src/database/GraphDatabase.ts (1 nodes)
2. src/graph/types.ts (1 nodes)

📊 Step 4: Summary Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nodes by Type:
  internal: 2

Nodes by Namespace:
  source: 2

📊 Step 5: JSON Output for Inference Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "targetFile": "src/namespace/NamespaceGraphDB.ts",
  "targetNode": {
    "id": 88,
    "type": "internal",
    "name": "NamespaceGraphDB.ts",
    "namespace": "source"
  },
  "dependencies": {
    "totalNodes": 2,
    "uniqueFiles": 2,
    "nodes": [...],
    "files": [
      "src/database/GraphDatabase.ts",
      "src/graph/types.ts"
    ]
  },
  "statistics": {
    "nodesByType": { "internal": 2 },
    "nodesByNamespace": { "source": 2 }
  }
}
```

---

## 🏗️ Architecture

### Query System

```
┌─────────────────────┐
│  CLI Command        │
│  query <namespace>  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  NamespaceGraphDB   │
│  .getNamespace      │
│  Dependencies()     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  SQLite Query       │
│  • Filter by ns     │
│  • Join nodes+edges │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Result Formatting  │
│  • Group by file    │
│  • Calculate stats  │
└─────────────────────┘
```

### Inference System

```
┌─────────────────────┐
│  Target File        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Find Node in DB    │
│  (by sourceFile)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Get Dependencies   │
│  (nearest nodes)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Extract Files      │
│  (unique list)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate Stats     │
│  • By type          │
│  • By namespace     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  JSON Output        │
│  (for LLM context)  │
└─────────────────────┘
```

---

## 📊 Data Structures

### QueryResult

```typescript
interface QueryResult {
  namespace: string;
  files: Array<{
    path: string;
    dependencies: string[];
    dependents: string[];
  }>;
  statistics: {
    totalFiles: number;
    totalEdges: number;
    averageDegree: number;
  };
}
```

### InferenceResult

```typescript
interface InferenceResult {
  targetFile: string;
  targetNode: {
    id: number;
    type: string;
    name: string;
    namespace: string;
  };
  dependencies: {
    totalNodes: number;
    uniqueFiles: number;
    nodes: Array<{
      id: number;
      type: string;
      name: string;
      file: string;
      namespace: string;
      edgeType: string;
    }>;
    files: string[];
  };
  statistics: {
    nodesByType: Record<string, number>;
    nodesByNamespace: Record<string, number>;
  };
}
```

---

## 🎯 Use Cases

### Use Case 1: LLM Context Preparation

**Scenario**: 특정 파일 분석을 위한 컨텍스트 수집

```bash
# 1. 의존성 추론
npx tsx test-inference.ts src/database/GraphDatabase.ts > inference.json

# 2. 컨텍스트 문서 조회
cat .dependency-linker/context/files/src/database/GraphDatabase.ts.md > context.md

# 3. 의존 파일들의 컨텍스트도 수집
jq -r '.dependencies.files[]' inference.json | while read file; do
  cat ".dependency-linker/context/files/$file.md"
done > dependencies-context.md

# 4. LLM 프롬프트 구성
cat context.md dependencies-context.md | claude-prompt
```

---

### Use Case 2: 영향 분석 (Impact Analysis)

**Scenario**: 특정 파일 변경 시 영향받는 파일 파악

```typescript
import { createGraphDatabase } from "./src/database/GraphDatabase";

const db = createGraphDatabase(".dependency-linker/graph.db");
await db.initialize();

// 1. 변경할 파일 찾기
const nodes = await db.findNodes({
  sourceFiles: ["src/core/QueryEngine.ts"]
});
const node = nodes[0];

// 2. 역의존성 조회 (이 파일에 의존하는 파일들)
const dependents = await db.findNodeDependents(node.id);

console.log(`Files affected by changes to QueryEngine.ts:`);
for (const dep of dependents) {
  console.log(`  - ${dep.sourceFile}`);
}

// 3. 간접 역의존성 (transitive dependents)
const transitiveDependents = new Set<string>();
const queue = [...dependents];

while (queue.length > 0) {
  const current = queue.shift()!;
  if (transitiveDependents.has(current.sourceFile!)) continue;

  transitiveDependents.add(current.sourceFile!);

  const nextLevel = await db.findNodeDependents(current.id);
  queue.push(...nextLevel);
}

console.log(`\nTotal files affected (transitive): ${transitiveDependents.size}`);
```

---

### Use Case 3: 의존성 깊이 분석

**Scenario**: 파일 간 의존성 체인의 깊이 측정

```typescript
import { createGraphDatabase } from "./src/database/GraphDatabase";

async function calculateDependencyDepth(targetFile: string) {
  const db = createGraphDatabase(".dependency-linker/graph.db");
  await db.initialize();

  const nodes = await db.findNodes({ sourceFiles: [targetFile] });
  if (nodes.length === 0) return 0;

  const visited = new Set<number>();
  let maxDepth = 0;

  async function dfs(nodeId: number, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    maxDepth = Math.max(maxDepth, depth);

    const deps = await db.findNodeDependencies(nodeId);
    for (const dep of deps) {
      await dfs(dep.id!, depth + 1);
    }
  }

  await dfs(nodes[0].id!, 0);
  await db.close();

  return maxDepth;
}

// 사용
const depth = await calculateDependencyDepth("src/api/analysis.ts");
console.log(`Dependency depth: ${depth}`);
```

---

### Use Case 4: 순환 의존성 탐지

**Scenario**: 순환 의존성 경로 찾기

```typescript
import { createGraphDatabase } from "./src/database/GraphDatabase";

const db = createGraphDatabase(".dependency-linker/graph.db");
await db.initialize();

// 순환 의존성 감지
const cycles = await db.detectCircularDependencies();

if (cycles.length > 0) {
  console.log(`❌ Found ${cycles.length} circular dependencies:`);
  for (const cycle of cycles) {
    console.log(`  ${cycle.join(" → ")}`);
  }
} else {
  console.log("✅ No circular dependencies found");
}

await db.close();
```

---

## 🔧 Programmatic API

### GraphDatabase Query API

```typescript
import { createGraphDatabase } from "./src/database/GraphDatabase";

const db = createGraphDatabase(".dependency-linker/graph.db");
await db.initialize();

// 노드 조회
const nodes = await db.findNodes({
  sourceFiles: ["src/core/QueryEngine.ts"]
});

// 의존성 조회
const deps = await db.findNodeDependencies(nodes[0].id);

// 역의존성 조회
const dependents = await db.findNodeDependents(nodes[0].id);

// 순환 의존성 탐지
const cycles = await db.detectCircularDependencies();

// 최단 경로
const path = await db.findShortestPath(nodeId1, nodeId2);

await db.close();
```

### InferenceEngine API

```typescript
import { InferenceEngine } from "./src/database/inference/InferenceEngine";
import { EdgeTypeRegistry } from "./src/database/inference/EdgeTypeRegistry";

// Edge type registry 초기화
const registry = EdgeTypeRegistry.getInstance();
registry.registerEdgeType({
  name: "imports",
  inferenceRules: {
    hierarchical: true,
    transitive: false,
    inheritable: false
  }
});

// InferenceEngine 생성
const engine = new InferenceEngine(db, registry);

// 추론 실행
await engine.inferEdges();

// 추론된 엣지 조회
const inferredEdges = await db.findEdges({
  type: "inferred-imports"
});
```

---

## ⚡ Performance

### Query Performance

**Simple Query** (single namespace):
- 75 nodes, 153 edges: ~20ms
- Algorithm: O(N + E)

**Transitive Query** (deep dependencies):
- Depth 5: ~50ms
- Algorithm: O(N × D) where D=depth

**Circular Detection**:
- 141 nodes, 184 edges: ~100ms
- Algorithm: Tarjan's SCC

### Inference Performance

**test-inference.ts**:
- Single file: ~30ms
- Includes DB queries + node extraction

**InferenceEngine**:
- Full inference (141 nodes): ~500ms
- Depends on edge type complexity

---

## 🐛 Known Issues

### Issue 1: File-Level Only

**Description**: 현재는 파일 레벨 의존성만 지원

**Limitation**: 메서드/클래스 레벨 의존성 추론 불가

**Future**: Symbol-level inference 추가 예정

---

### Issue 2: No Incremental Inference

**Description**: 변경 사항에 대해 전체 재추론 필요

**Impact**: 대규모 프로젝트에서 느림

**Future**: Incremental inference 개발 예정

---

## 🚀 Future Enhancements

### Planned Features

**Symbol-Level Inference**:
```typescript
// 메서드 간 호출 관계 추론
const methodCalls = await engine.inferMethodCalls({
  file: "src/database/GraphDatabase.ts",
  method: "findNodes"
});
```

**Advanced Query Language**:
```typescript
// Cypher-like query language
const result = await db.query(`
  MATCH (file:File)-[dep:DEPENDS_ON*1..3]->(target:File)
  WHERE file.namespace = 'tests' AND target.namespace = 'source'
  RETURN file, dep, target
`);
```

**Inference Rules**:
```typescript
// 커스텀 추론 규칙
registry.registerInferenceRule({
  name: "controller-service-pattern",
  match: (edge) => edge.source.endsWith("Controller.ts"),
  infer: (edge) => ({
    type: "requires-service",
    target: edge.target.replace("Controller", "Service")
  })
});
```

**Real-Time Inference**:
```typescript
// File watcher + incremental inference
const watcher = await engine.watch();
watcher.on("file-changed", async (file) => {
  await engine.inferForFile(file);
});
```

---

## 📚 Related Documentation

- [Dependency Analysis](../dependency-analysis/) - 기본 의존성 추출
- [Context Documents](../context-documents/) - 컨텍스트 문서 연동
- [Cross-Namespace](../cross-namespace/) - 크로스 네임스페이스 쿼리

---

**Last Updated**: 2025-10-02
**Version**: 3.0.0
