# CLI 명령어 참조

dependency-linker의 모든 CLI 명령어에 대한 완전한 참조 가이드입니다.

## 🎯 개요

dependency-linker는 14개의 핵심 CLI 명령어를 통해 강력한 의존성 분석 기능을 제공합니다. 중복이 제거되고 최적화된 명령어 구조로 사용자 경험을 향상시켰습니다.

## 📋 명령어 목록

### 기본 명령어
- `analyze` - 파일 및 디렉토리 분석
- `rdf` - RDF 주소 생성, 검색, 검증, 통계
- `rdf-file` - RDF 기반 파일 위치 반환 및 파일 열기
- `dependencies` - 심볼 중심 의존성 분석 및 파일 내 심볼 리스트 조회

### 고급 기능 명령어
- `unknown` - Unknown Symbol 등록, 검색, 추론
- `query` - SQL, GraphQL, 자연어 쿼리 실행
- `cross-namespace` - 네임스페이스 간 의존성 분석
- `inference` - 계층적, 전이적 추론 실행
- `context-documents` - 파일, 심볼, 프로젝트 컨텍스트 문서 생성

### 성능 및 분석 명령어
- `performance` - 성능 분석, 캐시 관리, 모니터링, 최적화
- `markdown` - Markdown 파일 분석, 링크 추적, 헤딩 추출
- `typescript` - TypeScript 파일/프로젝트 분석, 벤치마크
- `namespace` - 네임스페이스 분석, 최적화, 통계
- `benchmark` - 성능 벤치마크 실행

## 🚀 기본 명령어

### 1. dependencies - 심볼 중심 의존성 분석

#### 기본 사용법
```bash
npm run cli -- dependencies [options]
```

#### 옵션
- `-s, --symbol <name>`: 분석할 심볼 이름
- `-f, --file <path>`: 분석할 파일 경로 (선택사항)
- `-t, --type <type>`: 의존성 타입 (imports, exports, both) (기본값: "both")
- `-d, --depth <number>`: 분석 깊이 (1-5) (기본값: "2")
- `-o, --output <format>`: 출력 형식 (json, table, list) (기본값: "table")
- `--include-external`: 외부 의존성 포함
- `--include-internal`: 내부 의존성 포함
- `--database <path>`: 데이터베이스 경로

#### 사용 예시

**심볼 중심 의존성 분석:**
```bash
# 특정 심볼의 의존성 분석
npm run cli -- dependencies --symbol "UserService"

# JSON 형식으로 API 연동용 데이터
npm run cli -- dependencies --symbol "AuthService" --output json

# 읽기 쉬운 리스트 형식
npm run cli -- dependencies --symbol "UserRepository" --output list
```

**파일 내 심볼 리스트 조회:**
```bash
# 파일 내 모든 심볼 목록 조회 (테이블 형식)
npm run cli -- dependencies --file "src/parser.ts" --output list

# 파일 내 모든 심볼 목록 조회 (JSON 형식)
npm run cli -- dependencies --file "src/utils.ts" --output json

# 파일의 첫 번째 심볼 의존성 분석
npm run cli -- dependencies --file "src/services/UserService.ts"
```

#### 출력 예시

**심볼 의존성 분석 (Table 형식):**
```
🎯 Symbol Analysis Results:
============================================================

📊 Target Symbol: parse
📄 File: src/parser.ts
📍 Location: Line 0, Column 0
📝 Description: Symbol 'parse' (Method)
🏷️  Tags: Method
⚡ Complexity: medium
👤 Author: system
📅 Last Modified: 2025-10-05 14:41:50

🔗 Nearest Nodes:
Name                Type        Relationship   Distance  File
--------------------------------------------------------------------------------
helper              Function    calls          1         src/utils.ts

📈 Graph Statistics:
  Total Connected Nodes: 1
  Direct Connections: 1
  Indirect Connections: 0
  Average Distance: 1
  Complexity Score: 2.5/10
  Centrality Score: 1
```

**파일 심볼 리스트 (List 형식):**
```
📄 File: src/parser.ts
📊 Total Symbols: 1

🔍 Symbols:
Name                Type           Line    Description
------------------------------------------------------------
parse               Method         0       Method parse
```

**JSON 형식:**
```json
{
  "filePath": "src/utils.ts",
  "symbols": [
    {
      "name": "helper",
      "type": "Function",
      "line": 0,
      "column": 0,
      "description": "Function helper"
    }
  ],
  "totalCount": 1
}
```

### 2. analyze - 파일 분석

#### 기본 사용법
```bash
npm run cli -- analyze [options]
```

