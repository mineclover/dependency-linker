# Scenario-Type 통합 분석 보고서

**작성일**: 2025-10-05
**목적**: Scenario 시스템에서 nodeTypes와 edgeTypes 정의 및 관리 방식 분석
**중요도**: CRITICAL - "RDF와 관계 하나하나가 정의해야하는 거니까 시나리오 관리가 중요함"

---

## 🎯 핵심 발견

**User Insight**: "RDF와 관계 하나하나가 정의해야하는 거니까 시나리오 관리가 중요함"

→ **모든 RDF 주소와 관계(Edge)는 시나리오에서 명시적으로 정의되어야 함**

---

## 📋 Scenario 시스템 구조

### ScenarioSpec 인터페이스

**파일**: `src/scenarios/types.ts`

```typescript
export interface ScenarioSpec {
  id: string;
  name: string;
  description: string;
  version: string;

  // 의존성 관계
  extends?: string[];    // 타입 상속: 부모 시나리오의 타입 상속
  requires?: string[];   // 실행 순서: 선행 시나리오 필요

  // 🔑 타입 정의 - CRITICAL
  nodeTypes: NodeTypeSpec[];      // 노드 타입 목록
  edgeTypes: EdgeTypeSpec[];      // 엣지 타입 목록
  semanticTags?: SemanticTagSpec[]; // 시맨틱 태그 목록

  analyzer: {
    className: string;
    config?: Record<string, unknown>;
  };
}
```

### NodeTypeSpec 구조

```typescript
export interface NodeTypeSpec {
  name: string;                    // 타입 이름 (예: "class", "method", "function")
  description: string;             // 설명
  properties?: Record<string, unknown>; // 추가 속성
}
```

### EdgeTypeSpec 구조

```typescript
export interface EdgeTypeSpec {
  name: string;                    // 엣지 타입 이름 (예: "calls", "imports", "extends")
  description: string;             // 설명
  parent?: string;                 // 부모 엣지 타입 (계층 구조)
  isTransitive?: boolean;          // 추론 속성: 전이성
  isInheritable?: boolean;         // 추론 속성: 상속성
  isHierarchical?: boolean;        // 구조 속성: 계층성
  properties?: Record<string, unknown>; // 추가 속성
}
```

---

## 🏗️ Built-in 시나리오 타입 정의

### 1. basic-structure (기초 구조)

**파일**: `src/scenarios/builtin/basic-structure.ts`

```typescript
export const basicStructureSpec: ScenarioSpec = {
  id: "basic-structure",
  name: "Basic Structure Analysis",
  description: "Analyzes basic file and directory structure",
  version: "1.0.0",

  nodeTypes: [
    { name: "file", description: "Source code file" },
    { name: "directory", description: "Directory containing files" }
  ],

  edgeTypes: [
    {
      name: "contains",
      description: "Directory contains file or subdirectory",
      isHierarchical: true
    }
  ],

  analyzer: {
    className: "BasicStructureAnalyzer"
  }
};
```

**정의된 타입**:
- **Node Types**: `file`, `directory`
- **Edge Types**: `contains` (계층적)

---

### 2. file-dependency (파일 의존성)

**파일**: `src/scenarios/builtin/file-dependency.ts`

```typescript
export const fileDependencySpec: ScenarioSpec = {
  id: "file-dependency",
  name: "File Dependency Analysis",
  description: "Tracks import and require relationships between files",
  version: "1.0.0",

  extends: ["basic-structure"],  // ✅ basic-structure의 타입 상속

  nodeTypes: [
    { name: "library", description: "External library or package" },
    { name: "module", description: "JavaScript/TypeScript module" }
  ],

  edgeTypes: [
    {
      name: "imports_file",
      description: "File imports another file",
      parent: "depends_on",
      isTransitive: false
    },
    {
      name: "imports_library",
      description: "File imports external library",
      parent: "depends_on",
      isTransitive: false
    },
    {
      name: "depends_on",
      description: "Generic dependency relationship",
      isTransitive: true
    }
  ],

  analyzer: {
    className: "FileDependencyAnalyzer"
  }
};
```

