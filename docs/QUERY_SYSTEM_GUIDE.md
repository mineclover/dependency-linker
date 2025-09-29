# Tree-sitter Query System Guide

EnhancedDependencyExtractorV2의 확장 가능한 쿼리 시스템 사용 가이드

## 🚀 Quick Start

### 기본 사용법

```typescript
import {
  EnhancedDependencyExtractorV2,
  TypeScriptParser
} from '@context-action/dependency-linker';

const parser = new TypeScriptParser();
const extractor = new EnhancedDependencyExtractorV2();

const parseResult = await parser.parse('/Component.tsx', sourceCode);
const result = extractor.extractEnhanced(
  parseResult.ast,
  '/Component.tsx',
  parser.getGrammar()
);
```

### 커스텀 쿼리 주입

```typescript
import {
  EnhancedDependencyExtractorV2,
  QueryConfigurationBuilder,
  ALL_COMMON_QUERIES
} from '@context-action/dependency-linker';

// 공통 쿼리 사용
const config = new QueryConfigurationBuilder()
  .updateSettings({ debug: true });

ALL_COMMON_QUERIES.forEach(query => {
  if (query.name.includes('import')) {
    config.addImportQuery(query);
  } else {
    config.addUsageQuery(query);
  }
});

const extractor = new EnhancedDependencyExtractorV2(config.build());
```

## 📋 사전 정의된 쿼리들

### Import 분석 쿼리

#### 1. Import Sources (📦)
모든 import된 소스(파일/라이브러리) 수집
```typescript
import { IMPORT_SOURCES_QUERY } from '@context-action/dependency-linker';

// 결과: ['react', 'date-fns', './utils', '@mui/material']
```

#### 2. Named Imports (🎯)
`{ useState, useEffect }` 형태의 named import 수집
```typescript
import { NAMED_IMPORTS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ name: 'useState', source: 'react' }, ...]
```

#### 3. Default Imports (🔤)
`import React from 'react'` 형태의 default import 수집
```typescript
import { DEFAULT_IMPORTS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ name: 'React', source: 'react' }]
```

#### 4. Namespace Imports (🌐)
`import * as utils from './utils'` 형태의 namespace import 수집
```typescript
import { NAMESPACE_IMPORTS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ alias: 'utils', source: './utils' }]
```

#### 5. Type Imports (🏷️) - TypeScript 전용
`import type { FC } from 'react'` 형태의 타입 import 수집
```typescript
import { TYPE_IMPORTS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ type: 'FC', source: 'react' }]
```

### Usage 분석 쿼리

#### 6. Function Calls (🔧)
모든 함수 호출 패턴 분석
```typescript
import { FUNCTION_CALLS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ name: 'useState', source: 'react' }, ...]
```

#### 7. Property Access (🎪)
`object.property` 형태의 속성 접근 분석
```typescript
import { PROPERTY_ACCESS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ object: 'axios', property: 'get', source: 'axios' }]
```

#### 8. Method Chaining (⛓️)
`object.method().anotherMethod()` 형태의 메서드 체이닝 분석
```typescript
import { METHOD_CHAINING_QUERY } from '@context-action/dependency-linker';

// 결과: [{ method: 'then', context: 'axios.get()' }]
```

#### 9. React Hooks (🪝)
`useState`, `useEffect` 등 React Hook 사용 분석
```typescript
import { REACT_HOOKS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ name: 'useState', source: 'react' }, ...]
```

#### 10. Destructuring (🔄)
`const { foo, bar } = object` 형태의 구조분해할당 분석
```typescript
import { DESTRUCTURING_QUERY } from '@context-action/dependency-linker';

// 결과: [{ variable: 'foo', source: 'object' }]
```

### JSX 분석 쿼리

#### 11. JSX Components (🎨)
`<Component>` 형태의 JSX 컴포넌트 사용 분석
```typescript
import { JSX_COMPONENTS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ name: 'Button', source: '@mui/material' }]
```

#### 12. JSX Props (🏷️)
`<Component prop="value" />` 형태의 JSX props 분석
```typescript
import { JSX_PROPS_QUERY } from '@context-action/dependency-linker';

// 결과: [{ component: 'Button', prop: 'onClick' }]
```

