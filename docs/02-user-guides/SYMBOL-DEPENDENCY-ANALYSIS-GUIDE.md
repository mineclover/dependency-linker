# 심볼 중심 의존성 분석 가이드

dependency-linker의 핵심 기능인 심볼 중심 의존성 분석에 대한 완전한 가이드입니다.

## 🎯 개요

심볼 중심 의존성 분석은 특정 심볼을 찾아서 그 심볼과 연결된 최근점 노드들과 메타데이터를 조회하는 핵심 기능입니다. 이는 문서와 코드를 연결하는 지식그래프의 의존성 분석 도구로서 실제 Graph DB와 RDF 시스템을 활용합니다.

## 🚀 핵심 기능

### 1. 심볼 중심 분석
- **특정 심볼 의존성 분석**: 특정 심볼의 의존성 관계 분석
- **최근점 노드 조회**: 연결된 노드들을 거리 기반으로 정렬
- **메타데이터 추출**: 심볼 타입, 위치, 설명, 태그, 복잡도 정보
- **그래프 통계**: 연결도, 복잡도, 중심성 점수 계산

### 2. 파일 내 심볼 리스트 조회
- **파일 내 모든 심볼 목록**: 파일 내 식별된 모든 심볼 조회
- **유연한 경로 매칭**: 정확한 경로, 하위 경로, 부분 매칭 지원
- **상세한 심볼 정보**: 이름, 타입, 위치, 설명 포함
- **성능 최적화**: 분석 없이 심볼 리스트만 빠르게 조회

## 📋 CLI 명령어

### 기본 사용법
```bash
npm run cli -- dependencies [options]
```

### 옵션
- `-s, --symbol <name>`: 분석할 심볼 이름
- `-f, --file <path>`: 분석할 파일 경로 (선택사항)
- `-t, --type <type>`: 의존성 타입 (imports, exports, both) (기본값: "both")
- `-d, --depth <number>`: 분석 깊이 (1-5) (기본값: "2")
- `-o, --output <format>`: 출력 형식 (json, table, list) (기본값: "table")
- `--include-external`: 외부 의존성 포함
- `--include-internal`: 내부 의존성 포함
- `--database <path>`: 데이터베이스 경로

## 🔍 사용 예시

### 심볼 중심 의존성 분석

#### 기본 분석
```bash
# 특정 심볼의 의존성 분석
npm run cli -- dependencies --symbol "UserService"
```

#### 다양한 출력 형식
```bash
# JSON 형식으로 API 연동용 데이터
npm run cli -- dependencies --symbol "AuthService" --output json

# 읽기 쉬운 리스트 형식
npm run cli -- dependencies --symbol "UserRepository" --output list

# 테이블 형식 (기본)
npm run cli -- dependencies --symbol "DataProcessor"
```

#### 분석 깊이 조절
```bash
# 1단계 직접 연결만 분석
npm run cli -- dependencies --symbol "UserService" --depth 1

# 3단계까지 간접 연결 분석
npm run cli -- dependencies --symbol "UserService" --depth 3
```

#### 외부/내부 의존성 필터링
```bash
# 외부 의존성만 포함
npm run cli -- dependencies --symbol "UserService" --include-external

# 내부 의존성만 포함
npm run cli -- dependencies --symbol "UserService" --include-internal
```

### 파일 내 심볼 리스트 조회

#### 기본 조회
```bash
# 파일 내 모든 심볼 목록 조회 (테이블 형식)
npm run cli -- dependencies --file "src/parser.ts" --output list

# 파일 내 모든 심볼 목록 조회 (JSON 형식)
npm run cli -- dependencies --file "src/utils.ts" --output json
```

#### 파일의 첫 번째 심볼 분석
```bash
# 파일의 첫 번째 심볼에 대한 의존성 분석
npm run cli -- dependencies --file "src/services/UserService.ts"
```

## 📊 출력 형식

### Table 형식 (기본)
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

### List 형식
```
🎯 Symbol: parse
📄 File: src/parser.ts
📍 Location: Line 0, Column 0
📝 Description: Symbol 'parse' (Method)
🏷️  Tags: Method

🔗 Nearest Nodes:
  1. 🔗 helper (Function)
     📄 src/utils.ts:0
     📝 Function helper
     🏷️  Function
     📏 Distance: 1

📈 Graph Statistics:
  Total Connected Nodes: 1
  Direct Connections: 1
  Indirect Connections: 0
  Average Distance: 1
  Complexity Score: 2.5/10
  Centrality Score: 1
```

### JSON 형식
```json
{
  "targetSymbol": "parse",
  "metadata": {
    "type": "Method",
    "file": "src/parser.ts",
    "line": 0,
    "column": 0,
    "scope": "unknown",
    "description": "Symbol 'parse' (Method)",
    "tags": ["Method"],
    "complexity": "medium",
    "lastModified": "2025-10-05 14:41:50",
    "author": "system",
    "version": "1.0.0"
  },
  "nearestNodes": [
    {
      "id": "test-project/src/utils.ts#Function:helper",
      "type": "Function",
      "name": "helper",
      "file": "src/utils.ts",
      "relationship": "calls",
      "distance": 1,
      "metadata": {
        "line": 0,
        "description": "Function helper",
        "tags": ["Function"]
      }
    }
  ],
  "graphStats": {
    "totalNodes": 1,
    "directConnections": 1,
    "indirectConnections": 0,
    "avgDistance": 1,
    "complexityScore": 2.5,
    "centralityScore": 1
  }
}
```

