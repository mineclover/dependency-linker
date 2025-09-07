# API Documentation - Clean Architecture Implementation

## Table of Contents
1. [Domain Layer APIs](#domain-layer-apis)
2. [Application Services APIs](#application-services-apis)
3. [Infrastructure APIs](#infrastructure-apis)
4. [CLI Commands](#cli-commands)
5. [Error Handling](#error-handling)
6. [Configuration](#configuration)

## Domain Layer APIs

### ProjectExploration

Core domain entity for project exploration and analysis.

```typescript
class ProjectExploration {
  constructor(config: ProcessedConfig)
  
  // Detect project type from file structure
  detectProjectType(files: ProjectFile[]): ProjectTypeDetection
  
  // Filter files based on business rules
  filterProjectFiles(files: ProjectFile[]): ProjectFile[]
  
  // Determine exploration strategy based on project size
  determineExplorationStrategy(files: ProjectFile[]): ExplorationStrategy
  
  // Validate configuration
  validateConfiguration(): boolean
}
```

**Usage Example**:
```typescript
const exploration = new ProjectExploration(config);
const projectType = exploration.detectProjectType(files);
console.log(`Detected: ${projectType.type} with ${projectType.confidence}% confidence`);
```

### DataCollectionRules

Domain entity for data collection constraints and privacy rules.

```typescript
class DataCollectionRules {
  constructor(config: ProcessedConfig)
  
  // Validate file size against limits
  validateFileSize(file: ProjectFile): boolean
  
  // Enforce collection quotas
  enforceCollectionQuotas(type: string, items: any[]): number
  
  // Filter sensitive content
  filterSensitiveContent(content: string): string
  
  // Check rate limiting
  checkRateLimit(category: string): boolean
  
  // Minimize data collection
  minimizeDataCollection(data: any): any
  
  // Anonymize file paths
  anonymizeFilePath(path: string): string
}
```

**Usage Example**:
```typescript
const rules = new DataCollectionRules(config);
if (rules.validateFileSize(file)) {
  const sanitized = rules.filterSensitiveContent(file.content);
  // Process sanitized content
}
```

### ProjectExplorationService

Domain service orchestrating project exploration workflow.

```typescript
class ProjectExplorationService {
  constructor(config: ProcessedConfig)
  
  // Main exploration method
  async exploreProject(
    projectPath: string,
    options: ExplorationOptions
  ): Promise<ExplorationResult>
}

interface ExplorationOptions {
  includeContent?: boolean;
  maxDepth?: number;
  followSymlinks?: boolean;
  respectGitignore?: boolean;
  maxFileSize?: number;
  parallelism?: boolean;
  signal?: AbortSignal;
}

interface ExplorationResult {
  success: boolean;
  data?: {
    projectType: ProjectTypeDetection;
    files: ProjectFile[];
    statistics: ProjectStatistics;
  };
  error?: Error;
  warnings?: string[];
}
```

## Application Services APIs

### BaseApplicationService

Abstract base class for all application services.

```typescript
abstract class BaseApplicationService {
  constructor(
    dependencies: ServiceDependencies,
    serviceName: string,
    options?: ServiceOptions
  )
  
  // Execute operation with error handling and metrics
  protected executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: OperationOptions
  ): Promise<T>
  
  // Validate prerequisites
  protected validatePrerequisites(checks: PrerequisiteCheck[]): void
  
  // Get configuration value
  protected getConfig<T>(path: string, defaultValue?: T): T
  
  // Get service metrics
  getMetrics(): Record<string, any[]>
  
  // Get service status
  getStatus(): ServiceStatus
}
```

### UploadService

Service for uploading and analyzing files.

```typescript
class UploadService extends BaseApplicationService {
  // Upload single file
  async uploadFile(
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadResult>
  
  // Upload multiple files
  async uploadBatch(
    files: string[],
    options?: UploadOptions
  ): Promise<BatchUploadResult>
  
  // Upload entire project
  async uploadProject(
    projectPath: string,
    options?: UploadOptions
  ): Promise<ProjectUploadResult>
}

interface UploadOptions {
  maxFunctions?: number;
  maxDependencies?: number;
  maxLibraries?: number;
  includeContent?: boolean;
  skipSQLite?: boolean;
  skipNotion?: boolean;
}

interface UploadResult {
  success: boolean;
  filePageUrl?: string;
  functions: number;
  localDependencies: number;
  libraryDependencies: number;
  errors: string[];
}
```

**Usage Example**:
```typescript
const uploadService = container.resolve<UploadService>('uploadService');
const result = await uploadService.uploadFile('/src/app.ts', {
  maxFunctions: 10,
  includeContent: true
});
```

### SyncService

Service for synchronizing project with Notion.

```typescript
class SyncService extends BaseApplicationService {
  // Sync all project components
  async syncAll(options?: SyncOptions): Promise<SyncResult>
  
  // Sync code files only
  async syncCode(options?: CodeSyncOptions): Promise<SyncResult>
  
  // Sync documentation only
  async syncDocs(options?: DocsSyncOptions): Promise<SyncResult>
  
  // Sync dependencies
  async syncDependencies(options?: DependencySyncOptions): Promise<SyncResult>
}

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  includeDependencies?: boolean;
  maxFileSize?: number;
  extensions?: string;
}
```

### ConfigurationService

Service for configuration management.

```typescript
class ConfigurationService {
  // Load and process configuration
  async loadAndProcessConfig(projectPath: string): Promise<ProcessedConfig>
  
  // Validate configuration
  async validateConfig(config: ProcessedConfig): Promise<ValidationResult>
  
  // Get cached configuration
  getCachedConfig(): ProcessedConfig | null
  
  // Clear configuration cache
  clearCache(): void
  
  // Apply business rules
  applyBusinessRules(config: ProcessedConfig): ProcessedConfig
}
```

## Infrastructure APIs

### NotionApiService

Infrastructure service for Notion API operations.

```typescript
class NotionApiService {
  constructor(clientInstance: INotionClientInstance)
  
  // Page operations
  async createPage(data: PageData): Promise<NotionRequestResult<Page>>
  async updatePage(pageId: string, data: PageUpdate): Promise<NotionRequestResult<Page>>
  async retrievePage(pageId: string): Promise<NotionRequestResult<Page>>
  
  // Database operations
  async queryDatabase(
    databaseId: string,
    query?: DatabaseQuery
  ): Promise<NotionRequestResult<QueryResult>>
  
  async retrieveDatabase(
    databaseId: string
  ): Promise<NotionRequestResult<Database>>
  
  async updateDatabase(
    databaseId: string,
    data: DatabaseUpdate
  ): Promise<NotionRequestResult<Database>>
  
  // Batch operations
  async createPageBatch(
    pages: PageData[],
    options?: BatchOptions
  ): Promise<BatchResult>
  
  // Health check
  async healthCheck(): Promise<HealthCheckResult>
}

interface NotionRequestResult<T> {
  success: boolean;
  data?: T;
  error?: NotionError;
}
```

**Usage Example**:
```typescript
const notionService = new NotionApiService(clientInstance);
const result = await notionService.createPage({
  parent: { page_id: 'parent-id' },
  properties: {
    Name: { title: [{ text: { content: 'New Page' } }] }
  }
});
```

### NotionClientFactory

Factory for creating Notion client instances.

```typescript
class NotionClientFactory {
  // Create configured client instance
  static createClient(config: NotionClientConfig): NotionClientInstance
  
  // Validate client configuration
  static validateConfig(config: NotionClientConfig): void
  
  // Get cached instance
  static getCachedInstance(key: string): NotionClientInstance | null
}

interface NotionClientConfig {
  apiKey: string;
  workspaceUrl: string;
  parentPageId: string;
  projectPath: string;
}
```

### NotionRequestHandler

Handles request execution with retry logic and circuit breaker.

```typescript
class NotionRequestHandler {
  constructor(clientInstance: INotionClientInstance)
  
  // Execute request with error handling
  async executeRequest<T>(
    requestType: NotionRequestType,
    requestFn: () => Promise<T>,
    options?: NotionRequestOptions
  ): Promise<NotionRequestResult<T>>
}

interface NotionRequestOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  skipCircuitBreaker?: boolean;
}
```

## CLI Commands

### Initialize Command

Initialize project configuration.

```bash
deplink init [options]
```

**Options**:
- `--yes, -y`: Skip interactive prompts
- `--auto-detect`: Auto-detect project type
- `--force`: Overwrite existing configuration

**Example**:
```bash
deplink init --auto-detect --yes
```

### Status Command

Display project and synchronization status.

```bash
deplink status
```

**Output**:
```
📊 Project Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Project: My Project
🏗️  Type: typescript
📍 Root: /path/to/project
🌳 Git: Yes

⚙️ Configuration:
✅ Valid: Yes

🔗 Notion Connection:
✅ Connected: Yes
```

### Validate Command

Validate project configuration and system.

```bash
deplink validate [options]
```

**Options**:
- `--system`: Perform full system validation
- `--fix`: Attempt to fix issues automatically

### Sync Command

Synchronize project with Notion.

```bash
deplink sync [options]
```

**Options**:
- `-a, --all`: Sync all components (default)
- `-c, --code`: Sync code files only
- `-d, --docs`: Sync documentation only
- `--dependencies`: Sync dependencies only
- `--dry-run`: Preview changes without making them
- `-f, --force`: Force overwrite existing entries
- `--pattern <pattern>`: File pattern to match
- `--include-content`: Include file content

**Example**:
```bash
deplink sync --code --pattern "src/**/*.ts" --dry-run
```

### Upload Command

Upload and analyze files.

```bash
deplink upload [options]
```

**Options**:
- `-f, --file <path>`: Upload single file
- `-b, --batch <files>`: Upload multiple files
- `-p, --project [path]`: Upload entire project
- `--max-functions <n>`: Maximum functions to create
- `--max-dependencies <n>`: Maximum dependencies
- `--include-content`: Include file content
- `--skip-notion`: Skip Notion upload

**Example**:
```bash
deplink upload --file src/app.ts --include-content
```

### Health Command

Perform system health check.

```bash
deplink health
```

**Output**:
```
🏥 System Health Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Overall Health: HEALTHY
Total Issues: 0
Critical Issues: 0

📊 Components:
   ✅ configuration: HEALTHY
   ✅ filesystem: HEALTHY
   ✅ database: HEALTHY
   ✅ notion: HEALTHY
```

## Error Handling

### Error Types

```typescript
// Domain errors
class DomainError extends Error {
  constructor(message: string, public code: string)
}

// Infrastructure errors
class InfrastructureError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  )
}

// Service errors
class ServiceOperationError extends Error {
  constructor(
    message: string,
    public originalError: Error | null,
    public serviceName: string,
    public operationName: string,
    public attempts: number
  )
}

// Validation errors
class ServiceValidationError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public failures: ValidationFailure[]
  )
}
```

### Error Codes

| Code | Description | Layer |
|------|-------------|-------|
| `DOMAIN_VALIDATION_FAILED` | Domain validation error | Domain |
| `INVALID_PROJECT_PATH` | Invalid project path | Domain |
| `FILE_SIZE_EXCEEDED` | File exceeds size limit | Domain |
| `NOTION_AUTH_ERROR` | Authentication failed | Infrastructure |
| `NOTION_RATE_LIMITED` | Rate limit exceeded | Infrastructure |
| `NOTION_VALIDATION_ERROR` | Invalid request data | Infrastructure |
| `CIRCUIT_BREAKER_OPEN` | Circuit breaker triggered | Infrastructure |
| `SERVICE_OPERATION_FAILED` | Service operation failed | Application |
| `PREREQUISITES_NOT_MET` | Prerequisites validation failed | Application |

### Error Handling Example

```typescript
try {
  const result = await uploadService.uploadFile(filePath);
  console.log('Success:', result);
} catch (error) {
  if (error instanceof DomainError) {
    // Handle domain validation errors
    console.error(`Validation failed: ${error.message}`);
  } else if (error instanceof InfrastructureError) {
    // Handle infrastructure errors
    console.error(`Infrastructure issue: ${error.code}`);
    if (error.code === 'NOTION_RATE_LIMITED') {
      // Wait and retry
      await delay(60000);
    }
  } else if (error instanceof ServiceOperationError) {
    // Handle service errors
    console.error(`Operation failed after ${error.attempts} attempts`);
  }
}
```

## Configuration

### Configuration Structure

```typescript
interface ProcessedConfig {
  project: {
    name: string;
    path: string;
    type: string;
    version?: string;
  };
  
  notion: {
    apiKey: string;
    workspaceUrl: string;
    parentPageId: string;
    databases: {
      files: string;
      functions: string;
      dependencies: string;
      libraries: string;
      classes: string;
    };
    workspaceInfo?: {
      userId: string;
      projectName: string;
      setupDate: string;
      workspaceUrl: string;
    };
    git?: {
      enabled: boolean;
      autoSync: boolean;
      watchBranches: string[];
      ignorePatterns: string[];
    };
  };
  
  features: {
    sqliteIndexing: boolean;
    notionUpload: boolean;
    gitIntegration: boolean;
    autoSync: boolean;
  };
  
  environment: string;
  
  parser: {
    extensions: string[];
    ignorePatterns: string[];
    maxFileSize?: number;
  };
}
```

### Configuration Example

```json
{
  "project": {
    "name": "My Project",
    "path": ".",
    "type": "typescript",
    "version": "1.0.0"
  },
  "notion": {
    "apiKey": "secret_xxx",
    "workspaceUrl": "https://notion.so/workspace",
    "parentPageId": "parent-page-id",
    "databases": {
      "files": "files-db-id",
      "functions": "functions-db-id",
      "dependencies": "deps-db-id",
      "libraries": "libs-db-id",
      "classes": "classes-db-id"
    }
  },
  "features": {
    "sqliteIndexing": true,
    "notionUpload": true,
    "gitIntegration": true,
    "autoSync": false
  },
  "parser": {
    "extensions": [".ts", ".tsx", ".js", ".jsx"],
    "ignorePatterns": ["node_modules/**", "*.test.ts"],
    "maxFileSize": 1048576
  }
}
```

## Response Formats

### Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    duration: number;
    version: string;
  };
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    context?: {
      operation: string;
      timestamp: string;
      requestId?: string;
    };
  };
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

## Rate Limiting

### Rate Limit Configuration

```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfter?: number;
}

const rateLimits = {
  notion: {
    maxRequests: 3,
    windowMs: 1000, // 3 requests per second
    retryAfter: 1000
  },
  fileAnalysis: {
    maxRequests: 10,
    windowMs: 60000 // 10 files per minute
  }
};
```

### Rate Limit Headers

```typescript
interface RateLimitInfo {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': string;
  'Retry-After'?: number;
}
```

## Webhooks and Events

### Event Types

```typescript
enum EventType {
  FILE_UPLOADED = 'file.uploaded',
  SYNC_STARTED = 'sync.started',
  SYNC_COMPLETED = 'sync.completed',
  ERROR_OCCURRED = 'error.occurred',
  CONFIG_UPDATED = 'config.updated'
}
```

### Event Payload

```typescript
interface EventPayload<T = any> {
  event: EventType;
  timestamp: string;
  data: T;
  metadata?: Record<string, any>;
}
```

### Event Subscription

```typescript
// Subscribe to events
eventEmitter.on(EventType.FILE_UPLOADED, (payload: EventPayload) => {
  console.log('File uploaded:', payload.data.filePath);
});

// Emit events
eventEmitter.emit(EventType.FILE_UPLOADED, {
  event: EventType.FILE_UPLOADED,
  timestamp: new Date().toISOString(),
  data: { filePath: '/src/app.ts', pageUrl: 'https://notion.so/...' }
});
```