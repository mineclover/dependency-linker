# RDF 기반 노드 식별 시스템

**Category**: Core Feature
**Status**: ✅ **Production Ready**
**Priority**: High
**Version**: 3.1.0 (완료)

---

## 🎯 왜 필요한가?

### 현재 문제점
- **불명확한 심볼 위치**: 노드 ID만으로는 심볼이 어디에 정의되었는지 알 수 없음
- **검색 불가**: 심볼 이름으로 정의 위치를 바로 찾을 수 없음
- **참조 불일치**: 같은 심볼을 참조하는데 여러 표현 방식이 혼재
- **에디터 통합 어려움**: ID → 파일 위치 변환 로직이 복잡

### 해결 방법
RDF(Resource Description Framework) 기반 주소 체계를 도입하여 **심볼의 정의 위치를 주소로 표현**합니다.

```
Before: "class#src/parser.ts::TypeScriptParser@45:2"
After:  "dependency-linker/src/parser.ts#Class:TypeScriptParser"
```

---

## 💡 핵심 가치

### 1. 명확한 위치 식별
```typescript
// RDF 주소만 보고 바로 이해 가능
const address = "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse";

// 프로젝트: dependency-linker
// 파일: src/parsers/TypeScriptParser.ts
// 타입: Method
// 심볼: parse
```

### 2. 역파싱으로 파일 이동
```typescript
// RDF 주소 → 파일 위치 변환
const parsed = nodeIdentifier.parseRdfAddress(address);
// → 에디터에서 해당 위치로 바로 이동 가능
```

### 3. 고유성 보장
```typescript
// ❌ 같은 파일에 동일 이름 금지 (문서 품질 강제)
function calculate() { }
function calculate() { }

// ✅ 명확한 이름 사용
function calculateTotal() { }
function calculateAverage() { }
```

### 4. 통일된 참조 표준
```markdown
<!-- 문서에서 심볼 참조 -->
See [[dependency-linker/src/parser.ts#Method:TypeScriptParser.parse]] for details.
```

---

## 📐 RDF 주소 형식

### 기본 구조
```
<projectName>/<filePath>#<NodeType>:<SymbolName>
```

### 예시

**TypeScript 클래스**:
```
dependency-linker/src/parsers/TypeScriptParser.ts#Class:TypeScriptParser
dependency-linker/src/parsers/TypeScriptParser.ts#Method:TypeScriptParser.parse
```

**마크다운 문서**:
```
dependency-linker/docs/architecture.md#Heading:System Architecture
dependency-linker/docs/architecture.md#Heading:Parser Layer
```

**외부 라이브러리**:
```
library#react
package#@types/node
```

### 메타 태그 시스템
```
#<modifier>:<value>

예시:
#Class:TypeScriptParser          (파싱 엔진이 부여)
#tag:name/hello                  (커스텀 태그)
#parsed-by:TypeScriptParser      (확장 가능)
```

---

## 🚀 실전 사용 예제

### 시나리오 1: 심볼 검색
```bash
# CLI에서 RDF 주소로 심볼 검색
$ deps analyze find-symbol "dependency-linker/src/parser.ts#Method:parse"

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
# 1. dependency-linker/src/graph.ts#Method:analyze (calls)
# 2. dependency-linker/src/cli.ts#Function:main (instantiates)
```

### 시나리오 3: 에디터 통합
```typescript
// VS Code Extension 예시
async function jumpToSymbol(rdfAddress: string) {
  const parsed = nodeIdentifier.parseRdfAddress(rdfAddress);
  const filePath = path.join(projectRoot, parsed.filePath);

  // 파일 열기
  const doc = await vscode.workspace.openTextDocument(filePath);

  // 심볼 위치 찾기 (파서 사용)
  const location = await findSymbolLocation(doc, parsed.symbolName);

  // 에디터에서 이동
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(location.line, 0, location.line, 0)
  });
}
```

---

## 🏗️ 아키텍처

### Before/After 비교