**정의된 타입**:
- **Node Types**: `library`, `module` + 상속(`file`, `directory`)
- **Edge Types**: `imports_file`, `imports_library`, `depends_on`
  - `imports_file` → parent: `depends_on`
  - `imports_library` → parent: `depends_on`
  - `depends_on`: 전이적 (A→B→C ⇒ A→C)

---

### 3. symbol-dependency (심볼 의존성)

**파일**: `src/scenarios/builtin/symbol-dependency.ts`

```typescript
export const symbolDependencySpec: ScenarioSpec = {
  id: "symbol-dependency",
  name: "Symbol Dependency Analysis",
  description: "Analyzes symbol-level dependencies (calls, instantiation, type refs)",
  version: "1.0.0",

  extends: ["file-dependency"],  // ✅ file-dependency의 타입 상속

  nodeTypes: [
    { name: "class", description: "Class definition" },
    { name: "function", description: "Function definition" },
    { name: "method", description: "Method definition" },
    { name: "interface", description: "TypeScript interface" },
    { name: "type", description: "TypeScript type alias" },
    { name: "variable", description: "Variable declaration" },
    { name: "constant", description: "Constant declaration" },
    { name: "unknown", description: "Unknown symbol (external import)" }
  ],

  edgeTypes: [
    {
      name: "calls",
      description: "Function/method call relationship",
      parent: "uses",
      isTransitive: false
    },
    {
      name: "instantiates",
      description: "Class instantiation",
      parent: "uses",
      isTransitive: false
    },
    {
      name: "has_type",
      description: "Variable/parameter type reference",
      parent: "uses",
      isTransitive: false
    },
    {
      name: "extends",
      description: "Class inheritance",
      parent: "depends_on",
      isTransitive: false,
      isInheritable: true
    },
    {
      name: "implements",
      description: "Interface implementation",
      parent: "depends_on",
      isTransitive: false
    },
    {
      name: "uses",
      description: "Generic usage relationship",
      isTransitive: true
    }
  ],

  analyzer: {
    className: "SymbolDependencyAnalyzer"
  }
};
```

**정의된 타입**:
- **Node Types**: `class`, `function`, `method`, `interface`, `type`, `variable`, `constant`, `unknown`
  - 상속: `file`, `directory`, `library`, `module`
- **Edge Types**: `calls`, `instantiates`, `has_type`, `extends`, `implements`, `uses`
  - 계층 구조:
    - `calls` → `uses`
    - `instantiates` → `uses`
    - `has_type` → `uses`
    - `extends` → `depends_on` (상속 가능)
    - `implements` → `depends_on`

---

### 4. markdown-linking (마크다운 링크)

**파일**: `src/scenarios/builtin/markdown-linking.ts`

```typescript
export const markdownLinkingSpec: ScenarioSpec = {
  id: "markdown-linking",
  name: "Markdown Linking Analysis",
  description: "Analyzes markdown links, images, and references",
  version: "1.0.0",

  extends: ["basic-structure"],  // ✅ basic-structure의 타입 상속

  nodeTypes: [
    { name: "heading", description: "Markdown heading as symbol" },
    { name: "anchor", description: "Internal anchor target" }
  ],

  edgeTypes: [
    {
      name: "links_to",
      description: "Markdown link to another document",
      parent: "references",
      isTransitive: false
    },
    {
      name: "embeds",
      description: "Image or content embedding",
      parent: "references",
      isTransitive: false
    },
    {
      name: "references",
      description: "Generic reference relationship",
      isTransitive: true
    },
    {
      name: "contains_heading",
      description: "File contains heading symbol",
      isHierarchical: true
    }
  ],

  analyzer: {
    className: "MarkdownLinkingAnalyzer"
  }
};
```

