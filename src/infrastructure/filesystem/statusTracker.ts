/**
 * File Status Tracker - Infrastructure Layer
 * 파일 상태, Notion 동기화 추적 및 빠른 파일 조회를 담당하는 인프라스트럭처 컴포넌트
 */

import { readFile, writeFile, existsSync } from 'fs';
import { promisify } from 'util';
import { glob } from 'glob';
import { join, relative, extname } from 'path';
import type { 
  NotionPageId, 
  FileId, 
  ProjectPath,
  FileSystemError 
} from '../../shared/types/index.js';
import { logger } from '../../shared/utils/index.js';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// 레거시 호환성을 위한 타입들
interface LegacyProjectFile {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: Date;
  notionId?: string;
}

interface LegacyLocalDatabase {
  projectPath: string;
  lastSync: string;
  files: Record<string, {
    notionPageId: string;
    lastModified: string;
    hash: string;
  }>;
  dependencies: Record<string, any>;
}

export interface FileStatus {
  path: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  extension: string;
  notionPageId?: NotionPageId;
  syncStatus: 'not_synced' | 'synced' | 'needs_update' | 'error';
  lastSync?: Date;
  hash?: string;
}

export interface SyncStatistics {
  total: number;
  synced: number;
  needsUpdate: number;
  notSynced: number;
  errors: number;
}

/**
 * 파일 상태 추적기
 */
export class FileStatusTracker {
  private projectPath: ProjectPath;
  private dbPath: string;
  private db: LegacyLocalDatabase | null = null;

  constructor(projectPath: ProjectPath) {
    this.projectPath = projectPath;
    this.dbPath = join(projectPath, '.deplink-db.json');
  }

  /**
   * 로컬 데이터베이스 초기화 또는 로드
   */
  async initialize(): Promise<void> {
    try {
      if (existsSync(this.dbPath)) {
        const content = await readFileAsync(this.dbPath, 'utf-8');
        this.db = JSON.parse(content);
        logger.info('로컬 데이터베이스 로드 완료');
      } else {
        this.db = {
          projectPath: this.projectPath,
          lastSync: new Date().toISOString(),
          files: {},
          dependencies: {}
        };
        await this.save();
        logger.info('새 로컬 데이터베이스 생성');
      }
    } catch (error) {
      logger.warning(`데이터베이스 로드 실패, 새로 생성: ${error}`);
      this.db = {
        projectPath: this.projectPath,
        lastSync: new Date().toISOString(),
        files: {},
        dependencies: {}
      };
      await this.save();
    }
  }

  /**
   * 데이터베이스를 디스크에 저장
   */
  async save(): Promise<void> {
    if (!this.db) {
      throw new FileSystemError('데이터베이스가 초기화되지 않았습니다');
    }

    try {
      await writeFileAsync(this.dbPath, JSON.stringify(this.db, null, 2));
      logger.debug('로컬 데이터베이스 저장 완료');
    } catch (error) {
      throw new FileSystemError(`데이터베이스 저장 실패: ${error}`);
    }
  }

