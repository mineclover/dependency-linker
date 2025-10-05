# RDF 기반 노드 식별 시스템

노드의 정의 위치를 명확히 식별하고 검색 가능하도록 하는 RDF 주소 체계

## 개요

기존 NodeIdentifier 시스템을 RDF(Resource Description Framework) 기반 주소 체계로 전환하여 다음을 달성:

1. **명확한 심볼 정의 위치**: 심볼이 어디에 정의되었는지 주소만으로 파악 가능
2. **검색 엔진 기능**: 파서가 RDF 주소를 역파싱하여 파일 위치로 이동
3. **고유성 보장**: 같은 파일 내 동일 심볼명 금지를 통한 문서 품질 강제
4. **참조 표준화**: 다른 곳에서 심볼 참조 시 통일된 주소 사용

## RDF 주소 형식

### 기본 구조

```
<projectName>/<filePath>#<NodeType>:<SymbolName>
```

### 구성 요소

- **projectName**: 프로젝트 이름 (NamespaceConfig에서 정의)
- **filePath**: 프로젝트 루트 기준 상대 경로
- **#**: RDF 주소와 메타 태그 구분자
- **NodeType**: 심볼 타입 (대문자 시작: Class, Method, Function, Interface 등)
- **:**: 메타 태그 내 modifier와 value 구분자
- **SymbolName**: 심볼 이름 (중첩 시 `.`으로 구분)

### 노드 타입별 형식

#### 1. 파일 노드 (메타 태그 없음)
```
dependency-linker/src/parser.ts
dependency-linker/docs/guide.md
```

#### 2. 디렉토리 노드 (메타 태그 없음)
```
dependency-linker/src/parsers
dependency-linker/docs
```

#### 3. 클래스/인터페이스/타입
```
dependency-linker/src/parser.ts#Class:TypeScriptParser
dependency-linker/src/types.ts#Interface:NodeTypeSpec
dependency-linker/src/types.ts#Type:NodeType
```

#### 4. 메서드/함수
```
dependency-linker/src/parser.ts#Method:TypeScriptParser.parse
dependency-linker/src/utils.ts#Function:normalizeFilePath
```

#### 5. 변수/상수/프로퍼티
```
dependency-linker/src/config.ts#Constant:DEFAULT_TIMEOUT
dependency-linker/src/parser.ts#Property:TypeScriptParser.tsParser
```

#### 6. 마크다운 심볼
```
dependency-linker/docs/guide.md#Heading:Installation
dependency-linker/README.md#Heading:Quick Start
```

#### 7. 외부 라이브러리/패키지 (프로젝트 이름 없음)
```
library#react
package#@types/node
```

## 메타 태그 시스템

### 메타 태그 구조

메타 태그는 `#` 이후의 문자열로, `modifier:value` 형식을 따릅니다.

```
#<modifier>:<value>
```

### 기본 메타 태그

#### NodeType 기반 (파싱 엔진이 부여)
```
#Class:TypeScriptParser
#Method:parse
#Function:normalizeFilePath
#Interface:NodeTypeSpec
#Heading:Installation
```

### 확장 가능한 메타 태그

메타 태그 시스템은 확장 가능하며, 다양한 수식어를 추가할 수 있습니다:

```
#tag:name/hello              # 커스텀 태그
#parsed-by:TypeScriptParser  # 파싱 주체
#defined-in:module/Class     # 정의 위치
#category:core               # 카테고리
```

**제약사항**: 하나의 노드는 하나의 메타 태그만 가질 수 있습니다.

## 예시

### TypeScript 클래스

**정의 위치**: `src/parsers/TypeScriptParser.ts`

```typescript
export class TypeScriptParser {
  parse(code: string): ParseResult {
    // ...
  }
}
```

**RDF 주소**:
```
dependency-linker/src/parsers/TypeScriptParser.ts#Class:TypeScriptParser
dependency-linker/src/parsers/TypeScriptParser.ts#Method:TypeScriptParser.parse
```

### 마크다운 문서

**정의 위치**: `docs/architecture.md`

```markdown
# System Architecture

## Parser Layer
```

**RDF 주소**:
```
dependency-linker/docs/architecture.md#Heading:System Architecture
dependency-linker/docs/architecture.md#Heading:Parser Layer
```

### 관계 표현

```typescript
// Edge 정의
{
  source: "dependency-linker/src/graph.ts#Class:DependencyGraph",
  target: "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse",
  type: "calls"
}
```

## 고유성 제약

### 파일 내 심볼 고유성

같은 파일 내에서 동일한 심볼 이름을 가질 수 없습니다. 이는 문서 품질을 강제하기 위한 의도적 제약입니다.

**허용되지 않는 경우**:
```typescript
// ❌ 같은 파일에 동일 이름 함수
function calculate() { /* 첫 번째 */ }
function calculate() { /* 두 번째 */ }
```

**권장 패턴**:
```typescript
// ✅ 명확한 이름으로 구분
function calculateTotal() { /* ... */ }
function calculateAverage() { /* ... */ }
```

## 검색 엔진 기능

### RDF 주소 → 파일 위치 변환

