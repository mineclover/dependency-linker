/**
 * Temporary Folder Manager - Shared Utility
 * 마크다운 내보내기를 위한 임시 폴더 생성 및 관리 유틸리티
 */

import { mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { logger } from './index.js';

export interface TempFolderOptions {
  prefix?: string; // 폴더명 접두사 (기본: 'deplink-export-')
  baseDir?: string; // 기본 디렉토리 (기본: system temp)
  autoCleanup?: boolean; // 자동 정리 여부 (기본: true)
  retentionMinutes?: number; // 보존 시간 (분) (기본: 60)
}

export interface TempFolderInfo {
  path: string;
  id: string;
  createdAt: Date;
  autoCleanup: boolean;
  retentionMinutes: number;
}

export class TempFolderManager {
  private static instance: TempFolderManager;
  private activeFolders: Map<string, TempFolderInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private autoCleanupEnabled: boolean = true;

  private constructor() {
    // 시작 시 자동 정리 시작 (CLI 모드에서는 비활성화할 수 있음)
    if (this.autoCleanupEnabled) {
      this.startAutoCleanup();
    }
  }

  static getInstance(): TempFolderManager {
    if (!TempFolderManager.instance) {
      TempFolderManager.instance = new TempFolderManager();
    }
    return TempFolderManager.instance;
  }

  /**
   * CLI 모드용: 자동 정리 비활성화
   */
  static getInstanceForCLI(): TempFolderManager {
    if (!TempFolderManager.instance) {
      TempFolderManager.instance = new TempFolderManager();
      TempFolderManager.instance.autoCleanupEnabled = false;
      TempFolderManager.instance.stopAutoCleanup();
    }
    return TempFolderManager.instance;
  }

  /**
   * 임시 폴더 생성
   */
  createTempFolder(options: TempFolderOptions = {}): TempFolderInfo {
    const {
      prefix = 'deplink-export-',
      baseDir = this.getSystemTempDir(),
      autoCleanup = true,
      retentionMinutes = 60
    } = options;

    const id = randomUUID();
    const folderName = `${prefix}${id.slice(0, 8)}`;
    const fullPath = resolve(join(baseDir, folderName));

    try {
      // 폴더 생성
      mkdirSync(fullPath, { recursive: true });

      const folderInfo: TempFolderInfo = {
        path: fullPath,
        id,
        createdAt: new Date(),
        autoCleanup,
        retentionMinutes
      };

      // 추적 목록에 추가
      this.activeFolders.set(id, folderInfo);

      console.log(`📁 Created temporary folder: ${fullPath}`);
      return folderInfo;
    } catch (error) {
      console.error(`Failed to create temporary folder: ${fullPath}`, error);
      throw new Error(`임시 폴더 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 임시 폴더 삭제
   */
  deleteTempFolder(id: string): boolean {
    const folderInfo = this.activeFolders.get(id);
    if (!folderInfo) {
      logger.warning(`Temporary folder not found: ${id}`);
      return false;
    }

    try {
      if (existsSync(folderInfo.path)) {
        rmSync(folderInfo.path, { recursive: true, force: true });
        console.log(`🗑️ Deleted temporary folder: ${folderInfo.path}`);
      }

      this.activeFolders.delete(id);
      return true;
    } catch (error) {
      console.error(`Failed to delete temporary folder: ${folderInfo.path}`, error);
      return false;
    }
  }

  /**
   * 모든 임시 폴더 삭제
   */
  deleteAllTempFolders(): number {
    let deletedCount = 0;
    const folderIds = Array.from(this.activeFolders.keys());

    for (const id of folderIds) {
      if (this.deleteTempFolder(id)) {
        deletedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} temporary folders`);
    return deletedCount;
  }

  /**
   * 만료된 임시 폴더 정리
   */
  cleanupExpiredFolders(): number {
    const now = new Date();
    let cleanedCount = 0;
    const expiredFolders: string[] = [];

    for (const [id, folderInfo] of this.activeFolders) {
      if (!folderInfo.autoCleanup) continue;

      const ageMinutes = (now.getTime() - folderInfo.createdAt.getTime()) / (1000 * 60);
      if (ageMinutes > folderInfo.retentionMinutes) {
        expiredFolders.push(id);
      }
    }

    for (const id of expiredFolders) {
      if (this.deleteTempFolder(id)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`⏰ Cleaned up ${cleanedCount} expired temporary folders`);
    }

    return cleanedCount;
  }

  /**
   * 활성 임시 폴더 목록 조회
   */
  getActiveFolders(): TempFolderInfo[] {
    return Array.from(this.activeFolders.values());
  }

  /**
   * 임시 폴더 정보 조회
   */
  getFolderInfo(id: string): TempFolderInfo | null {
    return this.activeFolders.get(id) || null;
  }

  /**
   * 임시 폴더 내용 통계
   */
  getFolderStats(id: string): {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  } | null {
    const folderInfo = this.activeFolders.get(id);
    if (!folderInfo || !existsSync(folderInfo.path)) {
      return null;
    }

    try {
      const stats = this.calculateDirectoryStats(folderInfo.path);
      return stats;
    } catch (error) {
      console.error(`Failed to calculate folder stats: ${folderInfo.path}`, error);
      return null;
    }
  }

  /**
   * 자동 정리 시작
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) return;

    // 10분마다 만료된 폴더 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredFolders();
    }, 10 * 60 * 1000);

    console.log('🔄 Started automatic temporary folder cleanup');
  }

  /**
   * 자동 정리 중지
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Stopped automatic temporary folder cleanup');
    }
  }

  /**
   * 시스템 임시 디렉토리 조회
   */
  private getSystemTempDir(): string {
    return require('os').tmpdir();
  }

  /**
   * 디렉토리 통계 계산
   */
  private calculateDirectoryStats(dirPath: string): {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  } {
    let totalFiles = 0;
    let totalSize = 0;
    const fileTypes: Record<string, number> = {};

    const processDirectory = (path: string): void => {
      try {
        const items = readdirSync(path);

        for (const item of items) {
          const itemPath = join(path, item);
          const stats = statSync(itemPath);

          if (stats.isDirectory()) {
            processDirectory(itemPath);
          } else if (stats.isFile()) {
            totalFiles++;
            totalSize += stats.size;

            const ext = item.split('.').pop()?.toLowerCase() || 'no-extension';
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          }
        }
      } catch (error) {
        console.warn(`Failed to process directory: ${path}`, error);
      }
    };

    processDirectory(dirPath);

    return { totalFiles, totalSize, fileTypes };
  }

  /**
   * 인스턴스 정리 (프로세스 종료 시)
   */
  destroy(): void {
    this.stopAutoCleanup();
    
    // 자동 정리가 활성화된 폴더들만 삭제
    const autoCleanupFolders = Array.from(this.activeFolders.values())
      .filter(folder => folder.autoCleanup)
      .map(folder => folder.id);

    for (const id of autoCleanupFolders) {
      this.deleteTempFolder(id);
    }

    console.log('💀 TempFolderManager destroyed');
  }
}

// 싱글톤 인스턴스 내보내기
export const tempFolderManager = TempFolderManager.getInstance();

// 프로세스 종료 시 정리
process.on('exit', () => {
  tempFolderManager.destroy();
});

process.on('SIGINT', () => {
  tempFolderManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tempFolderManager.destroy();
  process.exit(0);
});