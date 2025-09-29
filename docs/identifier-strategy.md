# Identifier 생성 전략

## 🎯 개요

GraphDatabase의 노드는 **파일 경로를 포함한 고유 identifier**를 사용하여 중복 없이 저장됩니다.

## 🔑 Identifier 형식

### 기본 구조
```
/file/path::type::name
```

### 예시

#### 1. **파일 노드**
```typescript
// 파일: /src/App.tsx
identifier: "/src/App.tsx::file::App.tsx"
```

#### 2. **Export 노드** (여러 파일에서 같은 이름 가능)
```typescript
// /src/utils/helpers.ts에서 export
identifier: "/src/utils/helpers.ts::export::calculate"

// /src/lib/math.ts에서도 export (같은 이름이지만 다른 identifier)
identifier: "/src/lib/math.ts::export::calculate"
```

#### 3. **라이브러리 노드**
```typescript
// 외부 라이브러리는 library:: 접두사
identifier: "library::react"
identifier: "library::@mui/material"
```

#### 4. **계층적 노드** (클래스, 메서드 등)
```typescript
// 클래스
identifier: "/src/User.ts::class::User"

// 메서드 (parent scope 포함)
identifier: "/src/User.ts::User::method::login"

// 함수
identifier: "/src/utils/helpers.ts::function::formatDate"
```

## ✅ 장점

### 1. **고유성 보장**
```typescript
// ❌ 이전 방식: identifier 충돌 발생
{
  identifier: "calculate",  // 충돌!
  source_file: "/src/utils/helpers.ts"
}
{
  identifier: "calculate",  // 충돌!
  source_file: "/src/lib/math.ts"
}

// ✅ 새로운 방식: 파일 경로 포함으로 고유성 보장
{
  identifier: "/src/utils/helpers.ts::export::calculate",
  source_file: "/src/utils/helpers.ts"
}
{
  identifier: "/src/lib/math.ts::export::calculate",
  source_file: "/src/lib/math.ts"
}
```

### 2. **SQL UNIQUE 제약 유지**
```sql
CREATE TABLE nodes (
  identifier TEXT NOT NULL UNIQUE,  -- ✅ UNIQUE 제약 가능
  -- ...
);
```

### 3. **파일 기반 정리 메커니즘 유지**
```typescript
// 파일 재분석 시 기존 의존성 자동 정리
await analyzer.analyzeFile('/src/App.tsx', newImportData);

// SQL 내부:
// 1. /src/App.tsx의 file 노드 찾기
// 2. 해당 노드의 outgoing edges 삭제
// 3. 새로운 의존성 생성
```

### 4. **Export 기반 의존성 지원 준비**
```typescript
// Export 노드도 같은 전략으로 관리 가능
const exportIdentifier = generateExportIdentifier(
  '/src/utils/helpers.ts',
  'calculate'
);
// → "/src/utils/helpers.ts::export::calculate"

// Edge: file --[exports]--> export 노드
await database.createRelationship({
  fromNodeId: fileNode.id,
  toNodeId: exportNode.id,
  type: 'exports',
  metadata: { exportType: 'named' }
});
```

## 🛠️ 구현

### Identifier 생성 유틸리티

```typescript
import {
  generateFileIdentifier,
  generateExportIdentifier,
  generateLibraryIdentifier,
  generateClassIdentifier,
  generateMethodIdentifier
} from './utils/IdentifierGenerator';

// 파일 노드
const fileId = generateFileIdentifier('/src/App.tsx', projectRoot);
// → "/src/App.tsx::file::App.tsx"

// Export 노드
const exportId = generateExportIdentifier('/src/utils/helpers.ts', 'calculate');
// → "/src/utils/helpers.ts::export::calculate"

// 라이브러리 노드
const libId = generateLibraryIdentifier('react');
// → "library::react"

// 클래스 노드
const classId = generateClassIdentifier('/src/User.ts', 'User');
// → "/src/User.ts::class::User"

// 메서드 노드
const methodId = generateMethodIdentifier('/src/User.ts', 'User', 'login');
// → "/src/User.ts::User::method::login"
```

### Identifier 파싱

