# 완전한 기능 가이드

dependency-linker의 모든 기능을 포괄하는 완전한 가이드입니다.

## 🎯 개요

dependency-linker는 다국어 AST 분석 프레임워크로, 다음과 같은 핵심 기능들을 제공합니다:

- **파일 분석 및 심볼 추출**
- **RDF 기반 주소 시스템**
- **Unknown Symbol 추론 시스템**
- **Query 시스템**
- **Cross-Namespace 의존성 분석**
- **Inference 시스템**
- **Context Documents 생성**
- **Performance Optimization**
- **RDF 기반 파일 위치 반환**

## 🚀 핵심 기능

### 1. 파일 분석 및 심볼 추출

#### 지원 언어
- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`
- **Java**: `.java`
- **Python**: `.py`, `.pyi`
- **Go**: `.go`
- **Markdown**: `.md`, `.markdown`, `.mdx`

#### 기본 분석 명령어
```bash
# TypeScript 파일 분석
npm run cli -- analyze --pattern "src/**/*.ts"

# JavaScript 파일 분석
npm run cli -- analyze --pattern "src/**/*.js"

# Java 파일 분석
npm run cli -- analyze --pattern "src/**/*.java"

# Python 파일 분석
npm run cli -- analyze --pattern "src/**/*.py"

# Go 파일 분석
npm run cli -- analyze --pattern "src/**/*.go"

# Markdown 파일 분석
npm run cli -- analyze --pattern "docs/**/*.md"
```

#### 분석 옵션
```bash
# 성능 최적화 활성화
npm run cli -- analyze --pattern "src/**/*.ts" --performance

# 최대 동시성 설정
npm run cli -- analyze --pattern "src/**/*.ts" --max-concurrency 8

# 배치 크기 설정
npm run cli -- analyze --pattern "src/**/*.ts" --batch-size 20

# 메모리 제한 설정
npm run cli -- analyze --pattern "src/**/*.ts" --memory-limit 2048

# 출력 형식 지정
npm run cli -- analyze --pattern "src/**/*.ts" --format json

# 통계 포함
npm run cli -- analyze --pattern "src/**/*.ts" --include-statistics
```

### 2. RDF 기반 주소 시스템

#### RDF 주소 생성
```bash
# 클래스 RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"

# 함수 RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/utils.ts" --type "function" --symbol "validateEmail"

# 인터페이스 RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/types.ts" --type "interface" --symbol "User"
```

#### RDF 주소 검색
```bash
# RDF 주소 검색
npm run cli -- rdf --query "UserService"

# 네임스페이스별 검색
npm run cli -- rdf --query "UserService" --namespace "auth"

# 타입별 검색
npm run cli -- rdf --query "UserService" --type "class"
```

#### RDF 주소 검증
```bash
# RDF 주소 유효성 검증
npm run cli -- rdf --validate

# 고유성 검사
npm run cli -- rdf --uniqueness

# 통계 조회
npm run cli -- rdf --stats
```

### 3. RDF 기반 파일 위치 반환 시스템

#### 파일 위치 정보 반환
```bash
# 파일 위치 정보 조회
npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"

# 파일 경로 반환
npm run cli -- rdf-file --path "my-project/src/UserService.ts#class:UserService"

# 상대 경로 반환
npm run cli -- rdf-file --relative "my-project/src/UserService.ts#class:UserService"
```

#### 파일 열기
```bash
# 기본 에디터로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService"

# VS Code로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code

# 특정 라인으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --line 10

# 특정 라인과 컬럼으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --line 10 --column 5

# 에디터 종료까지 대기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor vim --wait
```

#### 파일 내용 조회
```bash
# 전체 파일 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService"

# 특정 라인 범위 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService" --start-line 1 --end-line 20
```

#### 심볼 정보 조회
```bash
# 심볼 정보 조회
npm run cli -- rdf-file --symbol "my-project/src/UserService.ts#class:UserService"
```

#### 파일 존재 여부 확인
```bash
# 파일 존재 여부 확인
npm run cli -- rdf-file --exists "my-project/src/UserService.ts#class:UserService"

# RDF 주소 유효성 검증
npm run cli -- rdf-file --validate "my-project/src/UserService.ts#class:UserService"
```

### 4. Unknown Symbol 추론 시스템

#### Unknown Symbol 등록
```bash
# Unknown Symbol 등록
npm run cli -- unknown --register "processUser" "src/UserService.ts"

