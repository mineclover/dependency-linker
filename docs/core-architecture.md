# 파서 아키텍처 및 출력 형태 핵심 가이드

## 📋 목차
1. [핵심 아키텍처](#핵심-아키텍처)
2. [파서 출력 형태](#파서-출력-형태)
3. [인터프리터 구성 방법](#인터프리터-구성-방법)
4. [사용 예제](#사용-예제)
5. [모범 사례](#모범-사례)

---

## 🏗️ 핵심 아키텍처

### 3단계 분석 플로우
```
파일 입력 → AST 파싱 → 데이터 추출 → 데이터 해석 → 분석 결과
```

### 주요 컴포넌트

#### 1. AnalysisEngine (코디네이터)
```typescript
const engine = new AnalysisEngine({
  useCache: true,
  timeout: 30000,
  extractors: ['dependency', 'identifier', 'complexity'],
  interpreters: ['dependency-analysis', 'identifier-analysis']
});

// 파일 분석
const result = await engine.analyzeFile('src/component.ts');
```

#### 2. ParserRegistry (언어별 파서)
```typescript
// 지원 언어: TypeScript, JavaScript, Go, Java
// 자동 언어 감지 및 적절한 파서 선택
const parser = parserRegistry.detectAndGetParser('component.tsx');
const parseResult = await parser.parse(filePath);
```

#### 3. ExtractorRegistry (데이터 추출 플러그인)
```typescript
// 기본 추출기들
- dependency: import/export 분석
- identifier: 함수, 클래스, 변수 추출
- complexity: 복잡도 메트릭 계산
```

#### 4. InterpreterRegistry (데이터 해석 플러그인)
```typescript
// 기본 해석기들
- dependency-analysis: 의존성 분석 및 그래프 생성
- identifier-analysis: 코드 구조 분석
```

---

## 📊 파서 출력 형태

### CLI 출력 포맷

#### 1. JSON (상세 정보)
```bash
analyze-file component.ts --format json
```
```json
{
  "filePath": "component.ts",
  "language": "typescript",
  "dependencies": ["react", "lodash"],
  "exports": ["Component", "helper"],
  "performanceMetrics": {
    "parseTime": 45,
    "totalTime": 120,
    "memoryUsage": 1024000
  },
  "extractedData": {
    "dependency": { /* 의존성 상세 정보 */ },
    "identifier": { /* 식별자 상세 정보 */ }
  },
  "interpretedData": {
    "dependency-analysis": { /* 의존성 분석 결과 */ }
  }
}
```

#### 2. Summary (한 줄 요약)
```bash
analyze-file component.ts --format summary
```
```
component.ts | 3 deps, 5 imports, 2 exports | 45ms | OK
```

#### 3. Table (표 형태)
```bash
analyze-file component.ts --format table
```
```
┌─────────────────┬──────────┬──────────┬─────────┬──────────┐
│ File            │ Language │ Deps     │ Exports │ Time     │
├─────────────────┼──────────┼──────────┼─────────┼──────────┤
│ component.ts    │ TS       │ 3        │ 2       │ 45ms     │
└─────────────────┴──────────┴──────────┴─────────┴──────────┘
```

#### 4. CSV (스프레드시트용)
```bash
analyze-file component.ts --format csv
```
```csv
File,Language,Dependencies,Imports,Exports,ParseTime,TotalTime,Status
component.ts,typescript,3,5,2,45,120,OK
```

#### 5. Dependencies Only (의존성만)
```bash
analyze-file component.ts --format deps-only
```
```
react
lodash
./utils
```

#### 6. Tree (트리 구조)
```bash
analyze-file component.ts --format tree
```
```
component.ts
├── Dependencies (3)
│   ├── react (external)
│   ├── lodash (external)
│   └── ./utils (internal)
├── Exports (2)
│   ├── Component (class)
│   └── helper (function)
└── Metrics
    ├── Parse: 45ms
    └── Total: 120ms
```

### 프로그래매틱 API 출력

#### AnalysisResult 구조
```typescript
interface AnalysisResult {
  filePath: string;
  language: string;

  // 추출된 원시 데이터
  extractedData: {
    dependency: DependencyExtractionResult;
    identifier: IdentifierExtractionResult;
    complexity: ComplexityExtractionResult;
  };

  // 해석된 분석 결과
  interpretedData: {
    'dependency-analysis': DependencyAnalysisResult;
    'identifier-analysis': IdentifierAnalysisResult;
  };

  // 성능 메트릭
  performanceMetrics: {
    parseTime: number;
    extractionTime: number;
    interpretationTime: number;
    totalTime: number;
    memoryUsage: number;
  };

  // 메타데이터
  metadata: {
    timestamp: Date;
    version: string;
    extractorsUsed: string[];
    interpretersUsed: string[];
    fromCache: boolean;
  };

  // 오류 정보
  errors: AnalysisError[];
}
```

---

## ⚙️ 인터프리터 구성 방법

### 데이터 추출기 (IDataExtractor) 구현

```typescript
export class CustomExtractor implements IDataExtractor<CustomData> {
  // 1. 기본 메타데이터
  getName(): string { return 'custom-extractor'; }
  getVersion(): string { return '1.0.0'; }
  supports(language: string): boolean {
    return ['typescript', 'javascript'].includes(language);
  }

  // 2. 핵심 추출 로직
  extract(ast: any, filePath: string, options?: ExtractorOptions): CustomData {
    // AST 순회하며 필요한 데이터 추출
    const result: CustomData = {
      // 추출 결과
    };
    return result;
  }

  // 3. 데이터 검증
  validate(data: CustomData): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  // 4. 스키마 정의
  getOutputSchema(): OutputSchema {
    return {
      type: 'object',
      properties: {
        items: { type: 'array', description: 'Extracted items' }
      },
      required: ['items'],
      version: '1.0.0'
    };
  }

  // 5. 구성 관리
  configure(options: ExtractorConfiguration): void {
    this.config = { ...this.defaultConfig, ...options };
  }
}
```

### 데이터 해석기 (IDataInterpreter) 구현

```typescript
export class CustomInterpreter implements IDataInterpreter<ExtractedData, AnalysisResult> {
  // 1. 기본 메타데이터
  getName(): string { return 'custom-analyzer'; }
  getVersion(): string { return '1.0.0'; }
  supports(dataType: string): boolean {
    return dataType === 'custom-data';
  }

  // 2. 핵심 해석 로직
  interpret(data: ExtractedData, context: InterpreterContext): AnalysisResult {
    // 추출된 데이터를 분석하여 인사이트 생성
    const analysis: AnalysisResult = {
      insights: this.generateInsights(data),
      recommendations: this.generateRecommendations(data),
      metrics: this.calculateMetrics(data)
    };
    return analysis;
  }

  // 3. 입력 데이터 검증
  validate(input: ExtractedData): ValidationResult {
    const errors: string[] = [];

    if (!input.items || !Array.isArray(input.items)) {
      errors.push('Input must contain items array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // 4. 의존성 정의
  getDependencies(): InterpreterDependency[] {
    return [
      {
        name: 'custom-extractor',
        version: '>=1.0.0',
        type: 'extractor'
      }
    ];
  }
}
```

### 엔진에 플러그인 등록

```typescript
// 1. 추출기 등록
engine.registerExtractor('custom', new CustomExtractor());

// 2. 해석기 등록
engine.registerInterpreter('custom-analysis', new CustomInterpreter());

// 3. 분석 설정에서 사용
const result = await engine.analyzeFile('file.ts', {
  extractors: ['dependency', 'custom'],
  interpreters: ['dependency-analysis', 'custom-analysis']
});
```

---

## 💡 사용 예제

### 1. 기본 파일 분석
```typescript
import { AnalysisEngine } from './services/AnalysisEngine';

const engine = new AnalysisEngine();
const result = await engine.analyzeFile('src/component.ts');

console.log('Dependencies:', result.extractedData.dependency.external);
console.log('Exports:', result.extractedData.identifier.functions.map(f => f.name));
```

### 2. 배치 분석
```typescript
const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
const results = await engine.analyzeBatch(files);

results.forEach(result => {
  console.log(`${result.filePath}: ${result.extractedData.dependency.external.length} deps`);
});
```

### 3. 커스텀 설정
```typescript
const result = await engine.analyzeFile('file.ts', {
  extractors: ['dependency', 'complexity'],
  interpreters: ['dependency-analysis'],
  extractorOptions: {
    includeLocations: true,
    maxDepth: 10,
    filters: {
      exclude: ['node_modules/**']
    }
  }
});
```

### 4. 캐시 활용
```typescript
// 캐시 워밍업
await engine.warmupCache(['src/file1.ts', 'src/file2.ts']);

// 캐시된 결과 활용 (빠른 분석)
const result = await engine.analyzeFile('src/file1.ts');
console.log('From cache:', result.metadata.fromCache);
```

### 5. 성능 모니터링
```typescript
const metrics = engine.getPerformanceMetrics();
console.log('Average analysis time:', metrics.averageAnalysisTime);
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Memory usage:', metrics.currentMemoryUsage);
```

---

## 🎯 모범 사례

### 1. 추출기 설계
- **단일 책임**: 하나의 추출기는 하나의 데이터 타입만 처리
- **언어 무관성**: 가능한 한 언어 독립적으로 설계
- **성능 최적화**: AST 순회를 최소화하고 필요한 데이터만 추출
- **오류 처리**: 부분적 실패를 허용하고 복구 가능하도록 설계

```typescript
// 좋은 예: 특정 목적에 집중
class ImportExtractor implements IDataExtractor<ImportData> {
  extract(ast: any): ImportData {
    // import 문만 추출
  }
}

// 나쁜 예: 너무 많은 책임
class EverythingExtractor implements IDataExtractor<any> {
  extract(ast: any): any {
    // 모든 것을 추출하려고 시도
  }
}
```

### 2. 해석기 설계
- **데이터 검증**: 입력 데이터의 유효성을 항상 확인
- **점진적 분석**: 복잡한 분석을 단계별로 수행
- **설정 가능**: 분석 깊이와 범위를 설정으로 조절
- **결과 구조화**: 일관된 출력 스키마 제공

```typescript
// 좋은 예: 구조화된 분석
class DependencyAnalyzer implements IDataInterpreter<DependencyData, DependencyAnalysis> {
  interpret(data: DependencyData): DependencyAnalysis {
    return {
      graph: this.buildDependencyGraph(data),
      cycles: this.detectCycles(data),
      metrics: this.calculateMetrics(data),
      recommendations: this.generateRecommendations(data)
    };
  }
}
```

### 3. 성능 최적화
- **캐시 활용**: 반복 분석 시 캐시 사용
- **병렬 처리**: 독립적인 추출기들은 병렬 실행
- **메모리 관리**: 대용량 파일 처리 시 스트리밍 고려
- **타임아웃 설정**: 무한 루프나 긴 처리 방지

```typescript
// 성능 최적화된 설정
const engine = new AnalysisEngine({
  useCache: true,
  timeout: 30000,
  maxConcurrency: 4,
  memoryLimit: 512 * 1024 * 1024 // 512MB
});
```

### 4. 오류 처리
- **부분 실패 허용**: 일부 추출기 실패가 전체를 중단시키지 않도록
- **상세한 오류 정보**: 디버깅을 위한 충분한 컨텍스트 제공
- **복구 전략**: 실패 시 대안적 분석 방법 제공

```typescript
try {
  const result = await engine.analyzeFile('complex-file.ts');

  // 부분 실패 확인
  if (result.errors.length > 0) {
    console.warn('Analysis completed with errors:', result.errors);
  }

  // 사용 가능한 데이터만 처리
  if (result.extractedData.dependency) {
    processDependencies(result.extractedData.dependency);
  }
} catch (error) {
  console.error('Analysis failed completely:', error);
}
```

### 5. 확장성 고려
- **플러그인 아키텍처**: 새로운 언어나 분석 타입 쉽게 추가
- **설정 기반**: 하드코딩 대신 설정으로 동작 제어
- **버전 호환성**: 이전 버전과의 호환성 유지
- **API 안정성**: 공개 인터페이스의 안정성 보장

이 가이드를 통해 TypeScript Dependency Linker의 핵심 아키텍처와 활용 방법을 이해하고, 효과적으로 활용할 수 있습니다.