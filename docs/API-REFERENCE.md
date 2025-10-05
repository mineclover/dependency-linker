# API Reference

## 📚 개요

Dependency Linker의 핵심 API들을 정리한 문서입니다. 각 모듈별로 주요 메서드와 사용법을 설명합니다.

## 🗄️ GraphDatabase

### 기본 사용법
```typescript
import { GraphDatabase } from './database/GraphDatabase';

const db = new GraphDatabase(':memory:'); // 메모리 데이터베이스
await db.initialize();
```

### 주요 메서드

#### 노드 관리
```typescript
// 노드 생성/업데이트
const nodeId = await db.upsertNode({
  identifier: "project/src/Test.ts#Class:TestClass",
  type: "Class",
  name: "TestClass",
  sourceFile: "src/Test.ts",
 language: "typescript"
});

// 노드 조회
const nodes = await db.findNodes({
  nodeTypes: ["Class", "Method"],
  sourceFiles: ["src/Test.ts"]
});

// 노드 삭제
await db.deleteNode(nodeId);
```

#### 관계 관리
```typescript
// 관계 생성/업데이트
const relationshipId = await db.upsertRelationship({
  fromNodeId: nodeA,
  toNodeId: nodeB,
  type: "depends_on",
  label: "A depends on B"
});

// 관계 조회
const relationships = await db.findRelationships({
  relationshipTypes: ["depends_on"],
  fromNodeIds: [nodeA]
});

// 관계 삭제
await db.deleteRelationship(relationshipId);
```

#### 쿼리 실행
```typescript
// SQL 쿼리 실행
const results = await db.runQuery(
  "SELECT * FROM nodes WHERE type = ?",
  ["Class"]
);

// 트랜잭션 실행
await db.runTransaction(async (tx) => {
  await tx.upsertNode(nodeData);
  await tx.upsertRelationship(relationshipData);
});
```

## 🔗 EdgeTypeRegistry

### 초기화
```typescript
import { EdgeTypeRegistry } from './database/inference/EdgeTypeRegistry';

EdgeTypeRegistry.initialize();
```

### 주요 메서드

#### 타입 조회
```typescript
// 모든 타입 조회
const allTypes = EdgeTypeRegistry.getAll(); // 24개 기본 타입

// 특정 타입 조회
const dependsOnType = EdgeTypeRegistry.get("depends_on");

// 전이적 타입 조회
const transitiveTypes = EdgeTypeRegistry.getTransitiveTypes(); // 3개

// 상속 가능한 타입 조회
const inheritableTypes = EdgeTypeRegistry.getInheritableTypes(); // 4개
```

#### 타입 관리
```typescript
// 새 타입 등록
EdgeTypeRegistry.register("custom_type", {
  isTransitive: true,
  isInheritable: false,
  properties: { weight: 1.0 }
});

// 타입 업데이트
EdgeTypeRegistry.update("depends_on", {
  isTransitive: true,
  properties: { confidence: 0.9 }
});

// 타입 삭제
EdgeTypeRegistry.remove("unused_type");
```

## 🧠 InferenceEngine

### 기본 사용법
```typescript
import { InferenceEngine } from './database/inference/InferenceEngine';

const inferenceEngine = new InferenceEngine(db);
```

### 주요 메서드

#### 전이적 추론
```typescript
// 전이적 관계 추론
const transitiveResults = await inferenceEngine.queryTransitive(
  "depends_on",
  { maxDepth: 3 }
);

// 특정 노드의 전이적 관계
const nodeTransitive = await inferenceEngine.queryTransitiveFromNode(
  nodeId,
  "depends_on",
  { maxDepth: 5 }
);
```

#### 계층적 추론
```typescript
// 계층적 관계 추론
const hierarchicalResults = await inferenceEngine.queryHierarchical(
  "contains",
  { includeChildren: true, maxDepth: 3 }
);

// 상속 가능한 관계 추론
const inheritableResults = await inferenceEngine.queryInheritable(
  "has_property",
  { maxDepth: 2 }
);
```

## ⚡ OptimizedInferenceEngine

### 기본 사용법
```typescript
import { OptimizedInferenceEngine } from './database/inference/OptimizedInferenceEngine';

const optimizedEngine = new OptimizedInferenceEngine(db, {
  enableLRUCache: true,
  cacheSize: 1000,
  enablePerformanceMonitoring: true
});
```

### 주요 메서드

#### 최적화된 추론
```typescript
// LRU 캐시를 사용한 전이적 추론
const cachedResults = await optimizedEngine.queryTransitive(
  "depends_on",
  { maxDepth: 3 }
);

// 배치 추론
const batchResults = await optimizedEngine.queryBatch([
  { type: "depends_on", maxDepth: 3 },
  { type: "contains", maxDepth: 2 }
]);
```

