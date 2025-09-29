# Tree-sitter 쿼리 생성 및 적용 워크플로우 가이드
## Tree-sitter Query Creation and Application Workflow Guide

### 🎯 목적

이 가이드는 Tree-sitter 쿼리 생성부터 적용까지의 표준화된 워크플로우를 제공합니다. 개발자가 일관된 방식으로 쿼리를 만들고 시스템에 통합할 수 있도록 돕습니다.

---

## 📋 6단계 표준 워크플로우

### 1단계: 요구사항 분석 (Analysis)

#### ✅ 체크리스트
- [ ] 추출하려는 데이터가 명확히 정의됨
- [ ] 대상 언어 확인 (TypeScript, JavaScript 등)
- [ ] 예상 사용 사례 정리
- [ ] 기존 쿼리와의 중복 여부 확인

#### 📝 작업 내용
```typescript
// 요구사항 정의 예시
const requirements = {
  domain: "export",           // 도메인: import, export, function, class 등
  target: "functions",        // 대상: functions, variables, types 등
  action: "extract",          // 동작: extract, analyze, collect 등
  description: "Extract all exported function declarations from modules",
  languages: ["typescript", "javascript"],
  expectedData: [
    "functionName: string",
    "parameterCount: number",
    "isDefault: boolean"
  ]
};
```

### 2단계: Tree-sitter 쿼리 설계 (Design)

#### ✅ 체크리스트
- [ ] Tree-sitter 문법 확인
- [ ] 쿼리 패턴 설계
- [ ] 캡처 그룹 정의
- [ ] 언어별 차이점 고려

#### 📝 작업 내용
```typescript
// 쿼리 패턴 설계
const queryPattern = `
  (export_statement
    (function_declaration
      name: (identifier) @function_name
      parameters: (formal_parameters) @parameters))
`;

// 캡처 그룹 정의
const captureNames = ["function_name", "parameters"];

// 언어별 검증
const languageSupport = {
  typescript: true,
  javascript: true,
  tsx: true,
  jsx: true
};
```

### 3단계: 쿼리 정의 작성 (Definition)

#### ✅ 체크리스트
- [ ] 쿼리 ID 네이밍 규칙 적용
- [ ] 쿼리 정의 구조 작성
- [ ] 우선순위 설정
- [ ] 문법 검증 완료

#### 📝 작업 내용
```typescript
import { QueryNamingConvention, StandardQueryPatterns } from './conventions/QueryWorkflowConventions';

// 1. 이름 생성 (규칙: {domain}-{target}-{action})
const queryId = QueryNamingConvention.generateQueryId("export", "functions", "extract");
// 결과: "export-functions-extract"

// 2. 쿼리 정의 작성
const queryDefinition: TreeSitterQueryDefinition = {
  id: queryId,
  name: "Export Function Extraction",
  description: "Extract all exported function declarations",
  query: queryPattern,
  languages: ["typescript", "javascript"],
  captureNames: ["function_name", "parameters"],
  priority: 80,
  enabled: true
};

// 3. 문법 검증
const validation = QueryValidator.validateSyntax(queryPattern);
if (!validation.valid) {
  console.error("Query syntax errors:", validation.errors);
}
```

### 4단계: 결과 타입 매핑 (Type Mapping)

#### ✅ 체크리스트
- [ ] 결과 타입 이름 생성
- [ ] 인터페이스 정의 작성
- [ ] BaseQueryResult 상속 확인
- [ ] 샘플 데이터 생성

#### 📝 작업 내용
```typescript
// 1. 타입 이름 생성 (규칙: {Target}{Action}Result)
const resultTypeName = QueryNamingConvention.generateResultTypeName("functions", "extract");
// 결과: "FunctionExtractResult"

// 2. 인터페이스 정의
interface FunctionExtractResult extends BaseQueryResult {
  /** 함수명 */
  functionName: string;
  /** 파라미터 개수 */
  parameterCount: number;
  /** 기본 export 여부 */
  isDefault: boolean;
  /** Export 타입 */
  exportType: "named" | "default";
  /** 파라미터 목록 */
  parameters: string[];
}

// 3. 타입 정의 등록
const typeDefinition: QueryResultTypeDefinition = {
  typeId: queryId,
  typeName: resultTypeName,
  description: "Result type for export function extraction",
  resultType: queryId,
  sampleResult: {
    queryName: queryId,
    location: { line: 1, column: 1, offset: 0, endLine: 1, endColumn: 10, endOffset: 10 },
    nodeText: "export function myFunc(a, b) { }",
    functionName: "myFunc",
    parameterCount: 2,
    isDefault: false,
    exportType: "named",
    parameters: ["a", "b"]
  }
};
```

### 5단계: 프로세서 구현 (Implementation)

#### ✅ 체크리스트
- [ ] 프로세서 함수 이름 생성
- [ ] 캡처 데이터 추출 로직 구현
- [ ] 결과 객체 생성 로직 구현
- [ ] 에러 처리 추가

