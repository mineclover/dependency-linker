# Unknown 노드와 Alias 추론 시스템

**Category**: Core Feature
**Status**: ✅ Production Ready
**Priority**: Medium
**Version**: 3.1.0

---

## 🎯 왜 필요한가?

### 현재 문제점
- **Import된 심볼의 모호성**: `import { User }` 했을 때 User가 무엇인지 즉시 알 수 없음
- **Alias 추적 불가**: `import { User as UserType }` 사용 시 별칭 관계가 그래프에 없음
- **LLM 컨텍스트 구성 어려움**: 어떤 파일들을 읽어야 할지 추론 불가
- **점진적 분석 불가**: 모든 파일을 한번에 분석해야만 의존성 파악 가능

### 해결 방법
**Dual-Node Pattern**으로 Original 노드와 Alias 노드를 명시적으로 분리하고, `aliasOf` edge로 연결합니다.

```typescript
// App.tsx
import { User as UserType } from './types';

// 생성되는 노드:
// 1. types.ts#Unknown:User (original)
// 2. App.tsx#Unknown:UserType (alias)
// Edge: UserType ---aliasOf---> User
```

---

## 💡 핵심 가치

### 1. 점진적 분석 가능
```typescript
// Step 1: App.tsx만 분석
// → Unknown:UserType 노드 생성

// Step 2: types.ts 분석
// → Class:User 노드 생성
// → Unknown:User를 Class:User로 연결 (추론)

// Step 3: 추론 완료
// UserType --aliasOf--> User (Unknown)
//                        ↓ (inferred)
//                      User (Class)
```

### 2. LLM 컨텍스트 자동 구성
```typescript
// "App.tsx를 분석해줘" 요청 시
// 1. App.tsx의 Unknown 노드들 조회
// 2. Unknown → Original 파일 경로 추출
// 3. 해당 파일들의 컨텍스트 문서 자동 수집

const context = await buildLLMContext("App.tsx");
// → types.ts, utils.ts, config.ts 컨텍스트 자동 포함
```

### 3. Alias 관계 명시화
```typescript
// GraphDB에서 쿼리 가능
const aliases = await db.query(`
  SELECT
    alias.name as alias_name,
    original.name as original_name,
    alias.sourceFile as used_in,
    original.sourceFile as defined_in
  FROM edges e
  JOIN nodes alias ON e.from_node_id = alias.id
  JOIN nodes original ON e.to_node_id = original.id
  WHERE e.type = 'aliasOf'
`);

// 결과:
// UserType → User (defined in types.ts)
// PostModel → Post (defined in types.ts)
```

---

## 🏗️ Dual-Node Pattern

### 아키텍처
```
Import Statement: import { User as UserType } from './types'

Target File (types.ts)          Source File (App.tsx)
┌─────────────────────┐         ┌─────────────────────┐
│ Unknown:User        │ <────── │ Unknown:UserType    │
│ (original symbol)   │ aliasOf │ (alias symbol)      │
└─────────────────────┘         └─────────────────────┘
        ▲                               ▲
        │                               │
        │                               │ uses
   (정의 위치)                      (사용 위치)
```

### Node 구조

**Original Unknown Node (타겟 파일)**:
```typescript
{
  identifier: "dependency-linker/src/types.ts#Unknown:User",
  type: "unknown",
  name: "User",
  sourceFile: "src/types.ts",
  metadata: {
    isImported: false,  // 타겟 파일에 정의
    isDefault: false
  }
}
```

**Alias Unknown Node (소스 파일)**:
```typescript
{
  identifier: "dependency-linker/src/App.tsx#Unknown:UserType",
  type: "unknown",
  name: "UserType",
  sourceFile: "src/App.tsx",
  metadata: {
    isImported: true,
    isAlias: true,
    originalName: "User",
    importedFrom: "src/types.ts"
  }
}
```

### Edge 타입

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

---

## 🚀 실전 사용 예제

### 예제 1: Named Import with Alias

**Input**:
```typescript
// App.tsx
import { User as UserType, Post as PostModel } from './types';

const user: UserType = { name: 'Alice' };
```

**생성되는 노드** (4개):
```
1. dependency-linker/src/types.ts#Unknown:User
2. dependency-linker/src/types.ts#Unknown:Post
3. dependency-linker/src/App.tsx#Unknown:UserType
4. dependency-linker/src/App.tsx#Unknown:PostModel
```

