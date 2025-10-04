# Unknown 노드와 Alias 추론 시스템

**Category**: Core Feature
**Status**: ✅ Production Ready
**Version**: 3.1.0

---

## 📋 Overview

Unknown 노드 시스템은 import된 심볼이 아직 분석되지 않았거나 외부 라이브러리인 경우를 처리합니다. Alias 추론을 통해 import alias 관계를 명시적으로 추적합니다.

### Key Concepts

**Unknown Node**:
- Import된 심볼의 임시 노드
- 실제 정의 파일 분석 전 생성
- 추후 실제 노드로 추론/연결

**Dual-Node Pattern**:
- Original 노드: 타겟 파일에 정의된 심볼
- Alias 노드: 소스 파일에서 사용하는 별칭
- `aliasOf` edge로 연결

**Alias Inference**:
- Import alias 관계를 edge로 표현
- 그래프 기반 추론 가능
- LLM 컨텍스트 자동 구성

---

## 🎯 Use Cases

### Use Case 1: Import Alias 처리

**코드 예시**:
```typescript
// types.ts
export class User {
  name: string;
}

// App.tsx
import { User as UserType } from './types';

const user: UserType = { name: 'Alice' };
```

**생성되는 노드**:
```
1. dependency-linker/src/types.ts#Unknown:User (original)
2. dependency-linker/src/App.tsx#Unknown:UserType (alias)

Edge: UserType ---aliasOf---> User
```

---

## 🏗️ Architecture

### Dual-Node Pattern

```
Import Statement: import { User as UserType } from './types'

Target File (types.ts)          Source File (App.tsx)
┌─────────────────────┐         ┌─────────────────────┐
│ Unknown:User        │ <------ │ Unknown:UserType    │
│ (original symbol)   │ aliasOf │ (alias symbol)      │
└─────────────────────┘         └─────────────────────┘
        ▲                               ▲
        │                               │
        │                               │ uses
   (정의 위치)                      (사용 위치)
```

### Edge Types

**aliasOf Edge**:
```typescript
{
  type: "aliasOf",
  description: "Symbol is an alias of another symbol (import alias)",
  parentType: "references",
  isDirected: true,
  isTransitive: false,
  isInheritable: false,
  priority: 5
}
```

**uses Edge**:
```typescript
{
  source: "dependency-linker/src/App.tsx#File:App.tsx",
  target: "dependency-linker/src/App.tsx#Unknown:UserType",
  type: "uses",
  label: "uses UserType"
}
```

---

## 📊 Node Structure

### Original Unknown Node (Target File)

```typescript
{
  identifier: "dependency-linker/src/types.ts#Unknown:User",
  type: "unknown",
  name: "User",
  sourceFile: "src/types.ts",
  language: "typescript",
  metadata: {
    isImported: false,  // 타겟 파일에 정의
    isDefault: false
  }
}
```

### Alias Unknown Node (Source File)

```typescript
{
  identifier: "dependency-linker/src/App.tsx#Unknown:UserType",
  type: "unknown",
  name: "UserType",
  sourceFile: "src/App.tsx",
  language: "typescript",
  metadata: {
    isImported: true,
    isAlias: true,
    originalName: "User",
    importedFrom: "src/types.ts"
  }
}
```

---

## 🔧 Implementation

### FileDependencyAnalyzer.createUnknownSymbolNodes()

```typescript
private async createUnknownSymbolNodes(
  sourceFile: string,
  targetFilePath: string,
  importItems: ImportItem[],
  language: SupportedLanguage,
): Promise<void> {
  for (const item of importItems) {
    // 1. 원본 심볼 Unknown 노드 생성 (타겟 파일에 위치)
    const originalIdentifier = this.nodeIdentifier.createIdentifier(
      "unknown",
      item.name,
      { sourceFile: targetFilePath, ... }
    );

    const originalNode = await this.database.upsertNode({
      identifier: originalIdentifier,
      type: "unknown",
      name: item.name,
      sourceFile: targetFilePath,
      metadata: { isImported: false }
    });

    // 2. alias가 있으면 별칭 심볼 Unknown 노드 생성 (소스 파일에 위치)
    if (item.alias) {
      const aliasIdentifier = this.nodeIdentifier.createIdentifier(
        "unknown",
        item.alias,
        { sourceFile: sourceFile, ... }
      );

      const aliasNode = await this.database.upsertNode({
        identifier: aliasIdentifier,
        type: "unknown",
        name: item.alias,
        sourceFile: sourceFile,
        metadata: {
          isImported: true,
          isAlias: true,
          originalName: item.name,
          importedFrom: targetFilePath
        }
      });

      // 3. aliasOf 관계 생성
      await this.database.upsertRelationship({
        fromNodeId: aliasNode.id,
        toNodeId: originalNode.id,
        type: "aliasOf",
        label: `${item.alias} is alias of ${item.name}`,
        metadata: { isInferred: false }
      });

      // 4. uses 관계는 alias 노드로
      usedSymbolId = aliasNode.id;
    }
  }
}
```

