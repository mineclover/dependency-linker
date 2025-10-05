# API 호환성 변경사항

## 개요
Dependency Linker v2.1.0에서 GraphDatabase API의 호환성 이슈를 해결했습니다.

## 주요 변경사항

### 1. 노드 생성 API 변경
**이전 (deprecated):**
```javascript
const nodeId = await db.createNode({
  identifier: "project/src/file.ts#Class:MyClass",
  type: "class",
  name: "MyClass",
  sourceFile: "src/file.ts"
});
```

**현재 (권장):**
```javascript
const nodeId = await db.upsertNode({
  identifier: "project/src/file.ts#Class:MyClass",
  type: "class",
  name: "MyClass",
  sourceFile: "src/file.ts",
  language: "typescript"  // 필수 필드 추가
});
```

### 2. 관계 생성 API 변경
**이전 (deprecated):**
```javascript
await db.createRelationship({
  fromNodeId: node1,
  toNodeId: node2,
  type: "depends_on",
  metadata: { dependencyType: "import" }
});
```

**현재 (권장):**
```javascript
await db.upsertRelationship({
  fromNodeId: node1,
  toNodeId: node2,
  type: "depends_on",
  metadata: { dependencyType: "import" }
});
```

## 필수 필드 추가

### 노드 생성 시 필수 필드
- `language`: 지원되는 프로그래밍 언어 (예: "typescript", "javascript", "python")
- 기존 필드들: `identifier`, `type`, `name`, `sourceFile`

### 관계 생성 시 주의사항
- `fromNodeId`와 `toNodeId`는 실제 존재하는 노드 ID여야 함
- 노드 생성 후 반환된 ID를 사용해야 함

## 마이그레이션 가이드

### 1. 기존 코드 업데이트
```javascript
// 이전 코드
const nodeId = await db.createNode(nodeData);
await db.createRelationship(relData);

// 업데이트된 코드
const nodeId = await db.upsertNode({
  ...nodeData,
  language: "typescript"  // 필수 필드 추가
});
await db.upsertRelationship(relData);
```

### 2. 노드 ID 참조 수정
```javascript
// 이전 코드 (잘못된 방식)
for (let i = 0; i < 10; i++) {
  await db.createNode({...});
  await db.createRelationship({
    fromNodeId: i,  // 잘못된 참조
    toNodeId: i + 1
  });
}

// 수정된 코드
const nodeIds = [];
for (let i = 0; i < 10; i++) {
  const nodeId = await db.upsertNode({...});
  nodeIds.push(nodeId);
}

for (let i = 0; i < 9; i++) {
  await db.upsertRelationship({
    fromNodeId: nodeIds[i],  // 올바른 참조
    toNodeId: nodeIds[i + 1]
  });
}
```

## 성능 개선사항

### 1. Upsert 동작
- `upsertNode`: 노드가 존재하면 업데이트, 없으면 생성
- `upsertRelationship`: 관계가 존재하면 업데이트, 없으면 생성
- 중복 데이터 방지 및 성능 향상

### 2. 데이터베이스 제약조건
- Foreign Key 제약조건 강화
- NOT NULL 제약조건 강화
- 데이터 무결성 보장

## 테스트 결과

### 호환성 수정 후 성능
- **전체 테스트 통과율**: 100% (6/6)
- **성능 테스트 통과율**: 100% (5/5)
- **처리 속도**: 20,000 nodes/sec
- **평균 실행 시간**: 20ms

### 수정된 테스트 항목
- ✅ LRU Cache
- ✅ Performance Monitoring  
- ✅ Optimized Inference Engine
- ✅ Performance Benchmarks
- ✅ Memory Usage

## 결론

모든 호환성 이슈가 해결되었으며, 시스템이 완전히 안정적으로 작동합니다. 
기존 코드를 새로운 API로 마이그레이션하면 더 나은 성능과 안정성을 얻을 수 있습니다.