```typescript
// RDF 주소 파싱
const address = "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";
const parsed = nodeIdentifier.parseRdfAddress(address);

// 결과
{
  projectName: "dependency-linker",
  filePath: "src/parser.ts",
  nodeType: "Method",
  symbolName: "TypeScriptParser.parse",
  raw: "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse"
}

// 에디터에서 위치 열기
// → /Users/user/project/dependency-linker/src/parser.ts
// → TypeScriptParser 클래스의 parse 메서드로 이동
```

## 구현 상태

### 완료된 작업

- [x] NamespaceConfig에 `projectName` 필드 추가
- [x] RdfAddress 타입 정의
- [x] NodeIdentifier.createIdentifier() RDF 형식으로 변경
- [x] NodeIdentifier.parseIdentifier() RDF 파싱으로 변경
- [x] NodeIdentifier.parseRdfAddress() 구현
- [x] NodeIdentifier.validateIdentifier() RDF 검증으로 변경

### 진행 중인 작업

- [ ] NodeContext에 projectName 필드 전파
- [ ] 기존 코드에서 NodeIdentifier 사용처 업데이트
- [ ] 테스트 작성 및 검증

### 향후 작업

- [ ] 에디터 통합 (RDF 주소 → 파일 위치 이동)
- [ ] CLI 검색 명령어 (`find-symbol <rdf-address>`)
- [ ] 고유성 검증 (같은 파일 내 중복 심볼 감지)

## 사용 시나리오

### 시나리오 1: 심볼 검색

```bash
# CLI에서 RDF 주소로 심볼 검색
$ deps analyze find-symbol "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse"

# 출력:
# Found: TypeScriptParser.parse
# File: /Users/user/project/dependency-linker/src/parser.ts
# Line: 67
# Type: Method
```

### 시나리오 2: 의존성 추적

```bash
# 특정 심볼을 사용하는 모든 곳 찾기
$ deps analyze find-references "dependency-linker/src/parser.ts#Class:TypeScriptParser"

# 출력:
# References to TypeScriptParser:
# 1. dependency-linker/src/graph.ts#Method:DependencyGraph.analyze (calls)
# 2. dependency-linker/src/cli.ts#Function:main (instantiates)
```

### 시나리오 3: 문서 내비게이션

```markdown
<!-- 다른 문서에서 심볼 참조 -->
See [[dependency-linker/src/parser.ts#Method:TypeScriptParser.parse]] for implementation details.
```

## 설계 결정 사항

### 1. 위치 정보 제거

**기존 형식**:
```
method#src/parser.ts::TypeScriptParser.parse()@67:4
```

**새 형식**:
```
dependency-linker/src/parser.ts#Method:TypeScriptParser.parse
```

**이유**:
- 위치 정보(`@67:4`)는 파일 변경 시 쉽게 무효화됨
- 심볼 이름만으로 충분히 고유성 보장 (파일 내 중복 금지)
- 실제 위치는 파서가 런타임에 찾을 수 있음

### 2. 매개변수 시그니처 제거

**기존 형식**:
```
method#src/parser.ts::parse(string,number)@67:4
```

**새 형식**:
```
dependency-linker/src/parser.ts#Method:TypeScriptParser.parse
```

**이유**:
- 오버로딩이 있는 경우 복잡도 증가
- 같은 파일 내 동일 메서드명 금지로 고유성 보장
- 타입 정보는 별도 메타데이터로 관리 가능

### 3. NodeType 대문자화

**이유**:
- 메타 태그 가독성 향상
- 파일명과 타입명 구분 명확화
- RDF 표준과 유사한 컨벤션

### 4. 프로젝트 이름 명시

**이유**:
- 멀티 프로젝트 환경 지원
- 외부 프로젝트 참조 가능
- 전역적으로 고유한 주소 체계

## 마이그레이션 가이드

### 기존 코드 업데이트

```typescript
// Before
const identifier = new NodeIdentifier(projectRoot);
const id = identifier.createIdentifier("class", "TypeScriptParser", {
  sourceFile: "src/parser.ts",
  language: "typescript",
  projectRoot: projectRoot
});
// 결과: "class#src/parser.ts::TypeScriptParser@45:2"

// After
const identifier = new NodeIdentifier(projectRoot);
const id = identifier.createIdentifier("class", "TypeScriptParser", {
  sourceFile: "src/parser.ts",
  language: "typescript",
  projectRoot: projectRoot,
  projectName: "dependency-linker"  // 추가
});
// 결과: "dependency-linker/src/parser.ts#Class:TypeScriptParser"
```

### NamespaceConfig 업데이트

```json
{
  "namespaces": {
    "source": {
      "projectName": "dependency-linker",
      "filePatterns": ["src/**/*.ts"],
      "semanticTags": ["source", "production"]
    }
  }
}
```

## 참고 자료

- [RDF Primer](https://www.w3.org/TR/rdf-primer/)
- [URI Fragment Identifiers](https://www.w3.org/TR/fragid/)
- [NodeIdentifier.ts](../src/database/core/NodeIdentifier.ts)
- [NamespaceConfig Types](../src/namespace/types.ts)

---

*Last Updated: 2025-10-04*
*Version: 3.1.0-dev*
