# RDF 기반 검색 시스템 설계

**작성일**: 2025-10-05
**목적**: RDF 주소 → 파일 위치 + 심볼 정의 위치 검색 시스템 설계
**우선순위**: HIGH (Phase 2 Task 2.1)

---

## 🎯 목표

RDF 주소를 입력받아 실제 파일 위치와 심볼의 정의 위치를 찾는 양방향 검색 시스템 구축

```
입력: "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"
출력: {
  filePath: "/Users/.../src/parsers/TypeScriptParser.ts",
  symbolLocation: { line: 45, column: 2 },
  nodeType: "method",
  symbolName: "parse"
}
```

---

## 📋 시스템 구성 요소

### 1. 기존 시스템 분석

#### NodeIdentifier (이미 구현됨)
**파일**: `src/database/core/NodeIdentifier.ts`

**제공 기능**:
```typescript
// ✅ 구현됨: 코드 → RDF 주소
createIdentifier(
  type: NodeType,
  name: string,
  context: NodeContext
): string

// ✅ 구현됨: RDF 주소 → 구조화된 정보
parseRdfAddress(address: string): RdfAddress | null

interface RdfAddress {
  projectName: string;  // "dependency-linker"
  filePath: string;     // "src/parsers/TypeScriptParser.ts"
  nodeType: string;     // "Method"
  symbolName: string;   // "parse"
  raw: string;          // 원본 RDF 주소
}
```

#### ScenarioRegistry (타입 검증용)
**파일**: `src/scenarios/ScenarioRegistry.ts`

**제공 기능**:
```typescript
// ✅ 구현됨: 모든 시나리오의 타입 수집
collectTypes(scenarioId: string): TypeCollection

interface TypeCollection {
  nodeTypes: Set<string>;      // 모든 노드 타입
  edgeTypes: Set<string>;      // 모든 엣지 타입
  semanticTags: Set<string>;   // 모든 시맨틱 태그
}

// ✅ 구현됨: 타입 일관성 검증
validateTypeConsistency(): ScenarioValidationResult
```

#### ParserManager (파일 파싱용)
**파일**: `src/parsers/ParserManager.ts`

**제공 기능**:
```typescript
// ✅ 구현됨: 파일 분석
analyzeFile(content: string, language: string): Promise<AnalysisResult>

// AnalysisResult에는 QueryResultMap이 포함됨
// QueryResultMap: 파싱된 심볼 정보 (클래스, 메서드, 함수 등)
```

### 2. 새로 구현할 컴포넌트

#### RdfSearchEngine (핵심 클래스)
**파일**: `src/database/search/RdfSearchEngine.ts` (신규)

**책임**:
1. RDF 주소 파싱 (NodeIdentifier 활용)
2. 시나리오 기반 타입 검증 (ScenarioRegistry 활용)
3. 파일 파싱 및 심볼 위치 검색 (ParserManager 활용)
4. 검색 결과 반환

---

## 🏗️ RdfSearchEngine 설계

### 클래스 구조

