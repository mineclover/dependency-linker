# Query System

**Category**: Core Feature
**Commands**: `query`
**Status**: ✅ Production Ready

---

## 📋 Overview

Query System은 GraphDB에 저장된 의존성 정보를 조회하는 시스템입니다.

### Key Capabilities

- **Namespace Filtering**: 네임스페이스별 의존성 조회
- **Circular Dependency Detection**: 순환 의존성 탐지
- **Dependency Depth Analysis**: 의존성 체인 깊이 분석
- **Impact Analysis**: 파일 변경 시 영향받는 파일 추적

> 💡 **간접 의존성 추론**이 필요한 경우 [Inference System](../inference-system/)을 참고하세요.

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

## 🏗️ Architecture

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

---

## 🎯 Use Cases

### Use Case 1: 영향 분석 (Impact Analysis)

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

### Use Case 2: 의존성 깊이 분석

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

### Use Case 3: 순환 의존성 탐지

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

---

## 🚀 Future Enhancements

### Cypher-like Query Language

```typescript
// Cypher-like query language
const result = await db.query(`
  MATCH (file:File)-[dep:DEPENDS_ON*1..3]->(target:File)
  WHERE file.namespace = 'tests' AND target.namespace = 'source'
  RETURN file, dep, target
`);
```

### Query Optimization

- Index optimization for large graphs
- Query result caching
- Parallel query execution

---

## 📚 Related Documentation

- [Dependency Analysis](../dependency-analysis/) - 기본 의존성 추출
- **[Inference System](../inference-system/)** - 간접 의존성 추론 (Hierarchical, Transitive, Inheritable)
- [Context Documents](../context-documents/) - 컨텍스트 문서 연동
- [Cross-Namespace](../cross-namespace/) - 크로스 네임스페이스 쿼리

---

**Last Updated**: 2025-10-05
**Version**: 3.1.0 (Query System only, Inference split to separate feature)
