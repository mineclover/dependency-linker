# Code Organization & Refactoring Plan

## 📊 Current State Analysis

### Large Files Requiring Refactoring

| File | Lines | Issues | Priority |
|------|-------|--------|----------|
| `notionClient.ts` | 1,398 | Monolithic API client | **HIGH** |
| `notionMarkdownConverter.ts` | 824 | Multiple conversion functions | **HIGH** |
| `metaTemplateEngine.ts` | 778 | Complex template logic | **MEDIUM** |
| `syncWorkflowService.ts` | 728 | Mixed responsibilities | **HIGH** |
| `databaseSchemaManager.ts` | 693 | Schema + validation logic | **MEDIUM** |
| `notionDocumentTracker.ts` | 634 | Document + relationship logic | **MEDIUM** |

### Current Directory Structure Issues

```
src/
├── core/metaTemplate/          # Domain logic mixed with utilities
├── utils/                      # Too many large utility files
├── services/                   # Business logic scattered
├── commands/                   # CLI commands
├── types/                      # Type definitions
├── config/                     # Configuration
└── tests/                      # Tests mixed with main code
```

## 🎯 Target Architecture (Clean Architecture)

### Proposed src/ Structure

```
src/
├── cli/                        # CLI Interface Layer
│   ├── commands/              # Command implementations
│   ├── formatters/            # Output formatting
│   └── main.ts               # CLI entry point
│
├── infrastructure/            # External Concerns Layer
│   ├── notion/               # Notion API integration
│   │   ├── client/          # API client components
│   │   ├── converters/      # Markdown ↔ Notion conversion
│   │   └── rate-limiter/    # API optimization
│   ├── database/            # SQLite (Bun) integration
│   │   ├── connection/      # Connection management
│   │   ├── migrations/      # Database migrations
│   │   └── repositories/    # Data access layer
│   └── file-system/         # File operations
│
├── services/                 # Application Services Layer
│   ├── dependency-analysis/ # Core dependency analysis
│   ├── document-management/ # Document lifecycle
│   ├── sync-workflow/       # Synchronization logic
│   └── context-engineering/ # Context assembly
│
├── domain/                   # Domain Logic Layer
│   ├── entities/            # Core business entities
│   ├── repositories/        # Domain repository interfaces
│   └── services/           # Domain services
│
├── shared/                   # Shared Utilities
│   ├── types/              # TypeScript type definitions
│   ├── config/             # Configuration management
│   ├── utils/              # Pure utility functions
│   └── constants/          # Application constants
│
└── __tests__/               # All tests organized by layer
    ├── unit/               # Unit tests
    ├── integration/        # Integration tests
    └── e2e/               # End-to-end tests
```

## 📋 Refactoring Tasks

### Phase 1: File Splitting (Week 1)

#### TASK-R1: Split notionClient.ts (1,398 lines)
```typescript
// Current: Single large file
src/utils/notionClient.ts (1,398 lines)

// Target: Multiple focused files
src/infrastructure/notion/client/
├── NotionApiClient.ts         # Core API wrapper (~200 lines)
├── DatabaseManager.ts         # Database operations (~300 lines)  
├── PageManager.ts             # Page operations (~300 lines)
├── BlockManager.ts            # Block operations (~200 lines)
├── PropertyManager.ts         # Property management (~200 lines)
└── ErrorHandler.ts            # Error handling (~200 lines)
```

#### TASK-R2: Split notionMarkdownConverter.ts (824 lines)
```typescript
// Current: Single conversion file
src/utils/notionMarkdownConverter.ts (824 lines)

// Target: Conversion pipeline
src/infrastructure/notion/converters/
├── MarkdownToNotion.ts        # MD → Notion (~300 lines)
├── NotionToMarkdown.ts        # Notion → MD (~300 lines)
├── BlockSerializer.ts         # Block serialization (~100 lines)
├── ContentChunker.ts          # 2000 char chunking (~100 lines)
└── ConversionUtils.ts         # Shared utilities (~100 lines)
```

#### TASK-R3: Reorganize syncWorkflowService.ts (728 lines)
```typescript
// Current: Mixed workflow logic
src/services/syncWorkflowService.ts (728 lines)

// Target: Workflow components
src/services/sync-workflow/
├── SyncOrchestrator.ts        # Main workflow (~200 lines)
├── DependencySync.ts          # Dependency synchronization (~200 lines)
├── DocumentSync.ts            # Document synchronization (~200 lines)
├── ConflictResolver.ts        # Conflict resolution (~100 lines)
└── SyncValidator.ts           # Validation logic (~100 lines)
```

### Phase 2: Architecture Migration (Week 2-3)

#### TASK-R4: Create Infrastructure Layer
- **Notion Integration**: API client, rate limiting, converters
- **Database Integration**: Bun SQLite, repositories, migrations  
- **File System**: Project detection, file operations

#### TASK-R5: Create Services Layer
- **Dependency Analysis**: Extract from core/metaTemplate
- **Document Management**: Context engineering, tracking
- **Sync Workflow**: Orchestration, conflict resolution

#### TASK-R6: Create Domain Layer
- **Entities**: File, Dependency, Document, NotionPage
- **Repository Interfaces**: Abstract data access
- **Domain Services**: Pure business logic

### Phase 3: Clean Architecture Implementation (Week 4)

#### TASK-R7: Dependency Inversion
- Create interfaces for external dependencies
- Implement dependency injection pattern
- Remove direct dependencies between layers

#### TASK-R8: Test Organization
- Move all tests to `__tests__/` directory
- Organize by layer and feature
- Create test utilities and fixtures

## 🔄 Migration Strategy

### Step 1: Parallel Development
- Keep existing `src/` functional during migration
- Build `src/` with clean architecture
- Maintain backward compatibility

### Step 2: Gradual Migration
1. **Infrastructure First**: Notion client, database, file system
2. **Services Second**: Business logic components  
3. **Domain Third**: Core entities and interfaces
4. **CLI Last**: Command interface and formatters

### Step 3: Testing Strategy
- Test each refactored component independently
- Integration tests for service interactions
- E2E tests for complete workflows

### Step 4: Cutover Plan
- Feature flags for switching between implementations
- Gradual rollout starting with non-critical features
- Rollback capability during transition

## 📊 Expected Benefits

### Code Quality
- **Single Responsibility**: Each file has one clear purpose
- **Maintainability**: Easier to understand and modify
- **Testability**: Smaller, focused components

### Development Velocity  
- **Parallel Development**: Multiple developers can work simultaneously
- **Reduced Conflicts**: Smaller files reduce merge conflicts
- **Faster Builds**: Better tree shaking and compilation

### Technical Debt Reduction
- **Dependencies**: Clear separation of concerns
- **Coupling**: Reduced interdependencies
- **Complexity**: Manageable component sizes

## ⏱️ Timeline Estimate

| Phase | Duration | Effort | Priority |
|-------|----------|---------|----------|
| File Splitting | 1 week | 40h | HIGH |
| Architecture Migration | 2-3 weeks | 80h | HIGH |
| Clean Architecture | 1 week | 40h | MEDIUM |
| **Total** | **4-5 weeks** | **160h** | - |

## 📝 Success Metrics

- **File Size**: No file >500 lines (current max: 1,398)
- **Complexity**: Cyclomatic complexity <10 per function
- **Test Coverage**: >80% coverage for all new code
- **Build Time**: <30s for incremental builds
- **Bundle Size**: <2MB total, <500KB initial load

---

*Priority: HIGH - Essential for maintainability and team development*
*Status: Planning phase - Ready for implementation*