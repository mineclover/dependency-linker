/**
 * Enhanced Database Schema Manager - Infrastructure Layer  
 * SchemaValidationService와 통합된 고도화된 스키마 관리자
 */

import { DatabaseSchemaManager } from './DatabaseSchemaManager.js';
import { SchemaValidationService, ValidationResult, SchemaDiff } from '../../domain/services/SchemaValidationService.js';
import { logger } from '../../shared/utils/index.js';
import type { DatabaseSchemas, DatabaseSchema } from '../../shared/utils/schemaManager.js';

export interface SchemaValidationReport {
  databaseName: string;
  validation: ValidationResult;
  recommendations: string[];
  repairActions: RepairAction[];
}

export interface RepairAction {
  type: 'RECREATE_DATABASE' | 'UPDATE_PROPERTIES' | 'MIGRATE_DATA' | 'CLEANUP_METADATA';
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedTime: string;
  requiresUserConfirmation: boolean;
}

export interface DatabaseHealthStatus {
  databaseName: string;
  isHealthy: boolean;
  issues: string[];
  lastValidated: Date;
  score: number; // 0-100
}

/**
 * Enhanced Database Schema Manager
 * 기존 DatabaseSchemaManager를 확장하여 검증 및 자동 복구 기능 추가
 */
export class EnhancedDatabaseSchemaManager extends DatabaseSchemaManager {
  private validator: SchemaValidationService;
  private validationCache: Map<string, ValidationResult> = new Map();

  constructor(projectPath: string) {
    super(projectPath);
    this.validator = new SchemaValidationService();
  }

  /**
   * 검증 기능이 강화된 스키마 로딩
   */
  async loadSchemasWithValidation(): Promise<{
    schemas: DatabaseSchemas;
    validationReport: SchemaValidationReport[];
  }> {
    logger.info('Loading schemas with comprehensive validation', '🔍');

    // 기존 스키마 로딩
    const schemas = await this.loadSchemas();
    
    // 각 데이터베이스 검증
    const validationReport: SchemaValidationReport[] = [];
    
    for (const [dbName, dbSchema] of Object.entries(schemas.databases)) {
      const validation = await this.validator.validateDatabaseSchema(dbSchema);
      
      const report: SchemaValidationReport = {
        databaseName: dbName,
        validation,
        recommendations: this.generateRecommendations(validation),
        repairActions: this.generateRepairActions(dbName, validation)
      };
      
      validationReport.push(report);
      
      // 검증 결과 로깅
      if (validation.isValid) {
        logger.success(`✅ ${dbName}: Schema validation passed`);
      } else {
        const criticalErrors = validation.errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH');
        logger.warning(`⚠️ ${dbName}: ${criticalErrors.length} critical issues found`);
      }
    }

    return { schemas, validationReport };
  }

  /**
   * 데이터베이스 건강성 체크
   */
  async checkDatabaseHealth(databaseNames?: string[]): Promise<DatabaseHealthStatus[]> {
    const { schemas, validationReport } = await this.loadSchemasWithValidation();
    const results: DatabaseHealthStatus[] = [];

    const dbsToCheck = databaseNames || Object.keys(schemas.databases);

    for (const dbName of dbsToCheck) {
      const report = validationReport.find(r => r.databaseName === dbName);
      
      if (report) {
        const criticalIssues = report.validation.errors.filter(e => 
          e.severity === 'CRITICAL' || e.severity === 'HIGH'
        ).length;
        
        const totalIssues = report.validation.errors.length + report.validation.warnings.length;
        const score = Math.max(0, 100 - (criticalIssues * 30) - (totalIssues * 10));

        results.push({
          databaseName: dbName,
          isHealthy: report.validation.isValid && criticalIssues === 0,
          issues: report.validation.errors.map(e => `[${e.severity}] ${e.field}: ${e.message}`),
          lastValidated: new Date(),
          score
        });
      }
    }

    return results;
  }

  /**
   * 자동 스키마 복구 (Phase 3에서 구현될 예정)
   */
  async autoRepairSchemas(
    schemas: DatabaseSchemas, 
    validationReport: SchemaValidationReport[]
  ): Promise<{
    repairedSchemas: DatabaseSchemas;
    repairResults: RepairResult[];
  }> {
    logger.info('Auto-repairing schemas (Phase 3 implementation)', '🔧');
    
    const repairResults: RepairResult[] = [];
    
    // Phase 3에서 구현 예정
    // 현재는 원본 스키마 반환
    return {
      repairedSchemas: schemas,
      repairResults
    };
  }

  /**
   * 스키마 비교 및 동기화 상태 확인
   */
  async compareSchemasWithNotion(databaseId: string, localSchema: DatabaseSchema): Promise<SchemaDiff> {
    try {
      // Notion에서 원격 스키마 조회 (실제 구현 필요)
      const remoteSchema = await this.fetchNotionDatabaseSchema(databaseId);
      
      // 스키마 비교
      return this.validator.compareDatabaseSchemas(localSchema, remoteSchema);
      
    } catch (error) {
      logger.error(`Failed to compare schemas for database ${databaseId}: ${error}`);
      throw error;
    }
  }

