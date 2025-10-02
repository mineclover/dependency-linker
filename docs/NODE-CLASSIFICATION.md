# Node Classification Documentation

**Date**: 2025-10-02
**Status**: ✅ VERIFIED
**Test**: `tests/integration/incremental-analysis.test.ts`

## Overview

Graph DB에 생성되는 노드는 **type 필드**와 **metadata.isExternal 필드**로 구분됩니다.

## Node Types

### 1. **file** 타입

프로젝트 내부 파일 및 모듈을 나타냅니다.

#### 1.1 실제 소스 파일

분석 대상이 되는 실제 파일입니다.

**예시**:
```typescript
{
  id: 1,
  identifier: 'src/utils.ts',
  type: 'file',
  name: 'utils.ts',
  sourceFile: 'utils.ts',
  language: 'typescript',
  metadata: {
    extension: '.ts',  // 파일 확장자로 식별 가능
    size: 1024,
    lastModified: '2025-10-02T...'
  }
}
```

**식별 방법**:
- `type === 'file'`
- `metadata.extension` 존재
- `metadata.isExternal` 없음

#### 1.2 내부 Import 대상

프로젝트 내부에서 import된 모듈입니다.

**예시**:
```typescript
{
  id: 3,
  identifier: '/full/path/to/utils',
  type: 'file',
  name: 'utils',
  sourceFile: 'utils',
  language: 'typescript',
  metadata: {
    originalImport: './utils',  // 원본 import 경로
    isExternal: false           // 내부 파일 표시
  }
}
```

**식별 방법**:
- `type === 'file'`
- `metadata.isExternal === false`
- `metadata.originalImport` 존재 (`.` 또는 `/`로 시작)

---

### 2. **external** 타입

외부 라이브러리 및 모듈을 나타냅니다.

#### 2.1 NPM 패키지

npm 또는 yarn으로 설치된 외부 라이브러리입니다.

**예시**:
```typescript
{
  id: 5,
  identifier: 'lodash',
  type: 'external',
  name: 'lodash',
  sourceFile: 'lodash',
  language: 'external',
  metadata: {
    originalImport: 'lodash',
    isExternal: true
  }
}
```

**식별 방법**:
- `type === 'external'`
- `metadata.isExternal === true`
- `language === 'external'`
- import 경로가 `.`, `/`로 시작하지 않음

#### 2.2 Builtin 모듈

Node.js 내장 모듈입니다.

**예시**:
```typescript
{
  id: 4,
  identifier: 'fs',
  type: 'external',
  name: 'fs',
  sourceFile: 'fs',
  language: 'external',
  metadata: {
    originalImport: 'fs',
    isExternal: true
  }
}
```

**식별 방법**:
- `type === 'external'`
- `metadata.isExternal === true`
- `language === 'external'`
- 현재는 NPM 패키지와 동일하게 처리됨

---

## Classification Logic

### Import 경로 기반 분류

```typescript
// src/database/GraphStorage.ts:331-333
private isExternalPackage(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}
```

**분류 규칙**:

| Import 경로 | 타입 | isExternal | 예시 |
|-------------|------|------------|------|
| `./utils` | `file` | `false` | 프로젝트 내부 파일 |
| `../common` | `file` | `false` | 프로젝트 내부 파일 |
| `/absolute/path` | `file` | `false` | 절대 경로 파일 |
| `lodash` | `external` | `true` | NPM 패키지 |
| `react` | `external` | `true` | NPM 패키지 |
| `fs` | `external` | `true` | Builtin 모듈 |
| `path` | `external` | `true` | Builtin 모듈 |

---

## Test Results

### 테스트 파일

```typescript
// src/external-test.ts
import { utils } from './utils';      // Internal
import * as lodash from 'lodash';     // External (npm)
import React from 'react';            // External (npm)
import { readFileSync } from 'fs';    // External (builtin)
import { join } from 'path';          // External (builtin)
```

### 생성된 노드들

```
📊 Node Type Classification:
  Total nodes: 6
  Node types: [ 'file', 'external' ]
  Count by type: { file: 2, external: 4 }

📂 Nodes by Type:

  [file] (2 nodes):
    - utils          (internal, isExternal: false, './utils')
    - external-test.ts (source file, extension: '.ts')

  [external] (4 nodes):
    - fs       (builtin, isExternal: true, 'fs')
    - lodash   (npm, isExternal: true, 'lodash')
    - path     (builtin, isExternal: true, 'path')
    - react    (npm, isExternal: true, 'react')
```

---

## Filtering Nodes

### 1. 실제 소스 파일만 조회

```typescript
const nodeList = await integration.listAllNodes();

const sourceFiles = nodeList.nodes.filter(n => n.metadata?.extension);

console.log('Source files:', sourceFiles);
// [{ name: 'external-test.ts', extension: '.ts' }]
```

### 2. 내부 파일만 조회

```typescript
const internalFiles = nodeList.nodes.filter(
  n => n.type === 'file' && n.metadata?.isExternal === false
);

console.log('Internal files:', internalFiles);
// [{ name: 'utils', originalImport: './utils' }]
```

### 3. 외부 패키지만 조회

```typescript
const externalPackages = nodeList.nodes.filter(
  n => n.type === 'external' || n.metadata?.isExternal === true
);

console.log('External packages:', externalPackages);
// [
//   { name: 'fs', originalImport: 'fs' },
//   { name: 'lodash', originalImport: 'lodash' },
//   { name: 'path', originalImport: 'path' },
//   { name: 'react', originalImport: 'react' }
// ]
```

### 4. NPM vs Builtin 구분 (수동)

현재는 자동 구분이 안 되므로 수동으로 구분해야 합니다.

