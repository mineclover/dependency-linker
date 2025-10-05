# Pipeline Overview

전체 데이터 처리 파이프라인: 추출 → 저장 → 분석 → 추론

## 목차
- [개요](#개요)
- [1. EXTRACTION (데이터 추출)](#1-extraction-데이터-추출)
  - [1.1 Parser Layer](#11-parser-layer-파서-레이어)
  - [1.2 Symbol Extraction](#12-symbol-extraction-심볼-추출)
  - [1.3 Dependency Detection](#13-dependency-detection-의존성-감지)
- [2. STORAGE (데이터 저장)](#2-storage-데이터-저장)
  - [2.1 Node Storage](#21-node-storage-노드-저장)
  - [2.2 Edge Storage](#22-edge-storage-엣지-저장)
  - [2.3 Edge Type 관리](#23-edge-type-관리--완료)
  - [2.4 Semantic Tag Generation](#24-semantic-tag-generation--선택적-기능)
- [3. ANALYSIS (의존성 분석)](#3-analysis-의존성-분석)
  - [3.1 Direct Analysis](#31-direct-analysis-직접-분석)
  - [3.2 Pattern Analysis](#32-pattern-analysis-패턴-분석)
  - [3.3 Domain Analysis](#33-domain-analysis-도메인-분석)
- [4. INFERENCE (추론)](#4-inference-추론)
  - [4.1 Hierarchical Inference](#41-hierarchical-inference-계층적-추론)
  - [4.2 Transitive Inference](#42-transitive-inference-전이적-추론)
  - [4.3 Inheritable Inference](#43-inheritable-inference-상속-가능-추론)
- [5. 전체 플로우 예시](#5-전체-플로우-예시)
- [6. 데이터 흐름도](#6-데이터-흐름도)
- [7. 핵심 개념 요약](#7-핵심-개념-요약)
- [8. 관련 문서](#8-관련-문서)

## 개요

Dependency Linker는 4단계 파이프라인으로 코드베이스를 분석합니다:

```
1. EXTRACTION (추출)
   ↓
2. STORAGE (저장)
   ↓
3. ANALYSIS (분석)
   ↓
4. INFERENCE (추론)
```

## 1. EXTRACTION (데이터 추출)

**목적**: 소스 코드에서 구조화된 데이터 추출

### 1.1 Parser Layer (파서 레이어)

**입력**: 소스 코드 파일
**출력**: AST (Abstract Syntax Tree)

```typescript
// Tree-sitter 기반 파서
import { TypeScriptParser } from './parsers/TypeScriptParser';

const parser = new TypeScriptParser();
const ast = parser.parse(sourceCode, filePath);
```

**관련 문서**: [PARSER_SYSTEM.md](PARSER_SYSTEM.md)

### 1.2 Symbol Extraction (심볼 추출)

**입력**: AST
**출력**: Symbol 정보 (SymbolInfo)

```typescript
// AST에서 심볼 추출
const symbols = analyzer.extractSymbols(ast);

// SymbolInfo 구조
interface SymbolInfo {
  type: string;           // "class", "function", "method" 등 (대상 식별, 필수)
  name: string;
  location: SourceLocation;
  semanticTags?: string[]; // 복합적 의미 표현 (선택적, 필요시 추출 룰 적용)
}
```

**Type 결정**:
- AST 노드 타입에서 자동 추출
- LSP SymbolKind 기반 매핑
- 예: AST ClassDeclaration → `type: "class"`

**관련 문서**: [type-system.md](type-system.md)

### 1.3 Dependency Detection (의존성 감지)

**입력**: AST, Symbol 정보
**출력**: Dependency 관계

```typescript
// 의존성 감지
const dependencies = analyzer.extractDependencies(ast, symbols);

// Dependency 구조
interface Dependency {
  fromSymbol: string;
  toSymbol: string;
  type: EdgeType;  // "imports", "calls", "extends" 등
}
```

**의존성 타입**:
- Import/Export 관계
- 함수/메서드 호출
- 클래스 상속/구현
- 타입 참조

**관련 문서**: [edge-type-management.md](edge-type-management.md)

## 2. STORAGE (데이터 저장)

**목적**: 추출된 데이터를 GraphDB에 저장

### 2.1 Node Storage (노드 저장)

**입력**: SymbolInfo
**출력**: GraphDB Node

```typescript
// 노드 생성 및 저장
const nodeId = await db.upsertNode({
  identifier: `${filePath}::${type}::${name}`,
  type: symbolInfo.type,           // 대상 식별 (AST에서 자동 추출, 필수)
  name: symbolInfo.name,
  sourceFile: filePath,
  language: 'typescript',
  semanticTags: [],                // 복합적 의미 (선택적, 필요시 추출 룰 적용)
  metadata: { /* ... */ },
  startLine: symbolInfo.location.start.line,
  // ...
});
```

**데이터베이스 스키마**:
```sql
CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  identifier TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,              -- 대상 식별 (필수)
  name TEXT NOT NULL,
  source_file TEXT NOT NULL,
  language TEXT NOT NULL,
  semantic_tags TEXT DEFAULT '[]', -- 복합적 의미 (선택적, JSON array)
  metadata TEXT DEFAULT '{}',
  -- ...
);
```

**관련 문서**: [schema.sql](../src/database/schema.sql)

### 2.2 Edge Storage (엣지 저장)

**입력**: Dependency
**출력**: GraphDB Edge

```typescript
// 엣지 생성 및 저장
await db.upsertEdge({
  startNodeId: fromNodeId,
  endNodeId: toNodeId,
  type: dependency.type,  // "imports", "calls" 등
  metadata: { /* ... */ },
  sourceFile: filePath
});
```

**데이터베이스 스키마**:
```sql
CREATE TABLE edges (
  id INTEGER PRIMARY KEY,
  start_node_id INTEGER NOT NULL,
  end_node_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  source_file TEXT,
  -- ...
  FOREIGN KEY (start_node_id) REFERENCES nodes(id),
  FOREIGN KEY (end_node_id) REFERENCES nodes(id)
);
```

### 2.3 Edge Type 관리 (✅ 완료)

**입력**: Dependency 관계
**출력**: Edge Type 계층 구조

```typescript
// Edge Type 등록 및 계층 구조 관리
const registry = new EdgeTypeRegistry();

registry.registerEdgeType({
  type: 'imports',
  parentType: 'depends_on',
  isTransitive: true,
  isInheritable: false
});

registry.registerEdgeType({
  type: 'calls',
  parentType: 'depends_on',
  isTransitive: true,
  isInheritable: true
});

// 계층 구조 조회
const hierarchy = registry.getTypeHierarchy('imports');
// { type: 'imports', parent: 'depends_on', children: [] }
```

**완성 기준**: Edge 추출 + Edge Type 관리 = 의존성 분석 완성

**관련 문서**: [edge-type-management.md](edge-type-management.md)

### 2.4 Semantic Tag Generation (💡 선택적 기능)

**목적**: 복합적 의미를 가진 노드에 추가 메타데이터 제공

**입력**: Node 정보 (type, name, filePath 등)
**출력**: Semantic Tags (추출 룰 적용 결과)

```typescript
// 필요시 추출 룰 적용
const tags: string[] = [];

// 1. 파일 경로 기반 룰
if (node.sourceFile.includes('/services/')) {
  tags.push('service-layer');
}

// 2. 이름 패턴 기반 룰
if (node.name.endsWith('Service')) {
  tags.push('service-layer');
}

// 3. AST 구조 기반 룰
if (node.metadata?.isExported) {
  tags.push('public-api');
}

// 노드 업데이트
await db.updateNode(node.id, { semanticTags: tags });
```

**현재 상태**:
- ✅ 마크다운 헤딩: hashtag 기반 자동 생성
- 💡 일반 코드 심볼: 필요시 SemanticTagExtractor 구현

**관련 문서**: [semantic-tags.md](semantic-tags.md)

## 3. ANALYSIS (의존성 분석)

**목적**: 저장된 그래프 데이터 분석

### 3.1 Direct Analysis (직접 분석)

**쿼리**: 직접 관계 조회

```typescript
// 특정 파일이 import하는 모든 파일
const imports = await db.findEdges({
  startNodeId: fileNodeId,
  edgeType: 'imports'
});

// Semantic Tag 기반 필터링
const serviceLayerNodes = await db.findNodes({
  semanticTags: ['service-layer']
});
```

### 3.2 Pattern Analysis (패턴 분석)

**쿼리**: 구조적 패턴 검색

```typescript
// 아키텍처 레이어별 분석
const services = await db.findNodes({
  semanticTags: ['service-layer']
});
const controllers = await db.findNodes({
  semanticTags: ['controller-layer']
});

// 레이어 간 의존성 분석
for (const service of services) {
  const deps = await db.findEdges({
    startNodeId: service.id,
    edgeType: 'depends_on'
  });
  // 레이어 위반 검사 등
}
```

### 3.3 Domain Analysis (도메인 분석)

**쿼리**: 도메인별 영향도 분석

```typescript
// auth 도메인의 모든 노드
const authNodes = await db.findNodes({
  semanticTags: ['auth-domain']
});

// auth 도메인이 의존하는 다른 도메인
const crossDomainDeps = await db.findEdges({
  startNodeIds: authNodes.map(n => n.id),
  edgeType: 'depends_on'
});
```

**관련 문서**: [DEPENDENCY_GRAPH_ANALYSIS.md](DEPENDENCY_GRAPH_ANALYSIS.md)

### 3.4 Scenario-Based Analysis (시나리오 기반 분석)

**목적**: 네임스페이스별 최적화된 시나리오 조합으로 수평적 확장 실현

**개념**:
```
새 분석 = Namespace 추가 + Scenario 조합 선택
```

**시나리오 시스템**:
```typescript
// Built-in Scenarios
- basic-structure: 파일/디렉토리 노드 (모든 언어 지원)
- file-dependency: Import/require 추적 (TypeScript/JavaScript)
- symbol-dependency: 심볼 수준 의존성 (calls, instantiation, type refs)
- markdown-linking: 마크다운 링크 분석 (8가지 의존성 타입)
```

**Namespace 설정**:
```json
{
  "namespaces": {
    "frontend": {
      "filePatterns": ["src/frontend/**/*.tsx"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"],
      "scenarioConfig": {
        "symbol-dependency": {
          "trackCalls": true,
          "trackInstantiations": true
        }
      }
    },
    "docs": {
      "filePatterns": ["docs/**/*.md"],
      "scenarios": ["markdown-linking"],
      "scenarioConfig": {
        "markdown-linking": {
          "extractHashtags": true
        }
      }
    }
  }
}
```

**시나리오 실행 순서**:
- Topological Sort (Kahn's Algorithm)로 의존성 기반 실행 순서 자동 계산
- `extends`: 타입 상속 (자식이 부모의 모든 타입 상속)
- `requires`: 실행 순서 (선행 시나리오 필요)

**분석 실행**:
```typescript
// 네임스페이스별 분석
const analyzer = new NamespaceDependencyAnalyzer();
const result = await analyzer.analyzeNamespace("frontend", configPath);

// 실행된 시나리오 확인
console.log(result.scenariosExecuted);
// ["basic-structure", "file-dependency", "symbol-dependency"]

// 전체 프로젝트 분석
const allResults = await analyzer.analyzeAll(configPath);
```

**핵심 가치**:
1. **비용 최적화**: 문서 분석 시 `markdown-linking`만, UI 분석 시 `symbol-dependency` 실행
2. **맥락 기반 분석**: 같은 `.ts` 파일도 네임스페이스에 따라 다르게 분석
3. **수평적 확장**: 코드 변경 없이 설정만으로 새 분석 추가

**관련 문서**: [namespace-scenario-guide.md](namespace-scenario-guide.md)

## 4. INFERENCE (추론)

**목적**: 직접 관계에서 간접 관계 추론

### 4.1 Hierarchical Inference (계층적 추론)

**개념**: 자식 타입을 부모 타입으로 조회

```
imports_library ─┐
                 ├─→ imports ─→ depends_on
imports_file    ─┘

Query: "imports"
Result: imports_library + imports_file 모두 반환
```

**API**:
```typescript
// 모든 import 관계 (library + file)
const allImports = await db.queryHierarchicalRelationships('imports', {
  includeChildren: true,  // 자식 타입 포함
  includeParents: false   // 부모 타입 제외
});
```

**Edge Type 계층**:
```typescript
// EdgeTypeRegistry에 정의된 계층
{
  type: 'imports_library',
  parentType: 'imports'  // 부모 지정
}

// 계층 구조
depends_on
├── imports
│   ├── imports_library
│   └── imports_file
├── calls
└── references
```

**관련 문서**: [edge-type-management.md](edge-type-management.md)

### 4.2 Transitive Inference (전이적 추론)

**개념**: A→B, B→C에서 A→C 추론

```
App.tsx → helpers.ts → math.ts
⇒ App.tsx → math.ts (전이적 추론)
```

**API**:
```typescript
// App.tsx의 전이적 의존성 (최대 깊이 10)
const transitiveDeps = await db.queryTransitiveRelationships(
  appNodeId,
  'depends_on',
  10  // max depth
);
```

**SQL 구현** (Recursive CTE):
```sql
WITH RECURSIVE transitive_paths AS (
  -- Base: 직접 관계
  SELECT start_node_id, end_node_id, 1 as depth
  FROM edges
  WHERE start_node_id = ? AND type = ?

  UNION ALL

  -- Recursive: 간접 관계
  SELECT tp.start_node_id, e.end_node_id, tp.depth + 1
  FROM edges e
  JOIN transitive_paths tp ON e.start_node_id = tp.end_node_id
  WHERE tp.depth < ? AND e.type = ?
    AND NOT EXISTS (
      -- 순환 방지
      SELECT 1 FROM transitive_paths
      WHERE end_node_id = e.end_node_id
    )
)
SELECT * FROM transitive_paths
```

### 4.3 Inheritable Inference (상속 가능 추론)

**개념**: 부모-자식 관계를 통한 관계 전파

```
File contains Class
Class extends BaseClass
⇒ File indirectly contains BaseClass members
```

**API**:
```typescript
// 파일이 포함하는 모든 심볼 (직간접)
const inheritedRels = await db.queryInheritableRelationships(
  fileNodeId,
  'contains',
  5  // max depth
);
```

**관련 문서**: [inference-system.md](inference-system.md)

## 5. 전체 플로우 예시

### TypeScript 파일 분석 전체 과정

```typescript
// ===== 1. EXTRACTION =====
const parser = new TypeScriptParser();
const ast = parser.parse(sourceCode, '/src/services/UserService.ts');

// 심볼 추출
const symbols = analyzer.extractSymbols(ast);
// Result: [
//   { type: "class", name: "UserService", ... },
//   { type: "method", name: "login", ... }
// ]

// 의존성 추출
const dependencies = analyzer.extractDependencies(ast);
// Result: [
//   { from: "UserService", to: "AuthService", type: "imports" },
//   { from: "login", to: "authenticate", type: "calls" }
// ]

// ===== 2. STORAGE =====
await db.initialize();

// 노드 저장
const classNodeId = await db.upsertNode({
  identifier: '/src/services/UserService.ts::class::UserService',
  type: 'class',              // AST에서 추출된 실제 형태
  name: 'UserService',
  sourceFile: '/src/services/UserService.ts',
  language: 'typescript',
  semanticTags: [],           // 아직 빈 배열
  metadata: { isExported: true }
});

// 엣지 저장
await db.upsertEdge({
  startNodeId: classNodeId,
  endNodeId: authServiceNodeId,
  type: 'imports',
  sourceFile: '/src/services/UserService.ts'
});

// Semantic Tags 생성 (추출 룰 적용)
const tags = [];
// 룰 1: 경로 기반
if ('/src/services/UserService.ts'.includes('/services/')) {
  tags.push('service-layer');
}
// 룰 2: 이름 패턴
if ('UserService'.endsWith('Service')) {
  tags.push('service-layer');
}
// 룰 3: AST 구조
if (metadata.isExported) {
  tags.push('public-api');
}

await db.updateNode(classNodeId, {
  semanticTags: ['service-layer', 'public-api']
});

// ===== 3. ANALYSIS =====
// 직접 분석: service-layer의 모든 노드
const services = await db.findNodes({
  semanticTags: ['service-layer']
});

// 패턴 분석: public API 찾기
const publicAPIs = await db.findNodes({
  semanticTags: ['public-api']
});

// 도메인 분석: auth 도메인 의존성
const authDeps = await db.findEdges({
  startNodeIds: services.map(s => s.id),
  edgeType: 'depends_on'
});

// ===== 4. INFERENCE =====
// 계층적 추론: 모든 import (library + file)
const allImports = await db.queryHierarchicalRelationships('imports', {
  includeChildren: true
});

// 전이적 추론: UserService의 전체 의존성 트리
const transitiveTree = await db.queryTransitiveRelationships(
  classNodeId,
  'depends_on',
  10
);

// 상속 가능 추론: 파일이 포함하는 모든 심볼
const fileContents = await db.queryInheritableRelationships(
  fileNodeId,
  'contains',
  5
);
```

## 6. 데이터 흐름도

```
┌─────────────────────────────────────────────────┐
│  1. EXTRACTION (추출)                            │
│                                                 │
│  Source Code                                    │
│       ↓                                         │
│  Tree-sitter Parser                             │
│       ↓                                         │
│  AST (Abstract Syntax Tree)                     │
│       ↓                                         │
│  Symbol Extractor                               │
│       ↓                                         │
│  SymbolInfo[] + Dependency[]                    │
│                                                 │
│  Type 결정: AST → "class", "function" 등        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  2. STORAGE (저장)                               │
│                                                 │
│  GraphDatabase.upsertNode()                     │
│       ↓                                         │
│  nodes table                                    │
│  - type: "class" (대상 식별, 필수)              │
│  - semantic_tags: [] (복합적 의미, 선택적)      │
│       ↓                                         │
│  GraphDatabase.upsertEdge()                     │
│       ↓                                         │
│  edges table                                    │
│  - type: "imports" (관계 유형, 필수)            │
│       ↓                                         │
│  Edge Type 관리 (계층 구조)                      │
│       ↓                                         │
│  [선택사항] Semantic Tag 생성                    │
│  - 필요시 추출 룰 적용                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  3. ANALYSIS (분석)                              │
│                                                 │
│  Direct Queries:                                │
│  - findNodes({ type, semanticTags })            │
│  - findEdges({ edgeType })                      │
│       ↓                                         │
│  Pattern Analysis:                              │
│  - Architecture layers (service, controller)    │
│  - Domain boundaries (auth, database)           │
│       ↓                                         │
│  Results: Filtered nodes + edges                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  4. INFERENCE (추론)                             │
│                                                 │
│  Hierarchical:                                  │
│  - Parent type → includes children              │
│  - "imports" → imports_library + imports_file   │
│       ↓                                         │
│  Transitive (SQL Recursive CTE):                │
│  - A→B, B→C ⇒ A→C                               │
│  - 전체 의존성 트리                              │
│       ↓                                         │
│  Inheritable:                                   │
│  - Parent-child propagation                     │
│  - File→Class→Method containment                │
│       ↓                                         │
│  Results: Inferred relationships                │
└─────────────────────────────────────────────────┘
```

## 7. 핵심 개념 요약

### Node Type (대상 식별, 필수)
- **정의**: 노드가 무엇을 수식하는지 식별
- **예시**: `file`, `class`, `method`, `function`, `interface`
- **결정 시점**: EXTRACTION 단계에서 AST로부터 자동 추출
- **저장 위치**: `nodes.type` 컬럼
- **관련 문서**: [type-system.md](type-system.md)

### Edge Type (관계 유형, 필수)
- **정의**: 노드 간의 관계 유형 식별
- **예시**: `imports`, `calls`, `extends`, `depends_on`
- **계층 구조**: 부모-자식 관계로 조직화 (EdgeTypeRegistry)
- **저장 위치**: `edges.type` 컬럼
- **관련 문서**: [edge-type-management.md](edge-type-management.md)

**완성 기준**: Edge 추출 + Edge Type 관리 = 의존성 분석 완성

### Semantic Tags (복합적 의미 표현, 선택적)
- **정의**: 노드가 담고 있는 복잡한 정보와 복합적인 의미를 표현
- **예시**: `service-layer`, `auth-domain`, `public-api`, `react-component`
- **결정 시점**: STORAGE 단계에서 필요시 추출 룰 적용
- **저장 위치**: `nodes.semantic_tags` 컬럼 (JSON array)
- **현재 상태**:
  - ✅ 마크다운 헤딩: hashtag 기반 자동 생성
  - 💡 일반 코드 심볼: 필요시 SemanticTagExtractor 구현
- **관련 문서**: [semantic-tags.md](semantic-tags.md)

### Inference (추론)
- **Hierarchical**: 타입 계층을 통한 포괄적 쿼리
- **Transitive**: 직접 관계에서 간접 관계 도출
- **Inheritable**: 포함 관계를 통한 전파
- **관련 문서**: [inference-system.md](inference-system.md)

## 8. 관련 문서

### 핵심 문서
- [type-system.md](type-system.md) - Type 정의 및 분류
- [semantic-tags.md](semantic-tags.md) - Semantic Tags 추출 룰
- [inference-system.md](inference-system.md) - 추론 시스템 API
- [namespace-scenario-guide.md](namespace-scenario-guide.md) - 🆕 Namespace-Scenario Integration 가이드

### 구현 문서
- [PARSER_SYSTEM.md](PARSER_SYSTEM.md) - Parser 아키텍처
- [edge-type-management.md](edge-type-management.md) - Edge Type 관리
- [DEPENDENCY_GRAPH_ANALYSIS.md](DEPENDENCY_GRAPH_ANALYSIS.md) - 그래프 분석

### 컨벤션
- [graph-maintenance-conventions.md](graph-maintenance-conventions.md) - 유지보수 규칙
- [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md) - Analyzer 패턴

---

*Last Updated: 2025-10-04*