```typescript
export interface SymbolLocation {
  /** 절대 파일 경로 */
  absolutePath: string;

  /** 프로젝트 상대 경로 */
  relativePath: string;

  /** 심볼 위치 */
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };

  /** 노드 타입 */
  nodeType: string;

  /** 심볼 이름 */
  symbolName: string;

  /** 심볼이 속한 컨텍스트 (클래스 이름 등) */
  context?: string;
}

export interface RdfSearchOptions {
  /** 프로젝트 루트 경로 */
  projectRoot: string;

  /** 타입 검증 활성화 (기본: true) */
  validateTypes?: boolean;

  /** 사용할 시나리오 ID 목록 (기본: 모든 시나리오) */
  scenarioIds?: string[];
}

export class RdfSearchEngine {
  constructor(
    private nodeIdentifier: NodeIdentifier,
    private scenarioRegistry: ScenarioRegistry,
    private parserManager: ParserManager
  ) {}

  /**
   * RDF 주소로 심볼 위치 검색
   */
  async findSymbolLocation(
    rdfAddress: string,
    options: RdfSearchOptions
  ): Promise<SymbolLocation | null> {
    // 1. RDF 주소 파싱
    const parsed = this.nodeIdentifier.parseRdfAddress(rdfAddress);
    if (!parsed) {
      throw new Error(`Invalid RDF address: ${rdfAddress}`);
    }

    // 2. 타입 검증 (옵션)
    if (options.validateTypes !== false) {
      this.validateNodeType(parsed.nodeType, options.scenarioIds);
    }

    // 3. 파일 경로 구성
    const absolutePath = path.join(options.projectRoot, parsed.filePath);

    // 4. 파일 존재 확인
    if (!await fs.pathExists(absolutePath)) {
      return null;
    }

    // 5. 파일 파싱
    const fileContent = await fs.readFile(absolutePath, 'utf-8');
    const language = this.detectLanguage(parsed.filePath);
    const result = await this.parserManager.analyzeFile(fileContent, language);

    // 6. 심볼 위치 찾기
    return this.findSymbolInResult(result, parsed, absolutePath);
  }

  /**
   * 노드 타입 검증
   */
  private validateNodeType(nodeType: string, scenarioIds?: string[]): void {
    const validTypes = this.getAllValidNodeTypes(scenarioIds);

    if (!validTypes.has(nodeType.toLowerCase())) {
      throw new Error(
        `Invalid node type '${nodeType}'. Valid types: ${Array.from(validTypes).join(', ')}`
      );
    }
  }

  /**
   * 모든 유효한 노드 타입 수집
   */
  private getAllValidNodeTypes(scenarioIds?: string[]): Set<string> {
    const allTypes = new Set<string>();
    const scenarios = scenarioIds || this.scenarioRegistry.listScenarios();

    for (const scenarioId of scenarios) {
      const types = this.scenarioRegistry.collectTypes(scenarioId);
      for (const nodeType of types.nodeTypes) {
        allTypes.add(nodeType.toLowerCase());
      }
    }

    return allTypes;
  }

  /**
   * 파싱 결과에서 심볼 찾기
   */
  private findSymbolInResult(
    result: AnalysisResult,
    parsed: RdfAddress,
    absolutePath: string
  ): SymbolLocation | null {
    // QueryResultMap에서 해당 심볼 찾기
    const symbolName = parsed.symbolName;
    const nodeType = parsed.nodeType.toLowerCase();

    // 타입별 쿼리 키 매핑
    const queryKeyMap: Record<string, string> = {
      'class': 'ts-class-declarations',
      'method': 'ts-method-definitions',
      'function': 'ts-function-declarations',
      'interface': 'ts-interface-declarations',
      'variable': 'ts-variable-declarations',
      'constant': 'ts-variable-declarations',
    };

    const queryKey = queryKeyMap[nodeType];
    if (!queryKey) {
      return null;
    }

    const symbols = result.queryResults.get(queryKey) || [];

    // 이름으로 심볼 찾기
    for (const symbol of symbols) {
      if (symbol.name === symbolName) {
        return {
          absolutePath,
          relativePath: parsed.filePath,
          location: {
            line: symbol.location.start.line,
            column: symbol.location.start.column,
            endLine: symbol.location.end.line,
            endColumn: symbol.location.end.column,
          },
          nodeType: parsed.nodeType,
          symbolName: parsed.symbolName,
          context: symbol.context,
        };
      }
    }

    return null;
  }

  /**
   * 파일 확장자로 언어 감지
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.java': 'java',
      '.py': 'python',
      '.go': 'go',
    };
    return langMap[ext] || 'typescript';
  }
}
```

---

## 🔄 검색 프로세스 상세

### Step 1: RDF 주소 파싱
```typescript
입력: "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"

NodeIdentifier.parseRdfAddress()
↓
{
  projectName: "dependency-linker",
  filePath: "src/parsers/TypeScriptParser.ts",
  nodeType: "Method",
  symbolName: "parse",
  raw: "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"
}
```

### Step 2: 타입 검증 (옵션)
```typescript
ScenarioRegistry.collectTypes()로 모든 시나리오의 nodeTypes 수집
↓
validTypes = Set {
  "file", "directory", "class", "method", "function",
  "interface", "variable", "constant", "library", "unknown"
}
↓
"Method".toLowerCase() = "method" ∈ validTypes ✅
```

