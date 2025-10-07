# 기능 비교 가이드

dependency-linker의 다양한 기능들을 비교하고 언제 어떤 기능을 사용해야 하는지에 대한 가이드입니다.

## 🎯 개요

dependency-linker는 다양한 분석 및 관리 기능을 제공합니다. 각 기능의 특징과 사용 시나리오를 비교하여 최적의 선택을 할 수 있도록 도와줍니다.

## 🚀 핵심 기능 비교

### 1. 심볼 중심 의존성 분석 vs 파일 분석

#### 심볼 중심 의존성 분석 (`dependencies`)
- **목적**: 특정 심볼의 의존성 관계 분석 및 파일 내 심볼 리스트 조회
- **출력**: 심볼 메타데이터, 최근점 노드들, 그래프 통계
- **사용 시나리오**: 코드 리팩토링, 의존성 추적, 심볼 탐색

```bash
# 심볼 의존성 분석
npm run cli -- dependencies --symbol "UserService"

# 파일 내 심볼 리스트 조회
npm run cli -- dependencies --file "src/parser.ts" --output list
```

#### 파일 분석 (`analyze`)
- **목적**: 파일의 구조와 의존성을 분석하여 데이터베이스에 저장
- **출력**: 심볼, 의존성, 메타데이터를 데이터베이스에 저장
- **사용 시나리오**: 프로젝트 전체 구조 파악, 데이터베이스 구축

```bash
# 파일 분석
npm run cli -- analyze --pattern "src/**/*.ts"
```

**언제 사용할까?**
- **심볼 중심 의존성 분석**: 특정 심볼의 관계를 파악하거나 파일 내 심볼을 탐색할 때
- **파일 분석**: 프로젝트를 처음 분석하거나 데이터베이스를 구축할 때

### 2. 파일 분석 vs RDF 주소 생성

#### 파일 분석 (`analyze`)
- **목적**: 파일의 구조와 의존성을 분석
- **출력**: 심볼, 의존성, 메타데이터
- **사용 시나리오**: 프로젝트 전체 구조 파악, 의존성 분석

```bash
# 파일 분석
npm run cli -- analyze --pattern "src/**/*.ts"
```

#### RDF 주소 생성 (`rdf --create`)
- **목적**: 고유한 식별자로 심볼 식별
- **출력**: RDF 주소
- **사용 시나리오**: 심볼 참조, 파일 위치 반환

```bash
# RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
```

**언제 사용할까?**
- **파일 분석**: 프로젝트 구조를 처음 파악할 때
- **RDF 주소 생성**: 특정 심볼을 참조하거나 파일을 열어야 할 때

### 2. RDF 주소 생성 vs RDF 파일 위치 반환

#### RDF 주소 생성 (`rdf --create`)
- **목적**: 심볼에 대한 고유한 식별자 생성
- **출력**: RDF 주소 문자열
- **사용 시나리오**: 심볼 등록, 데이터베이스 저장

```bash
# RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
```

#### RDF 파일 위치 반환 (`rdf-file`)
- **목적**: RDF 주소로 파일 위치 정보 조회 및 파일 열기
- **출력**: 파일 경로, 위치 정보, 파일 내용
- **사용 시나리오**: 파일 탐색, 파일 열기, 코드 리뷰

```bash
# 파일 위치 반환
npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"

# 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code
```

**언제 사용할까?**
- **RDF 주소 생성**: 심볼을 시스템에 등록할 때
- **RDF 파일 위치 반환**: 등록된 심볼의 파일을 찾거나 열어야 할 때

### 3. Query 시스템 비교

#### SQL 쿼리 (`query --sql`)
- **장점**: 정확한 데이터 조회, 복잡한 조건 지원
- **단점**: SQL 문법 지식 필요
- **사용 시나리오**: 정확한 데이터 조회, 복잡한 분석

```bash
# SQL 쿼리
npm run cli -- query --sql "SELECT * FROM nodes WHERE type = 'class'"
```

