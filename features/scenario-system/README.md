# Scenario System

**Category**: Core Architecture
**Status**: 🚧 In Development
**Version**: 1.0.0

---

## 📋 Overview

시나리오 시스템은 분석 방법을 재사용 가능한 명세(Spec)로 정의하고 관리하는 핵심 아키텍처입니다. 각 시나리오는 독립적으로 정의되며, 다양한 컨텍스트에서 재사용될 수 있습니다.

### Key Concepts

**Scenario (시나리오)**:
- 분석의 목적과 방법을 정의하는 단위
- EdgeType, NodeType, SemanticTag 등 필요한 모든 타입 명세 포함
- Analyzer 구현체와 연결

**ScenarioSpec (시나리오 명세)**:
- 시나리오의 완전한 정의
- 타입 안전성 보장
- 의존성 관리 (extends, requires)

**ScenarioRegistry (시나리오 레지스트리)**:
- 모든 시나리오 중앙 관리
- 타입 충돌 검증
- 실행 순서 계산 (topological sort)

---

## 🎯 Design Principles

### 1. **명세 우선 (Spec-First)**
```typescript
// 코드 작성 전에 명세 먼저 정의
const SCENARIO_SPEC: ScenarioSpec = {
  id: 'react-component',
  edgeTypes: [...],
  nodeTypes: [...],
  analyzer: { className: 'ReactDependencyAnalyzer' }
};
```

### 2. **수평적 확장 (Horizontal Scalability)**
```typescript
// 새 시나리오 추가 = 명세 작성 + Registry 등록
registry.register(NEW_SCENARIO_SPEC);
// 기존 코드 수정 불필요
```

### 3. **조합 가능성 (Composability)**
```typescript
// 시나리오 간 의존성 및 확장
const ADVANCED_SCENARIO = {
  extends: ['basic-structure', 'file-dependency'],
  requires: ['symbol-dependency']
};
```

### 4. **타입 안전성 (Type Safety)**
```typescript
// ScenarioSpec에서 모든 타입 정의
// EdgeTypeRegistry와 자동 동기화
```

---

## 📐 Core Interfaces

### ScenarioSpec

```typescript
interface ScenarioSpec {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // Dependencies
  extends?: string[];        // 기반 시나리오 (타입 상속)
  requires?: string[];       // 필수 선행 시나리오 (실행 순서)

  // Type Specifications
  nodeTypes: NodeTypeSpec[];
  edgeTypes: EdgeTypeSpec[];
  semanticTags?: SemanticTagSpec[];

  // Query Patterns (tree-sitter)
  queryPatterns?: QueryPatternSpec[];

  // Analyzer
  analyzer: {
    className: string;
    config?: Record<string, unknown>;
  };

  // Inference Rules
  inferenceRules?: InferenceRuleSpec[];
}
```

### EdgeTypeSpec

```typescript
interface EdgeTypeSpec {
  name: string;
  description: string;
  parent?: string;           // 계층 구조
  isTransitive?: boolean;
  isInheritable?: boolean;
  isHierarchical?: boolean;
}
```

### NodeTypeSpec

```typescript
interface NodeTypeSpec {
  name: string;
  description: string;
  defaultProperties?: Record<string, unknown>;
}
```

---

## 🏗️ Architecture

### Component Structure

```
Scenario System
├── ScenarioSpec (타입 정의)
│   ├── NodeTypeSpec[]
│   ├── EdgeTypeSpec[]
│   ├── SemanticTagSpec[]
│   └── QueryPatternSpec[]
│
├── ScenarioRegistry (중앙 관리)
│   ├── register(spec)
│   ├── get(id)
│   ├── getExecutionOrder(ids[])
│   └── collectTypes(id)
│
└── BaseScenarioAnalyzer (실행 기반)
    ├── scenario: ScenarioSpec
    ├── ownedEdgeTypes (자동 계산)
    └── analyze() (구현 필수)
```

### Data Flow

