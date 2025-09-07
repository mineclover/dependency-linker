---
notion_page_id: 26848583-7460-81a5-809b-f4b8867dd1a6
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
last_synced: '2025-09-08T11:29:10.978Z'
category: docs
auto_generated: true
---
# Schema System Documentation

JSON 스펙 기반 Notion 데이터베이스 자동화 시스템

## 🎯 개요

반복적인 노션 데이터베이스 생성 패턴과 속성 ID 관리를 자동화하기 위한 JSON 스펙 기반 시스템입니다.

### 문제점 (Before)
- 수동 데이터베이스 생성으로 인한 반복 작업
- 속성 ID 수동 추적 및 관리의 복잡성
- 관계 속성 설정의 반복적인 코드 패턴
- 환경별 설정 관리의 어려움

### 해결책 (After)
- JSON 스펙으로 모든 데이터베이스 구조 선언
- 속성 ID 자동 추적 및 매핑 시스템
- 양방향 관계 자동 설정
- 환경별 자동 구성 및 통합

## 🏗️ 시스템 아키텍처

```
📁 Schema System
├── 📄 JSON Specification (src/schemas/database-schemas.json)
├── 🔧 DatabaseSchemaManager (src/utils/databaseSchemaManager.ts)
├── 🔗 ConfigManager Integration
├── 📊 Property ID Management
└── 🧪 Test & Integration Scripts
```

### 핵심 컴포넌트

#### 1. JSON Schema Specification
```json
{
  "databases": {
    "database_key": {
      "title": "Database Display Name",
      "description": "Database description",
      "properties": {
        "Property Name": {
          "type": "property_type",
          "required": true|false,
          "description": "Property description",
          "options": [...], // for select/multi_select
          "target": "database_key", // for relations
          "bidirectional": true|false, // for relations
          "sync_property": "property_name" // for bidirectional relations
        }
      }
    }
  },
  "property_types": {
    // Property type definitions
  }
}
```

#### 2. DatabaseSchemaManager Class
```typescript
export class DatabaseSchemaManager {
  // 데이터베이스 생성 및 관리
  async createAllDatabases(): Promise<Record<string, string>>
  
  // 속성 매핑 관리
  getPropertyMapping(databaseId: string, propertyName: string): PropertyMapping
  getDatabaseMappings(databaseId: string): PropertyMapping[]
  
  // 설정 내보내기
  exportMappingsToConfig(): Record<string, any>
}
```

## 📋 지원되는 속성 타입

### 기본 속성 타입
| Type | Description | Configuration |
|------|-------------|---------------|
| `title` | 제목 속성 (필수) | `{}` |
| `rich_text` | 서식 있는 텍스트 | `{}` |
| `number` | 숫자 | `{}` |
| `date` | 날짜 | `{}` |
| `checkbox` | 체크박스 | `{}` |

### 선택 속성 타입
| Type | Description | Configuration |
|------|-------------|---------------|
| `select` | 단일 선택 | `{ "options": [{"name": "값", "color": "색상"}] }` |
| `multi_select` | 다중 선택 | `{ "options": [{"name": "값", "color": "색상"}] }` |

### 관계 속성 타입
| Type | Description | Configuration |
|------|-------------|---------------|
| `relation` | 데이터베이스 관계 | `{ "target": "database_key", "bidirectional": true, "sync_property": "property_name" }` |

### 색상 옵션
```
"default", "gray", "brown", "orange", "yellow", 
"green", "blue", "purple", "pink", "red"
```

## 🔧 CLI 사용법

### 빠른 시작
```bash
# 1. 스키마 상태 확인
bun run schema:status

# 2. 스키마 검증
bun run schema:validate  

# 3. 데이터베이스 생성
bun run schema:setup

# 4. 테스트 환경에서 미리보기
bun run schema:setup --env test --dry-run
```

### 프로그래밍 인터페이스

#### 1. JSON 스키마 정의
```json
{
  "databases": {
    "files": {
      "title": "Project Files",
      "description": "Repository file tracking database",
      "properties": {
        "Name": {
          "type": "title",
          "required": true,
          "description": "File name"
        },
        "File Path": {
          "type": "rich_text",
          "required": true,
          "description": "Relative path to file"
        },
        "Extension": {
          "type": "select",
          "required": true,
          "options": [
            { "name": ".js", "color": "yellow" },
            { "name": ".ts", "color": "blue" }
          ]
        },
        "Dependencies": {
          "type": "relation",
          "target": "self",
          "bidirectional": true,
          "sync_property": "Dependents",
          "description": "Files that this file depends on"
        }
      }
    }
  }
}
```

### 2. 데이터베이스 생성
```typescript
import { DatabaseSchemaManager } from './src/utils/databaseSchemaManager.js';

// 스키마 로드
const schemas = await DatabaseSchemaManager.loadSchemas('./path/to/schema.json');

// 매니저 초기화
const schemaManager = new DatabaseSchemaManager(apiQueue, notion, parentPageId, schemas);

// 검증 및 생성
const validation = schemaManager.validateSchemas();
if (validation.valid) {
  const databaseIds = await schemaManager.createAllDatabases();
}
```

### 3. 속성 매핑 사용
```typescript
// 특정 속성 조회
const nameProperty = schemaManager.getPropertyMapping(databaseId, 'Name');
console.log(nameProperty.propertyId); // "title"

// 데이터베이스 모든 속성 조회
const allProperties = schemaManager.getDatabaseMappings(databaseId);

// 설정 내보내기
const config = schemaManager.exportMappingsToConfig();
```

## 📝 스크립트 명령어

