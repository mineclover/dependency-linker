# RDF Addressing - Implementation Tasks

**Feature**: RDF 기반 노드 식별 시스템
**Status**: 🚧 In Development
**Target Version**: 3.1.0

---

## Phase 1: Core RDF Implementation

### Task 1.1: NodeContext에 projectName 전파
**Status**: ⏳ Pending
**Files**: `src/database/core/NodeIdentifier.ts`, `src/graph/types.ts`

**Tasks**:
- [ ] NodeContext 타입에 `projectName?: string` 필드 추가
- [ ] createIdentifier() 호출 시 projectName 전달 확인
- [ ] 모든 NodeContext 사용처 업데이트

**Acceptance Criteria**:
- NodeContext에 projectName 필드 존재
- createIdentifier() 호출 시 projectName 자동 전달
- 타입 에러 없음

**Known Challenges**:
- NodeContext는 여러 곳에서 사용되므로 하위 호환성 유지 필요
- Optional 필드로 처리하여 기존 코드 영향 최소화

---

### Task 1.2: 기존 NodeIdentifier 사용처 업데이트
**Status**: ⏳ Pending
**Files**: `src/database/services/*.ts`, `src/scenarios/*.ts`

**Tasks**:
- [ ] FileDependencyAnalyzer에서 projectName 전달
- [ ] SymbolDependencyAnalyzer에서 projectName 전달
- [ ] MarkdownDependencyAnalyzer에서 projectName 전달
- [ ] Scenario analyzers에서 projectName 전달
- [ ] GraphDatabase 메서드에서 projectName 전달

**Acceptance Criteria**:
- 모든 createIdentifier() 호출에 projectName 포함
- RDF 형식의 identifier가 올바르게 생성됨
- 기존 테스트가 통과

**Known Challenges**:
- 50+ 사용처 예상
- Namespace 없는 경우 기본값 처리 필요 ("default-project")

---

### Task 1.3: RDF 주소 검증 강화
**Status**: ⏳ Pending
**Files**: `src/database/core/NodeIdentifier.ts`

**Tasks**:
- [ ] validateIdentifier()에 RDF 형식 검증 추가
- [ ] 잘못된 형식 감지 및 에러 메시지
- [ ] 에러 복구 전략 (fallback to legacy format)

**Validation Rules**:
```typescript
// ✅ Valid
"dependency-linker/src/parser.ts#Class:TypeScriptParser"
"library#react"
"package#@types/node"

// ❌ Invalid
"src/parser.ts#Class:TypeScriptParser"  // no project name
"dependency-linker/src/parser.ts"        // no meta tag (for file nodes, OK)
"dependency-linker#Class:Parser"         // no file path
```

**Acceptance Criteria**:
- Invalid RDF 주소는 ValidationError 발생
- 에러 메시지가 명확함
- Legacy 형식은 warning과 함께 허용

---

## Phase 2: Testing & Validation

### Task 2.1: 단위 테스트 작성
**Status**: ⏳ Pending
**Files**: `tests/rdf-addressing.test.ts`

**Tasks**:
- [ ] createIdentifier() RDF 형식 테스트
- [ ] parseRdfAddress() 파싱 테스트
- [ ] validateIdentifier() 검증 테스트
- [ ] Edge cases 테스트 (외부 라이브러리, 특수 문자)

**Test Cases**:
```typescript
describe('RDF Addressing', () => {
  it('should create RDF identifier for class', () => {
    const id = identifier.createIdentifier('class', 'User', {
      sourceFile: 'src/types.ts',
      projectName: 'my-project'
    });
    expect(id).toBe('my-project/src/types.ts#Class:User');
  });

  it('should parse RDF address correctly', () => {
    const parsed = identifier.parseRdfAddress(
      'my-project/src/types.ts#Class:User'
    );
    expect(parsed.projectName).toBe('my-project');
    expect(parsed.filePath).toBe('src/types.ts');
    expect(parsed.nodeType).toBe('Class');
    expect(parsed.symbolName).toBe('User');
  });

  it('should handle nested symbols', () => {
    const id = identifier.createIdentifier('method', 'User.getName', {
      sourceFile: 'src/types.ts',
      projectName: 'my-project'
    });
    expect(id).toBe('my-project/src/types.ts#Method:User.getName');
  });

  it('should handle external libraries', () => {
    const id = identifier.createIdentifier('library', 'react', {
      sourceFile: 'external',
      projectName: ''
    });
    expect(id).toBe('library#react');
  });
});
```