  /**
   * 검증 보고서 생성
   */
  generateValidationReport(validationReports: SchemaValidationReport[]): string {
    const report = [];
    
    report.push('# Schema Validation Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    const healthyDbs = validationReports.filter(r => r.validation.isValid);
    const unhealthyDbs = validationReports.filter(r => !r.validation.isValid);

    report.push(`## Summary`);
    report.push(`- ✅ Healthy databases: ${healthyDbs.length}`);
    report.push(`- ⚠️ Databases with issues: ${unhealthyDbs.length}`);
    report.push('');

    if (unhealthyDbs.length > 0) {
      report.push('## Issues Found');
      
      for (const db of unhealthyDbs) {
        report.push(`### ${db.databaseName}`);
        
        const criticalErrors = db.validation.errors.filter(e => 
          e.severity === 'CRITICAL' || e.severity === 'HIGH'
        );
        
        if (criticalErrors.length > 0) {
          report.push('**Critical Issues:**');
          for (const error of criticalErrors) {
            report.push(`- [${error.severity}] ${error.field}: ${error.message}`);
          }
        }

        if (db.validation.warnings.length > 0) {
          report.push('**Warnings:**');
          for (const warning of db.validation.warnings) {
            report.push(`- ${warning.field}: ${warning.message}`);
          }
        }

        if (db.recommendations.length > 0) {
          report.push('**Recommendations:**');
          for (const rec of db.recommendations) {
            report.push(`- ${rec}`);
          }
        }
        report.push('');
      }
    }

    return report.join('\n');
  }

  /**
   * 검증 결과 기반 추천사항 생성
   */
  private generateRecommendations(validation: ValidationResult): string[] {
    const recommendations: string[] = [];

    const criticalErrors = validation.errors.filter(e => e.severity === 'CRITICAL');
    const highErrors = validation.errors.filter(e => e.severity === 'HIGH');

    if (criticalErrors.length > 0) {
      recommendations.push('🚨 Critical issues found - immediate attention required');
      recommendations.push('Consider recreating the database with corrected schema');
    }

    if (highErrors.length > 0) {
      recommendations.push('⚠️ High priority issues detected');
      recommendations.push('Review and update schema properties');
    }

    if (validation.warnings.length > 5) {
      recommendations.push('📝 Multiple warnings detected - consider schema optimization');
    }

    for (const suggestion of validation.suggestions) {
      switch (suggestion.action) {
        case 'recreate_database':
          recommendations.push(`🔄 ${suggestion.description} (Risk: ${suggestion.riskLevel})`);
          break;
        case 'update_notion_properties':
          recommendations.push(`🔧 ${suggestion.description} (Risk: ${suggestion.riskLevel})`);
          break;
        case 'migrate_data':
          recommendations.push(`📦 ${suggestion.description} (Risk: ${suggestion.riskLevel})`);
          break;
      }
    }

    return recommendations;
  }

  /**
   * 검증 결과 기반 복구 액션 생성
   */
  private generateRepairActions(databaseName: string, validation: ValidationResult): RepairAction[] {
    const actions: RepairAction[] = [];

    const criticalErrors = validation.errors.filter(e => e.severity === 'CRITICAL');
    const highErrors = validation.errors.filter(e => e.severity === 'HIGH');

    if (criticalErrors.length > 0) {
      actions.push({
        type: 'RECREATE_DATABASE',
        description: `Recreate ${databaseName} database with corrected schema`,
        riskLevel: 'HIGH',
        estimatedTime: '5-10 minutes',
        requiresUserConfirmation: true
      });

      actions.push({
        type: 'MIGRATE_DATA',
        description: `Migrate existing data to new ${databaseName} database`,
        riskLevel: 'MEDIUM',
        estimatedTime: '2-5 minutes',
        requiresUserConfirmation: true
      });
    } else if (highErrors.length > 0) {
      actions.push({
        type: 'UPDATE_PROPERTIES',
        description: `Update properties for ${databaseName} database`,
        riskLevel: 'MEDIUM', 
        estimatedTime: '1-3 minutes',
        requiresUserConfirmation: false
      });
    }

    if (validation.warnings.length > 3) {
      actions.push({
        type: 'CLEANUP_METADATA',
        description: `Clean up metadata and optimize ${databaseName} schema`,
        riskLevel: 'LOW',
        estimatedTime: '1-2 minutes',
        requiresUserConfirmation: false
      });
    }

    return actions;
  }

  /**
   * Notion에서 원격 데이터베이스 스키마 조회 (추후 구현)
   */
  private async fetchNotionDatabaseSchema(databaseId: string): Promise<any> {
    // Phase 3에서 구현 예정
    // 현재는 모의 데이터 반환
    return {
      title: [{ text: { content: 'Remote Database' } }],
      properties: {}
    };
  }
}

interface RepairResult {
  action: RepairAction;
  success: boolean;
  message: string;
  details?: any;
}