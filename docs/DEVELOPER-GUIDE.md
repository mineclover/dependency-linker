---
notion_page_id: 26848583-7460-811d-ad41-fcf5e2f2555a
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
last_synced: '2025-09-08T11:29:06.338Z'
category: docs
auto_generated: true
---
# 개발자 가이드

## 아키텍처 개요

### 시스템 아키텍처

```
📁 Dependency Linker CLI
├── 🔧 ConfigAutoUpdater     # 설정 자동 관리
├── 🗄️ DatabaseSchemaManager # 스키마 기반 DB 생성
├── 🔗 RelationshipExplorer  # 의존성 관계 추적
├── 📊 NotionClient         # Notion API 인터페이스
└── 🌍 EnvironmentManager   # 환경별 설정 관리
```

### 핵심 컴포넌트

#### 1. 스키마 시스템
- **DatabaseSchemaManager**: JSON 스키마로 DB 자동 생성
- **PropertyMapping**: 26개 속성 자동 추적
- **RelationManager**: 6개 관계 속성 관리

#### 2. 설정 시스템
- **ConfigAutoUpdater**: 스키마 기반 설정 자동 업데이트
- **EnvironmentManager**: 3개 환경 독립 관리
- **ValidationSystem**: 설정 검증 및 오류 감지

#### 3. 통합 시스템
- **GitIntegration**: 버전 제어 시스템 연동
- **NotionMCP**: Notion API 최적화 호출
- **FileIndexer**: 프로젝트 파일 스캔 및 분석

## 확장 가능성

### 새로운 데이터베이스 타입 추가

1. **스키마 정의**
```json
{
  "databases": {
    "new_type": {
      "title": "New Type Database",
      "properties": {
        "Name": { "type": "title", "required": true }
      }
    }
  }
}
```

2. **매핑 시스템 확장**
```typescript
// DatabaseSchemaManager에 새 타입 지원 추가
buildProperty(propConfig: Property, databaseKey: string): any {
  switch (propConfig.type) {
    case 'new_property_type':
      return { new_property_type: {} };
  }
}
```

3. **ConfigAutoUpdater 확장**
- 새 데이터베이스 타입의 설정 병합 로직 추가
- 검증 규칙 업데이트

### 새로운 환경 추가

```json
{
  "environments": {
    "staging": {
      "databases": {},
      "workspaceUrl": "https://staging-workspace.notion.so"
    }
  }
}
```

### 커스텀 플러그인 개발

```typescript
interface CustomPlugin {
  name: string;
  version: string;
  init(config: any): Promise<void>;
  execute(context: any): Promise<any>;
}
```

## 테스팅

### 테스트 환경 설정

```bash
# 테스트 환경 초기화
npm run test:init

# 단위 테스트
npm run test:unit

# 통합 테스트
npm run test:integration

# 스키마 테스트
npm run test:schema
```

### 테스트 데이터

현재 테스트에 사용되는 데이터:
- **테스트 데이터베이스**: 3개
- **테스트 속성**: 26개
- **테스트 관계**: 6개

### 테스트 시나리오

1. **스키마 검증 테스트**
2. **데이터베이스 생성 테스트**
3. **설정 업데이트 테스트**
4. **환경별 설정 테스트**
5. **관계 속성 테스트**

### 성능 테스트

```bash
# 성능 벤치마크
npm run benchmark

# 메모리 사용량 테스트
npm run test:memory

# API 호출 최적화 테스트
npm run test:api-performance
```

## 배포

### 배포 준비

1. **환경 변수 설정**
```bash
export NOTION_API_KEY=your-api-key
export NODE_ENV=production
```

2. **의존성 설치**
```bash
npm ci --production
```

3. **설정 검증**
```bash
npm run validate-config
npm run schema:validate
```

### 배포 환경별 설정

#### Development
- 전체 로깅 활성화
- 개발용 데이터베이스 사용
- 핫 리로드 지원

#### Production
- 최적화된 로깅
- 프로덕션 데이터베이스
- 에러 추적 시스템

#### Staging
- 프로덕션과 유사한 환경
- 통합 테스트 실행
- 성능 모니터링

### 모니터링

```bash
# 시스템 상태 확인
npm run health-check

# 성능 메트릭
npm run metrics

# 로그 분석
npm run logs --level error
```

### 백업 및 복구

- **설정 백업**: 자동 백업 시스템
- **데이터베이스 백업**: Notion API 백업
- **복구 절차**: 단계별 복구 가이드