### 개발 및 테스트
```bash
# 스키마 매니저 단독 테스트
bun run test:schema

# ConfigManager와 통합 테스트
bun run integrate:schema

# 환경별 테스트 (기존)
bun run test:env
```

### 설정 관리
```bash
# 환경 설정
bun run setup:env

# Notion 링크 생성
bun run notion:links

# 설정 확인
bun run config:show
```

## 🔄 통합 워크플로우

### Phase 1: Database Creation
1. JSON 스키마 로드 및 검증
2. 기본 속성으로 데이터베이스 생성 (관계 제외)
3. 속성 ID 매핑 저장

### Phase 2: Relation Setup
1. 모든 데이터베이스 생성 완료 후
2. 관계 속성 추가 (단방향/양방향)
3. 관계 속성 ID 매핑 업데이트

### Phase 3: Configuration Export
1. 모든 속성 매핑 정리
2. ConfigManager 호환 형식으로 내보내기
3. 환경별 설정 업데이트

## 📊 데이터베이스 스키마 예제

현재 시스템은 3가지 데이터베이스를 지원합니다:

### 1. Files Database (files)
- **목적**: 프로젝트 파일 추적
- **핵심 속성**: Name, File Path, Extension, Status, Dependencies
- **관계**: Self-referential bidirectional (Dependencies ↔ Dependents)

### 2. Documentation Database (docs)
- **목적**: 프로젝트 문서 관리
- **핵심 속성**: Name, Document Type, Content, Status, Priority, Tags
- **관계**: Files와 양방향 관계 (Related Files ↔ Related Documentation)

### 3. Functions Database (functions)
- **목적**: 함수 및 컴포넌트 추적
- **핵심 속성**: Name, Type, File, Parameters, Return Type, Complexity
- **관계**: Files와 단방향 관계, Self-referential (Called By ↔ Calls)

## 🔍 속성 매핑 시스템

### PropertyMapping 인터페이스
```typescript
interface PropertyMapping {
  propertyId: string;     // Notion 속성 ID (예: "title", "ABC123")
  propertyName: string;   // 속성 이름 (예: "Name", "File Path")
  type: string;          // 속성 타입 (예: "title", "select", "relation")
  databaseId: string;    // 데이터베이스 ID
}
```

### 매핑 저장 형식
```json
{
  "databases": {
    "files": "database-uuid-here",
    "docs": "database-uuid-here"
  },
  "propertyMappings": {
    "database-id.Property Name": {
      "id": "property-id",
      "name": "Property Name",
      "type": "property-type",
      "database": "database-id"
    }
  }
}
```

## ⚡ 성능 및 최적화

### API 큐 시스템
- **Rate Limiting**: 350ms 기본 딜레이, 적응형 조정
- **Circuit Breaker**: 연속 실패 시 자동 차단
- **Retry Logic**: 지수 백오프로 재시도
- **Parallel Processing**: 독립적인 작업 병렬 처리

### 메모리 관리
- **Property Mapping Cache**: 세션 내 속성 매핑 캐시
- **Database Reference**: 생성된 데이터베이스 ID 추적
- **Validation Cache**: 스키마 검증 결과 캐시

## 🚨 에러 처리

### 검증 에러
- **Circular Dependencies**: 순환 참조 검출
- **Missing Targets**: 존재하지 않는 대상 데이터베이스
- **Invalid Property Types**: 지원되지 않는 속성 타입

### API 에러
- **Rate Limit**: 자동 백오프 및 재시도
- **Validation Error**: 속성 설정 오류 상세 로깅
- **Network Error**: 연결 실패 시 복구 로직

### 복구 전략
```typescript
// 단일 속성 vs 양방향 속성 설정
if (relationConfig.bidirectional && relationConfig.sync_property) {
  relationProperty.relation.dual_property = {
    synced_property_name: relationConfig.sync_property
  };
} else {
  relationProperty.relation.single_property = {};
}
```

## 📈 확장 가능성

### 새로운 속성 타입 추가
1. `buildProperty()` 메서드에 케이스 추가
2. JSON 스키마에 타입 정의 추가
3. 인터페이스 확장

### 새로운 데이터베이스 추가
1. JSON 스키마에 데이터베이스 정의 추가
2. 관계 설정 (필요한 경우)
3. 테스트 시나리오 업데이트

### 환경별 스키마
- 환경별 다른 스키마 파일 지원 가능
- 개발/테스트/프로덕션 환경별 다른 속성 옵션

## 🧪 테스트 커버리지

### 단위 테스트
- [x] 스키마 로드 및 검증
- [x] 데이터베이스 생성
- [x] 속성 매핑 관리
- [x] 관계 속성 처리

### 통합 테스트  
- [x] ConfigManager 통합
- [x] 환경별 설정 적용
- [x] 실제 API 호출 테스트
- [x] 샘플 데이터 생성

### E2E 테스트
- [x] 전체 워크플로우 검증
- [x] 양방향 관계 확인
- [x] 속성 ID 추적 검증

## 📚 참고 자료

- [Notion API Documentation](https://developers.notion.com/)
- [Database Properties API](https://developers.notion.com/reference/property-object)
- [Relation Properties](https://developers.notion.com/reference/property-object#relation)

## 🎯 향후 계획

### 단기 (1-2주)
- [ ] CLI 명령어 통합
- [ ] 스키마 검증 강화
- [ ] 에러 메시지 개선

### 중기 (1개월)
- [ ] 웹 UI 관리 도구
- [ ] 스키마 버전 관리
- [ ] 마이그레이션 도구

### 장기 (3개월)
- [ ] 다른 플랫폼 지원 (Airtable, etc.)
- [ ] GraphQL API 지원
- [ ] 실시간 동기화