### Step 3: 파일 경로 구성
```typescript
projectRoot = "/Users/junwoobang/project/dependency-linker"
filePath = "src/parsers/TypeScriptParser.ts"
↓
absolutePath = "/Users/junwoobang/project/dependency-linker/src/parsers/TypeScriptParser.ts"
```

### Step 4: 파일 존재 확인
```typescript
await fs.pathExists(absolutePath)
↓
true ✅ 또는 false → return null
```

### Step 5: 파일 파싱
```typescript
fileContent = await fs.readFile(absolutePath, 'utf-8')
language = detectLanguage(".ts") = "typescript"
↓
result = await parserManager.analyzeFile(fileContent, "typescript")
↓
result.queryResults: QueryResultMap {
  "ts-class-declarations": [...],
  "ts-method-definitions": [
    { name: "parse", location: { start: { line: 45, column: 2 }, ... }, ... }
  ],
  "ts-function-declarations": [...],
  ...
}
```

### Step 6: 심볼 위치 찾기
```typescript
nodeType = "method" → queryKey = "ts-method-definitions"
symbols = result.queryResults.get("ts-method-definitions")
↓
symbols.find(s => s.name === "parse")
↓
{
  absolutePath: "/Users/.../TypeScriptParser.ts",
  relativePath: "src/parsers/TypeScriptParser.ts",
  location: { line: 45, column: 2, endLine: 78, endColumn: 3 },
  nodeType: "Method",
  symbolName: "parse",
  context: "TypeScriptParser"
}
```

---

## 🔍 타입별 쿼리 키 매핑

### TypeScript/JavaScript
```typescript
const TYPESCRIPT_QUERY_KEY_MAP: Record<string, string> = {
  // Node Types → QueryResultMap Keys
  'class': 'ts-class-declarations',
  'method': 'ts-method-definitions',
  'function': 'ts-function-declarations',
  'interface': 'ts-interface-declarations',
  'type': 'ts-type-aliases',
  'variable': 'ts-variable-declarations',
  'constant': 'ts-variable-declarations',
  'enum': 'ts-enum-declarations',
  'import': 'ts-import-declarations',
  'export': 'ts-export-declarations',
};
```

### Java
```typescript
const JAVA_QUERY_KEY_MAP: Record<string, string> = {
  'class': 'java-class-declarations',
  'method': 'java-method-declarations',
  'interface': 'java-interface-declarations',
  'field': 'java-field-declarations',
};
```

### Python
```typescript
const PYTHON_QUERY_KEY_MAP: Record<string, string> = {
  'class': 'python-class-definitions',
  'function': 'python-function-definitions',
  'method': 'python-function-definitions', // Python 메서드는 함수와 동일
};
```

---

## 🧪 사용 예제

### 기본 사용
```typescript
import { RdfSearchEngine } from './database/search/RdfSearchEngine';
import { globalNodeIdentifier } from './database/core/NodeIdentifier';
import { globalScenarioRegistry } from './scenarios/ScenarioRegistry';
import { globalParserManager } from './parsers/ParserManager';

const searchEngine = new RdfSearchEngine(
  globalNodeIdentifier,
  globalScenarioRegistry,
  globalParserManager
);

const result = await searchEngine.findSymbolLocation(
  "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse",
  { projectRoot: "/Users/junwoobang/project/dependency-linker" }
);

console.log(result);
// {
//   absolutePath: "/Users/junwoobang/project/dependency-linker/src/parsers/TypeScriptParser.ts",
//   relativePath: "src/parsers/TypeScriptParser.ts",
//   location: { line: 45, column: 2, endLine: 78, endColumn: 3 },
//   nodeType: "Method",
//   symbolName: "parse",
//   context: "TypeScriptParser"
// }
```

### 타입 검증 비활성화
```typescript
const result = await searchEngine.findSymbolLocation(
  "dependency-linker/src/utils/helper.ts#CustomType:myHelper",
  {
    projectRoot: "/Users/junwoobang/project/dependency-linker",
    validateTypes: false  // 타입 검증 스킵
  }
);
```

### 특정 시나리오로 제한
```typescript
const result = await searchEngine.findSymbolLocation(
  "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse",
  {
    projectRoot: "/Users/junwoobang/project/dependency-linker",
    scenarioIds: ["symbol-dependency", "file-dependency"]  // 특정 시나리오만
  }
);
```

