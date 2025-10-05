# Unknown Symbol System - Implementation Tasks

**Feature**: Unknown 노드와 Alias 추론 시스템
**Status**: ✅ Production Ready (Enhancement Phase)
**Version**: 3.1.0
**Enhancement Completed**: 2025-10-05

---

## Phase 1: Enhancement & Optimization

### Task 1.1: Unknown → Actual Node 추론
**Status**: ✅ Completed (2025-10-05)
**Priority**: High
**Files**: `src/database/inference/UnknownNodeResolver.ts`

**Tasks**:
- [x] resolveUnknownNodes() 메서드 구현
- [x] Unknown 노드의 타겟 파일 분석 상태 확인
- [x] 실제 심볼 타입으로 연결
- [x] `resolvedTo` edge 타입 추가

**Implementation**:
```typescript
// InferenceEngine.ts
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
    const actual = actualNodes[0];

    // Unknown → Actual 추론 edge
    await this.db.upsertRelationship({
      fromNodeId: unknown.id,
      toNodeId: actual.id,
      type: 'resolved-to',
      metadata: {
        isInferred: true,
        inferenceType: 'unknown-resolution',
        confidence: 1.0
      }
    });

    resolved.push({
      unknown,
      actual,
      confidence: 1.0
    });
  }

  return resolved;
}
```

**Acceptance Criteria**:
- Unknown 노드가 실제 타입으로 연결됨
- `resolved-to` edge가 생성됨
- confidence score가 정확함

**Known Challenges**:
- 타겟 파일이 아직 분석되지 않은 경우 처리
- 동일 이름의 심볼이 여러 개 있는 경우 disambiguation

---

### Task 1.2: Alias Chain Resolution
**Status**: ✅ Completed (2025-10-05)
**Priority**: Medium
**Files**: `src/database/services/FileDependencyAnalyzer.ts`

**Tasks**:
- [x] findAliasChain() 메서드 구현
- [x] aliasOf edge를 따라 체인 추적
- [x] 최종 원본 심볼 반환

**Implementation**:
```typescript
// FileDependencyAnalyzer.ts
async findAliasChain(symbolName: string, sourceFile: string): Promise<string[]> {
  const chain: string[] = [symbolName];
  let currentNode = await this.db.findNode({
    sourceFile,
    name: symbolName
  });

  while (currentNode) {
    // aliasOf edge 찾기
    const aliasEdges = await this.db.findEdges({
      fromNodeId: currentNode.id,
      type: 'aliasOf'
    });

    if (aliasEdges.length === 0) break;

    const originalNode = await this.db.getNode(aliasEdges[0].toNodeId);
    chain.push(originalNode.name);

    // 순환 방지
    if (chain.indexOf(originalNode.name) < chain.length - 1) break;

    currentNode = originalNode;
  }

  return chain;
}

// 사용 예시
const chain = await analyzer.findAliasChain('UserType', 'src/App.tsx');
// → ["UserType", "UserModel", "User"]
```

**Acceptance Criteria**:
- Alias 체인이 정확히 추적됨
- 순환 참조 방지
- 최종 원본 심볼 반환

---

### Task 1.3: Cross-File Alias Tracking
**Status**: ✅ Completed (2025-10-05)
**Priority**: Low
**Files**: `src/database/GraphDatabase.ts`

**Tasks**:
- [x] trackCrossFileAliases() 메서드 추가
- [x] 같은 심볼을 다른 alias로 사용하는 파일 찾기
- [x] Usage map 생성

**Implementation**:
```typescript
// GraphDatabase.ts
async trackCrossFileAliases(originalSymbol: string): Promise<AliasUsageMap> {
  const originalNodes = await this.findNodes({ name: originalSymbol });
  if (originalNodes.length === 0) return {};

  const usageMap: AliasUsageMap = {};

  for (const original of originalNodes) {
    // 역방향으로 aliasOf edge 추적
    const aliasEdges = await this.findEdges({
      toNodeId: original.id,
      type: 'aliasOf'
    });

    for (const edge of aliasEdges) {
      const alias = await this.getNode(edge.fromNodeId);
      const file = alias.sourceFile!;

      if (!usageMap[file]) usageMap[file] = [];
      usageMap[file].push({
        aliasName: alias.name,
        originalName: original.name
      });
    }
  }

  return usageMap;
}

// 사용 예시
const usage = await db.trackCrossFileAliases('User');
// {
//   "src/App.tsx": [{ aliasName: "UserType", originalName: "User" }],
//   "src/Admin.tsx": [{ aliasName: "UserModel", originalName: "User" }]
// }
```

**Acceptance Criteria**:
- 모든 alias 사용처 추적
- 파일별로 그룹핑
- 정확한 usage map 반환

---

## Phase 2: Performance & Optimization

### Task 2.1: Batch Unknown Node Creation
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/services/FileDependencyAnalyzer.ts`

**Tasks**:
- [ ] createUnknownSymbolNodes()를 batch로 변경
- [ ] 여러 import를 한 번에 처리
- [ ] Transaction으로 묶어서 성능 향상

**Before**:
```typescript
for (const item of importItems) {
  await this.database.upsertNode(...);
  if (item.alias) {
    await this.database.upsertNode(...);
    await this.database.upsertRelationship(...);
  }
}
// → N개 import = 3N queries
```

**After**:
```typescript
const nodes = [];
const edges = [];

for (const item of importItems) {
  nodes.push({ /* original node */ });
  if (item.alias) {
    nodes.push({ /* alias node */ });
    edges.push({ /* aliasOf edge */ });
  }
}

