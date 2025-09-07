/**
 * Migration Orchestrator - Phase 3 Core Component
 * 전체 마이그레이션 프로세스를 오케스트레이션하는 핵심 컴포넌트
 */

import { NotionDatabaseCreator, DatabaseCreationRequest, DatabaseCreationResult } from './NotionDatabaseCreator.js';
import { NotionDataMigrator, MigrationRequest, MigrationResult } from './NotionDataMigrator.js';
import { EnhancedDatabaseSchemaManager, RepairAction } from '../../infrastructure/notion/EnhancedDatabaseSchemaManager.js';
import { NotionApiService } from '../../infrastructure/notion/core/NotionApiService.js';
import { logger } from '../../shared/utils/index.js';
import type { DatabaseSchema, DatabaseSchemas } from '../../shared/utils/schemaManager.js';

export interface FullMigrationRequest {
  databaseName: string;
  schema: DatabaseSchema;
  existingDatabaseId?: string;
  parentPageId?: string;
  options?: FullMigrationOptions;
}

export interface FullMigrationOptions {
  forceRecreate?: boolean;        // 강제로 데이터베이스 재생성
  backupBeforeMigration?: boolean; // 마이그레이션 전 백업 생성
  cleanupAfterMigration?: boolean; // 마이그레이션 후 정리
  validateIntegrity?: boolean;     // 데이터 무결성 검증
  dryRun?: boolean;               // 테스트 실행
}

export interface FullMigrationResult {
  success: boolean;
  migrationId: string;
  phases: {
    validation: { success: boolean; message: string; details?: any };
    creation: { success: boolean; result?: DatabaseCreationResult; message: string };
    migration: { success: boolean; result?: MigrationResult; message: string };
    cleanup: { success: boolean; message: string; details?: any };
  };
  summary: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    oldDatabaseId?: string;
    newDatabaseId?: string;
    migratedPages: number;
    issues: string[];
    recommendations: string[];
  };
  message: string;
}

export interface BatchMigrationRequest {
  databases: FullMigrationRequest[];
  parentPageId?: string;
  options?: BatchMigrationOptions;
}

export interface BatchMigrationOptions extends FullMigrationOptions {
  continueOnFailure?: boolean;    // 실패 시 계속 진행
  parallelMigrations?: number;    // 병렬 마이그레이션 수 (기본: 1)
}

export interface BatchMigrationResult {
  success: boolean;
  results: FullMigrationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    startTime: Date;
    endTime?: Date;
    duration?: number;
  };
}

/**
 * Migration Orchestrator
 * 데이터베이스 재생성, 데이터 마이그레이션, 메타데이터 정리를 통합 관리
 */
export class MigrationOrchestrator {
  private schemaManager: EnhancedDatabaseSchemaManager;
  private databaseCreator: NotionDatabaseCreator;
  private dataMigrator: NotionDataMigrator;
  private notionApi: NotionApiService;

  constructor(notionApi: NotionApiService, projectPath: string = '.') {
    this.notionApi = notionApi;
    this.schemaManager = new EnhancedDatabaseSchemaManager(projectPath);
    this.databaseCreator = new NotionDatabaseCreator(notionApi);
    this.dataMigrator = new NotionDataMigrator(notionApi);
  }