**정의된 타입**:
- **Node Types**: `heading`, `anchor` + 상속(`file`, `directory`)
- **Edge Types**: `links_to`, `embeds`, `references`, `contains_heading`

---

## 🔄 타입 수집 메커니즘

### ScenarioRegistry.collectTypes()

**파일**: `src/scenarios/ScenarioRegistry.ts:222-269`

**동작 방식**: `extends` 체인을 따라 재귀적으로 타입 수집

```typescript
collectTypes(scenarioId: string): TypeCollection {
  const spec = this.scenarios.get(scenarioId);
  if (!spec) {
    throw new Error(`Scenario '${scenarioId}' not found`);
  }

  const nodeTypes = new Set<string>();
  const edgeTypes = new Set<string>();
  const semanticTags = new Set<string>();

  // 재귀 수집 함수
  const collectFromSpec = (id: string) => {
    const currentSpec = this.scenarios.get(id);
    if (!currentSpec) return;

    // 현재 시나리오의 타입 수집
    for (const nodeType of currentSpec.nodeTypes) {
      nodeTypes.add(nodeType.name);
    }

    for (const edgeType of currentSpec.edgeTypes) {
      edgeTypes.add(edgeType.name);
    }

    if (currentSpec.semanticTags) {
      for (const tag of currentSpec.semanticTags) {
        semanticTags.add(tag.name);
      }
    }

    // extends 체인 재귀 탐색
    if (currentSpec.extends) {
      for (const extendId of currentSpec.extends) {
        collectFromSpec(extendId);  // 재귀 호출
      }
    }
  };

  collectFromSpec(scenarioId);

  return { nodeTypes, edgeTypes, semanticTags };
}
```

**예시**: `symbol-dependency` 시나리오의 타입 수집

```
symbol-dependency.collectTypes()
↓
collectFromSpec("symbol-dependency")
  ├─ nodeTypes.add("class", "function", "method", "interface", ...)
  ├─ edgeTypes.add("calls", "instantiates", "extends", ...)
  └─ extends: ["file-dependency"]
      ↓
      collectFromSpec("file-dependency")
        ├─ nodeTypes.add("library", "module")
        ├─ edgeTypes.add("imports_file", "imports_library", "depends_on")
        └─ extends: ["basic-structure"]
            ↓
            collectFromSpec("basic-structure")
              ├─ nodeTypes.add("file", "directory")
              └─ edgeTypes.add("contains")

결과:
{
  nodeTypes: Set {
    "class", "function", "method", "interface", "type",
    "variable", "constant", "unknown",
    "library", "module",
    "file", "directory"
  },
  edgeTypes: Set {
    "calls", "instantiates", "has_type", "extends", "implements", "uses",
    "imports_file", "imports_library", "depends_on",
    "contains"
  }
}
```

---

## ✅ 타입 일관성 검증

### ScenarioRegistry.validateTypeConsistency()

**파일**: `src/scenarios/ScenarioRegistry.ts:278-324`

**목적**: 같은 edgeType 이름이 여러 시나리오에 정의될 때 속성 충돌 검사

```typescript
validateTypeConsistency(): ScenarioValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const edgeTypeMap = new Map<
    string,
    {
      scenarioId: string;
      isTransitive?: boolean;
      isInheritable?: boolean;
      isHierarchical?: boolean;
    }
  >();

  for (const spec of this.scenarios.values()) {
    for (const edgeType of spec.edgeTypes) {
      const existing = edgeTypeMap.get(edgeType.name);

      if (existing) {
        // 속성 충돌 검사
        if (
          existing.isTransitive !== edgeType.isTransitive ||
          existing.isInheritable !== edgeType.isInheritable ||
          existing.isHierarchical !== edgeType.isHierarchical
        ) {
          errors.push(
            `Edge type '${edgeType.name}' has conflicting properties ` +
            `between scenarios '${existing.scenarioId}' and '${spec.id}'`
          );
        }
      } else {
        edgeTypeMap.set(edgeType.name, {
          scenarioId: spec.id,
          isTransitive: edgeType.isTransitive,
          isInheritable: edgeType.isInheritable,
          isHierarchical: edgeType.isHierarchical,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**검증 사항**:
1. **속성 일관성**: 같은 이름의 edgeType이 다른 속성을 가지면 에러
   - `isTransitive`
   - `isInheritable`
   - `isHierarchical`

**예시**:
```typescript
// ❌ 에러 발생
scenario1.edgeTypes = [
  { name: "depends_on", isTransitive: true }
];

