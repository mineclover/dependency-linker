# Namespace-Scenario Integration

**Category**: Core Architecture
**Status**: 🚧 In Development
**Version**: 1.0.0
**Depends On**: [Scenario System](../scenario-system/), [Namespace Management](../namespace-management/)

---

## 📋 Overview

Namespace-Scenario 통합은 "어떤 파일들을" (Namespace)과 "어떻게 분석할지" (Scenario)를 연결하는 핵심 아키텍처입니다. Namespace가 Scenario를 선택함으로써 진정한 수평적 확장이 가능해집니다.

### Key Concepts

**Namespace = 문맥 (Context)**:
- 파일 그룹 선택 (glob 패턴)
- 시나리오 선택 (분석 방법)
- 시맨틱 태그 (의미 부여)

**Scenario = 재사용 가능한 분석**:
- 독립적으로 정의
- 여러 Namespace에서 재사용
- 조합 가능

**수평적 확장**:
```
새 분석 = Namespace 추가 + Scenario 조합 선택
```

---

## 🎯 Design Principles

### 1. **Namespace가 Scenario 선택**
```json
{
  "frontend": {
    "filePatterns": ["src/**/*.tsx"],
    "scenarios": ["react-component", "file-dependency"]
  }
}
```

### 2. **문맥별 맞춤 분석**
```json
{
  "frontend": { "scenarios": ["react-component"] },
  "backend": { "scenarios": ["symbol-dependency"] },
  "docs": { "scenarios": ["markdown-linking"] }
}
```

### 3. **시나리오 재사용**
```json
{
  "web-app": { "scenarios": ["react-component"] },
  "mobile-app": { "scenarios": ["react-component"] },
  "shared-ui": { "scenarios": ["react-component"] }
}
```

### 4. **설정 기반 확장**
```
코드 수정 없이 deps.config.json 수정만으로
새로운 분석 조합 추가
```

---

## 📐 Extended NamespaceConfig

### 기존 구조

```typescript
interface NamespaceConfig {
  filePatterns: string[];
  excludePatterns?: string[];
  semanticTags?: string[];
}
```

### 확장된 구조

```typescript
interface NamespaceConfig {
  // 기존 필드
  filePatterns: string[];
  excludePatterns?: string[];
  description?: string;
  semanticTags?: string[];

  // ===== 신규: Scenario 통합 =====

  /**
   * 실행할 시나리오 목록
   *
   * @default ['basic-structure', 'file-dependency']
   * @example ['react-component', 'file-dependency']
   */
  scenarios?: string[];

  /**
   * 시나리오별 설정 오버라이드
   *
   * @example
   * {
   *   'react-component': {
   *     detectPropsDrilling: true,
   *     maxPropsDrillingDepth: 3
   *   }
   * }
   */
  scenarioConfig?: {
    [scenarioId: string]: Record<string, unknown>;
  };
}
```

---

## 🏗️ Architecture

### Data Flow

```
deps.config.json
  ↓ NamespaceConfig
  {
    "frontend": {
      "filePatterns": ["src/**/*.tsx"],
      "scenarios": ["react-component"]
    }
  }
  ↓
NamespaceDependencyAnalyzer
  1. FilePatternMatcher → Files
  2. ScenarioRegistry → Execution Order
  3. For each file:
     - Analyzer[0].analyze(file)
     - Analyzer[1].analyze(file)
     - ...
  ↓
GraphDatabase
  (namespace 메타데이터 포함)
```

### Component Integration

```
Namespace
  ├── filePatterns → FilePatternMatcher → Files
  ├── scenarios → ScenarioRegistry → ExecutionOrder
  └── scenarioConfig → Analyzer Configuration
       ↓
BaseScenarioAnalyzer[]
  ├── BasicStructureAnalyzer
  ├── FileDependencyAnalyzer
  └── ReactDependencyAnalyzer
       ↓
GraphDatabase
  ├── Nodes (namespace tag)
  ├── Edges (namespace tag)
  └── SemanticTags (namespace tag)
```

---

## 📝 Configuration Examples

### 모노레포 구성