**Acceptance Criteria**:
- 테스트 커버리지 > 90%
- 모든 edge cases 처리
- 통과율 100%

---

### Task 2.2: 통합 테스트
**Status**: ⏳ Pending
**Files**: `tests/rdf-integration.test.ts`

**Tasks**:
- [ ] 전체 분석 파이프라인에서 RDF 주소 확인
- [ ] GraphDB에 저장된 identifier 형식 검증
- [ ] Cross-namespace RDF 주소 테스트

**Test Scenario**:
```typescript
describe('RDF Integration', () => {
  it('should use RDF addresses in full analysis', async () => {
    const analyzer = new NamespaceDependencyAnalyzer(db, config);
    const result = await analyzer.analyze('source');

    // 모든 노드가 RDF 형식인지 확인
    const nodes = await db.getAllNodes();
    for (const node of nodes) {
      expect(node.identifier).toMatch(/^[\w-]+\/[\w/.]+#\w+:[\w.]+$/);
    }
  });

  it('should handle cross-namespace references', async () => {
    // source namespace에서 tests namespace 참조
    const edge = await db.findEdges({
      fromNamespace: 'source',
      toNamespace: 'tests'
    });

    expect(edge[0].sourceIdentifier).toContain('source/');
    expect(edge[0].targetIdentifier).toContain('tests/');
  });
});
```

**Acceptance Criteria**:
- 전체 파이프라인에서 RDF 주소 사용
- Cross-namespace 참조 정상 작동
- 성능 저하 없음 (< 5%)

---

## Phase 3: Migration & Tooling

### Task 3.1: Legacy 데이터 마이그레이션
**Status**: ⏳ Pending
**Files**: `scripts/migrate-to-rdf.ts`

**Tasks**:
- [ ] 기존 GraphDB에서 legacy identifier 읽기
- [ ] RDF 형식으로 변환
- [ ] 새 identifier로 업데이트
- [ ] Edge의 source/target도 함께 업데이트

**Migration Script**:
```typescript
// scripts/migrate-to-rdf.ts
import { createGraphDatabase } from '../src/database/GraphDatabase';
import { NodeIdentifier } from '../src/database/core/NodeIdentifier';

async function migrateLegacyToRDF() {
  const db = createGraphDatabase('.dependency-linker/graph.db');
  await db.initialize();

  const nodes = await db.getAllNodes();
  const identifier = new NodeIdentifier(process.cwd());

  for (const node of nodes) {
    // Legacy: "class#src/parser.ts::Parser@45:2"
    // RDF:    "my-project/src/parser.ts#Class:Parser"

    const legacy = node.identifier;
    if (isRDFFormat(legacy)) continue; // 이미 RDF 형식

    const rdf = convertToRDF(legacy, node.sourceFile, node.type);

    await db.updateNode(node.id, { identifier: rdf });
  }

  // Edge의 identifier도 업데이트
  const edges = await db.getAllEdges();
  for (const edge of edges) {
    // source/target identifier 업데이트
    await db.updateEdge(edge.id, {
      sourceIdentifier: convertToRDF(...),
      targetIdentifier: convertToRDF(...)
    });
  }

  await db.close();
  console.log('✅ Migration complete');
}
```

**Acceptance Criteria**:
- 모든 legacy identifier가 RDF로 변환
- 데이터 무결성 유지 (edge 관계 보존)
- Rollback 가능 (백업 생성)

**Known Challenges**:
- Legacy 형식이 여러 버전 존재 가능
- projectName 추론 로직 필요 (NamespaceConfig에서)

