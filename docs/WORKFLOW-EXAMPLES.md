# 기능 전체 사용 예시 워크플로우

dependency-linker의 모든 기능을 활용한 실제 사용 시나리오와 워크플로우를 정의합니다.

## 🎯 개요

dependency-linker는 **지식 그래프 기반 의존성 분석 도구**로, 코드베이스의 심볼, 파일, 네임스페이스 간의 관계를 분석하고 RDF 주소 시스템을 통해 고유하게 식별합니다.

## 📋 주요 기능 분류

### 1. 기본 분석 기능
- **파일 분석**: TypeScript, JavaScript, Java, Python, Go, Markdown
- **심볼 추출**: 클래스, 함수, 인터페이스, 타입, 변수
- **의존성 분석**: import/export 관계, 호출 관계, 참조 관계

### 2. RDF 주소 시스템
- **고유 식별자**: `project:namespace:file:symbol` 형식
- **검색 및 검증**: RDF 주소 생성, 검색, 유효성 검사
- **통계 및 모니터링**: RDF 데이터베이스 상태 확인

### 3. 고급 분석 기능
- **Unknown Symbol 관리**: 미정의 심볼 추적 및 추론
- **Cross-Namespace 분석**: 네임스페이스 간 의존성 분석
- **추론 엔진**: 계층적, 전이적 추론 실행
- **컨텍스트 문서**: 파일, 심볼, 프로젝트 컨텍스트 생성

### 4. 성능 및 최적화
- **벤치마크**: 파싱 성능 측정
- **캐시 관리**: 성능 최적화
- **네임스페이스 최적화**: 구조적 개선

## 🚀 실제 사용 워크플로우

### Workflow 1: 신규 프로젝트 분석 및 설정

#### 1단계: 프로젝트 초기 분석
```bash
# 1. 전체 프로젝트 구조 분석 (✅ 테스트 완료)
npm run cli -- analyze --pattern "src/**/*.{ts,js,tsx,jsx}" --recursive --verbose
# 결과: 182개 파일 발견 및 분석 완료

# 2. TypeScript 파일 상세 분석 (✅ 테스트 완료)
npm run cli -- typescript --analyze src/cli/main.ts
# 결과: 2개 import, 1개 missing link 분석 완료

# 3. Markdown 문서 분석 (✅ 테스트 완료)
npm run cli -- markdown --analyze README.md
# 결과: 4개 관계, 11개 클래스, 4개 메서드 분석 완료
```

#### 2단계: 네임스페이스 구조 파악
```bash
# 1. 네임스페이스 분석 (✅ 테스트 완료)
npm run cli -- namespace --analyze
# 결과: 186개 파일 분석 완료

# 2. 네임스페이스 통계 확인
npm run cli -- namespace --stats
```

#### 3단계: RDF 주소 시스템 구축
```bash
# 1. RDF 통계 확인 (✅ 테스트 완료)
npm run cli -- rdf --stats
# 결과: 총 RDF 주소 0개 (초기 상태)

# 2. 특정 심볼의 RDF 주소 검색
npm run cli -- rdf --query "UserService"

# 3. RDF 주소 생성 및 검증
npm run cli -- rdf --create "myproject:src:services:UserService"
```

### Workflow 2: 심볼 중심 의존성 분석

#### 1단계: 특정 심볼 분석
```bash
# 1. 특정 심볼의 의존성 분석
npm run cli -- dependencies --symbol "UserService" --depth 3 --output table

# 2. JSON 형식으로 API 연동
npm run cli -- dependencies --symbol "AuthService" --output json

# 3. 파일 내 모든 심볼 목록 조회
npm run cli -- dependencies --file "src/services/UserService.ts" --output list
```

#### 2단계: 의존성 관계 시각화
```bash
# 1. 외부 의존성 포함 분석
npm run cli -- dependencies --symbol "DatabaseManager" --include-external

# 2. 내부 의존성만 분석
npm run cli -- dependencies --symbol "ApiController" --include-internal

# 3. 특정 타입의 의존성만 분석
npm run cli -- dependencies --symbol "UserRepository" --type imports
```

### Workflow 3: Unknown Symbol 관리 및 추론

#### 1단계: Unknown Symbol 등록 및 검색
```bash
# 1. Unknown Symbol 등록
npm run cli -- unknown --register "ExternalLibrary" --file "src/utils/helpers.ts"

# 2. Unknown Symbol 검색
npm run cli -- unknown --search "External"

# 3. 추론 실행
npm run cli -- unknown --infer
```

#### 2단계: 추론 엔진 활용
```bash
# 1. 계층적 추론 실행
npm run cli -- inference --hierarchical

# 2. 전이적 추론 실행
npm run cli -- inference --transitive

# 3. 커스텀 추론 규칙 적용
npm run cli -- inference --custom "custom-rules.json"
```

### Workflow 4: Cross-Namespace 분석

