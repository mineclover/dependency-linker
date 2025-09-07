# 데이터베이스 대체 및 마이그레이션 시스템 설계

## 3.1 마이그레이션 시스템 아키텍처

### 3.1.1 핵심 컴포넌트

```typescript
interface MigrationSystem {
  // 데이터베이스 생성 관리자
  databaseCreator: NotionDatabaseCreator;
  
  // 데이터 마이그레이터  
  dataMigrator: NotionDataMigrator;
  
  // 메타데이터 클리너
  metadataCleaner: MetadataCleanupService;
  
  // 마이그레이션 오케스트레이터
  migrationOrchestrator: MigrationOrchestrator;
}
```

### 3.1.2 마이그레이션 워크플로우

```
┌─────────────────────────────────────┐
│        1. Schema Validation        │
│  - Validate local schema            │
│  - Compare with remote schema       │
│  - Identify conflicts & issues      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      2. Database Creation Plan     │
│  - Generate new database schema     │
│  - Create backup strategy           │  
│  - Plan migration sequence          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│       3. New Database Creation     │
│  - Create new Notion database       │
│  - Configure properties & schema    │
│  - Validate created structure       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         4. Data Migration          │
│  - Extract data from old database   │
│  - Transform data format            │
│  - Load data to new database        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│       5. Metadata Cleanup          │
│  - Clean invalid metadata           │
│  - Normalize property values        │
│  - Remove orphaned references       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      6. Validation & Cutover       │
│  - Validate migrated data           │
│  - Update system references         │
│  - Archive old database             │
└─────────────────────────────────────┘
```

## 3.2 데이터베이스 생성 전략

### 3.2.1 스키마 기반 데이터베이스 생성
```typescript
interface DatabaseCreationStrategy {
  // 스키마 정규화
  normalizeSchema(schema: DatabaseSchema): NotionDatabaseCreateRequest;
  
  // 속성 매핑
  mapProperties(properties: Record<string, Property>): NotionProperties;
  
  // 데이터베이스 생성
  createDatabase(request: NotionDatabaseCreateRequest): Promise<NotionDatabase>;
  
  // 생성 검증
  validateCreatedDatabase(database: NotionDatabase): Promise<ValidationResult>;
}
```

### 3.2.2 점진적 생성 전략
1. **준비 단계**: 스키마 검증 및 계획 수립
2. **생성 단계**: 새 데이터베이스 생성 및 구조 설정
3. **검증 단계**: 생성된 데이터베이스 구조 확인
4. **준비 완료**: 데이터 마이그레이션 준비 상태

## 3.3 데이터 마이그레이션 전략

### 3.3.1 ETL (Extract-Transform-Load) 파이프라인

```typescript
interface DataMigrationPipeline {
  // Extract: 기존 데이터 추출
  extractData(databaseId: string): Promise<NotionPage[]>;
  
  // Transform: 데이터 변환 및 정리
  transformData(pages: NotionPage[], targetSchema: DatabaseSchema): Promise<TransformedPage[]>;
  
  // Load: 새 데이터베이스로 로드
  loadData(pages: TransformedPage[], targetDatabaseId: string): Promise<LoadResult>;
  
  // Validate: 마이그레이션 검증
  validateMigration(sourceId: string, targetId: string): Promise<MigrationValidationResult>;
}
```

### 3.3.2 배치 처리 전략
```typescript
interface BatchMigrationStrategy {
  batchSize: number;           // 배치당 페이지 수 (기본: 10)
  concurrentBatches: number;   // 동시 처리 배치 수 (기본: 2)
  retryAttempts: number;       // 재시도 횟수 (기본: 3)
  backoffDelay: number;        // 재시도 지연 시간 (기본: 1000ms)
}
```

## 3.4 메타데이터 정리 전략

### 3.4.1 메타데이터 클리닝 규칙
```typescript
interface MetadataCleaningRules {
  // 잘못된 속성값 정리
  cleanInvalidProperties(page: NotionPage): NotionPage;
  
  // 누락된 필수 속성 보완
  fillMissingRequiredProperties(page: NotionPage, schema: DatabaseSchema): NotionPage;
  
  // 데이터 타입 정규화
  normalizePropertyTypes(page: NotionPage): NotionPage;
  
  // 참조 무결성 복구
  repairBrokenReferences(page: NotionPage): NotionPage;
}
```

