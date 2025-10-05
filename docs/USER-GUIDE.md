# Dependency Linker 사용자 가이드

## 🚀 빠른 시작

### 설치
```bash
npm install @context-action/dependency-linker
```

### 기본 사용법
```typescript
import { GraphDatabase, analyzeFile } from '@context-action/dependency-linker';

// 1. 데이터베이스 초기화
const db = new GraphDatabase('project.db');
await db.initialize();

// 2. 파일 분석
const result = await analyzeFile(sourceCode, 'typescript', 'src/App.tsx');

// 3. 결과 확인
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);
console.log(`실행 시간: ${result.performanceMetrics.totalExecutionTime}ms`);
```

## 📁 프로젝트 구조

```
your-project/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Modal.tsx
│   ├── services/
│   │   └── UserService.ts
│   └── utils/
│       └── helpers.ts
├── package.json
└── dependency-graph.json
```

## 🔍 의존성 분석

### 1. 단일 파일 분석
```typescript
import { analyzeFile } from '@context-action/dependency-linker';

const sourceCode = `
import React from 'react';
import { UserService } from './services/UserService';

class UserComponent extends React.Component {
  constructor() {
    this.userService = new UserService();
  }
  
  render() {
    return this.userService.getUsers();
  }
}

export default UserComponent;
`;

const result = await analyzeFile(sourceCode, 'typescript', 'src/UserComponent.tsx');

// 결과 분석
console.log('언어:', result.language);
console.log('노드 수:', result.parseMetadata.nodeCount);
console.log('관계 수:', result.parseMetadata.relationshipCount);
console.log('실행 시간:', result.performanceMetrics.totalExecutionTime + 'ms');
```

### 2. 전체 프로젝트 분석
```typescript
import { GraphDatabase, analyzeFile } from '@context-action/dependency-linker';
import fs from 'fs';
import path from 'path';

async function analyzeProject(projectPath) {
  const db = new GraphDatabase('project-analysis.db');
  await db.initialize();
  
  const files = await getAllSourceFiles(projectPath);
  const results = [];
  
  for (const file of files) {
    const sourceCode = fs.readFileSync(file, 'utf8');
    const language = getLanguageFromExtension(path.extname(file));
    
    const result = await analyzeFile(sourceCode, language, file);
    results.push(result);
    
    // 데이터베이스에 저장
    for (const node of result.parseMetadata.nodes) {
      await db.upsertNode(node);
    }
    
    for (const relationship of result.parseMetadata.relationships) {
      await db.upsertRelationship(relationship);
    }
  }
  
  return { db, results };
}

// 사용법
const { db, results } = await analyzeProject('./src');
console.log(`분석 완료: ${results.length}개 파일`);
```

## 🧠 추론 시스템 활용

### 1. 전이적 의존성 추론
```typescript
import { InferenceEngine } from '@context-action/dependency-linker';

const inferenceEngine = new InferenceEngine(db);

// A → B → C 관계에서 A → C 추론
const transitiveResults = await inferenceEngine.queryTransitive(
  'depends_on',
  { maxDepth: 3 }
);

console.log(`추론된 관계: ${transitiveResults.length}개`);
```

### 2. 계층적 관계 추론
```typescript
// 부모-자식 관계 추론
const hierarchicalResults = await inferenceEngine.queryHierarchical(
  'contains',
  { includeChildren: true, maxDepth: 2 }
);

console.log(`계층적 관계: ${hierarchicalResults.length}개`);
```

### 3. 상속 가능한 속성 추론
```typescript
// 속성 전파 추론
const inheritableResults = await inferenceEngine.queryInheritable(
  'has_property',
  { maxDepth: 3 }
);

console.log(`상속 가능한 관계: ${inheritableResults.length}개`);
```

## ⚡ 성능 최적화

### 1. LRU 캐시 활용
```typescript
import { OptimizedInferenceEngine } from '@context-action/dependency-linker';

const optimizedEngine = new OptimizedInferenceEngine(db, {
  enableLRUCache: true,
  cacheSize: 1000,
  enablePerformanceMonitoring: true
});

// 캐시된 결과로 빠른 쿼리
const cachedResults = await optimizedEngine.queryTransitive('depends_on');
```

