# Unknown Node Resolution Design

**Date**: 2025-10-05
**Task**: Task 2.2 - Unknown 노드 정의된 규칙 기반 타입 연결
**Priority**: High

---

## 개요

Unknown 노드를 실제 타입 노드와 자동으로 연결하는 시스템 설계.

**핵심 원칙**: Unknown 노드는 **정의된 규칙**에 따라 생성되므로, 같은 규칙으로 실제 타입을 찾을 수 있다.

---

## Unknown 노드 생성 패턴 분석

### 1. FileDependencyAnalyzer에서 생성

**위치**: `src/database/services/FileDependencyAnalyzer.ts`

**생성 시점**: Import 문 분석 시

**생성 규칙**:
```typescript
// import { parse } from './TypeScriptParser';
// → 타겟 파일에 Unknown 노드 생성

const unknownNode: GraphNode = {
  identifier: createIdentifier("unknown", "parse", {
    sourceFile: "src/parsers/TypeScriptParser.ts",  // 타겟 파일
    language: "typescript",
    projectRoot, projectName
  }),
  type: "unknown",
  name: "parse",  // 심볼 이름만 포함
  sourceFile: "src/parsers/TypeScriptParser.ts",
  language: "typescript",
  metadata: {
    isImported: true,
    isDefault: false,
  }
}
```

**Alias 처리**:
```typescript
// import { parse as parseTS } from './TypeScriptParser';
// → 두 개의 Unknown 노드 + aliasOf 관계

// 1. 원본 노드 (타겟 파일)
{
  type: "unknown",
  name: "parse",
  sourceFile: "src/parsers/TypeScriptParser.ts",
  metadata: { isImported: false }
}

// 2. Alias 노드 (소스 파일)
{
  type: "unknown",
  name: "parseTS",
  sourceFile: "src/services/processor.ts",
  metadata: {
    isImported: true,
    isAlias: true,
    originalName: "parse",
    importedFrom: "src/parsers/TypeScriptParser.ts"
  }
}

// 3. aliasOf 관계: parseTS → parse
```

---

## 실제 타입 노드 생성 패턴 분석

### 1. Scenario 기반 생성

**시나리오 타입 정의** (`symbol-dependency` 시나리오):
```typescript
nodeTypes: [
  { name: "class" },
  { name: "function" },
  { name: "method" },
  { name: "interface" },
  { name: "type-alias" },
  { name: "symbol" },
]
```

### 2. MethodAnalyzer 예시

**위치**: `src/scenarios/analyzers/MethodAnalyzer.ts`

**생성 패턴**:
```typescript
// TypeScriptParser 파일 분석 시
result.nodes.push({
  type: "method",  // 실제 타입
  identifier: buildMethodIdentifier(
    "src/parsers/TypeScriptParser.ts",
    "TypeScriptParser",
    "parse"
  ),
  properties: {
    name: "parse",  // 메서드 이름
    className: "TypeScriptParser",
    sourceFile: "src/parsers/TypeScriptParser.ts",
    language: "typescript",
    startLine: 67,
    endLine: 120,
    // ... 기타 메타데이터
  }
});
```

---

## Resolution 전략

### 매칭 규칙

**기본 매칭 조건**:
```typescript
// Unknown 노드와 실제 타입 노드가 매칭되려면:
unknownNode.sourceFile === actualNode.sourceFile  // 같은 파일
&& unknownNode.name === actualNode.name  // 같은 이름
&& actualNode.type !== "unknown"  // Unknown이 아닌 타입
```

**우선순위**:
```
1. class > function > interface > type-alias
2. method > variable > constant
3. 기타 symbol
```

**매칭 예시**:
```typescript
// Unknown 노드
{
  type: "unknown",
  name: "parse",
  sourceFile: "src/parsers/TypeScriptParser.ts"
}

// 후보 노드들
[
  {
    type: "method",
    properties: {
      name: "parse",
      className: "TypeScriptParser",
      sourceFile: "src/parsers/TypeScriptParser.ts"
    }
  },
  {
    type: "function",
    properties: {
      name: "parse",
      sourceFile: "src/parsers/TypeScriptParser.ts"
    }
  }
]

// 결과: method가 function보다 우선순위 높음 → method 선택
```

---

## UnknownNodeResolver 클래스 설계

### API 구조

