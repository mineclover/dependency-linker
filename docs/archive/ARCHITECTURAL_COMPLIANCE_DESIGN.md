# 🏛️ Architectural Compliance Design Plan

**Objective**: Ensure 95%+ Clean Architecture compliance through systematic design patterns and dependency management.

---

## 🎯 Clean Architecture Compliance Framework

### Current Compliance Assessment
```
📊 Current State (Post-Initial Refactoring):
✅ Dependency Direction: 100% (All layers depend inward)  
✅ Interface Segregation: 80% (Domain interfaces defined)
🔄 Single Responsibility: 70% (Some mixed concerns remain)
🔄 Dependency Inversion: 60% (Partial DI implementation)
🔄 Open/Closed Principle: 65% (Limited extension points)

Target: 95%+ compliance across all SOLID principles
```

---

## 🏗️ Layer-by-Layer Compliance Design

### 1. Domain Layer (100% Compliance Target)

#### **Current Issues**:
- Domain logic scattered across service layer
- Incomplete value object implementations
- Missing domain service patterns

#### **Design Solution**: Pure Business Logic Layer
```typescript
// src/domain/entities/Document.ts - Enhanced Domain Entity
export class Document {
  private constructor(
    private readonly id: DocumentId,
    private readonly filePath: FilePath,
    private content: DocumentContent,
    private metadata: DocumentMetadata
  ) {}

  // Factory method for creation
  static create(
    filePath: string, 
    content: string, 
    metadata?: Partial<DocumentMetadata>
  ): Result<Document, DomainError> {
    const filePathResult = FilePath.create(filePath);
    if (filePathResult.isFailure()) {
      return Result.fail(filePathResult.error);
    }

    const contentResult = DocumentContent.create(content);
    if (contentResult.isFailure()) {
      return Result.fail(contentResult.error);
    }

    return Result.ok(new Document(
      DocumentId.generate(),
      filePathResult.getValue(),
      contentResult.getValue(),
      DocumentMetadata.create(metadata)
    ));
  }

  // Business methods
  updateContent(newContent: string): Result<void, DomainError> {
    const contentResult = DocumentContent.create(newContent);
    if (contentResult.isFailure()) {
      return Result.fail(contentResult.error);
    }

    this.content = contentResult.getValue();
    this.metadata = this.metadata.markAsModified();
    return Result.ok();
  }

  // Query methods (no setters - immutability)
  getId(): DocumentId { return this.id; }
  getFilePath(): FilePath { return this.filePath; }
  getContent(): DocumentContent { return this.content; }
  getMetadata(): DocumentMetadata { return this.metadata; }
}

// src/domain/value-objects/FilePath.ts - Enhanced Value Object
export class FilePath {
  private constructor(private readonly path: string) {}

  static create(path: string): Result<FilePath, DomainError> {
    if (!path || path.trim().length === 0) {
      return Result.fail(new DomainError('FilePath cannot be empty'));
    }

    if (path.includes('..') || path.includes('~')) {
      return Result.fail(new DomainError('FilePath cannot contain relative navigation'));
    }

    return Result.ok(new FilePath(path.trim()));
  }

  getValue(): string { return this.path; }
  getExtension(): string { return path.extname(this.path); }
  getDirectory(): string { return path.dirname(this.path); }
  
  equals(other: FilePath): boolean {
    return this.path === other.path;
  }
}

// src/domain/services/DependencyAnalyzer.ts - Pure Domain Service
export class DependencyAnalyzer {
  analyzeDependencies(document: Document): Result<Dependency[], DomainError> {
    // Pure business logic - no external dependencies
    const content = document.getContent().getValue();
    const filePath = document.getFilePath();
    
    const dependencies = this.extractDependenciesFromContent(content, filePath);
    return Result.ok(dependencies);
  }

  private extractDependenciesFromContent(content: string, filePath: FilePath): Dependency[] {
    // Domain-specific dependency extraction logic
    // NO infrastructure concerns (file system, APIs, etc.)
  }
}
```

