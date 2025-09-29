# Unimplemented Functionality Analysis

## 발견된 문제점 (Issues Found)

### 1. 쿼리 등록 시스템 (Query Registration System) ✅ FIXED
- **문제**: 쿼리들이 등록되지 않아서 `globalQueryEngine.getRegistry().getAllQueryKeys()`가 빈 배열 반환
- **원인**: 데모에서 `src/index.ts`를 거치지 않아 `registerTypeScriptQueries()` 등이 호출되지 않음
- **해결**: 데모에서 직접 쿼리 등록 함수들을 호출하도록 수정
- **결과**: 22개 쿼리 정상 등록 확인 (TypeScript 6개, Java 8개, Python 8개)

### 2. 쿼리 실행 아키텍처 미스매치 (Query Execution Architecture Mismatch) ⚠️ IDENTIFIED
- **문제**: `globalQueryEngine.execute(queryKey, context)`가 실패
  - 에러: `TypeError: Cannot read properties of undefined (reading 'language')`
- **원인**: 쿼리 실행은 2단계 프로세스인데 1단계를 건너뛰고 있음
  1. **Tree-sitter query execution**: AST에서 패턴 매칭하여 `QueryMatch[]` 생성
  2. **Processor execution**: `QueryMatch[]`를 `QueryResult[]`로 변환

### 3. 누락된 Tree-sitter 쿼리 실행 레이어 (Missing Tree-sitter Query Execution Layer) 🔴 NOT IMPLEMENTED
- **문제**: `QueryEngine.execute()`는 이미 실행된 tree-sitter 쿼리 결과(`QueryMatch[]`)를 받아야 하는데, 우리는 `context`만 전달하고 있음
- **필요한 구현**:
  ```typescript
  // 현재 없는 기능
  const matches = await runTreeSitterQuery(tsQuery, context.tree);
  const results = await globalQueryEngine.execute(queryKey, matches, context);
  ```

### 4. CustomKeyMapper 실제 사용 사례 불명확 (Unclear CustomKeyMapper Usage) ⚠️ NEEDS CLARIFICATION
- **문제**: CustomKeyMapper가 언제, 어떻게 사용되는지 불분명
- **가능한 시나리오**:
  1. 사용자가 tree-sitter 쿼리를 실행한 후 결과를 CustomKeyMapper로 재분류
  2. 전체 분석 파이프라인에서 중간 단계로 사용
  3. API 사용자를 위한 편의 기능

## 구현 필요 사항 (Implementation Needed)

### 1. Tree-sitter 쿼리 실행 엔진 (Priority: HIGH) 🔴
```typescript
interface TreeSitterQueryEngine {
  executeQuery(
    query: string,
    tree: Parser.Tree,
    language: SupportedLanguage
  ): QueryMatch[];

  executeQueriesForLanguage(
    language: SupportedLanguage,
    tree: Parser.Tree
  ): Record<QueryKey, QueryMatch[]>;
}
```

### 2. 통합 분석 파이프라인 (Priority: MEDIUM) 🟡
```typescript
interface AnalysisPipeline {
  analyzeFile(
    sourceCode: string,
    language: SupportedLanguage,
    filePath: string
  ): Promise<{
    rawMatches: Record<QueryKey, QueryMatch[]>;
    processedResults: Record<QueryKey, QueryResult[]>;
    customMappings: Record<string, QueryResult[]>;
  }>;
}
```

### 3. 언어별 쿼리 실행기 (Priority: MEDIUM) 🟡
- TypeScript: `src/queries/typescript/executor.ts`
- Java: `src/queries/java/executor.ts`
- Python: `src/queries/python/executor.ts`

### 4. CustomKeyMapper 실용 예제 (Priority: LOW) 🟢
```typescript
// 사용자 친화적 분석 API
const analysis = await analyzeTypeScriptFile(sourceCode);
const customResults = await customMapper.execute(
  "모든_임포트": analysis.matches["ts-import-sources"],
  "네임드_임포트": analysis.matches["ts-named-imports"]
);
```

## 현재 작동하는 기능 (Currently Working)

### ✅ 쿼리 시스템
- 쿼리 등록 및 조회
- 쿼리 검증 및 언어 지원 확인
- 사전 정의된 매핑 제공

### ✅ 파서 시스템
- TypeScript/JavaScript/Java/Python 파싱
- AST 생성 및 메타데이터 추출
- QueryExecutionContext 생성

### ✅ CustomKeyMapper 인터페이스
- 사용자 정의 키 매핑 생성
- 매핑 검증
- 조건부 실행 API

## 권장 구현 순서 (Recommended Implementation Order)

1. **Tree-sitter 쿼리 실행 엔진** - 핵심 누락 기능
2. **TypeScript 쿼리 실행기** - 가장 많이 사용될 언어
3. **통합 분석 파이프라인** - 사용자 편의성
4. **Java/Python 쿼리 실행기** - 다언어 지원
5. **CustomKeyMapper 실용 예제** - 문서화

## 임시 해결책 (Workaround)

현재 CustomKeyMapper의 핵심 기능(키 매핑, 검증, 조건부 실행)은 모두 작동합니다.
실제 쿼리 실행이 구현되기 전까지는 mock 데이터나 기존 분석 결과를 사용하여
CustomKeyMapper의 기능을 테스트하고 검증할 수 있습니다.

```typescript
// Mock 데이터로 CustomKeyMapper 테스트
const mockMatches: QueryMatch[] = [/* mock data */];
const customResult = await customMapper.execute(mockMatches, context);
```