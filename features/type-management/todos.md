# Type Management - Implementation Tasks

**Feature**: 타입 관리 시스템 개선
**Status**: 📋 Planned
**Target Version**: 3.2.0

---

## Phase 1: EdgeTypeRegistry 리팩토링

### Task 1.1: parentType 필드 제거
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/inference/EdgeTypeRegistry.ts`

**Tasks**:
- [ ] EdgeTypeDefinition 인터페이스에서 `parentType` 필드 제거
- [ ] `getChildTypes()` 메서드 제거
- [ ] `getHierarchyPath()` 메서드 제거
- [ ] `printHierarchy()` 메서드 제거 (또는 flat list 출력으로 변경)
- [ ] `validateHierarchy()` 메서드 간소화
- [ ] 모든 edge type 정의에서 `parentType: undefined` 제거

**Implementation**:
```typescript
// Before
export interface EdgeTypeDefinition {
  type: string;
  description: string;
  schema: Record<string, any>;
  isDirected: boolean;
  parentType?: string;        // ❌ 제거
  isTransitive: boolean;
  isInheritable: boolean;
  priority: number;
}

// After
export interface EdgeTypeDefinition {
  type: string;
  description: string;
  schema: Record<string, any>;
  isDirected: boolean;
  isTransitive: boolean;
  isInheritable: boolean;
  priority: number;
}
```

**Acceptance Criteria**:
- parentType 관련 모든 코드 제거
- 기존 edge type 정의 동작 유지
- 모든 테스트 통과

**Known Challenges**:
- 기존 코드에서 parentType 사용 여부 확인 필요
- Inference Engine에서 hierarchical query 영향 확인

---

### Task 1.2: Flat Edge Type List 관리
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/inference/EdgeTypeRegistry.ts`

**Tasks**:
- [ ] Edge type 목록을 카테고리별로 재정리
- [ ] 카테고리별 조회 메서드 추가 (`getStructuralTypes()`, `getDependencyTypes()` 등)
- [ ] Edge type 검색 메서드 추가 (`findByCategory()`, `findByProperty()`)

**Implementation**:
```typescript
// Category-based organization
export class EdgeTypeRegistry {
  static readonly STRUCTURAL_TYPES = [
    "contains", "declares", "belongs_to"
  ];

  static readonly DEPENDENCY_TYPES = [
    "depends_on", "imports", "calls", "references",
    "extends", "implements", "uses", "instantiates"
  ];

  static readonly TYPE_RELATIONSHIP_TYPES = [
    "has_type", "returns", "throws"
  ];

  static readonly UNKNOWN_SYSTEM_TYPES = [
    "aliasOf", "imports_library", "imports_file"
  ];

  static getByCategory(category: EdgeTypeCategory): EdgeTypeDefinition[] {
    // Implementation
  }
}
```

**Acceptance Criteria**:
- 카테고리별 edge type 조회 가능
- 문서에 카테고리 분류 반영
- 새 edge type 추가 시 카테고리 명시

---

## Phase 2: RDF 기반 검색 시스템

### Task 2.1: RDF 주소 기반 파일 위치 검색
**Status**: ✅ Completed (2025-10-05)
**Priority**: High
**Files**: `src/database/search/RdfSearchEngine.ts`

**Tasks**:
- [x] RdfSearchEngine 클래스 생성
- [x] RDF 주소 → 파일 위치 변환 (parseRdfAddress + 파일 검색)
- [x] 심볼 정의 위치 찾기 (파서 통합)
- [x] CLI 검색 명령어 구현 (`find-symbol <rdf-address>`)
- [x] QueryMatch 타입 정의 (any 제거)
- [x] 성능 측정 추가 (--perf 플래그)

**RDF의 양방향 동작**:
```
1. 파싱 (Parsing):
   코드 → RDF 주소 생성
   TypeScriptParser.parse() → "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"

2. 검색 (Searching):
   RDF 주소 → 파일 위치 찾기
   "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse" → /path/to/file.ts:67
```