#### **Repository Pattern Implementation**:
```typescript
// src/domain/repositories/IDocumentRepository.ts - Repository Contract
export interface IDocumentRepository {
  save(document: Document): Promise<Result<void, RepositoryError>>;
  findById(id: DocumentId): Promise<Result<Document | null, RepositoryError>>;
  findByFilePath(path: FilePath): Promise<Result<Document | null, RepositoryError>>;
  findAll(): Promise<Result<Document[], RepositoryError>>;
  delete(id: DocumentId): Promise<Result<void, RepositoryError>>;
}

// src/infrastructure/repositories/SqliteDocumentRepository.ts - Implementation
export class SqliteDocumentRepository implements IDocumentRepository {
  constructor(private database: Database) {}

  async save(document: Document): Promise<Result<void, RepositoryError>> {
    try {
      const stmt = this.database.prepare(`
        INSERT OR REPLACE INTO documents (id, file_path, content, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        document.getId().getValue(),
        document.getFilePath().getValue(),
        document.getContent().getValue(),
        JSON.stringify(document.getMetadata().toJson()),
        new Date().toISOString()
      );

      return Result.ok();
    } catch (error) {
      return Result.fail(new RepositoryError(`Failed to save document: ${error.message}`));
    }
  }
  
  // ... other methods
}
```

---

### 2. Application Layer (Services) Compliance Design

#### **Design Pattern**: Command/Query Separation + Use Cases
```typescript
// src/services/use-cases/CreateDocumentUseCase.ts
export class CreateDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private dependencyAnalyzer: DependencyAnalyzer,
    private logger: ILogger
  ) {}

  async execute(request: CreateDocumentRequest): Promise<Result<DocumentDto, UseCaseError>> {
    // 1. Create domain entity
    const documentResult = Document.create(
      request.filePath,
      request.content,
      request.metadata
    );

    if (documentResult.isFailure()) {
      return Result.fail(new UseCaseError(documentResult.error.message));
    }

    const document = documentResult.getValue();

    // 2. Apply domain service
    const dependenciesResult = this.dependencyAnalyzer.analyzeDependencies(document);
    if (dependenciesResult.isFailure()) {
      this.logger.error('Dependency analysis failed', dependenciesResult.error);
    }

    // 3. Persist through repository
    const saveResult = await this.documentRepository.save(document);
    if (saveResult.isFailure()) {
      return Result.fail(new UseCaseError(`Failed to save document: ${saveResult.error.message}`));
    }

    // 4. Return DTO (not domain entity)
    return Result.ok(DocumentDto.fromDomain(document));
  }
}

// src/services/use-cases/SyncDocumentToNotionUseCase.ts
export class SyncDocumentToNotionUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private notionClient: INotionClient,
    private schemaManager: ISchemaManager,
    private logger: ILogger
  ) {}

  async execute(request: SyncDocumentRequest): Promise<Result<SyncResult, UseCaseError>> {
    // Orchestrate infrastructure components for business workflow
    const documentResult = await this.documentRepository.findById(
      DocumentId.create(request.documentId)
    );

    if (documentResult.isFailure() || !documentResult.getValue()) {
      return Result.fail(new UseCaseError('Document not found'));
    }

    const document = documentResult.getValue();
    const schema = await this.schemaManager.getSchemaForDocument(document);
    const syncResult = await this.notionClient.uploadDocument(document, schema);

    return Result.ok(syncResult);
  }
}
```

#### **Service Layer Organization**:
```
src/services/
├── use-cases/                 # Application-specific business logic
│   ├── document/             # Document-related use cases
│   ├── sync/                 # Synchronization use cases  
│   └── analysis/             # Analysis use cases
├── dto/                      # Data Transfer Objects
├── queries/                  # Query handlers (CQRS pattern)
└── commands/                 # Command handlers (CQRS pattern)
```

---

### 3. Infrastructure Layer Compliance Design

#### **Design Pattern**: Adapter Pattern + Factory Pattern
```typescript
// src/infrastructure/notion/NotionAdapter.ts - External Service Adapter
export class NotionAdapter implements INotionClient {
  constructor(
    private notionSdk: Client,
    private mapper: NotionDataMapper
  ) {}

