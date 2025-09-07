/**
 * Shared Types - 공통 타입 정의
 * 전체 시스템에서 사용되는 공통 타입들
 */

// 기본 식별자 타입들
export type FileId = string;
export type NotionPageId = string;
export type NotionDatabaseId = string;
export type ProjectPath = string;
export type RelativePath = string;

// Legacy type compatibility - consolidated from src/types/index.ts
export interface ProjectFile {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: Date;
  content?: string;
  dependencies?: string[];
  notionPageId?: string;
  importedBy?: string[];
}

// File Status for tracking synchronization
export interface FileStatus {
  filePath: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  lastSynced?: Date;
  notionPageId?: string;
  syncStatus: 'synced' | 'modified' | 'new' | 'error' | 'deleted';
  error?: string;
}

export interface NotionDatabases {
  files: string;
  functions?: string;
  docs?: string;
  nodes?: string;
  dependencies?: string;
}

export interface NotionConfig {
  apiKey: string;
  databases: NotionDatabases;
  parentPageId?: string;
  environment?: 'development' | 'test' | 'production';
  workspaceInfo?: {
    userId: string;
    userName?: string;
    setupDate: string;
    projectName: string;
    workspaceUrl?: string;
    rootPageId?: string;
    environment?: string;
  };
  git?: {
    enabled: boolean;
    autoSync: boolean;
    watchBranches: string[];
    ignorePatterns: string[];
  };
  environments?: {
    [env: string]: {
      databases: NotionDatabases;
      parentPageId?: string;
      workspaceUrl?: string;
      rootPageId?: string;
    };
  };
}

export interface UploadResult {
  file: ProjectFile;
  notionPageId: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
}

export interface LocalDatabase {
  projectPath: string;
  lastSync: string;
  files: {
    [relativePath: string]: {
      notionPageId: string;
      lastModified: string;
      hash?: string;
    };
  };
  dependencies: {
    [fromFile: string]: {
      imports: string[];
      notionPageIds: string[];
    };
  };
}

export interface ApiQueue {
  add(operation: () => Promise<any>): Promise<any>;
  process(): Promise<void>;
  size(): number;
}

// 의존성 관련 타입들
export interface DependencyNode {
  id: FileId;
  path: RelativePath;
  type: 'file' | 'module' | 'package';
  dependencies: FileId[];
  dependents: FileId[];
  metadata?: Record<string, unknown>;
}

// Enhanced DependencyGraph with legacy compatibility
export interface DependencyGraph {
  nodes: Map<FileId, DependencyNode>;
  edges: Array<{ from: FileId; to: FileId; type: DependencyType }>;
  
  // Legacy format support
  [filePath: string]: {
    imports: string[];
    exports: string[];
    dependencies: string[];
    importedBy: string[];
    notionPageIds: string[];
  } | Map<FileId, DependencyNode> | Array<{ from: FileId; to: FileId; type: DependencyType }>;
}

export interface ProjectStructure {
  rootPath: string;
  files: ProjectFile[];
  dependencies: DependencyGraph;
  packageJson?: any;
  tsConfig?: any;
}

export interface GitChangeInfo {
  modifiedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  renamedFiles: { from: string; to: string }[];
  commitHash: string;
  commitMessage: string;
  author: string;
  timestamp: string;
}

// Schema Validation & Property Mapping Types
export interface PropertyMapping {
  localName: string;
  notionPropertyId: string;
  notionPropertyName: string;
  notionPropertyType: string;
  sqliteKey?: string;
  required: boolean;
  lastValidated?: Date;
}

export interface DatabasePropertyMappings {
  databaseId: string;
  databaseName: string;
  properties: Record<string, PropertyMapping>;
  lastSynced: Date;
  schemaVersion: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  timestamp: Date;
  validatedBy: 'schema' | 'runtime' | 'config';
}

export interface ValidationError {
  code: string;
  name?: string;
  message: string;
  severity: 'critical' | 'error' | 'warning';
  context?: {
    file?: string;
    property?: string;
    databaseId?: string;
    expected?: any;
    actual?: any;
    error?: string;
    configType?: string;
    databaseType?: string;
    environment?: string;
    responseTime?: number;
  };
  suggestedFix?: string;
}

// Database Operation Types
export interface DatabaseInfo {
  id: string;
  name: string;
  properties: Record<string, any>;
  lastEditedTime: string;
  createdTime: string;
}

export interface DatabaseCreateOptions {
  title?: Array<{ type: 'text'; text: { content: string } }>;
  properties?: Record<string, any>;
  description?: Array<{ type: 'text'; text: { content: string } }>;
}

export interface DatabaseQueryOptions {
  filter?: any;
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;
  pageSize?: number;
  startCursor?: string;
}