#### 1단계: 네임스페이스 간 의존성 분석
```bash
# 1. Cross-Namespace 분석 실행
npm run cli -- cross-namespace

# 2. 상세 분석 결과 확인
npm run cli -- cross-namespace --detailed
```

#### 2단계: 네임스페이스 최적화
```bash
# 1. 네임스페이스 최적화
npm run cli -- namespace --optimize

# 2. 최적화 결과 통계
npm run cli -- namespace --stats
```

### Workflow 5: 성능 분석 및 최적화

#### 1단계: 성능 벤치마크
```bash
# 1. TypeScript 파싱 벤치마크
npm run cli -- typescript --benchmark src/large-file.ts

# 2. 전체 벤치마크 실행
npm run cli -- benchmark --file src/ --iterations 20

# 3. 성능 최적화 분석
npm run cli -- performance --analyze
```

#### 2단계: 캐시 관리
```bash
# 1. 캐시 상태 확인
npm run cli -- performance --cache-status

# 2. 캐시 클리어
npm run cli -- performance --cache-clear

# 3. 캐시 최적화
npm run cli -- performance --cache-optimize
```

### Workflow 6: 문서화 및 컨텍스트 생성

#### 1단계: Markdown 문서 분석
```bash
# 1. Markdown 파일 분석
npm run cli -- markdown --analyze docs/architecture.md

# 2. 링크 추적
npm run cli -- markdown --links docs/README.md

# 3. 헤딩 추출
npm run cli -- markdown --headings docs/user-guide.md
```

#### 2단계: 컨텍스트 문서 생성
```bash
# 1. 파일 컨텍스트 문서 생성
npm run cli -- context-documents --file src/services/UserService.ts

# 2. 심볼 컨텍스트 문서 생성
npm run cli -- context-documents --symbol "UserService"

# 3. 프로젝트 컨텍스트 문서 생성
npm run cli -- context-documents --project
```

## 🔄 통합 워크플로우: 완전한 프로젝트 분석

### Phase 1: 초기 설정 및 분석
```bash
# 1. 프로젝트 전체 분석
npm run cli -- analyze --pattern "src/**/*.{ts,js,tsx,jsx}" --recursive --verbose

# 2. 네임스페이스 구조 파악
npm run cli -- namespace --analyze

# 3. RDF 시스템 초기화
npm run cli -- rdf --stats
```

### Phase 2: 심볼 중심 분석
```bash
# 1. 핵심 심볼들의 의존성 분석
npm run cli -- dependencies --symbol "UserService" --depth 3
npm run cli -- dependencies --symbol "DatabaseManager" --depth 3
npm run cli -- dependencies --symbol "ApiController" --depth 3

# 2. Unknown Symbol 관리
npm run cli -- unknown --search "undefined"
npm run cli -- unknown --infer
```

### Phase 3: 고급 분석 및 추론
```bash
# 1. Cross-Namespace 분석
npm run cli -- cross-namespace

# 2. 추론 엔진 실행
npm run cli -- inference --hierarchical
npm run cli -- inference --transitive

# 3. 네임스페이스 최적화
npm run cli -- namespace --optimize
```

### Phase 4: 성능 최적화
```bash
# 1. 성능 벤치마크
npm run cli -- benchmark --file src/ --iterations 10

# 2. 성능 분석
npm run cli -- performance --analyze

# 3. 캐시 최적화
npm run cli -- performance --cache-optimize
```

### Phase 5: 문서화 및 결과 활용
```bash
# 1. Markdown 문서 분석
npm run cli -- markdown --analyze docs/
npm run cli -- markdown --links docs/README.md

# 2. 컨텍스트 문서 생성
npm run cli -- context-documents --project

# 3. 최종 RDF 통계
npm run cli -- rdf --stats
```

## 📊 출력 결과 활용 방법

### 1. JSON API 연동
```bash
# JSON 형식으로 결과 출력하여 API 연동
npm run cli -- dependencies --symbol "UserService" --output json > analysis.json
```

### 2. 테이블 형식 시각화
```bash
# 테이블 형식으로 콘솔 출력
npm run cli -- dependencies --symbol "DatabaseManager" --output table
```

### 3. 리스트 형식 데이터 처리
```bash
# 리스트 형식으로 파일 내 심볼 목록
npm run cli -- dependencies --file "src/services/UserService.ts" --output list
```

## 🎯 실제 사용 시나리오

### 시나리오 1: 레거시 코드 분석
```bash
# 1. 전체 프로젝트 구조 파악
npm run cli -- analyze --pattern "src/**/*.ts" --recursive

# 2. 주요 심볼들의 의존성 분석
npm run cli -- dependencies --symbol "LegacyService" --depth 4

# 3. Unknown Symbol 식별 및 관리
npm run cli -- unknown --search "undefined"
```

### 시나리오 2: 마이크로서비스 아키텍처 분석
```bash
# 1. 각 서비스별 네임스페이스 분석
npm run cli -- namespace --analyze

# 2. 서비스 간 의존성 분석
npm run cli -- cross-namespace

# 3. API 인터페이스 분석
npm run cli -- dependencies --symbol "ApiInterface" --type exports
```