### 2. 배치 처리
```typescript
// 대량 데이터 배치 처리
const batchResults = await optimizedEngine.queryBatch([
  { type: 'depends_on', maxDepth: 3 },
  { type: 'contains', maxDepth: 2 },
  { type: 'has_property', maxDepth: 1 }
]);

console.log(`배치 처리 결과: ${batchResults.length}개`);
```

### 3. 성능 모니터링
```typescript
// 성능 통계 확인
const stats = optimizedEngine.getPerformanceMetrics();
console.log(`평균 실행 시간: ${stats.averageExecutionTime}ms`);
console.log(`총 쿼리 수: ${stats.totalQueries}`);
console.log(`캐시 히트율: ${stats.cacheHitRate}`);
```

## 🔍 고급 쿼리

### 1. SQL 쿼리
```typescript
// 직접 SQL 실행
const results = await db.runQuery(`
  SELECT n.name, n.type, n.source_file
  FROM nodes n
  JOIN relationships r ON n.id = r.from_node_id
  WHERE r.type = 'depends_on'
  AND n.type = 'Class'
  ORDER BY n.name
`);

console.log(`SQL 쿼리 결과: ${results.length}개`);
```

### 2. 복합 조건 쿼리
```typescript
// 복잡한 조건으로 노드 조회
const nodes = await db.findNodes({
  nodeTypes: ['Class', 'Interface'],
  sourceFiles: ['src/components/**', 'src/services/**'],
  metadata: {
    'isExported': true,
    'isPublic': true
  }
});

console.log(`조건에 맞는 노드: ${nodes.length}개`);
```

### 3. 관계 패턴 쿼리
```typescript
// 특정 패턴의 관계 조회
const relationships = await db.findRelationships({
  relationshipTypes: ['depends_on', 'imports'],
  fromNodeIds: [nodeId],
  metadata: {
    'confidence': { $gte: 0.8 }
  }
});

console.log(`패턴 매칭 관계: ${relationships.length}개`);
```

## 📊 시각화 및 분석

### 1. 의존성 그래프 생성
```typescript
async function generateDependencyGraph(db) {
  const nodes = await db.findNodes({});
  const relationships = await db.findRelationships({});
  
  const graph = {
    nodes: nodes.map(node => ({
      id: node.id,
      label: node.name,
      type: node.type,
      sourceFile: node.sourceFile
    })),
    edges: relationships.map(rel => ({
      source: rel.fromNodeId,
      target: rel.toNodeId,
      type: rel.type,
      label: rel.label
    }))
  };
  
  return graph;
}

// 사용법
const graph = await generateDependencyGraph(db);
console.log(`그래프 노드: ${graph.nodes.length}개`);
console.log(`그래프 엣지: ${graph.edges.length}개`);
```

### 2. 순환 의존성 검출
```typescript
async function detectCircularDependencies(db) {
  const relationships = await db.findRelationships({
    relationshipTypes: ['depends_on']
  });
  
  const circularDeps = [];
  const visited = new Set();
  
  for (const rel of relationships) {
    if (visited.has(rel.fromNodeId)) continue;
    
    const cycle = findCycle(rel.fromNodeId, relationships, visited);
    if (cycle.length > 0) {
      circularDeps.push(cycle);
    }
  }
  
  return circularDeps;
}

// 사용법
const circularDeps = await detectCircularDependencies(db);
console.log(`순환 의존성: ${circularDeps.length}개`);
```

### 3. 복잡도 분석
```typescript
async function analyzeComplexity(db) {
  const nodes = await db.findNodes({});
  const relationships = await db.findRelationships({});
  
  const complexity = {
    totalNodes: nodes.length,
    totalRelationships: relationships.length,
    averageConnections: relationships.length / nodes.length,
    mostConnectedNode: findMostConnectedNode(nodes, relationships),
    leastConnectedNode: findLeastConnectedNode(nodes, relationships)
  };
  
  return complexity;
}

// 사용법
const complexity = await analyzeComplexity(db);
console.log(`평균 연결 수: ${complexity.averageConnections.toFixed(2)}`);
```

## 🛠️ 실전 활용 사례