**Implementation**:
```typescript
// RdfSearchEngine.ts
export class RdfSearchEngine {
  constructor(
    private db: GraphDatabase,
    private parserManager: ParserManager
  ) {}

  /**
   * RDF 주소로 심볼의 파일 위치 찾기
   */
  async findSymbolLocation(rdfAddress: string): Promise<SymbolLocation | null> {
    // 1. RDF 주소 파싱
    const parsed = NodeIdentifier.parseRdfAddress(rdfAddress);
    // → { projectName, filePath, nodeType, symbolName }

    // 2. 파일 경로 구성
    const fullPath = path.join(projectRoot, parsed.filePath);

    // 3. 파일 존재 확인
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    // 4. 파일 파싱하여 심볼 위치 찾기
    const sourceCode = await fs.readFile(fullPath, 'utf-8');
    const language = detectLanguage(fullPath);
    const parser = await this.parserManager.getParser(language);

    const result = await parser.parse(sourceCode);

    // 5. 심볼 이름으로 위치 찾기
    const symbol = this.findSymbolInAST(
      result.ast,
      parsed.symbolName,
      parsed.nodeType
    );

    if (!symbol) return null;

    return {
      filePath: fullPath,
      line: symbol.location.startLine,
      column: symbol.location.startColumn,
      nodeType: parsed.nodeType,
      symbolName: parsed.symbolName
    };
  }

  /**
   * AST에서 심볼 찾기
   */
  private findSymbolInAST(
    ast: any,
    symbolName: string,
    nodeType: string
  ): ASTNode | null {
    // Tree-sitter query로 심볼 찾기
    // (이름과 타입이 일치하는 노드)
  }

  /**
   * 와일드카드 검색
   */
  async searchByPattern(pattern: string): Promise<SymbolLocation[]> {
    // "dependency-linker/src/**/*.ts#Method:parse*"
    // → 모든 parse로 시작하는 메서드 찾기
  }
}
```

**CLI Integration**:
```bash
# RDF 주소로 심볼 위치 찾기
$ deps find-symbol "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"

# 출력:
# Found: TypeScriptParser.parse
# File: /Users/user/project/dependency-linker/src/parsers/TypeScriptParser.ts
# Line: 67
# Column: 2
# Type: method

# 에디터에서 열기 (옵션)
$ deps find-symbol "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse" --open
# → VSCode/Vim에서 해당 위치로 이동
```

**Acceptance Criteria**:
- RDF 주소 → 파일 위치 변환 성공률 > 95%
- 검색 속도: < 100ms (캐시 없이)
- CLI 명령어 동작
- 에디터 통합 준비 (JSON 출력)

**Known Challenges**:
- 파일이 이동된 경우 처리
- 동일 이름 심볼이 여러 개인 경우
- 성능 최적화 (파일 캐싱)

---

### Task 2.2: Unknown 노드 정의된 규칙 기반 타입 연결
**Status**: ✅ Completed (2025-10-05)
**Priority**: High
**Files**: `src/database/inference/UnknownNodeResolver.ts`

**Tasks**:
- [x] UnknownNodeResolver 클래스 생성
- [x] 정의된 규칙 기반 심볼 매칭 로직 구현
- [x] Unknown 노드 → 실제 타입 노드 연결
- [x] Alias 체인 해소 (UserType → User → Class:User)
- [x] resolvedTo edge type 정의 및 등록
- [x] GraphDatabase API 호환성 수정
- [x] NamespaceGraphDB.getDatabase() 메서드 추가

**Unknown 노드의 본질**:
- 코드 심볼(메서드, 클래스 등)을 식별하기 위해 존재
- 항상 **정의된 규칙**에 따라 동작:
  1. Import 문에서 심볼 이름 추출
  2. 타겟 파일 + Unknown 타입으로 노드 생성
  3. name 필드는 심볼 이름만 포함 (예: "parse")

