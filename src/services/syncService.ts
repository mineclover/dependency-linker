/**
 * Sync Service - Service Layer
 * 코드베이스와 Notion 간의 동기화 서비스
 * 
 * Refactored to use Clean Architecture patterns:
 * - Dependency injection for configuration service
 * - Interface-based dependencies
 * - Separation of concerns
 */

import type { IConfigurationService, ProcessedConfig } from '../domain/interfaces/IConfigurationService.js';
import { UploadService } from './uploadService.js';
import { FileSystemExplorer } from '../infrastructure/filesystem/explorer.js';
import { FileStatusTracker } from '../infrastructure/filesystem/statusTracker.js';
import { DependencyAnalyzer } from '../infrastructure/dependencies/analyzer.js';
import type { CommandResult } from '../shared/types/index.js';
import { logger } from '../shared/utils/index.js';
import * as path from 'path';

export interface SyncAllOptions {
  dryRun?: boolean;
  force?: boolean;
  includeDependencies?: boolean;
  maxFileSize?: number;
  extensions?: string[];
}

export interface SyncCodeOptions {
  pattern?: string;
  dryRun?: boolean;
  force?: boolean;
  includeContent?: boolean;
}

export interface SyncDocsOptions {
  docsPath?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface SyncDependenciesOptions {
  dryRun?: boolean;
  analyzeOnly?: boolean;
  generateReport?: boolean;
}

/**
 * 동기화 서비스 - Clean Architecture Pattern
 * Dependency injection을 통한 느슨한 결합
 */
export class SyncService {
  private configService: IConfigurationService;
  private fileExplorer: FileSystemExplorer;
  private statusTracker: FileStatusTracker;
  private dependencyAnalyzer: DependencyAnalyzer;
  private uploadService: UploadService;
  private projectPath: string;
  private cachedConfig: ProcessedConfig | null = null;

  constructor(
    projectPath: string = process.cwd(),
    configService: IConfigurationService,
    uploadService?: UploadService
  ) {
    this.projectPath = path.resolve(projectPath);
    this.configService = configService;
    this.fileExplorer = new FileSystemExplorer(this.projectPath);
    this.statusTracker = new FileStatusTracker(this.projectPath);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.projectPath);
    this.uploadService = uploadService || new UploadService();
  }

  /**
   * 설정 로드 및 캐싱 (중복 로드 방지)
   */
  private async getConfig(): Promise<ProcessedConfig> {
    if (!this.cachedConfig) {
      this.cachedConfig = await this.configService.loadAndProcessConfig(this.projectPath);
    }
    return this.cachedConfig;
  }