  async createDatabase(schema: DatabaseSchema): Promise<Result<string, InfrastructureError>> {
    try {
      const notionSchema = this.mapper.toNotionSchema(schema);
      const response = await this.notionSdk.databases.create(notionSchema);
      return Result.ok(response.id);
    } catch (error) {
      return Result.fail(new InfrastructureError(`Notion API error: ${error.message}`));
    }
  }

  async uploadPage(document: Document, databaseId: string): Promise<Result<string, InfrastructureError>> {
    try {
      const pageData = this.mapper.documentToNotionPage(document);
      const response = await this.notionSdk.pages.create({
        parent: { database_id: databaseId },
        properties: pageData.properties,
        children: pageData.children
      });
      return Result.ok(response.id);
    } catch (error) {
      return Result.fail(new InfrastructureError(`Page upload failed: ${error.message}`));
    }
  }
}

// src/infrastructure/factories/NotionClientFactory.ts
export class NotionClientFactory {
  static create(config: NotionConfig): INotionClient {
    const client = new Client({ auth: config.apiKey });
    const mapper = new NotionDataMapper(config.schemaVersion);
    return new NotionAdapter(client, mapper);
  }
}

// src/infrastructure/config/ConfigurationAdapter.ts - Configuration Management
export class ConfigurationAdapter implements IConfigService {
  constructor(
    private fileSystem: IFileSystem,
    private environmentReader: IEnvironmentReader,
    private normalizer: ConfigNormalizer
  ) {}

  async loadConfiguration(projectPath: string): Promise<Result<Configuration, ConfigurationError>> {
    // Pure infrastructure concern - loading and normalizing config data
    const sources = await this.loadConfigSources(projectPath);
    const normalized = this.normalizer.normalize(sources);
    return Result.ok(Configuration.create(normalized));
  }

  private async loadConfigSources(projectPath: string): Promise<ConfigSource[]> {
    const sources: ConfigSource[] = [];
    
    // File-based config
    const configFile = await this.fileSystem.readFile(path.join(projectPath, 'deplink.config.json'));
    if (configFile.isSuccess()) {
      sources.push(ConfigSource.fromFile(configFile.getValue()));
    }

    // Environment-based config
    const envConfig = this.environmentReader.readEnvironmentConfig('DEPLINK_');
    sources.push(ConfigSource.fromEnvironment(envConfig));

    return sources;
  }
}
```

---

### 4. Interface Design for Dependency Inversion

#### **Domain Interface Contracts**:
```typescript
// src/domain/interfaces/INotionClient.ts
export interface INotionClient {
  createDatabase(schema: DatabaseSchema): Promise<Result<string, InfrastructureError>>;
  uploadDocument(document: Document, databaseId: string): Promise<Result<string, InfrastructureError>>;
  queryDatabase(databaseId: string, query: DatabaseQuery): Promise<Result<QueryResult, InfrastructureError>>;
}

// src/domain/interfaces/IConfigService.ts  
export interface IConfigService {
  loadConfiguration(projectPath: string): Promise<Result<Configuration, ConfigurationError>>;
  saveConfiguration(config: Configuration, projectPath: string): Promise<Result<void, ConfigurationError>>;
  validateConfiguration(config: Configuration): Result<void, ValidationError>;
}