# 여러 Unknown Symbol 등록
npm run cli -- unknown --register "validateUser" "src/UserService.ts"
npm run cli -- unknown --register "authenticateUser" "src/UserService.ts"
```

#### Unknown Symbol 검색
```bash
# Unknown Symbol 검색
npm run cli -- unknown --search "processUser"

# 패턴 검색
npm run cli -- unknown --search "User*"

# 타입별 검색
npm run cli -- unknown --search "processUser" --type "function"
```

#### 추론 실행
```bash
# 추론 실행
npm run cli -- unknown --infer

# 특정 추론 규칙 사용
npm run cli -- unknown --infer --rules "exact-name,type-based,context-based"

# 신뢰도 임계값 설정
npm run cli -- unknown --infer --threshold 0.8
```

#### 추론 결과 조회
```bash
# 추론 결과 조회
npm run cli -- unknown --results

# 특정 심볼의 추론 결과
npm run cli -- unknown --results --symbol "processUser"
```

### 5. Query 시스템

#### SQL 쿼리
```bash
# SQL 쿼리 실행
npm run cli -- query --sql "SELECT * FROM nodes WHERE type = 'class'"

# 복잡한 SQL 쿼리
npm run cli -- query --sql "SELECT n.name, n.type, n.source_file FROM nodes n WHERE n.type IN ('class', 'function') ORDER BY n.name"
```

#### GraphQL 쿼리
```bash
# GraphQL 쿼리 실행
npm run cli -- query --graphql "{ nodes { id name type } }"

# 관계 포함 GraphQL 쿼리
npm run cli -- query --graphql "{ nodes { id name type relationships { type target { name } } } }"
```

#### 자연어 쿼리
```bash
# 자연어 쿼리 실행
npm run cli -- query --natural "find all React components"

# 복잡한 자연어 쿼리
npm run cli -- query --natural "find all functions that call authenticateUser"
```

#### 쿼리 결과 형식
```bash
# JSON 형식으로 결과 반환
npm run cli -- query --sql "SELECT * FROM nodes" --format json

# CSV 형식으로 결과 반환
npm run cli -- query --sql "SELECT * FROM nodes" --format csv

# 테이블 형식으로 결과 반환
npm run cli -- query --sql "SELECT * FROM nodes" --format table
```

### 6. Cross-Namespace 의존성 분석

#### 네임스페이스 간 의존성 분석
```bash
# 두 네임스페이스 간 의존성 분석
npm run cli -- cross-namespace --analyze "auth" "user"

# 여러 네임스페이스 분석
npm run cli -- cross-namespace --analyze "auth" "user" "order"
```

#### 순환 의존성 검출
```bash
# 순환 의존성 검출
npm run cli -- cross-namespace --circular

# 특정 네임스페이스의 순환 의존성
npm run cli -- cross-namespace --circular --namespace "auth"
```

#### 의존성 통계
```bash
# 의존성 통계 생성
npm run cli -- cross-namespace --stats

# 네임스페이스별 통계
npm run cli -- cross-namespace --stats --namespace "auth"
```

#### 의존성 그래프 생성
```bash
# 의존성 그래프 생성
npm run cli -- cross-namespace --graph

# 특정 형식으로 그래프 생성
npm run cli -- cross-namespace --graph --format svg
```

### 7. Inference 시스템

#### 계층적 추론
```bash
# 계층적 추론 실행
npm run cli -- inference --hierarchical 123 --edge-type imports

# 특정 깊이까지 추론
npm run cli -- inference --hierarchical 123 --edge-type imports --depth 3
```

#### 전이적 추론
```bash
# 전이적 추론 실행
npm run cli -- inference --transitive 123 --edge-type depends_on

# 최대 전이 깊이 설정
npm run cli -- inference --transitive 123 --edge-type depends_on --max-depth 5
```

#### 추론 실행
```bash
# 추론 실행
npm run cli -- inference --execute 123

# 특정 추론 규칙 사용
npm run cli -- inference --execute 123 --rules "hierarchical,transitive"

# 신뢰도 임계값 설정
npm run cli -- inference --execute 123 --threshold 0.8
```

#### 추론 결과 조회
```bash
# 추론 결과 조회
npm run cli -- inference --results

# 특정 노드의 추론 결과
npm run cli -- inference --results --node 123
```

### 8. Context Documents 생성

#### 파일 컨텍스트 문서 생성
```bash
# 파일 컨텍스트 문서 생성
npm run cli -- context-documents --file "src/UserService.ts"