```typescript
/**
 * Unknown 노드 해소 엔진
 */
export class UnknownNodeResolver {
  constructor(private db: GraphDatabase) {}

  /**
   * 모든 Unknown 노드 해소
   */
  async resolveAll(): Promise<ResolutionResult> {
    const unknownNodes = await this.findAllUnknownNodes();

    const resolved: ResolvedNode[] = [];
    const unresolved: UnknownNode[] = [];

    for (const unknown of unknownNodes) {
      const actual = await this.findActualNode(unknown);

      if (actual) {
        await this.createResolutionEdge(unknown, actual);
        resolved.push({ unknown, actual });
      } else {
        unresolved.push(unknown);
      }
    }

    return { resolved, unresolved };
  }

  /**
   * Unknown 노드에 매칭되는 실제 타입 노드 찾기
   */
  private async findActualNode(
    unknown: GraphNode
  ): Promise<GraphNode | null> {
    // 1. 같은 sourceFile, 같은 name 조건으로 검색
    const candidates = await this.db.findNodes({
      sourceFile: unknown.sourceFile,
      name: unknown.name,
      type: { not: "unknown" }
    });

    if (candidates.length === 0) return null;

    // 2. 우선순위 정렬
    return this.selectBestMatch(candidates);
  }

  /**
   * 우선순위 기반 최적 매칭 선택
   */
  private selectBestMatch(candidates: GraphNode[]): GraphNode {
    const priority = [
      "class", "function", "interface", "type-alias",
      "method", "variable", "constant",
      "symbol"
    ];

    for (const type of priority) {
      const match = candidates.find(c => c.type === type);
      if (match) return match;
    }

    return candidates[0];
  }

  /**
   * resolvedTo 관계 생성
   */
  private async createResolutionEdge(
    unknown: GraphNode,
    actual: GraphNode
  ): Promise<void> {
    await this.db.upsertRelationship({
      fromNodeId: unknown.id,
      toNodeId: actual.id,
      type: "resolvedTo",
      label: `${unknown.name} resolved to ${actual.type}:${actual.name}`,
      metadata: {
        isInferred: true,
        confidence: 1.0,  // 규칙 기반이므로 100%
      },
      weight: 1,
      sourceFile: unknown.sourceFile,
    });
  }

  /**
   * Alias 체인 해소
   *
   * @example
   * UserType --aliasOf--> User --resolvedTo--> Class:User
   * → Class:User 반환
   */
  async resolveAliasChain(nodeId: number): Promise<GraphNode | null> {
    const visited = new Set<number>();
    let current = await this.db.getNodeById(nodeId);

    while (current && !visited.has(current.id)) {
      visited.add(current.id);

      // 1. aliasOf 관계 찾기
      const aliasEdges = await this.db.findRelationships({
        fromNodeId: current.id,
        type: "aliasOf"
      });

      if (aliasEdges.length > 0) {
        const targetId = aliasEdges[0].toNodeId;
        current = await this.db.getNodeById(targetId);
        continue;
      }

      // 2. resolvedTo 관계 찾기
      const resolvedEdges = await this.db.findRelationships({
        fromNodeId: current.id,
        type: "resolvedTo"
      });

      if (resolvedEdges.length > 0) {
        const actualId = resolvedEdges[0].toNodeId;
        return await this.db.getNodeById(actualId);
      }

      // 더 이상 관계가 없으면 현재 노드 반환
      break;
    }

    return current;
  }

  /**
   * 모든 Unknown 노드 조회
   */
  private async findAllUnknownNodes(): Promise<GraphNode[]> {
    return await this.db.findNodes({
      type: "unknown"
    });
  }
}
```

### 타입 정의

```typescript
/**
 * Resolution 결과
 */
export interface ResolutionResult {
  resolved: ResolvedNode[];
  unresolved: UnknownNode[];
}

/**
 * 해소된 노드 정보
 */
export interface ResolvedNode {
  unknown: GraphNode;
  actual: GraphNode;
}

/**
 * 미해소 노드 정보
 */
export interface UnknownNode extends GraphNode {
  type: "unknown";
  reason?: string;  // 미해소 이유
}
```

---

## Edge Type 정의

### resolvedTo 관계

```typescript
{
  type: "resolvedTo",
  description: "Unknown 노드가 실제 타입 노드로 해소됨",
  isDirected: true,
  isTransitive: false,
  isInheritable: false,
  priority: 10,
  schema: {
    confidence: "number",  // 해소 신뢰도 (0.0 ~ 1.0)
    isInferred: "boolean",  // 자동 추론 여부
  }
}
```

---

## CLI 통합

### resolve-unknown 명령어