### 1. 리팩토링 지원
```typescript
async function analyzeRefactoringImpact(db, targetNodeId) {
  // 영향받는 노드들 찾기
  const affectedNodes = await db.findNodes({
    relationships: {
      fromNodeIds: [targetNodeId],
      relationshipTypes: ['depends_on']
    }
  });
  
  // 간접 영향 노드들
  const indirectNodes = await inferenceEngine.queryTransitiveFromNode(
    targetNodeId,
    'depends_on',
    { maxDepth: 3 }
  );
  
  return {
    directImpact: affectedNodes.length,
    indirectImpact: indirectNodes.length,
    totalImpact: affectedNodes.length + indirectNodes.length
  };
}

// 사용법
const impact = await analyzeRefactoringImpact(db, nodeId);
console.log(`직접 영향: ${impact.directImpact}개 노드`);
console.log(`간접 영향: ${impact.indirectImpact}개 노드`);
```

### 2. 아키텍처 검증
```typescript
async function validateArchitecture(db) {
  const violations = [];
  
  // 레이어 간 의존성 검증
  const layerViolations = await checkLayerDependencies(db);
  violations.push(...layerViolations);
  
  // 순환 의존성 검증
  const circularDeps = await detectCircularDependencies(db);
  violations.push(...circularDeps);
  
  // 복잡도 검증
  const complexity = await analyzeComplexity(db);
  if (complexity.averageConnections > 10) {
    violations.push('높은 복잡도 감지');
  }
  
  return {
    isValid: violations.length === 0,
    violations: violations
  };
}

// 사용법
const validation = await validateArchitecture(db);
if (!validation.isValid) {
  console.log('아키텍처 위반 사항:');
  validation.violations.forEach(violation => {
    console.log(`- ${violation}`);
  });
}
```

### 3. 코드 품질 관리
```typescript
async function generateQualityReport(db) {
  const report = {
    metrics: await analyzeComplexity(db),
    circularDependencies: await detectCircularDependencies(db),
    unusedNodes: await findUnusedNodes(db),
    recommendations: []
  };
  
  // 권장사항 생성
  if (report.metrics.averageConnections > 5) {
    report.recommendations.push('복잡도가 높습니다. 모듈 분리를 고려하세요.');
  }
  
  if (report.circularDependencies.length > 0) {
    report.recommendations.push('순환 의존성이 있습니다. 구조를 재검토하세요.');
  }
  
  return report;
}

// 사용법
const qualityReport = await generateQualityReport(db);
console.log('코드 품질 보고서:');
console.log(`복잡도: ${qualityReport.metrics.averageConnections.toFixed(2)}`);
console.log(`순환 의존성: ${qualityReport.circularDependencies.length}개`);
console.log(`권장사항: ${qualityReport.recommendations.length}개`);
```

## 🚨 주의사항 및 팁

### 1. 성능 최적화
- **캐시 활용**: 자주 사용되는 쿼리는 LRU 캐시 사용
- **배치 처리**: 대량 데이터는 배치로 처리
- **인덱스 활용**: 자주 쿼리하는 필드에 인덱스 생성

### 2. 메모리 관리
- **정기 정리**: 불필요한 데이터는 정기적으로 정리
- **캐시 크기**: 프로젝트 크기에 맞는 캐시 크기 설정
- **스트리밍**: 대용량 파일은 스트리밍으로 처리

### 3. 에러 처리
- **파싱 에러**: 파싱 실패 시 적절한 에러 처리
- **데이터베이스 에러**: 트랜잭션 실패 시 롤백 처리
- **메모리 부족**: 대용량 처리 시 메모리 사용량 모니터링

### 4. 확장성 고려
- **모듈화**: 기능별로 모듈 분리
- **플러그인**: 새로운 언어 지원을 위한 플러그인 시스템
- **분산 처리**: 대규모 프로젝트를 위한 분산 처리 고려

## 📚 추가 자료

- [API Reference](./API-REFERENCE.md)
- [성능 최적화 가이드](./PERFORMANCE-OPTIMIZATION.md)
- [마이그레이션 가이드](./MIGRATION-GUIDE.md)
- [기능 개요](./FEATURE-OVERVIEW.md)