```
ScenarioSpec 정의
  ↓
ScenarioRegistry.register()
  ↓ 검증
  - 명세 유효성
  - 의존성 순환 참조
  - 타입 충돌
  ↓
등록 완료
  ↓
실행 시:
ScenarioRegistry.getExecutionOrder()
  ↓ topological sort
[scenario-1, scenario-2, scenario-3]
  ↓
각 시나리오별 Analyzer 실행
```

---

## 📦 Built-in Scenarios

### 1. Basic Structure Scenario

```typescript
const BASIC_STRUCTURE_SCENARIO: ScenarioSpec = {
  id: 'basic-structure',
  name: 'Basic Code Structure Extraction',
  description: '코드의 기본 구조 요소 추출 (클래스, 함수, 변수)',
  version: '1.0.0',

  nodeTypes: [
    { name: 'file', description: 'Source code file' },
    { name: 'class', description: 'Class definition' },
    { name: 'function', description: 'Function definition' },
    { name: 'variable', description: 'Variable declaration' }
  ],

  edgeTypes: [
    { name: 'contains', description: 'Structural containment',
      isTransitive: true, isInheritable: true },
    { name: 'declares', description: 'Declaration relationship',
      isInheritable: true }
  ],

  analyzer: { className: 'BasicStructureAnalyzer' }
};
```

### 2. File Dependency Scenario

```typescript
const FILE_DEPENDENCY_SCENARIO: ScenarioSpec = {
  id: 'file-dependency',
  name: 'File-level Dependency Analysis',
  extends: ['basic-structure'],  // ✅ 기본 구조 위에 구축

  nodeTypes: [
    { name: 'library', description: 'External library' },
    { name: 'package', description: 'NPM package' }
  ],

  edgeTypes: [
    { name: 'depends_on', description: 'General dependency',
      isTransitive: true },
    { name: 'imports_library', description: 'Import library',
      parent: 'depends_on' },
    { name: 'imports_file', description: 'Import file',
      parent: 'depends_on' }
  ],

  analyzer: { className: 'FileDependencyAnalyzer' }
};
```

### 3. React Component Scenario

```typescript
const REACT_COMPONENT_SCENARIO: ScenarioSpec = {
  id: 'react-component',
  name: 'React Component Analysis',
  extends: ['basic-structure', 'file-dependency'],
  requires: ['symbol-dependency'],

  nodeTypes: [
    { name: 'jsx-component', description: 'JSX/TSX component' },
    { name: 'jsx-prop', description: 'Component prop' },
    { name: 'react-hook', description: 'React hook usage' }
  ],

  edgeTypes: [
    { name: 'renders', description: 'Component renders another',
      parent: 'depends_on', isTransitive: true },
    { name: 'passes_prop', description: 'Passes prop to child' },
    { name: 'uses_hook', description: 'Uses React hook',
      parent: 'depends_on' }
  ],

  semanticTags: [
    { name: 'ui-component', category: 'role',
      autoTagRules: { nodeType: 'jsx-component' } }
  ],

  analyzer: {
    className: 'ReactDependencyAnalyzer',
    config: {
      detectPropsDrilling: true,
      maxPropsDrillingDepth: 3
    }
  }
};
```

---

## 🔧 API Reference

### ScenarioRegistry

#### `register(spec: ScenarioSpec): void`
시나리오 등록 및 검증

```typescript
const registry = new ScenarioRegistry();
registry.register(BASIC_STRUCTURE_SCENARIO);
```

#### `get(id: string): ScenarioSpec | undefined`
시나리오 조회

```typescript
const scenario = registry.get('basic-structure');
```

#### `getExecutionOrder(scenarioIds: string[]): string[]`
실행 순서 계산 (위상 정렬)

```typescript
const order = registry.getExecutionOrder(['react-component']);
// → ['basic-structure', 'file-dependency', 'symbol-dependency', 'react-component']
```

#### `collectTypes(scenarioId: string): TypeCollection`
시나리오별 필요한 타입 수집 (extends 체인 포함)