### 3.4.2 클리닝 단계
1. **속성값 검증**: 타입 일치성, 형식 검증
2. **필수값 보완**: 누락된 필수 속성 기본값 설정
3. **참조 복구**: 깨진 관계 속성 복구
4. **데이터 정규화**: 일관된 형식으로 변환

## 3.5 안전장치 및 롤백 메커니즘

### 3.5.1 백업 전략
```typescript
interface BackupStrategy {
  // 전체 데이터베이스 백업
  createFullBackup(databaseId: string): Promise<DatabaseBackup>;
  
  // 증분 백업
  createIncrementalBackup(databaseId: string, since: Date): Promise<DatabaseBackup>;
  
  // 백업 복원
  restoreFromBackup(backup: DatabaseBackup): Promise<RestoreResult>;
  
  // 백업 검증
  validateBackup(backup: DatabaseBackup): Promise<BackupValidationResult>;
}
```

### 3.5.2 롤백 메커니즘
```typescript
interface RollbackMechanism {
  // 마이그레이션 취소
  rollbackMigration(migrationId: string): Promise<RollbackResult>;
  
  // 부분 롤백
  partialRollback(migrationId: string, pageIds: string[]): Promise<PartialRollbackResult>;
  
  // 시점 복원
  restoreToTimePoint(databaseId: string, timestamp: Date): Promise<RestoreResult>;
}
```

## 3.6 모니터링 및 진행상황 추적

### 3.6.1 마이그레이션 진행상황 추적
```typescript
interface MigrationProgress {
  migrationId: string;
  status: 'PREPARING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  totalPages: number;
  processedPages: number;
  failedPages: number;
  startTime: Date;
  estimatedCompletionTime?: Date;
  currentPhase: string;
  errors: MigrationError[];
}
```

### 3.6.2 실시간 모니터링
```typescript
interface MigrationMonitor {
  // 진행상황 업데이트
  updateProgress(migrationId: string, progress: Partial<MigrationProgress>): void;
  
  // 에러 기록
  recordError(migrationId: string, error: MigrationError): void;
  
  // 상태 조회
  getStatus(migrationId: string): Promise<MigrationProgress>;
  
  // 진행상황 스트리밍
  streamProgress(migrationId: string): AsyncIterable<MigrationProgress>;
}
```

## 3.7 구현 단계별 계획

### 3.7.1 Phase 3A: 기본 마이그레이션 시스템
- [x] 아키텍처 설계 완료
- [ ] NotionDatabaseCreator 구현
- [ ] 기본 데이터 추출/로드 기능 구현
- [ ] 간단한 메타데이터 클리닝 구현

### 3.7.2 Phase 3B: 고급 기능 및 안전장치
- [ ] 배치 처리 시스템 구현
- [ ] 백업/복원 메커니즘 구현
- [ ] 롤백 기능 구현
- [ ] 에러 처리 및 재시도 로직 구현

### 3.7.3 Phase 3C: 모니터링 및 최적화
- [ ] 실시간 진행상황 모니터링 구현
- [ ] 성능 최적화 및 병렬 처리 개선
- [ ] 마이그레이션 히스토리 관리 구현
- [ ] CLI 통합 및 사용자 인터페이스 개선

## 3.8 성공 기준 및 검증 방법

### 3.8.1 성공 기준
- ✅ **데이터 무손실**: 모든 페이지와 속성값이 정확히 마이그레이션됨
- ✅ **스키마 일치**: 새 데이터베이스가 로컬 스키마와 100% 일치
- ✅ **메타데이터 정리**: 잘못된 메타데이터가 모두 정리됨
- ✅ **성능 기준**: 100개 페이지 마이그레이션이 5분 이내 완료
- ✅ **안정성**: 실패 시 완전한 롤백 가능

### 3.8.2 검증 방법
1. **데이터 무결성 검증**: 원본-대상 데이터 비교
2. **스키마 호환성 검증**: 스키마 구조 일치 확인
3. **기능 테스트**: 모든 CRUD 작업 정상 동작 확인
4. **성능 테스트**: 대용량 데이터 마이그레이션 테스트
5. **복구 테스트**: 실패 시나리오 및 롤백 테스트