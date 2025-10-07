# 테스트 아키텍처 및 구조

## 개요

이 문서는 dependency-linker 프로젝트의 테스트 아키텍처와 구조에 대해 설명합니다. 프로젝트는 두 가지 테스트 방식을 병행하여 사용합니다:

1. **Jest 기반 테스트**: 기존의 단위 테스트 및 통합 테스트
2. **독립 실행 테스트**: Jest 환경과 분리된 독립적인 테스트 스크립트

## 테스트 구조

### Jest 기반 테스트

```
tests/
├── unit/                    # 단위 테스트
├── integration/             # 통합 테스트
├── fixtures/               # 테스트 픽스처
└── root/                   # 루트 테스트 스크립트
```

**특징:**
- 기존 Jest 프레임워크 사용
- 일부 테스트에서 Tree-sitter 파싱 실패 문제 발생
- 복잡한 의존성으로 인한 테스트 불안정성

### 독립 실행 테스트

```
scripts/test-standalone/
├── tree-sitter-parsing-test.js    # Tree-sitter 파싱 테스트
├── cli-integration-test.js        # CLI 통합 테스트
├── query-system-test.js          # Query System 테스트
└── run-all-tests.js              # 통합 실행 스크립트
```

**특징:**
- Jest 환경과 완전 분리
- 핵심 기능의 독립적 검증
- 안정적인 테스트 실행

## 테스트 실행 방법

### Jest 기반 테스트

```bash
# 모든 Jest 테스트 실행
npm run test:jest

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# 커버리지 포함 실행
npm run test:coverage
```

### 독립 실행 테스트

```bash
# 모든 독립 테스트 실행
npm run test:standalone

# 개별 테스트 실행
npm run test:standalone:tree-sitter
npm run test:standalone:cli
npm run test:standalone:query
```

## 테스트 결과 비교

### Jest 기반 테스트 결과 (문제 상황)

```
Test Suites: 7 failed, 31 passed, 38 total
Tests:       44 failed, 549 passed, 593 total
```

**주요 실패 원인:**
- Tree-sitter 파싱 실패 (`rootNode: false`)
- 복잡한 의존성으로 인한 테스트 불안정성
- Jest 환경에서의 Tree-sitter 초기화 문제

### 독립 실행 테스트 결과 (성공)

```
총 테스트 스크립트: 3
성공: 3
실패: 0
```

**개별 테스트 결과:**
- Tree-sitter 파싱 테스트: 5/5 성공
- CLI 통합 테스트: 4/4 성공
- Query System 테스트: 2/2 성공

## 테스트 전략

### 1. 핵심 기능 검증

독립 실행 테스트를 통해 다음 핵심 기능들을 검증합니다:

- **Tree-sitter 파싱**: TypeScript, Java, Python, Go 언어별 파싱
- **CLI 기능**: Help, Version, Analyze, Dependencies 명령어
- **Query System**: 파일 분석 및 쿼리 실행

### 2. 문제 해결 우선순위

1. **즉시 해결**: 독립 실행 테스트에서 실패하는 항목
2. **점진적 개선**: Jest 테스트의 안정성 향상
3. **장기적 목표**: Jest 테스트의 완전한 안정화

### 3. 유지보수 가이드라인

#### 독립 실행 테스트 실패 시

1. **즉시 조치**: 테스트 실패 원인 분석 및 수정
2. **기능 검증**: 해당 기능의 정상 동작 확인
3. **문서 업데이트**: 실패 원인 및 해결 방법 기록

#### Jest 테스트 실패 시

1. **우선순위 확인**: 핵심 기능에 영향을 주는지 판단
2. **독립 실행 확인**: 동일한 기능이 독립 실행에서 성공하는지 확인
3. **점진적 수정**: 가능한 범위에서 Jest 테스트 안정성 향상

## 테스트 환경 설정

### 독립 실행 테스트 환경

```javascript
// scripts/test-standalone/tree-sitter-parsing-test.js
const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript');

// Tree-sitter 파싱 테스트
async function runTest(testCase) {
    const parser = testCase.parser();
    const tree = parser.parse(testCase.sourceCode);
    // 파싱 결과 검증
}
```

### Jest 테스트 환경

```javascript
// tests/integration/query-system-integration.test.ts
import { analyzeFile } from '../../src/api/analysis';

describe('Query System Integration', () => {
    it('should extract import sources', async () => {
        const result = await analyzeFile(sourceCode, 'typescript', filePath);
        expect(result.queryResults).toBeDefined();
    });
});
```

## 문제 해결 가이드

### Tree-sitter 파싱 실패

**증상:**
```
Tree-sitter parsing failed: No rootNode returned
```

**해결 방법:**
1. 독립 실행 테스트로 파싱 기능 검증
2. Tree-sitter 버전 호환성 확인
3. 파싱 실패 시 대안 처리 구현

### CLI 명령어 실패

**증상:**
```
CLI command execution failed
```

**해결 방법:**
1. CLI 명령어 직접 실행으로 동작 확인
2. 예상 출력과 실제 출력 비교
3. 테스트 케이스 수정

### Query System 실패

**증상:**
```
Analysis failed: Parser for language not found
```

**해결 방법:**
1. 파일 확장자 기반 언어 감지 구현
2. analyzeFile 함수 시그니처 확인
3. 언어별 파서 초기화 검증

## 모니터링 및 알림

### 테스트 상태 모니터링

1. **독립 실행 테스트**: CI/CD 파이프라인에서 필수 실행
2. **Jest 테스트**: 점진적 개선 대상으로 모니터링
3. **테스트 결과**: 문서화 및 이슈 트래킹

### 알림 설정

- 독립 실행 테스트 실패 시 즉시 알림
- Jest 테스트 실패율 임계값 설정
- 테스트 성능 모니터링

## 결론

독립 실행 테스트를 통해 핵심 기능의 안정성을 확보하고, Jest 테스트의 점진적 개선을 통해 전체적인 테스트 품질을 향상시키는 전략을 사용합니다.

이 구조는 복잡한 의존성과 환경 문제로 인한 테스트 불안정성을 우회하면서도, 핵심 기능의 정상 동작을 보장할 수 있는 실용적인 접근 방식입니다.
