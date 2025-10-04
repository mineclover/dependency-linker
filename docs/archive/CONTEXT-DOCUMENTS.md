# Context Document System

컨텍스트 문서 시스템은 프로젝트의 각 파일과 심볼에 대한 메타데이터와 개념적 정보를 저장하기 위한 마크다운 문서 생성 시스템입니다.

## 📁 폴더 구조

```
.dependency-linker/context/
├── files/                      # 파일 레벨 컨텍스트 문서
│   ├── src/                    # 프로젝트 구조 미러링
│   │   ├── database/
│   │   │   ├── GraphDatabase.ts.md
│   │   │   ├── core/
│   │   │   │   └── NodeIdentifier.ts.md
│   │   │   └── inference/
│   │   │       └── InferenceEngine.ts.md
│   │   └── core/
│   │       └── QueryEngine.ts.md
│   └── tests/
│       └── core-functionality.test.ts.md
│
└── symbols/                    # 심볼 레벨 컨텍스트 문서
    └── src/
        └── database/
            └── GraphDatabase.ts/
                ├── GraphDatabase.md
                ├── GraphDatabase__findNodes.md
                └── GraphDatabase__upsertNode.md
```

## 🔑 고유 식별자 체계

### 파일 레벨 (미러링 구조)

프로젝트의 디렉토리 구조를 그대로 미러링합니다.

**예시**:
- 원본: `src/database/GraphDatabase.ts`
- 문서: `.dependency-linker/context/files/src/database/GraphDatabase.ts.md`

### 심볼 레벨 (Serena name_path 스타일)

파일 경로를 미러링한 후, 파일명으로 서브디렉토리를 만들고 그 안에 심볼 문서를 생성합니다.

**예시**:
- 클래스: `src/database/GraphDatabase.ts` → `GraphDatabase` 클래스
  - 문서: `.dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase.md`

- 메서드: `src/database/GraphDatabase.ts` → `GraphDatabase.findNodes` 메서드
  - 문서: `.dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md`

- 중첩 메서드: `src/utils/helpers.ts` → `DateUtils.format` 메서드
  - 문서: `.dependency-linker/context/symbols/src/utils/helpers.ts/DateUtils__format.md`

### 식별자 규칙

**파일 레벨**:
```typescript
filePath = "src/database/GraphDatabase.ts"
identifier = filePath  // 그대로 사용
documentPath = ".dependency-linker/context/files/src/database/GraphDatabase.ts.md"
```

**심볼 레벨**:
```typescript
filePath = "src/database/GraphDatabase.ts"
symbolPath = "/GraphDatabase/findNodes"  // Serena style

// symbolPath를 변환: / → __
symbolId = "GraphDatabase__findNodes"
identifier = filePath + "/" + symbolId

documentPath = ".dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md"
```

## 🛡️ 충돌 방지

미러링 구조는 경로 충돌을 완전히 방지합니다.

### 기존 Flat 구조의 문제

```
src/test.ts       → src_test.ts.md
src_test.ts       → src_test.ts.md  ❌ 충돌!

src/utils.ts      → src_utils.ts.md
src/utils/index.ts → src_utils_index.ts.md  ⚠️ 혼동 가능
```

### 미러링 구조의 해결

```
src/test.ts       → files/src/test.ts.md
src_test.ts       → files/src_test.ts.md  ✅ 구분됨

src/utils.ts      → files/src/utils.ts.md
src/utils/index.ts → files/src/utils/index.ts.md  ✅ 명확함
```

## 📄 문서 구조

### 파일 레벨 문서

```markdown
# File: src/database/GraphDatabase.ts

**Type**: internal
**Namespace**: source
**Language**: typescript

## Purpose
[사용자가 편집 - 파일의 목적과 책임]

## Key Concepts
[사용자가 편집 - 핵심 개념과 패턴]

## Dependencies
- src/graph/types.ts
- src/core/QueryEngine.ts

## Dependents
- src/api/analysis.ts
- tests/database/graph-analysis.test.ts

## Implementation Notes
[사용자가 편집 - 구현 세부사항과 결정 사항]

## Related Documentation
[관련 컨텍스트 문서 링크]

---
*Generated: 2025-10-02T14:00:00.000Z*
*Node ID: 88*
```

### 심볼 레벨 문서

```markdown
# Symbol: findNodes

**File**: src/database/GraphDatabase.ts
**Symbol Path**: /GraphDatabase/findNodes
**Type**: method
**Namespace**: source

## Purpose
[사용자가 편집 - 심볼의 역할과 존재 이유]

## Responsibilities
[사용자가 편집 - 주요 책임사항]

## Key Concepts
[사용자가 편집 - 중요한 개념, 알고리즘, 패턴]

## Dependencies
[의존하는 심볼이나 모듈]

## Usage Examples
[사용자가 편집 - 코드 예시]

## Implementation Notes
[사용자가 편집 - 기술적 세부사항과 결정 사항]

## Related Symbols
[관련 컨텍스트 문서 링크]

---
*Generated: 2025-10-02T14:00:00.000Z*
*Node ID: 142*
```