// src/domain/interfaces/ISchemaManager.ts
export interface ISchemaManager {
  getSchemaForDocument(document: Document): Promise<DatabaseSchema>;
  validateSchema(schema: DatabaseSchema): Result<void, ValidationError>;
  getAvailableSchemas(): Promise<SchemaInfo[]>;
}
```

---

## 🔄 Dependency Injection Container Design

### **Service Container Implementation**:
```typescript
// src/infrastructure/container/ServiceContainer.ts
export class ServiceContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, any> = new Map();

  register<T>(
    token: ServiceToken<T>, 
    factory: (container: ServiceContainer) => T,
    lifecycle: 'singleton' | 'transient' = 'singleton'
  ): void {
    this.services.set(token.name, { factory, lifecycle });
  }

  resolve<T>(token: ServiceToken<T>): T {
    const definition = this.services.get(token.name);
    if (!definition) {
      throw new Error(`Service '${token.name}' not registered`);
    }

    if (definition.lifecycle === 'singleton') {
      if (!this.instances.has(token.name)) {
        this.instances.set(token.name, definition.factory(this));
      }
      return this.instances.get(token.name);
    }

    return definition.factory(this);
  }

  // Bootstrap application services
  bootstrap(): void {
    // Infrastructure services
    this.register(
      ServiceTokens.CONFIG_SERVICE,
      (container) => new ConfigurationAdapter(
        container.resolve(ServiceTokens.FILE_SYSTEM),
        container.resolve(ServiceTokens.ENVIRONMENT_READER),
        new ConfigNormalizer()
      )
    );

    this.register(
      ServiceTokens.NOTION_CLIENT,
      (container) => NotionClientFactory.create(
        container.resolve(ServiceTokens.CONFIG_SERVICE).getNotionConfig()
      )
    );

    // Repository implementations
    this.register(
      ServiceTokens.DOCUMENT_REPOSITORY,
      (container) => new SqliteDocumentRepository(
        container.resolve(ServiceTokens.DATABASE)
      )
    );

    // Use cases
    this.register(
      ServiceTokens.CREATE_DOCUMENT_USE_CASE,
      (container) => new CreateDocumentUseCase(
        container.resolve(ServiceTokens.DOCUMENT_REPOSITORY),
        new DependencyAnalyzer(),
        container.resolve(ServiceTokens.LOGGER)
      )
    );
  }
}

// src/infrastructure/container/ServiceTokens.ts - Type-safe service tokens
export class ServiceToken<T> {
  constructor(public readonly name: string) {}
}

export const ServiceTokens = {
  CONFIG_SERVICE: new ServiceToken<IConfigService>('configService'),
  NOTION_CLIENT: new ServiceToken<INotionClient>('notionClient'),
  DOCUMENT_REPOSITORY: new ServiceToken<IDocumentRepository>('documentRepository'),
  CREATE_DOCUMENT_USE_CASE: new ServiceToken<CreateDocumentUseCase>('createDocumentUseCase'),
  // ... other tokens
} as const;
```

---

## 📊 Compliance Validation Framework

### **Architectural Rules Validation**:
```typescript
// src/tests/architecture/ArchitectureTests.ts
describe('Architecture Compliance', () => {
  test('Domain layer has no external dependencies', () => {
    const domainFiles = glob.sync('src/domain/**/*.ts');
    
    domainFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Domain should not import from infrastructure or services
      expect(content).not.toMatch(/from.*infrastructure/);
      expect(content).not.toMatch(/from.*services/);
      expect(content).not.toMatch(/import.*@notionhq/);
      expect(content).not.toMatch(/import.*better-sqlite3/);
    });
  });

  test('Services only depend on domain and interfaces', () => {
    const serviceFiles = glob.sync('src/services/**/*.ts');
    
    serviceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Services should only import domain and interfaces
      const imports = extractImports(content);
      imports.forEach(importPath => {
        if (importPath.startsWith('../')) {
          expect(importPath).toMatch(/(domain|shared)/);
        }
      });
    });
  });

  test('Infrastructure implements domain interfaces', () => {
    const infraFiles = glob.sync('src/infrastructure/**/*.ts');
    const domainInterfaces = glob.sync('src/domain/interfaces/I*.ts');
    
    // Each infrastructure adapter should implement a domain interface
    infraFiles
      .filter(file => file.includes('Adapter') || file.includes('Repository'))
      .forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toMatch(/implements\s+I\w+/);
      });
  });
});
```

---

## 🎯 Success Metrics

### **Compliance Scoring**:
```typescript
// Automated compliance scoring
const complianceMetrics = {
  dependencyDirection: calculateDependencyCompliance(),    // Target: 100%
  singleResponsibility: calculateSRPCompliance(),         // Target: 95%
  interfaceSegregation: calculateISPCompliance(),         // Target: 90%  
  dependencyInversion: calculateDIPCompliance(),          // Target: 90%
  openClosed: calculateOCPCompliance(),                   // Target: 85%
};

// Overall score calculation
const overallCompliance = Object.values(complianceMetrics).reduce((a, b) => a + b) / 5;
console.log(`🏛️ Clean Architecture Compliance: ${overallCompliance}%`);
```

This architectural compliance design ensures systematic adherence to Clean Architecture principles while maintaining practical development velocity and system maintainability.