scenario2.edgeTypes = [
  { name: "depends_on", isTransitive: false }  // 충돌!
];

// ✅ 정상
scenario1.edgeTypes = [
  { name: "depends_on", isTransitive: true }
];

scenario2.edgeTypes = [
  { name: "depends_on", isTransitive: true }  // 일관성 유지
];
```

---

## 🔗 RDF 검색과의 통합

### 시나리오 기반 타입 검증

**RdfSearchEngine에서 활용**:

```typescript
class RdfSearchEngine {
  /**
   * 노드 타입 검증
   */
  private validateNodeType(nodeType: string, scenarioIds?: string[]): void {
    const validTypes = this.getAllValidNodeTypes(scenarioIds);

    if (!validTypes.has(nodeType.toLowerCase())) {
      throw new Error(
        `Invalid node type '${nodeType}'. Valid types: ${Array.from(validTypes).join(', ')}`
      );
    }
  }

  /**
   * 모든 유효한 노드 타입 수집
   */
  private getAllValidNodeTypes(scenarioIds?: string[]): Set<string> {
    const allTypes = new Set<string>();
    const scenarios = scenarioIds || this.scenarioRegistry.listScenarios();

    for (const scenarioId of scenarios) {
      const types = this.scenarioRegistry.collectTypes(scenarioId);  // ✅ 시나리오에서 타입 수집
      for (const nodeType of types.nodeTypes) {
        allTypes.add(nodeType.toLowerCase());
      }
    }

    return allTypes;
  }
}
```

**검증 프로세스**:

```
RDF 주소 입력:
"dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"
↓
parseRdfAddress() → nodeType = "Method"
↓
validateNodeType("Method", ["symbol-dependency"])
↓
getAllValidNodeTypes(["symbol-dependency"])
  → collectTypes("symbol-dependency")
  → validTypes = Set { "class", "function", "method", ... }
↓
"Method".toLowerCase() = "method" ∈ validTypes ✅
```

---

## 📊 타입 계층 구조

### EdgeType 계층 (parent 관계)

```
depends_on (최상위, 전이적)
├─ imports_file
├─ imports_library
├─ extends (상속 가능)
└─ implements

uses (최상위, 전이적)
├─ calls
├─ instantiates
└─ has_type

references (최상위, 전이적)
├─ links_to
└─ embeds

contains (계층적)
contains_heading (계층적)
```

### 추론 속성 분류

**Transitive (전이적)**:
- `depends_on`: A→B, B→C ⇒ A→C
- `uses`: A→B, B→C ⇒ A→C
- `references`: A→B, B→C ⇒ A→C

**Inheritable (상속 가능)**:
- `extends`: 부모-자식 관계에서 속성 전파

**Hierarchical (계층적)**:
- `contains`: 디렉토리 → 파일
- `contains_heading`: 파일 → 헤딩

---

## 🎯 시나리오 관리 베스트 프랙티스

### 1. 타입 정의 원칙

**DO**:
```typescript
// ✅ 명확한 이름과 설명
nodeTypes: [
  { name: "class", description: "Class definition" },
  { name: "method", description: "Method definition" }
]

// ✅ 적절한 parent 관계
edgeTypes: [
  { name: "calls", parent: "uses", isTransitive: false },
  { name: "uses", isTransitive: true }
]
```

**DON'T**:
```typescript
// ❌ 모호한 이름
nodeTypes: [
  { name: "thing", description: "Something" }
]

