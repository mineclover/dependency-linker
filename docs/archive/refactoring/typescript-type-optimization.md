# TypeScript 타입 최적화 전략

## 📊 현재 상태 분석

### 프로젝트 구조
- **67개 TypeScript 파일** 분석 완료
- **Clean Architecture + DDD** 패턴 적용
- **계층**: domain, infrastructure, services, shared, cli

### 타입 정의 현황
```
shared/types/index.ts     - 225 lines (핵심 타입 정의)
domain/interfaces/        - 도메인 인터페이스
service-specific types    - 각 서비스별 타입 정의
```

## 🎯 타입 최적화 목표

### 1. Type Safety 강화
- `any` 타입 완전 제거
- 런타임 타입 검증 시스템 구축
- Branded types로 타입 안전성 증대

### 2. 코드 재사용성 향상
- 제네릭 타입 시스템 도입
- 공통 유틸리티 타입 라이브러리
- 조건부 타입 활용

### 3. 개발자 경험 개선
- IntelliSense 자동완성 최적화
- 컴파일 타임 에러 검출 강화
- 타입 문서화 자동화

## 🚀 구현 전략

### Phase 1: 기반 타입 시스템 (2주)

**1.1 any 타입 제거**
```typescript
// ❌ Before
properties?: Record<string, any>
existingDocs: any[]

// ✅ After  
properties?: Properties<TEntity>
existingDocs: NotionDocument[]
```

**1.2 타입 중앙화**
```
shared/types/
├── core/           # FileId, NotionId, DocumentId
├── domain/         # Document, Workspace, Project  
├── api/           # API 요청/응답 타입
├── utilities/     # 유틸리티 타입
└── index.ts       # 통합 export
```

**1.3 기본 제네릭 인터페이스**
```typescript
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
  findAll(criteria?: Criteria<T>): Promise<T[]>
}
```

### Phase 2: 도메인 타입 강화 (2주)

**2.1 Branded Types 도입**
```typescript
type FileId = string & { readonly __brand: 'FileId' }
type NotionPageId = string & { readonly __brand: 'NotionPageId' }  
type DatabaseId = string & { readonly __brand: 'DatabaseId' }

// 타입 가드와 함께 사용
function createFileId(value: string): FileId {
  if (!isValidFileId(value)) throw new Error('Invalid FileId')
  return value as FileId
}
```

**2.2 Service Layer 제네릭화**
```typescript
interface SyncService<TSource, TTarget> {
  sync(source: TSource, target: TTarget): Promise<SyncResult<TSource, TTarget>>
}

interface NotionSyncService extends SyncService<Document, NotionPage> {
  syncToNotion(document: Document): Promise<NotionPage>
  syncFromNotion(pageId: NotionPageId): Promise<Document>
}
```

**2.3 Error Type Hierarchy**
```typescript
abstract class DomainError extends Error {
  abstract readonly code: string
  abstract readonly httpStatus: number
}

class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly httpStatus = 400
}

class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
  readonly httpStatus = 404
}
```

### Phase 3: 고급 타입 기능 (2주)

**3.1 Conditional Types**
```typescript
type ApiResponse<T> = T extends string 
  ? { message: T }
  : T extends Error
  ? { error: T }
  : { data: T }

type OptionalProperties<T> = {
  [K in keyof T]?: T[K] extends undefined ? T[K] : T[K] | undefined
}
```

**3.2 Runtime Type Validation**
```typescript
interface TypeValidator<T> {
  validate(input: unknown): input is T
  parse(input: unknown): T
  safeParse(input: unknown): Result<T, ValidationError>
}

const NotionConfigValidator: TypeValidator<NotionConfig> = {
  validate(obj): obj is NotionConfig {
    return typeof obj === 'object' && 
           obj !== null &&
           'apiKey' in obj &&
           typeof obj.apiKey === 'string'
  },
  
  parse(input: unknown): NotionConfig {
    if (!this.validate(input)) {
      throw new ValidationError('Invalid NotionConfig')
    }
    return input
  }
}
```