```typescript
import { parseIdentifier } from './utils/IdentifierGenerator';

const parsed = parseIdentifier("/src/utils/helpers.ts::export::calculate");
// {
//   filePath: "/src/utils/helpers.ts",
//   nodeType: "export",
//   name: "calculate",
//   isLibrary: false
// }

const libParsed = parseIdentifier("library::react");
// {
//   nodeType: "library",
//   name: "react",
//   isLibrary: true
// }
```

## 📊 SQL 구조

### nodes 테이블
```sql
CREATE TABLE nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL UNIQUE,    -- 파일 경로 포함 고유 식별자
  type TEXT NOT NULL,                 -- file, export, class, method 등
  name TEXT NOT NULL,                 -- 표시 이름
  source_file TEXT NOT NULL,          -- 소속 파일
  -- ...
);
```

### 인덱스
```sql
CREATE INDEX idx_nodes_identifier ON nodes (identifier);  -- 빠른 조회
CREATE INDEX idx_nodes_source_file ON nodes (source_file); -- 파일별 조회
CREATE INDEX idx_nodes_type ON nodes (type);               -- 타입별 조회
```

## 🔍 쿼리 예시

### 1. 특정 파일의 모든 export 조회
```sql
SELECT * FROM nodes
WHERE source_file = '/src/utils/helpers.ts'
  AND type = 'export';
```

### 2. 같은 이름의 export를 가진 모든 파일 찾기
```sql
SELECT
  name,
  source_file,
  identifier
FROM nodes
WHERE type = 'export'
  AND name = 'calculate';
```

### 3. 파일 의존성 그래프
```sql
SELECT
  n1.source_file as from_file,
  n2.source_file as to_file,
  e.type as relationship
FROM edges e
JOIN nodes n1 ON e.start_node_id = n1.id
JOIN nodes n2 ON e.end_node_id = n2.id
WHERE n1.source_file = '/src/App.tsx'
  AND e.type IN ('imports', 'depends_on');
```

## 🎨 Edge Type별 정리

### Import 의존성 정리
```typescript
// Import만 재분석
await analyzer.cleanupExistingDependencies(
  '/src/App.tsx',
  ['imports', 'depends_on']
);
```

### Export 정리 (향후 구현)
```typescript
// Export만 재분석
await analyzer.cleanupExistingDependencies(
  '/src/utils/helpers.ts',
  ['exports', 'provides']
);
```

## 🧪 테스트 결과

✅ **13/13 테스트 통과** (100% 성공률)

- 파일 기반 의존성 분석
- 기존 의존성 정리
- 미싱 링크 감지
- 의존성 트리 생성
- 통계 제공

## 📝 마이그레이션 가이드

### 기존 코드에서 변경 사항

#### Before (문제 발생)
```typescript
// ❌ identifier 충돌 가능
const node = {
  identifier: exportName,  // 충돌 위험!
  type: 'export',
  name: exportName,
  source_file: filePath
};
```

#### After (고유성 보장)
```typescript
// ✅ 파일 경로 포함으로 고유성 보장
import { generateExportIdentifier } from './utils/IdentifierGenerator';

const node = {
  identifier: generateExportIdentifier(filePath, exportName),
  type: 'export',
  name: exportName,
  source_file: filePath
};
```

## 🚀 향후 확장

### Export 기반 의존성 분석
```typescript
interface ExportDeclaration {
  name: string;
  exportType: 'named' | 'default' | 'namespace';
  location: { line: number; column: number };
}

// Export 분석 추가
await analyzer.analyzeFile(
  '/src/utils/helpers.ts',
  {
    importSources: [...],
    exportDeclarations: [
      { name: 'calculate', exportType: 'named', location: {...} }
    ]
  }
);
```

### Symbol 참조 추적
```typescript
// 클래스, 메서드 등 symbol 레벨 의존성
const methodId = generateMethodIdentifier('/src/User.ts', 'User', 'login');
// → "/src/User.ts::User::method::login"
```

## 📌 핵심 원칙

1. **파일 경로를 identifier에 포함** → 고유성 보장
2. **UNIQUE 제약 유지** → SQL 레벨 무결성
3. **파일 기반 정리** → 재분석 시 깔끔한 업데이트
4. **Edge type 구분** → 선택적 의존성 관리
5. **확장 가능** → Export, Symbol 레벨 분석 준비