// ❌ 부모 타입 없이 고아 타입
edgeTypes: [
  { name: "calls", isTransitive: false }  // parent 없음
]
```

### 2. extends 체인 설계

**원칙**: 일반 → 구체적 순서

```
basic-structure (파일/디렉토리)
  ↓
file-dependency (파일 의존성)
  ↓
symbol-dependency (심볼 의존성)
```

**DO**:
```typescript
// ✅ 계층적 확장
{
  id: "symbol-dependency",
  extends: ["file-dependency"],  // 파일 의존성 기반
  nodeTypes: [/* 심볼 타입 */]
}
```

**DON'T**:
```typescript
// ❌ 역방향 확장
{
  id: "basic-structure",
  extends: ["symbol-dependency"],  // 순서 뒤바뀜
  nodeTypes: [/* 기본 타입 */]
}
```

### 3. 타입 일관성 유지

**규칙**: 같은 이름의 edgeType은 같은 속성 유지

**DO**:
```typescript
// Scenario A
edgeTypes: [
  { name: "depends_on", isTransitive: true }
]

// Scenario B (일관성 유지)
edgeTypes: [
  { name: "depends_on", isTransitive: true }  // ✅ 동일
]
```

**DON'T**:
```typescript
// Scenario A
edgeTypes: [
  { name: "depends_on", isTransitive: true }
]

// Scenario B (충돌)
edgeTypes: [
  { name: "depends_on", isTransitive: false }  // ❌ 충돌
]
```

---

## 🚀 향후 개선 사항

### 1. 동적 타입 등록 (Phase 3)

**목표**: 런타임에 새로운 타입 추가

```typescript
scenarioRegistry.registerNodeType("symbol-dependency", {
  name: "decorator",
  description: "TypeScript decorator"
});

scenarioRegistry.registerEdgeType("symbol-dependency", {
  name: "decorates",
  description: "Decorator application",
  parent: "uses"
});
```

### 2. 타입 검증 강화 (Phase 4)

**목표**: GraphDB 저장 전 타입 검증

```typescript
graphDB.upsertNode({
  type: "unknown_type",  // ❌ 시나리오에 없는 타입
  name: "test"
});
// Error: Node type 'unknown_type' not defined in any scenario
```

### 3. 타입 문서 자동 생성

**목표**: 시나리오별 타입 목록 자동 문서화

```bash
dependency-linker list-types --scenario symbol-dependency

Node Types (symbol-dependency):
  - class: Class definition
  - method: Method definition
  - function: Function definition
  ...

Edge Types (symbol-dependency):
  - calls: Function/method call (parent: uses, transitive: false)
  - extends: Class inheritance (parent: depends_on, inheritable: true)
  ...
```

---

## 📝 요약

### 핵심 인사이트

1. **명시적 타입 정의**: 모든 nodeType과 edgeType은 ScenarioSpec에서 명시적으로 정의
2. **타입 상속**: `extends` 체인을 통해 부모 시나리오의 타입 상속
3. **재귀적 수집**: `collectTypes()`로 전체 타입 체인 수집
4. **일관성 검증**: `validateTypeConsistency()`로 속성 충돌 검사
5. **RDF 통합**: 시나리오 타입으로 RDF 주소 검증

### 시나리오 관리의 중요성

**User Quote**: "RDF와 관계 하나하나가 정의해야하는 거니까 시나리오 관리가 중요함"

→ **시나리오는 타입 시스템의 중심**:
- RDF 주소의 nodeType은 시나리오에 정의되어야 함
- GraphDB의 edgeType은 시나리오에 정의되어야 함
- 새로운 분석 = 새로운 시나리오 = 새로운 타입 정의

---

**Last Updated**: 2025-10-05
**Status**: 분석 완료
**Next Steps**: RdfSearchEngine 구현 시 시나리오 타입 검증 통합
