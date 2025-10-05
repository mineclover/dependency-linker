# Node Listing API Documentation

**Date**: 2025-10-02
**Status**: ✅ IMPLEMENTED
**Version**: 1.0.0

## Overview

노드 리스트업 API는 Graph DB에 저장된 모든 노드를 조회하고, 유형별로 분류하여 제공하는 기능입니다.

## API Methods

### 1. `listAllNodes()`

모든 노드를 조회하고 유형별로 그룹화하여 반환합니다.

**시그니처**:
```typescript
async listAllNodes(): Promise<{
  nodes: GraphNode[];
  nodesByType: Record<string, GraphNode[]>;
  stats: {
    totalNodes: number;
    nodeTypes: string[];
    countByType: Record<string, number>;
  };
}>
```

**반환값**:
- `nodes`: 모든 노드의 배열
- `nodesByType`: 노드 유형별로 그룹화된 객체
- `stats`: 노드 통계
  - `totalNodes`: 총 노드 개수
  - `nodeTypes`: 노드 유형 목록
  - `countByType`: 유형별 노드 개수

**예제**:
```typescript
import { DependencyToGraph } from '@context-action/dependency-linker';

const integration = new DependencyToGraph({
  projectRoot: '/path/to/project',
});

// 파일 분석
await integration.analyzeSingleFile('./src/utils.ts');
await integration.analyzeSingleFile('./src/math.ts');

// 모든 노드 리스트업
const nodeList = await integration.listAllNodes();

console.log('Total nodes:', nodeList.stats.totalNodes);
console.log('Node types:', nodeList.stats.nodeTypes);
console.log('Count by type:', nodeList.stats.countByType);

// 유형별 노드 출력
for (const [type, nodes] of Object.entries(nodeList.nodesByType)) {
  console.log(`\n[${type}] (${nodes.length} nodes)`);

  for (const node of nodes) {
    console.log('  -', {
      id: node.id,
      identifier: node.identifier,
      name: node.name,
      sourceFile: node.sourceFile,
    });
  }
}

await integration.close();
```

---

### 2. `listNodesByType(nodeType: string)`

특정 유형의 노드만 조회합니다.

**시그니처**:
```typescript
async listNodesByType(nodeType: string): Promise<GraphNode[]>
```

**파라미터**:
- `nodeType`: 조회할 노드 유형 (예: 'file', 'class', 'function')

**반환값**:
- 해당 유형의 노드 배열

**예제**:
```typescript
// 파일 노드만 조회
const fileNodes = await integration.listNodesByType('file');

console.log(`File nodes: ${fileNodes.length}`);
for (const node of fileNodes) {
  console.log('  -', node.name, node.sourceFile);
}
```

---

## Node Structure

### GraphNode 타입

```typescript
interface GraphNode {
  id?: number;              // 노드 ID (DB 자동 생성)
  identifier: string;       // 노드의 고유 식별자
  type: string;            // 노드 유형
  name: string;            // 노드 이름
  sourceFile: string;      // 소스 파일 경로
  language: SupportedLanguage;  // 프로그래밍 언어
  metadata?: Record<string, any>;  // 추가 메타데이터
  startLine?: number;      // 시작 라인 번호
  startColumn?: number;    // 시작 컬럼 번호
  endLine?: number;        // 종료 라인 번호
  endColumn?: number;      // 종료 컬럼 번호
}
```

---

## Current Node Types

현재 시스템에서 생성되는 노드 유형들:

### 1. **file** 노드

파일 및 모듈을 나타내는 노드입니다.

**종류**:
1. **실제 파일 노드**: 분석된 소스 파일
2. **import 대상 노드**: import된 모듈/파일

**예시**:
```typescript
// 실제 파일 노드
{
  id: 1,
  identifier: 'src/utils.ts',
  type: 'file',
  name: 'utils.ts',
  sourceFile: 'utils.ts',
  language: 'typescript',
  metadata: {
    extension: '.ts'
  }
}

// import 대상 노드
{
  id: 3,
  identifier: '/full/path/to/utils',
  type: 'file',
  name: 'utils',
  sourceFile: 'utils',
  language: 'typescript',
  metadata: {
    originalImport: './utils',
    isExternal: false
  }
}
```

---

## Test Results

### 테스트 출력 예시

```
📊 Node Statistics:
  Total nodes: 5
  Node types: [ 'file' ]
  Count by type: { file: 5 }

📂 Nodes by Type:

  [file] (5 nodes)
    - {
      id: 5,
      identifier: '/temp/project/src/Calculator',
      name: 'Calculator',
      sourceFile: 'Calculator',
      language: 'typescript',
      metadata: [ 'originalImport', 'isExternal' ]
    }
    - {
      id: 3,
      identifier: '/temp/project/src/utils',
      name: 'utils',
      sourceFile: 'utils',
      language: 'typescript',
      metadata: [ 'originalImport', 'isExternal' ]
    }
    - {
      id: 2,
      identifier: 'src/Calculator.ts',
      name: 'Calculator.ts',
      sourceFile: 'Calculator.ts',
      language: 'typescript',
      metadata: [ 'extension' ]
    }
    - {
      id: 4,
      identifier: 'src/index.ts',
      name: 'index.ts',
      sourceFile: 'index.ts',
      language: 'typescript',
      metadata: [ 'extension' ]
    }
    - {
      id: 1,
      identifier: 'src/utils.ts',
      name: 'utils.ts',
      sourceFile: 'utils.ts',
      language: 'typescript',
      metadata: [ 'extension' ]
    }
```

