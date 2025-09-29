# Graph Database System

SQLite 기반의 유연한 그래프 데이터베이스 시스템으로, 코드 의존성 분석 결과를 저장하고 쿼리할 수 있습니다.

## 핵심 특징

- **유연한 스키마**: nodes와 edges 테이블로 모든 관계를 표현
- **계층적 추론**: edge_types를 통한 관계 유형 정의 및 추론 가능
- **성능 최적화**: 인덱스와 캐시 테이블로 빠른 쿼리 지원
- **GraphQL 스타일**: 유연한 쿼리 인터페이스 제공

## 데이터베이스 구조

### 핵심 테이블

#### nodes
모든 코드 엔티티를 저장 (파일, 클래스, 메서드, 변수 등)

```sql
CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  identifier TEXT UNIQUE,     -- 고유 식별자 (예: 파일경로, 클래스.메서드)
  type TEXT,                  -- 노드 타입 (file, class, method, function 등)
  name TEXT,                  -- 표시 이름
  source_file TEXT,           -- 소스 파일 경로
  language TEXT,              -- 프로그래밍 언어
  metadata TEXT,              -- JSON 메타데이터
  start_line INTEGER,         -- 시작 줄 번호
  start_column INTEGER,       -- 시작 컬럼
  end_line INTEGER,          -- 끝 줄 번호
  end_column INTEGER         -- 끝 컬럼
);
```

#### edges
모든 관계를 저장 (import, contains, calls 등)

```sql
CREATE TABLE edges (
  id INTEGER PRIMARY KEY,
  start_node_id INTEGER,      -- 시작 노드
  end_node_id INTEGER,        -- 끝 노드
  type TEXT,                  -- 관계 타입
  label TEXT,                 -- 관계 레이블
  metadata TEXT,              -- JSON 메타데이터
  weight REAL DEFAULT 1.0     -- 관계 가중치
);
```

#### edge_types
관계 유형 정의 및 추론 규칙

```sql
CREATE TABLE edge_types (
  type TEXT PRIMARY KEY,
  description TEXT,
  is_directed BOOLEAN,        -- 방향성 여부
  parent_type TEXT,           -- 상위 관계 타입
  is_transitive BOOLEAN,      -- 전이적 속성 (A→B, B→C ⇒ A→C)
  is_inheritable BOOLEAN      -- 상속 가능 (parent(A,B) ∧ rel(B,C) ⇒ rel(A,C))
);
```

### 추론 시스템

#### 전이적 관계 (is_transitive = true)
- 예: `depends_on` 관계가 전이적이면
- A depends_on B, B depends_on C ⇒ A depends_on C (추론)

#### 상속 가능 관계 (is_inheritable = true)
- 예: `contains` 관계가 상속 가능하고 `declares`의 부모라면
- A contains B, B declares C ⇒ A declares C (추론)

#### 계층적 추론 예시
```
파일(A) contains 클래스(B)
클래스(B) declares 메서드(C)
⇒ 파일(A) declares 메서드(C) (추론)
```

## 사용법

### 1. 기본 설정

```typescript
import { createGraphAnalysisSystem } from '@context-action/dependency-linker/database';

const system = createGraphAnalysisSystem({
  projectRoot: '/path/to/project',
  projectName: 'My Project',
  dbPath: './graph.db' // 선택사항
});
```

### 2. 분석 결과 저장

```typescript
import { analyzeProjectToGraph } from '@context-action/dependency-linker/integration';

const result = await analyzeProjectToGraph('/path/to/project', {
  projectName: 'My Project',
  enableInference: true,
  includePatterns: ['src/**/*.{ts,tsx}'],
  excludePatterns: ['**/*.test.*']
});

console.log(`노드: ${result.stats.totalNodes}, 엣지: ${result.stats.totalEdges}`);
```

### 3. 그래프 쿼리

```typescript
// 특정 타입 노드 조회
const files = await system.query({
  nodeTypes: ['file'],
  languages: ['typescript']
});

// 관계 조회 (추론 포함)
const dependencies = await system.query({
  edgeTypes: ['depends_on'],
  includeInferred: true,
  maxDepth: 3
});

// 특정 파일의 의존성
const fileDeps = await system.getFileDependencies('src/api/auth.ts');
```

### 4. 순환 의존성 검사

```typescript
const cycles = await system.getCircularDependencies();

if (cycles.length > 0) {
  console.log(`순환 의존성 발견: ${cycles.length}개`);
  cycles.forEach(cycle => {
    console.log(cycle.map(n => n.name).join(' → '));
  });
}
```

