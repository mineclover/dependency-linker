/**
 * Upload Service Interfaces
 * Defines contracts for upload business logic and infrastructure
 */

import type { 
  ProjectFile, 
  UploadResult, 
  NotionConfig 
} from '../../shared/types/index.js';

/**
 * Upload workflow options
 */
export interface ProjectUploadOptions {
  skipExisting?: boolean;
  updateExisting?: boolean;
  includeContent?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
  schemaPath?: string;
  filePattern?: string[];
  documentPattern?: string[];
  maxFileSize?: number;
  maxContentLength?: number;
}

/**
 * Upload workflow result with business context
 */
export interface ProjectUploadResult {
  success: boolean;
  tablesCreated?: Record<string, { id: string; success: boolean }>;
  dataResults?: {
    files?: { created: number; updated: number; failed: number; errors: string[] };
    documents?: { created: number; updated: number; failed: number; errors: string[] };
  };
  summary?: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    warnings: string[];
  };
  errors?: string[];
}

/**
 * Project Upload Service Interface
 * Business layer contract for project upload workflows
 */
export interface IProjectUploadService {
  /**
   * Upload project files with business workflow orchestration
   */
  uploadProject(
    projectPath: string,
    options?: ProjectUploadOptions
  ): Promise<ProjectUploadResult>;

  /**
   * Upload individual file with business rules
   */
  uploadFile(
    filePath: string,
    options?: ProjectUploadOptions
  ): Promise<UploadResult>;

  /**
   * Validate upload prerequisites
   */
  validateUploadPrerequisites(
    projectPath: string,
    config: NotionConfig
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Get upload progress and statistics
   */
  getUploadStatistics(): {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    averageUploadTime: number;
  };
}

/**
 * Upload Repository Interface
 * Infrastructure layer contract for upload data access
 */
export interface IUploadRepository {
  /**
   * Upload file to external system
   */
  uploadFile(
    file: ProjectFile,
    config: NotionConfig,
    options?: ProjectUploadOptions
  ): Promise<UploadResult>;

  /**
   * Check if file already exists in target system
   */
  fileExists(
    filePath: string,
    config: NotionConfig
  ): Promise<boolean>;

  /**
   * Update existing file in target system
   */
  updateFile(
    file: ProjectFile,
    config: NotionConfig,
    options?: ProjectUploadOptions
  ): Promise<UploadResult>;

  /**
   * Delete file from target system
   */
  deleteFile(
    filePath: string,
    config: NotionConfig
  ): Promise<boolean>;
}