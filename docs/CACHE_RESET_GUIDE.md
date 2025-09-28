# 🔄 캐시 리셋 완전 가이드

## 📋 개요

dependency-linker는 다층 캐시 아키텍처를 사용하며, 각 레벨에서 캐시를 리셋할 수 있는 다양한 방법을 제공합니다. 이 가이드는 각 리셋 방법의 용도와 사용법을 상세히 설명합니다.

## 🏗️ 캐시 아키텍처 레벨

```
┌─────────────────────────────────────┐
│        사용자 인터페이스 레벨          │
├─────────────────────────────────────┤
│    TypeScriptAnalyzer 인스턴스       │ ← analyzer.clearCache()
├─────────────────────────────────────┤
│      팩토리 관리 인스턴스             │ ← resetFactoryAnalyzers()
├─────────────────────────────────────┤
│      공유 팩토리 인스턴스             │ ← resetSharedAnalyzer()
├─────────────────────────────────────┤
│      AnalysisEngine 캐시            │ ← engine.clearCache()
└─────────────────────────────────────┘
```

## 📖 캐시 리셋 방법별 가이드

### 1. **개별 인스턴스 리셋** - `analyzer.clearCache()`

**용도**: 특정 TypeScriptAnalyzer 인스턴스의 캐시만 제거
**범위**: 해당 인스턴스만
**영향**: 다른 인스턴스에는 영향 없음

```typescript
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer({ enableCache: true });

// 사용 후 개별 캐시 정리
analyzer.clearCache();

// 주의: 이 방법은 실제로는 AnalysisEngine 레벨에서 캐시가 동작하므로
// TypeScriptAnalyzer 레벨에서는 제한적인 효과가 있을 수 있습니다
```

**언제 사용할지**:
- 특정 인스턴스만 초기화가 필요한 경우
- 메모리 절약을 위해 사용 완료된 인스턴스 정리
- 단위 테스트에서 개별 테스트 케이스 격리

### 2. **AnalysisEngine 캐시 리셋** - `engine.clearCache()`

**용도**: 실제 캐시 데이터가 저장된 AnalysisEngine 레벨 정리
**범위**: 해당 엔진 인스턴스의 모든 캐시
**영향**: 가장 효과적인 캐시 리셋 방법

```typescript
import { AnalysisEngine } from '@context-action/dependency-linker';
import { createDefaultAnalysisConfig } from '@context-action/dependency-linker';

const config = createDefaultAnalysisConfig();
config.useCache = true;
const engine = new AnalysisEngine(config);

// 실제 캐시 데이터 생성
await engine.analyzeFile('./src/example.ts', config);

// 캐시 상태 확인
console.log('캐시 클리어 전:', engine.getCacheStats());

// 실제 캐시 데이터 삭제
engine.clearCache();

// 캐시 클리어 확인
console.log('캐시 클리어 후:', engine.getCacheStats());
```

**언제 사용할지**:
- 실제 캐시 데이터를 완전히 삭제하고 싶을 때
- AnalysisEngine을 직접 사용하는 경우
- 캐시 관련 디버깅이나 성능 테스트

### 3. **팩토리 전체 리셋** - `resetFactoryAnalyzers()`

**용도**: 팩토리 함수로 관리되는 모든 analyzer 인스턴스 초기화
**범위**: 팩토리가 관리하는 모든 인스턴스
**영향**: 팩토리 캐시와 인스턴스 풀 완전 초기화

```typescript
import { resetFactoryAnalyzers, analyzeTypeScriptFile } from '@context-action/dependency-linker';

// 팩토리 함수 사용으로 내부 캐시 생성
await analyzeTypeScriptFile('./src/example.ts');
await analyzeTypeScriptFile('./src/another.ts');

// 모든 팩토리 관리 analyzer 리셋
resetFactoryAnalyzers();

// 이후 팩토리 함수 호출 시 새로운 인스턴스 생성
await analyzeTypeScriptFile('./src/example.ts'); // 새로운 분석
```

**언제 사용할지**:
- 애플리케이션 전체 초기화
- 테스트 스위트 간 완전한 격리 필요
- 메모리 사용량 최적화

### 4. **공유 인스턴스 리셋** - `resetSharedAnalyzer()`

**용도**: 팩토리가 사용하는 공유 analyzer 인스턴스만 초기화
**범위**: 공유 인스턴스만
**영향**: 다른 팩토리 관리 인스턴스에는 영향 없음

```typescript
import { resetSharedAnalyzer, analyzeTypeScriptFile } from '@context-action/dependency-linker';

// 공유 인스턴스 사용
await analyzeTypeScriptFile('./src/example.ts');

// 공유 인스턴스만 리셋
resetSharedAnalyzer();

// 다음 호출 시 새로운 공유 인스턴스 생성
await analyzeTypeScriptFile('./src/example.ts');
```

**언제 사용할지**:
- 공유 인스턴스의 상태만 초기화 필요
- 부분적인 팩토리 정리
- 특정 세션 또는 작업 그룹 완료 후

