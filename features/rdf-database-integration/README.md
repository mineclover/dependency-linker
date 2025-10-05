# RDF-Database Integration

**Category**: Integration Feature
**Status**: 🚧 In Development
**Priority**: Medium
**Target Version**: 3.1.2

---

## 🎯 목적

RDF 주소를 GraphDatabase에 영구 저장하고, RDF 주소 기반 고급 쿼리 기능을 제공하여 완전한 RDF 주소 관리 시스템을 구축합니다.

---

## 💡 핵심 기능

### 1. RDF 주소 저장
```typescript
// RDF 주소를 데이터베이스에 저장
await db.storeRDFAddress({
  rdfAddress: "dependency-linker/src/parser.ts#Method:parse",
  projectName: "dependency-linker",
  filePath: "src/parser.ts",
  nodeType: "Method",
  symbolName: "parse",
  metadata: {
    lineNumber: 67,
    columnNumber: 4,
    accessModifier: "public",
    isStatic: false
  }
});
```

### 2. RDF 주소 기반 쿼리
```typescript
// RDF 주소로 노드 검색
const nodes = await db.searchByRDFAddress("dependency-linker/src/parser.ts#Method:parse");

// 프로젝트별 RDF 주소 조회
const addresses = await db.getRDFAddressesByProject("dependency-linker");

// NodeType별 RDF 주소 조회
const methods = await db.getRDFAddressesByNodeType("Method");
```

### 3. RDF 주소 관계 관리
```typescript
// RDF 주소 간 관계 저장
await db.storeRDFRelationship({
  source: "dependency-linker/src/parser.ts#Class:TypeScriptParser",
  target: "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse",
  relationshipType: "contains"
});
```

---

## 🏗️ 구현 계획

### Phase 1: 데이터베이스 스키마 확장 (1주)
- [ ] RDF 주소 테이블 생성
- [ ] RDF 관계 테이블 생성
- [ ] 인덱스 최적화
- [ ] 마이그레이션 스크립트

### Phase 2: RDF API 구현 (1주)
- [ ] `storeRDFAddress()` 구현
- [ ] `searchByRDFAddress()` 구현
- [ ] `getRDFAddressesByProject()` 구현
- [ ] `getRDFAddressesByNodeType()` 구현

### Phase 3: 고급 쿼리 기능 (1주)
- [ ] RDF 주소 기반 관계 쿼리
- [ ] 통계 및 분석 쿼리
- [ ] 성능 최적화
- [ ] 테스트 및 검증

---

## 📊 데이터베이스 스키마

### RDF Addresses 테이블
```sql
CREATE TABLE rdf_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdf_address TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  node_type TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  namespace TEXT,
  local_name TEXT,
  line_number INTEGER,
  column_number INTEGER,
  access_modifier TEXT,
  is_static BOOLEAN DEFAULT FALSE,
  is_async BOOLEAN DEFAULT FALSE,
  is_abstract BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### RDF Relationships 테이블
```sql
CREATE TABLE rdf_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_rdf_address TEXT NOT NULL,
  target_rdf_address TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_rdf_address) REFERENCES rdf_addresses(rdf_address),
  FOREIGN KEY (target_rdf_address) REFERENCES rdf_addresses(rdf_address)
);
```

---

## 🚀 사용 시나리오

### 시나리오 1: 심볼 의존성 추적
```bash
# 특정 심볼을 사용하는 모든 곳 찾기
npm run cli -- rdf find-references "dependency-linker/src/parser.ts#Method:parse"

# 출력:
# References to parse:
# 1. dependency-linker/src/graph.ts#Method:analyze (calls)
# 2. dependency-linker/src/cli.ts#Function:main (instantiates)
```

### 시나리오 2: 프로젝트 구조 분석
```bash
# 프로젝트의 클래스 구조 분석
npm run cli -- rdf analyze-structure --project "dependency-linker" --type "Class"

# 출력:
# Class Hierarchy:
# - TypeScriptParser
#   - parse() method
#   - validate() method
# - DependencyGraph
#   - addNode() method
#   - addEdge() method
```

### 시나리오 3: 네임스페이스 간 의존성
```bash
# 네임스페이스 간 RDF 주소 의존성 분석
npm run cli -- rdf cross-namespace --source "source" --target "tests"

# 출력:
# Cross-namespace RDF dependencies:
# source → tests: 15 dependencies
# tests → source: 8 dependencies
```

---

## 📈 성능 최적화

### 인덱스 전략
```sql
-- RDF 주소 검색 최적화
CREATE INDEX idx_rdf_addresses_rdf_address ON rdf_addresses(rdf_address);
CREATE INDEX idx_rdf_addresses_project ON rdf_addresses(project_name);
CREATE INDEX idx_rdf_addresses_file ON rdf_addresses(file_path);
CREATE INDEX idx_rdf_addresses_node_type ON rdf_addresses(node_type);
CREATE INDEX idx_rdf_addresses_symbol ON rdf_addresses(symbol_name);
```

### 캐싱 전략
- **RDF 주소 파싱 캐시**: 자주 사용되는 RDF 주소 파싱 결과 캐시
- **쿼리 결과 캐시**: 반복적인 쿼리 결과 캐시
- **통계 캐시**: 프로젝트별 통계 정보 캐시

---

## 🔗 관련 문서

- **RDF Addressing**: [../rdf-addressing/README.md](../rdf-addressing/README.md)
- **Database Schema**: [../../src/database/schema.sql](../../src/database/schema.sql)
- **GraphDatabase**: [../../src/database/GraphDatabase.ts](../../src/database/GraphDatabase.ts)

---

**Last Updated**: 2025-10-05
**Next Review**: 2025-10-12