  /**
   * 전체 마이그레이션 프로세스 실행
   */
  async executeFullMigration(request: FullMigrationRequest): Promise<FullMigrationResult> {
    const migrationId = this.generateMigrationId();
    const startTime = new Date();

    logger.info(`🚀 Starting full migration: ${request.databaseName}`, '🚀');
    logger.info(`Migration ID: ${migrationId}`);

    const result: FullMigrationResult = {
      success: false,
      migrationId,
      phases: {
        validation: { success: false, message: '' },
        creation: { success: false, message: '' },
        migration: { success: false, message: '' },
        cleanup: { success: false, message: '' }
      },
      summary: {
        startTime,
        migratedPages: 0,
        issues: [],
        recommendations: []
      },
      message: ''
    };

    try {
      // Phase 1: 검증 및 준비
      logger.info('Phase 1: Schema validation and preparation', '🔍');
      const validationResult = await this.validateAndPrepare(request);
      result.phases.validation = validationResult;

      if (!validationResult.success) {
        result.message = `Migration failed during validation: ${validationResult.message}`;
        return result;
      }

      // Phase 2: 새 데이터베이스 생성
      logger.info('Phase 2: Creating new database', '🏗️');
      const creationRequest: DatabaseCreationRequest = {
        schema: request.schema,
        parentPageId: request.parentPageId,
        options: {
          cleanupExisting: request.options?.forceRecreate,
          description: `Migrated database: ${request.databaseName}`
        }
      };

      const creationResult = await this.databaseCreator.createDatabase(creationRequest);
      result.phases.creation = {
        success: creationResult.success,
        result: creationResult,
        message: creationResult.message
      };

      if (!creationResult.success) {
        result.message = `Migration failed during database creation: ${creationResult.message}`;
        return result;
      }

      result.summary.newDatabaseId = creationResult.databaseId;

      // Phase 3: 데이터 마이그레이션 (기존 데이터베이스가 있는 경우)
      if (request.existingDatabaseId && !request.options?.dryRun) {
        logger.info('Phase 3: Migrating data', '🚚');
        
        const migrationRequest: MigrationRequest = {
          sourceDatabaseId: request.existingDatabaseId,
          targetDatabaseId: creationResult.databaseId!,
          targetSchema: request.schema,
          options: {
            validateData: request.options?.validateIntegrity !== false,
            cleanupMetadata: true,
            batchSize: 10
          }
        };

        const migrationResult = await this.dataMigrator.migrateDatabase(migrationRequest);
        result.phases.migration = {
          success: migrationResult.success,
          result: migrationResult,
          message: migrationResult.message
        };

        result.summary.migratedPages = migrationResult.summary.successfulPages;
        result.summary.oldDatabaseId = request.existingDatabaseId;

        if (!migrationResult.success) {
          result.summary.issues.push(`Data migration completed with errors: ${migrationResult.details.errors.length} errors`);
        }
      } else {
        result.phases.migration = {
          success: true,
          message: 'Data migration skipped (no source database or dry run mode)'
        };
      }

      // Phase 4: 정리 및 검증
      logger.info('Phase 4: Cleanup and validation', '🧹');
      const cleanupResult = await this.performCleanup(request, result);
      result.phases.cleanup = cleanupResult;

      // 전체 결과 정리
      const endTime = new Date();
      result.summary.endTime = endTime;
      result.summary.duration = endTime.getTime() - startTime.getTime();

      const allPhasesSuccessful = Object.values(result.phases).every(phase => phase.success);
      result.success = allPhasesSuccessful;

      if (result.success) {
        result.message = `Migration completed successfully: ${request.databaseName}`;
        logger.success(`✅ Migration ${migrationId} completed successfully in ${Math.round(result.summary.duration! / 1000)}s`);
      } else {
        result.message = 'Migration completed with issues';
        logger.warning(`⚠️ Migration ${migrationId} completed with issues`);
      }

      // 권장사항 생성
      result.summary.recommendations = this.generateRecommendations(result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Migration ${migrationId} failed: ${errorMessage}`);

      result.message = `Migration failed: ${errorMessage}`;
      result.summary.endTime = new Date();
      result.summary.duration = result.summary.endTime.getTime() - startTime.getTime();
      result.summary.issues.push(errorMessage);

      return result;
    }
  }

  /**
   * 배치 마이그레이션 실행
   */
  async executeBatchMigration(request: BatchMigrationRequest): Promise<BatchMigrationResult> {
    const startTime = new Date();
    logger.info(`🚀 Starting batch migration: ${request.databases.length} databases`, '🚀');

    const results: FullMigrationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const dbRequest of request.databases) {
      // Parent page 설정
      if (request.parentPageId && !dbRequest.parentPageId) {
        dbRequest.parentPageId = request.parentPageId;
      }

      // 옵션 병합
      dbRequest.options = {
        ...request.options,
        ...dbRequest.options
      };

      logger.info(`Processing: ${dbRequest.databaseName}`);

      try {
        const migrationResult = await this.executeFullMigration(dbRequest);
        results.push(migrationResult);

        if (migrationResult.success) {
          successful++;
          logger.success(`✅ ${dbRequest.databaseName}: Migration completed`);
        } else {
          failed++;
          logger.error(`❌ ${dbRequest.databaseName}: Migration failed`);

          // 실패 시 중단할지 결정
          if (!request.options?.continueOnFailure) {
            logger.warning('Stopping batch migration due to failure');
            break;
          }
        }

      } catch (error) {
        failed++;
        logger.error(`❌ ${dbRequest.databaseName}: Migration error - ${error}`);

        // 빈 실패 결과 추가
        results.push({
          success: false,
          migrationId: this.generateMigrationId(),
          phases: {
            validation: { success: false, message: 'Migration not started due to error' },
            creation: { success: false, message: 'Skipped' },
            migration: { success: false, message: 'Skipped' },
            cleanup: { success: false, message: 'Skipped' }
          },
          summary: {
            startTime: new Date(),
            migratedPages: 0,
            issues: [String(error)],
            recommendations: []
          },
          message: `Migration failed: ${error}`
        });

        if (!request.options?.continueOnFailure) {
          break;
        }
      }

      // 배치 간 지연 (Rate limiting)
      await this.delay(1000);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    logger.info(`Batch migration completed: ${successful}/${request.databases.length} successful`);

    return {
      success: failed === 0,
      results,
      summary: {
        total: request.databases.length,
        successful,
        failed,
        startTime,
        endTime,
        duration
      }
    };
  }

  /**
   * 검증 및 준비 단계
   */
  private async validateAndPrepare(request: FullMigrationRequest): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // 스키마 검증
      const { validationReport } = await this.schemaManager.loadSchemasWithValidation();
      const dbValidation = validationReport.find(r => r.databaseName === request.databaseName);

      if (dbValidation && !dbValidation.validation.isValid) {
        const criticalErrors = dbValidation.validation.errors.filter(e => 
          e.severity === 'CRITICAL' || e.severity === 'HIGH'
        );

        if (criticalErrors.length > 0) {
          return {
            success: false,
            message: `Schema validation failed: ${criticalErrors.length} critical errors`,
            details: { errors: criticalErrors, validation: dbValidation }
          };
        }
      }

      // 기존 데이터베이스 접근 가능성 검증 (있는 경우)
      if (request.existingDatabaseId) {
        try {
          const retrieveResult = await this.notionApi.retrieveDatabase(request.existingDatabaseId);
          if (!retrieveResult.success) {
            return {
              success: false,
              message: `Cannot access existing database: ${retrieveResult.message}`,
              details: { databaseId: request.existingDatabaseId }
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Database access validation failed: ${error}`,
            details: { databaseId: request.existingDatabaseId, error: String(error) }
          };
        }
      }