## 🎯 쿼리 세트 사용법

### 프로젝트 타입별 최적화

#### React 프로젝트
```typescript
import {
  QueryConfigurationBuilder,
  IMPORT_QUERIES,
  REACT_HOOKS_QUERY,
  JSX_QUERIES
} from '@context-action/dependency-linker';

const reactConfig = new QueryConfigurationBuilder();

// Import 분석 + React Hook + JSX 분석
IMPORT_QUERIES.forEach(q => reactConfig.addImportQuery(q));
JSX_QUERIES.forEach(q => reactConfig.addUsageQuery(q));
reactConfig.addUsageQuery(REACT_HOOKS_QUERY);

const extractor = new EnhancedDependencyExtractorV2(reactConfig.build());
```

#### Node.js 백엔드
```typescript
import {
  QueryConfigurationBuilder,
  IMPORT_QUERIES,
  FUNCTION_CALLS_QUERY,
  PROPERTY_ACCESS_QUERY
} from '@context-action/dependency-linker';

const nodeConfig = new QueryConfigurationBuilder();

// Import + 함수 호출 + 속성 접근 분석
IMPORT_QUERIES.forEach(q => nodeConfig.addImportQuery(q));
nodeConfig.addUsageQuery(FUNCTION_CALLS_QUERY);
nodeConfig.addUsageQuery(PROPERTY_ACCESS_QUERY);

const extractor = new EnhancedDependencyExtractorV2(nodeConfig.build());
```

#### TypeScript 프로젝트
```typescript
import {
  QueryConfigurationBuilder,
  ALL_COMMON_QUERIES
} from '@context-action/dependency-linker';

const tsConfig = new QueryConfigurationBuilder()
  .forLanguage('typescript')  // TypeScript 쿼리만 필터링
  .updateSettings({ debug: true });

// 모든 TypeScript 호환 쿼리 사용
ALL_COMMON_QUERIES
  .filter(q => q.languages.includes('typescript'))
  .forEach(query => {
    if (query.name.includes('import')) {
      tsConfig.addImportQuery(query);
    } else {
      tsConfig.addUsageQuery(query);
    }
  });

const extractor = new EnhancedDependencyExtractorV2(tsConfig.build());
```

## 🔧 커스텀 쿼리 작성법

### 기본 구조

