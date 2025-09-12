# CLI/API 확장 모듈 구현 가이드라인

TypeScript File Analyzer를 위한 표준화된 확장 모듈 구현 방법론

## 📋 목차

- [개요](#개요)
- [아키텍처 패턴](#아키텍처-패턴)
- [CLI 확장 가이드](#cli-확장-가이드)
- [API 확장 가이드](#api-확장-가이드)
- [표준화 규칙](#표준화-규칙)
- [실제 구현 예제](#실제-구현-예제)
- [테스트 및 검증](#테스트-및-검증)

---

## 개요

본 프로젝트는 **Dual Interface Architecture**를 채택하여 CLI와 API 양쪽에서 동일한 기능을 제공합니다. 새로운 기능을 확장할 때는 다음 원칙을 준수해야 합니다:

### 핵심 설계 원칙

1. **Interface Consistency** - CLI와 API에서 동일한 기능 제공
2. **Clean Architecture** - 계층 분리와 의존성 역전
3. **Single Source of Truth** - 핵심 로직은 한 곳에서 관리
4. **Error Handling** - 일관성 있는 에러 처리 및 복구
5. **Type Safety** - TypeScript를 활용한 타입 안정성

---

## 아키텍처 패턴

### 계층별 역할 정의

```
┌─────────────────────────────────────────────────┐
│                 CLI Layer                       │
│  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ Command     │  │ Argument Parsing            │ │
│  │ Interface   │  │ Output Formatting          │ │
│  └─────────────┘  └─────────────────────────────┘ │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│                API Layer                        │
│  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ Function    │  │ Class-based API             │ │
│  │ Exports     │  │ TypeScript Interfaces       │ │
│  └─────────────┘  └─────────────────────────────┘ │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Business Logic                     │
│  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ Core        │  │ Services & Repositories     │ │
│  │ Operations  │  │ Domain Models              │ │
│  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 확장 모듈 구조

```typescript
// 표준 확장 모듈 구조
interface ExtensionModule {
  // Core business logic
  core: {
    service: Service;
    validator: Validator;
    transformer: Transformer;
  };
  
  // API interface
  api: {
    functions: FunctionExports;
    classes: ClassExports;
    types: TypeDefinitions;
  };
  
  // CLI interface
  cli: {
    command: CommandDefinition;
    parser: ArgumentParser;
    formatter: OutputFormatter;
  };
}
```

---

## CLI 확장 가이드

### 1. 명령어 정의

새로운 CLI 명령어는 다음 구조를 따릅니다:

```typescript
// src/cli/commands/new-command.ts
import { CommandDefinition, CliOptions } from '../types';
import { NewFeatureService } from '../../services/NewFeatureService';

export interface NewCommandOptions extends CliOptions {
  // 명령어별 특수 옵션
  specialOption?: string;
  featureFlag?: boolean;
}

export const newCommandDefinition: CommandDefinition = {
  name: 'new-command',
  description: 'New feature command description',
  
  // 인수 정의
  arguments: [
    {
      name: 'input',
      description: 'Input file or parameter',
      required: true,
      type: 'string'
    }
  ],
  
  // 옵션 정의
  options: [
    {
      name: 'special-option',
      alias: 's',
      description: 'Special option for new feature',
      type: 'string',
      default: 'default-value'
    },
    {
      name: 'feature-flag',
      alias: 'f',
      description: 'Enable special feature',
      type: 'boolean',
      default: false
    }
  ],
  
  // 실행 함수
  execute: async (args: string[], options: NewCommandOptions) => {
    return await executeNewCommand(args, options);
  }
};
```

### 2. 명령어 실행 로직

```typescript
// 핵심 실행 로직 구현
async function executeNewCommand(
  args: string[], 
  options: NewCommandOptions
): Promise<CliResult> {
  try {
    // 1. 입력 검증
    const validatedInput = validateInput(args, options);
    
    // 2. 서비스 호출 (비즈니스 로직)
    const service = new NewFeatureService(options);
    const result = await service.execute(validatedInput);
    
    // 3. 출력 형식 결정
    const formatter = getOutputFormatter(options.format);
    const formattedOutput = formatter.format(result);
    
    // 4. CLI 결과 반환
    return {
      success: true,
      output: formattedOutput,
      exitCode: 0
    };
    
  } catch (error) {
    // 일관성 있는 에러 처리
    return handleCliError(error, options);
  }
}
```

### 3. 출력 형식 지원

```typescript
// src/formatters/NewCommandFormatter.ts
import { OutputFormatter } from './OutputFormatter';

export class NewCommandFormatter extends OutputFormatter {
  formatJson(data: NewCommandResult): string {
    return JSON.stringify(data, null, options.includeSources ? 2 : 0);
  }
  
  formatText(data: NewCommandResult): string {
    return [
      `New Command Result: ${data.input}`,
      `Status: ${data.success ? 'Success' : 'Failed'}`,
      `Processing Time: ${data.processingTime}ms`,
      ...this.formatDetails(data)
    ].join('\n');
  }
  
  formatSummary(data: NewCommandResult): string {
    return `✅ ${data.input}: ${data.itemCount} items processed (${data.processingTime}ms)`;
  }
  
  formatCsv(data: NewCommandResult): string {
    return [
      'input,status,items,processing_time,error',
      `"${data.input}","${data.success}",${data.itemCount},${data.processingTime},"${data.error || ''}"`
    ].join('\n');
  }
}
```

---

## API 확장 가이드

### 1. 함수 기반 API

```typescript
// src/api/new-feature-functions.ts
import { NewFeatureService } from '../services/NewFeatureService';
import type { NewFeatureOptions, NewFeatureResult } from '../types';

/**
 * New feature function - simple interface
 * @param input - Input parameter
 * @param options - Optional configuration
 * @returns Promise<NewFeatureResult>
 */
export async function executeNewFeature(
  input: string,
  options: NewFeatureOptions = {}
): Promise<NewFeatureResult> {
  const service = new NewFeatureService(options);
  return await service.execute(input);
}

/**
 * Batch processing for new feature
 * @param inputs - Array of inputs to process
 * @param options - Batch processing options
 * @returns Promise<BatchResult<NewFeatureResult>>
 */
export async function batchNewFeature(
  inputs: string[],
  options: BatchNewFeatureOptions = {}
): Promise<BatchResult<NewFeatureResult>> {
  const service = new NewFeatureService(options);
  return await service.executeBatch(inputs, options);
}

/**
 * Extract specific data only
 * @param input - Input parameter
 * @returns Promise<string[]>
 */
export async function extractNewFeatureData(
  input: string
): Promise<string[]> {
  const result = await executeNewFeature(input);
  return result.extractedData;
}
```

### 2. 클래스 기반 API

```typescript
// src/api/NewFeatureAnalyzer.ts
import { NewFeatureService } from '../services/NewFeatureService';
import type { 
  NewFeatureOptions, 
  NewFeatureResult,
  BatchResult 
} from '../types';

export interface NewFeatureAnalyzerConfig {
  enableCache?: boolean;
  cacheSize?: number;
  defaultTimeout?: number;
  customProcessor?: CustomProcessor;
}

export class NewFeatureAnalyzer {
  private service: NewFeatureService;
  private config: Required<NewFeatureAnalyzerConfig>;
  private cache: Map<string, NewFeatureResult> = new Map();

  constructor(config: NewFeatureAnalyzerConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheSize: config.cacheSize ?? 1000,
      defaultTimeout: config.defaultTimeout ?? 30000,
      customProcessor: config.customProcessor ?? null
    };
    
    this.service = new NewFeatureService({
      timeout: this.config.defaultTimeout,
      processor: this.config.customProcessor
    });
  }

  /**
   * Execute new feature with caching support
   */
  async execute(
    input: string, 
    options: NewFeatureOptions = {}
  ): Promise<NewFeatureResult> {
    const cacheKey = this.generateCacheKey(input, options);
    
    // Check cache first
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Execute service
    const result = await this.service.execute(input, options);
    
    // Cache result
    if (this.config.enableCache) {
      this.setCacheEntry(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Batch processing with concurrency control
   */
  async executeBatch(
    inputs: string[],
    options: BatchNewFeatureOptions = {}
  ): Promise<BatchResult<NewFeatureResult>> {
    return await this.service.executeBatch(inputs, {
      concurrency: options.concurrency ?? 5,
      continueOnError: options.continueOnError ?? true,
      useCache: this.config.enableCache,
      ...options
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      hitRate: this.calculateHitRate()
    };
  }

  private generateCacheKey(input: string, options: NewFeatureOptions): string {
    return `${input}:${JSON.stringify(options)}`;
  }

  private setCacheEntry(key: string, result: NewFeatureResult): void {
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }
}
```

### 3. 타입 정의

```typescript
// src/types/new-feature.ts
export interface NewFeatureOptions {
  timeout?: number;
  enableFeatureX?: boolean;
  customProcessor?: CustomProcessor;
  outputFormat?: 'json' | 'text' | 'summary';
}

export interface NewFeatureResult {
  input: string;
  success: boolean;
  processingTime: number;
  extractedData: string[];
  metadata: ResultMetadata;
  error?: ErrorInfo;
}

export interface BatchNewFeatureOptions extends NewFeatureOptions {
  concurrency?: number;
  continueOnError?: boolean;
  onProgress?: (completed: number, total: number) => void;
  onItemComplete?: (input: string, result: NewFeatureResult) => void;
  onItemError?: (input: string, error: Error) => void;
}

export interface ResultMetadata {
  version: string;
  timestamp: number;
  processingMode: string;
  customData?: Record<string, any>;
}
```

---

## 표준화 규칙

### 1. 네이밍 컨벤션

```typescript
// ✅ 올바른 네이밍
export async function analyzeNewFeature(input: string): Promise<NewFeatureResult> {}
export class NewFeatureAnalyzer {}
export interface NewFeatureOptions {}
export type NewFeatureResult = {};

// ❌ 잘못된 네이밍
export async function new_feature_analyze(input: string) {} // snake_case 사용
export class newFeatureAnalyzer {} // 클래스명 소문자 시작
export interface newFeatureOptions {} // 인터페이스명 소문자 시작
```

### 2. 에러 처리 패턴

```typescript
// src/services/NewFeatureService.ts
import { 
  NewFeatureError, 
  ValidationError, 
  TimeoutError,
  ErrorUtils 
} from '../errors';

export class NewFeatureService {
  async execute(input: string, options: NewFeatureOptions): Promise<NewFeatureResult> {
    try {
      // 1. 입력 검증
      this.validateInput(input, options);
      
      // 2. 처리 실행
      const result = await this.processInternal(input, options);
      
      // 3. 결과 검증
      this.validateResult(result);
      
      return result;
      
    } catch (error) {
      // 일관성 있는 에러 처리
      if (error instanceof ValidationError) {
        throw new NewFeatureError(
          'INPUT_VALIDATION_FAILED',
          `Invalid input: ${error.message}`,
          { input, options, originalError: error }
        );
      }
      
      if (error instanceof TimeoutError) {
        throw new NewFeatureError(
          'PROCESSING_TIMEOUT',
          `Processing timeout after ${options.timeout}ms`,
          { input, timeout: options.timeout }
        );
      }
      
      // 예상치 못한 에러
      throw ErrorUtils.wrapUnknownError(error, 'NEW_FEATURE_EXECUTION_FAILED', {
        input,
        options
      });
    }
  }

  private validateInput(input: string, options: NewFeatureOptions): void {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Input must be a non-empty string');
    }
    
    if (options.timeout && options.timeout < 1000) {
      throw new ValidationError('Timeout must be at least 1000ms');
    }
  }
}
```

### 3. 테스트 패턴

```typescript
// tests/new-feature.test.ts
import { executeNewFeature, NewFeatureAnalyzer } from '../src/api';
import { NewFeatureError } from '../src/errors';

describe('New Feature', () => {
  describe('Function API', () => {
    test('should process valid input successfully', async () => {
      const result = await executeNewFeature('test-input');
      
      expect(result.success).toBe(true);
      expect(result.input).toBe('test-input');
      expect(result.extractedData).toBeDefined();
      expect(typeof result.processingTime).toBe('number');
    });

    test('should handle invalid input gracefully', async () => {
      await expect(executeNewFeature('')).rejects.toThrow(NewFeatureError);
      await expect(executeNewFeature(null as any)).rejects.toThrow(ValidationError);
    });

    test('should respect timeout option', async () => {
      const promise = executeNewFeature('slow-input', { timeout: 100 });
      await expect(promise).rejects.toThrow(TimeoutError);
    }, 10000);
  });

  describe('Class API', () => {
    let analyzer: NewFeatureAnalyzer;

    beforeEach(() => {
      analyzer = new NewFeatureAnalyzer({
        enableCache: true,
        cacheSize: 100
      });
    });

    afterEach(() => {
      analyzer.clearCache();
    });

    test('should use caching correctly', async () => {
      const input = 'cache-test';
      
      // First call
      const result1 = await analyzer.execute(input);
      expect(result1.success).toBe(true);
      
      // Second call (should use cache)
      const result2 = await analyzer.execute(input);
      expect(result2).toEqual(result1);
      
      // Verify cache usage
      const stats = analyzer.getCacheStats();
      expect(stats.size).toBe(1);
    });

    test('should handle batch processing', async () => {
      const inputs = ['input1', 'input2', 'input3'];
      const batchResult = await analyzer.executeBatch(inputs);
      
      expect(batchResult.results).toHaveLength(3);
      expect(batchResult.summary.successfulFiles).toBe(3);
      expect(batchResult.summary.failedFiles).toBe(0);
    });
  });
});
```

---

## 실제 구현 예제

### 예제 1: Dependency Graph 분석기

```typescript
// 1. CLI 명령어 정의
export const dependencyGraphCommand: CommandDefinition = {
  name: 'analyze-graph',
  description: 'Analyze dependency relationships and detect cycles',
  
  arguments: [
    {
      name: 'directory',
      description: 'Directory to analyze',
      required: true,
      type: 'string'
    }
  ],
  
  options: [
    {
      name: 'detect-cycles',
      alias: 'c',
      description: 'Detect circular dependencies',
      type: 'boolean',
      default: true
    },
    {
      name: 'max-depth',
      alias: 'd',
      description: 'Maximum dependency depth',
      type: 'number',
      default: 10
    }
  ],
  
  execute: async (args, options) => {
    const service = new DependencyGraphService();
    const result = await service.analyzeDirectory(args[0], options);
    
    const formatter = new DependencyGraphFormatter();
    return formatter.format(result, options.format);
  }
};

// 2. API 함수 정의
export async function analyzeDependencyGraph(
  directory: string,
  options: DependencyGraphOptions = {}
): Promise<DependencyGraphResult> {
  const service = new DependencyGraphService();
  return await service.analyzeDirectory(directory, options);
}

export class DependencyGraphAnalyzer {
  async analyzeDirectory(
    directory: string,
    options: DependencyGraphOptions = {}
  ): Promise<DependencyGraphResult> {
    return await analyzeDependencyGraph(directory, options);
  }
  
  async detectCircularDependencies(
    directory: string
  ): Promise<CircularDependency[]> {
    const result = await this.analyzeDirectory(directory, { 
      detectCycles: true 
    });
    return result.circularDependencies;
  }
}

// 3. 서비스 구현
export class DependencyGraphService {
  async analyzeDirectory(
    directory: string, 
    options: DependencyGraphOptions
  ): Promise<DependencyGraphResult> {
    // 구현 로직...
    const graph = await this.buildDependencyGraph(directory);
    const cycles = options.detectCycles ? 
      await this.detectCycles(graph) : [];
    
    return {
      directory,
      totalFiles: graph.nodes.length,
      dependencies: graph.edges.length,
      circularDependencies: cycles,
      maxDepth: this.calculateMaxDepth(graph),
      processingTime: Date.now() - startTime
    };
  }
}
```

### 예제 2: Performance Profiler

```typescript
// CLI 구현
export const profileCommand: CommandDefinition = {
  name: 'profile',
  description: 'Profile TypeScript file parsing performance',
  
  execute: async (args, options) => {
    const profiler = new PerformanceProfiler();
    const result = await profiler.profileFile(args[0], options);
    return formatProfileResult(result, options.format);
  }
};

// API 구현
export async function profileTypeScriptFile(
  filePath: string,
  options: ProfileOptions = {}
): Promise<ProfileResult> {
  const profiler = new PerformanceProfiler();
  return await profiler.profileFile(filePath, options);
}

export class PerformanceProfiler {
  async profileFile(
    filePath: string,
    options: ProfileOptions
  ): Promise<ProfileResult> {
    const iterations = options.iterations ?? 100;
    const metrics: PerformanceMetric[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const metric = await this.runSingleProfile(filePath);
      metrics.push(metric);
    }
    
    return this.aggregateMetrics(metrics);
  }
  
  private async runSingleProfile(filePath: string): Promise<PerformanceMetric> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    // Execute analysis
    await analyzeTypeScriptFile(filePath);
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    return {
      executionTime: Number(endTime - startTime) / 1_000_000, // ms
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      timestamp: Date.now()
    };
  }
}
```

---

## 테스트 및 검증

### 1. 유닛 테스트

```typescript
// tests/unit/new-feature.test.ts
describe('NewFeatureService', () => {
  let service: NewFeatureService;
  
  beforeEach(() => {
    service = new NewFeatureService();
  });
  
  describe('input validation', () => {
    test('should validate required parameters', () => {
      expect(() => service.validateInput('')).toThrow(ValidationError);
      expect(() => service.validateInput(null)).toThrow(ValidationError);
    });
    
    test('should accept valid parameters', () => {
      expect(() => service.validateInput('valid-input')).not.toThrow();
    });
  });
  
  describe('processing logic', () => {
    test('should process valid input correctly', async () => {
      const result = await service.execute('test-input');
      
      expect(result.success).toBe(true);
      expect(result.extractedData).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});
```

### 2. 통합 테스트

```typescript
// tests/integration/new-feature-integration.test.ts
describe('New Feature Integration', () => {
  test('CLI and API should produce identical results', async () => {
    const input = 'integration-test-input';
    
    // CLI execution
    const cliResult = await executeCliCommand('new-command', [input]);
    const cliData = JSON.parse(cliResult.output);
    
    // API execution
    const apiResult = await executeNewFeature(input);
    
    // Compare core results (excluding CLI-specific metadata)
    expect(cliData.extractedData).toEqual(apiResult.extractedData);
    expect(cliData.success).toBe(apiResult.success);
  });
  
  test('should handle error cases consistently', async () => {
    const invalidInput = '';
    
    // Both should fail with same error type
    await expect(executeNewFeature(invalidInput)).rejects.toThrow(ValidationError);
    
    const cliResult = await executeCliCommand('new-command', [invalidInput]);
    expect(cliResult.success).toBe(false);
    expect(cliResult.exitCode).toBe(1);
  });
});
```

### 3. 성능 테스트

```typescript
// tests/performance/new-feature-performance.test.ts
describe('New Feature Performance', () => {
  test('should process small input quickly', async () => {
    const startTime = Date.now();
    
    await executeNewFeature('small-input');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Under 100ms
  });
  
  test('should handle batch processing efficiently', async () => {
    const inputs = Array.from({ length: 100 }, (_, i) => `input-${i}`);
    
    const startTime = Date.now();
    const result = await batchNewFeature(inputs, { concurrency: 5 });
    const duration = Date.now() - startTime;
    
    expect(result.results).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // Under 5 seconds
    expect(result.summary.averageTime).toBeLessThan(50); // Under 50ms per item
  });
});
```

---

## 체크리스트

새로운 확장 모듈을 구현할 때 다음 체크리스트를 확인하세요:

### ✅ 기본 구현
- [ ] CLI 명령어 정의 및 구현
- [ ] Function-based API 구현  
- [ ] Class-based API 구현
- [ ] TypeScript 타입 정의
- [ ] 에러 처리 및 검증

### ✅ 표준화 준수
- [ ] 네이밍 컨벤션 준수
- [ ] Clean Architecture 패턴 적용
- [ ] 일관성 있는 에러 처리
- [ ] 출력 형식 표준화 (json, text, summary, csv 등)

### ✅ 테스트 및 품질
- [ ] 유닛 테스트 작성 (90% 이상 커버리지)
- [ ] 통합 테스트 작성
- [ ] 성능 테스트 작성
- [ ] TypeScript 컴파일 에러 없음
- [ ] Lint 검사 통과

### ✅ 문서화
- [ ] API 문서 업데이트
- [ ] CLI 도움말 추가
- [ ] 사용 예제 작성
- [ ] README.md 업데이트

### ✅ 호환성
- [ ] 기존 CLI/API와 호환성 확인
- [ ] 의존성 충돌 없음
- [ ] Node.js 버전 호환성
- [ ] 크로스 플랫폼 동작 확인

---

이 가이드라인을 따르면 TypeScript File Analyzer의 아키텍처와 일관성 있는 확장 모듈을 구현할 수 있습니다.