#### 📝 작업 내용
```typescript
// 1. 프로세서 이름 생성 (규칙: process{Target}{Action})
const processorName = QueryNamingConvention.generateProcessorName("functions", "extract");
// 결과: "processFunctionExtract"

// 2. 프로세서 함수 구현
function processFunctionExtract(
  matches: QueryMatch<"function_name" | "parameters">[],
  context: QueryExecutionContext
): FunctionExtractResult[] {
  const results: FunctionExtractResult[] = [];

  for (const match of matches) {
    try {
      // 캡처 그룹 데이터 추출
      const captures = this.groupCaptures(match.captures);

      // 함수명 추출
      const functionNameNode = captures.function_name?.[0];
      const functionName = functionNameNode?.text || "anonymous";

      // 파라미터 추출
      const parametersNode = captures.parameters?.[0];
      const parameters = this.extractParameterNames(parametersNode);

      // export 타입 판별
      const isDefault = context.nodeText.includes("export default");

      // 결과 객체 생성
      const result: FunctionExtractResult = {
        queryName: queryId,
        location: this.extractLocation(functionNameNode || parametersNode),
        nodeText: match.node.text,
        functionName,
        parameterCount: parameters.length,
        isDefault,
        exportType: isDefault ? "default" : "named",
        parameters
      };

      results.push(result);

    } catch (error) {
      console.warn(`Error processing match:`, error);
      // 에러가 발생해도 다른 매치는 계속 처리
    }
  }

  return results;
}

// 3. 헬퍼 함수들
private extractParameterNames(parametersNode: any): string[] {
  if (!parametersNode) return [];

  // 파라미터 노드에서 이름 추출 로직
  return parametersNode.children
    .filter((child: any) => child.type === 'identifier')
    .map((child: any) => child.text);
}
```

### 6단계: 시스템 통합 (Integration)

#### ✅ 체크리스트
- [ ] 쿼리 레지스트리에 등록
- [ ] 타입 정의 등록
- [ ] 바인딩 설정
- [ ] 테스트 케이스 작성

#### 📝 작업 내용
```typescript
// 1. 통합 등록 (한 번에 모든 단계 수행)
function registerExportFunctionQuery() {
  const result = QueryIntegrationWorkflow.registerComplete(
    "export",           // domain
    "functions",        // target
    "extract",          // action
    queryPattern,       // Tree-sitter query
    ["typescript", "javascript"], // languages
    ["function_name", "parameters"], // captures
    [                   // custom fields
      { name: "functionName", type: "string", value: "myFunc" },
      { name: "parameterCount", type: "number", value: 2 },
      { name: "isDefault", type: "boolean", value: false },
      { name: "exportType", type: '"named" | "default"', value: "named" },
      { name: "parameters", type: "string[]", value: ["a", "b"] }
    ],
    80                  // priority
  );

  console.log("Query registered:", result.queryDef.id);
  return result;
}

// 2. 조합에 통합
function addToExportAnalysisCombination() {
  const factory = new CombinableQueryFactory();

  const exportCombination = factory.createCustomCombination(
    "export-analysis",
    "Export Analysis",
    "Complete export analysis including functions, variables, and types",
    ["export-functions-extract", "export-variables-extract", "export-types-extract"],
    ["typescript", "javascript"],
    "ExportAnalysisResult"
  );

  return exportCombination;
}

// 3. 테스트 케이스 작성
const testCases = [
  {
    name: "extract named export function",
    sourceCode: `export function myFunction(a: string, b: number): string { return a + b; }`,
    expectedResults: [{
      functionName: "myFunction",
      parameterCount: 2,
      isDefault: false,
      exportType: "named",
      parameters: ["a", "b"]
    }]
  },
  {
    name: "extract default export function",
    sourceCode: `export default function(x: number): number { return x * 2; }`,
    expectedResults: [{
      functionName: "anonymous",
      parameterCount: 1,
      isDefault: true,
      exportType: "default",
      parameters: ["x"]
    }]
  }
];

const testCode = QueryTestTemplate.generateBasicTest(queryId, testCases);
```

---

## 🚀 빠른 시작 템플릿

### 자동 생성 사용법

```typescript
import { QueryAutoGenerator } from './conventions/QueryApplicationTemplates';

// 1. 빠른 스켈레톤 생성
const skeleton = QueryAutoGenerator.generateQuerySkeleton(
  "variable",        // domain
  "declarations",    // target
  "extract",         // action
  ["typescript"],    // languages
  ["var_name", "var_type", "initial_value"] // captures
);

console.log("Generated files:");
console.log("Query ID:", skeleton.queryId);
console.log("Type Name:", skeleton.resultTypeName);
console.log("Processor:", skeleton.processorName);
console.log("Code:", skeleton.skeletonCode);

// 2. 빠른 쿼리 생성 (패턴이 정해진 경우)
const quickResult = QueryAutoGenerator.quickGenerate({
  domain: "variable",
  target: "declarations",
  action: "extract",
  pattern: `(variable_declaration (variable_declarator name: (identifier) @var_name))`,
  languages: ["typescript", "javascript"],
  captures: ["var_name"],
  fields: [
    { name: "variableName", type: "string", description: "Variable name" },
    { name: "isConst", type: "boolean", description: "Is const declaration" }
  ]
});
```