### 5. 계층 분석

```typescript
// 파일 → 클래스 → 메서드 계층 조회
const hierarchy = await system.query({
  edgeTypes: ['contains', 'declares'],
  includeInferred: true
});

// 특정 노드의 모든 관계 조회
const nodeRelations = await system.queryEngine.getNodeRelationships(nodeId, true);
console.log(`나가는 관계: ${nodeRelations.outgoing.length}`);
console.log(`들어오는 관계: ${nodeRelations.incoming.length}`);
```

### 6. 성능 최적화

```typescript
// 추론 관계 재계산
const inferenceCount = await system.computeInferences();
console.log(`추론된 관계: ${inferenceCount}개`);

// 프로젝트 통계
const stats = await system.getStats();
console.log('언어별 파일 수:', stats.filesByLanguage);
console.log('노드 타입별 수:', stats.nodesByType);
```

## 예제 시나리오

### 시나리오 1: React 컴포넌트 의존성 분석

```typescript
// 컴포넌트 파일들 조회
const components = await system.query({
  nodeTypes: ['file'],
  sourceFiles: ['src/components/**']
});

// 컴포넌트 간 import 관계
const componentDeps = await system.query({
  edgeTypes: ['imports'],
  sourceFiles: ['src/components/**']
});
```

### 시나리오 2: API 레이어 분석

```typescript
// API 관련 파일들과 그 관계
const apiAnalysis = await system.query({
  sourceFiles: ['src/api/**', 'src/services/**'],
  edgeTypes: ['imports', 'calls', 'depends_on'],
  includeInferred: true
});

// API 엔드포인트 함수들
const apiFunctions = await system.query({
  nodeTypes: ['function', 'method'],
  sourceFiles: ['src/api/**']
});
```

### 시나리오 3: 리팩토링 영향 분석

```typescript
// 특정 파일에 의존하는 모든 파일 찾기
const dependents = await system.getFileDependencies('src/utils/helpers.ts');

// 변경이 미치는 영향 범위 계산
const impactAnalysis = await system.query({
  startNodeId: targetFileId,
  edgeTypes: ['depends_on'],
  includeInferred: true,
  maxDepth: 5
});
```

## 고급 기능

### 1. 커스텀 관계 타입 추가

```sql
INSERT INTO edge_types (type, description, is_directed, parent_type, is_transitive, is_inheritable)
VALUES ('uses_api', 'API 사용 관계', true, 'depends_on', false, true);
```

### 2. 복잡한 쿼리 (SQL 직접 사용)

```typescript
const db = system.getDatabase();

// 가장 많이 import되는 파일 TOP 10
const sql = `
  SELECT n.name, n.source_file, COUNT(*) as import_count
  FROM edges e
  JOIN nodes n ON e.end_node_id = n.id
  WHERE e.type = 'imports' AND n.type = 'file'
  GROUP BY n.id
  ORDER BY import_count DESC
  LIMIT 10
`;

// 수동 쿼리 실행 (GraphDatabase의 내부 메서드 사용)
```

### 3. 메모리 최적화

```typescript
// 대용량 프로젝트의 경우 배치 처리
const batchSize = 100;
const files = await collectAllFiles();

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  await analyzeBatch(batch);

  // 주기적으로 추론 캐시 정리
  if (i % 1000 === 0) {
    await system.computeInferences();
  }
}
```

## 성능 고려사항

1. **인덱스 활용**: 자주 쿼리하는 필드에 대한 인덱스가 자동 생성됨
2. **배치 처리**: 대량 데이터 처리 시 배치 단위로 진행
3. **추론 캐시**: 복잡한 추론 결과를 캐시하여 반복 쿼리 성능 향상
4. **메모리 관리**: 대용량 프로젝트의 경우 연결 풀링 고려

## 문제 해결

### 일반적인 문제

1. **데이터베이스 잠금**: 동시 접근 시 SQLite 잠금 발생 가능
   - 해결: 순차 처리 또는 연결 풀 사용

2. **메모리 부족**: 대용량 프로젝트 분석 시
   - 해결: 배치 처리 및 스트리밍 방식 사용

3. **추론 성능**: 복잡한 추론 규칙으로 인한 성능 저하
   - 해결: 추론 깊이 제한 및 선택적 추론 사용

### 디버깅

```typescript
// 데이터베이스 상태 확인
const stats = await system.getStats();
console.log('DB 상태:', stats);

// 쿼리 성능 측정
const start = Date.now();
const result = await system.query(filter);
console.log(`쿼리 시간: ${Date.now() - start}ms`);
```