#### 옵션
- `-p, --pattern <pattern>`: 분석할 파일 패턴
- `-d, --directory <dir>`: 분석할 디렉토리
- `-r, --recursive`: 재귀적 분석
- `-o, --output <file>`: 출력 파일
- `--format <format>`: 출력 형식 (json, csv, xml)
- `--performance`: 성능 최적화 활성화
- `--verbose`: 상세 출력
- `--database <path>`: 데이터베이스 경로

#### 사용 예시
```bash
# TypeScript 파일 분석
npm run cli -- analyze --pattern "src/**/*.ts"

# JavaScript 파일 분석
npm run cli -- analyze --pattern "src/**/*.js"

# 디렉토리 분석
npm run cli -- analyze --directory "src"

# 재귀적 분석
npm run cli -- analyze --directory "src" --recursive

# 성능 최적화와 함께 분석
npm run cli -- analyze --pattern "src/**/*.ts" --performance

# JSON 형식으로 출력
npm run cli -- analyze --pattern "src/**/*.ts" --format json

# 상세 출력
npm run cli -- analyze --pattern "src/**/*.ts" --verbose

# 출력 파일 지정
npm run cli -- analyze --pattern "src/**/*.ts" --output "results.json"
```

### 2. rdf - RDF 주소 관리

#### 기본 사용법
```bash
npm run cli -- rdf [options]
```

#### 옵션
- `-c, --create`: RDF 주소 생성
- `-p, --project <project>`: 프로젝트명
- `-f, --file <file>`: 파일 경로
- `-t, --type <type>`: 노드 타입
- `-s, --symbol <symbol>`: 심볼명
- `-q, --query <query>`: 검색 쿼리
- `-n, --namespace <namespace>`: 네임스페이스명
- `-v, --validate`: RDF 주소 검증
- `-a, --address <address>`: 검증할 RDF 주소
- `--uniqueness`: 고유성 검사
- `--stats`: RDF 통계 표시
- `--by-type`: 타입별 통계
- `--all`: 모든 통계 표시

#### 사용 예시
```bash
# RDF 주소 생성
npm run cli -- rdf --create --project "my-project" --file "src/UserService.ts" --type "class" --symbol "UserService"

# RDF 주소 검색
npm run cli -- rdf --query "UserService"

# RDF 주소 검증
npm run cli -- rdf --validate

# RDF 통계
npm run cli -- rdf --stats
```

### 3. rdf-file - RDF 기반 파일 위치 반환

#### 기본 사용법
```bash
npm run cli -- rdf-file [options]
```

#### 옵션
- `-l, --location <rdf-address>`: 파일 위치 정보 반환
- `-o, --open <rdf-address>`: 파일 열기
- `-p, --path <rdf-address>`: 파일 경로 반환
- `-r, --relative <rdf-address>`: 상대 경로 반환
- `-c, --content <rdf-address>`: 파일 내용 반환
- `-s, --symbol <rdf-address>`: 심볼 정보 반환
- `-e, --exists <rdf-address>`: 파일 존재 여부 확인
- `-v, --validate <rdf-address>`: RDF 주소 유효성 검증
- `--editor <editor>`: 에디터 지정
- `--line <number>`: 라인 번호
- `--column <number>`: 컬럼 번호
- `--wait`: 에디터 종료까지 대기
- `--start-line <number>`: 파일 내용 시작 라인
- `--end-line <number>`: 파일 내용 끝 라인
- `--database <path>`: 데이터베이스 경로

#### 사용 예시
```bash
# 파일 위치 정보 조회
npm run cli -- rdf-file --location "my-project/src/UserService.ts#class:UserService"

# 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService"

# VS Code로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code

# 특정 라인으로 파일 열기
npm run cli -- rdf-file --open "my-project/src/UserService.ts#class:UserService" --editor code --line 10

# 파일 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService"

# 특정 라인 범위 내용 조회
npm run cli -- rdf-file --content "my-project/src/UserService.ts#class:UserService" --start-line 1 --end-line 20

# 심볼 정보 조회
npm run cli -- rdf-file --symbol "my-project/src/UserService.ts#class:UserService"

# 파일 존재 여부 확인
npm run cli -- rdf-file --exists "my-project/src/UserService.ts#class:UserService"

# RDF 주소 유효성 검증
npm run cli -- rdf-file --validate "my-project/src/UserService.ts#class:UserService"
```

### 4. unknown - Unknown Symbol 관리

#### 기본 사용법
```bash
npm run cli -- unknown [options]
```

#### 옵션
- `-r, --register <symbol>`: Unknown Symbol 등록
- `-f, --file <file>`: 파일 경로
- `-s, --search <query>`: Unknown Symbol 검색
- `-i, --infer`: 추론 실행
- `--database <path>`: 데이터베이스 경로

#### 사용 예시
```bash
# Unknown Symbol 등록
npm run cli -- unknown --register "processUser" --file "src/UserService.ts"

# Unknown Symbol 검색
npm run cli -- unknown --search "processUser"

# 추론 실행
npm run cli -- unknown --infer
```

