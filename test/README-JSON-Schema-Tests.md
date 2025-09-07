# JSON Schema Integration Tests

JSON Schema 기반 기능들의 통합 테스트 가이드

## 개요

JSON Schema 시스템의 핵심 기능들을 검증하는 통합 테스트가 구현되어 있습니다:
- **User Schema System**: 유저 친화적 스키마 시스템
- **Config Schema System**: 설정 검증 시스템
- **Schema 호환성**: User Schema ↔ Config Schema 호환성
- **변환 파이프라인**: Schema → Notion initial_data_source 변환
- **에러 처리**: JSON Schema 기반 검증 및 에러 처리

## 실행 방법

### 단일 실행
```bash
# JSON Schema 통합 테스트만 실행
npm run test:json-schema

# 실시간 변경 감지 모드로 실행
npm run test:json-schema:watch
```

### 모든 테스트와 함께 실행
```bash
# 전체 테스트 스위트 실행
npm test

# 통합 테스트만 실행
npm run test:integration
```

## 테스트 구조

### 1. User Schema System Tests
- **Schema 로드 및 검증**: 스키마 파일 로딩과 기본 검증
- **관계형 시스템**: 양방향 관계, 자기참조, 관계 자동생성
- **Notion 변환**: User Schema → Notion Schema 변환
- **종속성 분석**: 데이터베이스 간 종속성 그래프 분석

### 2. Config Schema System Tests
- **설정 검증**: JSON Schema 기반 configuration 검증
- **통계 정보**: Config 통계 및 상태 정보
- **에러 감지**: 잘못된 설정에 대한 에러 감지

### 3. Schema 호환성 Tests
- **매핑 호환성**: User Schema 데이터베이스들이 Config에 올바르게 매핑되는지 확인

### 4. 변환 파이프라인 Tests
- **완전한 변환**: User Schema → Config → Notion 전체 파이프라인
- **성능 요구사항**: 변환 작업의 성능 검증 (500ms 이하)

### 5. 에러 처리 및 검증 Tests
- **스키마 검증**: 잘못된 스키마에 대한 graceful handling
- **의미있는 에러**: 명확한 에러 메시지 제공

## 테스트 결과 해석

### 성공 시 출력 예시
```bash
✓ test/integration/json-schema-integration.test.ts (13 tests) 18ms

🎯 JSON Schema 통합 테스트 결과:
   ✨ User Schema System: 완전 동작
   🔧 Config Schema System: 완전 동작
   🔗 Schema 호환성: 완벽 호환
   ⚡ 변환 파이프라인: 정상 작동
   🛡️  에러 검증: 올바른 검증

✅ 모든 JSON Schema 기반 기능이 정상 작동합니다!
```

### 주요 검증 사항
- **13개 테스트 모두 통과**: 모든 핵심 기능 검증 완료
- **성능 요구사항 충족**: 변환 작업 500ms 이하
- **에러 처리 검증**: 잘못된 입력에 대한 적절한 에러 처리
- **호환성 확인**: 시스템 간 완벽한 호환성

## 테스트 환경 설정

### Mock 설정
테스트는 실제 외부 의존성 없이 실행되도록 설계되었습니다:

```typescript
// bun:sqlite mock for vitest compatibility
vi.mock('bun:sqlite', () => ({
  Database: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    exec: vi.fn(),
    close: vi.fn()
  }))
}));

// bun:test mock
vi.mock('bun:test', () => ({}));
```

### 테스트 데이터
- 임시 프로젝트 구조 생성
- Mock 데이터베이스 ID 사용
- 실제 API 호출 없이 로직만 검증

## 문제 해결

### 1. bun:sqlite 모듈 에러
**문제**: `Cannot find package 'bun:sqlite'`
**해결**: Mock 설정이 올바르게 되어있는지 확인

### 2. 성능 테스트 실패  
**문제**: 변환 작업이 500ms를 초과
**해결**: 시스템 성능 확인 또는 임계값 조정

### 3. Schema 호환성 실패
**문제**: User Schema와 Config Schema 간 호환성 문제
**해결**: 스키마 정의 파일 확인 및 동기화

## 지속적 통합

### GitHub Actions 설정 예시
```yaml
- name: Run JSON Schema Tests
  run: npm run test:json-schema
  
- name: Check Test Coverage
  run: npm run test:coverage
```

### 개발 워크플로우
1. JSON Schema 관련 코드 변경
2. `npm run test:json-schema:watch` 실행
3. 실시간 테스트 결과 확인
4. 모든 테스트 통과 후 커밋

## 기여 가이드

### 새 테스트 추가
1. `test/integration/json-schema-integration.test.ts` 파일 수정
2. 적절한 describe 블록에 테스트 추가
3. Mock 데이터 사용하여 외부 의존성 제거
4. 성능 임계값 설정 (필요한 경우)

### 테스트 데이터 확장
1. `TestConfigFactory`에서 새 설정 추가
2. `TestDataFactory`에서 새 테스트 데이터 추가
3. Mock 서비스 확장 (필요한 경우)

## 관련 파일

### 테스트 파일
- `test/integration/json-schema-integration.test.ts` - 메인 테스트 파일
- `test/setup/test-framework.ts` - 테스트 프레임워크 설정

### 소스 파일
- `src/infrastructure/database/transformers/SchemaTransformer.ts` - 스키마 변환 로직
- `src/infrastructure/config/configManager.ts` - 설정 관리 로직
- `src/infrastructure/database/schemas/user-schema.json` - 유저 스키마 정의
- `src/infrastructure/config/deplink.config.schema.json` - 설정 스키마 정의

### 설정 파일
- `vitest.config.ts` - Vitest 설정 (bun 모듈 mock 포함)
- `package.json` - 테스트 스크립트 정의

---

**마지막 업데이트**: 2025년 1월  
**테스트 커버리지**: 13/13 테스트 통과 (100%)  
**성능 임계값**: 변환 작업 500ms 이하