---

## 🚀 CLI 통합

### 명령어 설계
```bash
# 기본 사용
dependency-linker find-symbol "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"

# 옵션
dependency-linker find-symbol <rdf-address> [options]

Options:
  --cwd <path>              Working directory (default: process.cwd())
  --no-validate             Disable type validation
  --scenarios <ids>         Comma-separated scenario IDs
  --json                    Output as JSON
  -h, --help                Display help
```

### 출력 형식
```bash
$ dependency-linker find-symbol "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse"

🔍 Symbol Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: src/parsers/TypeScriptParser.ts
Location: Line 45, Column 2
Type: Method
Name: parse
Context: TypeScriptParser

📄 Full Path:
/Users/junwoobang/project/dependency-linker/src/parsers/TypeScriptParser.ts:45:2
```

---

## ⚠️ 에러 처리

### 1. 잘못된 RDF 주소
```typescript
try {
  await searchEngine.findSymbolLocation("invalid-rdf", options);
} catch (error) {
  // Error: Invalid RDF address: invalid-rdf
}
```

### 2. 유효하지 않은 노드 타입
```typescript
try {
  await searchEngine.findSymbolLocation(
    "dependency-linker/src/file.ts#InvalidType:symbol",
    options
  );
} catch (error) {
  // Error: Invalid node type 'InvalidType'. Valid types: file, class, method, ...
}
```

### 3. 파일 없음
```typescript
const result = await searchEngine.findSymbolLocation(
  "dependency-linker/non-existent.ts#Method:parse",
  options
);
// result = null (파일이 존재하지 않음)
```

### 4. 심볼 없음
```typescript
const result = await searchEngine.findSymbolLocation(
  "dependency-linker/src/file.ts#Method:nonExistentMethod",
  options
);
// result = null (심볼을 찾을 수 없음)
```

---

## 📊 확장 가능성

### 1. 캐싱 전략
```typescript
class RdfSearchEngine {
  private cache = new Map<string, SymbolLocation | null>();

  async findSymbolLocation(
    rdfAddress: string,
    options: RdfSearchOptions
  ): Promise<SymbolLocation | null> {
    const cacheKey = `${rdfAddress}:${options.projectRoot}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await this._findSymbolLocationImpl(rdfAddress, options);
    this.cache.set(cacheKey, result);

    return result;
  }
}
```

### 2. 배치 검색
```typescript
async findMultipleSymbols(
  rdfAddresses: string[],
  options: RdfSearchOptions
): Promise<Map<string, SymbolLocation | null>> {
  // 병렬 처리
  const results = await Promise.all(
    rdfAddresses.map(addr => this.findSymbolLocation(addr, options))
  );

  return new Map(rdfAddresses.map((addr, i) => [addr, results[i]]));
}
```

### 3. 퍼지 검색
```typescript
async findSimilarSymbols(
  rdfAddress: string,
  options: RdfSearchOptions & { threshold?: number }
): Promise<SymbolLocation[]> {
  // Levenshtein distance 등으로 유사한 심볼 찾기
}
```

---

## ✅ 구현 체크리스트

### Phase 2 Task 2.1: RDF 주소 기반 파일 위치 검색
- [ ] `src/database/search/` 디렉토리 생성
- [ ] `RdfSearchEngine.ts` 클래스 구현
  - [ ] `findSymbolLocation()` 메서드
  - [ ] `validateNodeType()` 메서드
  - [ ] `getAllValidNodeTypes()` 메서드
  - [ ] `findSymbolInResult()` 메서드
  - [ ] `detectLanguage()` 메서드
- [ ] 타입별 쿼리 키 매핑 정의
  - [ ] TypeScript/JavaScript
  - [ ] Java
  - [ ] Python
- [ ] 에러 처리 구현
- [ ] 단위 테스트 작성
  - [ ] 정상 케이스 (클래스, 메서드, 함수)
  - [ ] 에러 케이스 (잘못된 RDF, 파일 없음, 심볼 없음)
  - [ ] 타입 검증 테스트
- [ ] CLI 명령어 통합 (`find-symbol`)
- [ ] 문서 업데이트

---

**Last Updated**: 2025-10-05
**Status**: 설계 완료, 구현 대기
**Priority**: HIGH