**생성되는 엣지**:
```
UserType --aliasOf--> User
PostModel --aliasOf--> Post
App.tsx --uses--> UserType
App.tsx --uses--> PostModel
```

### 예제 2: LLM 컨텍스트 구성

```typescript
import { buildContextForFile } from './context-builder';

// App.tsx 분석을 위한 컨텍스트 수집
const context = await buildContextForFile("src/App.tsx");

console.log(context);
// 출력:
// {
//   targetFile: "src/App.tsx",
//   dependencies: [
//     { file: "src/types.ts", symbols: ["User", "Post"] },
//     { file: "src/utils.ts", symbols: ["formatDate"] },
//   ],
//   totalFiles: 2,
//   totalSymbols: 3
// }
```

### 예제 3: Alias Chain 추적

```typescript
// A.tsx
export { User }

// B.tsx
export { User as UserModel } from './A';

// C.tsx
import { UserModel as UserType } from './B';

// GraphDB 쿼리로 체인 추적
const chain = await db.findAliasChain("UserType");
// → ["UserType", "UserModel", "User"]
```

---

## 📊 구현 세부사항

### FileDependencyAnalyzer.createUnknownSymbolNodes()

```typescript
private async createUnknownSymbolNodes(
  sourceFile: string,
  targetFilePath: string,
  importItems: ImportItem[],
  language: SupportedLanguage,
): Promise<void> {
  for (const item of importItems) {
    // 1. 원본 심볼 Unknown 노드 생성 (타겟 파일)
    const originalNode = await this.database.upsertNode({
      identifier: `${targetFilePath}#Unknown:${item.name}`,
      type: "unknown",
      name: item.name,
      sourceFile: targetFilePath,
      metadata: { isImported: false }
    });

    // 2. alias가 있으면 별칭 노드 생성 (소스 파일)
    if (item.alias) {
      const aliasNode = await this.database.upsertNode({
        identifier: `${sourceFile}#Unknown:${item.alias}`,
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
        label: `${item.alias} is alias of ${item.name}`
      });
    }
  }
}
```

---

## 🔍 쿼리 예제

### 모든 Alias 조회
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

### Alias를 사용하는 파일 찾기
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

## 📈 통계 (현재 프로젝트)

```
Total Unknown Nodes: 156
  - With Alias: 24 (15%)
  - Without Alias: 132 (85%)

Alias Relationships (aliasOf): 24
Uses Relationships: 156
```

---

## 🚀 향후 개선 사항

### 1. Unknown → Actual Node 추론
```typescript
// 타겟 파일 분석 완료 후
// Unknown:User → Class:User 자동 연결
await inferenceEngine.resolveUnknownNodes();
```

### 2. Alias Chain Resolution
```typescript
// A → B → C 체인 자동 해소
const resolved = await resolveAliasChain("UserType");
// → "User" (최종 원본 심볼)
```

### 3. Cross-File Alias Tracking
```typescript
// 여러 파일에서 같은 심볼을 다른 alias로 사용
// User → UserType (App.tsx)
// User → UserModel (Admin.tsx)
const usageMap = await trackCrossFileAliases("User");
```

---

## 🐛 Known Issues

### Issue 1: Namespace Import
**Description**: `import * as React from 'react'`는 별칭이 아니지만 현재는 alias로 처리됨

**Status**: ✅ 스킵 처리 구현됨 (`isNamespace` 체크)

---

## 🎓 핵심 개념 정리

### Unknown 노드의 3가지 역할
1. **임시 플레이스홀더**: 아직 분석되지 않은 심볼의 위치 표시
2. **의존성 추적**: Import 관계를 그래프로 표현
3. **추론 대상**: 나중에 실제 타입으로 연결될 노드

### Dual-Node Pattern의 장점
- **명시적 분리**: Original과 Alias가 명확히 구분
- **추적 가능**: aliasOf edge로 관계 명시
- **확장 가능**: 여러 alias를 가진 심볼도 처리 가능

---

## 🔗 관련 문서

- **상세 설계**: [docs/unknown-node-inference.md](../../docs/unknown-node-inference.md)
- **타입 시스템**: [docs/type-system.md](../../docs/type-system.md)
- **Edge Type Registry**: [src/database/inference/EdgeTypeRegistry.ts](../../src/database/inference/EdgeTypeRegistry.ts)
- **FileDependencyAnalyzer**: [src/database/services/FileDependencyAnalyzer.ts](../../src/database/services/FileDependencyAnalyzer.ts)

---

**Last Updated**: 2025-10-05
**Next Review**: 2025-10-12