```json
{
  "namespaces": {
    "web-frontend": {
      "description": "React web application",
      "filePatterns": ["packages/web/src/**/*.tsx"],
      "scenarios": ["react-component", "file-dependency"],
      "scenarioConfig": {
        "react-component": {
          "detectPropsDrilling": true,
          "maxPropsDrillingDepth": 3,
          "trackContextProviders": true
        }
      },
      "semanticTags": ["frontend", "react", "web"]
    },

    "mobile-app": {
      "description": "React Native mobile app",
      "filePatterns": ["packages/mobile/src/**/*.tsx"],
      "scenarios": ["react-component"],
      "semanticTags": ["mobile", "react-native"]
    },

    "backend-api": {
      "description": "NestJS API server",
      "filePatterns": ["packages/api/src/**/*.ts"],
      "excludePatterns": ["**/*.spec.ts"],
      "scenarios": ["basic-structure", "symbol-dependency"],
      "semanticTags": ["backend", "api", "nestjs"]
    },

    "shared-lib": {
      "description": "Shared business logic",
      "filePatterns": ["packages/shared/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency"],
      "semanticTags": ["library", "shared"]
    },

    "documentation": {
      "description": "Project documentation",
      "filePatterns": ["docs/**/*.md"],
      "scenarios": ["markdown-linking"],
      "semanticTags": ["documentation"]
    }
  }
}
```

### 레이어드 아키텍처 구성

```json
{
  "namespaces": {
    "presentation-layer": {
      "filePatterns": ["src/components/**/*.tsx", "src/pages/**/*.tsx"],
      "scenarios": ["react-component"],
      "semanticTags": ["layer:presentation", "ui"]
    },

    "business-layer": {
      "filePatterns": ["src/services/**/*.ts", "src/domain/**/*.ts"],
      "scenarios": ["basic-structure", "symbol-dependency"],
      "semanticTags": ["layer:business", "domain-logic"]
    },

    "data-layer": {
      "filePatterns": ["src/repositories/**/*.ts", "src/models/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency"],
      "semanticTags": ["layer:data", "persistence"]
    },

    "infrastructure-layer": {
      "filePatterns": ["src/infrastructure/**/*.ts"],
      "scenarios": ["basic-structure"],
      "semanticTags": ["layer:infrastructure"]
    }
  }
}
```

---

## 🔄 Refactored NamespaceDependencyAnalyzer

### 기존 구조

```typescript
class NamespaceDependencyAnalyzer {
  async analyzeNamespace(namespace: string) {
    // DependencyGraphBuilder 직접 사용
    const builder = createDependencyGraphBuilder({ entryPoints: files });
    const result = await builder.build();
  }
}
```

### 새로운 구조

```typescript
class NamespaceDependencyAnalyzer {
  constructor(
    private scenarioRegistry: ScenarioRegistry,
    private database: GraphDatabase
  ) {}

  async analyzeNamespace(namespace: string, configPath: string) {
    // 1. 파일 매칭
    const namespaceData = await configManager.getNamespaceWithFiles(...);

    // 2. 시나리오 선택
    const scenarioIds = namespaceData.metadata.scenarios || [
      'basic-structure',
      'file-dependency'
    ];

    // 3. 실행 순서 계산
    const executionOrder = this.scenarioRegistry.getExecutionOrder(scenarioIds);

    console.log(`🎯 Scenarios: ${executionOrder.join(' → ')}`);

    // 4. 각 시나리오 실행
    for (const scenarioId of executionOrder) {
      const scenario = this.scenarioRegistry.get(scenarioId);
      const analyzer = this.createAnalyzer(
        scenario,
        namespaceData.metadata.scenarioConfig?.[scenarioId]
      );

      for (const file of namespaceData.files) {
        await analyzer.analyze(file, language);
      }
    }

    // 5. 시맨틱 태그 적용
    await this.applySemanticTags(
      namespaceData.files,
      namespaceData.metadata.semanticTags,
      namespace
    );
  }
}
```

---

## 🚀 CLI Commands

### 기존 명령어 (호환 유지)

```bash
# 기본 시나리오로 분석
npm run namespace analyze frontend

# 모든 namespace 분석
npm run namespace analyze-all
```

### 신규 명령어 (시나리오 제어)

```bash
# 특정 시나리오만 실행
npm run namespace analyze frontend -- \
  --scenarios react-component,file-dependency

# 시나리오 설정 오버라이드
npm run namespace analyze frontend -- \
  --scenario-config '{"react-component":{"detectPropsDrilling":false}}'

# 시나리오 정보 조회
npm run namespace scenarios

# 특정 namespace의 시나리오 확인
npm run namespace scenarios frontend
```

---

## 📊 Execution Flow

### 실행 예시

