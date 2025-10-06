# 데모 환경 가이드

dependency-linker의 모든 기능을 직접 체험할 수 있는 데모 환경 가이드입니다.

## 🎯 개요

이 가이드는 dependency-linker의 핵심 기능들을 실제 코드 예시와 함께 단계별로 체험할 수 있도록 구성되었습니다.

## 📋 데모 환경 구성

### 1. 프로젝트 구조

```
demo/
├── examples/                    # 파싱 가능한 예시 파일들
│   ├── typescript/             # TypeScript 예시
│   ├── javascript/             # JavaScript 예시
│   ├── java/                   # Java 예시
│   ├── python/                 # Python 예시
│   ├── go/                     # Go 예시
│   └── markdown/               # Markdown 예시
├── configs/                    # 설정 파일들
│   ├── namespace-config.json   # 네임스페이스 설정
│   └── dependency-linker.config.json
└── results/                    # 분석 결과
    ├── analysis/               # 분석 결과
    ├── visualizations/         # 시각화 결과
    └── reports/                # 리포트
```

### 2. 지원되는 파일 형식

#### TypeScript/JavaScript
- **확장자**: `.ts`, `.tsx`, `.js`, `.jsx`
- **특징**: React 컴포넌트, 함수, 클래스, 인터페이스
- **시멘틱 태그**: `react-component`, `service-layer`, `public-api`

#### Java
- **확장자**: `.java`
- **특징**: 클래스, 인터페이스, 메서드, 패키지
- **시멘틱 태그**: `service-class`, `controller-class`, `repository-class`

#### Python
- **확장자**: `.py`, `.pyi`
- **특징**: 함수, 클래스, 모듈, 비동기 함수
- **시멘틱 태그**: `async-function`, `decorator`, `pure-function`

#### Go
- **확장자**: `.go`
- **특징**: 패키지, 함수, 구조체, 인터페이스
- **시멘틱 태그**: `public-function`, `private-function`, `interface-method`

#### Markdown
- **확장자**: `.md`, `.markdown`, `.mdx`
- **특징**: 헤딩, 링크, 코드 블록, 심볼 참조
- **시멘틱 태그**: `doc-api`, `doc-guide`, `doc-tutorial`

## 🚀 데모 실행 방법

### 1. 기본 분석

```bash
# TypeScript 파일 분석
npm run cli -- analyze examples/typescript/UserService.ts

# JavaScript 파일 분석
npm run cli -- analyze examples/javascript/calculator.js

# Java 파일 분석
npm run cli -- analyze examples/java/UserController.java

# Python 파일 분석
npm run cli -- analyze examples/python/data_processor.py

# Go 파일 분석
npm run cli -- analyze examples/go/user.go

# Markdown 파일 분석
npm run cli -- analyze examples/markdown/API_DOCS.md
```

### 2. RDF 주소 생성

```bash
# RDF 주소 생성
npm run cli -- rdf --generate examples/typescript/UserService.ts

# RDF 주소 검색
npm run cli -- rdf --search "UserService"

# RDF 주소 검증
npm run cli -- rdf --validate
```

### 3. Unknown Symbol 분석

```bash
# Unknown Symbol 등록
npm run cli -- unknown --register "processUser" examples/typescript/UserService.ts

# Unknown Symbol 검색
npm run cli -- unknown --search "processUser"

# 추론 실행
npm run cli -- unknown --infer
```

### 4. Query 실행

```bash
# SQL 쿼리
npm run cli -- query --sql "SELECT * FROM nodes WHERE type = 'class'"

# GraphQL 쿼리
npm run cli -- query --graphql "{ nodes { id name type } }"

# 자연어 쿼리
npm run cli -- query --natural "find all React components"
```

### 5. Cross-Namespace 분석

```bash
# 네임스페이스 간 의존성 분석
npm run cli -- cross-namespace --analyze "auth" "user"

# 순환 의존성 검출
npm run cli -- cross-namespace --circular

# 통계 생성
npm run cli -- cross-namespace --stats
```

### 6. Inference 실행

```bash
# 계층적 추론
npm run cli -- inference --hierarchical 123 --edge-type imports

# 전이적 추론
npm run cli -- inference --transitive 123 --edge-type depends_on

# 추론 실행
npm run cli -- inference --execute 123
```

### 7. Context Documents 생성

```bash
# 파일 컨텍스트 문서 생성
npm run cli -- context-documents --file examples/typescript/UserService.ts

# 심볼 컨텍스트 문서 생성
npm run cli -- context-documents --symbol examples/typescript/UserService.ts --symbol-path UserService

# 프로젝트 컨텍스트 문서 생성
npm run cli -- context-documents --project
```

### 8. Performance Optimization