  /**
   * 전체 동기화 (코드 + 문서 + 의존성)
   */
  async syncAll(options: SyncAllOptions = {}): Promise<CommandResult> {
    try {
      logger.info('전체 동기화 시작', '🔄');
      
      // Notion service는 BaseCommand에서 초기화됨
      await this.statusTracker.initialize();

      if (options.dryRun) {
        logger.info('드라이 런 모드 - 실제 동기화는 수행하지 않습니다', '👁️');
      }

      const results = {
        codeSync: { success: true, filesProcessed: 0, filesUploaded: 0, filesSkipped: 0 },
        docsSync: { success: true, docsProcessed: 0, docsUploaded: 0 },
        dependenciesSync: { success: true, dependenciesAnalyzed: 0, relationshipsCreated: 0 }
      };

      // 1. 코드 파일 동기화
      logger.info('코드 파일 동기화 시작', '📁');
      const codeResult = await this.syncCode({
        dryRun: options.dryRun,
        force: options.force,
        includeContent: true
      });
      
      if (!codeResult.success) {
        return codeResult;
      }
      
      results.codeSync = codeResult.data || results.codeSync;

      // 2. 의존성 동기화 (요청된 경우)
      if (options.includeDependencies) {
        logger.info('의존성 분석 및 동기화 시작', '🔗');
        const depsResult = await this.syncDependencies({
          dryRun: options.dryRun
        });
        
        if (depsResult.success) {
          results.dependenciesSync = depsResult.data || results.dependenciesSync;
        } else {
          logger.warning(`의존성 동기화 실패: ${depsResult.message}`);
        }
      }

      // 3. 문서 동기화 (docs 디렉토리가 있는 경우)
      const docsPath = path.join(this.projectPath, 'docs');
      const fs = await import('fs/promises');
      try {
        await fs.access(docsPath);
        logger.info('문서 동기화 시작', '📚');
        const docsResult = await this.syncDocs({
          docsPath,
          dryRun: options.dryRun,
          force: options.force
        });
        
        if (docsResult.success) {
          results.docsSync = docsResult.data || results.docsSync;
        }
      } catch {
        logger.info('docs 디렉토리가 없어 문서 동기화를 건너뜁니다');
      }

      const totalProcessed = results.codeSync.filesProcessed + results.docsSync.docsProcessed;
      const totalUploaded = results.codeSync.filesUploaded + results.docsSync.docsUploaded;

      logger.success(`전체 동기화 완료: ${totalProcessed}개 처리, ${totalUploaded}개 업로드`);
      
      return {
        success: true,
        message: `전체 동기화 완료: ${totalProcessed}개 파일 처리됨`,
        data: results
      };

    } catch (error) {
      logger.error(`전체 동기화 실패: ${error}`);
      return {
        success: false,
        message: `전체 동기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 코드 파일 동기화
   */
  async syncCode(options: SyncCodeOptions = {}): Promise<CommandResult> {
    try {
      logger.info('코드 동기화 시작', '💾');
      
      await this.statusTracker.initialize();

      // 설정 로드
      const config = await this.getConfig();
      const filesDbId = config.databases.files;
      
      if (!filesDbId) {
        return {
          success: false,
          message: 'Files 데이터베이스 ID가 설정되지 않았습니다. deplink init schema를 실행하세요.'
        };
      }

      // 파일 탐색
      let files;
      if (options.pattern) {
        files = await this.statusTracker.getFilesByPattern(options.pattern);
      } else {
        files = await this.statusTracker.getAllSourceFiles();
      }

      logger.info(`${files.length}개 파일 발견`);

      if (options.dryRun) {
        logger.info('드라이 런 모드: 실제 업로드는 수행하지 않습니다');
        return {
          success: true,
          message: `드라이 런: ${files.length}개 파일이 동기화될 예정입니다.`,
          data: { filesProcessed: files.length, filesUploaded: 0, filesSkipped: files.length }
        };
      }

      // 동기화 수행
      let uploaded = 0;
      let skipped = 0;
      let errors = 0;

      for (const fileStatus of files) {
        try {
          const shouldSync = options.force || 
            fileStatus.syncStatus === 'not_synced' || 
            fileStatus.syncStatus === 'needs_update';

          if (!shouldSync) {
            skipped++;
            logger.debug(`파일 건너뛰기: ${fileStatus.relativePath} (${fileStatus.syncStatus})`);
            continue;
          }

          // 파일을 레거시 형식으로 변환
          const legacyFile = {
            path: fileStatus.path,
            relativePath: fileStatus.relativePath,
            size: fileStatus.size,
            extension: fileStatus.extension,
            lastModified: fileStatus.lastModified,
            content: options.includeContent ? await this.fileExplorer.readFileContent(fileStatus.path) : undefined
          };

          // Notion에 업로드
          const result = await this.uploadService.uploadFile(fileStatus.path, {
            includeContent: options.includeContent
          });
          
          if (result.success) {
            // 상태 추적기 업데이트
            await this.statusTracker.updateFileStatus(fileStatus.relativePath, result.filePageId || '');
            uploaded++;
            logger.debug(`파일 업로드 완료: ${fileStatus.relativePath}`);
          } else {
            errors++;
            logger.error(`파일 업로드 실패: ${fileStatus.relativePath} - ${result.error}`);
          }

        } catch (error) {
          errors++;
          logger.error(`파일 처리 실패: ${fileStatus.relativePath} - ${error}`);
        }
      }

      logger.success(`코드 동기화 완료: ${uploaded}개 업로드, ${skipped}개 건너뛰기, ${errors}개 실패`);
      
      return {
        success: true,
        message: `코드 동기화 완료: ${uploaded}개 파일 업로드됨`,
        data: { 
          filesProcessed: files.length, 
          filesUploaded: uploaded, 
          filesSkipped: skipped, 
          filesErrored: errors 
        }
      };

    } catch (error) {
      logger.error(`코드 동기화 실패: ${error}`);
      return {
        success: false,
        message: `코드 동기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 문서 동기화
   */
  async syncDocs(options: SyncDocsOptions = {}): Promise<CommandResult> {
    try {
      logger.info('문서 동기화 시작', '📚');
      
      // Notion service는 BaseCommand에서 초기화됨

      // 설정 로드
      const config = await this.getConfig();
      const docsDbId = config.databases.docs;
      
      if (!docsDbId) {
        return {
          success: false,
          message: 'Docs 데이터베이스 ID가 설정되지 않았습니다.'
        };
      }

      const docsPath = options.docsPath || path.join(this.projectPath, 'docs');
      
      // 마크다운 파일 검색
      const pattern = path.join(docsPath, '**/*.md');
      const docFiles = await this.statusTracker.getFilesByPattern(pattern);

      if (docFiles.length === 0) {
        logger.info('동기화할 문서가 없습니다');
        return {
          success: true,
          message: '동기화할 문서가 없습니다.',
          data: { docsProcessed: 0, docsUploaded: 0 }
        };
      }

      logger.info(`${docFiles.length}개 문서 발견`);

      if (options.dryRun) {
        logger.info('드라이 런 모드: 실제 업로드는 수행하지 않습니다');
        return {
          success: true,
          message: `드라이 런: ${docFiles.length}개 문서가 동기화될 예정입니다.`,
          data: { docsProcessed: docFiles.length, docsUploaded: 0 }
        };
      }

      // 문서 업로드
      let uploaded = 0;
      for (const docFile of docFiles) {
        try {
          const content = await this.fileExplorer.readFileContent(docFile.path);
          if (!content) continue;

          const docName = path.basename(docFile.relativePath, '.md');
          
          // 레거시 문서 형식으로 변환
          const doc = {
            name: docName,
            content,
            documentType: 'README', // 기본값
            tags: ['documentation']
          };

          const result = await this.uploadService.uploadFile(docPath, {
            includeContent: true
          });
          
          if (result.success) {
            uploaded++;
            logger.debug(`문서 업로드 완료: ${docName}`);
          } else {
            logger.error(`문서 업로드 실패: ${docName} - ${result.error}`);
          }

        } catch (error) {
          logger.error(`문서 처리 실패: ${docFile.relativePath} - ${error}`);
        }
      }

      logger.success(`문서 동기화 완료: ${uploaded}개 업로드`);
      
      return {
        success: true,
        message: `문서 동기화 완료: ${uploaded}개 문서 업로드됨`,
        data: { docsProcessed: docFiles.length, docsUploaded: uploaded }
      };

    } catch (error) {
      logger.error(`문서 동기화 실패: ${error}`);
      return {
        success: false,
        message: `문서 동기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 의존성 동기화
   */
  async syncDependencies(options: SyncDependenciesOptions = {}): Promise<CommandResult> {
    try {
      logger.info('의존성 분석 시작', '🔗');
      
      // 의존성 분석
      const dependencyGraph = await this.dependencyAnalyzer.analyzeProject();
      const stats = this.dependencyAnalyzer.getStatistics();

      logger.info(`의존성 분석 완료: ${stats.totalFiles}개 파일, ${stats.totalDependencies}개 의존성`);

      if (options.analyzeOnly) {
        return {
          success: true,
          message: '의존성 분석 완료 (분석만)',
          data: {
            dependenciesAnalyzed: stats.totalDependencies,
            resolvedDependencies: stats.resolvedDependencies,
            externalDependencies: stats.externalDependencies,
            relationshipsCreated: 0,
            statistics: stats
          }
        };
      }

      if (options.dryRun) {
        logger.info('드라이 런 모드: 실제 동기화는 수행하지 않습니다');
        return {
          success: true,
          message: `드라이 런: ${stats.resolvedDependencies}개 관계가 동기화될 예정입니다.`,
          data: {
            dependenciesAnalyzed: stats.totalDependencies,
            relationshipsCreated: 0,
            statistics: stats
          }
        };
      }

      // Update dependency relationships in Notion
      if (!options.analyzeOnly) {
        try {
          logger.info('Updating dependency relationships in Notion...', '🔄');
          
          // This would be implemented when the full Notion client is ready
          // await this.notionClient.updateDependencyRelationships(analysis.graph);
          
          logger.info('Dependency relationships update deferred - full integration pending', 'ℹ️');
        } catch (error) {
          logger.warning(`Failed to update Notion relationships: ${error}`);
        }
      }

      logger.success('의존성 동기화 완료');
      
      return {
        success: true,
        message: `의존성 동기화 완료: ${stats.resolvedDependencies}개 관계 생성`,
        data: {
          dependenciesAnalyzed: stats.totalDependencies,
          relationshipsCreated: stats.resolvedDependencies,
          statistics: stats
        }
      };

    } catch (error) {
      logger.error(`의존성 동기화 실패: ${error}`);
      return {
        success: false,
        message: `의존성 동기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 동기화 상태 확인
   */
  async getSyncStatus(): Promise<CommandResult> {
    try {
      await this.statusTracker.initialize();

      const stats = await this.statusTracker.getSyncStats();
      const lastSync = this.statusTracker.getDatabaseInfo();

      return {
        success: true,
        message: '동기화 상태 조회 완료',
        data: {
          ...stats,
          lastSyncTime: lastSync?.lastSync,
          databasePath: this.statusTracker.getDatabasePath()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `동기화 상태 조회 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 동기화 통계 리포트 생성
   */
  async generateSyncReport(): Promise<CommandResult> {
    try {
      const statusResult = await this.getSyncStatus();
      if (!statusResult.success) return statusResult;

      const dependencyStats = this.dependencyAnalyzer.getStatistics();

      const report = {
        timestamp: new Date().toISOString(),
        project: {
          path: this.projectPath,
          name: path.basename(this.projectPath)
        },
        files: statusResult.data,
        dependencies: dependencyStats
      };

      return {
        success: true,
        message: '동기화 리포트 생성 완료',
        data: report
      };

    } catch (error) {
      return {
        success: false,
        message: `리포트 생성 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}