#### 성능 모니터링
```typescript
// 캐시 통계
const cacheStats = optimizedEngine.getCacheStatistics();
console.log(`캐시 크기: ${cacheStats.size}`);
console.log(`히트율: ${cacheStats.hitRate}`);

// 성능 메트릭
const metrics = optimizedEngine.getPerformanceMetrics();
console.log(`평균 실행 시간: ${metrics.averageExecutionTime}ms`);
console.log(`총 쿼리 수: ${metrics.totalQueries}`);
```

## 📁 File Analysis

### 기본 사용법
```typescript
import { analyzeFile } from './api/analysis';

const result = await analyzeFile(sourceCode, "typescript", "src/Component.tsx");
```

### 분석 결과
```typescript
interface AnalysisResult {
  language: string;
  parseMetadata: {
    nodeCount: number;
    relationshipCount: number;
    errors: string[];
  };
  performanceMetrics: {
    totalExecutionTime: number;
    parsingTime: number;
    queryTime: number;
  };
  queryResults: {
    [queryName: string]: any[];
  };
}
```

### 지원 언어
- **TypeScript/TSX**: 완전 지원
- **JavaScript/JSX**: 완전 지원
- **Java**: 기본 지원
- **Python**: 기본 지원

## 🔍 Query System

### SQL 쿼리
```typescript
// 직접 SQL 실행
const results = await db.runQuery(`
  SELECT n.name, n.type, n.source_file
  FROM nodes n
  JOIN relationships r ON n.id = r.from_node_id
  WHERE r.type = 'depends_on'
  AND n.type = 'Class'
`);
```

### GraphQL 쿼리
```typescript
// GraphQL 스타일 쿼리 (향후 지원 예정)
const query = `
  query {
    nodes(type: "Class") {
      name
      sourceFile
      relationships(type: "depends_on") {
        toNode {
          name
          type
        }
      }
    }
  }
`;
```

## 🎯 사용 예제

### 1. 기본 워크플로우
```typescript
// 1. 데이터베이스 초기화
const db = new GraphDatabase("project.db");
await db.initialize();
EdgeTypeRegistry.initialize();

// 2. 파일 분석
const result = await analyzeFile(sourceCode, "typescript", "src/App.tsx");

// 3. 노드 및 관계 저장
for (const node of result.parseMetadata.nodes) {
  await db.upsertNode(node);
}

// 4. 추론 실행
const inferenceEngine = new InferenceEngine(db);
const inferences = await inferenceEngine.queryTransitive("depends_on");

// 5. 결과 활용
console.log(`추론된 관계: ${inferences.length}개`);
```

### 2. 성능 최적화
```typescript
// LRU 캐시를 사용한 최적화된 추론
const optimizedEngine = new OptimizedInferenceEngine(db, {
  enableLRUCache: true,
  cacheSize: 1000,
  enablePerformanceMonitoring: true
});

// 배치 처리
const batchResults = await optimizedEngine.queryBatch([
  { type: "depends_on", maxDepth: 3 },
  { type: "contains", maxDepth: 2 }
]);

// 성능 모니터링
const stats = optimizedEngine.getPerformanceMetrics();
console.log(`평균 실행 시간: ${stats.averageExecutionTime}ms`);
```

### 3. 에러 처리
```typescript
try {
  const result = await analyzeFile(sourceCode, "typescript", "src/App.tsx");
  
  if (result.parseMetadata.errors.length > 0) {
    console.warn("파싱 에러:", result.parseMetadata.errors);
  }
  
  // 정상 처리
  console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);
  
} catch (error) {
  console.error("분석 실패:", error.message);
}
```

## 📊 성능 가이드

### 권장 설정
```typescript
// 개발 환경
const devConfig = {
  enableLRUCache: true,
  cacheSize: 100,
  enablePerformanceMonitoring: false
};

// 프로덕션 환경
const prodConfig = {
  enableLRUCache: true,
  cacheSize: 10000,
  enablePerformanceMonitoring: true,
  enableBatchProcessing: true
};
```

### 성능 팁
1. **캐시 활용**: 자주 사용되는 쿼리는 LRU 캐시 활용
2. **배치 처리**: 대량 데이터는 배치로 처리
3. **인덱스 활용**: 자주 쿼리하는 필드에 인덱스 생성
4. **메모리 관리**: 불필요한 데이터는 정기적으로 정리

## 🚨 주의사항

1. **메서드명**: 일부 API에서 메서드명이 변경될 수 있음
2. **성능**: 대용량 데이터 처리 시 메모리 사용량 주의
3. **트랜잭션**: 데이터 일관성을 위해 트랜잭션 사용 권장
4. **에러 처리**: 모든 비동기 작업에 적절한 에러 처리 필요