### 5. query - Query 시스템

#### 기본 사용법
```bash
npm run cli -- query [options]
```

#### 옵션
- `--sql <query>`: SQL 쿼리 실행
- `--graphql <query>`: GraphQL 쿼리 실행
- `--natural <query>`: 자연어 쿼리 실행
- `--format <format>`: 결과 형식 (json, csv, table)
- `--limit <number>`: 결과 제한
- `--offset <number>`: 결과 오프셋

#### 사용 예시
```bash
# SQL 쿼리 실행
npm run cli -- query --sql "SELECT * FROM nodes WHERE type = 'class'"

# GraphQL 쿼리 실행
npm run cli -- query --graphql "{ nodes { id name type } }"

# 자연어 쿼리 실행
npm run cli -- query --natural "find all React components"

# JSON 형식으로 결과 반환
npm run cli -- query --sql "SELECT * FROM nodes" --format json
```

### 6. cross-namespace - Cross-Namespace 의존성 분석

#### 기본 사용법
```bash
npm run cli -- cross-namespace [options]
```

#### 옵션
- `--analyze <namespace1> <namespace2>`: 네임스페이스 간 의존성 분석
- `--circular`: 순환 의존성 검출
- `--stats`: 의존성 통계 생성
- `--graph`: 의존성 그래프 생성
- `--namespace <namespace>`: 특정 네임스페이스
- `--format <format>`: 그래프 형식 (svg, html, json, dot)

#### 사용 예시
```bash
# 네임스페이스 간 의존성 분석
npm run cli -- cross-namespace --analyze "auth" "user"

# 순환 의존성 검출
npm run cli -- cross-namespace --circular

# 의존성 통계 생성
npm run cli -- cross-namespace --stats

# 의존성 그래프 생성
npm run cli -- cross-namespace --graph
```

### 7. inference - Inference 시스템

#### 기본 사용법
```bash
npm run cli -- inference [options]
```

#### 옵션
- `--hierarchical <node-id> --edge-type <type>`: 계층적 추론
- `--transitive <node-id> --edge-type <type>`: 전이적 추론
- `--execute <node-id>`: 추론 실행
- `--results`: 추론 결과 조회
- `--depth <number>`: 추론 깊이
- `--max-depth <number>`: 최대 추론 깊이
- `--rules <rules>`: 추론 규칙
- `--threshold <threshold>`: 신뢰도 임계값
- `--node <node-id>`: 특정 노드의 결과 조회

#### 사용 예시
```bash
# 계층적 추론 실행
npm run cli -- inference --hierarchical 123 --edge-type imports

# 전이적 추론 실행
npm run cli -- inference --transitive 123 --edge-type depends_on

# 추론 실행
npm run cli -- inference --execute 123

# 추론 결과 조회
npm run cli -- inference --results
```

### 8. context-documents - Context Documents 생성

#### 기본 사용법
```bash
npm run cli -- context-documents [options]
```

#### 옵션
- `--file <file>`: 파일 컨텍스트 문서 생성
- `--symbol <file> --symbol-path <path>`: 심볼 컨텍스트 문서 생성
- `--project`: 프로젝트 컨텍스트 문서 생성
- `--format <format>`: 문서 형식 (markdown, html, json)
- `--output <path>`: 출력 디렉토리
- `--template <template>`: 템플릿 지정

#### 사용 예시
```bash
# 파일 컨텍스트 문서 생성
npm run cli -- context-documents --file "src/UserService.ts"

# 심볼 컨텍스트 문서 생성
npm run cli -- context-documents --symbol "src/UserService.ts" --symbol-path "UserService"

# 프로젝트 컨텍스트 문서 생성
npm run cli -- context-documents --project

# HTML 형식으로 문서 생성
npm run cli -- context-documents --file "src/UserService.ts" --format html
```

### 9. performance - Performance Optimization

#### 기본 사용법
```bash
npm run cli -- performance [options]
```

#### 옵션
- `-a, --analyze <project>`: 성능 분석
- `-c, --cache <operation>`: 캐시 관리
- `-b, --batch <operation>`: 배치 처리 관리
- `-m, --monitor`: 성능 모니터링
- `--optimize-memory`: 메모리 최적화
- `--benchmark`: 성능 벤치마크
- `-s, --stats`: 성능 통계
- `--database <path>`: 데이터베이스 경로

#### 사용 예시
```bash
# 성능 분석
npm run cli -- performance --analyze "my-project"

# 캐시 관리
npm run cli -- performance --cache clear
npm run cli -- performance --cache stats

# 배치 처리 관리
npm run cli -- performance --batch start
npm run cli -- performance --batch stats

# 성능 모니터링
npm run cli -- performance --monitor

# 메모리 최적화
npm run cli -- performance --optimize-memory

# 성능 벤치마크
npm run cli -- performance --benchmark

# 성능 통계
npm run cli -- performance --stats
```