### 파일 심볼 리스트 (List 형식)
```
📄 File: src/parser.ts
📊 Total Symbols: 1

🔍 Symbols:
Name                Type           Line    Description
------------------------------------------------------------
parse               Method         0       Method parse
```

### 파일 심볼 리스트 (JSON 형식)
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

## 🔧 기술적 특징

### Graph DB 연동
- **실제 SQLite 데이터베이스**: 시뮬레이션 데이터가 아닌 실제 데이터 사용
- **RDF 주소 시스템**: `test-project/src/parser.ts#Method:parse` 형식의 고유 식별자
- **재귀적 관계 조회**: WITH RECURSIVE로 다단계 의존성 분석
- **메타데이터 통합**: 심볼 타입, 네임스페이스, 접근 제어자 정보

### 성능 최적화
- **유연한 파일 경로 매칭**: 정확한 경로, 하위 경로, 부분 매칭 지원
- **빠른 심볼 리스트 조회**: 분석 없이 심볼 리스트만 조회
- **효율적인 쿼리**: 인덱스를 활용한 최적화된 SQL 쿼리
- **메모리 효율성**: 필요한 데이터만 로드

### 확장성
- **다양한 출력 형식**: Table, JSON, List 형식 지원
- **API 연동**: JSON 형식으로 다른 도구와 연동 가능
- **커스터마이징**: 분석 깊이, 필터링 옵션 조절 가능
- **확장 가능한 구조**: 새로운 분석 기능 추가 용이

## 🎯 사용 시나리오

### 1. 코드 리팩토링
```bash
# 특정 클래스의 의존성 파악
npm run cli -- dependencies --symbol "UserService" --depth 2

# 파일 내 모든 심볼 확인
npm run cli -- dependencies --file "src/services/UserService.ts" --output list
```

### 2. 코드 리뷰
```bash
# 복잡한 함수의 의존성 분석
npm run cli -- dependencies --symbol "processUserData" --output json

# 파일의 구조 파악
npm run cli -- dependencies --file "src/utils/validation.ts" --output list
```

### 3. 문서화
```bash
# API 문서 생성을 위한 심볼 정보 수집
npm run cli -- dependencies --symbol "UserAPI" --output json

# 프로젝트 구조 분석
npm run cli -- dependencies --file "src/api/" --output list
```

### 4. 디버깅
```bash
# 문제가 있는 함수의 의존성 추적
npm run cli -- dependencies --symbol "problematicFunction" --depth 3

# 관련 파일들 확인
npm run cli -- dependencies --file "src/components/ProblematicComponent.tsx" --output list
```

## 🚀 고급 사용법

### 1. 배치 처리
```bash
# 여러 심볼 분석
for symbol in UserService AuthService DataService; do
  npm run cli -- dependencies --symbol "$symbol" --output json > "analysis_$symbol.json"
done
```

### 2. API 연동
```bash
# JSON 데이터를 다른 도구로 전달
npm run cli -- dependencies --symbol "UserService" --output json | jq '.nearestNodes[].name'
```

### 3. 자동화 스크립트
```bash
#!/bin/bash
# 프로젝트의 모든 주요 심볼 분석
SYMBOLS=("UserService" "AuthService" "DataService" "ValidationService")

for symbol in "${SYMBOLS[@]}"; do
  echo "Analyzing $symbol..."
  npm run cli -- dependencies --symbol "$symbol" --output json > "reports/$symbol.json"
done
```

## 📈 성능 팁

### 1. 효율적인 쿼리
- **적절한 깊이 설정**: 필요한 만큼만 깊이 설정 (기본값: 2)
- **필터링 활용**: 외부/내부 의존성 필터링으로 불필요한 데이터 제거
- **JSON 형식**: API 연동 시 JSON 형식 사용

### 2. 메모리 관리
- **작은 배치**: 큰 프로젝트는 작은 단위로 분석
- **캐시 활용**: 동일한 심볼 반복 분석 시 캐시 활용
- **데이터베이스 최적화**: 인덱스 활용으로 쿼리 성능 향상

### 3. 결과 활용
- **파일 저장**: 큰 결과는 파일로 저장
- **필터링**: 필요한 정보만 추출
- **자동화**: 반복 작업은 스크립트로 자동화

## 🔍 문제 해결

### 1. 심볼을 찾을 수 없는 경우
```bash
# 데이터베이스에 데이터가 있는지 확인
sqlite3 dependency-linker.db "SELECT COUNT(*) FROM rdf_addresses;"

# 프로젝트 분석 실행
npm run cli -- analyze --pattern "src/**/*.ts" --recursive
```

### 2. 파일을 찾을 수 없는 경우
```bash
# 유연한 경로 매칭으로 재시도
npm run cli -- dependencies --file "parser.ts" --output list

# 데이터베이스에서 파일 경로 확인
sqlite3 dependency-linker.db "SELECT DISTINCT file_path FROM rdf_addresses;"
```

### 3. 성능 문제
```bash
# 분석 깊이 줄이기
npm run cli -- dependencies --symbol "UserService" --depth 1

# 외부 의존성 제외
npm run cli -- dependencies --symbol "UserService" --include-internal
```

## 📚 관련 문서

- [CLI 명령어 참조](./CLI-COMMAND-REFERENCE.md) - 모든 CLI 명령어 참조
- [완전한 기능 가이드](./COMPLETE-FEATURE-GUIDE.md) - 전체 기능 가이드
- [RDF 기반 파일 위치 반환 시스템 가이드](./RDF-FILE-SYSTEM-GUIDE.md) - RDF 시스템 가이드
- [모범 사례 가이드](./BEST-PRACTICES-GUIDE.md) - 모범 사례 및 품질 보증
