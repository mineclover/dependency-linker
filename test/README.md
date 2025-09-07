# 테스트 시스템 가이드

## 📁 디렉토리 구조

```
test/
├── fixtures/           # 테스트용 샘플 파일들
├── helpers/           # 테스트 유틸리티와 설정
├── integration/       # 통합 테스트 (실제 Notion API 사용)
├── unit/             # 단위 테스트 (모킹된 환경)
└── temp/            # 테스트 중 생성되는 임시 파일들
```

## 🚀 테스트 실행

### 전체 테스트 실행
```bash
bun test
```

### 단위 테스트만 실행
```bash
bun test test/unit
```

### 통합 테스트만 실행 (Notion API 필요)
```bash
bun test test/integration
```

### 특정 테스트 파일 실행
```bash
bun test test/unit/enhanced-markdown-processor.test.ts
```

### 감시 모드로 실행
```bash
bun test --watch
```

## 🔧 테스트 환경 관리

### 🌍 환경 분리 전략

테스트 환경은 다음과 같이 분리되어 관리됩니다:

- **로컬 개발 환경**: 개발자 개인 워크스페이스
- **CI/CD 환경**: GitHub Actions 자동화
- **공유 테스트 환경**: 팀 공용 테스트 워크스페이스

### 📋 통합 테스트를 위한 환경 변수

통합 테스트를 실행하려면 다음 환경 변수가 필요합니다:

```bash
# .env 파일에 추가하거나 환경 변수로 설정
NOTION_API_KEY=your_notion_api_key_here                    # 필수: 노션 API 키
TEST_PARENT_PAGE_ID=your_test_parent_page_id_here          # 필수: 테스트 페이지 생성 부모 ID
TEST_DATABASE_ID=your_test_database_id_here                # 선택: 테스트용 데이터베이스 ID
```

### 🏗️ 테스트 환경 초기 설정

#### 1. Notion 워크스페이스 준비

```bash
# 1. 새 Notion 워크스페이스 생성 또는 기존 워크스페이스 사용
# 2. API 통합(Integration) 생성
# 3. 테스트 전용 페이지 생성
```

#### 2. 환경 파일 설정

```bash
# 프로젝트 루트에 .env.test 파일 생성
cp .env.example .env.test

# 테스트 환경 변수 설정
cat >> .env.test << 'EOF'
# 테스트 환경 설정
NOTION_API_KEY=secret_test_api_key_here
TEST_PARENT_PAGE_ID=test_parent_page_id_here
TEST_DATABASE_ID=test_database_id_here
NODE_ENV=test
EOF
```

#### 3. 권한 설정 확인

```bash
# 노션 워크스페이스에서 다음 권한 확인:
# - 페이지 생성 권한
# - 페이지 읽기/쓰기 권한  
# - 데이터베이스 접근 권한 (사용하는 경우)
```

### 🛠️ 환경별 설정 관리

#### 개발 환경 (Local)

```bash
# 개인 테스트 워크스페이스 사용
export NOTION_API_KEY="secret_dev_key"
export TEST_PARENT_PAGE_ID="dev_page_id"

# 로컬 테스트 실행
bun test test/integration
```

#### CI/CD 환경 (GitHub Actions)

```yaml
# .github/workflows/test.yml
env:
  NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
  TEST_PARENT_PAGE_ID: ${{ secrets.TEST_PARENT_PAGE_ID }}
  TEST_DATABASE_ID: ${{ secrets.TEST_DATABASE_ID }}
```

#### 공유 테스트 환경

```bash
# 팀 공용 테스트 워크스페이스 
# 주의: 동시 실행 시 충돌 가능성 고려
export TEST_WORKSPACE_TYPE="shared"
export TEST_CONCURRENT_USERS=3
```

### 🔒 환경 격리 및 보안

#### API 키 보안 관리

```bash
# 1. API 키는 절대 코드에 하드코딩하지 않음
# 2. 환경별로 다른 API 키 사용
# 3. 테스트 전용 제한된 권한 부여

# 올바른 방법
export NOTION_API_KEY="$(cat ~/.notion/test-api-key)"

# 잘못된 방법 (절대 금지)
const apiKey = "secret_1234567890";
```

#### 테스트 데이터 격리

```bash
# 테스트 페이지에 식별 가능한 접두사 사용
TEST_PAGE_PREFIX="[TEST]"
TEST_CLEANUP_ENABLED=true

# 테스트 후 자동 정리 설정
TEST_AUTO_CLEANUP=true
TEST_CLEANUP_DELAY=5000  # 5초 후 정리
```

### 📊 환경 상태 모니터링

#### 환경 설정 확인 스크립트

```bash
# test/scripts/check-env.js 생성
bun run test/scripts/check-env.js

# 출력 예시:
# ✅ NOTION_API_KEY: Set and valid
# ✅ TEST_PARENT_PAGE_ID: Valid page ID format  
# ⚠️  TEST_DATABASE_ID: Not set (optional)
# ✅ Notion API: Connection successful
# ✅ Test workspace: Accessible
```

#### 환경 상태 대시보드

```typescript
// 환경 상태 확인 유틸리티
export class TestEnvironmentMonitor {
  async checkEnvironmentHealth(): Promise<EnvironmentStatus> {
    return {
      notion_api: await this.checkNotionAPI(),
      workspace_access: await this.checkWorkspaceAccess(),
      test_pages: await this.checkTestPageQuota(),
      rate_limits: await this.checkRateLimits()
    };
  }
}
```

### 🧹 환경 정리 및 유지보수

#### 자동 정리 스크립트

