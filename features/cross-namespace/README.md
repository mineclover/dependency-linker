# Cross-Namespace Dependencies

**Category**: Core Feature
**Commands**: `cross-namespace`
**Status**: ✅ Production Ready

---

## 📋 Overview

크로스 네임스페이스 의존성 기능은 서로 다른 네임스페이스 간의 의존성 관계를 추적하고 분석합니다.

### Key Insight

> 네임스페이스는 분석 대상과 관리 목적이 다르기 때문에 분리하지만,
> 의존성 자체는 같은 차원에 존재합니다.
> 테스트 코드가 구현 코드를 사용하는 것은 정상이지만,
> 이것이 비즈니스 로직의 복잡도를 높이는 것은 아닙니다.

### Capabilities

- **자동 탐지**: analyze-all 시 자동으로 크로스 네임스페이스 의존성 감지
- **양방향 추적**: A → B와 B → A를 구분하여 추적
- **메타데이터 저장**: 각 엣지에 sourceNamespace와 targetNamespace 저장
- **요약 및 상세 뷰**: 네임스페이스 쌍별 요약 + 파일 레벨 상세 정보

---

## 🛠️ Commands

### `cross-namespace`

네임스페이스 간 의존성을 조회합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js cross-namespace [options]
```

**Options**:
- `--cwd <path>` - Working directory
- `-d, --db <path>` - Database path (default: .dependency-linker/graph.db)
- `--detailed` - Show file-level dependencies
- `--json` - Output as JSON

**Example**:
```bash
# 요약 뷰
node dist/cli/namespace-analyzer.js cross-namespace

# 상세 뷰
node dist/cli/namespace-analyzer.js cross-namespace --detailed

# JSON 출력
node dist/cli/namespace-analyzer.js cross-namespace --json
```

---

## 📊 Output Examples

### Summary View

```
🔗 Cross-Namespace Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 27 cross-namespace dependencies

📊 Summary by Namespace Pair:
  tests → source: 22 dependencies
  docs → source: 3 dependencies
  tests → unknown: 1 dependencies
  docs → unknown: 1 dependencies

💡 Use --detailed flag to see individual file dependencies
```

### Detailed View

```
🔗 Cross-Namespace Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 27 cross-namespace dependencies

📊 Summary by Namespace Pair:
  tests → source: 22 dependencies
  docs → source: 3 dependencies

📋 Detailed Dependencies:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

tests → source (22 dependencies):
  📄 tests/core-functionality.test.ts
  └─→ src/core/QueryEngine.ts (internal)
  📄 tests/database/graph-analysis.test.ts
  └─→ src/database/GraphDatabase.ts (internal)
  📄 tests/integration/SingleFileAnalysis.test.ts
  └─→ src/api/analysis.ts (internal)
  ...

docs → source (3 dependencies):
  📄 docs/API.md
  └─→ src/api/analysis.ts (internal)
  📄 docs/DEPENDENCY_GRAPH_ANALYSIS.md
  └─→ src/database/GraphDatabase.ts (internal)
  ...
```

### JSON Output

```json
[
  {
    "sourceNamespace": "tests",
    "targetNamespace": "source",
    "source": "tests/core-functionality.test.ts",
    "target": "src/core/QueryEngine.ts",
    "type": "internal"
  },
  {
    "sourceNamespace": "tests",
    "targetNamespace": "source",
    "source": "tests/database/graph-analysis.test.ts",
    "target": "src/database/GraphDatabase.ts",
    "type": "internal"
  }
]
```

---

## 🏗️ Architecture

### Detection Algorithm

```
1. Unified Graph Building
   └─ analyze-all로 모든 네임스페이스를 하나의 그래프로 분석

2. Namespace Mapping
   └─ 각 파일이 어느 네임스페이스에 속하는지 매핑
   └─ filesByNamespace: Record<string, string[]>

3. Cross-Namespace Edge Detection
   FOR each edge in graph:
     sourceNs = getNamespace(edge.from)
     targetNs = getNamespace(edge.to)
     IF sourceNs ≠ targetNs:
       crossDeps.push({
         sourceNamespace: sourceNs,
         targetNamespace: targetNs,
         source: edge.from,
         target: edge.to,
         type: edge.type
       })

4. Database Storage
   └─ 각 엣지에 sourceNamespace, targetNamespace 메타데이터 저장
