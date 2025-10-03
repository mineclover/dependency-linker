# 심볼 관리 체계 (Symbol Management System)

## 개요

의존성 그래프에서 노드를 고유하게 식별하고 검색하기 위한 identifier 생성 및 관리 체계

## 핵심 원칙

1. **동일 정보 동일 식별**: 같은 정보를 같은 방법으로 식별했을 때 항상 같은 identifier 생성
2. **고유성 보장**: GraphDB의 `identifier` 필드는 UNIQUE 제약으로 노드 중복 방지
3. **타입 기반 구분**: Prefix를 통한 노드 타입 구별로 검색 최적화
4. **경로 정규화**: 절대 경로 기반 일관성 유지

## 현재 Identifier 생성 규칙

### 1. 코드 파일 심볼

#### 1.1 파일 노드
```typescript
identifier: filePath  // absolute path
type: "file"
```

**예시**:
- `/Users/project/src/index.ts`
- `/Users/project/src/utils/helper.ts`

#### 1.2 Import 노드
```typescript
// 외부 패키지
identifier: packageName
type: "external"

// 상대 경로 (normalized to absolute)
identifier: normalizeImportPath(importPath, currentFile)
type: "file"
```

**예시**:
- 외부: `react`, `lodash`
- 내부: `/Users/project/src/utils/helper.ts`

#### 1.3 Export 노드
```typescript
identifier: `${filePath}#${exportName}`
type: "export"
```

**예시**:
- `/Users/project/src/index.ts#MyComponent`
- `/Users/project/src/utils.ts#calculateTotal`

#### 1.4 Declaration 노드 (함수, 클래스)
```typescript
identifier: `${filePath}#${declarationName}`
type: "function" | "class" | "interface" | "type"
```

**예시**:
- `/Users/project/src/index.ts#UserService`
- `/Users/project/src/utils.ts#validateEmail`

### 2. 마크다운 심볼

#### 2.1 마크다운 파일 노드
```typescript
identifier: `file:${filePath}`
type: "file"
```

**예시**:
- `file:/Users/project/docs/README.md`
- `file:/Users/project/docs/API.md`

#### 2.2 외부 URL 노드
```typescript
identifier: `external:${url}`
type: "external-resource"
```

**예시**:
- `external:https://github.com/user/repo`
- `external:https://docs.example.com/api`

#### 2.3 심볼 참조 노드 (@ClassName)
```typescript
identifier: `symbol:${namePath}`
type: "symbol"
```

**예시**:
- `symbol:/UserService`
- `symbol:/validateEmail`

#### 2.4 Heading 심볼 노드
```typescript
identifier: `heading:${filePath}#${headingText}`
type: "heading-symbol"
metadata: {
  semanticTypes: string[],  // English-only tags
  level: number,
  line: number
}
```

**예시**:
- `heading:/docs/API.md#Authentication`
- `heading:/docs/Architecture.md#Database Design`

**Semantic Types**:
- `#architecture`, `#api`, `#security` → `["architecture", "api", "security"]`
- 영어만 지원, 한글 태그는 무시

## GraphDB 고유성 보장 메커니즘

### UPSERT 전략
```sql
INSERT INTO nodes (identifier, type, name, ...)
VALUES (?, ?, ?, ...)
ON CONFLICT(identifier) DO UPDATE SET
  type = excluded.type,
  name = excluded.name,
  ...
RETURNING id
```

- `identifier` 필드에 UNIQUE 제약
- 같은 identifier로 insert 시 UPDATE 수행
- 노드 중복 방지 및 데이터 최신성 유지

## 검색 엔진 정보 구조

### 노드 메타데이터 구조

#### 코드 심볼
```typescript
{
  identifier: string,
  type: "file" | "export" | "function" | "class" | ...,
  name: string,
  sourceFile: string,
  language: "typescript" | "javascript" | "python" | ...,
  metadata: {
    internalImports?: string[],
    externalImports?: string[],
    builtinImports?: string[],
    declarationType?: string,
    // symbol-specific metadata
  },
  startLine?: number,
  startColumn?: number,
  endLine?: number,
  endColumn?: number
}
```

#### 마크다운 심볼
```typescript
{
  identifier: string,
  type: "heading-symbol" | "file" | "external-resource" | "symbol",
  name: string,
  sourceFile: string,
  language: "markdown",
  metadata: {
    // Heading symbols
    semanticTypes?: string[],
    tags?: string[],
    level?: number,
    line?: number,
    fullText?: string,

    // File nodes
    headingCount?: number,
    frontMatter?: Record<string, unknown>,

    // External resources
    url?: string,
    linkText?: string
  }
}
```

### 검색 최적화 전략

1. **타입별 Prefix 검색**
   ```sql
   -- 마크다운 파일만 검색
   SELECT * FROM nodes WHERE identifier LIKE 'file:%.md'

   -- Heading 심볼만 검색
   SELECT * FROM nodes WHERE identifier LIKE 'heading:%'

   -- 특정 파일의 심볼 검색
   SELECT * FROM nodes WHERE identifier LIKE '/path/to/file.ts#%'
   ```

