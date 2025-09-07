---
notion_page_id: 26848583-7460-818e-a623-f995cc59aa5c
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
last_synced: '2025-09-08T11:29:04.159Z'
category: docs
auto_generated: true
---
# 사용자 매뉴얼

## 설치 및 설정

### 1단계: 설치

```bash
npm install
```

### 2단계: 초기 설정

```bash
npm run init
```

### 3단계: Notion API 설정

1. Notion API 키 발급
2. `deplink.config.json`에 API 키 설정
3. 워크스페이스 연결

### 4단계: 데이터베이스 생성

```bash
npm run schema:setup
```

## 기본 사용법

### 파일 동기화

```bash
# 프로젝트 파일 스캔 및 동기화
npm run sync
```

### Notion 업로드

```bash
# 노션 데이터베이스에 업로드
npm run upload
```

### 관계 탐색

```bash
# 파일 간 의존성 관계 탐색
npm run explore
```

### 현재 상태 확인

```bash
# 스키마 시스템 상태
npm run schema:status

# 프로젝트 상태
npm run status
```

## 고급 기능

### 환경별 관리

현재 3개 환경을 지원합니다:


#### Test 환경 사용

```bash
npm run sync --env test
npm run upload --env test
```
#### Development 환경 사용

```bash
npm run sync --env development
npm run upload --env development
```
#### Production 환경 사용

```bash
npm run sync --env production
npm run upload --env production
```

### Git 통합

```bash
# Git 상태와 동기화
npm run git-sync

# 브랜치별 추적
npm run git-track --branch main
```

### 관계 속성 활용

현재 6개의 관계 속성을 추적합니다:

- **Dependencies**: 파일이 의존하는 다른 파일들
- **Dependents**: 이 파일을 의존하는 파일들
- **Related Files**: 문서와 관련된 파일들

## 문제해결

### 일반적인 문제

#### API 키 오류
```
Error: Unauthorized - check your API key
```
**해결책**: `deplink.config.json`에서 올바른 API 키 확인

#### 데이터베이스 연결 오류
```
Error: Database not found
```
**해결책**: 데이터베이스 ID 확인 및 권한 검토

#### 스키마 검증 실패
```
Schema validation failed
```
**해결책**: 
```bash
npm run schema:validate
npm run schema:setup --force
```

### 도움말 명령어

```bash
# 전체 도움말
npm run help

# 특정 명령어 도움말
npm run help sync
npm run help schema
```

### 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **문서**: 최신 가이드 및 API 문서
- **예제**: 사용 사례 및 튜토리얼
