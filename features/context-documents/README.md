# Context Documents

**Category**: Core Feature
**Commands**: `generate-context`, `generate-context-all`, `list-context`
**Status**: ✅ Production Ready

---

## 📋 Overview

컨텍스트 문서 시스템은 프로젝트의 각 파일과 심볼에 대한 메타데이터와 개념적 정보를 저장하는 마크다운 문서를 자동 생성합니다.

### Key Capabilities

- **Mirrored Structure**: 프로젝트 구조를 완벽히 미러링하여 경로 충돌 방지
- **File-Level Docs**: 파일별 목적, 개념, 의존성 문서화
- **Symbol-Level Docs**: 클래스/메서드 레벨 상세 문서 (준비됨)
- **User-Editable**: 자동 생성 후 사용자가 편집하여 지식 추가
- **LLM Integration**: 의존성 정보와 결합하여 LLM 컨텍스트 제공

---

## 🛠️ Commands

### `npm run cli -- markdown --name <namespace> --action document`

특정 네임스페이스의 컨텍스트 문서를 생성합니다.

**Syntax**:
```bash
npm run cli -- markdown --name <namespace> --action document
```

**Implementation:**
- **CLI Entry**: [`src/cli/main.ts#markdown`](../../../src/cli/main.ts#L99-L146) - 마크다운 분석 명령어
- **Handler**: [`src/cli/handlers/markdown-handler.ts#runTagDocumentGeneration`](../../../src/cli/handlers/markdown-handler.ts#L34-L75) - 컨텍스트 문서 생성
- **Document Generator**: [`src/parsers/markdown/MarkdownTagDocumentGenerator.ts`](../../../src/parsers/markdown/MarkdownTagDocumentGenerator.ts) - 문서 생성

**Example**:
```bash
# 마크다운 네임스페이스 컨텍스트 문서 생성
npm run cli -- markdown --name markdown --action document

# 문서 분석
npm run cli -- markdown --name markdown --action analysis
```

**Output**:
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

---

### `generate-context-all`

GraphDB에 있는 모든 파일의 컨텍스트 문서를 생성합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js generate-context-all [options]
```

**Options**:
- `--cwd <path>` - Working directory
- `-d, --db <path>` - Database path
- `--force` - Overwrite existing documents

**Example**:
```bash
# 모든 파일 컨텍스트 생성
node dist/cli/namespace-analyzer.js generate-context-all

# 기존 문서 덮어쓰기
node dist/cli/namespace-analyzer.js generate-context-all --force
```

**Output**:
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

---

### `list-context`

생성된 컨텍스트 문서 목록을 조회합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js list-context [options]
```

**Options**:
- `--cwd <path>` - Working directory

**Example**:
```bash
node dist/cli/namespace-analyzer.js list-context
```

**Output**:
```
📚 Context Documents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File-level documents: 141
  - ARCHITECTURE.md.md
  - GraphDatabase.ts.md
  - QueryEngine.ts.md
  - ...

🔧 Symbol-level documents: 0

📊 Total: 141 documents
```

---

## 📁 Folder Structure

### Mirrored Structure

프로젝트 디렉토리 구조를 `.dependency-linker/context/` 아래에 완전히 미러링합니다.

```
Project Root
├── src/
│   ├── database/
│   │   ├── GraphDatabase.ts
│   │   └── core/
│   │       └── NodeIdentifier.ts
│   └── core/
│       └── QueryEngine.ts
└── tests/
    └── core-functionality.test.ts

.dependency-linker/context/
├── files/                          # 파일 레벨 문서
│   ├── src/
│   │   ├── database/
│   │   │   ├── GraphDatabase.ts.md
│   │   │   └── core/
│   │   │       └── NodeIdentifier.ts.md
│   │   └── core/
│   │       └── QueryEngine.ts.md
│   └── tests/
│       └── core-functionality.test.ts.md
│
└── symbols/                        # 심볼 레벨 문서
    └── src/
        └── database/
            └── GraphDatabase.ts/
                ├── GraphDatabase.md
                └── GraphDatabase__findNodes.md
```

### Why Mirrored Structure?

**문제: Flat 구조의 경로 충돌**:
```
src/test.ts       → src_test.ts.md
src_test.ts       → src_test.ts.md  ❌ 충돌!
```

**해결: 미러링 구조**:
```
src/test.ts       → files/src/test.ts.md
src_test.ts       → files/src_test.ts.md  ✅ 구분됨!
```

---

## 🔑 Identifier System

### File-Level Identifier

파일 경로를 그대로 사용합니다.

```typescript
filePath = "src/database/GraphDatabase.ts"
identifier = filePath
documentPath = ".dependency-linker/context/files/src/database/GraphDatabase.ts.md"
```

### Symbol-Level Identifier

파일 경로 + 심볼 경로 (Serena name_path 스타일)

```typescript
filePath = "src/database/GraphDatabase.ts"
symbolPath = "/GraphDatabase/findNodes"

// symbolPath 변환: / → __
symbolId = "GraphDatabase__findNodes"
identifier = filePath + "/" + symbolId

documentPath = ".dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md"
```

### Examples

**클래스**:
```
파일: src/database/GraphDatabase.ts
심볼: /GraphDatabase
문서: .dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase.md
```

**메서드**:
```
파일: src/database/GraphDatabase.ts
심볼: /GraphDatabase/findNodes
문서: .dependency-linker/context/symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md
```

**중첩 메서드**:
```
파일: src/utils/helpers.ts
심볼: /DateUtils/format/toISO
문서: .dependency-linker/context/symbols/src/utils/helpers.ts/DateUtils__format__toISO.md
```

---

## 📄 Document Format

### File-Level Document

```markdown
# File: src/database/GraphDatabase.ts

**Type**: internal
**Namespace**: source
**Language**: typescript

## Purpose
[User-editable: 파일의 목적과 책임]

## Key Concepts
[User-editable: 핵심 개념과 패턴]

## Dependencies
- src/graph/types.ts
- src/core/QueryEngine.ts

## Dependents
- src/api/analysis.ts
- tests/database/graph-analysis.test.ts

## Implementation Notes
[User-editable: 구현 세부사항과 결정 사항]

## Related Documentation
[관련 컨텍스트 문서 링크]

---
*Generated: 2025-10-02T14:00:00.000Z*
*Node ID: 88*
```

### Symbol-Level Document

```markdown
# Symbol: findNodes

**File**: src/database/GraphDatabase.ts
**Symbol Path**: /GraphDatabase/findNodes
**Type**: method
**Namespace**: source

## Purpose
[User-editable: 심볼의 역할과 존재 이유]

## Responsibilities
[User-editable: 주요 책임사항]

## Key Concepts
[User-editable: 중요한 개념, 알고리즘, 패턴]

## Dependencies
[의존하는 심볼이나 모듈]

## Usage Examples
[User-editable: 코드 예시]

## Implementation Notes
[User-editable: 기술적 세부사항]

## Related Symbols
[관련 컨텍스트 문서 링크]

---
*Generated: 2025-10-02T14:00:00.000Z*
*Node ID: 142*
```

---

## 🎯 Use Cases

### Use Case 1: LLM Context Preparation

**Scenario**: 특정 파일 분석을 위한 LLM 컨텍스트 구성

```typescript
import fs from "fs/promises";
import { NamespaceGraphDB } from "./src/namespace/NamespaceGraphDB";

// 1. 컨텍스트 문서 읽기
const contextDoc = await fs.readFile(
  ".dependency-linker/context/files/src/database/GraphDatabase.ts.md",
  "utf-8"
);

// 2. 의존성 정보 조회
const db = new NamespaceGraphDB(".dependency-linker/graph.db");
await db.initialize();

const nodes = await db.db.findNodes({
  sourceFiles: ["src/database/GraphDatabase.ts"]
});
const node = nodes[0];

const dependencies = await db.db.findNodeDependencies(node.id);
const dependents = await db.db.findNodeDependents(node.id);

await db.close();

// 3. LLM 프롬프트 구성
const prompt = `
Context Document:
${contextDoc}

Dependencies (${dependencies.length}):
${dependencies.map(d => `- ${d.name}`).join('\n')}

Dependents (${dependents.length}):
${dependents.map(d => `- ${d.name}`).join('\n')}

Question: ${userQuestion}
`;

// 4. LLM 호출
const response = await llm.complete(prompt);
```

---

### Use Case 2: Code Review Support

**Scenario**: PR 리뷰 시 파일의 맥락 이해

```bash
# 1. 변경된 파일의 컨텍스트 문서 조회
git diff --name-only HEAD~1 | while read file; do
  doc=".dependency-linker/context/files/$file.md"
  if [ -f "$doc" ]; then
    echo "=== Context for $file ==="
    cat "$doc"
  fi
done

# 2. 의존성 영향 분석
node dist/cli/namespace-analyzer.js query source --json > deps.json
# Parse deps.json to find affected files
```

---

### Use Case 3: Onboarding Material

**Scenario**: 신입 개발자가 코드베이스 이해

```markdown
# Onboarding Guide

## 1. 핵심 모듈 이해

### QueryEngine
Path: `.dependency-linker/context/files/src/core/QueryEngine.ts.md`

[컨텍스트 문서 내용]

### GraphDatabase
Path: `.dependency-linker/context/files/src/database/GraphDatabase.ts.md`

[컨텍스트 문서 내용]

## 2. 의존성 맵
[analyze-all 결과]

## 3. 학습 경로
1. QueryEngine → QueryResultMap → TreeSitterQueryEngine
2. GraphDatabase → GraphStorage → GraphQueryEngine
```

---

### Use Case 4: Documentation Generation

**Scenario**: 컨텍스트 문서를 기반으로 API 문서 생성

```typescript
import fs from "fs/promises";
import path from "path";

async function generateAPIDocs() {
  const contextDir = ".dependency-linker/context/files/src";
  const files = await findMarkdownFiles(contextDir);

  const apiDocs = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");

    // Parse markdown
    const title = extractTitle(content);
    const purpose = extractSection(content, "Purpose");
    const concepts = extractSection(content, "Key Concepts");

    apiDocs.push({
      file: path.relative(contextDir, file),
      title,
      purpose,
      concepts
    });
  }

  // Generate API documentation
  const output = generateMarkdownDocs(apiDocs);
  await fs.writeFile("docs/API-GENERATED.md", output);
}
```

---

## 🔧 Programmatic API

### ContextDocumentGenerator

```typescript
import { createContextDocumentGenerator } from "./src/context/ContextDocumentGenerator";

const generator = createContextDocumentGenerator(process.cwd());

// 파일 컨텍스트 생성
const docPath = await generator.generateFileContext(
  node,
  dependencies,
  dependents
);
console.log(`Created: ${docPath}`);

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
console.log(`Files: ${files.length}, Symbols: ${symbols.length}`);

// 문서 경로 조회
const path = generator.getDocumentPath("src/core/QueryEngine.ts");
```

### Identifier Functions

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
const { filePath, symbolPath } = parseIdentifier(symbolId);

// 노드 식별자 생성
const identifier = generateNodeIdentifier(
  process.cwd(),
  "src/database/GraphDatabase.ts",
  "/GraphDatabase/findNodes"
);
```

---

## ⚡ Performance

### Generation Performance (v3.0.0)

- **Single File**: ~10ms
- **141 Files**: ~5 seconds (including DB queries)
- **Memory**: ~50MB for full generation

### Storage

- **Average File Doc**: ~500 bytes
- **141 Documents**: ~70KB total
- **Mirrored Structure**: No additional overhead

---

## 🐛 Known Issues

### Issue 1: Existing Documents Not Overwritten

**Description**: `generate-context-all`은 기존 문서를 덮어쓰지 않습니다.

**Reason**: 사용자가 편집한 내용 보호

**Workaround**: `--force` 플래그 사용

---

### Issue 2: Symbol-Level Generation Not Automated

**Status**: Symbol-level은 현재 수동 생성만 가능

**Future**: Serena MCP 연동으로 자동 생성 예정

---

## 🚀 Future Enhancements

### Planned Features

**Symbol-Level Auto-Generation**:
```typescript
// Serena MCP로 심볼 추출
const symbols = await serena.find_symbol("/GraphDatabase", {
  depth: 1,
  relative_path: "src/database/GraphDatabase.ts"
});

// 각 심볼에 대해 컨텍스트 생성
for (const symbol of symbols) {
  await generator.generateSymbolContext(
    node,
    symbol.name_path,
    symbol.kind
  );
}
```

**Context Search**:
```bash
node dist/cli/namespace-analyzer.js search-context "circular dependency"
```

**Auto-Linking**:
```markdown
## Related Documentation
- [GraphStorage.ts](./GraphStorage.ts.md)
- [NodeIdentifier.ts](./core/NodeIdentifier.ts.md)
- [findNodes method](../../symbols/src/database/GraphDatabase.ts/GraphDatabase__findNodes.md)
```

**Template Customization**:
```typescript
generator.setTemplate({
  fileSections: ["Purpose", "Architecture", "Usage", "Testing"],
  symbolSections: ["Purpose", "Parameters", "Returns", "Examples"]
});
```

---

## 📚 Related Documentation

- [Dependency Analysis](../dependency-analysis/) - 의존성 정보 추출
- [Inference System](../inference/) - LLM 컨텍스트 준비
- [Full Documentation](../../docs/CONTEXT-DOCUMENTS.md) - 상세 가이드

---

**Last Updated**: 2025-10-02
**Version**: 3.0.0
