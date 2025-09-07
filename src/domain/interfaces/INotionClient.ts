/**
 * Notion Client Interface - Clean Architecture Domain Layer
 * Abstracts Notion API operations for dependency injection
 */

import type { 
  NotionPageId, 
  NotionDatabaseId,
  ProjectPath,
  FileId
} from '../../shared/types/index.js';

// Core Notion operation interfaces
export interface INotionClient {
  createDatabase(name: string, type: string): Promise<string>;
  uploadFile(filePath: string, content: string, databaseId: string): Promise<IUploadResult>;
  updatePage(pageId: string, properties: Record<string, any>): Promise<boolean>;
  deletePage(pageId: string): Promise<boolean>;
  queryDatabase(databaseId: string, filter?: any): Promise<any[]>;
  getPage(pageId: string): Promise<any>;
  createPage(databaseId: string, properties: Record<string, any>, content?: string): Promise<string>;
}

export interface INotionUploader extends INotionClient {
  uploadDoc(metadata: IDocumentMetadata, databaseId: string, existingDocs?: any[]): Promise<IUploadResult>;
  addDocsToFilesRelation(docsDbId: string, filesDbId: string): Promise<void>;
  queryExistingDocs(databaseId: string): Promise<any[]>;
  removeContentProperty(databaseId: string): Promise<void>;
  setWorkspaceUrl(url: string): void;
  setParentPageId(pageId: string): void;
}

// File tracking interface
export interface IFileTracker {
  trackFile(filePath: string, notionPageId: string): Promise<void>;
  getFileInfo(filePath: string): Promise<IFileInfo | null>;
  updateFileStatus(filePath: string, status: string): Promise<void>;
  getAllTrackedFiles(): Promise<IFileInfo[]>;
  removeFile(filePath: string): Promise<void>;
}

// Configuration management interface
export interface IConfigManager {
  getConfig(): Promise<IWorkspaceConfig>;
  updateConfig(updates: Partial<IWorkspaceConfig>): Promise<void>;
  validateConfig(): Promise<boolean>;
  getProjectPath(): string;
  getNotionConfig(): Promise<INotionConfig>;
}

// Git integration interface
export interface IGitIntegration {
  setupHooks(): Promise<void>;
  removeHooks(): Promise<void>;
  getChangedFiles(): Promise<string[]>;
  getCurrentBranch(): Promise<string>;
  isGitRepository(): Promise<boolean>;
}

// Ignore pattern management interface
export interface IIgnoreManager {
  shouldIgnore(filePath: string): boolean;
  addPattern(pattern: string): void;
  removePattern(pattern: string): void;
  getPatterns(): string[];
}

// Supporting types for interfaces
export interface IUploadResult {
  success: boolean;
  notionId?: string;
  skipped?: boolean;
  error?: string;
}

export interface IDocumentMetadata {
  name: string;
  content: string;
  documentType: string;
  filePath: string;
  wordCount: number;
  readingTime: number;
  relatedFileIds: string[];
}

export interface IFileInfo {
  filePath: string;
  notionPageId: string;
  lastModified: Date;
  status: string;
  hash?: string;
}

export interface IWorkspaceConfig {
  apiKey: string;
  databases: Record<string, NotionDatabaseId>;
  parentPageId?: NotionPageId;
  projectPath: ProjectPath;
  environment: 'development' | 'test' | 'production';
}

export interface INotionConfig {
  apiKey: string;
  databases: {
    files?: string;
    docs?: string;
    dependencies?: string;
  };
  parentPageId?: string;
  workspaceInfo?: {
    workspaceUrl?: string;
    userId?: string;
    projectName?: string;
  };
}