## 🛠️ CLI 커맨드

### 특정 파일 컨텍스트 생성

```bash
node dist/cli/namespace-analyzer.js generate-context <file>

# 예시
node dist/cli/namespace-analyzer.js generate-context src/database/GraphDatabase.ts
```

**출력**:
```
📝 Generating Context Document
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: src/database/GraphDatabase.ts

✅ Context document generated
📄 Path: .dependency-linker/context/files/src/database/GraphDatabase.ts.md

💡 Edit the document to add:
  - File purpose and responsibilities
  - Key concepts and patterns
  - Implementation notes and decisions
```

### 모든 파일 컨텍스트 생성

```bash
node dist/cli/namespace-analyzer.js generate-context-all

# 기존 문서 덮어쓰기
node dist/cli/namespace-analyzer.js generate-context-all --force
```

**출력**:
```
📝 Generating Context Documents for All Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 141 nodes in database

  Generated 10 documents...
  Generated 20 documents...
  ...
  Generated 140 documents...

✅ Context document generation complete
  Created: 140 documents
  Skipped: 1 existing documents

💡 Use --force to overwrite existing documents
```

### 생성된 문서 목록

```bash
node dist/cli/namespace-analyzer.js list-context
```

**출력**:
```
📚 Context Documents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File-level documents: 141
  - ARCHITECTURE.md.md
  - GraphDatabase.ts.md
  - QueryEngine.ts.md
  ...

🔧 Symbol-level documents: 0

📊 Total: 141 documents
```

## 🔧 프로그래밍 API

### ContextDocumentGenerator 사용

```typescript
import { createContextDocumentGenerator } from "./src/context/ContextDocumentGenerator";

const generator = createContextDocumentGenerator(process.cwd());

// 파일 컨텍스트 생성
const docPath = await generator.generateFileContext(
  node,
  dependencies,
  dependents
);

// 심볼 컨텍스트 생성
const symbolDocPath = await generator.generateSymbolContext(
  node,
  "/GraphDatabase/findNodes",
  "method"
);

// 문서 존재 확인
const exists = await generator.documentExists("src/database/GraphDatabase.ts");

// 모든 문서 목록
const { files, symbols } = await generator.listDocuments();
```

### 식별자 생성 함수

```typescript
import {
  generateFileIdentifier,
  generateSymbolIdentifier,
  parseIdentifier,
  generateNodeIdentifier,
} from "./src/context/ContextDocumentGenerator";

// 파일 식별자
const fileId = generateFileIdentifier("src/database/GraphDatabase.ts");
// → "src/database/GraphDatabase.ts"

// 심볼 식별자
const symbolId = generateSymbolIdentifier(
  "src/database/GraphDatabase.ts",
  "/GraphDatabase/findNodes"
);
// → "src/database/GraphDatabase.ts/GraphDatabase__findNodes"

// 식별자 파싱
const parsed = parseIdentifier("src/database/GraphDatabase.ts/GraphDatabase__findNodes");
// → { filePath: "src/database/GraphDatabase.ts", symbolPath: "/GraphDatabase/findNodes" }

// 노드 식별자 생성 (문서 경로 포함)
const identifier = generateNodeIdentifier(
  process.cwd(),
  "src/database/GraphDatabase.ts",
  "/GraphDatabase/findNodes"
);
// → {
//   filePath: "src/database/GraphDatabase.ts",
//   symbolPath: "/GraphDatabase/findNodes",
//   id: "src/database/GraphDatabase.ts/GraphDatabase__findNodes",
//   documentPath: "/path/to/project/.dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md"
// }
```

## 📊 데이터 흐름

```
1. 의존성 분석
   ├─ analyze-all
   └─ GraphDB에 노드/엣지 저장

2. 컨텍스트 문서 생성
   ├─ GraphDB에서 노드 조회
   ├─ 의존성/의존자 추출
   ├─ 미러링 구조로 폴더 생성
   └─ 마크다운 문서 작성

3. 사용자 편집
   ├─ Purpose, Key Concepts 작성
   ├─ Implementation Notes 추가
   └─ Related Documentation 링크

4. 추론 시스템 활용
   ├─ 컨텍스트 문서 읽기
   ├─ 의존성 정보와 결합
   └─ LLM 컨텍스트 제공
```

## 🎯 사용 사례

### 1. LLM 컨텍스트 제공