## 🎯 고급 명령어

### 1. markdown - Markdown 분석

#### 기본 사용법
```bash
npm run cli -- markdown [options]
```

#### 옵션
- `--analyze <file>`: Markdown 파일 분석
- `--track-links`: 링크 추적
- `--extract-headings`: 헤딩 추출
- `--collect-tags`: 태그 수집
- `--map-tags`: 태그 매핑
- `--generate-docs`: 문서 생성
- `--validate-types`: 타입 검증

#### 사용 예시
```bash
# Markdown 파일 분석
npm run cli -- markdown --analyze "docs/README.md"

# 링크 추적
npm run cli -- markdown --track-links "docs/README.md"

# 헤딩 추출
npm run cli -- markdown --extract-headings "docs/README.md"
```

### 2. typescript - TypeScript 분석

#### 기본 사용법
```bash
npm run cli -- typescript [options]
```

#### 옵션
- `--analyze <file>`: TypeScript 파일 분석
- `--project <project>`: TypeScript 프로젝트 분석
- `--benchmark`: 성능 벤치마크

#### 사용 예시
```bash
# TypeScript 파일 분석
npm run cli -- typescript --analyze "src/UserService.ts"

# TypeScript 프로젝트 분석
npm run cli -- typescript --project "src/"

# 성능 벤치마크
npm run cli -- typescript --benchmark
```

### 3. namespace - 네임스페이스 관리

#### 기본 사용법
```bash
npm run cli -- namespace [options]
```

#### 옵션
- `--analyze`: 네임스페이스 분석
- `--optimize`: 네임스페이스 최적화
- `--stats`: 네임스페이스 통계

#### 사용 예시
```bash
# 네임스페이스 분석
npm run cli -- namespace --analyze

# 네임스페이스 최적화
npm run cli -- namespace --optimize

# 네임스페이스 통계
npm run cli -- namespace --stats
```

### 4. benchmark - 성능 벤치마크

#### 기본 사용법
```bash
npm run cli -- benchmark [options]
```

#### 옵션
- `--file <file>`: 벤치마크할 파일
- `--iterations <number>`: 반복 횟수
- `--output <file>`: 출력 파일

#### 사용 예시
```bash
# 성능 벤치마크
npm run cli -- benchmark --file "src/UserService.ts" --iterations 10
```

## 🔧 설정 옵션

### 1. 전역 옵션

#### 데이터베이스 설정
```bash
# 데이터베이스 경로 지정
npm run cli -- --database "custom.db" analyze --pattern "src/**/*.ts"

# 데이터베이스 초기화
npm run cli -- --database "custom.db" rdf --create --project "test" --file "src/test.ts" --type "class" --symbol "Test"
```

#### 프로젝트 루트 설정
```bash
# 프로젝트 루트 지정
npm run cli -- --project-root "/path/to/project" analyze --pattern "src/**/*.ts"
```

### 2. 성능 설정

#### 메모리 설정
```bash
# 메모리 제한 설정
npm run cli -- analyze --pattern "src/**/*.ts" --memory-limit 2048

# 캐시 크기 제한 설정
npm run cli -- performance --cache-size-limit 524288000
```

#### 동시성 설정
```bash
# 최대 동시 실행 수 설정
npm run cli -- analyze --pattern "src/**/*.ts" --max-concurrency 8

# 배치 크기 설정
npm run cli -- analyze --pattern "src/**/*.ts" --batch-size 20
```

### 3. 출력 설정

#### 형식 설정
```bash
# JSON 형식으로 출력
npm run cli -- analyze --pattern "src/**/*.ts" --format json

# CSV 형식으로 출력
npm run cli -- query --sql "SELECT * FROM nodes" --format csv

# 테이블 형식으로 출력
npm run cli -- query --sql "SELECT * FROM nodes" --format table
```

#### 출력 파일 설정
```bash
# 출력 파일 지정
npm run cli -- analyze --pattern "src/**/*.ts" --output "results.json"

```

## 📚 추가 리소스

### 관련 문서
- [완전한 기능 가이드](./COMPLETE-FEATURE-GUIDE.md)
- [RDF 기반 파일 위치 반환 시스템 가이드](./RDF-FILE-SYSTEM-GUIDE.md)
- [데모 환경 가이드](./DEMO-ENVIRONMENT-GUIDE.md)

### 예시 코드
- [CLI 핸들러 예시](../../src/cli/handlers/)
- [데모 예시](../../demo/examples/)

### 설정 파일
- [dependency-linker.config.json](../../demo/configs/dependency-linker.config.json)
- [namespace-config.json](../../demo/configs/namespace-config.json)