```bash
# 프로젝트 분석
npm run cli -- performance --analyze "demo-project"

# 캐시 관리
npm run cli -- performance --cache clear

# 배치 처리
npm run cli -- performance --batch start

# 성능 모니터링
npm run cli -- performance --monitor

# 메모리 최적화
npm run cli -- performance --optimize-memory

# 벤치마크 실행
npm run cli -- performance --benchmark

# 성능 통계
npm run cli -- performance --stats
```

## 📊 분석 결과 확인

### 1. 분석 결과 파일

```bash
# 분석 결과 확인
ls -la results/analysis/

# 시각화 결과 확인
ls -la results/visualizations/

# 리포트 확인
ls -la results/reports/
```

### 2. 데이터베이스 확인

```bash
# SQLite 데이터베이스 확인
sqlite3 dependency-linker.db ".tables"

# 노드 확인
sqlite3 dependency-linker.db "SELECT * FROM nodes LIMIT 10;"

# 엣지 확인
sqlite3 dependency-linker.db "SELECT * FROM edges LIMIT 10;"
```

## 🎯 데모 시나리오

### 시나리오 1: React 컴포넌트 분석

```bash
# 1. React 컴포넌트 파일 분석
npm run cli -- analyze examples/typescript/Button.tsx

# 2. RDF 주소 생성
npm run cli -- rdf --generate examples/typescript/Button.tsx

# 3. 의존성 분석
npm run cli -- cross-namespace --analyze "components" "utils"

# 4. 컨텍스트 문서 생성
npm run cli -- context-documents --file examples/typescript/Button.tsx
```

### 시나리오 2: 마이크로서비스 아키텍처 분석

```bash
# 1. 서비스 레이어 분석
npm run cli -- analyze examples/typescript/UserService.ts
npm run cli -- analyze examples/typescript/OrderService.ts

# 2. 의존성 관계 분석
npm run cli -- cross-namespace --analyze "user-service" "order-service"

# 3. 추론 실행
npm run cli -- inference --hierarchical 123 --edge-type imports

# 4. 성능 최적화
npm run cli -- performance --analyze "microservices-project"
```

### 시나리오 3: 문서화 시스템

```bash
# 1. 마크다운 문서 분석
npm run cli -- analyze examples/markdown/API_DOCS.md

# 2. 심볼 참조 분석
npm run cli -- unknown --search "API_DOCS"

# 3. 컨텍스트 문서 생성
npm run cli -- context-documents --project

# 4. 쿼리 실행
npm run cli -- query --natural "find all API documentation"
```

## 🔧 고급 설정

### 1. 네임스페이스 설정

```json
{
  "namespaces": {
    "auth": {
      "path": "src/auth/**/*",
      "description": "Authentication module"
    },
    "user": {
      "path": "src/user/**/*",
      "description": "User management module"
    },
    "components": {
      "path": "src/components/**/*",
      "description": "React components"
    }
  }
}
```

### 2. 시멘틱 태그 설정

```json
{
  "semanticTags": {
    "architecture": {
      "service-layer": "Service layer components",
      "controller-layer": "Controller layer components",
      "repository-layer": "Repository layer components"
    },
    "domain": {
      "auth-domain": "Authentication domain",
      "user-domain": "User management domain"
    },
    "access": {
      "public-api": "Public API endpoints",
      "private-api": "Private API endpoints"
    }
  }
}
```

## 📈 성능 모니터링

### 1. 실시간 모니터링

```bash
# 성능 모니터링 시작
npm run cli -- performance --monitor --interval 5000

# 메모리 사용량 확인
npm run cli -- performance --stats

# 벤치마크 실행
npm run cli -- performance --benchmark --iterations 10
```

### 2. 최적화 설정

```bash
# 캐시 최적화
npm run cli -- performance --cache optimize

# 배치 처리 최적화
npm run cli -- performance --batch start --max-concurrency 4

# 메모리 최적화
npm run cli -- performance --optimize-memory
```

## 🎉 데모 완료 체크리스트

- [ ] TypeScript 파일 분석 완료
- [ ] JavaScript 파일 분석 완료
- [ ] Java 파일 분석 완료
- [ ] Python 파일 분석 완료
- [ ] Go 파일 분석 완료
- [ ] Markdown 파일 분석 완료
- [ ] RDF 주소 생성 완료
- [ ] Unknown Symbol 분석 완료
- [ ] Query 실행 완료
- [ ] Cross-Namespace 분석 완료
- [ ] Inference 실행 완료
- [ ] Context Documents 생성 완료
- [ ] Performance Optimization 완료
- [ ] 분석 결과 확인 완료
- [ ] 성능 모니터링 완료

## 📚 추가 리소스

- [빠른 시작 가이드](./QUICK-START-GUIDE.md)
- [모범 사례 가이드](./BEST-PRACTICES-GUIDE.md)
- [CLI 최적화 가이드](./CLI-OPTIMIZATION-GUIDE.md)
- [완전한 사용자 가이드](./USER-GUIDE-COMPLETE.md)
