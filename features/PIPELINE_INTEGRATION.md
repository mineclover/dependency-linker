# 파이프라인 통합 계획 (Pipeline Integration Plan)

**문서 목적**: RDF Addressing, Unknown Symbol System, Inference System이 4단계 파이프라인에서 어떻게 통합되는지 구체적으로 정의

---

## 📐 현재 파이프라인 구조

```
1. EXTRACTION (추출)    → AST 생성, 심볼/의존성 추출
2. STORAGE (저장)       → GraphDB에 Node/Edge 저장
3. ANALYSIS (분석)      → 직접 쿼리, 패턴 분석
4. INFERENCE (추론)     → 간접 관계 추론
```

---

## 🎯 기능별 통합 포인트 매핑

### 1. RDF Addressing

#### 통합 위치: **STORAGE 단계 (2.1 Node Storage)**

**Before (현재)**:
```typescript
// NodeIdentifier.createIdentifier()
const identifier = `class#src/parser.ts::TypeScriptParser@45:2`;
```

**After (RDF 적용)**:
```typescript
// NodeIdentifier.createIdentifier()
const identifier = `dependency-linker/src/parser.ts#Class:TypeScriptParser`;
```

#### 파이프라인 흐름도:

```
1. EXTRACTION
   ↓
   Symbol 추출 (type: "class", name: "TypeScriptParser")
   ↓
2. STORAGE ⭐ [RDF 통합 지점]
   ↓
   NodeIdentifier.createIdentifier(type, name, context)
   ├─ context.projectName 사용
   └─ RDF 형식 identifier 생성
   ↓
   GraphDatabase.upsertNode({ identifier: "..." })
   ↓