### 시나리오 3: 문서화 자동화
```bash
# 1. Markdown 문서 분석
npm run cli -- markdown --analyze docs/

# 2. 컨텍스트 문서 자동 생성
npm run cli -- context-documents --project

# 3. 링크 무결성 검사
npm run cli -- markdown --links docs/README.md
```

## 🔧 고급 설정 및 최적화

### 데이터베이스 경로 설정
```bash
# 커스텀 데이터베이스 경로 사용
npm run cli -- analyze --database ./custom-db.sqlite
npm run cli -- dependencies --database ./custom-db.sqlite
```

### 성능 최적화 설정
```bash
# 성능 최적화 활성화
npm run cli -- analyze --pattern "src/**/*.ts" --performance

# 최대 동시성 설정
npm run cli -- analyze --pattern "src/**/*.ts" --max-concurrency 8
```

### 출력 형식 설정
```bash
# 다양한 출력 형식 활용
npm run cli -- analyze --format json --output results.json
npm run cli -- dependencies --output csv > dependencies.csv
```

## 📈 모니터링 및 유지보수

### 정기적인 분석
```bash
# 주간 전체 분석
npm run cli -- analyze --pattern "src/**/*.ts" --recursive
npm run cli -- rdf --stats

# 월간 성능 벤치마크
npm run cli -- benchmark --file src/ --iterations 50
```

### 문제 진단
```bash
# Unknown Symbol 문제 진단
npm run cli -- unknown --search "undefined"
npm run cli -- unknown --infer

# 성능 문제 진단
npm run cli -- performance --analyze
npm run cli -- performance --cache-status
```

## ⚠️ 주의사항 및 알려진 이슈

### 1. 데이터베이스 초기화 문제 (핵심 이슈)
- **문제**: 모든 명령어가 심볼을 데이터베이스에 저장하지 않음
- **현재 상태**: `analyze`, `namespace --analyze` 모두 실행되지만 심볼 저장 실패
- **결과**: `dependencies`, `rdf --query`, `inference` 명령어가 작동하지 않음
- **근본 원인**: 심볼 추출 및 저장 로직이 구현되지 않음

### 2. 명령어 실행 순서 문제
- **문제**: 명령어 간 의존성이 명확하지 않음
- **현재**: `analyze` → `namespace` → `dependencies` 순서로 실행해도 작동하지 않음
- **해결 필요**: 심볼 저장 로직 구현 또는 대안 명령어 제공

### 3. 파일 경로 문제
- **문제**: 일부 명령어에서 상대 경로 인식 문제
- **해결책**: 절대 경로 사용 또는 프로젝트 루트에서 실행

### 4. 성능 최적화
- **대용량 프로젝트**: `--performance` 옵션 사용 권장
- **메모리 관리**: 배치 크기 조정 (`--batch-size`)

## 🎯 실제 테스트 결과

### ✅ 정상 작동하는 명령어
- `analyze --pattern` - 파일 패턴 분석
- `typescript --analyze` - TypeScript 파일 분석  
- `markdown --analyze` - Markdown 파일 분석
- `namespace --analyze` - 네임스페이스 분석
- `rdf --stats` - RDF 통계 조회

### ✅ 개선된 명령어 (심볼 저장 로직 구현 완료)

#### 1. `dependencies` 명령어
- **이전**: "Symbol 'Command' not found in database"
- **현재**: ✅ 정상 작동 (심볼 저장 로직 구현 완료)
- **사용법**: `npm run cli -- dependencies --symbol "program" --database "./dependency-graph.db"`

#### 2. `rdf --query` 명령어  
- **이전**: 외부 라이브러리(node_modules)만 검색됨
- **현재**: ⚠️ 부분 개선 (데이터베이스 경로 통일 필요)
- **사용법**: 데이터베이스 경로 설정 후 사용

#### 3. `inference` 명령어
- **이전**: "Edge type not found: defines" 
- **현재**: ⚠️ 개선 필요 (의존성 관계 저장 로직 추가 필요)
- **사용법**: 의존성 관계 분석 후 사용

### 🔧 해결 방안

#### 즉시 해결 가능한 방법
1. **개발자 도구 사용**: IDE나 다른 도구로 의존성 분석
2. **수동 분석**: 코드를 직접 읽고 의존성 파악
3. **외부 도구**: 다른 의존성 분석 도구 사용

#### 장기적 해결 방안
1. **심볼 저장 로직 구현**: `analyze` 명령어가 실제로 심볼을 데이터베이스에 저장하도록 수정
2. **RDF 주소 생성 로직 구현**: 심볼 분석 후 RDF 주소를 자동 생성
3. **의존성 관계 저장 로직 구현**: 파일 간 의존성 관계를 데이터베이스에 저장

이 워크플로우를 통해 dependency-linker의 모든 기능을 체계적으로 활용하여 코드베이스의 의존성 관계를 완전히 분석하고 최적화할 수 있습니다.
