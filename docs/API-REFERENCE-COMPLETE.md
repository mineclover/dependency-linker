# Dependency Linker - 완전한 API 레퍼런스

**Purpose**: Dependency Linker의 모든 API 인터페이스, 메서드, 타입을 완전히 문서화한 레퍼런스

---

## 📋 목차

1. [🔧 분석 API](#-분석-api)
2. [🗄️ 데이터베이스 API](#️-데이터베이스-api)
3. [🧠 추론 엔진 API](#-추론-엔진-api)
4. [⚡ 성능 최적화 API](#-성능-최적화-api)
5. [📁 Namespace API](#-namespace-api)
6. [🔍 쿼리 API](#-쿼리-api)
7. [🛠️ 유틸리티 API](#️-유틸리티-api)
8. [📊 타입 정의](#-타입-정의)

---

## 🔧 분석 API

### `analyzeFile`

파일을 분석하여 AST 노드와 관계를 추출합니다.

```typescript
function analyzeFile(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string,
  options?: AnalysisOptions
): Promise<AnalysisResult>
```

**매개변수**:
- `sourceCode: string` - 분석할 소스 코드
- `language: SupportedLanguage` - 프로그래밍 언어
- `filePath?: string` - 파일 경로 (기본값: "unknown")
- `options?: AnalysisOptions` - 분석 옵션

**반환값**: `Promise<AnalysisResult>`

**예시**:
```typescript
const result = await analyzeFile(
  `import React from 'react';
   export const App = () => <div>Hello</div>;`,
  'typescript',
  'src/App.tsx'
);

console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);
console.log(`실행 시간: ${result.performanceMetrics.totalExecutionTime}ms`);
```

### `analyzeImports`

파일의 임포트 관계만 분석합니다.

```typescript
function analyzeImports(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string
): Promise<{
  sources: QueryResult<QueryKey>[];
  named: QueryResult<QueryKey>[];
  defaults: QueryResult<QueryKey>[];
  types?: QueryResult<QueryKey>[];
}>
```

**반환값**:
- `sources`: 임포트 소스 경로들
- `named`: 네임드 임포트들
- `defaults`: 기본 임포트들
- `types`: 타입 임포트들 (TypeScript만)

**예시**:
```typescript
const imports = await analyzeImports(sourceCode, 'typescript', 'src/App.tsx');
console.log('소스:', imports.sources);
console.log('네임드:', imports.named);
console.log('기본:', imports.defaults);
console.log('타입:', imports.types);
```

### `analyzeDependencies`

파일의 의존성을 분석합니다.

```typescript
function analyzeDependencies(
  sourceCode: string,
  language: SupportedLanguage,
  filePath?: string
): Promise<{
  internal: string[];
  external: string[];
  builtin: string[];
}>
```

**반환값**:
- `internal`: 내부 의존성 (상대 경로)
- `external`: 외부 의존성 (npm 패키지 등)
- `builtin`: 내장 모듈

**예시**:
```typescript
const deps = await analyzeDependencies(sourceCode, 'typescript', 'src/App.tsx');
console.log('내부:', deps.internal);
console.log('외부:', deps.external);
console.log('내장:', deps.builtin);
```

### `initializeAnalysisSystem`

분석 시스템을 초기화합니다.

```typescript
function initializeAnalysisSystem(): void
```

**예시**:
```typescript
import { initializeAnalysisSystem } from '@context-action/dependency-linker';

initializeAnalysisSystem();
console.log('✅ 분석 시스템 초기화 완료');
```

---

## 🗄️ 데이터베이스 API

### `GraphDatabase`

SQLite 기반 그래프 데이터베이스 클래스입니다.

```typescript
class GraphDatabase {
  constructor(databasePath: string, options?: DatabaseOptions)
  
  // 초기화
  async initialize(): Promise<void>
  async close(): Promise<void>
  
  // 노드 관리
  async upsertNode(node: NodeInput): Promise<number>
  async findNodes(options?: NodeQueryOptions): Promise<Node[]>
  async deleteNode(nodeId: number): Promise<void>
  
  // 관계 관리
  async upsertRelationship(relationship: RelationshipInput): Promise<number>
  async findRelationships(options?: RelationshipQueryOptions): Promise<Relationship[]>
  async deleteRelationship(relationshipId: number): Promise<void>
  
  // 쿼리
  async query(sql: string, params?: any[]): Promise<any[]>
  async executeTransaction(operations: TransactionOperation[]): Promise<void>
}
```

#### 생성자

```typescript
constructor(databasePath: string, options?: DatabaseOptions)
```

**매개변수**:
- `databasePath: string` - 데이터베이스 파일 경로
- `options?: DatabaseOptions` - 데이터베이스 옵션

**예시**:
```typescript
const db = new GraphDatabase('project.db', {
  enableWAL: true,
  cacheSize: 2000,
  timeout: 30000
});
```

#### `initialize`

데이터베이스를 초기화합니다.

```typescript
async initialize(): Promise<void>
```

**예시**:
```typescript
await db.initialize();
console.log('데이터베이스 초기화 완료');
```

#### `upsertNode`

노드를 생성하거나 업데이트합니다.

```typescript
async upsertNode(node: NodeInput): Promise<number>
```

**매개변수**:
```typescript
interface NodeInput {
  identifier: string;           // RDF 스타일 식별자
  type: string;                // 노드 타입
  name: string;                 // 노드 이름
  sourceFile?: string;          // 소스 파일
  language?: string;            // 프로그래밍 언어
  semanticTags?: string[];      // 시맨틱 태그
  metadata?: Record<string, any>; // 메타데이터
}
```

**반환값**: `Promise<number>` - 노드 ID

**예시**:
```typescript
const nodeId = await db.upsertNode({
  identifier: 'my-project/src/User.ts#Class:User',
  type: 'Class',
  name: 'User',
  sourceFile: 'src/User.ts',
  language: 'typescript',
  semanticTags: ['model', 'entity'],
  metadata: { isAbstract: false }
});
```

#### `findNodes`

노드를 조회합니다.

```typescript
async findNodes(options?: NodeQueryOptions): Promise<Node[]>
```

**매개변수**:
```typescript
interface NodeQueryOptions {
  nodeTypes?: string[];         // 노드 타입 필터
  sourceFiles?: string[];       // 소스 파일 필터
  languages?: string[];          // 언어 필터
  semanticTags?: string[];      // 시맨틱 태그 필터
  limit?: number;               // 결과 제한
  offset?: number;              // 오프셋
}
```

**예시**:
```typescript
// 모든 클래스 노드 조회
const classes = await db.findNodes({ nodeTypes: ['Class'] });

// 특정 파일의 노드들 조회
const fileNodes = await db.findNodes({ 
  sourceFiles: ['src/User.ts'] 
});

// 시맨틱 태그로 필터링
const models = await db.findNodes({ 
  semanticTags: ['model'] 
});
```

#### `upsertRelationship`

관계를 생성하거나 업데이트합니다.

```typescript
async upsertRelationship(relationship: RelationshipInput): Promise<number>
```

**매개변수**:
```typescript
interface RelationshipInput {
  fromNodeId: number;           // 시작 노드 ID
  toNodeId: number;             // 끝 노드 ID
  type: string;                 // 관계 타입
  properties?: Record<string, any>; // 관계 속성
  weight?: number;              // 관계 가중치
}
```

**예시**:
```typescript
const relId = await db.upsertRelationship({
  fromNodeId: 1,
  toNodeId: 2,
  type: 'imports',
  properties: { importPath: './types' },
  weight: 1.0
});
```

#### `findRelationships`

관계를 조회합니다.

```typescript
async findRelationships(options?: RelationshipQueryOptions): Promise<Relationship[]>
```

**매개변수**:
```typescript
interface RelationshipQueryOptions {
  fromNodeId?: number;          // 시작 노드 ID
  toNodeId?: number;            // 끝 노드 ID
  types?: string[];             // 관계 타입 필터
  limit?: number;               // 결과 제한
  offset?: number;              // 오프셋
}
```

**예시**:
```typescript
// 특정 노드의 모든 관계 조회
const relationships = await db.findRelationships({ fromNodeId: 1 });

// 특정 타입의 관계 조회
const imports = await db.findRelationships({ types: ['imports'] });
```

---

## 🧠 추론 엔진 API

### `InferenceEngine`

기본 추론 엔진 클래스입니다.

```typescript
class InferenceEngine {
  constructor(database: GraphDatabase, config?: InferenceEngineConfig)
  
  // 계층적 추론
  async queryHierarchical(
    edgeType: string,
    options?: HierarchicalQueryOptions
  ): Promise<InferredRelationship[]>
  
  // 전이적 추론
  async queryTransitive(
    fromNodeId: number,
    edgeType: string,
    options?: TransitiveQueryOptions
  ): Promise<InferredRelationship[]>
  
  // 상속 가능한 추론
  async queryInheritable(
    fromNodeId: number,
    parentEdgeType: string,
    childEdgeType: string,
    options?: InheritableQueryOptions
  ): Promise<InferredRelationship[]>
  
  // 모든 추론 실행
  async inferAll(nodeId: number): Promise<InferenceResult>
  
  // 추론 검증
  async validateInference(
    nodeId: number,
    edgeType: string
  ): Promise<InferenceValidationResult>
  
  // 통계
  async getStatistics(): Promise<InferenceStatistics>
}
```

#### 생성자

```typescript
constructor(database: GraphDatabase, config?: InferenceEngineConfig)
```

**매개변수**:
```typescript
interface InferenceEngineConfig {
  enableCache?: boolean;                    // 캐시 활성화
  cacheSyncStrategy?: 'eager' | 'lazy' | 'manual'; // 캐시 동기화 전략
  defaultMaxPathLength?: number;             // 기본 최대 경로 길이
  defaultMaxHierarchyDepth?: number;        // 기본 최대 계층 깊이
  enableCycleDetection?: boolean;           // 순환 탐지 활성화
}
```

**예시**:
```typescript
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy',
  defaultMaxPathLength: 10,
  defaultMaxHierarchyDepth: Infinity,
  enableCycleDetection: true
});
```

#### `queryHierarchical`

계층적 추론을 수행합니다.

```typescript
async queryHierarchical(
  edgeType: string,
  options?: HierarchicalQueryOptions
): Promise<InferredRelationship[]>
```

**매개변수**:
```typescript
interface HierarchicalQueryOptions {
  includeChildren?: boolean;    // 자식 타입 포함 여부
  maxDepth?: number;            // 최대 깊이
}
```

**예시**:
```typescript
// 모든 imports 관계 조회 (imports_file, imports_package 포함)
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true,
  maxDepth: 3
});
```

#### `queryTransitive`

전이적 추론을 수행합니다.

```typescript
async queryTransitive(
  fromNodeId: number,
  edgeType: string,
  options?: TransitiveQueryOptions
): Promise<InferredRelationship[]>
```

**매개변수**:
```typescript
interface TransitiveQueryOptions {
  maxPathLength?: number;       // 최대 경로 길이
  detectCycles?: boolean;       // 순환 탐지
  includeIntermediate?: boolean; // 중간 노드 포함
}
```

**예시**:
```typescript
// A→B→C 체인에서 A→C 관계 추론
const transitive = await engine.queryTransitive(1, 'depends_on', {
  maxPathLength: 10,
  detectCycles: true,
  includeIntermediate: false
});
```

#### `queryInheritable`

상속 가능한 추론을 수행합니다.

```typescript
async queryInheritable(
  fromNodeId: number,
  parentEdgeType: string,
  childEdgeType: string,
  options?: InheritableQueryOptions
): Promise<InferredRelationship[]>
```

**매개변수**:
```typescript
interface InheritableQueryOptions {
  maxDepth?: number;            // 최대 깊이
  includeIntermediate?: boolean; // 중간 노드 포함
}
```

**예시**:
```typescript
// File contains Class, Class declares Method → File declares Method
const inheritable = await engine.queryInheritable(1, 'contains', 'declares', {
  maxDepth: 5,
  includeIntermediate: false
});
```

### `OptimizedInferenceEngine`

성능 최적화된 추론 엔진입니다.

```typescript
class OptimizedInferenceEngine extends InferenceEngine {
  constructor(database: GraphDatabase, config?: OptimizedInferenceEngineConfig)
  
  // LRU 캐시 통계
  getLRUCacheStatistics(): LRUCacheStatistics
  
  // 성능 메트릭
  getPerformanceMetrics(): Map<string, any>
  
  // 캐시 관리
  clearCache(): void
  
  // 증분 추론
  async incrementalInference(
    changedNodes: number[],
    changedRelationships: number[]
  ): Promise<InferenceResult>
}
```

#### 생성자

```typescript
constructor(database: GraphDatabase, config?: OptimizedInferenceEngineConfig)
```

**매개변수**:
```typescript
interface OptimizedInferenceEngineConfig extends InferenceEngineConfig {
  enableLRUCache?: boolean;      // LRU 캐시 활성화
  cacheSize?: number;           // 캐시 크기
  enablePerformanceMonitoring?: boolean; // 성능 모니터링
  enableIncrementalInference?: boolean;  // 증분 추론
}
```

**예시**:
```typescript
const optimizedEngine = new OptimizedInferenceEngine(db, {
  enableLRUCache: true,
  cacheSize: 2000,
  enablePerformanceMonitoring: true,
  enableIncrementalInference: true
});
```

#### `getLRUCacheStatistics`

LRU 캐시 통계를 조회합니다.

```typescript
getLRUCacheStatistics(): LRUCacheStatistics
```

**반환값**:
```typescript
interface LRUCacheStatistics {
  size: number;                 // 현재 캐시 크기
  maxSize: number;              // 최대 캐시 크기
  hitRate: number;              // 히트율 (0-1)
  missRate: number;             // 미스율 (0-1)
  evictions: number;            // 제거된 항목 수
}
```

**예시**:
```typescript
const stats = optimizedEngine.getLRUCacheStatistics();
console.log(`캐시 크기: ${stats.size}/${stats.maxSize}`);
console.log(`히트율: ${(stats.hitRate * 100).toFixed(2)}%`);
```

#### `getPerformanceMetrics`

성능 메트릭을 조회합니다.

```typescript
getPerformanceMetrics(): Map<string, any>
```

**예시**:
```typescript
const metrics = optimizedEngine.getPerformanceMetrics();
const queryTime = metrics.get('queryTime');
console.log(`평균 쿼리 시간: ${queryTime?.average}ms`);
```

---

## ⚡ 성능 최적화 API

### `BatchProcessor`

배치 처리를 위한 클래스입니다.

```typescript
class BatchProcessor<T, R> {
  constructor(options?: BatchProcessorOptions)
  
  // 배치 처리 실행
  async process(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
  ): Promise<BatchProcessorResult<R>>
}
```

#### 생성자

```typescript
constructor(options?: BatchProcessorOptions)
```

**매개변수**:
```typescript
interface BatchProcessorOptions {
  batchSize?: number;            // 배치 크기
  concurrency?: number;         // 동시 처리 수
  timeout?: number;             // 타임아웃 (ms)
  retryCount?: number;         // 재시도 횟수
  retryDelay?: number;         // 재시도 지연 (ms)
  onProgress?: (completed: number, total: number) => void; // 진행 콜백
  onError?: (error: Error, item: any, index: number) => void; // 에러 콜백
}
```

**예시**:
```typescript
const processor = new BatchProcessor({
  batchSize: 100,
  concurrency: 4,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000
});
```

#### `process`

배치 처리를 실행합니다.

```typescript
async process(
  items: T[],
  processor: (item: T, index: number) => Promise<R>
): Promise<BatchProcessorResult<R>>
```

**반환값**:
```typescript
interface BatchProcessorResult<T> {
  results: T[];                 // 성공한 결과들
  failures: Array<{             // 실패한 항목들
    item: any;
    index: number;
    error: Error;
  }>;
  statistics: {                 // 처리 통계
    total: number;
    successful: number;
    failed: number;
    executionTime: number;
    throughput: number;          // items per second
  };
}
```

**예시**:
```typescript
const result = await processor.process(files, async (file) => {
  return await analyzeFile(file.content, file.language, file.path);
});

console.log(`처리 완료: ${result.statistics.successful}/${result.statistics.total}`);
console.log(`처리 속도: ${result.statistics.throughput.toFixed(2)} files/sec`);
```

### `ParallelBatchProcessor`

병렬 배치 처리를 위한 클래스입니다.

```typescript
class ParallelBatchProcessor<T, R> extends BatchProcessor<T, R> {
  constructor(options?: BatchProcessorOptions)
  
  // 병렬 배치 처리
  async processParallel(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
  ): Promise<BatchProcessorResult<R>>
}
```

**예시**:
```typescript
const parallelProcessor = new ParallelBatchProcessor({
  batchSize: 50,
  concurrency: 8  // CPU 코어 수에 맞춰 조정
});

const result = await parallelProcessor.processParallel(items, processor);
```

### `StreamingBatchProcessor`

스트리밍 배치 처리를 위한 클래스입니다.

```typescript
class StreamingBatchProcessor<T, R> extends BatchProcessor<T, R> {
  // 스트리밍 배치 처리
  async processStreaming(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    onBatchComplete?: (batch: R[], batchIndex: number) => void
  ): Promise<BatchProcessorResult<R>>
}
```

**예시**:
```typescript
const streamingProcessor = new StreamingBatchProcessor();

const result = await streamingProcessor.processStreaming(
  items,
  processor,
  (batch, batchIndex) => {
    console.log(`배치 ${batchIndex} 완료: ${batch.length}개 항목`);
  }
);
```

---

## 📁 Namespace API

### `ConfigManager`

Namespace 설정을 관리하는 클래스입니다.

```typescript
class ConfigManager {
  // 설정 로드
  async loadConfig(configPath: string): Promise<ConfigFile>
  
  // 네임스페이스 설정 로드
  async loadNamespacedConfig(
    configPath: string,
    namespace: string
  ): Promise<NamespaceConfig>
  
  // 네임스페이스 설정 저장
  async setNamespaceConfig(
    namespace: string,
    namespaceConfig: NamespaceConfig,
    configPath: string
  ): Promise<void>
  
  // 설정 저장
  async saveConfig(configPath: string, config: ConfigFile): Promise<void>
}
```

#### `loadConfig`

설정 파일을 로드합니다.

```typescript
async loadConfig(configPath: string): Promise<ConfigFile>
```

**반환값**:
```typescript
interface ConfigFile {
  namespaces: Record<string, NamespaceConfig>;
  default?: string;
}
```

**예시**:
```typescript
const configManager = new ConfigManager();
const config = await configManager.loadConfig('deps.config.json');
console.log('네임스페이스:', Object.keys(config.namespaces));
```

#### `setNamespaceConfig`

네임스페이스 설정을 저장합니다.

```typescript
async setNamespaceConfig(
  namespace: string,
  namespaceConfig: NamespaceConfig,
  configPath: string
): Promise<void>
```

**매개변수**:
```typescript
interface NamespaceConfig {
  projectName?: string;         // 프로젝트명
  filePatterns: string[];       // 파일 패턴
  excludePatterns?: string[];   // 제외 패턴
  description?: string;         // 설명
  semanticTags?: string[];      // 시맨틱 태그
  scenarios?: string[];         // 시나리오 ID
  scenarioConfig?: Record<string, Record<string, unknown>>; // 시나리오 설정
}
```

**예시**:
```typescript
await configManager.setNamespaceConfig('source', {
  projectName: 'my-project',
  filePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
  excludePatterns: ['src/**/*.test.ts'],
  semanticTags: ['source', 'production'],
  scenarios: ['basic-structure', 'file-dependency']
}, 'deps.config.json');
```

### `NamespaceDependencyAnalyzer`

Namespace 기반 의존성 분석을 수행하는 클래스입니다.

```typescript
class NamespaceDependencyAnalyzer {
  // 네임스페이스 분석
  async analyzeNamespace(
    namespace: string,
    options: NamespaceAnalysisOptions
  ): Promise<NamespaceDependencyResult>
  
  // 모든 네임스페이스 분석
  async analyzeAllNamespaces(
    options: AllNamespacesAnalysisOptions
  ): Promise<AllNamespacesResult>
  
  // 크로스 네임스페이스 의존성 분석
  async analyzeCrossNamespaceDependencies(
    options: CrossNamespaceAnalysisOptions
  ): Promise<CrossNamespaceResult>
}
```

#### `analyzeNamespace`

특정 네임스페이스를 분석합니다.

```typescript
async analyzeNamespace(
  namespace: string,
  options: NamespaceAnalysisOptions
): Promise<NamespaceDependencyResult>
```

**매개변수**:
```typescript
interface NamespaceAnalysisOptions {
  baseDir: string;              // 기본 디렉토리
  configPath: string;           // 설정 파일 경로
  includeSubdirectories?: boolean; // 하위 디렉토리 포함
  followSymlinks?: boolean;     // 심볼릭 링크 따라가기
}
```

**반환값**:
```typescript
interface NamespaceDependencyResult {
  namespace: string;
  files: string[];
  graph: DependencyGraph;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    fileCount: number;
  };
}
```

**예시**:
```typescript
const analyzer = new NamespaceDependencyAnalyzer();
const result = await analyzer.analyzeNamespace('source', {
  baseDir: './src',
  configPath: './deps.config.json'
});

console.log(`분석된 파일: ${result.files.length}개`);
console.log(`발견된 관계: ${result.graph.edges.size}개`);
```

---

## 🔍 쿼리 API

### `EdgeTypeRegistry`

Edge 타입을 관리하는 레지스트리입니다.

```typescript
class EdgeTypeRegistry {
  // Edge 타입 조회
  static get(type: string): EdgeTypeDefinition | undefined
  
  // 모든 Edge 타입 조회
  static getAll(): EdgeTypeDefinition[]
  
  // 전이적 타입 조회
  static getTransitiveTypes(): EdgeTypeDefinition[]
  
  // 상속 가능한 타입 조회
  static getInheritableTypes(): EdgeTypeDefinition[]
  
  // 통계 조회
  static getStatistics(): EdgeTypeStatistics
  
  // 초기화
  static initialize(): void
}
```

#### `get`

특정 Edge 타입을 조회합니다.

```typescript
static get(type: string): EdgeTypeDefinition | undefined
```

**반환값**:
```typescript
interface EdgeTypeDefinition {
  type: string;                 // 타입명
  description: string;          // 설명
  schema: Record<string, string>; // 스키마
  isDirected: boolean;          // 방향성
  isTransitive: boolean;        // 전이성
  isInheritable: boolean;       // 상속 가능성
  priority: number;             // 우선순위
}
```

**예시**:
```typescript
const edgeType = EdgeTypeRegistry.get('imports');
console.log(`타입: ${edgeType?.type}`);
console.log(`전이성: ${edgeType?.isTransitive}`);
```

#### `getStatistics`

Edge 타입 통계를 조회합니다.

```typescript
static getStatistics(): EdgeTypeStatistics
```

**반환값**:
```typescript
interface EdgeTypeStatistics {
  total: number;                // 전체 타입 수
  transitive: number;           // 전이적 타입 수
  inheritable: number;          // 상속 가능한 타입 수
  directed: number;             // 방향성 타입 수
  byPriority: Record<number, number>; // 우선순위별 분포
}
```

**예시**:
```typescript
const stats = EdgeTypeRegistry.getStatistics();
console.log(`전체 타입: ${stats.total}개`);
console.log(`전이적 타입: ${stats.transitive}개`);
```

---

## 🛠️ 유틸리티 API

### `ErrorHandler`

표준화된 에러 처리를 제공하는 클래스입니다.

```typescript
class ErrorHandler {
  // 에러 처리
  static handle(error: unknown, context: string, code?: ErrorCode): never
  
  // 안전한 비동기 실행
  static async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    code?: ErrorCode
  ): Promise<T>
  
  // 안전한 동기 실행
  static safeExecuteSync<T>(
    operation: () => T,
    context: string,
    code?: ErrorCode
  ): T
  
  // 에러 로깅
  static logError(
    error: DependencyLinkerError,
    additionalContext?: Record<string, any>
  ): void
  
  // 재시도 로직
  static async retry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries?: number,
    delay?: number
  ): Promise<T>
}
```

#### `handle`

에러를 처리하고 적절한 DependencyLinkerError로 변환합니다.

```typescript
static handle(error: unknown, context: string, code?: ErrorCode): never
```

**예시**:
```typescript
try {
  const result = await operation();
} catch (error) {
  ErrorHandler.handle(error, 'operationName', ERROR_CODES.OPERATION_FAILED);
}
```

#### `safeExecute`

비동기 작업을 안전하게 실행합니다.

```typescript
static async safeExecute<T>(
  operation: () => Promise<T>,
  context: string,
  code?: ErrorCode
): Promise<T>
```

**예시**:
```typescript
const result = await ErrorHandler.safeExecute(
  () => analyzeFile(sourceCode, 'typescript', 'src/App.tsx'),
  'analyzeFile',
  ERROR_CODES.OPERATION_FAILED
);
```

#### `retry`

재시도 로직과 함께 작업을 실행합니다.

```typescript
static async retry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries?: number,
  delay?: number
): Promise<T>
```

**예시**:
```typescript
const result = await ErrorHandler.retry(
  () => analyzeFile(sourceCode, 'typescript', 'src/App.tsx'),
  'analyzeFile',
  3,    // 최대 재시도 횟수
  1000  // 재시도 간격 (ms)
);
```

### `DependencyLinkerError`

커스텀 에러 클래스입니다.

```typescript
class DependencyLinkerError extends Error {
  constructor(
    message: string,
    code: string,
    context?: Record<string, any>
  )
  
  // JSON 직렬화
  toJSON(): Record<string, any>
}
```

**속성**:
- `code: string` - 에러 코드
- `context?: Record<string, any>` - 에러 컨텍스트
- `timestamp: Date` - 에러 발생 시간

**예시**:
```typescript
try {
  // 작업 수행
} catch (error) {
  if (error instanceof DependencyLinkerError) {
    console.error(`에러 코드: ${error.code}`);
    console.error(`컨텍스트: ${JSON.stringify(error.context)}`);
  }
}
```

---

## 📊 타입 정의

### 기본 타입

```typescript
// 지원되는 언어
type SupportedLanguage = 
  | 'typescript' 
  | 'javascript' 
  | 'python' 
  | 'java' 
  | 'go';

// 쿼리 키
type QueryKey = 
  | 'ts-import-sources'
  | 'ts-named-imports'
  | 'ts-default-imports'
  | 'ts-class-definitions'
  | 'ts-function-definitions'
  | 'python-import-sources'
  | 'python-function-definitions'
  | 'java-import-sources'
  | 'java-class-declarations';

// 추론된 관계 타입
type InferredRelationType = 
  | 'hierarchical' 
  | 'transitive' 
  | 'inheritable';
```

### 분석 결과 타입

```typescript
interface AnalysisResult {
  language: SupportedLanguage;
  filePath: string;
  sourceCode: string;
  parseMetadata: {
    nodeCount: number;
    parseTime: number;
  };
  queryResults: Record<QueryKey, QueryResult<QueryKey>[]>;
  customResults?: Record<string, QueryResult<QueryKey>[]>;
  performanceMetrics: {
    totalExecutionTime: number;
    queryExecutionTime: number;
    customMappingTime?: number;
  };
}

interface QueryResult<T extends QueryKey> {
  queryName: T;
  captures: Array<{
    name: string;
    node: any;
  }>;
  metadata?: Record<string, any>;
}
```

### 데이터베이스 타입

```typescript
interface Node {
  id: number;
  identifier: string;
  type: string;
  name: string;
  sourceFile?: string;
  language?: string;
  semanticTags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface Relationship {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  type: string;
  properties?: Record<string, any>;
  weight?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 추론 타입

```typescript
interface InferredRelationship {
  fromNodeId: number;
  toNodeId: number;
  type: string;
  path: InferencePath;
  inferredAt: Date;
  sourceFile?: string;
}

interface InferencePath {
  edgeIds: number[];
  depth: number;
  inferenceType: InferredRelationType;
  description: string;
}

interface InferenceResult {
  nodeId: number;
  hierarchical: InferredRelationship[];
  transitive: InferredRelationship[];
  inheritable: InferredRelationship[];
  statistics: InferenceStatistics;
}
```

### 성능 타입

```typescript
interface LRUCacheStatistics {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

interface BatchProcessorResult<T> {
  results: T[];
  failures: Array<{
    item: any;
    index: number;
    error: Error;
  }>;
  statistics: {
    total: number;
    successful: number;
    failed: number;
    executionTime: number;
    throughput: number;
  };
}
```

### Namespace 타입

```typescript
interface NamespaceConfig {
  projectName?: string;
  filePatterns: string[];
  excludePatterns?: string[];
  description?: string;
  semanticTags?: string[];
  scenarios?: string[];
  scenarioConfig?: Record<string, Record<string, unknown>>;
}

interface NamespaceDependencyResult {
  namespace: string;
  files: string[];
  graph: DependencyGraph;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    fileCount: number;
  };
}
```

---

## 🎯 사용 예시

### 기본 사용법

```typescript
import { 
  GraphDatabase, 
  analyzeFile, 
  InferenceEngine,
  ErrorHandler 
} from '@context-action/dependency-linker';

async function main() {
  try {
    // 데이터베이스 초기화
    const db = new GraphDatabase('project.db');
    await db.initialize();

    // 파일 분석
    const result = await analyzeFile(
      `import React from 'react';
       export const App = () => <div>Hello</div>;`,
      'typescript',
      'src/App.tsx'
    );

    console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);

    // 추론 엔진 초기화
    const engine = new InferenceEngine(db, {
      enableCache: true,
      cacheSyncStrategy: 'lazy'
    });

    // 계층적 추론
    const imports = await engine.queryHierarchical('imports', {
      includeChildren: true,
      maxDepth: 3
    });

    console.log(`발견된 임포트: ${imports.length}개`);

  } catch (error) {
    ErrorHandler.handle(error, 'main', ERROR_CODES.OPERATION_FAILED);
  }
}

main();
```

### 고급 사용법

```typescript
import { 
  OptimizedInferenceEngine,
  BatchProcessor,
  ConfigManager 
} from '@context-action/dependency-linker';

async function advancedExample() {
  // 최적화된 추론 엔진
  const optimizedEngine = new OptimizedInferenceEngine(db, {
    enableLRUCache: true,
    cacheSize: 2000,
    enablePerformanceMonitoring: true
  });

  // 성능 모니터링
  const metrics = optimizedEngine.getPerformanceMetrics();
  const cacheStats = optimizedEngine.getLRUCacheStatistics();

  console.log(`캐시 히트율: ${(cacheStats.hitRate * 100).toFixed(2)}%`);

  // 배치 처리
  const processor = new BatchProcessor({
    batchSize: 100,
    concurrency: 4,
    timeout: 30000
  });

  const result = await processor.process(files, async (file) => {
    return await analyzeFile(file.content, file.language, file.path);
  });

  console.log(`처리 완료: ${result.statistics.successful}/${result.statistics.total}`);

  // Namespace 설정
  const configManager = new ConfigManager();
  await configManager.setNamespaceConfig('source', {
    projectName: 'my-project',
    filePatterns: ['src/**/*.ts'],
    semanticTags: ['source', 'production']
  }, 'deps.config.json');
}
```

---

## 🎉 결론

Dependency Linker는 완전한 API를 제공하여 다양한 의존성 분석 요구사항을 충족할 수 있습니다:

### ✅ 완성된 API들
- **분석 API**: 파일 분석, 임포트 분석, 의존성 분석
- **데이터베이스 API**: 노드/관계 관리, 쿼리 실행
- **추론 엔진 API**: 계층적/전이적/상속 가능한 추론
- **성능 최적화 API**: 배치 처리, 병렬화, 캐싱
- **Namespace API**: 설정 관리, 네임스페이스 분석
- **유틸리티 API**: 에러 처리, 재시도 로직

### 🚀 프로덕션 준비
- **완전한 타입 안전성**: TypeScript로 모든 API 정의
- **강력한 에러 처리**: 표준화된 에러 관리
- **성능 최적화**: LRU 캐싱, 배치 처리, 병렬화
- **유연한 설정**: Namespace 기반 구성

**Dependency Linker API는 이제 완전한 프로덕션 준비 상태입니다!** 🎉

---

**Last Updated**: 2025-01-27
**Version**: 2.1.0
**Maintainer**: Development Team
**Status**: ✅ Complete