  /**
   * 프로젝트의 모든 소스 파일 가져오기
   */
  async getAllSourceFiles(): Promise<FileStatus[]> {
    const patterns = ['src/**/*.{ts,js,tsx,jsx}'];
    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.projectPath,
          absolute: true,
          nodir: true
        });
        files.push(...matches);
      } catch (error) {
        logger.error(`패턴 검색 실패: ${pattern} - ${error}`);
      }
    }

    const uniqueFiles = [...new Set(files)];
    const fileStatuses: FileStatus[] = [];

    for (const filePath of uniqueFiles) {
      try {
        const status = await this.getFileStatus(filePath);
        fileStatuses.push(status);
      } catch (error) {
        logger.warning(`파일 상태 가져오기 실패: ${filePath} - ${error}`);
      }
    }

    return fileStatuses;
  }

  /**
   * 단일 파일의 상태 가져오기
   */
  async getFileStatus(filePath: string): Promise<FileStatus> {
    const relativePath = relative(this.projectPath, filePath);
    
    try {
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      const extension = extname(filePath);

      const dbEntry = this.db?.files[relativePath];
      
      const status: FileStatus = {
        path: filePath,
        relativePath,
        size: stats.size,
        lastModified: stats.mtime,
        extension,
        notionPageId: dbEntry?.notionPageId,
        syncStatus: this.determineSyncStatus(dbEntry, stats.mtime),
        lastSync: dbEntry ? new Date(this.db!.lastSync) : undefined,
        hash: dbEntry?.hash
      };

      return status;
    } catch (error) {
      throw new FileSystemError(`파일 상태 가져오기 실패: ${filePath} - ${error}`);
    }
  }

  /**
   * Notion 동기화 후 파일 상태 업데이트
   */
  async updateFileStatus(relativePath: string, notionPageId: NotionPageId): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const filePath = join(this.projectPath, relativePath);
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      
      this.db!.files[relativePath] = {
        notionPageId,
        lastModified: stats.mtime.toISOString(),
        hash: this.generateHash(filePath)
      };

      this.db!.lastSync = new Date().toISOString();
      await this.save();

      logger.debug(`파일 상태 업데이트: ${relativePath} -> ${notionPageId}`);
    } catch (error) {
      throw new FileSystemError(`파일 상태 업데이트 실패: ${relativePath} - ${error}`);
    }
  }

  /**
   * Notion Page ID로 파일 찾기
   */
  async findByNotionPageId(notionPageId: NotionPageId): Promise<FileStatus | null> {
    if (!this.db) {
      await this.initialize();
    }

    for (const [relativePath, entry] of Object.entries(this.db!.files)) {
      if (entry.notionPageId === notionPageId) {
        try {
          const filePath = join(this.projectPath, relativePath);
          return await this.getFileStatus(filePath);
        } catch (error) {
          logger.warning(`파일 상태 가져오기 실패: ${relativePath} - ${error}`);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * 동기화가 필요한 파일들 가져오기
   */
  async getFilesNeedingSync(): Promise<FileStatus[]> {
    const allFiles = await this.getAllSourceFiles();
    return allFiles.filter(file => 
      file.syncStatus === 'not_synced' || 
      file.syncStatus === 'needs_update'
    );
  }

  /**
   * 동기화 통계 가져오기
   */
  async getSyncStats(): Promise<SyncStatistics> {
    const allFiles = await this.getAllSourceFiles();
    
    return {
      total: allFiles.length,
      synced: allFiles.filter(f => f.syncStatus === 'synced').length,
      needsUpdate: allFiles.filter(f => f.syncStatus === 'needs_update').length,
      notSynced: allFiles.filter(f => f.syncStatus === 'not_synced').length,
      errors: allFiles.filter(f => f.syncStatus === 'error').length
    };
  }

  /**
   * 특정 확장자의 파일들만 가져오기
   */
  async getFilesByExtension(extensions: string[]): Promise<FileStatus[]> {
    const allFiles = await this.getAllSourceFiles();
    return allFiles.filter(file => extensions.includes(file.extension));
  }

  /**
   * 특정 경로 패턴의 파일들 가져오기
   */
  async getFilesByPattern(pattern: string): Promise<FileStatus[]> {
    try {
      const matchedPaths = await glob(pattern, {
        cwd: this.projectPath,
        absolute: true,
        nodir: true
      });

      const fileStatuses: FileStatus[] = [];
      for (const filePath of matchedPaths) {
        try {
          const status = await this.getFileStatus(filePath);
          fileStatuses.push(status);
        } catch (error) {
          logger.warning(`파일 상태 가져오기 실패: ${filePath} - ${error}`);
        }
      }

      return fileStatuses;
    } catch (error) {
      logger.error(`패턴 검색 실패: ${pattern} - ${error}`);
      return [];
    }
  }

  /**
   * 마지막 동기화 이후 변경된 파일들만 가져오기
   */
  async getModifiedFilesSinceLastSync(): Promise<FileStatus[]> {
    const allFiles = await this.getAllSourceFiles();
    return allFiles.filter(file => file.syncStatus === 'needs_update');
  }

  /**
   * 파일이 마지막 동기화 이후 수정되었는지 확인
   */
  private determineSyncStatus(dbEntry: any, lastModified: Date): FileStatus['syncStatus'] {
    if (!dbEntry || !dbEntry.notionPageId) {
      return 'not_synced';
    }

    try {
      const lastSyncTime = new Date(dbEntry.lastModified);
      if (lastModified > lastSyncTime) {
        return 'needs_update';
      }

      return 'synced';
    } catch (error) {
      logger.warning(`동기화 상태 결정 실패: ${error}`);
      return 'error';
    }
  }

  /**
   * 파일 변경 감지를 위한 간단한 해시 생성
   */
  private generateHash(filePath: string): string {
    const relativePath = relative(this.projectPath, filePath);
    return Buffer.from(relativePath + Date.now()).toString('base64').substring(0, 8);
  }

  /**
   * 고아 항목 정리 (더 이상 존재하지 않는 파일들)
   */
  async cleanup(): Promise<{ removed: number }> {
    if (!this.db) {
      await this.initialize();
    }

    let removedCount = 0;
    try {
      const currentFiles = await this.getAllSourceFiles();
      const currentPaths = new Set(currentFiles.map(f => f.relativePath));

      for (const relativePath of Object.keys(this.db!.files)) {
        if (!currentPaths.has(relativePath)) {
          delete this.db!.files[relativePath];
          removedCount++;
          logger.debug(`고아 항목 제거: ${relativePath}`);
        }
      }

      if (removedCount > 0) {
        await this.save();
        logger.info(`${removedCount}개 고아 항목 정리 완료`);
      }
    } catch (error) {
      logger.error(`정리 작업 실패: ${error}`);
    }

    return { removed: removedCount };
  }

  /**
   * 전체 데이터베이스 리셋
   */
  async reset(): Promise<void> {
    this.db = {
      projectPath: this.projectPath,
      lastSync: new Date().toISOString(),
      files: {},
      dependencies: {}
    };
    
    await this.save();
    logger.info('로컬 데이터베이스 리셋 완료');
  }

  /**
   * 데이터베이스 경로 반환
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * 현재 데이터베이스 상태 반환
   */
  getDatabaseInfo(): {
    projectPath: string;
    lastSync: Date;
    filesCount: number;
    dependenciesCount: number;
  } | null {
    if (!this.db) {
      return null;
    }

    return {
      projectPath: this.db.projectPath,
      lastSync: new Date(this.db.lastSync),
      filesCount: Object.keys(this.db.files).length,
      dependenciesCount: Object.keys(this.db.dependencies).length
    };
  }
}

// 레거시 호환성을 위한 함수 export
export function createFileStatusTracker(projectPath: string): FileStatusTracker {
  return new FileStatusTracker(projectPath);
}