**3.3 Template Literal Types**
```typescript
type EventType = 'file' | 'document' | 'sync'
type EventAction = 'created' | 'updated' | 'deleted'
type EventName = `${EventType}:${EventAction}`

// 'file:created' | 'file:updated' | 'document:created' ...

interface EventHandler<T extends EventName> {
  handle(event: EventData<T>): Promise<void>
}
```

## 🔧 즉시 적용 가능한 개선사항

### 1. shared/types/index.ts 개선
```typescript
// 현재 문제점 (line 17-21)
export interface ProjectFile {
  path: string;
  content?: string;  // undefined 가능성 명시
  dependencies?: string[]; // 더 구체적 타입 필요
  notionPageId?: string; // NotionPageId 타입 사용
}

// 개선안
export interface ProjectFile {
  path: FilePath;
  content: string | null;
  dependencies: readonly DependencyId[];
  notionPageId: NotionPageId | null;
}
```

### 2. Repository Pattern 적용
```typescript
// domain/repositories/DocumentRepository.ts
export interface DocumentRepository extends Repository<Document, DocumentId> {
  findByFilePath(path: FilePath): Promise<Document | null>
  findByNotionId(notionId: NotionPageId): Promise<Document | null>
  findByStatus(status: DocumentStatus): Promise<readonly Document[]>
}

// infrastructure/database/sqlite/SqliteDocumentRepository.ts
export class SqliteDocumentRepository implements DocumentRepository {
  async findById(id: DocumentId): Promise<Document | null> {
    // 타입 안전한 구현
  }
}
```

### 3. Service Layer 타입 안전성
```typescript
// services/workflow/SyncOrchestrator.ts 개선
export class SyncOrchestrator implements SyncService<Document, NotionPage> {
  async sync(
    document: Document, 
    options?: SyncOptions
  ): Promise<SyncResult<Document, NotionPage>> {
    // 타입 가드와 함께 안전한 구현
    if (!this.canSync(document)) {
      throw new ValidationError('Document cannot be synced')
    }
    
    return this.performSync(document, options)
  }
  
  private canSync(document: Document): boolean {
    return document.status !== DocumentStatus.ERROR
  }
}
```

## 📈 예상 효과

### 개발 생산성 향상 (30%)
- **자동완성 개선**: 구체적 타입으로 IntelliSense 향상
- **컴파일 에러 감소**: 타입 안전성으로 런타임 에러 예방
- **리팩토링 안전성**: 타입 변경시 영향 범위 명확

### 코드 품질 향상 (40%)
- **버그 감소**: 컴파일 타임 타입 체크
- **가독성 향상**: 명확한 타입 선언
- **유지보수성**: 타입 기반 문서화

### 팀 협업 효율성 (25%)
- **API 계약 명확화**: 인터페이스 타입으로 명세
- **코드 리뷰 품질**: 타입 기반 검토
- **온보딩 시간 단축**: 타입으로 시스템 이해

## 📋 구현 체크리스트

### Week 1-2: 기반 작업
- [ ] `any` 타입 완전 제거
- [ ] 타입 정의 중앙화 및 모듈화
- [ ] 기본 제네릭 인터페이스 도입
- [ ] Branded types 핵심 식별자 적용

### Week 3-4: 도메인 강화  
- [ ] Repository pattern 제네릭화
- [ ] Service layer 타입 시스템 구축
- [ ] Error type hierarchy 완성
- [ ] 도메인 엔티티 타입 안전성 강화

### Week 5-6: 고급 기능
- [ ] Conditional types 도입
- [ ] Runtime type validation 시스템
- [ ] Template literal types 활용
- [ ] 타입 문서화 자동화

## 🔍 성공 지표

**정량적 지표**
- TypeScript strict 모드 100% 준수
- `any` 타입 사용량 0%
- 컴파일 에러 70% 감소
- 런타임 타입 에러 90% 감소

**정성적 지표**
- 개발자 만족도 향상
- 코드 리뷰 효율성 증대
- 신규 개발자 온보딩 시간 단축
- API 문서화 자동화 달성

---

**Next Steps**: Phase 1 구현을 위한 구체적인 파일별 수정 계획 수립 필요