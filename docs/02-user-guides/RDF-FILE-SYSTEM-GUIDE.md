# RDF 기반 파일 위치 반환 시스템 가이드

RDF 주소를 기반으로 파일 위치를 반환하고 파일을 열 수 있는 시스템에 대한 완전한 가이드입니다.

## 🎯 개요

RDF 기반 파일 위치 반환 시스템은 고유한 RDF 주소를 통해 파일의 정확한 위치를 찾고, 해당 파일을 열고, 심볼 정보를 조회할 수 있는 시스템입니다.

## 🚀 핵심 기능

### 1. RDF 주소 형식

#### 기본 형식
```
project-name/file/path#type:symbol
```

#### 예시
```
my-project/src/UserService.ts#class:UserService
my-project/src/utils.ts#function:validateEmail
my-project/src/types.ts#interface:User
my-project/src/components/Button.tsx#class:Button
```

### 2. 파일 위치 반환

#### 기본 사용법
```bash
# 파일 위치 정보 조회
npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"
```

#### 출력 예시
```
📁 RDF 주소: my-project/src/UserService.ts#class:UserService
📄 파일 경로: my-project/src/UserService.ts
📍 절대 경로: /Users/user/project/my-project/src/UserService.ts
📂 상대 경로: my-project/src/UserService.ts
✅ 존재 여부: Yes
📏 라인 번호: 10
📐 컬럼 번호: 5
```

#### 파일 경로만 반환
```bash
# 절대 경로 반환
npm run cli -- rdf-file --path "my-project/src/UserService.ts#class:UserService"

# 상대 경로 반환
npm run cli -- rdf-file --relative "my-project/src/UserService.ts#class:UserService"
```

### 3. 파일 열기

#### 기본 파일 열기
```bash
# 기본 에디터로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService"
```

#### 특정 에디터로 파일 열기
```bash
# VS Code로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code

# Vim으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor vim

# Sublime Text로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor subl

# Atom으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor atom
```

#### 특정 위치로 파일 열기
```bash
# 특정 라인으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --line 10

# 특정 라인과 컬럼으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --line 10 --column 5
```

#### 에디터 옵션
```bash
# 에디터 종료까지 대기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor vim --wait

# 백그라운드에서 실행 (기본값)
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code
```

### 4. 파일 내용 조회

#### 전체 파일 내용 조회
```bash
# 전체 파일 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService"
```

#### 특정 라인 범위 내용 조회
```bash
# 1-20라인 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService" --start-line 1 --end-line 20

# 10-30라인 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService" --start-line 10 --end-line 30
```

### 5. 심볼 정보 조회

#### 기본 심볼 정보 조회
```bash
# 심볼 정보 조회
npm run cli -- rdf-file --symbol "my-project/src/UserService.ts#class:UserService"
```

#### 출력 예시
```
🔍 심볼 정보:
  - RDF 주소: my-project/src/UserService.ts#class:UserService
  - 파일 경로: my-project/src/UserService.ts
  - 심볼 이름: UserService
  - 심볼 타입: class
  - 라인 번호: 10
  - 컬럼 번호: 5
  - Export 여부: Yes
  - 메타데이터: {
      "semanticTags": ["service-layer", "auth-domain", "public-api"],
      "description": "사용자 인증 및 관리 서비스"
    }
```

### 6. 파일 존재 여부 확인

#### 기본 확인
```bash
# 파일 존재 여부 확인
npm run cli -- rdf-file --exists "my-project/src/UserService.ts#class:UserService"
```

#### 출력 예시
```
✅ 파일 존재 여부: Yes
```

### 7. RDF 주소 유효성 검증

#### 기본 검증
```bash
# RDF 주소 유효성 검증
npm run cli -- rdf-file --validate "my-project/src/UserService.ts#class:UserService"
```

#### 출력 예시
```
✅ RDF 주소 유효성: Valid
```

## 🎯 고급 기능

### 1. 에디터 지원

#### 지원되는 에디터
- **VS Code**: `code --goto file:line:column`
- **Vim**: `vim +line file`
- **Nano**: `nano +line file`
- **Emacs**: `emacs +line:column file`
- **Sublime Text**: `subl file:line:column`
- **Atom**: `atom file:line:column`
- **Notepad++**: `notepad++ file`
- **Gedit**: `gedit file`

#### 에디터 자동 감지
시스템은 다음 순서로 에디터를 자동 감지합니다:
1. VS Code (`code`)
2. Vim (`vim`)
3. Nano (`nano`)
4. Emacs (`emacs`)
5. Sublime Text (`subl`)
6. Atom (`atom`)
7. Notepad++ (`notepad++`)
8. Gedit (`gedit`)

### 2. RDF 주소 파싱