```typescript
// Node.js builtin 모듈 목록
const BUILTIN_MODULES = [
  'fs', 'path', 'os', 'http', 'https', 'crypto', 'stream',
  'buffer', 'events', 'util', 'url', 'querystring', 'zlib',
  'child_process', 'cluster', 'net', 'dns', 'tls', 'readline',
  'repl', 'vm', 'assert', 'constants', 'process', 'console'
  // ... 더 많은 모듈들
];

const externalNodes = nodeList.nodes.filter(n => n.type === 'external');

const builtinNodes = externalNodes.filter(n =>
  BUILTIN_MODULES.includes(n.name)
);

const npmPackages = externalNodes.filter(n =>
  !BUILTIN_MODULES.includes(n.name)
);

console.log('Builtin modules:', builtinNodes.map(n => n.name));
// ['fs', 'path']

console.log('NPM packages:', npmPackages.map(n => n.name));
// ['lodash', 'react']
```

---

## Current Limitations

### 1. Builtin과 NPM 패키지 미구분

**문제**: 둘 다 `type: 'external'`로 동일하게 처리됨

**영향**:
- 자동으로 builtin 모듈과 npm 패키지를 구분할 수 없음
- 수동으로 builtin 모듈 목록을 관리해야 함

**해결 방법** (향후):
```typescript
// DependencyToGraph에서 이미 구분하고 있음
const result = await analyzeDependencies(sourceCode, language, filePath);
// result.builtin: ['fs', 'path']
// result.external: ['lodash', 'react']

// 이 정보를 GraphStorage로 전달하여 노드 생성 시 사용
```

### 2. 메타데이터 제한

**현재 metadata 필드**:
- `extension`: 파일 확장자
- `originalImport`: 원본 import 경로
- `isExternal`: 외부 패키지 여부
- `size`: 파일 크기
- `lastModified`: 마지막 수정 시간

**누락된 정보**:
- Builtin vs NPM 구분
- 패키지 버전
- 패키지 의존성
- 라이선스 정보

---

## API Usage

### 노드 타입별 조회

```typescript
import { DependencyToGraph } from '@context-action/dependency-linker';

const integration = new DependencyToGraph({
  projectRoot: '/path/to/project',
});

// 파일 분석
await integration.analyzeSingleFile('./src/app.ts');

// 모든 노드 조회
const nodeList = await integration.listAllNodes();

console.log('=== Node Classification ===');
console.log(`Total: ${nodeList.stats.totalNodes} nodes`);
console.log(`Types: ${nodeList.stats.nodeTypes.join(', ')}`);
console.log(`Count: ${JSON.stringify(nodeList.stats.countByType)}`);

// file 타입만
const fileNodes = await integration.listNodesByType('file');
console.log(`\nFile nodes: ${fileNodes.length}`);

// external 타입만
const externalNodes = await integration.listNodesByType('external');
console.log(`External nodes: ${externalNodes.length}`);

// 필터링
const sourceFiles = nodeList.nodes.filter(n => n.metadata?.extension);
const internalImports = nodeList.nodes.filter(n => n.metadata?.isExternal === false);
const externalPackages = nodeList.nodes.filter(n => n.metadata?.isExternal === true);

console.log(`\nSource files: ${sourceFiles.length}`);
console.log(`Internal imports: ${internalImports.length}`);
console.log(`External packages: ${externalPackages.length}`);

await integration.close();
```

---

## Future Enhancements

### 1. Builtin 자동 구분

**구현 방안**:
```typescript
// GraphStorage에 builtin 정보 전달
interface ImportInfo {
  path: string;
  type: 'internal' | 'external' | 'builtin';
}

// 노드 생성 시 type 세분화
const importNode: GraphNode = {
  type: getNodeType(importInfo.type), // 'file' | 'external' | 'builtin'
  metadata: {
    importType: importInfo.type,
    isBuiltin: importInfo.type === 'builtin',
    isNpm: importInfo.type === 'external',
  }
};
```

### 2. 패키지 메타데이터 추가

**추가 정보**:
- 패키지 버전 (from package.json)
- 라이선스
- 의존성 트리
- 설치 크기

### 3. 동적 분류

**시나리오**:
- package.json 읽어서 dependencies/devDependencies 구분
- node_modules 스캔하여 실제 설치된 패키지 확인
- builtin 모듈 목록 자동 업데이트 (Node.js 버전별)

---

## Summary

### 현재 구분

✅ **구분됨**:
- `file` vs `external` (type 필드로 구분)
- Internal vs External (metadata.isExternal로 구분)
- Source file vs Import target (metadata.extension 유무로 구분)

⚠️ **구분 안됨**:
- Builtin vs NPM (둘 다 type='external')
- 수동으로 builtin 목록 관리 필요

### 사용 가능한 필터

```typescript
// ✅ 가능
nodeList.nodes.filter(n => n.type === 'file')           // 내부 파일
nodeList.nodes.filter(n => n.type === 'external')       // 외부 패키지
nodeList.nodes.filter(n => n.metadata?.isExternal === true)   // 외부
nodeList.nodes.filter(n => n.metadata?.isExternal === false)  // 내부
nodeList.nodes.filter(n => n.metadata?.extension)       // 소스 파일

// ⚠️ 수동 처리 필요
nodeList.nodes.filter(n =>                              // Builtin
  n.type === 'external' && BUILTIN_LIST.includes(n.name)
)
nodeList.nodes.filter(n =>                              // NPM
  n.type === 'external' && !BUILTIN_LIST.includes(n.name)
)
```

---

**Documentation Date**: 2025-10-02
**Test Coverage**: ✅ Complete
**Status**: Production Ready