---

## Use Cases

### 1. 프로젝트 구조 파악

```typescript
const nodeList = await integration.listAllNodes();

console.log(`프로젝트에는 ${nodeList.stats.totalNodes}개의 노드가 있습니다.`);
console.log(`노드 유형: ${nodeList.stats.nodeTypes.join(', ')}`);
```

### 2. 특정 유형 노드 검색

```typescript
// 모든 파일 노드 조회
const files = await integration.listNodesByType('file');

// 실제 소스 파일만 필터링
const sourceFiles = files.filter(f => f.metadata?.extension);

console.log('Source files:', sourceFiles.map(f => f.name));
```

### 3. 노드 메타데이터 분석

```typescript
const nodeList = await integration.listAllNodes();

// import된 외부 모듈 찾기
const externalImports = nodeList.nodes.filter(
  n => n.metadata?.isExternal === true
);

console.log('External imports:', externalImports.map(n => n.name));
```

### 4. 노드 통계 리포트

```typescript
const nodeList = await integration.listAllNodes();

console.log('=== Node Statistics Report ===');
console.log(`Total nodes: ${nodeList.stats.totalNodes}`);
console.log('\nNodes by type:');

for (const [type, count] of Object.entries(nodeList.stats.countByType)) {
  console.log(`  ${type}: ${count}`);
}

console.log('\nTop 10 nodes:');
const sortedNodes = nodeList.nodes
  .sort((a, b) => (b.id || 0) - (a.id || 0))
  .slice(0, 10);

for (const node of sortedNodes) {
  console.log(`  ${node.id}: ${node.type} - ${node.name}`);
}
```

---

## Integration with Other APIs

### 조합 사용 예시

```typescript
// 1. 파일 분석
await integration.analyzeSingleFile('./src/utils.ts');
await integration.analyzeSingleFile('./src/math.ts');
await integration.analyzeSingleFile('./src/index.ts');

// 2. 노드 리스트 조회
const nodeList = await integration.listAllNodes();
console.log('Total nodes:', nodeList.stats.totalNodes);

// 3. 의존성 조회
const deps = await integration.getFileDependencies('./src/index.ts');
console.log('Dependencies:', deps.dependencies.length);

// 4. 통계 조회
const stats = await integration.getProjectStats();
console.log('Project stats:', stats);

// 5. 순환 의존성 확인
const circular = await integration.getCircularDependencies();
console.log('Circular dependencies:', circular.length);
```

---

## Performance

### 성능 특성

- **조회 시간**: O(n), n = 총 노드 수
- **메모리 사용**: 모든 노드를 메모리에 로드
- **데이터베이스 쿼리**: 단일 SELECT 쿼리
- **정렬**: sourceFile, startLine, startColumn 순

### 성능 측정

```
Test: 5 files, 9 nodes
  listAllNodes(): ~2-5ms
  listNodesByType('file'): ~1-3ms
```

---

## Limitations

### 현재 제한사항

1. **노드 유형**: 현재는 'file' 타입만 생성됨
   - 클래스, 함수, 변수 등의 세부 노드는 미구현
   - ParseResult가 imports만 포함하기 때문

2. **메타데이터**: 제한적인 메타데이터만 제공
   - extension: 파일 확장자
   - originalImport: 원본 import 경로
   - isExternal: 외부 의존성 여부

3. **파일 경로**: sourceFile에 확장자가 없을 수 있음
   - import './math' → sourceFile: 'math'

---

## Future Enhancements

### 계획된 개선사항

1. **더 많은 노드 유형**:
   - class: 클래스 정의
   - function: 함수 정의
   - variable: 변수 선언
   - interface: 인터페이스 (TypeScript)
   - type: 타입 별칭 (TypeScript)

2. **풍부한 메타데이터**:
   - 접근 제어자 (public, private, protected)
   - 함수 시그니처
   - 타입 정보
   - JSDoc 주석

3. **필터링 옵션**:
   - 언어별 필터링
   - 소스 파일별 필터링
   - 메타데이터 기반 필터링

4. **페이지네이션**:
   - 대용량 프로젝트를 위한 페이지 단위 조회

---

## Testing

### 테스트 파일

`tests/integration/incremental-analysis.test.ts`

### 테스트 실행

```bash
npm test -- tests/integration/incremental-analysis.test.ts -t "모든 노드 리스트업"
```

### 테스트 결과

```
PASS tests/integration/incremental-analysis.test.ts
  Node Listing API
    ✓ 모든 노드 리스트업 및 유형별 분류 (45 ms)

Tests: 1 passed
```

---

## API Reference Summary

| Method | Description | Return Type |
|--------|-------------|-------------|
| `listAllNodes()` | 모든 노드 조회 및 유형별 그룹화 | `Promise<{nodes, nodesByType, stats}>` |
| `listNodesByType(type)` | 특정 유형 노드만 조회 | `Promise<GraphNode[]>` |

---

## Conclusion

노드 리스트업 API는 Graph DB의 모든 노드를 효율적으로 조회하고 분석할 수 있는 기능을 제공합니다.

**주요 장점**:
- ✅ 간단한 API
- ✅ 유형별 자동 그룹화
- ✅ 통계 정보 제공
- ✅ 빠른 조회 성능

**사용 시나리오**:
- 프로젝트 구조 파악
- 노드 통계 분석
- 의존성 탐색
- 개발 도구 통합

---

**Documentation Date**: 2025-10-02
**API Version**: 1.0.0
**Status**: Production Ready
