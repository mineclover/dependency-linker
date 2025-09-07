# 스키마 관리 아키텍처 설계

## 2.1 핵심 아키텍처 컴포넌트

### 2.1.1 SchemaValidator (스키마 검증기)
```typescript
interface SchemaValidator {
  validateSchema(schema: DatabaseSchema): ValidationResult;
  validateNotionDatabase(databaseId: string): Promise<NotionValidationResult>;
  compareSchemas(local: DatabaseSchema, remote: NotionDatabaseSchema): SchemaDiff;
  suggestRepairs(diff: SchemaDiff): RepairAction[];
}
```

**책임:**
- 로컬 JSON 스키마 구조 검증
- 원격 Notion 데이터베이스 스키마 검증  
- 로컬-원격 스키마 차이점 분석
- 자동 복구 액션 제안

### 2.1.2 SchemaSynchronizer (스키마 동기화기)
```typescript
interface SchemaSynchronizer {
  syncDatabase(databaseId: string): Promise<SyncResult>;
  repairDatabase(databaseId: string, actions: RepairAction[]): Promise<RepairResult>;
  createDatabase(schema: DatabaseSchema): Promise<NotionDatabase>;
  migrateDatabase(source: string, target: string): Promise<MigrationResult>;
}
```

**책임:**
- 로컬-원격 스키마 동기화
- 자동 스키마 복구 실행
- 새 데이터베이스 생성
- 데이터베이스 간 마이그레이션

### 2.1.3 DataMigrator (데이터 마이그레이터)
```typescript
interface DataMigrator {
  migratePages(sourceDb: string, targetDb: string): Promise<MigrationResult>;
  cleanupMetadata(databaseId: string): Promise<CleanupResult>;
  validateDataIntegrity(databaseId: string): Promise<IntegrityResult>;
  rollbackMigration(migrationId: string): Promise<RollbackResult>;
}
```

**책임:**
- 페이지 데이터 마이그레이션
- 메타데이터 정리
- 데이터 무결성 검증
- 마이그레이션 롤백

## 2.2 검증 로직 상세 설계

### 2.2.1 다단계 검증 파이프라인

```typescript
interface ValidationPipeline {
  // Level 1: Structure Validation
  validateStructure(schema: any): StructureValidationResult;
  
  // Level 2: Semantic Validation  
  validateSemantics(schema: DatabaseSchema): SemanticValidationResult;
  
  // Level 3: Notion Compatibility
  validateNotionCompatibility(schema: DatabaseSchema): CompatibilityResult;
  
  // Level 4: Business Rules
  validateBusinessRules(schema: DatabaseSchema): BusinessValidationResult;
}
```

**검증 단계:**
1. **구조 검증**: JSON 스키마 기본 구조 확인
2. **의미 검증**: 속성 타입, 필수 필드 등 검증
3. **Notion 호환성**: Notion API 2025-09-03 스펙 준수 확인
4. **비즈니스 규칙**: 도메인 특화 규칙 검증

### 2.2.2 에러 분류 및 복구 전략

```typescript
enum ValidationErrorType {
  STRUCTURE_ERROR = 'structure',
  TYPE_MISMATCH = 'type_mismatch', 
  MISSING_REQUIRED = 'missing_required',
  NOTION_INCOMPATIBLE = 'notion_incompatible',
  BUSINESS_RULE_VIOLATION = 'business_rule'
}

interface RepairStrategy {
  errorType: ValidationErrorType;
  autoRepair: boolean;
  repairAction: RepairAction;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

## 2.3 아키텍처 연동 방식

### 2.3.1 Clean Architecture 통합

```
┌─────────────────────────────────────┐
│           Application Layer         │
│  ┌─────────────────────────────────┐│
│  │     SchemaManagementService     ││
│  │  - validateAndSync()            ││
│  │  - repairIfNeeded()             ││
│  │  - migrateDatabase()            ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│            Domain Layer             │
│  ┌─────────────────────────────────┐│
│  │      SchemaValidationRules      ││
│  │  - validateDatabaseSchema()     ││
│  │  - validatePropertyTypes()      ││
│  │  - validateBusinessConstraints()││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Infrastructure Layer        │
│  ┌─────────────────────────────────┐│
│  │    NotionSchemaRepository      ││
│  │  - fetchRemoteSchema()          ││
│  │  - updateRemoteSchema()         ││
│  │  - createDatabase()             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │      JSONSchemaRepository      ││
│  │  - loadLocalSchema()            ││
│  │  - saveLocalSchema()            ││
│  │  - backupSchema()               ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2.3.2 기존 시스템과의 통합

```typescript
// 기존 DatabaseSchemaManager 확장
class EnhancedDatabaseSchemaManager extends DatabaseSchemaManager {
  constructor(
    projectPath: string,
    private validator: SchemaValidator,
    private synchronizer: SchemaSynchronizer,
    private migrator: DataMigrator
  ) {
    super(projectPath);
  }

  async loadSchemasWithValidation(): Promise<DatabaseSchemas> {
    const schemas = await this.loadSchemas();
    
    // 검증 실행
    const validationResults = await this.validateAllSchemas(schemas);
    
    // 자동 복구 시도
    if (validationResults.hasErrors) {
      const repairedSchemas = await this.autoRepairSchemas(schemas, validationResults);
      return repairedSchemas;
    }
    
    return schemas;
  }
}
```

## 2.4 모니터링 및 알림 시스템

### 2.4.1 스키마 건강성 모니터링
```typescript
interface SchemaHealthMonitor {
  monitorDatabaseHealth(): Promise<HealthReport[]>;
  detectSchemaViolations(): Promise<Violation[]>;
  generateHealthDashboard(): HealthDashboard;
  scheduleHealthChecks(interval: number): void;
}
```

### 2.4.2 알림 시스템
```typescript
interface NotificationSystem {
  notifySchemaViolation(violation: Violation): void;
  notifyMigrationComplete(result: MigrationResult): void;
  notifyRepairRequired(databaseId: string, issues: Issue[]): void;
  sendHealthReport(report: HealthReport): void;
}
```

## 2.5 구현 우선순위

### 2.5.1 High Priority (Phase 2A)
- [x] SchemaValidator 기본 구현
- [ ] ValidationPipeline 구현
- [ ] Enhanced DatabaseSchemaManager 통합

### 2.5.2 Medium Priority (Phase 2B)
- [ ] SchemaSynchronizer 구현
- [ ] 자동 복구 로직 구현
- [ ] 에러 분류 시스템 구현

### 2.5.3 Low Priority (Phase 2C)
- [ ] 모니터링 시스템 구현
- [ ] 알림 시스템 구현
- [ ] 대시보드 UI 구현

## 2.6 테스트 전략

### 2.6.1 단위 테스트
- SchemaValidator 각 메서드별 테스트
- ValidationPipeline 단계별 테스트
- 에러 케이스별 복구 로직 테스트

### 2.6.2 통합 테스트
- 로컬-원격 스키마 동기화 테스트
- 데이터베이스 생성/마이그레이션 테스트
- 에러 복구 시나리오 테스트

### 2.6.3 E2E 테스트
- 전체 스키마 관리 워크플로우 테스트
- 실제 Notion API 연동 테스트
- 대용량 데이터 마이그레이션 테스트