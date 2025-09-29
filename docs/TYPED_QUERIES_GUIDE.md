# Type-Safe Query System Guide

## Overview

TypeScript-first 쿼리 시스템으로 Tree-sitter Query 결과를 타입 안전하게 처리할 수 있습니다. 컴파일 타임에 쿼리 결과 타입을 검증하고, 런타임에 강력한 타입 추론을 제공합니다.

## 🎯 Key Features

- **🔒 Type Safety**: 모든 쿼리 결과에 대한 강력한 타입 안전성
- **📊 Structured Results**: 쿼리별 특화된 결과 타입 정의
- **🚀 Performance**: 타입 검증과 함께 최적화된 성능
- **🔄 Extensibility**: 새로운 쿼리 타입 쉽게 추가 가능
- **📈 Analytics**: 타입 안전한 집계 및 통계 함수

## 📋 Query Result Types

### Import Analysis Results

```typescript
// Import Sources - 모든 import된 소스 수집
interface ImportSourceResult {
  source: string;           // 'react', '@mui/material', './utils'
  isRelative: boolean;      // 상대경로 여부
  type: 'package' | 'local'; // 패키지 또는 로컬 파일
  location: ExtendedSourceLocation;
  nodeText: string;
}

// Named Imports - { useState, useEffect } 형태
interface NamedImportResult {
  name: string;            // 'useState'
  source: string;          // 'react'
  alias?: string;          // 'as newName'
  originalName: string;    // 원본 이름
  location: ExtendedSourceLocation;
}

// Default Imports - import React from 'react'
interface DefaultImportResult {
  name: string;           // 'React'
  source: string;         // 'react'
  location: ExtendedSourceLocation;
}
```

### Usage Analysis Results

```typescript
// Function Calls - 함수 호출 분석
interface FunctionCallResult {
  functionName: string;    // 'useState'
  source?: string;         // 'react'
  arguments: string[];     // ['initialValue']
  context: 'global' | 'component' | 'useEffect' | 'event_handler' | 'other';
  location: ExtendedSourceLocation;
}

// React Hooks - Hook 사용 분석
interface ReactHookResult {
  hookName: string;        // 'useEffect'
  source: string;          // 'react'
  arguments: string[];     // ['callback', '[deps]']
  hookType: 'state' | 'effect' | 'context' | 'ref' | 'memo' | 'callback' | 'custom' | 'other';
  dependencies?: string[]; // ['id', 'fetchUser']
  location: ExtendedSourceLocation;
}

// Property Access - object.property 분석
interface PropertyAccessResult {
  objectName: string;      // 'axios'
  propertyName: string;    // 'get'
  source?: string;         // 'axios'
  accessType: 'read' | 'write' | 'call';
  isChained: boolean;      // 체이닝 여부
  location: ExtendedSourceLocation;
}
```

### JSX Analysis Results

```typescript
// JSX Components - <Component> 분석
interface JSXComponentResult {
  componentName: string;   // 'Button'
  source?: string;         // '@mui/material'
  childrenCount: number;   // 자식 요소 개수
  isSelfClosing: boolean;  // <Button />
  isConditional: boolean;  // 조건부 렌더링 여부
  location: ExtendedSourceLocation;
}

// JSX Props - <Component prop="value" /> 분석
interface JSXPropsResult {
  componentName: string;   // 'Button'
  propName: string;        // 'onClick'
  propValue: string;       // 'handleClick'
  propType: 'string' | 'number' | 'boolean' | 'expression' | 'function' | 'object';
  isDynamic: boolean;      // {expression} 형태인지
  location: ExtendedSourceLocation;
}
```

## 🚀 Basic Usage

### 1. Type-Safe Query Execution

```typescript
import {
  TypedQueryExecutor,
  TYPED_IMPORT_SOURCES_QUERY,
  TYPED_REACT_HOOKS_QUERY,
  type ImportSourceResult,
  type ReactHookResult
} from '@context-action/dependency-linker';

const executor = new TypedQueryExecutor();
const parser = new TypeScriptParser();

// 파일 파싱
const parseResult = await parser.parse('/Component.tsx', sourceCode);

// Import Sources 분석
const importResult = executor.executeQuery(
  TYPED_IMPORT_SOURCES_QUERY,
  importMatches,
  context
);

if (importResult.success) {
  // 타입 안전한 결과 접근
  const sources: ImportSourceResult[] = importResult.results;

  sources.forEach(source => {
    console.log(`📦 ${source.source} (${source.type})`);
    console.log(`   위치: ${source.location.line}:${source.location.column}`);
    console.log(`   상대경로: ${source.isRelative}`);
  });
}
```

### 2. Multiple Query Execution