3. ANALYSIS
4. INFERENCE
```

#### 영향받는 코드:

**1. NodeIdentifier.ts** (✅ 이미 구현됨):
```typescript
createIdentifier(
  nodeType: string,
  symbolName: string,
  context: NodeContext  // projectName 필드 추가 필요
): string {
  // RDF 형식 생성
  return `${context.projectName}/${context.sourceFile}#${nodeType}:${symbolName}`;
}
```

**2. NamespaceDependencyAnalyzer.ts** (🚧 업데이트 필요):
```typescript
// Line 95-100
const builder = createDependencyGraphBuilder({
  projectRoot,
  projectName: namespaceData.metadata.projectName || "unknown-project", // ⭐ 여기
  entryPoints: absoluteFiles,
});
```

**3. FileDependencyAnalyzer.ts** (🚧 업데이트 필요):
```typescript
// Import 처리 시 projectName 전달
const identifier = this.nodeIdentifier.createIdentifier(
  'unknown',
  item.name,
  {
    sourceFile: targetFilePath,
    language: this.language,
    projectRoot: this.projectRoot,
    projectName: this.projectName  // ⭐ 추가 필요
  }
);
```

**4. SymbolDependencyAnalyzer.ts** (🚧 업데이트 필요):
```typescript
// Symbol 노드 생성 시 projectName 전달
const identifier = this.nodeIdentifier.createIdentifier(
  'class',
  className,
  {
    sourceFile,
    language,
    projectRoot,
    projectName  // ⭐ 추가 필요
  }
);
```

#### 마이그레이션 전략:

**Phase 1**: NodeContext에 projectName 필드 추가 (optional)
```typescript
interface NodeContext {
  sourceFile: string;
  language: SupportedLanguage;
  projectRoot: string;
  projectName?: string;  // ⭐ Optional로 추가 (하위 호환성)
}
```

**Phase 2**: 모든 Analyzer에서 projectName 전달
- NamespaceDependencyAnalyzer → DependencyGraphBuilder
- DependencyGraphBuilder → FileDependencyAnalyzer
- FileDependencyAnalyzer → NodeIdentifier

**Phase 3**: Legacy identifier migration script 실행
```bash
node scripts/migrate-to-rdf.ts
```

---

### 2. Unknown Symbol System

#### 통합 위치: **EXTRACTION (1.3) + STORAGE (2.1, 2.2)**

**파이프라인 흐름도**:

```
1. EXTRACTION ⭐ [Unknown Symbol 통합 지점 #1]
   ↓
   Import 감지: import { User as UserType } from './types'
   ↓
   ImportItem[] 생성:
   [{ name: "User", alias: "UserType", from: "./types" }]
   ↓
2. STORAGE ⭐ [Unknown Symbol 통합 지점 #2]
   ↓
   FileDependencyAnalyzer.createUnknownSymbolNodes()
   ├─ Original Unknown Node (타겟 파일)
   │  └─ types.ts#Unknown:User
   ├─ Alias Unknown Node (소스 파일)
   │  └─ App.tsx#Unknown:UserType
   └─ aliasOf Edge 생성
   ↓
3. ANALYSIS
   ↓
   Unknown 노드 조회, Alias 체인 추적
   ↓
4. INFERENCE ⭐ [Unknown Symbol 통합 지점 #3]
   ↓
   InferenceEngine.resolveUnknownNodes()
   └─ Unknown:User → Class:User 연결
```

#### 영향받는 코드:

**1. FileDependencyAnalyzer.ts** (✅ 이미 구현됨):
```typescript
private async createUnknownSymbolNodes(
  sourceFile: string,
  targetFilePath: string,
  importItems: ImportItem[],
  language: SupportedLanguage,
): Promise<void> {
  for (const item of importItems) {
    // 1. Original Unknown Node (타겟 파일)
    const originalNode = await this.database.upsertNode({
      identifier: `${targetFilePath}#Unknown:${item.name}`,
      type: "unknown",
      name: item.name,
      sourceFile: targetFilePath,
      metadata: { isImported: false }
    });

    // 2. Alias Unknown Node (소스 파일)
    if (item.alias) {
      const aliasNode = await this.database.upsertNode({
        identifier: `${sourceFile}#Unknown:${item.alias}`,
        type: "unknown",
        name: item.alias,
        sourceFile: sourceFile,
        metadata: {
          isImported: true,
          isAlias: true,
          originalName: item.name,
          importedFrom: targetFilePath
        }
      });

      // 3. aliasOf Edge
      await this.database.upsertRelationship({
        fromNodeId: aliasNode.id,
        toNodeId: originalNode.id,
        type: "aliasOf"
      });
    }
  }
}
```

**2. InferenceEngine.ts** (🚧 구현 필요):
```typescript
// INFERENCE 단계에서 Unknown → Actual 추론
async resolveUnknownNodes(): Promise<ResolvedNode[]> {
  const unknownNodes = await this.db.findNodes({ type: 'unknown' });
  const resolved: ResolvedNode[] = [];

  for (const unknown of unknownNodes) {
    const targetFile = unknown.metadata?.importedFrom;
    if (!targetFile) continue;

    // 타겟 파일에서 실제 심볼 찾기
    const actualNodes = await this.db.findNodes({
      sourceFiles: [targetFile],
      names: [unknown.metadata?.originalName || unknown.name]
    });

    if (actualNodes.length === 0) continue;

    // Unknown → Actual 연결
    await this.db.upsertRelationship({
      fromNodeId: unknown.id,
      toNodeId: actualNodes[0].id,
      type: 'resolved-to',
      metadata: { isInferred: true }
    });

    resolved.push({ unknown, actual: actualNodes[0] });
  }

  return resolved;
}
```

#### 현재 상태:
- ✅ **EXTRACTION + STORAGE**: Dual-Node Pattern 구현 완료
- 🚧 **INFERENCE**: Unknown → Actual 추론 미구현

---

### 3. Inference System

#### 통합 위치: **INFERENCE 단계 (4. INFERENCE)**

**파이프라인 흐름도**:

```
1. EXTRACTION
2. STORAGE
3. ANALYSIS
   ↓
4. INFERENCE ⭐ [Inference System 통합 지점]
   ↓
   InferenceEngine 실행
   ├─ 4.1 Hierarchical Inference
   │  └─ EdgeTypeRegistry에서 타입 계층 조회
   ├─ 4.2 Transitive Inference
   │  └─ SQL Recursive CTE로 체인 추적
   └─ 4.3 Inheritable Inference
      └─ 상속 관계 기반 전파
   ↓
   Inferred Edges 생성
```

#### 영향받는 코드:

**1. NamespaceDependencyAnalyzer.ts** (🚧 통합 필요):
```typescript
async analyzeNamespace(
  namespace: string,
  configPath: string,
  options: { cwd?: string; projectRoot?: string } = {}
): Promise<NamespaceDependencyResult> {
  // ... 기존 분석 로직 ...

  // Build dependency graph
  const graphResult = await builder.build();

  // ⭐ INFERENCE 단계 추가
  const inferenceEngine = new InferenceEngine(graphResult.database);

  // 1. Unknown 노드 해소
  await inferenceEngine.resolveUnknownNodes();

  // 2. 전이적 의존성 추론
  const nodes = await graphResult.database.getAllNodes();
  for (const node of nodes) {
    await inferenceEngine.queryTransitive(node.id, 'depends_on', {
      maxPathLength: 5
    });
  }

  // 3. 계층적 추론 (자동 실행)
  await inferenceEngine.queryHierarchical('imports', {
    includeChildren: true
  });

  return {
    namespace,
    totalFiles: absoluteFiles.length,
    analyzedFiles: graphResult.stats.filesProcessed,
    failedFiles: graphResult.stats.errors.map(e => e.file),
    errors: graphResult.stats.errors.map(e => e.error.message),
    graphStats: {
      nodes: graphResult.stats.nodesCreated,
      edges: graphResult.stats.edgesCreated,
      circularDependencies: 0,
    },
    scenariosExecuted: scenarioExecutionOrder,
  };
}
```

**2. InferenceEngine.ts** (🚧 최적화 필요):
```typescript
class InferenceEngine {
  private cache: LRUCache<string, InferenceResult>;

  constructor(db: GraphDatabase, options?: InferenceEngineConfig) {
    this.db = db;
    this.cache = new LRUCache({
      max: options?.cacheSize || 1000,
      ttl: options?.cacheTTL || 60000
    });
  }

  // 캐시 활용 계층적 쿼리
  async queryHierarchical(
    edgeType: string,
    options: HierarchicalQueryOptions
  ): Promise<InferredRelationship[]> {
    const cacheKey = `hierarchical:${edgeType}:${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await this._executeHierarchicalQuery(edgeType, options);
    this.cache.set(cacheKey, result);

    return result;
  }

  // 증분 추론
  async inferIncremental(nodeIds: number[]): Promise<InferenceResult> {
    // 변경된 노드만 재추론
    const results: InferenceResult = {
      updated: [],
      removed: [],
      added: []
    };

    for (const nodeId of nodeIds) {
      // 기존 추론 제거
      const oldInferred = await this.db.findEdges({
        fromNodeId: nodeId,
        metadata: { isInferred: true }
      });

      for (const edge of oldInferred) {
        await this.db.deleteEdge(edge.id);
        results.removed.push(edge);
      }

      // 새 추론 실행
      const newInferred = await this.inferAll(nodeId);
      results.added.push(...newInferred);
    }

    return results;
  }
}
```

#### 현재 상태:
- ✅ **기본 구현**: 3가지 추론 타입 구현됨
- 🚧 **캐시 최적화**: LRU 캐시 미구현
- 🚧 **증분 추론**: Incremental inference 미구현
- 🚧 **파이프라인 통합**: NamespaceDependencyAnalyzer에 미통합

---

## 🔄 전체 통합 플로우

### 전체 파이프라인 (3가지 기능 통합)

```typescript
// NamespaceDependencyAnalyzer.analyzeNamespace()

// ===== 1. EXTRACTION =====
const builder = createDependencyGraphBuilder({
  projectRoot,
  projectName: namespaceData.metadata.projectName,  // ⭐ RDF: projectName 전달
  entryPoints: absoluteFiles,
});

// ===== 2. STORAGE =====
const graphResult = await builder.build();
// 내부에서:
// - NodeIdentifier.createIdentifier() → RDF 형식 ⭐
// - FileDependencyAnalyzer.createUnknownSymbolNodes() → Dual-Node ⭐
// - GraphDatabase.upsertNode() → RDF identifier 저장 ⭐

// ===== 3. ANALYSIS =====
// (현재는 분석 스킵, 향후 Scenario 기반 분석)

// ===== 4. INFERENCE ===== ⭐ [새로 추가 필요]
const inferenceEngine = new InferenceEngine(graphResult.database, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// Step 1: Unknown 노드 해소
await inferenceEngine.resolveUnknownNodes();

// Step 2: 계층적 추론
await inferenceEngine.queryHierarchical('imports', {
  includeChildren: true
});

// Step 3: 전이적 추론 (선택적, LLM 컨텍스트 구성 시)
// const nodes = await graphResult.database.getAllNodes();
// for (const node of nodes) {
//   await inferenceEngine.queryTransitive(node.id, 'depends_on', {
//     maxPathLength: 3
//   });
// }

// ===== 5. RETURN =====
return {
  namespace,
  totalFiles: absoluteFiles.length,
  analyzedFiles: graphResult.stats.filesProcessed,
  graphStats: {
    nodes: graphResult.stats.nodesCreated,
    edges: graphResult.stats.edgesCreated,
    circularDependencies: 0,
  },
  scenariosExecuted: scenarioExecutionOrder,
  // ⭐ 새 필드 추가
  inferenceStats: {
    unknownResolved: resolvedNodes.length,
    inferredEdges: inferredEdges.length,
  }
};
```

---

## 📋 통합 작업 체크리스트

### RDF Addressing 통합

**Phase 1: Core Type Updates**
- [ ] `NodeContext` 인터페이스에 `projectName?: string` 추가
- [ ] `GraphNode` 타입에 RDF 검증 추가
- [ ] `NamespaceDependencyResult`에 projectName 전달 확인

**Phase 2: Analyzer Updates**
- [ ] `NamespaceDependencyAnalyzer`: projectName → DependencyGraphBuilder
- [ ] `DependencyGraphBuilder`: projectName → FileDependencyAnalyzer
- [ ] `FileDependencyAnalyzer`: projectName → NodeIdentifier
- [ ] `SymbolDependencyAnalyzer`: projectName → NodeIdentifier

**Phase 3: Migration**
- [ ] Legacy identifier migration script 작성
- [ ] 기존 GraphDB 데이터 변환
- [ ] 테스트 실행 및 검증

---

### Unknown Symbol System 통합

**Phase 1: Inference Integration** (현재 미구현)
- [ ] `InferenceEngine.resolveUnknownNodes()` 구현
- [ ] `NamespaceDependencyAnalyzer`에 추론 단계 추가
- [ ] Unknown → Actual 연결 테스트

**Phase 2: Enhancement** (선택적)
- [ ] `findAliasChain()` 메서드 구현
- [ ] `trackCrossFileAliases()` 메서드 구현
- [ ] Batch Unknown Node Creation 최적화

---

### Inference System 통합

**Phase 1: Pipeline Integration**
- [ ] `NamespaceDependencyAnalyzer`에 InferenceEngine 통합
- [ ] Unknown 노드 해소 실행
- [ ] 계층적 추론 자동 실행

**Phase 2: Optimization**
- [ ] LRU 캐시 구현
- [ ] Incremental inference 구현
- [ ] 성능 벤치마크 (Small/Medium/Large 프로젝트)

**Phase 3: Advanced Features** (선택적)
- [ ] Symbol-level inference
- [ ] Custom inference rules
- [ ] Real-time inference (file watcher)

---

## 🎯 우선순위 제안

### High Priority (즉시 처리)
1. **RDF Addressing - Phase 1+2** (3-4일)
   - NodeContext에 projectName 전파
   - 모든 Analyzer 업데이트
   - 기본 기능 완성

2. **Inference System - Phase 1** (2-3일)
   - NamespaceDependencyAnalyzer 통합
   - Unknown 노드 해소 실행
   - 파이프라인 완성

### Medium Priority (순차 진행)
3. **RDF Addressing - Phase 3** (2-3일)
   - Legacy 데이터 마이그레이션
   - 전체 시스템 검증

4. **Inference System - Phase 2** (4-5일)
   - 캐시 최적화
   - Incremental inference

### Low Priority (향후 개선)
5. **Unknown Symbol - Phase 2** (3-4일)
   - Alias chain, Cross-file tracking

6. **Inference System - Phase 3** (5-7일)
   - Symbol-level inference
   - Custom rules, Real-time

---

## 🔍 검증 방법

### End-to-End 테스트

```typescript
// tests/pipeline-integration.test.ts
describe('Pipeline Integration', () => {
  it('should use RDF addresses throughout pipeline', async () => {
    // 1. EXTRACTION + STORAGE (RDF)
    const analyzer = new NamespaceDependencyAnalyzer();
    const result = await analyzer.analyzeNamespace('source', configPath);

    // 2. 모든 노드가 RDF 형식인지 확인
    const nodes = await db.getAllNodes();
    for (const node of nodes) {
      expect(node.identifier).toMatch(/^[\w-]+\/[\w/.]+#\w+:[\w.]+$/);
    }

    // 3. Unknown 노드가 해소되었는지 확인
    const unknownNodes = await db.findNodes({ type: 'unknown' });
    const resolvedEdges = await db.findEdges({
      type: 'resolved-to',
      fromNodeIds: unknownNodes.map(n => n.id)
    });
    expect(resolvedEdges.length).toBeGreaterThan(0);

    // 4. 추론된 엣지 확인
    const inferredEdges = await db.findEdges({
      metadata: { isInferred: true }
    });
    expect(inferredEdges.length).toBeGreaterThan(0);
  });
});
```

---

## 📊 예상 일정

```
Week 1:
  Day 1-2: RDF Phase 1 (NodeContext 업데이트)
  Day 3-4: RDF Phase 2 (Analyzer 업데이트)
  Day 5: Inference Phase 1 (파이프라인 통합)

Week 2:
  Day 1-2: RDF Phase 3 (마이그레이션)
  Day 3-5: Inference Phase 2 (최적화)

Week 3:
  Day 1-3: Unknown Symbol Phase 2 (Enhancement)
  Day 4-5: 전체 통합 테스트 및 검증

Total: ~15일 (High + Medium Priority)
```

---

**Last Updated**: 2025-10-05
**Next Review**: RDF Phase 1 완료 시