# 특정 형식으로 문서 생성
npm run cli -- context-documents --file "src/UserService.ts" --format markdown
```

#### 심볼 컨텍스트 문서 생성
```bash
# 심볼 컨텍스트 문서 생성
npm run cli -- context-documents --symbol "src/UserService.ts" --symbol-path "UserService"

# 특정 심볼의 컨텍스트 문서
npm run cli -- context-documents --symbol "src/UserService.ts" --symbol-path "authenticateUser"
```

#### 프로젝트 컨텍스트 문서 생성
```bash
# 프로젝트 컨텍스트 문서 생성
npm run cli -- context-documents --project

# 특정 형식으로 프로젝트 문서 생성
npm run cli -- context-documents --project --format html
```

#### 문서 출력 설정
```bash
# 출력 디렉토리 지정
npm run cli -- context-documents --file "src/UserService.ts" --output "docs/"

# 템플릿 지정
npm run cli -- context-documents --file "src/UserService.ts" --template "custom-template.md"
```

### 9. Performance Optimization

#### 프로젝트 분석
```bash
# 최적화된 프로젝트 분석
npm run cli -- performance --analyze "my-project"

# 파일 패턴 지정
npm run cli -- performance --analyze "my-project" --file-patterns "src/**/*.ts,src/**/*.js"
```

#### 캐시 관리
```bash
# 캐시 초기화
npm run cli -- performance --cache clear

# 캐시 통계 조회
npm run cli -- performance --cache stats

# 캐시 최적화
npm run cli -- performance --cache optimize
```

#### 배치 처리 관리
```bash
# 배치 처리 시작
npm run cli -- performance --batch start

# 배치 처리 중지
npm run cli -- performance --batch stop

# 배치 처리 통계
npm run cli -- performance --batch stats

# 실패한 작업 재시도
npm run cli -- performance --batch retry
```

#### 성능 모니터링
```bash
# 성능 모니터링 시작
npm run cli -- performance --monitor

# 모니터링 간격 설정
npm run cli -- performance --monitor --interval 5000

# 메모리 정보 포함
npm run cli -- performance --monitor --include-memory

# CPU 정보 포함
npm run cli -- performance --monitor --include-cpu

# 캐시 정보 포함
npm run cli -- performance --monitor --include-cache
```

#### 메모리 최적화
```bash
# 메모리 최적화
npm run cli -- performance --optimize-memory
```

#### 성능 벤치마크
```bash
# 성능 벤치마크 실행
npm run cli -- performance --benchmark

# 반복 횟수 설정
npm run cli -- performance --benchmark --iterations 10

# 메모리 정보 포함
npm run cli -- performance --benchmark --include-memory

# CPU 정보 포함
npm run cli -- performance --benchmark --include-cpu

# 캐시 정보 포함
npm run cli -- performance --benchmark --include-cache
```

#### 성능 통계
```bash
# 성능 통계 생성
npm run cli -- performance --stats
```

## 🎯 고급 기능

### 1. 시멘틱 태그 시스템

#### 시멘틱 태그 카테고리
- **아키텍처 레이어**: `service-layer`, `controller-layer`, `repository-layer`
- **비즈니스 도메인**: `auth-domain`, `user-domain`, `order-domain`
- **접근 범위**: `public-api`, `private-api`, `internal-api`
- **코드 품질**: `pure-function`, `async-function`, `testable`
- **프레임워크**: `react-component`, `nestjs-controller`, `express-middleware`

#### 시멘틱 태그 사용 예시
```typescript
/**
 * User Service
 * 
 * @semantic-tags: service-layer, auth-domain, public-api
 * @description: 사용자 인증 및 관리 서비스
 */
export class UserService {
  /**
   * 사용자 인증
   * 
   * @semantic-tags: auth-method, public-api
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    // 구현
  }
}
```

### 2. 네임스페이스 관리

#### 네임스페이스 설정
```json
{
  "namespaces": {
    "auth": {
      "path": "src/auth/**/*",
      "description": "Authentication module",
      "semanticTags": ["auth-domain", "security-layer"],
      "dependencies": ["user", "utils"]
    },
    "user": {
      "path": "src/user/**/*",
      "description": "User management module",
      "semanticTags": ["user-domain", "service-layer"],
      "dependencies": ["auth", "database"]
    }
  }
}
```

#### 네임스페이스 분석
```bash
# 네임스페이스 분석
npm run cli -- namespace --analyze

# 특정 네임스페이스 분석
npm run cli -- namespace --analyze --namespace "auth"