```
🚀 Analyzing namespace: web-frontend

📋 Namespace: web-frontend
📁 Files: 42
🎯 Scenarios: basic-structure → file-dependency → react-component

🔄 Executing scenario: Basic Code Structure Extraction
  ✅ App.tsx (class: 1, function: 3)
  ✅ Button.tsx (class: 1, function: 1)
  ... (42 files)

🔄 Executing scenario: File-level Dependency Analysis
  ✅ App.tsx (imports: 5, exports: 1)
  ✅ Button.tsx (imports: 2, exports: 1)
  ... (42 files)

🔄 Executing scenario: React Component Analysis
  ✅ App.tsx (components: 1, hooks: 3)
  ✅ Button.tsx (components: 1, props: 4)
  ⚠️  Props drilling detected: App → Layout → Header → Button (depth: 3)
  ... (42 files)

🏷️  Applying semantic tags: [frontend, react, web]

📊 Analysis Complete:
  ✅ 42/42 files analyzed
  📈 Graph: 156 nodes, 287 edges
  🔗 Circular dependencies: 0
  ⚠️  Warnings: 1 (props drilling)
```

### 시나리오 의존성 해결

```
입력: scenarios: ["react-component"]

ScenarioRegistry.getExecutionOrder()
  ↓
REACT_COMPONENT_SCENARIO:
  extends: ['basic-structure', 'file-dependency']
  requires: ['symbol-dependency']
  ↓
위상 정렬 (Topological Sort)
  ↓
실행 순서:
  1. basic-structure
  2. file-dependency
  3. symbol-dependency
  4. react-component
```

---

## 🔗 Integration Benefits

### 1. **비용 최적화**
```
문서는 markdown만 → 불필요한 분석 제거
API는 기본 구조만 → React 분석 생략
UI는 React 전용 → 심화 분석 집중
```

### 2. **맥락 기반 분석**
```
같은 파일도 namespace에 따라 다르게 분석
- frontend namespace: React 시나리오
- shared namespace: 기본 구조만
```

### 3. **재사용성**
```
시나리오는 한 번 정의, 여러 namespace에서 재사용
- react-component 시나리오
  → web-app, mobile-app, shared-ui 모두 사용
```

### 4. **확장성**
```
새 분석 추가 = deps.config.json 수정만
코드 변경 불필요
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('Namespace-Scenario Integration', () => {
  test('should select scenarios from namespace config', async () => {
    const config: NamespaceConfig = {
      filePatterns: ['src/**/*.tsx'],
      scenarios: ['react-component']
    };

    const analyzer = new NamespaceDependencyAnalyzer(...);
    const result = await analyzer.analyzeNamespace('frontend', './config.json');

    expect(result.executedScenarios).toEqual([
      'basic-structure',
      'file-dependency',
      'react-component'
    ]);
  });

  test('should apply scenario config overrides', async () => {
    const config: NamespaceConfig = {
      filePatterns: ['src/**/*.tsx'],
      scenarios: ['react-component'],
      scenarioConfig: {
        'react-component': { detectPropsDrilling: false }
      }
    };

    // Analyzer should receive merged config
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Scenario Execution', () => {
  test('should execute multiple scenarios in order', async () => {
    // Test full workflow
  });

  test('should handle scenario dependencies correctly', async () => {
    // Test extends/requires resolution
  });
});
```

---

## 📚 Migration Guide

### Phase 1: 하위 호환성 유지
```json
// 기존 설정 (scenarios 없음) → 기본값 사용
{
  "frontend": {
    "filePatterns": ["src/**/*.tsx"]
    // scenarios 자동 설정: ['basic-structure', 'file-dependency']
  }
}
```

### Phase 2: 점진적 마이그레이션
```json
// 일부 namespace만 scenarios 추가
{
  "frontend": {
    "filePatterns": ["src/**/*.tsx"],
    "scenarios": ["react-component"]  // 신규
  },
  "backend": {
    "filePatterns": ["server/**/*.ts"]
    // 기본값 사용
  }
}
```

### Phase 3: 완전 전환
```json
// 모든 namespace에 scenarios 명시
{
  "frontend": { "scenarios": ["react-component"] },
  "backend": { "scenarios": ["basic-structure", "symbol-dependency"] },
  "docs": { "scenarios": ["markdown-linking"] }
}
```

---

## 📊 Performance Considerations

### 시나리오 캐싱
```typescript
// Analyzer 인스턴스 재사용
const analyzerCache = new Map<string, BaseScenarioAnalyzer>();
```

### 병렬 실행 (향후)
```typescript
// 독립적인 시나리오는 병렬 실행
await Promise.all([
  analyzeWithScenario('basic-structure'),
  analyzeWithScenario('file-dependency')
]);
```

---

## 🔗 Related Documentation

- [Scenario System](../scenario-system/) - 시나리오 시스템 상세
- [Namespace Management](../namespace-management/) - 네임스페이스 관리
- [Dependency Analysis](../dependency-analysis/) - 의존성 분석

---

## ✅ Implementation Checklist

구현 작업 목록은 [todos.md](./todos.md) 참조

---

**Last Updated**: 2025-10-04
**Status**: 🚧 In Development
