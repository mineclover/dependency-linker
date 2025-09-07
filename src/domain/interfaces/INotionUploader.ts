/**
 * Notion Uploader Interface - Domain Layer
 * Notion 업로드 기능을 위한 도메인 인터페이스
 */

import type { ProjectFile } from '../../shared/types/index.js';

export interface UploadResult {
  success: boolean;
  notionId: string;
  url?: string;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  notionId: string;
  url?: string;
  error?: string;
}

export interface INotionUploader {
  /**
   * Upload a file to Notion database
   */
  uploadFile(file: ProjectFile, databaseId: string): Promise<UploadResult>;
  
  /**
   * Update existing file in Notion
   */
  updateFile(file: ProjectFile, notionPageId: string): Promise<UpdateResult>;
  
  /**
   * Create a new database
   */
  createDatabase(title: string, parentPageId?: string): Promise<string>;
  
  /**
   * Check if page exists in Notion
   */
  pageExists(notionPageId: string): Promise<boolean>;
  
  /**
   * Delete page from Notion
   */
  deletePage(notionPageId: string): Promise<boolean>;
  
  /**
   * Batch upload multiple files
   */
  batchUploadFiles(files: ProjectFile[], databaseId: string): Promise<UploadResult[]>;
}