```typescript
import type { QueryDefinition } from '@context-action/dependency-linker';

const customQuery: QueryDefinition = {
  name: 'my-custom-query',
  description: '커스텀 분석 로직',
  query: `
    (call_expression
      function: (identifier) @function_name
      (#match? @function_name "^fetch"))
  `,
  processor: (matches, context) => {
    // 매치 결과 처리 로직
    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === 'function_name') {
          console.log('Fetch 호출 발견:', capture.node.text);
        }
      }
    }
  },
  languages: ['typescript', 'javascript'],
  priority: 80,
  enabled: true
};
```

### 고급 패턴 예제

#### API 호출 분석
```typescript
const API_CALLS_QUERY: QueryDefinition = {
  name: 'api-calls-analyzer',
  description: 'API 호출 패턴 분석',
  query: `
    (call_expression
      function: (member_expression
        object: (identifier) @api_client
        property: (identifier) @http_method
        (#match? @http_method "^(get|post|put|delete|patch)$")))
  `,
  processor: (matches, context) => {
    const apiCalls: { client: string; method: string }[] = [];

    for (const match of matches) {
      const captures: Record<string, any[]> = {};

      for (const capture of match.captures) {
        if (!captures[capture.name]) captures[capture.name] = [];
        captures[capture.name].push(capture.node);
      }

      const clients = captures.api_client || [];
      const methods = captures.http_method || [];

      clients.forEach((client, i) => {
        const method = methods[i];
        if (method) {
          apiCalls.push({
            client: client.text,
            method: method.text
          });
        }
      });
    }

    console.log('🌐 API Calls:', apiCalls);
  },
  languages: ['typescript', 'tsx', 'javascript', 'jsx'],
  priority: 85,
  enabled: true
};
```

#### Error Handling 분석
```typescript
const ERROR_HANDLING_QUERY: QueryDefinition = {
  name: 'error-handling-analyzer',
  description: 'Error handling 패턴 분석',
  query: `
    [
      (try_statement
        body: (statement_block) @try_body
        handler: (catch_clause) @catch_handler)
      (call_expression
        function: (member_expression
          property: (property_identifier) @method
          (#match? @method "catch")))
    ]
  `,
  processor: (matches, context) => {
    const errorHandling: { type: string; location: string }[] = [];

    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === 'try_body') {
          errorHandling.push({
            type: 'try-catch',
            location: `Line ${capture.node.startPosition.row + 1}`
          });
        } else if (capture.name === 'method' && capture.node.text === 'catch') {
          errorHandling.push({
            type: 'promise-catch',
            location: `Line ${capture.node.startPosition.row + 1}`
          });
        }
      }
    }

    console.log('⚠️ Error Handling:', errorHandling);
  },
  languages: ['typescript', 'tsx', 'javascript', 'jsx'],
  priority: 75,
  enabled: true
};
```

## 🎛️ 설정 옵션

```typescript
const config = new QueryConfigurationBuilder()
  .updateSettings({
    enableFallback: true,     // 쿼리 실패 시 수동 분석 사용
    enableCaching: true,      // 쿼리 결과 캐싱
    debug: false,             // 디버그 로그 출력
    timeout: 5000            // 쿼리 실행 제한 시간 (ms)
  })
  .build();
```

## 📊 성능 최적화

### 쿼리 우선순위 설정
```typescript
const query: QueryDefinition = {
  // ...
  priority: 100,  // 높을수록 먼저 실행 (기본: 50)
  enabled: true   // 쿼리 활성화 여부
};
```

### 언어별 필터링
```typescript
const config = new QueryConfigurationBuilder()
  .forLanguage('tsx')  // TSX 전용 쿼리만 사용
  .build();
```

### 선택적 쿼리 비활성화
```typescript
const config = new QueryConfigurationBuilder()
  .disableQuery('typescript-function-calls')  // 특정 쿼리 비활성화
  .build();
```

## 🔍 실제 사용 예제

### 프로젝트 의존성 분석
```typescript
import {
  EnhancedDependencyExtractorV2,
  QueryConfigurationBuilder,
  IMPORT_SOURCES_QUERY
} from '@context-action/dependency-linker';

const dependencyAnalyzer = new QueryConfigurationBuilder()
  .addImportQuery(IMPORT_SOURCES_QUERY)
  .updateSettings({ debug: true })
  .build();

const extractor = new EnhancedDependencyExtractorV2(dependencyAnalyzer);
const result = extractor.extractEnhanced(ast, filePath, language);

// 사용된 라이브러리 목록 확인
console.log('Dependencies:', result.enhancedDependencies.map(d => d.source));
```

### React Hook 사용량 분석
```typescript
import {
  EnhancedDependencyExtractorV2,
  QueryConfigurationBuilder,
  REACT_HOOKS_QUERY
} from '@context-action/dependency-linker';

const hookAnalyzer = new QueryConfigurationBuilder()
  .addUsageQuery(REACT_HOOKS_QUERY)
  .updateSettings({ debug: false })
  .build();

const extractor = new EnhancedDependencyExtractorV2(hookAnalyzer);
const result = extractor.extractEnhanced(ast, filePath, language);

// 가장 많이 사용된 Hook 확인
console.log('Most used hooks:', result.usageAnalysis.mostUsedMethods);
```

## 🚨 주의사항

1. **Tree-sitter 구문**: 쿼리는 Tree-sitter 문법을 정확히 따라야 합니다
2. **언어 호환성**: 각 쿼리의 `languages` 설정을 확인하세요
3. **성능 고려**: 복잡한 쿼리는 성능에 영향을 줄 수 있습니다
4. **캐싱**: 동일한 쿼리의 반복 실행 시 캐싱을 활용하세요

## 📚 추가 리소스

- [Tree-sitter Query 문법](https://tree-sitter.github.io/tree-sitter/using-parsers#query-syntax)
- [TypeScript Tree-sitter Grammar](https://github.com/tree-sitter/tree-sitter-typescript)
- [JavaScript Tree-sitter Grammar](https://github.com/tree-sitter/tree-sitter-javascript)