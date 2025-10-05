# 태그 사용 예시 가이드

## 개요

이 문서는 dependency-linker 시스템에서 사용할 수 있는 다양한 태그의 구체적인 사용 예시를 제공합니다. 각 태그 유형별로 실제 프로젝트에서 어떻게 사용하는지 보여줍니다.

## 목차

- [기능 정의 태그 예시](#기능-정의-태그-예시)
- [예시 태그 예시](#예시-태그-예시)
- [요구사항 태그 예시](#요구사항-태그-예시)
- [유저 시나리오 태그 예시](#유저-시나리오-태그-예시)
- [개선 사항 태그 예시](#개선-사항-태그-예시)
- [TODO 태그 예시](#todo-태그-예시)
- [테스트 케이스 태그 예시](#테스트-케이스-태그-예시)
- [에러 유형 태그 예시](#에러-유형-태그-예시)
- [복합 태그 사용 예시](#복합-태그-사용-예시)

## 기능 정의 태그 예시

### 1. API 엔드포인트 정의

```markdown
## 사용자 인증 API #기능

### POST /api/auth/login #기능
사용자 로그인을 처리하는 엔드포인트입니다.

**요청 형식**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답 형식**:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
```
```

### 2. 데이터베이스 스키마 정의

```markdown
## 사용자 테이블 스키마 #define

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
```

### 3. 클래스 정의

```markdown
## 사용자 서비스 클래스 #기능

```typescript
export class UserService {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async createUser(userData: CreateUserData): Promise<User> {
    // 사용자 생성 로직
  }
  
  async getUserById(id: string): Promise<User | null> {
    // 사용자 조회 로직
  }
}
```
```

## 예시 태그 예시

### 1. API 사용 예시

```markdown
## API 사용 예시 #예시

### JavaScript 클라이언트 #예시
```javascript
import { UserService } from './user-service';

const userService = new UserService();

// 사용자 생성
const newUser = await userService.createUser({
  email: 'user@example.com',
  password: 'password123'
});

console.log('사용자 생성됨:', newUser);
```
```

### 2. 설정 파일 예시

```markdown
## 환경 설정 예시 #예시

### .env 파일 #예시
```bash
# 데이터베이스 설정
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DATABASE_POOL_SIZE=10

# JWT 설정
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 서버 설정
PORT=3000
NODE_ENV=development
```
```

### 3. 사용자 인터페이스 예시

```markdown
## 로그인 폼 예시 #예시

### HTML 구조 #예시
```html
<form id="login-form">
  <div class="form-group">
    <label for="email">이메일</label>
    <input type="email" id="email" name="email" required>
  </div>
  <div class="form-group">
    <label for="password">비밀번호</label>
    <input type="password" id="password" name="password" required>
  </div>
  <button type="submit">로그인</button>
</form>
```
```

## 요구사항 태그 예시

### 1. 성능 요구사항

```markdown
## 성능 요구사항 #요구사항

### 응답 시간 요구사항 #요구사항
- API 응답 시간: 200ms 이하
- 데이터베이스 쿼리 시간: 100ms 이하
- 페이지 로딩 시간: 2초 이하

### 동시 사용자 요구사항 #요구사항
- 최대 동시 사용자: 1,000명
- 초당 요청 처리: 100개
- 메모리 사용량: 512MB 이하
```

### 2. 보안 요구사항

```markdown
## 보안 요구사항 #요구사항

### 인증 요구사항 #요구사항
- JWT 토큰 사용 필수
- 토큰 만료 시간: 24시간
- 비밀번호 최소 길이: 8자

### 데이터 보호 요구사항 #요구사항
- 개인정보 암호화 저장
- HTTPS 통신 필수
- SQL 인젝션 방지
```

### 3. 사용성 요구사항

```markdown
## 사용성 요구사항 #요구사항

### 사용자 경험 요구사항 #요구사항
- 직관적인 인터페이스
- 모바일 반응형 디자인
- 접근성 준수 (WCAG 2.1 AA)

### 브라우저 호환성 요구사항 #요구사항
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
```

## 유저 시나리오 태그 예시

### 1. 로그인 시나리오

```markdown
## 사용자 로그인 시나리오 #시나리오

### 정상 로그인 시나리오 #시나리오
1. 사용자가 로그인 페이지에 접속
2. 이메일과 비밀번호 입력
3. 로그인 버튼 클릭
4. 서버에서 인증 처리
5. 성공 시 대시보드로 리다이렉트

### 실패 시나리오 #시나리오
1. 잘못된 이메일 입력
2. 잘못된 비밀번호 입력
3. 계정이 비활성화된 경우
4. 네트워크 오류 발생
```

### 2. 구매 프로세스 시나리오

```markdown
## 온라인 쇼핑 구매 시나리오 #시나리오

### 상품 구매 시나리오 #시나리오
1. 사용자가 상품 목록 페이지 방문
2. 관심 상품 선택 및 장바구니 추가
3. 장바구니에서 주문 정보 확인
4. 결제 정보 입력
5. 주문 완료 및 확인 이메일 발송

### 취소 시나리오 #시나리오
1. 주문 후 30분 이내 취소 가능
2. 취소 요청 시 환불 처리
3. 취소 확인 이메일 발송
```

## 개선 사항 태그 예시

### 1. 성능 개선

```markdown
## 성능 개선 계획 #개선

### 데이터베이스 최적화 #개선
- 인덱스 추가로 쿼리 성능 향상
- 연결 풀 크기 조정
- 쿼리 최적화 및 캐싱 도입

### 프론트엔드 최적화 #개선
- 이미지 압축 및 지연 로딩
- CSS/JS 번들 크기 최적화
- CDN 도입으로 로딩 속도 향상
```

### 2. 사용자 경험 개선

```markdown
## 사용자 경험 개선 #개선

### UI/UX 개선 #개선
- 다크 모드 지원 추가
- 키보드 네비게이션 개선
- 모바일 터치 인터페이스 최적화

### 접근성 개선 #개선
- 스크린 리더 지원 강화
- 색상 대비 개선
- 폰트 크기 조절 기능 추가
```

## TODO 태그 예시

### 1. 기능 개발 TODO

```markdown
## 개발 TODO 목록 #todo

### 우선순위 높음 #todo
- [ ] 사용자 인증 시스템 구현
- [ ] API 문서 자동 생성
- [ ] 단위 테스트 작성

### 우선순위 중간 #todo
- [ ] 다국어 지원 추가
- [ ] 관리자 대시보드 개발
- [ ] 로그 분석 시스템 구축

### 우선순위 낮음 #todo
- [ ] 테마 커스터마이징 기능
- [ ] 고급 검색 기능
- [ ] 소셜 로그인 연동
```

### 2. 버그 수정 TODO

```markdown
## 버그 수정 TODO #todo

### 긴급 수정 #todo
- [ ] 메모리 누수 문제 해결
- [ ] 보안 취약점 패치
- [ ] 데이터 손실 방지 로직 추가

### 일반 수정 #todo
- [ ] UI 렌더링 오류 수정
- [ ] API 응답 형식 통일
- [ ] 에러 메시지 개선
```

## 테스트 케이스 태그 예시

### 1. 단위 테스트

```markdown
## 사용자 서비스 단위 테스트 #테스트

### 사용자 생성 테스트 #테스트
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
  
  it('중복 이메일로 사용자 생성 실패', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'password123'
    };
    
    await expect(userService.createUser(userData))
      .rejects.toThrow('이미 존재하는 이메일입니다');
  });
});
```
```

### 2. 통합 테스트

```markdown
## API 통합 테스트 #테스트

### 인증 API 테스트 #테스트
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
  
  it('POST /api/auth/login - 실패', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
  });
});
```
```

## 에러 유형 태그 예시

### 1. 인증 에러

```markdown
## 인증 관련 에러 #에러

### 토큰 만료 에러 #에러
```typescript
export class TokenExpiredError extends Error {
  constructor(message: string = '토큰이 만료되었습니다') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}
```

### 인증 실패 에러 #에러
```typescript
export class AuthenticationError extends Error {
  constructor(message: string = '인증에 실패했습니다') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
```
```

### 2. 데이터베이스 에러

```markdown
## 데이터베이스 관련 에러 #에러

### 연결 실패 에러 #에러
```typescript
export class DatabaseConnectionError extends Error {
  constructor(message: string = '데이터베이스 연결에 실패했습니다') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}
```

### 쿼리 실행 에러 #에러
```typescript
export class QueryExecutionError extends Error {
  constructor(message: string = '쿼리 실행에 실패했습니다') {
    super(message);
    this.name = 'QueryExecutionError';
  }
}
```
```

## 복합 태그 사용 예시

### 1. 기능 + 예시 + 테스트

```markdown
## 사용자 인증 기능 #기능

### 로그인 API 구현 #기능 #예시
```typescript
export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await this.userService.authenticate(email, password);
      const token = this.jwtService.generateToken(user);
      res.json({ token, user });
    } catch (error) {
      res.status(401).json({ error: '인증 실패' });
    }
  }
}
```

### 로그인 테스트 #테스트
```typescript
describe('AuthController', () => {
  it('유효한 자격증명으로 로그인 성공', async () => {
    // 테스트 로직
  });
});
```
```

### 2. 요구사항 + 개선 + TODO

```markdown
## 성능 요구사항 #요구사항

### 현재 성능 지표 #요구사항
- API 응답 시간: 500ms (목표: 200ms)
- 데이터베이스 쿼리: 300ms (목표: 100ms)

### 성능 개선 계획 #개선
- 인덱스 최적화
- 쿼리 캐싱 도입
- 연결 풀 크기 조정

### 성능 개선 TODO #todo
- [ ] 데이터베이스 인덱스 분석
- [ ] Redis 캐싱 도입
- [ ] 쿼리 최적화
```

### 3. 시나리오 + 에러 + 테스트

```markdown
## 사용자 등록 시나리오 #시나리오

### 정상 등록 시나리오 #시나리오
1. 사용자가 등록 폼 작성
2. 이메일 중복 확인
3. 계정 생성 및 인증 이메일 발송

### 등록 실패 시나리오 #시나리오
1. 중복 이메일 입력 시 에러
2. 잘못된 이메일 형식 시 에러
3. 네트워크 오류 시 에러

### 등록 에러 처리 #에러
```typescript
export class UserRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserRegistrationError';
  }
}
```

### 등록 테스트 #테스트
```typescript
describe('User Registration', () => {
  it('중복 이메일로 등록 시 에러 발생', async () => {
    // 테스트 로직
  });
});
```
```

## 태그 사용 모범 사례

### 1. 일관된 태그 사용

```markdown
# 프로젝트 전체에서 일관된 태그 사용

## API 문서 #기능
### 인증 API #기능
### 사용자 API #기능

## 예시 코드 #예시
### JavaScript 예시 #예시
### Python 예시 #예시

## 테스트 코드 #테스트
### 단위 테스트 #테스트
### 통합 테스트 #테스트
```

### 2. 태그 조합 전략

```markdown
# 주요 태그 + 보조 태그 조합

## 사용자 인증 #기능 #예시
## 성능 요구사항 #요구사항 #개선
## 로그인 시나리오 #시나리오 #테스트
## 에러 처리 #에러 #예시
```

### 3. 태그 우선순위 고려

```markdown
# 우선순위에 따른 태그 배치

## 메인 기능 #기능  # 우선순위 10
## 요구사항 #요구사항  # 우선순위 9
## 예시 #예시  # 우선순위 8
## 시나리오 #시나리오  # 우선순위 8
## 테스트 #테스트  # 우선순위 7
## 개선 #개선  # 우선순위 6
## TODO #todo  # 우선순위 5
```

이 가이드를 참고하여 프로젝트에 맞는 태그를 효과적으로 사용하시기 바랍니다. 추가 질문이나 예시가 필요하시면 프로젝트 이슈를 통해 문의해 주세요.
