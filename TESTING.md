# 테스트 가이드

## 🧪 테스트 실행 방법

### 기본 테스트 실행
```bash
npm test
```
**완전한 테스트 스위트 실행** - 빌드, Jest, 핵심 기능, 통합, 성능, 고급 기능 테스트를 모두 실행합니다.

### 빠른 테스트 실행
```bash
npm run test:quick
```
**핵심 기능 중심 테스트** - 빌드 후 핵심 기능만 빠르게 테스트합니다.

### 개별 테스트 실행

#### Jest 테스트만 실행
```bash
npm run test:jest
```
**Jest 기반 단위 테스트** - 기존 Jest 설정으로 테스트를 실행합니다.

#### 핵심 기능 테스트만 실행
```bash
npm run test:core
```
**핵심 기능 테스트** - 데이터베이스, Edge Type Registry, 추론 엔진, 파일 분석, 성능 기능을 테스트합니다.

#### 통합 테스트만 실행
```bash
npm run test:integration-only
```
**통합 테스트** - 완전한 워크플로우, 성능 통합, 에러 처리, 확장성을 테스트합니다.

#### 모든 테스트 순차 실행
```bash
npm run test:all
```
**모든 테스트 순차 실행** - Jest → 핵심 기능 → 통합 테스트를 순서대로 실행합니다.

### 고급 테스트 옵션

#### Jest 관련 테스트
```bash
npm run test:parallel    # 병렬 실행
npm run test:watch       # 감시 모드
npm run test:coverage    # 커버리지 포함
npm run test:unit        # 단위 테스트만
npm run test:integration # 통합 테스트만
```

## 📊 테스트 결과 해석

### 성공률 기준
- **90% 이상**: 🎉 우수한 성능! 프로덕션 준비 완료
- **75-89%**: ✅ 양호한 성능! 일부 개선 권장
- **75% 미만**: ⚠️ 개선 필요! 추가 테스트 및 수정 권장

### 테스트 카테고리

#### 1. 빌드 테스트
- TypeScript 컴파일
- dist 디렉토리 생성 확인
- 메인 파일 및 타입 파일 존재 확인

#### 2. Jest 테스트
- 기존 Jest 설정 기반 단위 테스트
- 테스트 파일별 실행 결과
- 실패/성공 테스트 개수

#### 3. 핵심 기능 테스트
- **데이터베이스 작업**: 노드 생성/조회, 관계 생성/조회
- **Edge Type Registry**: 타입 등록, 조회, 통계
- **추론 엔진**: 전이적/계층적 추론
- **파일 분석**: TypeScript 파일 파싱
- **성능 기능**: LRU 캐시, 성능 모니터링

#### 4. 통합 테스트
- **완전한 워크플로우**: 파일 분석 → 노드 저장 → 추론 → 쿼리
- **성능 통합**: 최적화된 엔진 성능 테스트
- **에러 처리**: 잘못된 입력 처리
- **확장성**: 대량 데이터 처리 성능

#### 5. 성능 테스트
- **파싱 성능**: TypeScript 파일 분석 속도
- **실행 시간**: 전체 테스트 실행 시간
- **메모리 사용량**: 대용량 데이터 처리

#### 6. 고급 기능 테스트
- **Edge Type Registry 고급 기능**: 전이적/상속 가능한 타입
- **데이터베이스 고급 기능**: 대량 노드 생성 성능
- **배치 처리**: 여러 작업 동시 실행

## 🔧 테스트 커스터마이징

### 개별 테스트 파일 실행
```bash
# 핵심 기능 테스트
node test-core-features.js

# 통합 테스트
node test-integration.js

# 종합 테스트 스위트
node test-suite.js

# 완전한 테스트 스위트
node test-complete.js
```

### 테스트 타임아웃 설정
각 테스트는 30초 타임아웃이 설정되어 있습니다. 필요시 코드에서 수정 가능합니다.

### 성능 기준 조정
테스트에서 사용하는 성능 기준값들을 조정하려면 각 테스트 파일의 설정값을 수정하세요.

## 📈 성능 지표

### 예상 성능 지표
- **파싱 속도**: 5-10ms (일반적인 TypeScript 파일)
- **노드 생성**: 8,000+ nodes/sec
- **관계 생성**: 13,000+ rels/sec
- **캐시 히트율**: 0.8+ (80% 이상)

### 성능 최적화 팁
1. **캐시 크기 조정**: `cacheSize` 설정으로 메모리 사용량 조절
2. **배치 처리**: 여러 작업을 동시에 실행하여 성능 향상
3. **인덱스 최적화**: 데이터베이스 쿼리 성능 향상

## 🚨 문제 해결

### 일반적인 문제들

#### 빌드 실패
```bash
npm run build:clean  # 깨끗한 빌드
```

#### 테스트 타임아웃
- 테스트 파일의 타임아웃 설정 확인
- 시스템 리소스 상태 확인

#### 메모리 부족
- 캐시 크기 줄이기
- 배치 크기 조정

#### Jest 테스트 실패
```bash
npm run test:jest -- --verbose  # 상세 로그 확인
```

### 디버깅
```bash
# 상세 로그와 함께 테스트 실행
DEBUG=* npm test

# 특정 테스트만 실행
npm run test:core
```

## 📝 테스트 결과 저장

테스트 결과는 콘솔에 출력되며, 필요시 파일로 저장할 수 있습니다:

```bash
npm test > test-results.log 2>&1
```

## 🔄 CI/CD 통합

### GitHub Actions 예시
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

### 성공 기준
- 모든 테스트 통과 (100% 성공률)
- 성능 지표 기준 충족
- 메모리 누수 없음
- 타임아웃 없음

## 📚 추가 리소스

- [핵심 기능 문서](./docs/FEATURE-OVERVIEW.md)
- [API 참조](./docs/API-REFERENCE.md)
- [사용자 가이드](./docs/USER-GUIDE.md)
- [개선 보고서](./docs/IMPROVEMENT-REPORT.md)