파일별 컨텍스트 문서를 LLM에 제공하여 코드 이해도를 높입니다.

```typescript
// 특정 파일의 컨텍스트 + 의존성 정보 수집
const contextDoc = await readFile(".dependency-linker/context/files/src/database/GraphDatabase.ts.md");
const dependencies = await db.findNodeDependencies(nodeId);

// LLM 프롬프트 구성
const prompt = `
Context Document:
${contextDoc}

Dependencies:
${dependencies.map(d => `- ${d.name}`).join('\n')}

Question: ${userQuestion}
`;
```

### 2. 문서 자동 생성

컨텍스트 문서를 기반으로 API 문서나 아키텍처 다이어그램을 자동 생성합니다.

### 3. 코드 리뷰 지원

컨텍스트 문서에 설계 의도와 제약사항을 기록하여 리뷰어가 맥락을 이해하도록 돕습니다.

### 4. 온보딩 자료

신입 개발자가 프로젝트를 이해할 수 있도록 각 파일과 심볼의 목적을 명확히 문서화합니다.

## 🔄 워크플로우

### 초기 설정

```bash
# 1. 의존성 분석
node dist/cli/namespace-analyzer.js analyze-all

# 2. 컨텍스트 문서 생성
node dist/cli/namespace-analyzer.js generate-context-all

# 3. 생성된 문서 확인
node dist/cli/namespace-analyzer.js list-context
```

### 일상적 사용

```bash
# 새 파일 추가 시
node dist/cli/namespace-analyzer.js analyze-all
node dist/cli/namespace-analyzer.js generate-context src/new/file.ts

# 컨텍스트 문서 편집
vim .dependency-linker/context/files/src/new/file.ts.md

# 의존성 변경 시 재생성
node dist/cli/namespace-analyzer.js generate-context-all --force
```

## 🚀 향후 개발

### 심볼 레벨 자동 생성

현재는 파일 레벨만 자동 생성됩니다. 향후 다음 기능을 추가할 예정입니다:

```typescript
// Serena MCP로 심볼 추출
const symbols = await serena.find_symbol("/GraphDatabase", {
  depth: 1,
  relative_path: "src/database/GraphDatabase.ts"
});

// 각 심볼에 대해 컨텍스트 문서 생성
for (const symbol of symbols) {
  await generator.generateSymbolContext(
    node,
    symbol.name_path,
    symbol.kind
  );
}
```

### 컨텍스트 검색

컨텍스트 문서 내용을 검색하는 기능:

```bash
node dist/cli/namespace-analyzer.js search-context "query pattern"
```

### 컨텍스트 연결

관련 컨텍스트 문서를 자동으로 링크:

```markdown
## Related Documentation
- [GraphStorage.ts](./GraphStorage.ts.md)
- [NodeIdentifier.ts](./core/NodeIdentifier.ts.md)
```

## 📝 모범 사례

### 1. Purpose 섹션 작성

**좋은 예시**:
```markdown
## Purpose
This file implements the main dependency graph database interface.
It provides CRUD operations for nodes and edges, with support for
circular dependency detection and inference engine integration.
```

**나쁜 예시**:
```markdown
## Purpose
GraphDatabase file.
```

### 2. Key Concepts 섹션

**좋은 예시**:
```markdown
## Key Concepts
- **Node Identification**: Uses composite keys (file path + symbol path)
- **Edge Types**: Supports hierarchical, transitive, and inheritable edges
- **Inference**: Automatic edge type propagation through the graph
```

### 3. Implementation Notes 섹션

**좋은 예시**:
```markdown
## Implementation Notes
- SQLite is used for persistence to enable cross-session analysis
- Transactions are used for batch operations to maintain consistency
- Prepared statements prevent SQL injection
```

## 🔍 트러블슈팅

### 문서가 생성되지 않음

```bash
# GraphDB 확인
ls -la .dependency-linker/graph.db

# 의존성 분석 재실행
node dist/cli/namespace-analyzer.js analyze-all

# 문서 강제 재생성
node dist/cli/namespace-analyzer.js generate-context-all --force
```

### 폴더 구조가 잘못됨

```bash
# 기존 문서 삭제
rm -rf .dependency-linker/context

# 재생성
node dist/cli/namespace-analyzer.js generate-context-all
```

### 심볼 레벨 문서가 필요함

현재는 수동으로 생성:

```typescript
import { createContextDocumentGenerator } from "./src/context/ContextDocumentGenerator";

const generator = createContextDocumentGenerator(process.cwd());
await generator.generateSymbolContext(
  node,
  "/GraphDatabase/findNodes",
  "method"
);
```

---

**Last Updated**: 2025-10-02
**Version**: 1.0.0