```typescript
import {
  ALL_TYPED_QUERIES,
  TypedQueryExecutor,
  type ComprehensiveQueryResult
} from '@context-action/dependency-linker';

// 모든 쿼리 동시 실행
const queryExecutions = ALL_TYPED_QUERIES.map(queryDef => {
  const query = new Parser.Query(grammar, queryDef.query);
  const matches = query.matches(ast.rootNode);
  return { definition: queryDef, matches };
});

const result: ComprehensiveQueryResult = executor.executeQueries(
  queryExecutions,
  context
);

// 카테고리별 결과 접근
console.log('📦 Import 결과:', result.imports);
console.log('🔧 Usage 결과:', result.usage);
console.log('🎨 JSX 결과:', result.jsx);
console.log('📊 실행 요약:', result.summary);
```

## 🔍 Advanced Usage

### 1. Type Guards and Filtering

```typescript
import type { QueryResult, ImportSourceResult, ReactHookResult } from '@context-action/dependency-linker';

// 타입 가드 함수
const isImportSourceResult = (result: QueryResult): result is ImportSourceResult => {
  return result.queryName === 'import-sources';
};

const isReactHookResult = (result: QueryResult): result is ReactHookResult => {
  return result.queryName === 'react-hooks';
};

// 필터링 및 타입 안전한 처리
const allResults: QueryResult[] = getAllQueryResults();

const importSources = allResults.filter(isImportSourceResult);
const reactHooks = allResults.filter(isReactHookResult);

// 타입 안전한 속성 접근
importSources.forEach(source => {
  // TypeScript가 source를 ImportSourceResult로 인식
  console.log(`${source.source} is ${source.type}`);
});
```

### 2. Custom Aggregation Functions

```typescript
// 타입 안전한 집계 함수들
const getPackageStats = (sources: ImportSourceResult[]) => {
  return sources.reduce((acc, source) => {
    const category = source.isRelative ? 'local' : 'external';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

const getHookUsageStats = (hooks: ReactHookResult[]) => {
  return hooks.reduce((acc, hook) => {
    acc[hook.hookType] = (acc[hook.hookType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

// 사용 예제
const packageStats = getPackageStats(importSources);
const hookStats = getHookUsageStats(reactHooks);

console.log('📊 Package Distribution:', packageStats);
console.log('🪝 Hook Usage:', hookStats);
```

### 3. Result Collection and Management

```typescript
import { TypedQueryResultCollector } from '@context-action/dependency-linker';

const collector = new TypedQueryResultCollector();

// 결과 추가 (타입 안전)
collector.addResult('import-sources', {
  queryName: 'import-sources',
  source: 'react',
  isRelative: false,
  type: 'package',
  location: /* ... */,
  nodeText: '"react"'
});

// 특정 쿼리 결과 조회 (타입 안전)
const importResults = collector.getResults('import-sources');
// TypeScript가 ImportSourceResult[]로 추론

// 모든 결과 조회
const allResults = collector.getAllResults();
```

## 🛠 Custom Query Definition

### Creating Type-Safe Custom Queries