**Before (기존 NodeIdentifier)**:
```
class#src/parser.ts::TypeScriptParser@45:2
method#src/parser.ts::TypeScriptParser.parse(string)@67:4
```
문제점:
- 위치 정보(`@45:2`)는 파일 변경 시 무효화
- 매개변수 시그니처로 복잡도 증가
- 프로젝트 간 참조 불가

**After (RDF 기반)**:
```
dependency-linker/src/parser.ts#Class:TypeScriptParser
dependency-linker/src/parser.ts#Method:TypeScriptParser.parse
```
개선점:
- 위치 정보 제거 (런타임에 파서가 찾음)
- 간결한 형식, 확장 가능한 메타 태그
- 프로젝트 이름으로 전역 고유성 보장

### 데이터 플로우
```
코드 파싱 → NodeIdentifier.createIdentifier()
           ↓
        RDF 주소 생성
           ↓
        GraphDB 저장
           ↓
        검색/조회 시 parseRdfAddress()
           ↓
        파일 위치로 변환
```

---

## 📊 현재 상태

### ✅ **완료된 작업** (v3.1.0)
- [x] **RDF 주소 구조 구현**: `<projectName>/<filePath>#<NodeType>:<SymbolName>`
- [x] **핵심 컴포넌트 구현**:
  - [x] `RDFAddress.ts`: RDF 주소 생성/파싱/검증
  - [x] `RDFNodeIdentifier.ts`: RDF 기반 노드 식별자 관리
  - [x] `RDFAddressParser.ts`: 고급 검색/필터링/통계
  - [x] `RDFUniquenessValidator.ts`: 고유성 검증/충돌 해결
  - [x] `rdf-analysis.ts`: RDF 기반 분석 API
- [x] **NodeType 표준 정의**: 15개 표준 타입 (Class, Method, Function 등)
- [x] **언어별 매핑**: TypeScript, JavaScript, Java, Python, Go 지원
- [x] **고유성 검증**: 다층 중복 검사 및 충돌 해결
- [x] **고급 검색**: 부분 일치, 필터링, 그룹화, 통계 생성
- [x] **메타 태그 시스템**: 시멘틱 태그 방식 확장 가능

### 🚧 **개선 필요 영역** (v3.1.1-3.1.3)
- [ ] **CLI 통합**: RDF 주소 관리 명령어 추가
- [ ] **데이터베이스 통합**: GraphDatabase에 RDF 주소 저장
- [ ] **네임스페이스 통합**: NamespaceConfig와 RDF 주소 완전 통합
- [ ] **성능 최적화**: RDF 주소 캐싱 및 인덱싱

### 📋 **향후 계획** (v3.2.0+)
- [ ] **에디터 통합**: RDF 주소 → 파일 위치 자동 이동
- [ ] **VS Code Extension**: RDF 주소 기반 Go to Definition
- [ ] **문서 통합**: 마크다운에서 RDF 주소 자동 링크
- [ ] **성능 모니터링**: RDF 주소 처리 성능 추적

---

## 🎓 핵심 개념 정리

### RDF 주소의 3가지 역할
1. **식별자 (Identifier)**: 심볼의 고유한 주소
2. **검색 키 (Search Key)**: 심볼을 찾는 키워드
3. **네비게이션 (Navigation)**: 정의 위치로 이동하는 경로

### 설계 원칙
- **간결성 (Simplicity)**: 최소한의 정보로 심볼 식별
- **확장성 (Extensibility)**: 메타 태그로 정보 추가 가능
- **고유성 (Uniqueness)**: 전역적으로 고유한 주소 보장
- **가독성 (Readability)**: 사람이 읽고 이해 가능한 형식

---

## 🔗 관련 문서

- **상세 설계**: [docs/rdf-addressing.md](../../docs/rdf-addressing.md)
- **타입 시스템**: [docs/type-system.md](../../docs/type-system.md)
- **NodeIdentifier 구현**: [src/database/core/NodeIdentifier.ts](../../src/database/core/NodeIdentifier.ts)
- **NamespaceConfig**: [src/namespace/types.ts](../../src/namespace/types.ts)

---

**Last Updated**: 2025-10-05
**Next Review**: 2025-10-12
