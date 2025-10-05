# 빠른 시작 가이드

## 개요

이 가이드는 dependency-linker 시스템을 빠르게 시작하는 방법을 설명합니다. 5분 안에 기본적인 마크다운 작성 방법을 익히고 태그 파싱 기능을 활용할 수 있습니다.

## 목차

- [5분 빠른 시작](#5분-빠른-시작)
- [기본 태그 사용법](#기본-태그-사용법)
- [첫 번째 문서 작성](#첫-번째-문서-작성)
- [태그 파싱 테스트](#태그-파싱-테스트)
- [다음 단계](#다음-단계)

## 5분 빠른 시작

### 1단계: 기본 마크다운 작성 (1분)

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 주요 기능 #기능
- 사용자 로그인
- 사용자 등록
- 비밀번호 재설정

## 사용법 #예시
```javascript
const user = new User();
user.login('email@example.com', 'password');
```
```

### 2단계: 태그 추가 (1분)

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 주요 기능 #기능
- 사용자 로그인 #기능
- 사용자 등록 #기능
- 비밀번호 재설정 #기능

## 사용법 #예시
```javascript
const user = new User();
user.login('email@example.com', 'password');
```
```

### 3단계: 링크 추가 (1분)

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 주요 기능 #기능
- [사용자 로그인](login.md) #기능
- [사용자 등록](register.md) #기능
- [비밀번호 재설정](reset-password.md) #기능

## 사용법 #예시
[API 문서](api.md) #예시
[사용자 가이드](user-guide.md) #가이드라인
```

### 4단계: 테스트 추가 (1분)

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 주요 기능 #기능
- [사용자 로그인](login.md) #기능
- [사용자 등록](register.md) #기능
- [비밀번호 재설정](reset-password.md) #기능

## 사용법 #예시
[API 문서](api.md) #예시
[사용자 가이드](user-guide.md) #가이드라인

## 테스트 #테스트
[단위 테스트](tests/unit.md) #테스트
[통합 테스트](tests/integration.md) #테스트
```

### 5단계: 요구사항 추가 (1분)

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 주요 기능 #기능
- [사용자 로그인](login.md) #기능
- [사용자 등록](register.md) #기능
- [비밀번호 재설정](reset-password.md) #기능

## 요구사항 #요구사항
- 응답 시간: 200ms 이하
- 보안: JWT 토큰 사용
- 호환성: Chrome 90+

## 사용법 #예시
[API 문서](api.md) #예시
[사용자 가이드](user-guide.md) #가이드라인

## 테스트 #테스트
[단위 테스트](tests/unit.md) #테스트
[통합 테스트](tests/integration.md) #테스트
```

## 기본 태그 사용법

### 1. 필수 태그 8가지

| 태그 | 용도 | 예시 |
|------|------|------|
| `#기능` | 기능 정의 | `## 사용자 인증 #기능` |
| `#예시` | 예시 코드 | `[API 문서](api.md) #예시` |
| `#요구사항` | 요구사항 | `## 성능 요구사항 #요구사항` |
| `#시나리오` | 사용자 시나리오 | `## 로그인 시나리오 #시나리오` |
| `#개선` | 개선 사항 | `## 성능 개선 #개선` |
| `#todo` | TODO | `## 구현해야 할 기능 #todo` |
| `#테스트` | 테스트 케이스 | `## 단위 테스트 #테스트` |
| `#에러` | 에러 유형 | `## 인증 에러 #에러` |

### 2. 태그 사용 규칙

#### ✅ 올바른 사용
```markdown
## 사용자 인증 #기능
[API 문서](api.md) #예시
## 성능 요구사항 #요구사항
```

#### ❌ 피해야 할 사용
```markdown
## 사용자 인증#기능  # 공백 없음
[API 문서](api.md)#예시  # 공백 없음
## 성능 요구사항 # 요구사항  # 태그 앞에 공백
```

### 3. 태그 조합

#### ✅ 효과적인 조합
```markdown
## 사용자 인증 #기능 #예시
## 성능 요구사항 #요구사항 #개선
## 로그인 시나리오 #시나리오 #테스트
```

#### ❌ 과도한 조합
```markdown
## 사용자 인증 #기능 #예시 #테스트 #요구사항 #가이드라인 #개선  # 너무 많음
```

## 첫 번째 문서 작성

### 1. README.md 작성

```markdown
# 내 프로젝트 #define

## 개요 #define
이 프로젝트는 사용자 인증 시스템을 제공합니다.

## 설치 방법 #가이드라인
```bash
npm install
npm run build
```

## 주요 기능 #기능
- [사용자 로그인](login.md) #기능
- [사용자 등록](register.md) #기능
- [비밀번호 재설정](reset-password.md) #기능

## 요구사항 #요구사항
- Node.js 16+
- MongoDB 4.4+
- Redis 6.0+

## 사용법 #예시
[API 문서](api.md) #예시
[사용자 가이드](user-guide.md) #가이드라인

## 테스트 #테스트
[단위 테스트](tests/unit.md) #테스트
[통합 테스트](tests/integration.md) #테스트

## 기여하기 #가이드라인
[기여 가이드](CONTRIBUTING.md) #가이드라인
```

### 2. API.md 작성

```markdown
# API 문서 #기능

## 인증 API #기능

### POST /api/auth/login #기능
사용자 로그인을 처리합니다.

**요청 예시** #예시
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답 예시** #예시
```json
{
  "token": "jwt-token",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
```

### POST /api/auth/register #기능
사용자 등록을 처리합니다.

**요청 예시** #예시
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

## 에러 처리 #에러

### 인증 에러 #에러
- 401: 인증 실패
- 403: 권한 없음
- 429: 요청 한도 초과

### 서버 에러 #에러
- 500: 내부 서버 오류
- 503: 서비스 불가
```

### 3. TEST.md 작성

```markdown
# 테스트 문서 #테스트

## 단위 테스트 #테스트

### 사용자 서비스 테스트 #테스트
```typescript
describe('UserService', () => {
  it('유효한 데이터로 사용자 생성 성공', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const user = await userService.createUser(userData);
    
    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
  });
});
```

## 통합 테스트 #테스트

### API 통합 테스트 #테스트
```typescript
describe('Authentication API', () => {
  it('POST /api/auth/login - 성공', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```
```

## 태그 파싱 테스트

### 1. CLI를 통한 태그 파싱

```bash
# 태그 수집
npm run collect-tags -- --name docs

# 태그-헤딩 매핑
npm run map-tag-headings -- --name docs

# 태그 문서 생성
npm run generate-tag-docs -- --name docs
```

### 2. 태그 유형 검증

```bash
# 태그 유형 검증
npm run validate-tag-types -- --name docs

# 태그 유형 문서 생성
npm run generate-tag-type-docs -- --name docs
```

### 3. 명세서 기반 파싱

```bash
# 명세서에서 태그 유형 로드
npm run load-spec-tag-types

# 명세서에서 코드 파싱 대상 로드
npm run load-spec-code-targets

# 명세서에서 마크다운 파싱 대상 로드
npm run load-spec-markdown-targets
```

## 다음 단계

### 1. 고급 기능 학습

- [마크다운 작성 가이드](./MARKDOWN-WRITING-GUIDE.md) - 상세한 마크다운 작성 방법
- [태그 사용 예시](./TAG-USAGE-EXAMPLES.md) - 다양한 태그 사용 예시
- [모범 사례 가이드](./BEST-PRACTICES-GUIDE.md) - 모범 사례 및 품질 보증

### 2. 프로젝트 적용

1. **기존 문서 태그 추가**: 기존 마크다운 문서에 태그 추가
2. **문서 구조 개선**: 태그를 활용한 문서 구조 개선
3. **자동화 도입**: CI/CD 파이프라인에 태그 파싱 통합

### 3. 팀 협업

1. **태그 컨벤션 수립**: 팀 내 태그 사용 규칙 수립
2. **문서 리뷰 프로세스**: 태그 사용 검토 프로세스 도입
3. **지속적 개선**: 사용자 피드백 기반 지속적 개선

### 4. 고급 활용

1. **커스텀 태그**: 프로젝트에 맞는 커스텀 태그 정의
2. **자동 문서 생성**: 태그 기반 자동 문서 생성
3. **분석 및 인사이트**: 태그 사용 패턴 분석

## 문제 해결

### 자주 발생하는 문제

#### Q1: 태그가 파싱되지 않아요
**A**: 태그와 텍스트 사이에 공백이 있는지 확인하세요.
```markdown
# 올바른 사용
## 제목 #태그

# 잘못된 사용
## 제목#태그
```

#### Q2: 여러 태그를 사용할 때 순서가 중요하나요?
**A**: 태그 순서는 중요하지 않지만, 일관성을 위해 주요 태그를 먼저 사용하세요.
```markdown
## 사용자 인증 #기능 #예시  # 주요 태그 먼저
```

#### Q3: 코드 블록에서 태그를 사용할 수 있나요?
**A**: 코드 블록 내부에서는 태그를 사용하지 마세요. 코드 블록 뒤에 태그를 추가하세요.
```markdown
```typescript
const user = new User();
```
# 예시
```

### 추가 도움말

- [FAQ](./FAQ.md) - 자주 묻는 질문
- [문제 해결](./TROUBLESHOOTING.md) - 문제 해결 가이드
- [커뮤니티](./COMMUNITY.md) - 커뮤니티 및 지원

---

이 빠른 시작 가이드를 따라 5분 안에 dependency-linker 시스템을 시작할 수 있습니다. 추가 질문이 있으시면 프로젝트 이슈를 통해 문의해 주세요.
