/**
 * Notion Workflow Service
 * 전체 워크플로우 관리: 데이터베이스 생성 -> 스키마 설정 -> 데이터 업로드
 * Uses NotionApiService through dependency injection
 */

import { InitializationService } from './initializationService.js';
import { NotionClientFactory } from './notion/NotionClientFactory.js';
import { ConfigManager } from '../infrastructure/config/configManager.js';
import { logger } from '../shared/utils/index.js';
import type { CommandResult, WorkspaceConfig } from '../shared/types/index.js';
import * as path from 'path';

export interface WorkflowOptions {
  databases?: string[];
  force?: boolean;
  skipUpload?: boolean;
  dryRun?: boolean;
}

export interface WorkflowResult extends CommandResult {
  data?: {
    databases: Record<string, string>;
    uploadStats: {
      files: {
        uploaded: number;
        updated: number;
        skipped: number;
        errors: number;
      };
      documents: {
        uploaded: number;
        updated: number;
        skipped: number;
        errors: number;
      };
    };
  };
}

/**
 * Notion 전체 워크플로우 서비스
 */
export class NotionWorkflowService {
  private configManager: ConfigManager;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = path.resolve(projectPath);
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 전체 워크플로우 실행
   * 1. 데이터베이스 생성/확인
   * 2. 스키마 설정/업데이트
   * 3. 인덱싱 데이터 업로드
   */
  async executeFullWorkflow(options: WorkflowOptions = {}): Promise<WorkflowResult> {
    logger.info('🚀 Notion 전체 워크플로우 시작');
    
    const startTime = Date.now();
    let config: WorkspaceConfig;

    try {
      // 1. 설정 로드
      config = await this.loadConfig();
      
      // 2. 초기화 서비스 실행
      const initResult = await this.executeInitialization(config, options);
      if (!initResult.success) {
        return {
          success: false,
          message: `초기화 실패: ${initResult.message}`,
          errors: initResult.errors
        };
      }

      // 3. 설정 재로드 (새로 생성된 데이터베이스 ID 포함)
      config = await this.loadConfig();

      // 4. 데이터 업로드 (스킵하지 않은 경우)
      let uploadStats = {
        files: { uploaded: 0, updated: 0, skipped: 0, errors: 0 },
        documents: { uploaded: 0, updated: 0, skipped: 0, errors: 0 }
      };

      if (!options.skipUpload && !options.dryRun) {
        const uploadResult = await this.executeDataUpload(config);
        if (uploadResult.success && uploadResult.data) {
          uploadStats = uploadResult.data;
        }
      } else if (options.skipUpload) {
        logger.info('데이터 업로드 스킵됨 (--skip-upload 옵션)');
      } else if (options.dryRun) {
        logger.info('드라이 런 모드: 실제 업로드 수행하지 않음');
      }

      const duration = (Date.now() - startTime) / 1000;
      const totalProcessed = uploadStats.files.uploaded + uploadStats.files.updated + 
                            uploadStats.documents.uploaded + uploadStats.documents.updated;

      logger.success(`🎉 전체 워크플로우 완료 (${duration.toFixed(2)}초)`);
      logger.info(`📊 결과: ${totalProcessed}개 항목 처리, ${uploadStats.files.errors + uploadStats.documents.errors}개 오류`);

      return {
        success: true,
        message: `워크플로우 완료: ${totalProcessed}개 항목 처리`,
        data: {
          databases: config.databases,
          uploadStats
        }
      };

    } catch (error) {
      const errorMsg = `워크플로우 실행 실패: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 데이터베이스만 생성/업데이트
   */
  async createDatabases(options: WorkflowOptions = {}): Promise<WorkflowResult> {
    logger.info('📊 데이터베이스 생성 시작');

    try {
      const config = await this.loadConfig();
      const initResult = await this.executeInitialization(config, { ...options, skipUpload: true });

      if (!initResult.success) {
        return {
          success: false,
          message: `데이터베이스 생성 실패: ${initResult.message}`,
          errors: initResult.errors
        };
      }

      // 업데이트된 설정 로드
      const updatedConfig = await this.loadConfig();

      return {
        success: true,
        message: '데이터베이스 생성 완료',
        data: {
          databases: updatedConfig.databases,
          uploadStats: {
            files: { uploaded: 0, updated: 0, skipped: 0, errors: 0 },
            documents: { uploaded: 0, updated: 0, skipped: 0, errors: 0 }
          }
        }
      };

    } catch (error) {
      const errorMsg = `데이터베이스 생성 실패: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 데이터만 업로드
   */
  async uploadDataOnly(options: { dryRun?: boolean } = {}): Promise<WorkflowResult> {
    logger.info('📤 데이터 업로드만 실행');

    try {
      const config = await this.loadConfig();
      
      // 데이터베이스가 설정되어 있는지 확인
      if (!config.databases || Object.keys(config.databases).length === 0) {
        return {
          success: false,
          message: '설정된 데이터베이스가 없습니다. 먼저 데이터베이스를 생성하세요.'
        };
      }

      let uploadStats = {
        files: { uploaded: 0, updated: 0, skipped: 0, errors: 0 },
        documents: { uploaded: 0, updated: 0, skipped: 0, errors: 0 }
      };

      if (!options.dryRun) {
        const uploadResult = await this.executeDataUpload(config);
        if (uploadResult.success && uploadResult.data) {
          uploadStats = uploadResult.data;
        } else {
          return uploadResult;
        }
      } else {
        logger.info('드라이 런 모드: 실제 업로드 수행하지 않음');
      }

      const totalProcessed = uploadStats.files.uploaded + uploadStats.files.updated + 
                            uploadStats.documents.uploaded + uploadStats.documents.updated;

      return {
        success: true,
        message: `데이터 업로드 완료: ${totalProcessed}개 항목 처리`,
        data: {
          databases: config.databases,
          uploadStats
        }
      };

    } catch (error) {
      const errorMsg = `데이터 업로드 실패: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 워크플로우 상태 확인
   */
  async checkWorkflowStatus(): Promise<{
    configured: boolean;
    databases: Record<string, { id: string; exists: boolean; accessible: boolean }>;
    indexData: {
      files: number;
      documents: number;
    };
  }> {
    const status = {
      configured: false,
      databases: {} as Record<string, { id: string; exists: boolean; accessible: boolean }>,
      indexData: {
        files: 0,
        documents: 0
      }
    };

    try {
      // 1. 설정 확인
      const config = await this.loadConfig();
      status.configured = !!(config.apiKey && config.databases);

      // 2. 데이터베이스 상태 확인
      if (config.databases) {
        for (const [dbType, dbId] of Object.entries(config.databases)) {
          status.databases[dbType] = {
            id: dbId,
            exists: false,
            accessible: false
          };

          // 데이터베이스 접근성 확인 (기본적으로는 설정되어 있다고 가정)
          if (dbId) {
            status.databases[dbType].exists = true;
            status.databases[dbType].accessible = true;
          }
        }
      }

      // 3. 인덱스 데이터 확인
      status.indexData = await this.checkIndexData();

    } catch (error) {
      logger.warning(`상태 확인 중 오류: ${error}`);
    }

    return status;
  }

  /**
   * 설정 로드
   */
  private async loadConfig(): Promise<WorkspaceConfig> {
    try {
      return await this.configManager.loadConfig(this.projectPath);
    } catch (error) {
      throw new Error(`설정 로드 실패: ${error}`);
    }
  }

  /**
   * 초기화 실행
   */
  private async executeInitialization(
    config: WorkspaceConfig,
    options: WorkflowOptions
  ): Promise<CommandResult> {
    const initService = new InitializationService(this.projectPath);

    // 데이터베이스 목록 결정
    const databases = options.databases || ['files', 'docs', 'functions'];

    logger.info(`데이터베이스 초기화: ${databases.join(', ')}`);

    return await initService.initializeSchema({
      databases,
      force: options.force || false
    });
  }

  /**
   * 데이터 업로드 실행
   */
  private async executeDataUpload(config: WorkspaceConfig): Promise<WorkflowResult> {
    if (!config.apiKey) {
      return {
        success: false,
        message: 'API 키가 설정되지 않았습니다'
      };
    }

    logger.info('📤 데이터 업로드 시작');

    try {
      // 새로운 모듈형 아키텍처 사용
      const services = await NotionClientFactory.createFromConfig(this.projectPath);
      
      // 기존 데이터베이스 ID로 데이터만 업로드
      const databaseIds = {
        files: config.databases.files,
        docs: config.databases.docs,
        functions: config.databases.functions
      };

      const result = await services.orchestrator.uploadDataOnly(databaseIds, {
        updateExisting: true,
        batchSize: 10,
        delayBetweenBatches: 1000
      });

      // 결과 포맷 변환 (기존 인터페이스 유지)
      const uploadStats = {
        files: {
          uploaded: result?.files?.created || 0,
          updated: result?.files?.updated || 0,
          skipped: result?.files?.skipped || 0,
          errors: result?.files?.failed || 0
        },
        documents: {
          uploaded: result?.documents?.created || 0,
          updated: result?.documents?.updated || 0,
          skipped: result?.documents?.skipped || 0,
          errors: result?.documents?.failed || 0
        }
      };

      const allErrors = [
        ...(result?.files?.errors || []),
        ...(result?.documents?.errors || []),
        ...(result?.functions?.errors || [])
      ];

      const success = allErrors.length === 0;

      return {
        success,
        message: success ? 
          '데이터 업로드 완료' : 
          `데이터 업로드 중 오류 발생 (${allErrors.length}개 오류)`,
        data: uploadStats,
        errors: allErrors.length > 0 ? allErrors : undefined
      };

    } catch (error) {
      const errorMsg = `데이터 업로드 실행 실패: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 인덱스 데이터 확인
   */
  private async checkIndexData(): Promise<{ files: number; documents: number }> {
    const result = { files: 0, documents: 0 };

    try {
      // 파일 인덱스 확인
      const fs = await import('fs/promises');
      try {
        const fileIndexPath = path.join(this.projectPath, '.deplink-db.json');
        const fileContent = await fs.readFile(fileIndexPath, 'utf-8');
        const fileData = JSON.parse(fileContent);
        result.files = fileData.files ? Object.keys(fileData.files).length : 0;
      } catch {}

      // 문서 인덱스 확인
      try {
        const docIndexPath = path.join(this.projectPath, '.deplink-document-index.json');
        const docContent = await fs.readFile(docIndexPath, 'utf-8');
        const docData = JSON.parse(docContent);
        result.documents = Object.keys(docData).length;
      } catch {}

    } catch (error) {
      logger.warning(`인덱스 데이터 확인 실패: ${error}`);
    }

    return result;
  }
}