```bash
# 모든 Unknown 노드 해소
node dist/cli/namespace-analyzer.js resolve-unknown

# 출력:
# 🔍 Resolving Unknown Nodes...
#
# ✅ Resolved: 45/50 (90%)
#   Unknown:parse → Method:TypeScriptParser.parse
#   Unknown:User → Class:User
#   Unknown:config → Variable:config
#   ...
#
# ⚠️ Unresolved: 5/50 (10%)
#   Unknown:ExternalLib (external dependency)
#   Unknown:DynamicImport (runtime import)
#   ...
#
# 📊 Statistics:
#   Success rate: 90.0%
#   Alias chains resolved: 12
#   Avg chain length: 1.8

# JSON 출력
node dist/cli/namespace-analyzer.js resolve-unknown --json

# 특정 네임스페이스만
node dist/cli/namespace-analyzer.js resolve-unknown --namespace source
```

### analyze 명령어에 자동 해소 플래그 추가

```bash
# 분석 후 자동으로 Unknown 노드 해소
node dist/cli/namespace-analyzer.js analyze source --auto-resolve
```

---

## 구현 계획

### Phase 1: Core Resolver (2-3일)
- [x] Unknown 노드 생성 패턴 분석
- [x] 실제 타입 노드 생성 패턴 분석
- [x] UnknownNodeResolver 설계 문서
- [ ] UnknownNodeResolver 클래스 구현
- [ ] findActualNode() 매칭 로직
- [ ] selectBestMatch() 우선순위 정렬
- [ ] createResolutionEdge() 관계 생성

### Phase 2: Alias Resolution (1-2일)
- [ ] resolveAliasChain() 구현
- [ ] 순환 Alias 감지
- [ ] Alias 체인 길이 제한 (max depth)

### Phase 3: CLI Integration (1일)
- [ ] resolve-unknown 명령어 구현
- [ ] JSON 출력 포맷
- [ ] --auto-resolve 플래그

### Phase 4: Testing (1-2일)
- [ ] Unit tests (resolveAll, findActualNode, resolveAliasChain)
- [ ] Integration tests (전체 워크플로우)
- [ ] Edge cases (순환 alias, 동명 심볼, unresolved 노드)

---

## Acceptance Criteria

- **해소 성공률**: > 90% (외부 라이브러리 제외)
- **성능**: 1000 Unknown 노드 < 1초
- **Alias 체인**: 최대 depth 10까지 해소
- **순환 감지**: 순환 alias 감지 및 경고
- **CLI**: resolve-unknown 명령어 동작
- **자동 해소**: --auto-resolve 플래그 동작
- **테스트**: Unit + Integration 테스트 통과

---

## Known Challenges

### 1. 같은 이름의 여러 심볼

```typescript
// 같은 파일에 parse 함수와 parse 메서드가 모두 존재
export function parse(code: string) { }

export class Parser {
  parse(code: string) { }
}

// Unknown:parse가 어느 것을 가리키는가?
// → 우선순위: function > method
```

**해결책**: 우선순위 정렬 + 메타데이터 활용

### 2. Overloaded 함수

```typescript
export function parse(code: string): AST;
export function parse(code: string, options: Options): AST;
export function parse(code: string, options?: Options): AST {
  // ...
}

// → 여러 signature가 있지만 하나의 function 노드로 통합
```

**해결책**: Overload는 하나의 function 노드로 표현 (tree-sitter 특성)

### 3. 외부 라이브러리

```typescript
// import { readFile } from 'fs';
// → 타겟 파일이 node_modules 내부

// Unknown 노드가 생성되지만 실제 타입 노드는 없음
```

**해결책**: Unresolved로 분류, reason: "external"

### 4. 동적 Import

```typescript
const module = await import(`./plugins/${name}`);
// → 런타임에만 결정되는 경로
```

**해결책**: Unresolved로 분류, reason: "dynamic"

---

## 미래 확장

### 1. 신뢰도 기반 해소

현재는 규칙 기반이므로 confidence = 1.0이지만, 향후:

```typescript
{
  confidence: 0.9,  // 이름은 같지만 위치가 다름
  confidence: 0.7,  // 이름 유사 (fuzzy match)
}
```

### 2. 외부 라이브러리 지원

```typescript
// node_modules/@types 파일 파싱
// → 외부 라이브러리 심볼도 해소 가능
```

### 3. 머신러닝 기반 매칭

```typescript
// 코드 컨텍스트 분석으로 더 정확한 매칭
// (현재는 이름 + 파일 경로만 사용)
```

---

**Last Updated**: 2025-10-05
**Status**: Design Complete, Ready for Implementation
