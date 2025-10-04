# Inference System - Implementation Tasks

**Feature**: 추론 시스템 (Inference System)
**Status**: 🚧 In Development
**Target Version**: 3.2.0

---

## Phase 1: Core Inference Implementation

### Task 1.1: InferenceEngine 캐시 최적화
**Status**: ⏳ Pending
**Priority**: High
**Files**: `src/database/inference/InferenceEngine.ts`

**Tasks**:
- [ ] 캐시 키 설계 (query type + parameters)
- [ ] LRU 캐시 구현 (max 1000 entries)
- [ ] 캐시 무효화 전략 (DB 변경 시)
- [ ] 캐시 hit/miss 메트릭

**Implementation**:
```typescript
// InferenceEngine.ts
class InferenceEngine {
  private cache: LRUCache<string, InferenceResult>;

  constructor(db: GraphDatabase, options: InferenceEngineConfig) {
    this.cache = new LRUCache({
      max: options.cacheSize || 1000,
      ttl: options.cacheTTL || 60000  // 1분
    });
  }

  async queryHierarchical(
    edgeType: string,
    options: HierarchicalQueryOptions
  ): Promise<InferredRelationship[]> {
    const cacheKey = `hierarchical:${edgeType}:${JSON.stringify(options)}`;

    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 쿼리 실행
    const result = await this._executeHierarchicalQuery(edgeType, options);

    // 캐시 저장
    this.cache.set(cacheKey, result);

    return result;
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
```

**Acceptance Criteria**:
- 캐시 hit rate > 70%
- 성능 향상 > 3배
- Memory usage < 100MB

**Known Challenges**:
- 캐시 무효화 시점 정확히 결정
- Cache key 충돌 방지

---

### Task 1.2: Incremental Inference
**Status**: ⏳ Pending
**Priority**: High
**Files**: `src/database/inference/InferenceEngine.ts`

**Tasks**:
- [ ] 변경된 노드 추적 (dirty flag)
- [ ] 영향받는 inference만 재실행
- [ ] Incremental update 알고리즘

**Implementation**:
```typescript
// InferenceEngine.ts
class InferenceEngine {
  private dirtyNodes: Set<number> = new Set();

  markDirty(nodeId: number): void {
    this.dirtyNodes.add(nodeId);
  }

  async inferIncremental(): Promise<InferenceResult> {
    const results: InferenceResult = {
      updated: [],
      removed: [],
      added: []
    };

    for (const nodeId of this.dirtyNodes) {
      // 1. 기존 추론된 edge 제거
      const oldInferred = await this.db.findEdges({
        fromNodeId: nodeId,
        metadata: { isInferred: true }
      });

      for (const edge of oldInferred) {
        await this.db.deleteEdge(edge.id);
        results.removed.push(edge);
      }

      // 2. 새로운 추론 실행
      const newInferred = await this.inferAll(nodeId);
      results.added.push(...newInferred);
    }

    this.dirtyNodes.clear();
    return results;
  }
}

// GraphDatabase.ts
class GraphDatabase {
  async upsertNode(node: GraphNode): Promise<GraphNode> {
    const result = await this._upsertNode(node);

    // InferenceEngine에 변경 알림
    this.inferenceEngine?.markDirty(result.id);

    return result;
  }
}
```

**Acceptance Criteria**:
- 변경된 노드만 재추론
- 성능 향상 > 10배 (대규모 프로젝트)
- 추론 결과 정확도 100%

---

### Task 1.3: Symbol-Level Inference
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/inference/SymbolInferenceEngine.ts`

**Tasks**:
- [ ] SymbolInferenceEngine 클래스 생성
- [ ] Method call chain 추론
- [ ] Type propagation 추론
- [ ] Symbol-level transitive query

**Implementation**:
```typescript
// SymbolInferenceEngine.ts
class SymbolInferenceEngine extends InferenceEngine {
  async inferMethodCalls(options: {
    file: string;
    method: string;
  }): Promise<MethodCallChain[]> {
    // 1. 메서드 노드 찾기
    const methodNode = await this.db.findNode({
      sourceFile: options.file,
      name: options.method
    });

    // 2. 호출 체인 추론
    const callChain = await this.queryTransitive(methodNode.id, 'calls', {
      maxPathLength: 5,
      direction: 'outgoing'
    });

    return callChain.map(rel => ({
      path: rel.path,
      depth: rel.pathLength,
      methods: rel.path.map(nodeId => this.db.getNode(nodeId))
    }));
  }