**Implementation**:
```typescript
// UnknownNodeResolver.ts
export class UnknownNodeResolver {
  constructor(private db: GraphDatabase) {}

  /**
   * Unknown 노드를 이름 기반으로 실제 타입 노드와 연결
   */
  async resolveUnknownNodes(): Promise<ResolutionResult> {
    // 1. 모든 Unknown 노드 조회
    const unknownNodes = await this.db.findNodes({
      type: "unknown"
    });

    const resolved: ResolvedNode[] = [];
    const unresolved: UnknownNode[] = [];

    for (const unknown of unknownNodes) {
      // 2. 같은 sourceFile, 같은 name을 가진 실제 타입 노드 찾기
      const actualNode = await this.findActualNode(unknown);

      if (actualNode) {
        // 3. Unknown → Actual 연결
        await this.db.upsertRelationship({
          fromNodeId: unknown.id,
          toNodeId: actualNode.id,
          type: "resolvedTo",
          metadata: { isInferred: true }
        });

        resolved.push({ unknown, actual: actualNode });
      } else {
        unresolved.push(unknown);
      }
    }

    return { resolved, unresolved };
  }

  /**
   * Unknown 노드와 같은 이름의 실제 타입 노드 찾기
   */
  private async findActualNode(unknown: GraphNode): Promise<GraphNode | null> {
    const candidates = await this.db.findNodes({
      sourceFile: unknown.sourceFile,
      name: unknown.name,
      type: { not: "unknown" }  // Unknown이 아닌 모든 타입
    });

    // 우선순위: class > function > method > variable
    const priority = ["class", "function", "method", "variable"];

    for (const type of priority) {
      const match = candidates.find(c => c.type === type);
      if (match) return match;
    }

    return candidates[0] || null;
  }

  /**
   * Alias 체인 해소
   * UserType --aliasOf--> User --resolvedTo--> Class:User
   */
  async resolveAliasChain(aliasNodeId: number): Promise<GraphNode | null> {
    const visited = new Set<number>();
    let current = await this.db.getNode(aliasNodeId);

    while (current && !visited.has(current.id)) {
      visited.add(current.id);

      // aliasOf 관계 찾기
      const aliasEdge = await this.db.findEdges({
        fromNodeId: current.id,
        type: "aliasOf"
      });

      if (aliasEdge.length === 0) break;

      // 원본 노드로 이동
      current = await this.db.getNode(aliasEdge[0].toNodeId);
    }

    // resolvedTo 관계로 실제 타입 찾기
    if (current) {
      const resolvedEdge = await this.db.findEdges({
        fromNodeId: current.id,
        type: "resolvedTo"
      });

      if (resolvedEdge.length > 0) {
        return await this.db.getNode(resolvedEdge[0].toNodeId);
      }
    }

    return current;
  }
}
```

**Acceptance Criteria**:
- Unknown:parse → Method:parse 자동 연결
- Alias 체인 완전 해소 (UserType → User → Class:User)
- Unresolved Unknown 노드 리스트 제공
- 성능: 1000 Unknown 노드 < 1초

**Known Challenges**:
- 같은 이름의 여러 심볼 존재 시 우선순위 결정
- Overloaded 함수 처리
- 순환 Alias 감지

---

### Task 2.3: Unknown 해소 CLI 통합
**Status**: ✅ Completed (2025-10-05)
**Priority**: Medium
**Files**: `src/cli/namespace-analyzer.ts`

**Tasks**:
- [x] `resolve-unknown` 명령어 추가
- [x] Resolution 결과 출력 포맷 구현
- [ ] `--auto-resolve` 플래그 추가 (analyze 시 자동 해소) - 향후 작업

**Implementation**:
```bash
# Unknown 노드 해소
node dist/cli/namespace-analyzer.js resolve-unknown

# 출력:
# 🔍 Resolving Unknown Nodes...
#
# ✅ Resolved: 45/50
#   - Unknown:parse → Method:TypeScriptParser.parse
#   - Unknown:User → Class:User
#   - ...
#
# ⚠️ Unresolved: 5/50
#   - Unknown:ExternalLibrary (external dependency)
#   - Unknown:DynamicImport (runtime import)
#
# 📊 Statistics:
#   - Success rate: 90%
#   - Alias chains resolved: 12
```

**Acceptance Criteria**:
- CLI 명령어 동작
- 결과 출력 포맷 명확
- JSON 출력 옵션 제공

---

## Phase 3: 동적 타입 등록

### Task 3.1: Runtime Edge Type Registration
**Status**: ⏳ Pending
**Priority**: Low
**Files**: `src/database/inference/EdgeTypeRegistry.ts`

**Tasks**:
- [ ] `register()` 메서드 구현 (동적 등록)
- [ ] 타입 충돌 검증
- [ ] 등록된 타입 영속화 (선택적)

**Implementation**:
```typescript
export class EdgeTypeRegistry {
  /**
   * 런타임에 새 edge type 등록
   */
  static register(definition: EdgeTypeDefinition): void {
    // 1. 타입 이름 충돌 검사
    if (EdgeTypeRegistry.definitions.has(definition.type)) {
      throw new Error(`Edge type '${definition.type}' already exists`);
    }

    // 2. 필수 필드 검증
    this.validateDefinition(definition);

    // 3. 등록
    EdgeTypeRegistry.definitions.set(definition.type, definition);

    console.log(`✅ Registered edge type: ${definition.type}`);
  }

  /**
   * 등록 취소
   */
  static unregister(type: string): boolean {
    // CORE_TYPES는 제거 불가
    if (EdgeTypeRegistry.CORE_TYPES.find(d => d.type === type)) {
      throw new Error(`Cannot unregister core type: ${type}`);
    }

    return EdgeTypeRegistry.definitions.delete(type);
  }
}

// 사용 예시
EdgeTypeRegistry.register({
  type: "custom_relation",
  description: "Custom relationship for domain logic",
  schema: {},
  isDirected: true,
  isTransitive: false,
  isInheritable: false,
  priority: 15
});
```

