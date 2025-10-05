# 마크다운 문서 작성 가이드

## 개요

이 가이드는 dependency-linker 시스템에서 마크다운 문서를 효과적으로 작성하는 방법을 설명합니다. 올바른 마크다운 작성 방법을 통해 태그 파싱, 코드 분석, 관계 추론 등의 기능을 최대한 활용할 수 있습니다.

## 목차

- [기본 마크다운 작성 규칙](#기본-마크다운-작성-규칙)
- [태그 사용 가이드](#태그-사용-가이드)
- [코드 블록 작성 방법](#코드-블록-작성-방법)
- [링크 작성 방법](#링크-작성-방법)
- [제목 작성 방법](#제목-작성-방법)
- [모범 사례](#모범-사례)
- [자주 묻는 질문](#자주-묻는-질문)

## 기본 마크다운 작성 규칙

### 1. 제목 구조화

#### ✅ 올바른 제목 작성
```markdown
# 메인 제목
## 섹션 제목
### 하위 섹션 제목
#### 세부 항목
```

#### ❌ 피해야 할 제목 작성
```markdown
# 메인 제목 #태그  # 태그가 제목과 분리되어 있음
## 섹션 제목
### 하위 섹션 제목
#### 세부 항목
```

### 2. 태그 사용 규칙

#### ✅ 올바른 태그 사용
```markdown
## 사용자 인증 기능 #기능
[API 문서](api.md) #예시
## 성능 요구사항 #요구사항
```

#### ❌ 피해야 할 태그 사용
```markdown
## 사용자 인증 기능#기능  # 공백 없음
[API 문서](api.md)#예시  # 공백 없음
## 성능 요구사항 # 요구사항  # 태그 앞에 공백
```

### 3. 코드 블록 작성

#### ✅ 올바른 코드 블록 작성
```markdown
```typescript
interface User {
  id: string;
  name: string;
}
```
```

#### ❌ 피해야 할 코드 블록 작성
```markdown
```typescript
interface User {
  id: string;
  name: string;
}
```  # 태그가 코드 블록 밖에 있음
```

## 태그 사용 가이드

### 1. 명시적 태그 유형

#### 1.1 기능 정의 태그 (#기능, #function, #define)
```markdown
## 사용자 인증 기능 #기능
[로그인 API](api.md) #function
## 데이터베이스 연결 #define
```

**사용 시기**:
- 시스템의 기능을 정의할 때
- API 엔드포인트를 설명할 때
- 데이터베이스 스키마를 정의할 때

**작성 규칙**:
- 기능의 목적과 동작을 명확히 설명
- 기능의 입력과 출력을 정의
- 기능의 제약사항을 명시

#### 1.2 예시 태그 (#예시, #example, #demo)
```markdown
## 사용법 예시 #예시
[API 사용 예시](example.md) #example
```typescript
// 코드 예시 #demo
const user = new User();
```
```

**사용 시기**:
- 코드 사용법을 보여줄 때
- API 사용 예시를 제공할 때
- 샘플 코드를 작성할 때

**작성 규칙**:
- 실행 가능한 코드 예시 제공
- 예시의 목적을 명확히 설명
- 예시의 결과를 예상할 수 있도록 작성

#### 1.3 요구사항 태그 (#요구사항, #requirement, #req)
```markdown
## 성능 요구사항 #요구사항
[보안 요구사항](security.md) #requirement
## 사용자 요구사항 #req
```

**사용 시기**:
- 시스템 요구사항을 정의할 때
- 성능 요구사항을 명시할 때
- 보안 요구사항을 정의할 때

**작성 규칙**:
- 요구사항은 측정 가능해야 함
- 요구사항의 우선순위를 명시
- 요구사항의 출처를 명시

#### 1.4 유저 시나리오 태그 (#시나리오, #scenario, #user-story)
```markdown
## 로그인 시나리오 #시나리오
[구매 프로세스](purchase.md) #scenario
## 사용자 여행 #user-story
```

**사용 시기**:
- 사용자 행동 시나리오를 정의할 때
- 비즈니스 프로세스를 설명할 때
- 사용자 여정을 설명할 때

**작성 규칙**:
- 사용자의 목표를 명확히 정의
- 시나리오의 단계를 순서대로 설명
- 예외 상황도 고려

#### 1.5 개선 사항 태그 (#개선, #improvement, #enhancement)
```markdown
## 성능 개선 #개선
[UI 개선 계획](ui.md) #improvement
## 사용자 경험 개선 #enhancement
```

**사용 시기**:
- 시스템 개선 아이디어를 제안할 때
- 성능 최적화 계획을 수립할 때
- 사용자 경험 개선 방안을 제시할 때

**작성 규칙**:
- 개선의 목적을 명확히 설명
- 개선의 우선순위를 명시
- 개선의 예상 효과를 설명

#### 1.6 TODO 태그 (#todo, #TODO, #할일)
```markdown
## 구현해야 할 기능 #todo
[버그 수정](bug.md) #TODO
## 문서화 작업 #할일
```

**사용 시기**:
- 해야 할 일을 정의할 때
- 버그 수정 계획을 수립할 때
- 문서화 작업을 계획할 때

**작성 규칙**:
- TODO의 내용을 구체적으로 설명
- TODO의 우선순위를 명시
- TODO의 담당자를 명시

#### 1.7 테스트 케이스 태그 (#테스트, #test, #testcase)
```markdown
## 단위 테스트 #테스트
[통합 테스트](integration.md) #test
## 사용자 테스트 #testcase
```

**사용 시기**:
- 테스트 시나리오를 정의할 때
- 단위 테스트를 작성할 때
- 통합 테스트를 계획할 때

**작성 규칙**:
- 테스트의 목적을 명확히 설명
- 테스트의 입력과 예상 출력을 정의
- 테스트의 실행 조건을 명시

#### 1.8 에러 유형 태그 (#에러, #error, #exception)
```markdown
## 인증 에러 #에러
[네트워크 에러](network.md) #error
## 데이터베이스 에러 #exception
```

**사용 시기**:
- 에러 유형을 정의할 때
- 에러 처리 방법을 설명할 때
- 예외 상황을 설명할 때

**작성 규칙**:
- 에러의 원인을 명확히 설명
- 에러의 해결 방법을 제시
- 에러의 발생 조건을 명시

### 2. 태그 조합 가이드

#### 2.1 관련 태그 조합
```markdown
## 사용자 인증 기능 #기능 #요구사항
[로그인 API](api.md) #function #example
## 성능 테스트 #테스트 #요구사항
```

**조합 규칙**:
- `#기능` 태그는 `#요구사항`, `#시나리오`와 함께 사용
- `#예시` 태그는 `#기능`, `#테스트`와 함께 사용
- `#개선` 태그는 `#todo`와 함께 사용
- `#에러` 태그는 `#테스트`와 함께 사용

#### 2.2 태그 우선순위
```markdown
## 메인 기능 #기능  # 우선순위 10
## 요구사항 #요구사항  # 우선순위 9
## 예시 #예시  # 우선순위 8
## 테스트 #테스트  # 우선순위 7
## 개선 #개선  # 우선순위 6
## TODO #todo  # 우선순위 5
```

## 코드 블록 작성 방법

### 1. 언어별 코드 블록

#### 1.1 TypeScript/JavaScript
```markdown
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  async getUser(id: string): Promise<User> {
    // 사용자 조회 로직
  }
}
```
```

#### 1.2 Python
```markdown
```python
class User:
    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name
    
    def get_user(self) -> dict:
        return {"id": self.id, "name": self.name}
```
```

#### 1.3 SQL
```markdown
```sql
SELECT u.id, u.name, u.email
FROM users u
WHERE u.active = true
ORDER BY u.created_at DESC;
```
```

### 2. 코드 블록에 태그 사용

#### ✅ 올바른 사용
```markdown
```typescript #예시
const user = new User("123", "John Doe");
console.log(user.getName());
```
```

#### ❌ 피해야 할 사용
```markdown
```typescript
const user = new User("123", "John Doe");
console.log(user.getName());
``` #예시  # 태그가 코드 블록 밖에 있음
```

## 링크 작성 방법

### 1. 내부 링크

#### 1.1 상대 경로 링크
```markdown
[API 문서](./api.md)
[사용자 가이드](../user-guide.md)
[설정 파일](../../config/settings.md)
```

#### 1.2 앵커 링크
```markdown
[제목으로 이동](#제목)
[섹션으로 이동](#섹션-제목)
```

### 2. 외부 링크

#### 2.1 HTTP/HTTPS 링크
```markdown
[공식 문서](https://docs.example.com)
[GitHub 저장소](https://github.com/user/repo)
[이메일](mailto:contact@example.com)
```

### 3. 링크에 태그 사용

#### ✅ 올바른 사용
```markdown
[API 문서](api.md) #예시
[사용자 가이드](user-guide.md) #가이드라인
[성능 테스트](performance.md) #테스트
```

#### ❌ 피해야 할 사용
```markdown
[API 문서](api.md)#예시  # 공백 없음
[사용자 가이드](user-guide.md) # 가이드라인  # 태그 앞에 공백
```

## 제목 작성 방법

### 1. 제목 구조

#### 1.1 계층적 제목 구조
```markdown
# 프로젝트 개요
## 기능 설명
### 사용자 인증
#### 로그인 기능
##### JWT 토큰 처리
```

#### 1.2 제목에 태그 사용
```markdown
# 프로젝트 개요 #define
## 기능 설명 #기능
### 사용자 인증 #기능
#### 로그인 기능 #기능 #예시
```

### 2. 제목 작성 규칙

#### ✅ 올바른 제목 작성
```markdown
## 사용자 인증 기능 #기능
### API 엔드포인트 #예시
#### 데이터베이스 스키마 #define
```

#### ❌ 피해야 할 제목 작성
```markdown
## 사용자 인증 기능#기능  # 공백 없음
### API 엔드포인트#예시  # 공백 없음
#### 데이터베이스 스키마#define  # 공백 없음
```

## 모범 사례

### 1. 문서 구조화

#### 1.1 일관된 제목 구조
```markdown
# 프로젝트명
## 개요
## 설치 방법
## 사용법
### 기본 사용법
### 고급 사용법
## API 참조
## 예시
## 문제 해결
## 기여하기
```

#### 1.2 태그를 활용한 문서 구조
```markdown
# 프로젝트명 #define
## 개요 #define
## 설치 방법 #가이드라인
## 사용법 #가이드라인
### 기본 사용법 #예시
### 고급 사용법 #예시
## API 참조 #기능
## 예시 #예시
## 문제 해결 #가이드라인
## 기여하기 #가이드라인
```

### 2. 태그 사용 전략

#### 2.1 문서별 태그 전략
```markdown
# README.md
## 프로젝트 개요 #define
## 설치 방법 #가이드라인
## 사용법 #예시
## 기여하기 #가이드라인

# API.md
## 인증 API #기능
## 사용자 API #기능
## 예시 코드 #예시
## 에러 처리 #에러

# TEST.md
## 단위 테스트 #테스트
## 통합 테스트 #테스트
## 성능 테스트 #테스트
## 테스트 실행 #가이드라인
```

#### 2.2 섹션별 태그 전략
```markdown
## 기능 설명 #기능
### 사용자 인증 #기능
#### 로그인 #기능 #예시
#### 회원가입 #기능 #예시

## 요구사항 #요구사항
### 성능 요구사항 #요구사항
### 보안 요구사항 #요구사항

## 테스트 #테스트
### 단위 테스트 #테스트
### 통합 테스트 #테스트
```

### 3. 코드 예시 작성

#### 3.1 완전한 코드 예시
```markdown
## 사용자 인증 예시 #예시

```typescript
import { UserService } from './user-service';

const userService = new UserService();

// 사용자 로그인
async function loginUser(email: string, password: string) {
  try {
    const user = await userService.authenticate(email, password);
    console.log('로그인 성공:', user);
    return user;
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
}

// 사용 예시
loginUser('user@example.com', 'password123');
```
```

#### 3.2 단계별 코드 예시
```markdown
## 단계별 구현 가이드 #예시

### 1단계: 기본 설정 #가이드라인
```typescript
// 의존성 설치
npm install express jsonwebtoken
```

### 2단계: 인증 미들웨어 구현 #기능
```typescript
import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  // 토큰 검증 로직
}
```

### 3단계: 테스트 작성 #테스트
```typescript
describe('인증 미들웨어', () => {
  it('유효한 토큰으로 인증 성공', async () => {
    // 테스트 로직
  });
});
```
```

## 자주 묻는 질문

### Q1: 태그를 여러 개 사용할 때 순서가 중요하나요?

**A**: 태그 순서는 중요하지 않습니다. 하지만 일관성을 위해 다음 순서를 권장합니다:
1. 주요 태그 (기능, 예시, 요구사항 등)
2. 보조 태그 (가이드라인, 테스트 등)
3. 상태 태그 (todo, 개선 등)

```markdown
## 사용자 인증 기능 #기능 #예시 #테스트
```

### Q2: 태그 이름에 공백을 사용할 수 있나요?

**A**: 태그 이름에는 공백을 사용하지 않는 것을 권장합니다. 대신 하이픈(-)이나 언더스코어(_)를 사용하세요.

```markdown
# 올바른 사용
## 기능 설명 #user-authentication
## API 문서 #api-reference

# 피해야 할 사용
## 기능 설명 #user authentication
## API 문서 #api reference
```

### Q3: 코드 블록에서 태그를 사용할 수 있나요?

**A**: 코드 블록 내부에서는 태그를 사용하지 않는 것을 권장합니다. 대신 코드 블록 뒤에 태그를 추가하세요.

```markdown
# 올바른 사용
```typescript
const user = new User();
```
# 예시

# 피해야 할 사용
```typescript
const user = new User(); #예시
```
```

### Q4: 링크에 태그를 사용할 때 주의사항이 있나요?

**A**: 링크와 태그 사이에 공백을 반드시 넣어야 합니다.

```markdown
# 올바른 사용
[API 문서](api.md) #예시
[사용자 가이드](guide.md) #가이드라인

# 피해야 할 사용
[API 문서](api.md)#예시
[사용자 가이드](guide.md) # 가이드라인
```

### Q5: 제목에 여러 태그를 사용할 수 있나요?

**A**: 네, 제목에 여러 태그를 사용할 수 있습니다. 하지만 너무 많은 태그는 피하는 것이 좋습니다.

```markdown
# 올바른 사용
## 사용자 인증 기능 #기능 #예시
## API 문서 #기능 #가이드라인

# 피해야 할 사용
## 사용자 인증 기능 #기능 #예시 #테스트 #요구사항 #가이드라인
```

## 추가 리소스

- [마크다운 공식 문서](https://daringfireball.net/projects/markdown/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [태그 파싱 명세서](../specs/006-tag-parsing-specifications/spec.md)
- [코드 파싱 대상 명세서](../specs/006-tag-parsing-specifications/code-parsing-targets.md)

---

이 가이드를 따라 마크다운 문서를 작성하면 dependency-linker 시스템에서 최적의 파싱 결과를 얻을 수 있습니다. 추가 질문이 있으시면 프로젝트 이슈를 통해 문의해 주세요.