---

### Task 3.2: CLI 검색 명령어 구현
**Status**: ⏳ Pending
**Files**: `src/cli/namespace-analyzer.ts`

**Tasks**:
- [ ] `find-symbol <rdf-address>` 명령어 추가
- [ ] RDF 주소 파싱 및 검증
- [ ] GraphDB에서 노드 조회
- [ ] 파일 위치 및 상세 정보 출력

**CLI Command**:
```bash
# 심볼 검색
$ deps analyze find-symbol "dependency-linker/src/parser.ts#Method:parse"

# 출력:
# ✅ Found: TypeScriptParser.parse
# 📁 File: /Users/user/project/dependency-linker/src/parser.ts
# 📍 Line: 67
# 🔖 Type: Method
# 📦 Namespace: source
#
# 📊 Dependencies (3):
#   - dependency-linker/src/types.ts#Interface:ParseResult
#   - dependency-linker/src/utils.ts#Function:normalizeCode
#   - library#tree-sitter
```

**Acceptance Criteria**:
- RDF 주소로 심볼 검색 가능
- 파일 위치 정확히 출력
- 의존성 정보도 함께 출력

---

### Task 3.3: 고유성 검증 도구
**Status**: ⏳ Pending
**Files**: `src/cli/namespace-analyzer.ts`

**Tasks**:
- [ ] `validate-uniqueness` 명령어 추가
- [ ] 같은 파일 내 중복 심볼 감지
- [ ] 경고 메시지 출력

**CLI Command**:
```bash
$ deps analyze validate-uniqueness

# 출력:
# 🔍 Checking symbol uniqueness...
#
# ⚠️  Found 2 duplicate symbols:
#
# src/utils.ts:
#   - calculate (line 15)
#   - calculate (line 42)
#   ❌ Same file has duplicate symbol names
#
# src/types.ts:
#   - User (line 10)
#   - User (line 30)
#   ❌ Same file has duplicate symbol names
#
# 💡 Recommendation:
#    Rename symbols to be more specific:
#    - calculate → calculateTotal, calculateAverage
#    - User → UserData, UserConfig
```

**Acceptance Criteria**:
- 중복 심볼 감지 정확도 100%
- 명확한 경고 메시지
- 해결 방법 제안

---

## Phase 4: Documentation & Examples

### Task 4.1: 사용자 가이드 작성
**Status**: ⏳ Pending
**Files**: `docs/rdf-addressing-guide.md`

**Tasks**:
- [ ] RDF 주소 형식 설명
- [ ] 사용 예제 (CLI, API)
- [ ] Migration 가이드
- [ ] FAQ

**Sections**:
1. RDF 주소란?
2. 형식 및 규칙
3. CLI 사용법
4. API 사용법
5. 기존 프로젝트 마이그레이션
6. 문제 해결

---

### Task 4.2: API 문서 업데이트
**Status**: ⏳ Pending
**Files**: `docs/API.md`

**Tasks**:
- [ ] NodeIdentifier API 문서화
- [ ] createIdentifier() 파라미터 설명
- [ ] parseRdfAddress() 반환값 설명
- [ ] 예제 코드 추가

---

## Summary

### Progress Tracker
```
Phase 1: Core RDF Implementation    [▱▱▱▱▱] 0/3 tasks
Phase 2: Testing & Validation       [▱▱] 0/2 tasks
Phase 3: Migration & Tooling        [▱▱▱] 0/3 tasks
Phase 4: Documentation & Examples   [▱▱] 0/2 tasks

Total: 0/10 tasks completed (0%)
```

### Estimated Timeline
- Phase 1: 3-4 days
- Phase 2: 2-3 days
- Phase 3: 4-5 days
- Phase 4: 1-2 days

**Total**: ~10-14 days

### Dependencies
- Phase 2 requires Phase 1 completion
- Phase 3 requires Phase 2 completion
- Phase 4 can be done in parallel with Phase 3

---

**Last Updated**: 2025-10-05
**Next Review**: Task 1.1 completion
