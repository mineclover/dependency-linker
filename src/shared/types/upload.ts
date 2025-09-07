/**
 * Upload System - Unified Types
 * 모든 업로드 관련 타입들을 통합 정의
 */

import type { LanguageAnalysisResult } from '../parsers/common/parserInterfaces.js';

// Base Upload Types
export interface BaseUploadOptions {
  includeContent?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export interface BaseUploadResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  errors?: string[];
}

// File Upload Types
export interface FileUploadOptions extends BaseUploadOptions {
  analyzeOnly?: boolean;
  uploadDependencies?: boolean;
  generateReport?: boolean;
  maxFunctions?: number;
  maxDependencies?: number;
  maxLibraries?: number;
  skipSQLite?: boolean;
  skipNotion?: boolean;
}

export interface FileUploadResult extends BaseUploadResult {
  filePageId?: string;
  filePageUrl?: string;
  localDependencies: number;
  libraryDependencies: number;
  functions: number;
  classes: number;
  sqliteFileId?: number;
  analysisTime: number;
  dependencyStats?: any;
  dependencyUploadResult?: DependencyUploadResult;
}

// Project Upload Types  
export interface ProjectUploadOptions extends BaseUploadOptions {
  pattern?: string;
  maxFileSize?: number;
  extensions?: string[];
  concurrency?: number;
}

export interface ProjectUploadResult extends BaseUploadResult {
  totalFiles: number;
  uploadedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  results: FileUploadResult[];
  summary: {
    totalDependencies: number;
    totalFunctions: number;
    totalClasses: number;
    processingTime: number;
  };
}

// Dependency Upload Types
export interface DependencyUploadResult extends BaseUploadResult {
  uploadedDependencies: number;
  createdRelations: number;
  dependencyGraphPageId?: string;
  libraryManagementResult?: LibraryManagementResult;
  summary: {
    localDependencies: number;
    externalLibraries: number;
    internalModules: number;
    circularDependencies: number;
    totalRelations: number;
    librariesCreated: number;
    librariesUpdated: number;
  };
}

export interface LibraryManagementResult extends BaseUploadResult {
  processedLibraries: number;
  createdPages: number;
  updatedPages: number;
  linkedDependencies: number;
  libraryPages: Map<string, string>; // name -> pageId
}

// Batch Upload Types
export interface BatchUploadOptions extends BaseUploadOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  retryAttempts?: number;
}

export interface BatchUploadResult extends BaseUploadResult {
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  results: FileUploadResult[];
}

// Notion-specific Types
export interface NotionUploadOptions extends BaseUploadOptions {
  validateSchema?: boolean;
  createMissingDatabases?: boolean;
  updateProperties?: boolean;
}

export interface NotionPageCreationOptions {
  parent: {
    database_id?: string;
    page_id?: string;
  };
  properties: Record<string, any>;
  children?: any[];
  icon?: any;
  cover?: any;
}

export interface NotionPageUpdateOptions {
  properties?: Record<string, any>;
  archived?: boolean;
}

// Unified Service Interface  
export interface IUploadService {
  uploadFile(filePath: string, options?: FileUploadOptions): Promise<FileUploadResult>;
  uploadProject(projectPath: string, options?: FileUploadOptions): Promise<FileUploadResult>;
  uploadBatch(files: string[], options?: FileUploadOptions): Promise<FileUploadResult[]>;
}

// Repository Interface
export interface IUploadRepository {
  createPage(options: NotionPageCreationOptions): Promise<{ success: boolean; data?: any; error?: string }>;
  updatePage(pageId: string, options: NotionPageUpdateOptions): Promise<{ success: boolean; error?: string }>;
  getPage(pageId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  queryDatabase(databaseId: string, filter?: any): Promise<{ success: boolean; data?: any[]; error?: string }>;
}

// Analysis Result Mapping
export interface AnalysisResultProcessor {
  processAnalysisResult(result: LanguageAnalysisResult, options: FileUploadOptions): Promise<FileUploadResult>;
  createDependencyPages(dependencies: any[], databaseId: string): Promise<{ id: string; source: string }[]>;
  createFunctionPages(functions: any[], databaseId: string): Promise<{ id: string; name: string }[]>;
  createClassPages(classes: any[], databaseId: string): Promise<{ id: string; name: string }[]>;
  createLibraryPages(libraries: any[], databaseId: string): Promise<{ id: string; source: string }[]>;
}