```

### Database Schema

**edges 테이블 메타데이터**:
```sql
metadata: {
  "sourceNamespace": "tests",
  "targetNamespace": "source",
  "importStatement": "import { QueryEngine } from '../src/core/QueryEngine'",
  "lineNumber": 3
}
```

### Key Components

**NamespaceDependencyAnalyzer.analyzeAll()**:
```typescript
async analyzeAll(configPath: string): Promise<{
  results: Record<string, NamespaceDependencyResult>;
  graph: DependencyGraph;
  crossNamespaceDependencies: Array<{
    sourceNamespace: string;
    targetNamespace: string;
    source: string;
    target: string;
    type: string;
  }>;
}>
```

**NamespaceGraphDB.storeUnifiedGraph()**:
```typescript
async storeUnifiedGraph(
  graph: DependencyGraph,
  filesByNamespace: Record<string, string[]>,
  baseDir: string
): Promise<void>
```

**NamespaceGraphDB.getCrossNamespaceDependencies()**:
```typescript
async getCrossNamespaceDependencies(): Promise<Array<{
  sourceNamespace: string;
  targetNamespace: string;
  source: string;
  target: string;
  type: string;
}>>
```

---

## 🎯 Use Cases

### Use Case 1: 테스트 커버리지 분석

**Scenario**: 어떤 소스 파일이 테스트되고 있는지 확인

```bash
# 1. 전체 분석
node dist/cli/namespace-analyzer.js analyze-all

# 2. tests → source 의존성 확인
node dist/cli/namespace-analyzer.js cross-namespace --detailed --json > coverage.json

# 3. 커버리지 분석 스크립트
# coverage.json을 파싱하여 테스트되지 않은 파일 추출
```

**결과**:
```typescript
// tests → source 의존성이 있는 파일들 = 테스트된 파일들
const testedFiles = crossDeps
  .filter(d => d.sourceNamespace === "tests" && d.targetNamespace === "source")
  .map(d => d.target);

// source 네임스페이스의 모든 파일
const allSourceFiles = await listFiles("source");

// 테스트되지 않은 파일 = 전체 - 테스트된 파일
const untestedFiles = allSourceFiles.filter(f => !testedFiles.includes(f));
```

---

### Use Case 2: 아키텍처 경계 강제

**Scenario**: 특정 의존성 방향을 금지하고 싶음

```bash
# 분석
node dist/cli/namespace-analyzer.js analyze-all

# 크로스 네임스페이스 확인
node dist/cli/namespace-analyzer.js cross-namespace --json > deps.json

# 검증 스크립트
node scripts/validate-architecture.js
```

**validate-architecture.js**:
```typescript
import fs from "fs";

const deps = JSON.parse(fs.readFileSync("deps.json", "utf-8"));

// 금지된 의존성 방향
const forbidden = [
  { from: "source", to: "tests" },     // 프로덕션 코드 → 테스트 금지
  { from: "source", to: "docs" },      // 프로덕션 코드 → 문서 금지
  { from: "presentation", to: "domain" } // Presentation → Domain 직접 의존 금지
];

const violations = [];
for (const dep of deps) {
  for (const rule of forbidden) {
    if (dep.sourceNamespace === rule.from && dep.targetNamespace === rule.to) {
      violations.push(dep);
    }
  }
}

if (violations.length > 0) {
  console.error("❌ Architecture violations found:");
  for (const v of violations) {
    console.error(`  ${v.sourceNamespace} → ${v.targetNamespace}: ${v.source} → ${v.target}`);
  }
  process.exit(1);
}

console.log("✅ Architecture boundaries respected");
```

---

### Use Case 3: 문서 유효성 검증

**Scenario**: 문서가 참조하는 소스 코드가 실제로 존재하는지 확인

```bash
# 1. 분석
node dist/cli/namespace-analyzer.js analyze-all

# 2. docs → source 의존성 추출
node dist/cli/namespace-analyzer.js cross-namespace --detailed | grep "docs → source"

# 3. 의존하는 파일이 실제로 존재하는지 검증
```

**결과**:
```
docs → source (3 dependencies):
  📄 docs/API.md
  └─→ src/api/analysis.ts (internal)

  📄 docs/DEPENDENCY_GRAPH_ANALYSIS.md
  └─→ src/database/GraphDatabase.ts (internal)
```

---

### Use Case 4: 모듈 간 결합도 분석

**Scenario**: 마이크로서비스 모노레포에서 서비스 간 결합도 측정

```bash
# 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace auth \
  --patterns "services/auth/**/*"
node dist/cli/namespace-analyzer.js create-namespace payment \
  --patterns "services/payment/**/*"
node dist/cli/namespace-analyzer.js create-namespace shared \
  --patterns "libs/shared/**/*"

# 분석
node dist/cli/namespace-analyzer.js analyze-all

# 서비스 간 의존성 확인
node dist/cli/namespace-analyzer.js cross-namespace --detailed
```

**분석**:
```
auth → shared: 15 dependencies     (✅ 정상 - shared 라이브러리 사용)
payment → shared: 12 dependencies  (✅ 정상)
auth → payment: 3 dependencies     (⚠️ 주의 - 서비스 간 직접 의존)
payment → auth: 0 dependencies     (✅ 정상)
```

---

## 📊 Statistics & Metrics

### Project Statistics (v3.0.0)

```
Total Nodes: 141
Total Edges: 184
Cross-Namespace Edges: 27 (14.7%)