```typescript
const types = registry.collectTypes('react-component');
// → { nodeTypes: Set([...]), edgeTypes: Set([...]), semanticTags: Set([...]) }
```

### BaseScenarioAnalyzer

```typescript
abstract class BaseScenarioAnalyzer {
  protected scenario: ScenarioSpec;
  protected database: GraphDatabase;
  protected config: Record<string, unknown>;

  // OWNED_EDGE_TYPES 자동 계산
  protected get ownedEdgeTypes(): string[];

  // 설정 값 가져오기 (타입 안전)
  protected getConfig<T>(key: string, defaultValue: T): T;

  // 분석 실행 (구현 필수)
  abstract analyze(filePath: string, language: SupportedLanguage): Promise<AnalysisResult>;
}
```

---

## 📊 Validation

### 명세 검증
- ✅ 필수 필드 존재 여부
- ✅ ID 유일성
- ✅ 버전 형식

### 의존성 검증
- ✅ extends/requires 시나리오 존재 여부
- ✅ 순환 참조 탐지

### 타입 충돌 검증
- ✅ 동일 이름 EdgeType의 속성 일치
- ✅ 계층 구조 일관성

---

## 🚀 Usage Example

### 1. 시나리오 정의

```typescript
// src/scenarios/MyCustomScenario.ts
export const MY_CUSTOM_SCENARIO: ScenarioSpec = {
  id: 'my-custom',
  name: 'My Custom Analysis',
  version: '1.0.0',

  extends: ['basic-structure'],

  edgeTypes: [
    { name: 'custom-edge', description: 'Custom relationship' }
  ],

  analyzer: { className: 'MyCustomAnalyzer' }
};
```

### 2. Analyzer 구현

```typescript
// src/scenarios/analyzers/MyCustomAnalyzer.ts
export class MyCustomAnalyzer extends BaseScenarioAnalyzer {
  async analyze(filePath: string, language: SupportedLanguage): Promise<AnalysisResult> {
    // 1. Cleanup (ownedEdgeTypes 자동 사용)
    await this.cleanupExistingDependencies(filePath);

    // 2. 분석 로직
    const customRelations = await this.extractCustomRelations(filePath);

    // 3. GraphDB 저장
    await this.database.createEdges(customRelations);

    return { nodes: [], edges: customRelations };
  }
}
```

### 3. Registry 등록

```typescript
// src/scenarios/index.ts
import { globalScenarioRegistry } from './ScenarioRegistry';
import { MY_CUSTOM_SCENARIO } from './MyCustomScenario';

globalScenarioRegistry.register(MY_CUSTOM_SCENARIO);
```

### 4. 사용

```typescript
// Namespace에서 선택하거나
// 프로그래밍적으로 실행
const analyzer = new MyCustomAnalyzer(
  MY_CUSTOM_SCENARIO,
  database
);

await analyzer.analyze('/path/to/file.ts', 'typescript');
```

---

## 🔗 Integration Points

### With Namespace System
- Namespace가 `scenarios` 필드로 시나리오 선택
- NamespaceDependencyAnalyzer가 ScenarioRegistry 사용

### With EdgeTypeRegistry
- ScenarioSpec의 edgeTypes → EdgeTypeRegistry 자동 등록
- 계층 구조 자동 구성

### With InferenceEngine
- ScenarioSpec의 inferenceRules → InferenceEngine 설정
- 시나리오별 추론 규칙 정의

---

## 📚 Related Documentation

- [Namespace-Scenario Integration](../namespace-scenario-integration/) - Namespace와의 통합
- [Dependency Analysis](../dependency-analysis/) - 의존성 분석 시나리오들
- [Type System](../../docs/type-system.md) - 타입 시스템 상세

---

## ✅ Implementation Checklist

구현 작업 목록은 [todos.md](./todos.md) 참조

---

**Last Updated**: 2025-10-04
**Status**: 🚧 In Development