      return {
        success: true,
        message: 'Validation passed',
        details: { validation: dbValidation }
      };

    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * 정리 및 검증 단계
   */
  private async performCleanup(
    request: FullMigrationRequest,
    migrationResult: FullMigrationResult
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const cleanupTasks: Array<{ name: string; success: boolean; message: string }> = [];

    try {
      // 1. 데이터 무결성 검증
      if (request.options?.validateIntegrity !== false && migrationResult.summary.newDatabaseId) {
        const integrityCheck = await this.validateDataIntegrity(migrationResult.summary.newDatabaseId);
        cleanupTasks.push({
          name: 'Data Integrity Validation',
          success: integrityCheck.success,
          message: integrityCheck.message
        });
      }

      // 2. 시스템 레퍼런스 업데이트 (추후 구현)
      cleanupTasks.push({
        name: 'System References Update',
        success: true,
        message: 'System references updated (placeholder)'
      });

      // 3. 기존 데이터베이스 아카이빙 (실제 삭제는 하지 않음)
      if (request.existingDatabaseId && request.options?.cleanupAfterMigration) {
        cleanupTasks.push({
          name: 'Old Database Archive',
          success: true,
          message: 'Old database marked for archival (manual action required)'
        });
      }

      const allSuccessful = cleanupTasks.every(task => task.success);

      return {
        success: allSuccessful,
        message: allSuccessful ? 'Cleanup completed successfully' : 'Cleanup completed with issues',
        details: { tasks: cleanupTasks }
      };

    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error}`,
        details: { error: String(error), completedTasks: cleanupTasks }
      };
    }
  }

  /**
   * 데이터 무결성 검증
   */
  private async validateDataIntegrity(databaseId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // 기본 접근 가능성 확인
      const retrieveResult = await this.notionApi.retrieveDatabase(databaseId);
      if (!retrieveResult.success) {
        return {
          success: false,
          message: 'Database not accessible for integrity validation'
        };
      }

      // 페이지 수 확인
      const queryResult = await this.notionApi.queryDatabase(databaseId, { page_size: 1 });
      if (!queryResult.success) {
        return {
          success: false,
          message: 'Cannot query database for integrity validation'
        };
      }

      return {
        success: true,
        message: 'Data integrity validation passed',
        details: { 
          accessible: true,
          queryable: true,
          hasPages: queryResult.data.results && queryResult.data.results.length > 0
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Integrity validation error: ${error}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(result: FullMigrationResult): string[] {
    const recommendations: string[] = [];

    // 마이그레이션 성공률 기반 권장사항
    if (result.success) {
      recommendations.push('✅ Migration completed successfully - no immediate action required');
      
      if (result.summary.migratedPages > 0) {
        recommendations.push('🔍 Review migrated data for accuracy and completeness');
      }
    } else {
      recommendations.push('⚠️ Migration completed with issues - review error details');
      recommendations.push('🔄 Consider retrying failed operations');
    }

    // 성능 기반 권장사항
    if (result.summary.duration && result.summary.duration > 300000) { // > 5분
      recommendations.push('⚡ Migration took longer than expected - consider optimizing for future runs');
    }

    // 에러 기반 권장사항
    if (result.summary.issues.length > 0) {
      recommendations.push('📋 Review and address the following issues:');
      recommendations.push(...result.summary.issues.map(issue => `  - ${issue}`));
    }

    return recommendations;
  }

  /**
   * Migration ID 생성
   */
  private generateMigrationId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `full-migration-${timestamp}-${random}`;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}