# 네임스페이스 통계
npm run cli -- namespace --stats
```

### 3. 설정 파일

#### dependency-linker.config.json
```json
{
  "project": {
    "name": "my-project",
    "version": "1.0.0",
    "description": "My Project",
    "root": "./"
  },
  "analysis": {
    "enabled": true,
    "includePatterns": ["**/*.ts", "**/*.js"],
    "excludePatterns": ["node_modules/**", "dist/**"],
    "maxFileSize": 1048576,
    "maxDepth": 10
  },
  "rdf": {
    "enabled": true,
    "baseUri": "https://my-project.com/",
    "format": "turtle",
    "validation": true
  },
  "performance": {
    "enabled": true,
    "caching": {
      "enabled": true,
      "maxSize": 100,
      "ttl": 3600
    },
    "batchProcessing": {
      "enabled": true,
      "maxConcurrency": 4,
      "batchSize": 10
    }
  }
}
```

## 🚀 데모 환경

### 데모 실행
```bash
# 데모 환경 실행
./demo/run-demo.sh

# 특정 단계만 실행
./demo/run-demo.sh --step analysis
./demo/run-demo.sh --step rdf
./demo/run-demo.sh --step query
```

### 데모 파일 구조
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

## 📊 성능 최적화

### 캐싱 전략
- **LRU 캐시**: 최근 사용된 항목 우선 보관
- **TTL 캐시**: 시간 기반 만료
- **메모리 캐시**: 빠른 접근을 위한 메모리 기반 캐시
- **파일 캐시**: 영구 저장을 위한 파일 기반 캐시

### 배치 처리
- **동시성 제어**: 최대 동시 실행 수 제한
- **배치 크기 조정**: 메모리 사용량 최적화
- **재시도 메커니즘**: 실패한 작업 자동 재시도
- **진행률 모니터링**: 실시간 진행률 추적

### 시각화
- **SVG 형식**: 벡터 기반 고품질 그래프
- **HTML 형식**: 인터랙티브 웹 기반 시각화
- **JSON 형식**: 프로그래밍 방식 접근
- **DOT 형식**: Graphviz 호환 형식

## 🔧 문제 해결

### 일반적인 문제

#### 1. 분석 실패
```bash
# 상세 로그와 함께 분석
npm run cli -- analyze --pattern "src/**/*.ts" --verbose

# 특정 파일만 분석
npm run cli -- analyze --pattern "src/UserService.ts"
```

#### 2. RDF 주소 생성 실패
```bash
# RDF 주소 유효성 검증
npm run cli -- rdf --validate

# 데이터베이스 상태 확인
npm run cli -- rdf --stats
```

#### 3. 성능 문제
```bash
# 메모리 사용량 확인
npm run cli -- performance --stats

# 캐시 최적화
npm run cli -- performance --cache optimize

# 메모리 최적화
npm run cli -- performance --optimize-memory
```

### 로그 및 디버깅

#### 로그 레벨 설정
```bash
# 디버그 모드로 실행
DEBUG=dependency-linker:* npm run cli -- analyze --pattern "src/**/*.ts"

# 특정 모듈만 디버그
DEBUG=dependency-linker:rdf npm run cli -- rdf --create --project "test" --file "src/test.ts" --type "class" --symbol "Test"
```

#### 성능 프로파일링
```bash
# 성능 벤치마크 실행
npm run cli -- performance --benchmark --iterations 10

# 메모리 프로파일링
npm run cli -- performance --monitor --include-memory
```

## 📚 추가 리소스

### 문서 링크
- [빠른 시작 가이드](./QUICK-START-GUIDE.md)
- [데모 환경 가이드](./DEMO-ENVIRONMENT-GUIDE.md)
- [모범 사례 가이드](./BEST-PRACTICES-GUIDE.md)
- [CLI 최적화 가이드](./CLI-OPTIMIZATION-GUIDE.md)
- [완전한 사용자 가이드](./USER-GUIDE-COMPLETE.md)

### API 참조
- [API Reference](../03-api-reference/README.md)
- [Core Systems](../04-core-systems/README.md)
- [Advanced Features](../05-advanced-features/README.md)

### 개발 관련
- [Development Guide](../06-development/README.md)
- [Conventions](../06-development/CONVENTIONS.md)
- [Testing Strategy](../06-development/testing-strategy.md)

### 참조 자료
- [Specifications](../07-specifications/README.md)
- [Glossary](../08-reference/GLOSSARY.md)
- [Package Exports](../08-reference/PACKAGE_EXPORTS.md)