## 🧪 테스트 환경에서 권장 패턴

### Jest/Mocha 테스트 스위트

```typescript
import { resetFactoryAnalyzers, resetSharedAnalyzer } from '@context-action/dependency-linker';

describe('Dependency Analysis Tests', () => {
  beforeEach(() => {
    // 각 테스트 전 완전 초기화
    resetFactoryAnalyzers();
    resetSharedAnalyzer();
  });

  afterAll(() => {
    // 테스트 완료 후 정리
    resetFactoryAnalyzers();
    resetSharedAnalyzer();
  });
});
```

### 통합 테스트

```typescript
import { AnalysisEngine } from '@context-action/dependency-linker';
import { createDefaultAnalysisConfig } from '@context-action/dependency-linker';

describe('Integration Tests', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    const config = createDefaultAnalysisConfig();
    config.useCache = true;
    engine = new AnalysisEngine(config);
  });

  afterEach(() => {
    // 엔진 레벨 캐시 정리
    engine.clearCache();
  });
});
```

## ⚠️ 중요한 주의사항

### 1. 캐시 레벨 이해
- `TypeScriptAnalyzer.clearCache()`는 실제로는 AnalysisEngine 레벨에서 동작
- `useNewEngine: true` 설정으로 인해 실제 캐싱은 AnalysisEngine에서 발생
- 가장 확실한 캐시 리셋은 `AnalysisEngine.clearCache()` 사용

### 2. 성능 영향
```typescript
// ❌ 잘못된 사용 - 매번 리셋하면 캐시 효과 없음
for (const file of files) {
  analyzer.clearCache(); // 매번 리셋하면 성능 저하
  await analyzer.analyzeFile(file);
}

// ✅ 올바른 사용 - 필요할 때만 리셋
const analyzer = new TypeScriptAnalyzer({ enableCache: true });
await analyzer.analyzeFile('./src/file1.ts'); // 캐시 생성
await analyzer.analyzeFile('./src/file1.ts'); // 캐시 히트
// 작업 완료 후 한 번만 정리
analyzer.clearCache();
```

### 3. 메모리 관리
```typescript
// 장시간 실행되는 애플리케이션에서 주기적 정리
setInterval(() => {
  if (shouldCleanCache()) {
    resetFactoryAnalyzers();
    resetSharedAnalyzer();
  }
}, 30 * 60 * 1000); // 30분마다
```

## 📊 리셋 효과 검증

### 캐시 통계 확인
```typescript
import { AnalysisEngine } from '@context-action/dependency-linker';

const engine = new AnalysisEngine(config);

// 캐시 사용 전
console.log('리셋 전:', engine.getCacheStats());
// 출력: { totalEntries: 5, totalHits: 10, totalMisses: 3, hitRate: 0.77 }

engine.clearCache();

// 캐시 리셋 후
console.log('리셋 후:', engine.getCacheStats());
// 출력: { totalEntries: 0, totalHits: 0, totalMisses: 0, hitRate: 0 }
```

### 성능 변화 측정
```typescript
// 성능 측정으로 리셋 효과 확인
const start1 = Date.now();
await engine.analyzeFile('./test-file.ts');
const time1 = Date.now() - start1;

const start2 = Date.now();
await engine.analyzeFile('./test-file.ts'); // 캐시 히트 예상
const time2 = Date.now() - start2;

engine.clearCache();

const start3 = Date.now();
await engine.analyzeFile('./test-file.ts'); // 캐시 미스 예상
const time3 = Date.now() - start3;

console.log(`첫 분석: ${time1}ms, 캐시 히트: ${time2}ms, 리셋 후: ${time3}ms`);
// 예상: 첫 분석과 리셋 후 시간이 비슷하고, 캐시 히트가 훨씬 빠름
```

## 🔗 관련 문서

- **[캐시 관리 전체 가이드](./CACHE_MANAGEMENT.md)** - 캐시 시스템 전반적 이해
- **[캐시 플로우 다이어그램](./CACHE_FLOW_DIAGRAM.md)** - 캐시 동작 원리
- **[API 문서](./API.md)** - 전체 API 레퍼런스
- **[README](../README.md)** - 빠른 시작 가이드

## 📝 요약

| 방법 | 범위 | 용도 | 효과 |
|------|------|------|------|
| `analyzer.clearCache()` | 개별 인스턴스 | 특정 인스턴스 정리 | 제한적 |
| `engine.clearCache()` | 엔진 레벨 | 실제 캐시 데이터 삭제 | 완전함 |
| `resetFactoryAnalyzers()` | 팩토리 전체 | 애플리케이션 초기화 | 광범위 |
| `resetSharedAnalyzer()` | 공유 인스턴스 | 부분 초기화 | 선택적 |

가장 확실한 캐시 리셋은 **`AnalysisEngine.clearCache()`**이며, 테스트 환경에서는 **`resetFactoryAnalyzers()`와 `resetSharedAnalyzer()`를 함께 사용**하는 것을 권장합니다.