  async inferTypePropagation(variableNode: GraphNode): Promise<GraphNode> {
    // Variable의 타입 추론
    // 1. Assignment 추적
    // 2. Type annotation 확인
    // 3. 최종 타입 반환
  }
}
```

**Acceptance Criteria**:
- Method call chain 정확히 추적
- Type propagation 정확도 > 85%
- Symbol-level query 지원

---

## Phase 2: Advanced Query Language

### Task 2.1: Cypher-like Query Parser
**Status**: ⏳ Pending
**Priority**: Low
**Files**: `src/database/query/CypherParser.ts`

**Tasks**:
- [ ] Cypher 문법 파서 구현
- [ ] AST 생성
- [ ] SQL 변환

**Query Examples**:
```cypher
// 1. 간단한 의존성 조회
MATCH (file:File)-[dep:DEPENDS_ON]->(target:File)
WHERE file.namespace = 'tests'
RETURN file, dep, target

// 2. 전이적 의존성
MATCH (file:File)-[dep:DEPENDS_ON*1..3]->(target:File)
WHERE file.name = 'App.tsx'
RETURN file, dep, target

// 3. 영향 분석
MATCH (file:File)<-[dep:DEPENDS_ON*]-(dependent:File)
WHERE file.name = 'QueryEngine.ts'
RETURN dependent, COUNT(dep) as impact_score
ORDER BY impact_score DESC
```

**Implementation**:
```typescript
// CypherParser.ts
class CypherParser {
  parse(query: string): QueryAST {
    // Cypher query → AST
  }

  toSQL(ast: QueryAST): string {
    // AST → SQL (Recursive CTE)
  }
}

// CypherExecutor.ts
class CypherExecutor {
  async execute(query: string): Promise<QueryResult> {
    const ast = this.parser.parse(query);
    const sql = this.parser.toSQL(ast);
    return await this.db.raw(sql);
  }
}

// 사용
const executor = new CypherExecutor(db);
const result = await executor.execute(`
  MATCH (file:File)-[dep:DEPENDS_ON*1..3]->(target:File)
  WHERE file.name = 'App.tsx'
  RETURN file, dep, target
`);
```

**Acceptance Criteria**:
- Cypher 기본 문법 지원 (MATCH, WHERE, RETURN)
- 전이적 쿼리 지원 (`*1..3`)
- SQL 변환 정확도 100%

**Known Challenges**:
- Cypher 문법 복잡도
- SQL Recursive CTE 한계

---

## Phase 3: Custom Inference Rules

### Task 3.1: InferenceRule Registry
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/inference/InferenceRuleRegistry.ts`

**Tasks**:
- [ ] InferenceRule 타입 정의
- [ ] Registry 구현
- [ ] Rule execution engine

**Implementation**:
```typescript
// InferenceRuleRegistry.ts
interface InferenceRule {
  name: string;
  description: string;
  match: (edge: GraphEdge) => boolean;
  infer: (edge: GraphEdge) => Promise<InferredEdge[]>;
  priority: number;
}

class InferenceRuleRegistry {
  private rules: Map<string, InferenceRule> = new Map();

  registerRule(rule: InferenceRule): void {
    this.rules.set(rule.name, rule);
  }

  async executeRules(edge: GraphEdge): Promise<InferredEdge[]> {
    const results: InferredEdge[] = [];

    // Priority 순서로 실행
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.match(edge)) {
        const inferred = await rule.infer(edge);
        results.push(...inferred);
      }
    }

    return results;
  }
}
```

**Acceptance Criteria**:
- Custom rule 등록 가능
- Priority 기반 실행
- Rule conflict 해결

---

