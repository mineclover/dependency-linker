# 테스트 환경 가이드 (Test Environment Guide)

개선된 테스트 환경 구성 및 실제 API를 사용하는 테스트 가이드

## 개요 (Overview)

프로젝트의 테스트 환경은 다음과 같은 계층으로 구성됩니다:

1. **Unit Tests** - 순수한 로직 테스트 (Mock 사용)
2. **JSON Schema Integration Tests** - Schema 시스템 통합 테스트 (Mock API 사용)  
3. **Real API Integration Tests** - 실제 Notion API 통합 테스트 (실제 API 키 + 테스트 DB)
4. **E2E Tests** - 완전한 워크플로우 테스트

## 테스트 환경 구성

### 환경 변수 설정

#### 1. `.env.test` (테스트 전용 환경)
```bash
# Test Environment Configuration
NOTION_API_KEY=ntn_your_real_api_key_here
NOTION_WORKSPACE_URL=https://www.notion.so/your-workspace
DEPLINK_ENVIRONMENT=test
NODE_ENV=test

# Test-specific Parent Page (별도 테스트 워크스페이스)
NOTION_PARENT_PAGE_ID=your_test_parent_page_id

# Test Database IDs (기존 테스트 환경의 DB 사용)
NOTION_TEST_FILES_DB_ID=your_test_files_db_id
NOTION_TEST_FUNCTIONS_DB_ID=your_test_functions_db_id  
NOTION_TEST_DOCS_DB_ID=your_test_docs_db_id
```

#### 2. `.env` (개발 환경)
```bash
NOTION_API_KEY=ntn_your_real_api_key_here
NOTION_PARENT_PAGE_ID=your_dev_parent_page_id
NOTION_WORKSPACE_URL=https://www.notion.so/your-workspace
```

### 테스트 타입별 실행

#### JSON Schema 통합 테스트 (Mock API)
```bash
# JSON Schema 기능 테스트 - Mock API 사용
npm run test:json-schema

# Watch mode
npm run test:json-schema:watch
```

#### Real API 통합 테스트 (실제 API)
```bash
# 실제 Notion API를 사용한 통합 테스트
npm run test:real-api

# Watch mode  
npm run test:real-api:watch
```

#### 전체 테스트 스위트
```bash
# 모든 테스트 실행
npm test

# 특정 테스트 타입만 실행
npm run test:unit        # 단위 테스트
npm run test:integration # 통합 테스트
npm run test:e2e        # E2E 테스트
```

## 테스트 환경의 특징

### 1. JSON Schema Integration Tests
- **파일**: `test/integration/json-schema-integration.test.ts`
- **특징**: Mock API 키 사용, 빠른 실행, CI/CD 친화적
- **목적**: JSON Schema 변환 로직 검증
- **의존성**: 외부 API 없음

```typescript
// Mock 환경에서 실행
TestEnvironment.setupEnvironment({
  NOTION_API_KEY: 'test-mock-key',
  DEPLINK_ENVIRONMENT: 'test'
});
```

### 2. Real API Integration Tests  
- **파일**: `test/integration/real-api-integration.test.ts`
- **특징**: 실제 API 키 사용, 테스트 전용 DB, CI에서 스킵
- **목적**: 실제 Notion API와의 통합 검증
- **의존성**: 실제 Notion API 키 필요

```typescript
// 실제 API 환경에서 실행
TestEnvironment.setupIntegrationEnvironment({
  NOTION_PARENT_PAGE_ID: '267485837460816fb3a5c8b64fa7846f',
  // 테스트 전용 데이터베이스 ID들...
});
```

### 3. Environment Separation (환경 분리)

#### TestEnvironment 클래스 기능
```typescript
// 기본 테스트 환경 (Mock)
TestEnvironment.setupEnvironment(env, false);

// 실제 API 테스트 환경
TestEnvironment.setupEnvironment(env, true);

// 통합 테스트 전용 환경
TestEnvironment.setupIntegrationEnvironment(env);
```

## 테스트 데이터베이스 관리

### 테스트 전용 데이터베이스
테스트에서는 별도의 테스트 전용 Notion 데이터베이스를 사용합니다:

```javascript
const TEST_DATABASE_IDS = {
  files: '76a4b221-f887-47f3-9d11-49d6df1c759c',
  functions: '10f72c0f-b9a6-4984-871d-ca5a37a12f7b', 
  docs: '5be6d1be-89cd-4a16-8aa4-10f43c973aba'
};
```

### 테스트 환경 격리
- **개발 환경**: 실제 프로젝트 데이터베이스 사용
- **테스트 환경**: 별도 테스트 워크스페이스의 테스트 DB 사용
- **CI 환경**: Mock만 사용, 실제 API 호출 없음

## CI/CD 고려사항

### GitHub Actions 설정 예시
```yaml
- name: Run Unit and Mock Integration Tests
  run: |
    npm run test:unit
    npm run test:json-schema
    
- name: Run Real API Tests (Optional)
  if: ${{ !env.CI }}  # CI에서는 스킵
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
  run: npm run test:real-api
```

### CI 환경에서의 테스트 동작
- **Unit Tests**: 항상 실행
- **JSON Schema Tests**: 항상 실행 (Mock 사용)
- **Real API Tests**: CI에서 자동 스킵
- **E2E Tests**: 필요시에만 실행

## 문제 해결 (Troubleshooting)

### 1. API 키 관련 문제
```bash
# API 키 형식 확인
echo $NOTION_API_KEY | grep "^ntn_"

# 환경변수 로딩 확인
npm run test:real-api | grep "Using real Notion API key"
```

### 2. bun:sqlite 모듈 에러
모든 vitest 테스트 파일에는 다음 mock이 포함되어야 합니다:
```typescript
vi.mock('bun:sqlite', () => ({
  Database: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    exec: vi.fn(), 
    close: vi.fn()
  }))
}));
```

### 3. 테스트 DB 연결 문제
```bash
# 테스트 DB ID 확인
echo "Files DB: $NOTION_TEST_FILES_DB_ID"
echo "Functions DB: $NOTION_TEST_FUNCTIONS_DB_ID"
echo "Docs DB: $NOTION_TEST_DOCS_DB_ID"
```

## 모범 사례 (Best Practices)

### 1. 테스트 격리
- 각 테스트는 독립적으로 실행 가능해야 함
- 테스트간 상태 공유 금지
- 적절한 setup/cleanup 구현

### 2. API 키 보안
- `.env.test` 파일은 .gitignore에 포함
- 실제 API 키는 로컬 개발환경에서만 사용
- CI에서는 필요시 secrets 사용

### 3. 성능 고려
- Mock 테스트는 빠르게 (< 100ms)
- Real API 테스트는 합리적인 시간내 (< 1s)
- 필요없는 API 호출 방지

### 4. 에러 처리
- 네트워크 실패에 대한 graceful handling
- API 키 없을 때의 적절한 skip 처리
- 명확한 에러 메시지 제공

---

**마지막 업데이트**: 2025년 1월  
**담당자**: 개발팀  
**문의**: 테스트 환경 문제시 이슈 트래커 사용