export interface DatabaseQueryResult {
  results: any[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
  canIgnore: boolean;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'improvement' | 'deprecation';
  message: string;
  impact: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  autoFix?: () => Promise<void>;
}

export interface SchemaValidationReport {
  databaseId: string;
  databaseName: string;
  schemaConsistency: ValidationResult;
  propertyMappings: ValidationResult;
  configurationSync: ValidationResult;
  runtimeValidation: ValidationResult;
  overallStatus: 'healthy' | 'warning' | 'critical';
  lastValidated: Date;
  nextValidationDue?: Date;
}

export interface ConfigurationConsistency {
  globalConfig: string; // file path
  projectConfig: string; // file path
  schemaExport: string; // file path
  conflicts: ConfigConflict[];
  missingProperties: string[];
  recommendations: string[];
}

export interface ConfigConflict {
  property: string;
  globalValue: any;
  projectValue: any;
  schemaValue?: any;
  resolution: 'use_global' | 'use_project' | 'use_schema' | 'manual_review';
  reason: string;
}

// Export type fixes
export type DependencyType = 'import' | 'require' | 'reference' | 'documentation';

// 문서 관련 타입들
export interface DocumentMetadata {
  id: FileId;
  notionPageId?: NotionPageId;
  title?: string;
  lastSynced?: Date;
  localDocId?: string;
  wordCount?: number;
  readingTime?: number;
  tags?: string[];
}

export interface DocumentLink {
  sourceFile: FileId;
  targetDocument: NotionPageId | FileId;
  linkType: 'documentation' | 'reference' | 'example';
  description?: string;
}

// 워크스페이스 관련 타입들
export interface WorkspaceConfig {
  apiKey: string;
  databases: Record<string, NotionDatabaseId>;
  parentPageId?: NotionPageId;
  projectPath: ProjectPath;
  environment: 'development' | 'test' | 'production';
}

export interface SyncStatus {
  isHealthy: boolean;
  lastSync?: Date;
  filesTracked: number;
  documentsLinked: number;
  dependenciesFound: number;
  issues: string[];
}

// CLI 관련 타입들
export interface CliOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  format?: 'json' | 'table' | 'tree' | 'plain';
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// 분석 결과 타입들
export interface AnalysisStatistics {
  totalFiles: number;
  processedFiles: number;
  cacheHitRate: number;
  cachedFiles: number;
  resolvedDependencies: number;
  externalDependencies: number;
  circularDependencies: number;
  cacheEfficiency: number;
  mostConnectedFiles?: Array<{
    path: string;
    connections: number;
  }>;
}

export interface DependencyAnalysisResult {
  statistics: AnalysisStatistics;
  dependencies?: {
    [filePath: string]: string[];
  };
  dependents?: {
    [filePath: string]: string[];
  };
  circularDependencies?: CircularDependency[];
}

export interface CircularDependency {
  cycle: Array<{ relativePath: string }>;
  length: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 프로젝트 구조 타입들
export interface ProjectStructureResult {
  structure: {
    files: Array<{
      relativePath: string;
      path: string;
      extension: string;
      size?: number;
    }>;
  };
  dependencies?: DependencyAnalysisResult;
}

// 탐색 결과 타입들
export interface ExploreResult {
  fileInfo?: {
    path: string;
    relativePath: string;
    size: number;
    extension: string;
  };
  content?: {
    lineCount: number;
    characterCount: number;
    wordCount: number;
  };
  dependencies?: {
    imports: string[];
    exports: string[];
  };
  dependents?: string[];
  directoryInfo?: {
    name: string;
    fileCount: number;
    subdirectoryCount: number;
  };
  contents?: {
    files: string[];
    directories: string[];
  };
  docs?: {
    [key: string]: any;
  };
  syncStatus?: {
    synced: number;
    modified: number;
    new: number;
    errors: number;
  };
  codeLinks?: {
    linkedFiles: number;
    totalLinks: number;
  };
}

// 단일 파일 의존성 결과 타입
export interface SingleFileDependencyResult {
  file: {
    path: string;
    relativePath: string;
  };
  dependencies: string[];
  dependents: string[];
}

// Notion API 관련 타입들 - any 타입 제거용
export interface NotionPageProperties {
  [key: string]: {
    type: string;
    [key: string]: unknown;
  };
}

export interface NotionBlock {
  id: string;
  type: string;
  object: 'block';
  created_time: string;
  last_edited_time: string;
  created_by: { id: string; object: 'user' };
  last_edited_by: { id: string; object: 'user' };
  archived: boolean;
  has_children: boolean;
  [blockType: string]: unknown;
}

export interface NotionPage {
  id: string;
  object: 'page';
  created_time: string;
  last_edited_time: string;
  created_by: { id: string; object: 'user' };
  last_edited_by: { id: string; object: 'user' };
  cover: unknown | null;
  icon: unknown | null;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    [key: string]: string | boolean;
  };
  archived: boolean;
  properties: NotionPageProperties;
  url: string;
}

// Front Matter 타입 정의
export interface FrontMatterData {
  title?: string;
  description?: string;
  tags?: string[];
  dependencies?: string[];
  notion_id?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  [key: string]: unknown;
}

// 문서 파싱 관련 타입
export interface DocumentParseResult {
  title?: string;
  content: string;
  frontMatter?: FrontMatterData;
  wordCount: number;
  readingTime: number;
  codeBlocks?: {
    language: string;
    code: string;
    lineNumbers?: boolean;
  }[];
}

// 동기화 관련 타입
export interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  target: 'notion' | 'local';
  entityType: 'file' | 'document' | 'block';
  entityId: string;
  data?: unknown;
  rollbackData?: unknown;
}

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  batchSize?: number;
  options?: Record<string, unknown>;
}

// 블록 관련 타입
export interface Block {
  id: string;
  type: string;
  content: string;
  properties?: Record<string, unknown>;
  children?: Block[];
  metadata?: {
    lineStart?: number;
    lineEnd?: number;
    indentLevel?: number;
  };
}

export interface BlockDiff {
  type: 'add' | 'remove' | 'modify' | 'move';
  block?: Block;
  oldBlock?: Block;
  newBlock?: Block;
  position?: number;
  data: unknown;
}

// 에러 타입들
export class DependencyLinkerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DependencyLinkerError';
  }
}

export class NotionApiError extends DependencyLinkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOTION_API_ERROR', details);
    this.name = 'NotionApiError';
  }
}

export class FileSystemError extends DependencyLinkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', details);
    this.name = 'FileSystemError';
  }
}

export class ValidationError extends DependencyLinkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Re-export watcher types
export * from './watcher.js';