# Clean Architecture Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Core Principles](#core-principles)
4. [Layer Responsibilities](#layer-responsibilities)
5. [Dependency Rules](#dependency-rules)
6. [Implementation Patterns](#implementation-patterns)
7. [Best Practices](#best-practices)

## Overview

This project implements Clean Architecture principles to achieve:
- **Separation of Concerns**: Clear boundaries between business logic and technical details
- **Testability**: Easy unit testing without external dependencies
- **Maintainability**: Changes in one layer don't affect others
- **Flexibility**: Easy to swap implementations (databases, APIs, frameworks)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│                    (User Interface)                          │
├─────────────────────────────────────────────────────────────┤
│                   Application Layer                          │
│                  (Application Services)                      │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│                (Entities & Domain Services)                  │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│              (External Services & Adapters)                  │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
- **Inward Only**: Dependencies point inward toward the domain
- **Domain Independence**: Domain layer has no external dependencies
- **Dependency Inversion**: High-level modules don't depend on low-level modules

## Core Principles

### 1. Domain-Driven Design
```typescript
// Domain Entity - Pure business logic
export class ProjectExploration {
  constructor(private config: ProcessedConfig) {}
  
  detectProjectType(files: ProjectFile[]): ProjectTypeDetection {
    // Pure business logic, no external dependencies
  }
}
```

### 2. Dependency Injection
```typescript
// Application Service with injected dependencies
export class UploadService {
  constructor(
    private configService: ConfigurationService,
    private notionApiService: NotionApiService
  ) {}
}
```

### 3. Interface Segregation
```typescript
// Focused interfaces for specific capabilities
export interface INotionClient {
  createPage(data: PageData): Promise<Page>;
  queryDatabase(id: string): Promise<QueryResult>;
}
```

## Layer Responsibilities

### Domain Layer (`src/domain/`)
**Purpose**: Core business logic and rules

**Contains**:
- Entities (`entities/`)
- Domain Services (`services/`)
- Domain Interfaces (`interfaces/`)
- Value Objects
- Domain Events

**Example**:
```typescript
// src/domain/entities/DataCollectionRules.ts
export class DataCollectionRules {
  validateFileSize(file: ProjectFile): boolean {
    return file.size <= this.config.parser.maxFileSize;
  }
  
  enforceCollectionQuotas(type: string, items: any[]): number {
    // Business rule enforcement
  }
}
```

### Application Layer (`src/services/`)
**Purpose**: Orchestrate domain objects and infrastructure services

**Contains**:
- Application Services
- Use Case Implementations
- DTOs (Data Transfer Objects)
- Application Interfaces

**Example**:
```typescript
// src/services/uploadService.ts
export class UploadService extends BaseApplicationService {
  async uploadFile(filePath: string): Promise<UploadResult> {
    // Orchestrate domain and infrastructure
    const exploration = new ProjectExploration(this.config);
    const files = await this.fileSystem.readDirectory(filePath);
    const filtered = exploration.filterProjectFiles(files);
    return await this.notionService.createPages(filtered);
  }
}
```

### Infrastructure Layer (`src/infrastructure/`)
**Purpose**: External service implementations and adapters

**Contains**:
- External API Clients
- Database Implementations
- File System Operations
- Third-party Integrations

**Example**:
```typescript
// src/infrastructure/notion/core/NotionApiService.ts
export class NotionApiService implements INotionClient {
  async createPage(data: PageData): Promise<NotionRequestResult<Page>> {
    return this.requestHandler.executeRequest(
      'createPage',
      () => this.client.pages.create(data)
    );
  }
}
```

### CLI Layer (`src/cli/`)
**Purpose**: User interface and command handling

**Contains**:
- Command Definitions
- Argument Parsing
- Output Formatting
- User Interaction

**Example**:
```typescript
// src/cli/commands/upload.ts
const uploadCommand = createStandardizedCommand(
  'upload',
  'Upload files to Notion',
  { requiresNotion: true },
  async (deps, options) => {
    const uploadService = deps.container.resolve('uploadService');
    const result = await uploadService.uploadFile(options.file);
    logger.success(`Uploaded: ${result.pageUrl}`);
  }
);
```

## Dependency Rules

### 1. Layer Dependencies
```typescript
// ✅ CORRECT: Application depends on Domain
import { ProjectExploration } from '../../domain/entities/ProjectExploration';

// ❌ WRONG: Domain depends on Infrastructure
import { NotionClient } from '../../infrastructure/notion/client';
```

### 2. Interface Dependencies
```typescript
// ✅ CORRECT: Depend on abstraction
constructor(private notionService: INotionService) {}

// ❌ WRONG: Depend on implementation
constructor(private notionClient: NotionClient) {}
```

### 3. Dependency Injection Container
```typescript
// src/infrastructure/container/ServiceContainer.ts
export class ServiceContainer {
  register<T>(token: string, factory: () => T): void {
    this.services.set(token, factory);
  }
  
  resolve<T>(token: string): T {
    const factory = this.services.get(token);
    if (!factory) throw new Error(`Service ${token} not registered`);
    return factory();
  }
}
```

## Implementation Patterns

### 1. Factory Pattern
```typescript
export class NotionClientFactory {
  static createClient(config: NotionConfig): INotionClient {
    // Validation and creation logic
    return new NotionClientInstance(config);
  }
}
```

### 2. Repository Pattern
```typescript
export interface IProjectRepository {
  findById(id: string): Promise<Project>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 3. Service Pattern
```typescript
export abstract class BaseApplicationService {
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Common operation logic: logging, error handling, metrics
  }
}
```

### 4. Command Pattern
```typescript
export abstract class BaseCommand {
  protected abstract handleCommand(
    deps: CommandDependencies,
    options: any
  ): Promise<void>;
}
```

## Best Practices

### 1. Testing Strategy
```typescript
// Unit Test - Domain Logic
describe('ProjectExploration', () => {
  it('should detect TypeScript project', () => {
    const exploration = new ProjectExploration(mockConfig);
    const result = exploration.detectProjectType(mockFiles);
    expect(result.type).toBe('typescript');
  });
});

// Integration Test - Infrastructure
describe('NotionApiService', () => {
  it('should create page with retry logic', async () => {
    const service = new NotionApiService(mockClient);
    const result = await service.createPage(pageData);
    expect(result.success).toBe(true);
  });
});
```

### 2. Error Handling
```typescript
// Standardized error types
export class DomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class InfrastructureError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
  }
}
```

### 3. Configuration Management
```typescript
// Centralized configuration with validation
export class ConfigurationService {
  async loadAndProcessConfig(path: string): Promise<ProcessedConfig> {
    const raw = await this.loadConfig(path);
    const validated = await this.validateConfig(raw);
    return this.applyBusinessRules(validated);
  }
}
```

### 4. Logging and Monitoring
```typescript
// Structured logging
logger.info('Operation started', {
  operation: 'uploadFile',
  file: filePath,
  timestamp: Date.now()
});

// Metrics collection
this.metrics.record('upload.duration', duration);
this.metrics.record('upload.success', 1);
```

## Migration Checklist

### Phase 1: Foundation
- [x] Create layer directories
- [x] Define core interfaces
- [x] Setup dependency injection
- [x] Create base classes

### Phase 2: Domain Extraction
- [x] Identify business rules
- [x] Create domain entities
- [x] Extract domain services
- [x] Define domain interfaces

### Phase 3: Infrastructure Standardization
- [x] Create API adapters
- [x] Implement repositories
- [x] Standardize external services
- [x] Add error handling

### Phase 4: Application Services
- [x] Create service layer
- [x] Implement use cases
- [x] Add orchestration logic
- [x] Setup validation

### Phase 5: CLI Refactoring
- [x] Standardize commands
- [x] Implement dependency injection
- [x] Add error handling
- [x] Create progress tracking

### Phase 6: Testing
- [x] Unit tests for domain
- [x] Integration tests for infrastructure
- [x] E2E tests for CLI
- [x] Architecture compliance tests

### Phase 7: Documentation
- [x] Architecture guide
- [x] API documentation
- [x] Migration guide
- [x] Best practices

## Common Pitfalls and Solutions

### Pitfall 1: Domain Logic in Wrong Layer
**Problem**: Business rules in infrastructure or UI
**Solution**: Extract to domain entities or services

### Pitfall 2: Direct Dependencies
**Problem**: High-level modules depending on low-level
**Solution**: Use dependency injection and interfaces

### Pitfall 3: Anemic Domain Model
**Problem**: Domain objects with only data, no behavior
**Solution**: Move related logic into domain entities

### Pitfall 4: Violation of Single Responsibility
**Problem**: Classes doing too many things
**Solution**: Split into focused, cohesive classes

## Resources

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)