---

## 📚 표준 패턴 라이브러리 활용

### Import 관련 쿼리

```typescript
import { StandardQueryPatterns } from './conventions/QueryWorkflowConventions';

// 기본 import 패턴들
const importSourcePattern = StandardQueryPatterns.getImportPattern("source");
const namedImportPattern = StandardQueryPatterns.getImportPattern("named");
const typeImportPattern = StandardQueryPatterns.getImportPattern("type");
```

### Export 관련 쿼리

```typescript
const namedExportPattern = StandardQueryPatterns.getExportPattern("named");
const defaultExportPattern = StandardQueryPatterns.getExportPattern("default");
```

### 함수 관련 쿼리

```typescript
const functionDeclPattern = StandardQueryPatterns.getFunctionPattern("declaration");
const arrowFunctionPattern = StandardQueryPatterns.getFunctionPattern("arrow");
```

### 클래스 관련 쿼리

```typescript
const classDeclPattern = StandardQueryPatterns.getClassPattern("declaration");
const classMethodPattern = StandardQueryPatterns.getClassPattern("method");
```

---

## 🔍 검증 및 테스트

### 쿼리 검증

```typescript
import { QueryValidator } from './conventions/QueryWorkflowConventions';

// 1. 문법 검증
const syntaxCheck = QueryValidator.validateSyntax(queryPattern);
if (!syntaxCheck.valid) {
  console.error("Syntax errors:", syntaxCheck.errors);
}

// 2. 캡처 그룹 일관성 검증
const captureCheck = QueryValidator.validateCaptures(queryPattern, captureNames);
if (!captureCheck.valid) {
  console.error("Capture errors:", captureCheck.errors);
}
```

### 테스트 작성

```typescript
import { QueryTestTemplate } from './conventions/QueryApplicationTemplates';

// 기본 테스트 생성
const basicTest = QueryTestTemplate.generateBasicTest(queryId, testCases);

// 통합 테스트 생성
const integrationTest = QueryTestTemplate.generateIntegrationTest(
  "export-analysis",
  integrationTestScenarios
);
```

---

## 📈 모니터링 및 최적화

### 성능 모니터링

```typescript
// 쿼리 실행 시간 측정
const startTime = Date.now();
const result = await queryEngine.executeQuery(query, sourceCode, "typescript");
const executionTime = Date.now() - startTime;

console.log(`Query ${queryId} executed in ${executionTime}ms`);
console.log(`Found ${result.results.length} matches`);
```

### 사용량 추적

```typescript
// 쿼리 사용 통계
const registry = getQueryRegistry();
const report = registry.getReport();

console.log("Query Usage Report:", {
  totalQueries: report.totalQueries,
  totalTypes: report.totalTypes,
  languagesSupported: report.languagesSupported,
  categoriesAvailable: report.categoriesAvailable
});
```

---

## 🎯 모범 사례

### DO ✅

1. **일관된 네이밍**: QueryNamingConvention 사용
2. **타입 안전성**: 모든 결과에 TypeScript 타입 정의
3. **에러 처리**: 프로세서에서 적절한 예외 처리
4. **테스트 커버리지**: 각 쿼리마다 테스트 케이스 작성
5. **문서화**: 쿼리 목적과 사용법 명시

### DON'T ❌

1. **하드코딩**: 쿼리 ID나 타입 이름 하드코딩 금지
2. **타입 생략**: any 타입 사용 금지
3. **에러 무시**: 파싱 에러나 매치 실패 무시 금지
4. **테스트 생략**: 테스트 없는 쿼리 배포 금지
5. **중복 생성**: 기존 쿼리 확인 없이 중복 생성 금지

---

## 🎉 완성 체크리스트

전체 워크플로우 완료 시 다음을 확인하세요:

- [ ] **요구사항 분석**: 명확한 요구사항 정의 ✅
- [ ] **쿼리 설계**: Tree-sitter 문법에 맞는 패턴 설계 ✅
- [ ] **쿼리 정의**: 표준 네이밍과 구조로 정의 작성 ✅
- [ ] **타입 매핑**: TypeScript 타입 안전성 보장 ✅
- [ ] **프로세서 구현**: 견고한 데이터 추출 로직 ✅
- [ ] **시스템 통합**: 레지스트리 등록 및 조합 통합 ✅
- [ ] **테스트 작성**: 충분한 테스트 케이스 커버리지 ✅
- [ ] **문서화**: 사용법과 예시 문서화 ✅

이 워크플로우를 따르면 일관되고 확장 가능한 Tree-sitter 쿼리 시스템을 구축할 수 있습니다! 🚀