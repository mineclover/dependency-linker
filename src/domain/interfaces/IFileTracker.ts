/**
 * File Tracker Interface - Domain Layer
 * 파일 상태 추적을 위한 도메인 인터페이스
 */

export interface FileStatus {
  path: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  extension: string;
  syncStatus: 'synced' | 'needs_sync' | 'not_synced' | 'error';
  notionPageId?: string;
  hash?: string;
  dependencies?: string[];
}

export interface IFileTracker {
  /**
   * Get all source files from the project
   */
  getAllSourceFiles(): Promise<FileStatus[]>;
  
  /**
   * Get status of a specific file
   */
  getFileStatus(filePath: string): Promise<FileStatus | null>;
  
  /**
   * Get files that need synchronization
   */
  getFilesNeedingSync(): Promise<FileStatus[]>;
  
  /**
   * Update file status after sync
   */
  updateFileStatus(filePath: string, status: Partial<FileStatus>): Promise<void>;
  
  /**
   * Mark file as synced
   */
  markFileSynced(filePath: string, notionPageId: string): Promise<void>;
  
  /**
   * Remove file tracking
   */
  removeFile(filePath: string): Promise<void>;
}