```typescript
import type { TypedQueryDefinition } from '@context-action/dependency-linker';

// 커스텀 쿼리 타입 정의
interface CustomAnalysisResult extends BaseQueryResult {
  customProperty: string;
  analysisType: 'custom';
}

// 쿼리 결과 매핑에 추가 (타입 확장)
declare module '@context-action/dependency-linker' {
  interface QueryResultMapping {
    'custom-analysis': CustomAnalysisResult[];
  }
}

// 타입 안전한 커스텀 쿼리 정의
const CUSTOM_QUERY: TypedQueryDefinition<'custom-analysis'> = {
  name: 'custom-analysis-query',
  description: 'Custom analysis with type safety',
  query: `
    (call_expression
      function: (identifier) @function_name
      (#match? @function_name "customFunction"))
  `,
  processor: (matches, context, collector) => {
    matches.forEach(match => {
      match.captures.forEach(capture => {
        if (capture.name === 'function_name') {
          const result: CustomAnalysisResult = {
            queryName: 'custom-analysis',
            location: extractLocation(capture.node),
            nodeText: capture.node.text,
            customProperty: 'custom value',
            analysisType: 'custom'
          };

          collector.addResult('custom-analysis', result);
        }
      });
    });
  },
  languages: ['typescript', 'tsx'],
  resultType: 'custom-analysis',
  enabled: true
};
```

## 📊 Performance and Debugging

### Execution Metrics

```typescript
const result = executor.executeQuery(TYPED_IMPORT_SOURCES_QUERY, matches, context);

console.log('📊 Execution Metrics:');
console.log(`  Success: ${result.success}`);
console.log(`  Execution Time: ${result.executionTime}ms`);
console.log(`  Node Count: ${result.nodeCount}`);
console.log(`  Results: ${result.results.length}`);

if (!result.success) {
  console.error(`  Error: ${result.error}`);
}
```

### Comprehensive Analysis Metrics

```typescript
const comprehensive = executor.executeQueries(queryExecutions, context);

console.log('📈 Comprehensive Metrics:');
console.log(`  Total Execution Time: ${comprehensive.totalExecutionTime}ms`);
console.log(`  Successful Queries: ${comprehensive.summary.successfulQueries}/${comprehensive.summary.totalQueries}`);
console.log(`  Average Execution Time: ${comprehensive.summary.avgExecutionTime}ms`);
console.log(`  Total Nodes Processed: ${comprehensive.summary.totalNodes}`);
```

## 🎯 Best Practices

### 1. Type-First Development

```typescript
// ❌ 타입 안전하지 않은 방식
const results = executeQuery(query);
const source = results[0].source; // 런타임 에러 가능

// ✅ 타입 안전한 방식
const result = executor.executeQuery(TYPED_IMPORT_SOURCES_QUERY, matches, context);
if (result.success) {
  const sources: ImportSourceResult[] = result.results;
  sources.forEach(source => {
    // 컴파일 타임에 타입 검증
    console.log(source.source); // 안전한 접근
  });
}
```

### 2. Error Handling

```typescript
const processQueryResults = async <T extends keyof QueryResultMapping>(
  queryDef: TypedQueryDefinition<T>,
  matches: any[],
  context: QueryProcessorContext
) => {
  const result = executor.executeQuery(queryDef, matches, context);

  if (!result.success) {
    throw new Error(`Query "${queryDef.name}" failed: ${result.error}`);
  }

  if (result.results.length === 0) {
    console.warn(`Query "${queryDef.name}" returned no results`);
  }

  return result.results;
};
```

### 3. Batch Processing

```typescript
const processBatchQueries = async (files: string[]) => {
  const results = new Map<string, ComprehensiveQueryResult>();

  for (const file of files) {
    const parseResult = await parser.parse(file, await readFile(file));

    if (parseResult.ast) {
      const queryExecutions = ALL_TYPED_QUERIES.map(queryDef => ({
        definition: queryDef,
        matches: new Parser.Query(grammar, queryDef.query).matches(parseResult.ast.rootNode)
      }));

      const result = executor.executeQueries(queryExecutions, createContext(file));
      results.set(file, result);
    }
  }

  return results;
};
```

## 🔧 Integration with EnhancedDependencyExtractorV2

```typescript
import {
  EnhancedDependencyExtractorV2,
  QueryConfigurationBuilder,
  TYPED_IMPORT_SOURCES_QUERY,
  TYPED_REACT_HOOKS_QUERY
} from '@context-action/dependency-linker';

// 타입 안전한 쿼리와 함께 사용
const config = new QueryConfigurationBuilder()
  .updateSettings({ enableFallback: true, debug: true })
  .build();

// 커스텀 타입 안전 쿼리 추가
config.importQueries.push(TYPED_IMPORT_SOURCES_QUERY);
config.usageQueries.push(TYPED_REACT_HOOKS_QUERY);

const extractor = new EnhancedDependencyExtractorV2(config);
const result = extractor.extractEnhanced(ast, filePath, grammar);

// 기존 결과와 함께 타입 안전한 추가 분석 수행
const executor = new TypedQueryExecutor();
const typedResults = executor.executeQueries(typedQueryExecutions, context);
```

## 📈 Migration from Legacy Queries

### From Manual Processing to Type-Safe

```typescript
// ❌ 기존 방식
const processMatches = (matches: any[]) => {
  const results: any[] = [];

  matches.forEach(match => {
    match.captures.forEach(capture => {
      if (capture.name === 'source') {
        results.push({
          source: extractString(capture.node),
          // 타입 정보 없음, 실수 가능
        });
      }
    });
  });

  return results;
};

// ✅ 타입 안전한 방식
const processor = createImportSourcesProcessor(collector);
const result = executor.executeQuery(TYPED_IMPORT_SOURCES_QUERY, matches, context);

// 컴파일 타임 타입 검증
const sources: ImportSourceResult[] = result.results;
```

## 🎉 Conclusion

Type-Safe Query System은 Tree-sitter Query의 강력함과 TypeScript의 타입 안전성을 결합하여:

- **🔒 Runtime Safety**: 런타임 에러 방지
- **🚀 Developer Experience**: 자동완성 및 IntelliSense
- **📊 Better Analytics**: 타입 안전한 집계 및 분석
- **🔄 Maintainability**: 쉬운 리팩토링과 확장성
- **⚡ Performance**: 최적화된 성능과 메모리 사용

이를 통해 더 안전하고 효율적인 코드 분석 시스템을 구축할 수 있습니다.