---

## 🎯 Examples

### Example 1: Named Import with Alias

**Input**:
```typescript
import { User as UserType, Post as PostModel } from './types';
```

**Generated Nodes** (4 nodes):
```
1. dependency-linker/src/types.ts#Unknown:User
2. dependency-linker/src/types.ts#Unknown:Post
3. dependency-linker/src/App.tsx#Unknown:UserType
4. dependency-linker/src/App.tsx#Unknown:PostModel
```

**Generated Edges**:
```
UserType --aliasOf--> User
PostModel --aliasOf--> Post
App.tsx --uses--> UserType
App.tsx --uses--> PostModel
```

### Example 2: Default Import (No Alias)

**Input**:
```typescript
import React from 'react';
```

**Generated Nodes** (1 node):
```
1. dependency-linker/src/App.tsx#Unknown:React
```

**No aliasOf edge**: 기본 import는 alias가 아님

---

## 🔍 Query Examples

### Find All Aliases

```sql
SELECT
  n1.name as alias_name,
  n1.sourceFile as used_in,
  n2.name as original_name,
  n2.sourceFile as defined_in
FROM edges e
JOIN nodes n1 ON e.from_node_id = n1.id
JOIN nodes n2 ON e.to_node_id = n2.id
WHERE e.type = 'aliasOf';
```

### Find What Uses an Alias

```sql
SELECT
  n1.sourceFile as file,
  n2.name as alias_name,
  n3.name as original_name
FROM edges e1
JOIN nodes n1 ON e1.from_node_id = n1.id
JOIN nodes n2 ON e1.to_node_id = n2.id
JOIN edges e2 ON n2.id = e2.from_node_id
JOIN nodes n3 ON e2.to_node_id = n3.id
WHERE e1.type = 'uses'
  AND e2.type = 'aliasOf';
```

---

## 🚀 Future Enhancements

### 1. Alias Chain Resolution

```typescript
// A.tsx: export { User }
// B.tsx: export { User as UserModel } from './A';
// C.tsx: import { UserModel as UserType } from './B';

// Resolve: UserType → UserModel → User
```

### 2. Unknown to Actual Node Inference

```typescript
// 타겟 파일 분석 완료 후
// Unknown:User → Class:User 추론
await inferenceEngine.resolveUnknownNodes();
```

### 3. Cross-File Alias Tracking

```typescript
// 여러 파일에서 같은 심볼을 다른 alias로 사용
// User → UserType (App.tsx)
// User → UserModel (Admin.tsx)
```

---

## 📊 Statistics

### Current Project

```
Total Unknown Nodes: 156
  - With Alias: 24 (15%)
  - Without Alias: 132 (85%)

Alias Relationships (aliasOf): 24
Uses Relationships: 156
```

---

## 🐛 Known Issues

### Issue 1: Namespace Import

**Description**: Namespace import는 별칭이 아니지만 현재는 alias로 처리됨

**Example**:
```typescript
import * as React from 'react';
// React는 alias가 아닌 namespace
```

**Status**: 스킵 처리 구현됨 (`isNamespace` 체크)

---

## 📚 Related Documentation

- [RDF Addressing](./rdf-addressing.md) - RDF 기반 노드 식별
- [Edge Type Registry](../../src/database/inference/EdgeTypeRegistry.ts) - Edge type 정의
- [FileDependencyAnalyzer](../../src/database/services/FileDependencyAnalyzer.ts) - 구현 코드
- [Type System](./type-system.md) - Node와 Edge 타입 시스템

---

**Last Updated**: 2025-10-04
**Version**: 3.1.0
