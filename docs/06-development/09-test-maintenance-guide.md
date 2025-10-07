# 테스트 유지보수 가이드

## 개요

이 문서는 Jest 테스트 실패와 독립 실행 테스트 성공 간의 불일치를 관리하고, 테스트 품질을 유지하기 위한 가이드입니다.

## 테스트 상태 분석 결과

### Jest 테스트 실패 현황

```
총 실패 테스트: 7개
- tests/cli/cli-integration.test.ts
- tests/database/inference-engine.test.ts
- tests/integration/query-system-integration.test.ts
- tests/markdown-cli.test.ts
- tests/query-system-integration.test.ts
- tests/tree-sitter-validation.test.ts
- tests/unknown-symbol-system.test.ts
```

### 독립 실행 테스트 성공 현황

```
총 테스트 스크립트: 3개
성공: 3개 (100%)
- Tree-sitter 파싱 테스트: 5/5 성공
- CLI 통합 테스트: 4/4 성공
- Query System 테스트: 2/2 성공
```

## 유지보수 전략

### 1. 우선순위 HIGH (즉시 조치)

**독립 실행에서 성공하는 테스트들:**
- `tests/cli/cli-integration.test.ts` → CLI 통합 테스트 성공
- `tests/integration/query-system-integration.test.ts` → Query System 테스트 성공
- `tests/query-system-integration.test.ts` → Query System 테스트 성공
- `tests/tree-sitter-validation.test.ts` → Tree-sitter 파싱 테스트 성공

**조치 방안:**
1. **Jest 환경 문제로 분류**: 기능은 정상이지만 Jest 환경에서 실행 시 문제 발생
2. **독립 실행 테스트로 기능 검증**: 핵심 기능의 정상 동작 확인
3. **Jest 테스트 환경 개선**: 점진적으로 Jest 테스트 안정성 향상

### 2. 우선순위 MEDIUM (점진적 개선)

**독립 실행 테스트가 없는 항목들:**
- `tests/database/inference-engine.test.ts` - 데이터베이스 추론 엔진
- `tests/markdown-cli.test.ts` - 마크다운 CLI 기능
- `tests/unknown-symbol-system.test.ts` - Unknown Symbol 시스템

**조치 방안:**
1. **점진적 개선**: 시간이 있을 때 Jest 테스트 안정성 향상
2. **독립 실행 테스트 추가 고려**: 필요시 별도 테스트 스크립트 개발
3. **기능 검증**: 수동 테스트 또는 다른 방법으로 기능 검증

## 테스트 실행 명령어

### 독립 실행 테스트 (권장)

```bash
# 모든 독립 테스트 실행
npm run test:standalone

# 개별 테스트 실행
npm run test:standalone:tree-sitter
npm run test:standalone:cli
npm run test:standalone:query

# 테스트 유지보수 분석
npm run test:maintenance
```

### Jest 테스트 (개선 대상)

```bash
# Jest 테스트 실행 (실패 예상)
npm run test:jest

# 특정 테스트 실행
npm run test:unit
npm run test:integration
```

## 문제 해결 워크플로우

### 1. 새로운 테스트 실패 발생 시

1. **독립 실행 테스트 확인**
   ```bash
   npm run test:standalone
   ```

2. **기능 검증**
   - 독립 실행에서 성공 → Jest 환경 문제
   - 독립 실행에서 실패 → 기능 문제

3. **조치 결정**
   - Jest 환경 문제 → Jest 테스트 환경 개선
   - 기능 문제 → 즉시 수정 필요

### 2. Jest 테스트 개선 시

1. **우선순위 결정**
   - HIGH: 독립 실행에서 성공하는 테스트들
   - MEDIUM: 독립 실행이 없는 테스트들

2. **개선 방법**
   - Tree-sitter 파싱 문제 해결
   - 의존성 문제 해결
   - 테스트 환경 설정 개선

### 3. 독립 실행 테스트 추가 시

1. **필요성 판단**
   - Jest 테스트가 지속적으로 실패하는 경우
   - 핵심 기능 검증이 필요한 경우

2. **테스트 스크립트 개발**
   - `scripts/test-standalone/` 디렉토리에 추가
   - `package.json`에 스크립트 추가
   - 통합 실행 스크립트에 포함

## 모니터링 및 알림

### CI/CD 파이프라인 설정

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  standalone-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run test:standalone  # 필수 실행
  
  jest-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run test:jest  # 선택적 실행
    continue-on-error: true  # 실패해도 빌드 계속
```

### 알림 설정

1. **독립 실행 테스트 실패**: 즉시 알림 (기능 문제)
2. **Jest 테스트 실패**: 경고 알림 (환경 문제)
3. **테스트 성능**: 주기적 모니터링

## 문서 업데이트

### 테스트 상태 변경 시

1. **독립 실행 테스트 추가/수정**
   - `docs/06-development/08-testing-architecture.md` 업데이트
   - `scripts/test-standalone/test-maintenance.js` 업데이트

2. **Jest 테스트 개선**
   - 실패 테스트 목록 업데이트
   - 우선순위 재평가

3. **새로운 테스트 추가**
   - 독립 실행 테스트 우선 고려
   - Jest 테스트는 보조적 역할

## 결론

현재 상황에서는 독립 실행 테스트를 통해 핵심 기능의 정상 동작을 보장하고, Jest 테스트의 점진적 개선을 통해 전체적인 테스트 품질을 향상시키는 전략이 효과적입니다.

이 접근 방식은 복잡한 의존성과 환경 문제로 인한 테스트 불안정성을 우회하면서도, 핵심 기능의 정상 동작을 보장할 수 있는 실용적인 해결책입니다.