Breakdown by Namespace Pair:
┌─────────────┬──────────────┬───────┬────────┐
│ Source      │ Target       │ Count │ %      │
├─────────────┼──────────────┼───────┼────────┤
│ tests       │ source       │ 22    │ 81.5%  │
│ docs        │ source       │ 3     │ 11.1%  │
│ tests       │ unknown      │ 1     │ 3.7%   │
│ docs        │ unknown      │ 1     │ 3.7%   │
└─────────────┴──────────────┴───────┴────────┘
```

### Common Patterns

**tests → source (정상)**:
- 테스트가 프로덕션 코드를 import
- 가장 흔한 크로스 네임스페이스 의존성
- 비즈니스 로직 복잡도에 영향 없음

**docs → source (정상)**:
- 문서가 소스 코드 예제 참조
- Markdown 파일에서 TypeScript import (분석 시)

**source → tests (비정상)**:
- 프로덕션 코드가 테스트 코드 의존
- 아키텍처 위반
- 즉시 수정 필요

**unknown namespace (주의)**:
- node_modules나 외부 파일 참조
- 대부분 정상이지만 확인 필요

---

## 🔧 Configuration

### analyze-all with Cross-Namespace

```bash
# 크로스 네임스페이스 요약 포함
node dist/cli/namespace-analyzer.js analyze-all --show-cross
```

**Output**:
```
📦 source: 75/76 files, 153 edges
📦 tests: 14/14 files, 26 edges

🔗 Cross-namespace dependencies: 27
  tests → source: 22 dependencies
  docs → source: 3 dependencies
```

### Programmatic API

```typescript
import { namespaceDependencyAnalyzer } from "./src/namespace/NamespaceDependencyAnalyzer";
import { NamespaceGraphDB } from "./src/namespace/NamespaceGraphDB";

// 분석
const { results, graph, crossNamespaceDependencies } =
  await namespaceDependencyAnalyzer.analyzeAll("deps.config.json");

console.log(`Cross-namespace deps: ${crossNamespaceDependencies.length}`);

// 네임스페이스 쌍별 그룹화
const grouped = new Map<string, typeof crossNamespaceDependencies>();
for (const dep of crossNamespaceDependencies) {
  const key = `${dep.sourceNamespace} → ${dep.targetNamespace}`;
  if (!grouped.has(key)) {
    grouped.set(key, []);
  }
  grouped.get(key)?.push(dep);
}

for (const [key, deps] of grouped) {
  console.log(`${key}: ${deps.length} dependencies`);
}

// 데이터베이스에서 조회
const db = new NamespaceGraphDB(".dependency-linker/graph.db");
await db.initialize();
const crossDeps = await db.getCrossNamespaceDependencies();
await db.close();
```

---

## ⚡ Performance

### Query Performance

**getCrossNamespaceDependencies()**:
- 141 nodes, 184 edges: ~50ms
- Algorithm: O(N + E) where N=nodes, E=edges
- Optimization: Edge metadata 사용 (no joins)

### Storage Overhead

**Metadata Size**:
- Per edge: ~100 bytes
- 184 edges: ~18KB
- Negligible compared to total DB size (~100KB)

---

## 🐛 Known Issues

### Issue 1: Unknown Namespace

**Description**: 일부 의존성이 "unknown" 네임스페이스로 분류됨

**Cause**:
- node_modules 파일
- 프로젝트 외부 파일
- 네임스페이스 설정에 매칭되지 않는 파일

**Workaround**: 필요시 해당 파일에 대한 네임스페이스 추가

---

### Issue 2: Discrepancy between analyze-all and database

**Description**: analyze-all 출력(30개)과 database 쿼리(27개)에서 약간의 차이

**Cause**:
- analyze-all: 분석 시점의 in-memory 결과
- database: 저장 후 쿼리 결과 (중복 제거, 필터링)

**Status**: 정상 동작, 중복 제거가 올바르게 작동함을 의미

---

## 🚀 Future Enhancements

### Planned Features

**Cross-Namespace Metrics**:
```typescript
interface CrossNamespaceMetrics {
  couplingScore: number;        // 0-100, 낮을수록 좋음
  fanOut: number;               // 평균 의존 대상 수
  fanIn: number;                // 평균 의존자 수
  circularCrossNamespace: boolean;
}
```

**Dependency Rules Enforcement**:
```json
{
  "rules": [
    { "from": "source", "to": "tests", "allowed": false },
    { "from": "tests", "to": "source", "allowed": true },
    { "from": "presentation", "to": "domain", "allowed": false }
  ]
}
```

**Visualization**:
```bash
node dist/cli/namespace-analyzer.js cross-namespace --visualize --output graph.svg
```

---

## 📚 Related Documentation

- [Dependency Analysis](../dependency-analysis/) - 기본 의존성 분석
- [Namespace Management](../namespace-management/) - 네임스페이스 설정
- [Query System](../query/) - 의존성 쿼리

---

**Last Updated**: 2025-10-02
**Version**: 3.0.0