#### GraphQL 쿼리 (`query --graphql`)
- **장점**: 구조화된 데이터 조회, 관계 포함
- **단점**: GraphQL 문법 지식 필요
- **사용 시나리오**: 관계형 데이터 조회, API 스타일 쿼리

```bash
# GraphQL 쿼리
npm run cli -- query --graphql "{ nodes { id name type relationships { type target { name } } } }"
```

#### 자연어 쿼리 (`query --natural`)
- **장점**: 직관적, 문법 지식 불필요
- **단점**: 정확도 제한, 복잡한 쿼리 어려움
- **사용 시나리오**: 빠른 검색, 초보자용

```bash
# 자연어 쿼리
npm run cli -- query --natural "find all React components"
```

**언제 사용할까?**
- **SQL**: 정확한 데이터 조회가 필요할 때
- **GraphQL**: 관계형 데이터를 조회할 때
- **자연어**: 빠르고 직관적인 검색이 필요할 때

### 4. Unknown Symbol vs Inference 시스템

#### Unknown Symbol 시스템 (`unknown`)
- **목적**: 내부 메서드와 외부 심볼 간의 동등성 추론
- **특징**: 심볼 등록, 추론 규칙 적용
- **사용 시나리오**: 내부 메서드 추적, 심볼 매핑

```bash
# Unknown Symbol 등록
npm run cli -- unknown --register "processUser" "src/UserService.ts"

# 추론 실행
npm run cli -- unknown --infer
```

#### Inference 시스템 (`inference`)
- **목적**: 노드 간의 관계 추론
- **특징**: 계층적, 전이적, 상속 가능한 추론
- **사용 시나리오**: 의존성 추론, 관계 분석

```bash
# 계층적 추론
npm run cli -- inference --hierarchical 123 --edge-type imports

# 전이적 추론
npm run cli -- inference --transitive 123 --edge-type depends_on
```

**언제 사용할까?**
- **Unknown Symbol**: 내부 메서드의 외부 심볼과의 관계를 찾을 때
- **Inference**: 노드 간의 복잡한 관계를 추론할 때

### 5. Cross-Namespace vs Performance Optimization

#### Cross-Namespace 분석 (`cross-namespace`)
- **목적**: 네임스페이스 간 의존성 분석
- **특징**: 순환 의존성 검출, 의존성 그래프 생성
- **사용 시나리오**: 아키텍처 분석, 의존성 최적화

```bash
# 네임스페이스 간 의존성 분석
npm run cli -- cross-namespace --analyze "auth" "user"

# 순환 의존성 검출
npm run cli -- cross-namespace --circular
```

#### Performance Optimization (`performance`)
- **목적**: 성능 최적화 및 모니터링
- **특징**: 캐싱, 배치 처리, 시각화
- **사용 시나리오**: 성능 개선, 모니터링

```bash
# 성능 최적화
npm run cli -- performance --analyze "my-project"

# 성능 모니터링
npm run cli -- performance --monitor
```

**언제 사용할까?**
- **Cross-Namespace**: 아키텍처 구조를 분석할 때
- **Performance Optimization**: 성능을 개선하거나 모니터링할 때

## 🎯 사용 시나리오별 권장 기능

### 1. 프로젝트 초기 분석

#### 권장 워크플로우
```bash
# 1단계: 프로젝트 전체 분석
npm run cli -- analyze --pattern "src/**/*.ts" --include-statistics

# 2단계: RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"

# 3단계: 네임스페이스 분석
npm run cli -- cross-namespace --analyze "auth" "user"

# 4단계: 성능 최적화
npm run cli -- performance --analyze "my-project"
```

### 2. 코드 리뷰

#### 권장 워크플로우
```bash
# 1단계: 변경된 파일 식별
npm run cli -- rdf --query "UserService"

# 2단계: 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code

# 3단계: 의존성 확인
npm run cli -- cross-namespace --analyze "auth" "user"

# 4단계: 컨텍스트 문서 생성
npm run cli -- context-documents --file "src/UserService.ts"
```