```bash
# test/scripts/cleanup.js
# 테스트 후 생성된 페이지들 자동 정리

bun run test/scripts/cleanup.js --older-than=1h
bun run test/scripts/cleanup.js --pattern="[TEST]*" --dry-run
```

#### 정기 유지보수 체크리스트

```markdown
### 주간 점검 (매주 월요일)
- [ ] 테스트 워크스페이스 정리
- [ ] API 키 만료 확인  
- [ ] 테스트 성공률 분석
- [ ] 성능 메트릭 검토

### 월간 점검 (매월 1일)  
- [ ] 테스트 환경 권한 재검토
- [ ] 불필요한 테스트 페이지 제거
- [ ] 환경 설정 문서 업데이트
- [ ] 백업 환경 설정 확인
```

### 🚨 환경 문제 대응 가이드

#### 일반적인 환경 문제

1. **API 키 인증 실패**
   ```bash
   Error: Unauthorized (401)
   
   해결방법:
   1. API 키 유효성 확인
   2. 워크스페이스 권한 확인  
   3. 통합(Integration) 설정 점검
   ```

2. **페이지 접근 권한 부족**
   ```bash
   Error: Forbidden (403)
   
   해결방법:
   1. 부모 페이지 공유 설정 확인
   2. 통합에 페이지 접근 권한 부여
   3. 워크스페이스 멤버십 확인
   ```

3. **API 요청 한도 초과**
   ```bash
   Error: Rate limited (429)
   
   해결방법:
   1. 테스트 실행 빈도 조정
   2. 배치 크기 줄이기
   3. 재시도 로직 구현
   ```

#### 환경 복구 절차

```bash
# 1단계: 환경 상태 진단
bun run test/scripts/diagnose-env.js

# 2단계: 기본 연결 테스트
bun test test/integration/health-check.test.ts

# 3단계: 환경 재설정
bun run test/scripts/reset-test-env.js

# 4단계: 검증 테스트 실행
bun test test/integration/basic-connectivity.test.ts
```

### 🔄 환경 설정 확인

```bash
# 통합 테스트 실행 전 환경 검증
bun run test/scripts/validate-test-env.js

# 상세 진단 정보와 함께 테스트 실행
bun test test/integration --reporter=verbose --bail

# 환경 변수가 올바르게 설정되었는지 확인
bun test test/integration/environment.test.ts
```

## 📊 테스트 커버리지

테스트 커버리지 보고서 생성:
```bash
bun test --coverage
```

커버리지 HTML 보고서는 `coverage/` 디렉토리에 생성됩니다.

## 🧪 테스트 카테고리

### 단위 테스트 (`test/unit/`)

- **enhanced-markdown-processor.test.ts**: 마크다운 처리 로직 테스트
- **document-comparator.test.ts**: 문서 비교 알고리즘 테스트
- **notion-converter.test.ts**: 노션 변환 로직 테스트 (추가 예정)

### 통합 테스트 (`test/integration/`)

- **notion-roundtrip.test.ts**: 실제 노션 API를 사용한 업로드/다운로드 테스트
- **file-system-integration.test.ts**: 파일 시스템 통합 테스트 (추가 예정)

### 테스트 픽스처 (`test/fixtures/`)

- **sample-document.md**: 기본 마크다운 요소 테스트용
- **complex-document.md**: 복잡한 구조와 Front Matter 테스트용

## 🎯 테스트 품질 기준

### 라운드트립 테스트 품질 기준

- **유사도**: 95% 이상
- **문자 차이**: 100자 미만
- **구조적 변경**: 3개 미만
- **성능**: 업로드 30초, 다운로드 15초 이내

### 단위 테스트 커버리지 목표

- **함수 커버리지**: 90% 이상
- **라인 커버리지**: 85% 이상
- **브랜치 커버리지**: 80% 이상

## 🔍 테스트 작성 가이드

### 새로운 테스트 추가

1. **단위 테스트**: `test/unit/` 디렉토리에 `.test.ts` 파일 생성
2. **통합 테스트**: `test/integration/` 디렉토리에 `.test.ts` 파일 생성
3. **픽스처**: 테스트용 샘플 데이터는 `test/fixtures/`에 추가

### 테스트 명명 규칙

- 파일명: `{module-name}.test.ts`
- describe: 테스트하는 클래스나 기능명
- it: 구체적인 동작이나 기대결과 설명

### 비동기 테스트

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
}, 30000); // 타임아웃 설정
```

## 🚨 트러블슈팅

### 통합 테스트가 스킵되는 경우

```
🔄 Skipping integration test - configuration missing
```

→ 환경 변수 `NOTION_API_KEY`와 `TEST_PARENT_PAGE_ID`가 설정되지 않았습니다.

### 테스트 파일 충돌

```
Error: EEXIST: file already exists
```

→ 이전 테스트의 임시 파일이 정리되지 않았습니다. `test/temp/` 디렉토리를 수동으로 정리하세요.

### 성능 테스트 실패

```
Expected upload time to be less than 30000ms
```

→ 네트워크 상황이나 Notion API 응답 시간에 따라 타임아웃을 조정하세요.

## 📈 CI/CD 통합

### GitHub Actions 예제

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test test/unit  # 단위 테스트만 CI에서 실행
      - name: Integration tests
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          TEST_PARENT_PAGE_ID: ${{ secrets.TEST_PARENT_PAGE_ID }}
        run: bun test test/integration
```

---

**테스트 실행 전 체크리스트:**

- [ ] 환경 변수 설정 완료
- [ ] 의존성 설치 완료 (`bun install`)
- [ ] Notion API 접근 권한 확인
- [ ] 테스트 전용 페이지/데이터베이스 준비