#### RDF 주소 구성 요소
- **프로젝트명**: `my-project`
- **파일 경로**: `src/UserService.ts`
- **심볼 타입**: `class`
- **심볼 이름**: `UserService`

#### 파싱 예시
```typescript
const rdfAddress = "my-project/src/UserService.ts#class:UserService";
const parts = rdfAddress.split('#');
const filePath = parts[0]; // "my-project/src/UserService.ts"
const fragment = parts[1]; // "class:UserService"
const [type, symbol] = fragment.split(':'); // "class", "UserService"
```

### 3. 파일 시스템 통합

#### 절대 경로 변환
```bash
# RDF 주소를 절대 경로로 변환
npm run cli -- rdf-file --path "my-project/src/UserService.ts#class:UserService"
# 출력: /Users/user/project/my-project/src/UserService.ts
```

#### 상대 경로 변환
```bash
# RDF 주소를 상대 경로로 변환
npm run cli -- rdf-file --relative "my-project/src/UserService.ts#class:UserService"
# 출력: my-project/src/UserService.ts
```

### 4. 데이터베이스 통합

#### 심볼 정보 조회
시스템은 데이터베이스에서 다음 정보를 조회합니다:
- 심볼 이름
- 심볼 타입
- 라인 번호
- 컬럼 번호
- Export 여부
- 메타데이터

#### 메타데이터 예시
```json
{
  "semanticTags": ["service-layer", "auth-domain", "public-api"],
  "description": "사용자 인증 및 관리 서비스",
  "author": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## 🚀 사용 시나리오

### 1. 개발 워크플로우

#### 1단계: 파일 분석
```bash
# 프로젝트 분석
npm run cli -- analyze --pattern "src/**/*.ts"
```

#### 2단계: RDF 주소 생성
```bash
# RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
```

#### 3단계: 파일 위치 확인
```bash
# 파일 위치 확인
npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"
```

#### 4단계: 파일 열기
```bash
# 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code
```

### 2. 코드 리뷰 워크플로우

#### 1단계: 변경된 파일 식별
```bash
# 변경된 파일들의 RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
```

#### 2단계: 파일 열기
```bash
# 리뷰할 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code
```

#### 3단계: 심볼 정보 확인
```bash
# 심볼 정보 확인
npm run cli -- rdf-file --symbol "my-project/src/UserService.ts#class:UserService"
```

### 3. 디버깅 워크플로우

#### 1단계: 오류 위치 식별
```bash
# 오류가 발생한 심볼의 RDF 주소 확인
npm run cli -- rdf --query "authenticateUser"
```

#### 2단계: 파일 열기
```bash
# 오류가 발생한 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#function:authenticateUser" --editor code --line 25
```

#### 3단계: 코드 확인
```bash
# 해당 라인 주변 코드 확인
npm run cli -- rdf-file --content "my-project/src/UserService.ts#function:authenticateUser" --start-line 20 --end-line 30
```

## 🔧 문제 해결

### 일반적인 문제

#### 1. 파일을 찾을 수 없음
```bash
# 파일 존재 여부 확인
npm run cli -- rdf-file --exists "my-project/src/UserService.ts#class:UserService"

# 파일 경로 확인
npm run cli -- rdf-file --path "my-project/src/UserService.ts#class:UserService"
```

#### 2. RDF 주소 형식 오류
```bash
# RDF 주소 유효성 검증
npm run cli -- rdf-file --validate "my-project/src/UserService.ts#class:UserService"
```

#### 3. 에디터 실행 실패
```bash
# 다른 에디터로 시도
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor vim

# 에디터 종료까지 대기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --wait
```

### 디버깅 팁

#### 1. 상세 로그 활성화
```bash
# 디버그 모드로 실행
DEBUG=dependency-linker:rdf-file npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"
```

#### 2. 파일 시스템 권한 확인
```bash
# 파일 읽기 권한 확인
ls -la my-project/src/UserService.ts

# 디렉토리 권한 확인
ls -la my-project/src/
```

#### 3. 에디터 설치 확인
```bash
# 에디터 설치 확인
which code
which vim
which nano
```

## 📚 추가 리소스

### 관련 문서
- [완전한 기능 가이드](./COMPLETE-FEATURE-GUIDE.md)
- [데모 환경 가이드](./DEMO-ENVIRONMENT-GUIDE.md)
- [빠른 시작 가이드](./QUICK-START-GUIDE.md)

### API 참조
- [RDF API Reference](../03-api-reference/RDF-API.md)
- [File System API Reference](../03-api-reference/FILE-SYSTEM-API.md)

### 예시 코드
- [RDF 파일 핸들러 예시](../../src/cli/handlers/rdf-file-handler.ts)
- [데모 예시](../../demo/examples/)