**Acceptance Criteria**:
- 동적 등록 가능
- 타입 충돌 방지
- CORE_TYPES 보호

---

### Task 3.2: Custom Node Type Support
**Status**: ⏳ Pending
**Priority**: Low
**Files**: `src/database/core/NodeIdentifier.ts`

**Tasks**:
- [ ] NodeType을 string으로 변경 (union type 제거)
- [ ] Predefined node types + custom types 지원
- [ ] RDF 주소 파싱 시 custom type 허용

**Implementation**:
```typescript
// Before
export type NodeType =
  | "file"
  | "class"
  | "method"
  // ... (fixed list)

// After
export type NodeType = string;  // Any string allowed

export const PREDEFINED_NODE_TYPES = [
  "file", "class", "method", "function",
  "variable", "constant", "property",
  "unknown", "heading"
] as const;

export function isPredefinedNodeType(type: string): boolean {
  return PREDEFINED_NODE_TYPES.includes(type as any);
}
```

**Acceptance Criteria**:
- Custom node type 사용 가능
- RDF 주소에 custom type 포함 가능
- 기존 predefined types 유지

---

## Phase 4: 타입 검증 강화

### Task 4.1: Type Consistency Validation
**Status**: ⏳ Pending
**Priority**: Medium
**Files**: `src/database/types/TypeValidator.ts` (NEW)

**Tasks**:
- [ ] TypeValidator 클래스 생성
- [ ] Node type과 Edge type 일관성 검증
- [ ] Scenario와 타입 시스템 일관성 검증

**Implementation**:
```typescript
// TypeValidator.ts
export class TypeValidator {
  /**
   * 전체 타입 시스템 일관성 검증
   */
  static validateTypeSystem(): ValidationResult {
    const errors: string[] = [];

    // 1. Edge type 중복 검사
    const edgeTypes = EdgeTypeRegistry.getAll();
    const seen = new Set<string>();
    for (const type of edgeTypes) {
      if (seen.has(type.type)) {
        errors.push(`Duplicate edge type: ${type.type}`);
      }
      seen.add(type.type);
    }

    // 2. Node type과 Edge type 사용 일관성
    // (Scenario에서 정의한 타입이 실제 존재하는지)
    const scenarios = globalScenarioRegistry.listScenarios();
    for (const scenario of scenarios) {
      // Edge types 검증
      for (const edgeSpec of scenario.edgeTypes) {
        const exists = EdgeTypeRegistry.get(edgeSpec.type);
        if (!exists) {
          errors.push(
            `Scenario '${scenario.id}' references undefined edge type: ${edgeSpec.type}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

**Acceptance Criteria**:
- 타입 중복 감지
- Scenario와 타입 시스템 일관성 보장
- 검증 실패 시 명확한 에러 메시지

---

## Summary

### Progress Tracker
```
Phase 1: EdgeTypeRegistry 리팩토링     [▱▱] 0/2 tasks
Phase 2: RDF 기반 검색 시스템          [▰▰▰] 3/3 tasks ✅
  - Task 2.1: RDF 주소 기반 파일 위치 검색 ✅
  - Task 2.2: Unknown 노드 해소 ✅
  - Task 2.3: CLI 통합 ✅
Phase 3: 동적 타입 등록                [▱▱] 0/2 tasks
Phase 4: 타입 검증 강화                [▱] 0/1 task

Total: 3/8 tasks completed (37.5%)
```

### Estimated Timeline
- Phase 1: 3-4 days
- Phase 2: 7-9 days (RDF 검색 추가)
- Phase 3: 2-3 days
- Phase 4: 2-3 days

**Total**: ~14-19 days

### Dependencies
- Phase 2 requires Phase 1 completion (parentType 제거 후 추론 로직 개선)
- Phase 4 requires Phase 3 (동적 타입 등록 후 검증 강화)

### Priority Ranking
1. **High**: Task 2.1 (RDF 기반 검색 - 핵심 기능), Task 2.2 (Unknown 노드 추론)
2. **Medium**: Task 1.1, 1.2, 2.3, 4.1 (시스템 안정성)
3. **Low**: Task 3.1, 3.2 (고급 기능)

---

**Last Updated**: 2025-10-05
**Next Review**: Phase 1 시작 시점