2. **Semantic Type 검색**
   ```sql
   -- 특정 semantic type을 가진 heading 검색
   SELECT * FROM nodes
   WHERE type = 'heading-symbol'
   AND json_extract(metadata, '$.semanticTypes') LIKE '%architecture%'
   ```

3. **언어별 검색**
   ```sql
   -- TypeScript 파일만 검색
   SELECT * FROM nodes WHERE language = 'typescript'
   ```

## 현재 체계의 문제점

### 1. 일관성 부족
- **코드 파일**: prefix 없음 (`/path/to/file.ts`)
- **마크다운 파일**: `file:` prefix 사용 (`file:/path/to/doc.md`)
- **충돌 위험**: 같은 경로 다른 타입 구별 불가

### 2. Identifier 충돌 가능성
- **Export vs Heading**: 둘 다 `filePath#name` 패턴 사용
  - Export: `/src/index.ts#MyComponent`
  - Heading: `heading:/docs/API.md#MyComponent`
- Heading은 `heading:` prefix로 구별되지만 Export는 prefix 없음

### 3. 경로 정규화 불일치
- 코드: `normalizeImportPath()` 사용 (relative → absolute)
- 마크다운: `resolveTargetPath()` 사용 (relative → absolute)
- 정규화 로직이 다름

## 개선 제안

### 1. 통일된 Prefix 체계
```typescript
// 제안된 체계
identifier: `${type}:${path}#{fragment}`

// 예시
"code-file:/path/to/file.ts"
"md-file:/path/to/doc.md"
"code-symbol:/path/to/file.ts#MyClass"
"md-heading:/path/to/doc.md#Section"
"external-pkg:react"
"external-url:https://example.com"
```

**장점**:
- 타입별 명확한 구분
- 검색 쿼리 최적화 (`WHERE identifier LIKE 'code-file:%'`)
- 충돌 방지

### 2. 정규화 함수 통일
```typescript
function normalizeNodeIdentifier(
  type: NodeType,
  path: string,
  fragment?: string,
  baseDir?: string
): string {
  // 1. 경로 정규화
  const normalizedPath = normalizePath(path, baseDir);

  // 2. Fragment 처리
  const fragmentPart = fragment ? `#${fragment}` : '';

  // 3. Type prefix 추가
  return `${type}:${normalizedPath}${fragmentPart}`;
}
```

### 3. 검색 인덱스 최적화
```sql
-- Identifier prefix 인덱스
CREATE INDEX idx_identifier_prefix
ON nodes(substr(identifier, 1, instr(identifier, ':') - 1));

-- Semantic type JSON 인덱스
CREATE INDEX idx_semantic_types
ON nodes(json_extract(metadata, '$.semanticTypes'));
```

## 사용 예시

### 코드 심볼 쿼리
```typescript
// 특정 파일의 모든 선언 찾기
const declarations = await db.findNodes({
  identifierPattern: '/path/to/file.ts#%'
});

// 외부 패키지 의존성 찾기
const externals = await db.findNodes({
  type: 'external'
});
```

### 마크다운 심볼 쿼리
```typescript
// Semantic type으로 heading 검색
const archHeadings = await queryHeadingsBySemanticType(db, 'architecture');

// 특정 파일의 모든 heading
const headings = await queryFileHeadings(db, '/docs/API.md');

// 모든 semantic type 통계
const types = await getAllSemanticTypes(db);
```

### 크로스 참조
```typescript
// 마크다운에서 코드 심볼 참조 찾기
const symbolRefs = await db.findNodes({
  type: 'symbol',
  identifierPattern: 'symbol:/%'
});

// Heading에서 다른 파일로의 링크 찾기
const links = await db.findRelationships({
  type: 'md-link',
  fromNodeType: 'heading-symbol'
});
```

## 향후 개선 방향

1. **Type-Safe Identifier Builder**
   ```typescript
   class IdentifierBuilder {
     static codeFile(path: string): string;
     static codeSymbol(file: string, name: string): string;
     static mdFile(path: string): string;
     static mdHeading(file: string, heading: string): string;
     static external(source: string): string;
   }
   ```

2. **Identifier Parser**
   ```typescript
   interface ParsedIdentifier {
     type: NodeType;
     path: string;
     fragment?: string;
     isExternal: boolean;
   }

   function parseIdentifier(id: string): ParsedIdentifier;
   ```

3. **검색 DSL**
   ```typescript
   await db.query()
     .where({ type: 'heading-symbol' })
     .hasSemanticType('architecture')
     .inFile('/docs/*.md')
     .execute();
   ```

## 결론

현재 심볼 관리 체계는 기본적인 고유성은 보장하지만, 타입별 일관성과 검색 최적화 측면에서 개선이 필요합니다. 통일된 prefix 체계와 정규화 함수를 도입하면 더 견고하고 효율적인 심볼 관리가 가능합니다.

---

**작성일**: 2025-10-03
**버전**: 3.0.0
**관련 파일**:
- `src/database/GraphDatabase.ts` - UPSERT 로직
- `src/database/GraphStorage.ts` - 코드 심볼 identifier 생성
- `src/integration/MarkdownToGraph.ts` - 마크다운 심볼 identifier 생성
- `src/core/symbol-types.ts` - 심볼 타입 정의