### 3. 디버깅

#### 권장 워크플로우
```bash
# 1단계: 오류 위치 식별
npm run cli -- rdf --query "authenticateUser"

# 2단계: 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#function:authenticateUser" --editor code --line 25

# 3단계: 코드 확인
npm run cli -- rdf-file --content "my-project/src/UserService.ts#function:authenticateUser" --start-line 20 --end-line 30

# 4단계: 의존성 추론
npm run cli -- inference --execute 123
```

### 4. 성능 최적화

#### 권장 워크플로우
```bash
# 1단계: 성능 분석
npm run cli -- performance --analyze "my-project"

# 2단계: 성능 모니터링
npm run cli -- performance --monitor

# 3단계: 캐시 최적화
npm run cli -- performance --cache optimize

# 4단계: 메모리 최적화
npm run cli -- performance --optimize-memory

# 5단계: 벤치마크 실행
npm run cli -- performance --benchmark
```

## 🔧 기능 조합 전략

### 1. 기본 분석 + RDF 주소 생성
```bash
# 파일 분석 후 RDF 주소 생성
npm run cli -- analyze --pattern "src/**/*.ts"
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
```

### 2. RDF 주소 생성 + 파일 위치 반환
```bash
# RDF 주소 생성 후 파일 열기
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code
```

### 3. Query + Inference
```bash
# 쿼리로 노드 찾기 후 추론
npm run cli -- query --sql "SELECT id FROM nodes WHERE name = 'UserService'"
npm run cli -- inference --execute 123
```

### 4. Cross-Namespace + Performance
```bash
# 네임스페이스 분석 후 성능 최적화
npm run cli -- cross-namespace --analyze "auth" "user"
npm run cli -- performance --analyze "my-project"
```

## 📊 기능별 성능 특성

### 1. 처리 속도
- **빠름**: `rdf-file`, `query --natural`
- **보통**: `analyze`, `rdf --create`
- **느림**: `performance --analyze`, `inference --execute`

### 2. 메모리 사용량
- **낮음**: `rdf-file`, `query`
- **보통**: `analyze`, `rdf --create`
- **높음**: `performance --analyze`, `cross-namespace --graph`

### 3. 정확도
- **높음**: `analyze`, `rdf --create`, `query --sql`
- **보통**: `inference`, `cross-namespace`
- **낮음**: `query --natural`

## 🎯 선택 가이드

### 1. 프로젝트 크기별 권장 기능

#### 소규모 프로젝트 (< 1000 파일)
- **주요 기능**: `analyze`, `rdf --create`, `rdf-file`
- **선택적 기능**: `query --natural`, `context-documents`

#### 중규모 프로젝트 (1000-10000 파일)
- **주요 기능**: `analyze`, `rdf --create`, `rdf-file`, `cross-namespace`
- **선택적 기능**: `inference`, `performance --analyze`

#### 대규모 프로젝트 (> 10000 파일)
- **주요 기능**: `analyze`, `rdf --create`, `performance --analyze`
- **필수 기능**: `cross-namespace`, `inference`

### 2. 사용자 경험별 권장 기능

#### 초보자
- **시작**: `analyze`, `rdf-file --open`
- **다음**: `query --natural`, `context-documents`

#### 중급자
- **시작**: `analyze`, `rdf --create`, `rdf-file`
- **다음**: `cross-namespace`, `inference`

#### 고급자
- **시작**: `analyze`, `rdf --create`, `performance --analyze`
- **다음**: `inference`, `cross-namespace --graph`

## 📚 추가 리소스

### 관련 문서
- [완전한 기능 가이드](./COMPLETE-FEATURE-GUIDE.md)
- [CLI 명령어 참조](./CLI-COMMAND-REFERENCE.md)
- [데모 환경 가이드](./DEMO-ENVIRONMENT-GUIDE.md)

### 예시 코드
- [기능 조합 예시](../../demo/examples/)
- [설정 파일](../../demo/configs/)
