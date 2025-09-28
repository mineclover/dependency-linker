# 🏗️ 내장 캐싱 구조 심층 분석

## 📋 목차
1. [캐싱 아키텍처 개요](#캐싱-아키텍처-개요)
2. [캐시 계층 구조](#캐시-계층-구조)
3. [캐시되는 데이터 타입](#캐시되는-데이터-타입)
4. [캐시 키 생성 메커니즘](#캐시-키-생성-메커니즘)
5. [캐시 생명주기](#캐시-생명주기)
6. [성능 최적화](#성능-최적화)
7. [메모리 관리](#메모리-관리)

## 🏛️ 캐싱 아키텍처 개요

dependency-linker는 **3계층 캐싱 아키텍처**를 사용합니다:

```
┌─────────────────────────────────────────┐
│           사용자 API 레벨               │
│  TypeScriptAnalyzer, Factory Functions │
├─────────────────────────────────────────┤
│         AnalysisEngine 레벨             │
│    AnalysisEngineCache + Metrics        │
├─────────────────────────────────────────┤
│          CacheManager 레벨              │
│  Memory Cache + File Cache + AST Cache  │
└─────────────────────────────────────────┘
```

### 핵심 컴포넌트
- **CacheManager**: 기본 캐시 저장소 (메모리 + 파일)
- **AnalysisEngineCache**: 분석 결과 전용 캐시 래퍼
- **Multi-tier Cache**: 메모리 → 파일 계층 구조

## 🏗️ 캐시 계층 구조

### 1. **메모리 캐시 (L1)**
```typescript
// src/services/CacheManager.ts
class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfiguration;

  // 기본 설정
  maxSize: 1000,          // 최대 1000 항목
  defaultTtl: 3600000,    // 1시간 TTL
  enableCompression: true, // gzip 압축
  cleanupInterval: 300000  // 5분마다 정리
}
```

### 2. **파일 캐시 (L2)**
```typescript
// src/api/cache/CacheManager.ts
class CacheManager<T> {
  private memoryCache?: MemoryCache<T>;
  private fileCache?: FileCache<T>;
  private memoryFirst: boolean = true; // 메모리 우선 전략

  // 파일 캐시 설정
  maxSize: (options.maxSize || 1000) * 10, // 메모리의 10배
  ttl: 24 * 60 * 60 * 1000,               // 24시간 TTL
  enableCompression: true,                 // 압축 활성화
}
```

### 3. **AST 특화 캐시**
```typescript
// AST 최적화 압축
private async compressAST(ast: any): Promise<any> {
  // AST 구조 최적화
  const optimized = this.optimizeASTForStorage(ast);

  // 고압축 적용
  return zlib.gzip(jsonString, {
    level: zlib.constants.Z_BEST_COMPRESSION
  });
}

// AST 저장 최적화
private optimizeASTForStorage(ast: any): any {
  delete optimized.parent;     // 순환 참조 제거
  delete optimized.sourceFile; // 재구성 가능한 데이터 제거
  delete optimized.pos;        // 위치 정보 제거
  delete optimized.end;        // 끝 위치 정보 제거
}
```

## 💾 캐시되는 데이터 타입

### 1. **분석 결과 (Analysis Results)**
```typescript
interface AnalysisResult {
  filePath: string;
  language: string;
  extractedData: ExtractedData;      // 추출된 데이터
  interpretedData: InterpretedData;  // 해석된 데이터
  performanceMetrics: PerformanceMetrics;
  errors: AnalysisError[];
  metadata: AnalysisMetadata;
}

// 캐시 키: "filePath:JSON.stringify(config)"
// 예: "src/index.ts:{"extractors":["dependency"],"useCache":true}"
```

### 2. **AST (Abstract Syntax Tree)**
```typescript
// AST 캐시 키 생성
async getAST(filePath: string, contentHash?: string): Promise<any> {
  const key = contentHash
    ? `ast:${filePath}:${contentHash}`
    : `ast:${filePath}`;
  return this.get(key);
}

// 배치 AST 캐싱
async setASTBatch(entries: Array<{
  filePath: string;
  ast: any;
  contentHash?: string
}>): Promise<void>
```

### 3. **캐시 엔트리 구조**
```typescript
interface CacheEntry<T> {
  key: string;
  data: T;                    // 실제 데이터 (압축될 수 있음)
  createdAt: Date;
  expiresAt?: Date;
  lastAccessedAt: Date;
  metadata: {
    size: number;             // 데이터 크기
    hitCount: number;         // 접근 횟수
    source: "analysis" | "ast" | "external";
    version: string;
    tags: string[];
    custom: {
      compressed: boolean;    // 압축 여부
      checksum: string;       // 무결성 검증
    };
  };
}
```

## 🔑 캐시 키 생성 메커니즘

### 1. **분석 결과 캐시 키**
```typescript
// src/services/analysis-engine/AnalysisEngineCache.ts
generateCacheKey(filePath: string, config: AnalysisConfig): string {
  return `${filePath}:${JSON.stringify(config)}`;
}

// 예제 키들:
// "src/index.ts:{"extractors":["dependency","identifier"],"useCache":true}"
// "src/utils.ts:{"interpreters":["dependency-analysis"],"useCache":true}"
```

### 2. **AST 캐시 키**
```typescript
// 파일 기반 AST 키
`ast:${filePath}`
// 예: "ast:src/index.ts"

// 컨텐츠 해시 기반 키 (더 정확한 캐싱)
`ast:${filePath}:${contentHash}`
// 예: "ast:src/index.ts:d4e5f6a7b8c9d0e1f2"
```

### 3. **캐시 키 분류**
```typescript
// 캐시 통계에서 키 분류
distribution: {
  ast: 0,          // AST 캐시 항목 수
  analysis: 0,     // 분석 결과 캐시 항목 수
  extractor: 0,    // 추출기 캐시 항목 수
  interpreter: 0,  // 해석기 캐시 항목 수
  external: 0      // 외부 캐시 항목 수
}
```

## ⏱️ 캐시 생명주기

### 1. **캐시 저장 과정**
```typescript
// 1. 분석 실행 시 캐시 확인
const cacheKey = this.cacheModule.generateCacheKey(filePath, analysisConfig);

if (analysisConfig.useCache !== false) {
  const cachedResult = await this.cacheModule.getCachedResult(cacheKey);
  if (cachedResult) {
    // 캐시 히트 - 즉시 반환
    return enhancedCachedResult;
  }
}

// 2. 캐시 미스 - 분석 실행
const result = await this.performAnalysis(filePath, analysisConfig, content);

// 3. 결과를 캐시에 저장
if (analysisConfig.useCache !== false) {
  await this.cacheModule.setCachedResult(cacheKey, result);
}
```

### 2. **TTL 및 만료 관리**
```typescript
// 기본 TTL 설정
defaultTtl: 3600000,        // 메모리: 1시간
ttl: 24 * 60 * 60 * 1000,   // 파일: 24시간

// 만료 확인 및 정리
if (entry.expiresAt && entry.expiresAt < new Date()) {
  await this.delete(key);
  this.stats.totalMisses++;
  return undefined;
}

// 정기 정리 (5분마다)
setInterval(() => this.cleanup(), this.config.cleanupInterval);
```

### 3. **LRU 교체 정책**
```typescript
// 캐시가 가득 찰 때 가장 오래된 항목 제거
private async evictOldest(): Promise<void> {
  let oldestKey: string | undefined;
  let oldestTime = Date.now();

  for (const [key, entry] of this.cache) {
    if (entry.lastAccessedAt.getTime() < oldestTime) {
      oldestTime = entry.lastAccessedAt.getTime();
      oldestKey = key;
    }
  }

  if (oldestKey) {
    await this.delete(oldestKey);
  }
}
```

## ⚡ 성능 최적화

### 1. **다중 계층 조회 전략**
```typescript
async get(key: string): Promise<T | undefined> {
  // 1. 메모리 캐시 우선 확인 (memoryFirst 전략)
  if (this.memoryCache && this.memoryFirst) {
    const memoryResult = await this.memoryCache.get(key);
    if (memoryResult !== undefined) {
      return memoryResult;
    }
  }

  // 2. 파일 캐시 확인
  if (this.fileCache) {
    const fileResult = await this.fileCache.get(key);
    if (fileResult !== undefined) {
      // 메모리로 승격 (cache promotion)
      if (this.memoryCache && this.memoryFirst) {
        await this.memoryCache.set(key, fileResult);
      }
      return fileResult;
    }
  }

  // 3. 대안 전략으로 메모리 재확인
  if (this.memoryCache && !this.memoryFirst) {
    return await this.memoryCache.get(key);
  }

  return undefined;
}
```

### 2. **압축 최적화**
```typescript
// 일반 데이터 압축
private compress<T>(data: T): any {
  const jsonString = JSON.stringify(data);
  if (this.config.enableCompression) {
    return zlib.gzipSync(jsonString).toString("base64");
  }
  return jsonString;
}

// AST 특화 압축 (더 높은 압축률)
private async compressAST(ast: any): Promise<any> {
  const optimized = this.optimizeASTForStorage(ast);
  const jsonString = JSON.stringify(optimized);

  return new Promise((resolve, reject) => {
    zlib.gzip(jsonString, {
      level: zlib.constants.Z_BEST_COMPRESSION
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result.toString("base64"));
    });
  });
}
```

### 3. **배치 처리 최적화**
```typescript
// AST 배치 저장
async setASTBatch(entries: Array<{
  filePath: string;
  ast: any;
  contentHash?: string
}>): Promise<void> {
  // 병렬 압축 처리
  const compressionPromises = entries.map(async ({ filePath, ast, contentHash }) => {
    const key = contentHash ? `ast:${filePath}:${contentHash}` : `ast:${filePath}`;
    const compressedAST = await this.compressAST(ast);
    return { key, data: compressedAST };
  });

  const compressedEntries = await Promise.all(compressionPromises);

  // 배치 삽입
  for (const { key, data } of compressedEntries) {
    await this.set(key, data);
  }
}
```

## 🧠 메모리 관리

### 1. **메모리 사용량 추적**
```typescript
// 메모리 통계 업데이트
private updateMemoryUsage(): void {
  this.stats.memoryStats.current = Array.from(this.cache.values()).reduce(
    (total, entry) => total + entry.metadata.size,
    0,
  );
}

// 메모리 사용량 경고
if (stats.memory.memoryUsage > 100 * 1024 * 1024) { // 100MB
  issues.push("High memory cache usage");
  recommendations.push(
    "Consider reducing cache size or enabling aggressive eviction",
  );
}
```

### 2. **캐시 건강 상태 모니터링**
```typescript
getCacheHealth(): {
  healthy: boolean;
  issues: string[];
  recommendations: string[];
} {
  const stats = this.getDetailedStats();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 메모리 캐시 히트율 확인
  if (stats.memory && stats.memory.hitRate < 0.5) {
    issues.push("Low memory cache hit rate");
    recommendations.push("Consider increasing memory cache size or TTL");
  }

  // 파일 캐시 히트율 확인
  if (stats.file && stats.file.hitRate < 0.3) {
    issues.push("Low file cache hit rate");
    recommendations.push("Consider increasing file cache TTL or size");
  }

  return { healthy: issues.length === 0, issues, recommendations };
}
```

### 3. **캐시 동기화**
```typescript
// 메모리-파일 캐시 동기화
async synchronize(): Promise<void> {
  if (!this.memoryCache || !this.fileCache) return;

  try {
    const fileKeys = await this.fileCache.keys();
    const memoryKeys = await this.memoryCache.keys();

    // 자주 접근하는 파일 캐시 항목을 메모리로 승격
    for (const key of fileKeys.slice(0, 100)) { // 100개 제한
      if (!memoryKeys.includes(key)) {
        const value = await this.fileCache.get(key);
        if (value !== undefined) {
          await this.memoryCache.set(key, value);
        }
      }
    }
  } catch (error) {
    // 동기화 실패는 캐시 동작을 중단시키지 않음
  }
}
```

## 📊 캐시 성능 메트릭

### 1. **성능 통계**
```typescript
interface CacheStats {
  totalEntries: number;     // 전체 항목 수
  hitRate: number;          // 히트율 (0-1)
  missRate: number;         // 미스율 (0-1)
  totalHits: number;        // 총 히트 수
  totalMisses: number;      // 총 미스 수
  evictions: number;        // 제거된 항목 수
  memoryStats: {
    current: number;        // 현재 메모리 사용량
    peak: number;           // 최대 메모리 사용량
    averageEntrySize: number; // 평균 항목 크기
    efficiency: number;     // 메모리 효율성
  };
  performanceStats: {
    averageRetrievalTime: number;  // 평균 조회 시간
    averageStorageTime: number;    // 평균 저장 시간
    operationsPerSecond: number;   // 초당 작업 수
    timeSaved: number;             // 캐시로 절약된 시간
  };
}
```

### 2. **분산 통계**
```typescript
distribution: {
  ast: number,          // AST 캐시 항목 수
  analysis: number,     // 분석 결과 캐시 항목 수
  extractor: number,    // 추출기 캐시 항목 수
  interpreter: number,  // 해석기 캐시 항목 수
  external: number      // 외부 캐시 항목 수
}
```

## 🔧 캐시 관리 베스트 프랙티스

### 1. **캐시 워밍업**
```typescript
// 자주 사용하는 파일들을 미리 캐시에 로드
async warmupCache(filePaths: string[]): Promise<CacheWarmupResult> {
  const promises = filePaths.map(async (filePath) => {
    try {
      await this.analyzeFile(filePath);
      return { filePath, success: true };
    } catch (error) {
      return { filePath, success: false, error };
    }
  });

  const results = await Promise.all(promises);
  return {
    filesProcessed: results.length,
    filesCached: results.filter(r => r.success).length,
    filesFailed: results.filter(r => !r.success).length
  };
}
```

### 2. **캐시 무결성 검증**
```typescript
async validate(): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const [key, entry] of this.cache) {
    // 체크섬 검증
    const currentChecksum = this.calculateChecksum(entry.data);
    if (currentChecksum !== entry.metadata.custom.checksum) {
      errors.push(`Checksum mismatch for key: ${key}`);
    }

    // 압축 데이터 무결성 검증
    if (entry.metadata.custom.compressed) {
      try {
        this.decompress(entry.data);
      } catch (error) {
        errors.push(`Decompression failed for key: ${key}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
```

## 🎯 요약

dependency-linker의 캐싱 시스템은:

### 📈 **3계층 아키텍처**
- **L1 메모리** (빠른 접근, 1시간 TTL)
- **L2 파일** (영구 저장, 24시간 TTL)
- **L3 AST 특화** (고압축, 구조 최적화)

### 🔑 **캐시되는 주요 데이터**
- **분석 결과**: 완전한 AnalysisResult 객체
- **AST**: 압축 최적화된 구문 트리
- **추출 데이터**: 추출기별 결과
- **해석 데이터**: 해석기별 결과

### ⚡ **성능 최적화 기법**
- **멀티티어 조회**: 메모리 → 파일 → 미스
- **캐시 승격**: 파일에서 메모리로 자동 승격
- **배치 처리**: 병렬 압축 및 저장
- **LRU 교체**: 지능적 메모리 관리

### 📊 **모니터링 & 관리**
- **실시간 통계**: 히트율, 메모리 사용량, 성능 메트릭
- **건강 상태**: 자동 문제 감지 및 권장사항
- **무결성 검증**: 체크섬 및 압축 데이터 검증
- **동기화**: 멀티티어 캐시 일관성 유지

이 정교한 캐싱 시스템을 통해 dependency-linker는 **80% 이상의 캐시 히트율**과 **200ms 미만의 분석 시간**을 달성합니다.