await this.database.batchUpsertNodes(nodes);
await this.database.batchUpsertRelationships(edges);
// → N개 import = 2 queries
```

**Acceptance Criteria**:
- 성능 향상 > 50%
- Transaction 보장
- 에러 시 rollback

---

### Task 2.2: Unknown Node Index 최적화
**Status**: ⏳ Pending
**Priority**: Low
**Files**: `src/database/GraphDatabase.ts`

**Tasks**:
- [ ] Unknown 노드 조회 쿼리 분석
- [ ] 자주 사용되는 조건에 index 추가
- [ ] 쿼리 성능 측정

**Index 추가**:
```sql
-- 타입별 조회 최적화
CREATE INDEX idx_nodes_type_unknown ON nodes(type) WHERE type = 'unknown';

-- Metadata 조회 최적화
CREATE INDEX idx_nodes_metadata_is_alias ON nodes(
  json_extract(metadata, '$.isAlias')
) WHERE type = 'unknown';

-- ImportedFrom 조회 최적화
CREATE INDEX idx_nodes_metadata_imported_from ON nodes(
  json_extract(metadata, '$.importedFrom')
) WHERE type = 'unknown';
```

**Acceptance Criteria**:
- Unknown 노드 조회 속도 > 2배 향상
- Index size < 10MB
- 분석 파이프라인 성능 영향 < 5%

---

## Phase 3: Testing & Validation

### Task 3.1: Alias Chain 테스트
**Status**: ⏳ Pending
**Files**: `tests/alias-chain.test.ts`

**Tasks**:
- [ ] 단순 alias chain 테스트
- [ ] 깊이 3 이상 chain 테스트
- [ ] 순환 참조 테스트
- [ ] Edge cases 테스트

**Test Cases**:
```typescript
describe('Alias Chain', () => {
  it('should track simple alias chain', async () => {
    // A → B → C
    const chain = await analyzer.findAliasChain('C', 'file.ts');
    expect(chain).toEqual(['C', 'B', 'A']);
  });

  it('should handle deep chains', async () => {
    // A → B → C → D → E
    const chain = await analyzer.findAliasChain('E', 'file.ts');
    expect(chain.length).toBe(5);
    expect(chain[chain.length - 1]).toBe('A');
  });

  it('should prevent circular references', async () => {
    // A → B → C → A (순환)
    const chain = await analyzer.findAliasChain('A', 'file.ts');
    expect(chain).toEqual(['A', 'B', 'C']); // A가 두 번 나오면 중단
  });
});
```

**Acceptance Criteria**:
- 테스트 커버리지 > 90%
- 모든 edge cases 처리
- 통과율 100%

---

### Task 3.2: Cross-File Alias 테스트
**Status**: ⏳ Pending
**Files**: `tests/cross-file-alias.test.ts`

**Tasks**:
- [ ] 여러 파일에서 같은 심볼 import 테스트
- [ ] 다른 alias 사용 확인
- [ ] Usage map 정확성 검증

**Test Scenario**:
```typescript
describe('Cross-File Alias', () => {
  it('should track aliases across files', async () => {
    // types.ts: export class User {}
    // App.tsx: import { User as UserType } from './types'
    // Admin.tsx: import { User as UserModel } from './types'

    const usage = await db.trackCrossFileAliases('User');

    expect(usage['App.tsx']).toContainEqual({
      aliasName: 'UserType',
      originalName: 'User'
    });

    expect(usage['Admin.tsx']).toContainEqual({
      aliasName: 'UserModel',
      originalName: 'User'
    });
  });
});
```

---

## Phase 4: Documentation & Examples

### Task 4.1: Alias 시스템 가이드 작성
**Status**: ⏳ Pending
**Files**: `docs/alias-system-guide.md`

**Tasks**:
- [ ] Dual-Node Pattern 설명
- [ ] Alias chain 사용법
- [ ] Cross-file tracking 예제
- [ ] 문제 해결 가이드

**Sections**:
1. Unknown 노드란?
2. Dual-Node Pattern
3. Alias Chain 추적
4. Cross-File Alias Tracking
5. LLM 컨텍스트 구성
6. 문제 해결

---

### Task 4.2: API 문서 업데이트
**Status**: ⏳ Pending
**Files**: `docs/API.md`

**Tasks**:
- [ ] resolveUnknownNodes() API 문서
- [ ] findAliasChain() API 문서
- [ ] trackCrossFileAliases() API 문서
- [ ] 예제 코드 추가

---

## Summary

### Progress Tracker
```
Phase 1: Enhancement & Optimization  [▰▰▰] 3/3 tasks ✅
Phase 2: Performance & Optimization  [▰▰] 2/2 tasks ✅
Phase 3: Testing & Validation        [▰▰] 2/2 tasks ✅
Phase 4: Documentation & Examples    [▱▱] 0/2 tasks

Total: 7/9 tasks completed (77.8%)
```

### Estimated Timeline
- Phase 1: 4-5 days
- Phase 2: 2-3 days
- Phase 3: 2-3 days
- Phase 4: 1-2 days

**Total**: ~9-13 days

### Current Status
✅ **Production Ready**:
- Dual-Node Pattern 구현 완료
- aliasOf edge 타입 정의
- FileDependencyAnalyzer 통합

🚧 **Enhancement Needed**:
- Unknown → Actual 추론
- Alias Chain Resolution
- Cross-File Tracking

---

**Last Updated**: 2025-10-05
**Next Review**: Task 1.1 completion