### Task 3.2: Built-in Inference Rules
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/inference/rules/*.ts`

**Tasks**:
- [ ] Controller-Service pattern rule
- [ ] Repository-Entity pattern rule
- [ ] Test-Source mapping rule

**Example Rules**:
```typescript
// rules/controller-service.ts
export const controllerServiceRule: InferenceRule = {
  name: 'controller-service-pattern',
  description: 'Infer service dependency from controller',
  priority: 10,

  match: (edge) => {
    return edge.source.endsWith('Controller.ts') &&
           edge.type === 'imports';
  },

  infer: async (edge) => {
    const serviceName = edge.source.replace('Controller', 'Service');

    // Service 파일 존재 확인
    const serviceNode = await db.findNode({
      sourceFile: serviceName
    });

    if (!serviceNode) return [];

    // Controller → Service 추론 edge
    return [{
      fromNodeId: edge.fromNodeId,
      toNodeId: serviceNode.id,
      type: 'requires-service',
      metadata: {
        isInferred: true,
        inferenceRule: 'controller-service-pattern',
        confidence: 0.8
      }
    }];
  }
};

// 등록
registry.registerRule(controllerServiceRule);
```

**Acceptance Criteria**:
- 3개 이상의 built-in rules
- Confidence score 제공
- 문서화 완료

---

## Phase 4: Real-Time Inference

### Task 4.1: File Watcher Integration
**Status**: ⏳ Pending
**Priority**: Low
**Files**: `src/watch/InferenceWatcher.ts`

**Tasks**:
- [ ] File watcher 설정
- [ ] 변경 감지 → 증분 추론
- [ ] Debouncing 처리

**Implementation**:
```typescript
// InferenceWatcher.ts
import chokidar from 'chokidar';

class InferenceWatcher {
  private watcher: chokidar.FSWatcher;
  private debounceTimer: NodeJS.Timeout | null = null;

  async start(options: WatchOptions): Promise<void> {
    this.watcher = chokidar.watch(options.patterns, {
      ignored: options.ignored,
      persistent: true
    });

    this.watcher.on('change', (path) => {
      this.scheduleInference(path);
    });
  }

  private scheduleInference(path: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.inferForFile(path);
    }, 500);  // 500ms debounce
  }

  private async inferForFile(path: string): Promise<void> {
    // 1. 파일 재분석
    await analyzer.analyzeFile(path);

    // 2. 영향받는 노드만 추론
    const nodes = await db.findNodes({ sourceFiles: [path] });
    for (const node of nodes) {
      engine.markDirty(node.id);
    }

    // 3. 증분 추론 실행
    await engine.inferIncremental();

    console.log(`✅ Re-inferred: ${path}`);
  }
}

// 사용
const watcher = new InferenceWatcher(engine, analyzer, db);
await watcher.start({
  patterns: ['src/**/*.ts'],
  ignored: ['node_modules/**', 'dist/**']
});
```

**Acceptance Criteria**:
- 파일 변경 감지
- Debouncing 동작
- 증분 추론 자동 실행

---

## Phase 5: Testing & Validation

### Task 5.1: Inference 정확도 테스트
**Status**: ⏳ Pending
**Files**: `tests/inference-accuracy.test.ts`

**Tasks**:
- [ ] Ground truth dataset 준비
- [ ] 추론 결과 비교
- [ ] Precision/Recall 계산

**Test Dataset**:
```typescript
// fixtures/inference-ground-truth.json
{
  "hierarchical": [
    {
      "query": { "type": "imports", "includeChildren": true },
      "expected": [
        "imports_file",
        "imports_package",
        "imports_default"
      ]
    }
  ],
  "transitive": [
    {
      "query": { "nodeId": 1, "type": "depends_on", "maxDepth": 3 },
      "expected": [
        { "path": [1, 2], "depth": 1 },
        { "path": [1, 2, 3], "depth": 2 },
        { "path": [1, 2, 3, 4], "depth": 3 }
      ]
    }
  ]
}
```

**Acceptance Criteria**:
- Precision > 95%
- Recall > 90%
- F1-score > 92%

---

### Task 5.2: 성능 벤치마크
**Status**: ⏳ Pending
**Files**: `tests/inference-benchmark.test.ts`

**Tasks**:
- [ ] 다양한 크기의 프로젝트 준비 (Small/Medium/Large)
- [ ] 추론 시간 측정
- [ ] Memory usage 측정

**Benchmark Scenarios**:
```typescript
describe('Inference Performance', () => {
  it('should handle small project (< 100 nodes)', async () => {
    const start = performance.now();
    await engine.inferAll();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);  // < 100ms
  });

  it('should handle medium project (100-500 nodes)', async () => {
    const start = performance.now();
    await engine.inferAll();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);  // < 500ms
  });

  it('should handle large project (500+ nodes)', async () => {
    const start = performance.now();
    await engine.inferAll();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2000);  // < 2s
  });
});
```

**Acceptance Criteria**:
- Small project < 100ms
- Medium project < 500ms
- Large project < 2s

---

## Summary

### Progress Tracker
```
Phase 1: Core Inference Implementation  [▱▱▱] 0/3 tasks
Phase 2: Advanced Query Language        [▱] 0/1 task
Phase 3: Custom Inference Rules         [▱▱] 0/2 tasks
Phase 4: Real-Time Inference            [▱] 0/1 task
Phase 5: Testing & Validation           [▱▱] 0/2 tasks

Total: 0/9 tasks completed (0%)
```

### Estimated Timeline
- Phase 1: 6-8 days
- Phase 2: 4-5 days
- Phase 3: 3-4 days
- Phase 4: 2-3 days
- Phase 5: 3-4 days

**Total**: ~18-24 days

### Dependencies
- Phase 2-4 require Phase 1 completion
- Phase 5 requires all other phases

### Priority Ranking
1. **High**: Task 1.1, 1.2 (Core optimization)
2. **Medium**: Task 1.3, 3.1, 3.2 (Symbol-level + Rules)
3. **Low**: Task 2.1, 4.1 (Advanced features)

---

**Last Updated**: 2025-10-05
**Next Review**: Task 1.1 completion
