/**
 * Validation Services - Unified validation system
 * TypeScript SDK-compatible validation and feedback system
 */

import { Client } from '@notionhq/client';
import { ConfigManager } from '../infrastructure/config/configManager.js';
import { SchemaValidationService } from './SchemaValidationService.js';
import { ConfigurationValidationService } from './ConfigurationValidationService.js';
import { logger } from '../../shared/utils/index.js';
import type {
  ValidationResult,
  SchemaValidationReport,
  ConfigurationConsistency,
  DatabasePropertyMappings
} from '../../shared/types/index.js';

export interface ValidationServiceConfig {
  projectPath?: string;
  enableAutoFix?: boolean;
  validationSchedule?: {
    enabled: boolean;
    intervalMinutes: number;
  };
  notionClient?: Client;
  configManager?: any; // 임시로 any 타입 사용, 나중에 적절한 인터페이스로 대체
}

export class UnifiedValidationService {
  private schemaValidationService: SchemaValidationService;
  private configValidationService: ConfigurationValidationService;
  private config: ValidationServiceConfig;

  constructor(config: ValidationServiceConfig = {}) {
    this.config = config;
    // Use refactored services with dependency injection
    this.schemaValidationService = new SchemaValidationService(
      this.config.configManager,
      null, // notionClientFactory - 나중에 추가할 수 있음
      null  // dbManager - 나중에 추가할 수 있음
    );
    this.configValidationService = new ConfigurationValidationService();
  }

  /**
   * Comprehensive validation of entire system
   */
  async validateSystem(): Promise<{
    schemaReports: Record<string, SchemaValidationReport>;
    configurationConsistency: ValidationResult;
    overallHealth: 'healthy' | 'warning' | 'critical';
    summary: {
      totalDatabases: number;
      healthyDatabases: number;
      warningDatabases: number;
      criticalDatabases: number;
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    logger.info('🚀 Starting comprehensive system validation...');

    // Get all databases from enhanced configuration system
    if (!this.config.configManager) {
      throw new Error('Configuration manager not provided');
    }
    const config = await this.config.configManager.loadAndProcessConfig(process.cwd());
    if (!config?.databases) {
      throw new Error('No databases configured for validation');
    }

    const schemaReports: Record<string, SchemaValidationReport> = {};
    
    // Validate each database schema
    for (const [dbName, dbId] of Object.entries(config.databases)) {
      logger.info(`🔍 Validating database: ${dbName} (${dbId})`);
      
      try {
        const report = await this.schemaValidationService.validateDatabaseSchema(dbId, dbName);
        schemaReports[dbName] = report;
      } catch (error) {
        logger.error(`❌ Failed to validate ${dbName}: ${error}`);
        
        // Create error report
        schemaReports[dbName] = {
          databaseId: dbId,
          databaseName: dbName,
          schemaConsistency: this.createErrorResult(`Schema validation failed: ${error}`),
          propertyMappings: this.createErrorResult('Property mapping validation skipped'),
          configurationSync: this.createErrorResult('Configuration sync validation skipped'),
          runtimeValidation: this.createErrorResult('Runtime validation skipped'),
          overallStatus: 'critical',
          lastValidated: new Date()
        };
      }
    }

    // Validate configuration consistency
    const configurationConsistency = await this.configValidationService.validateConfigurationConsistency(
      this.config.projectPath || process.cwd()
    );

    // Calculate overall system health
    const summary = this.calculateSystemSummary(schemaReports, configurationConsistency);
    const overallHealth = this.determineOverallHealth(summary);

    logger.info(`✅ System validation completed - Overall health: ${overallHealth.toUpperCase()}`);

    return {
      schemaReports,
      configurationConsistency,
      overallHealth,
      summary
    };
  }

  /**
   * Validate specific database
   */
  async validateDatabase(databaseId: string, databaseName?: string): Promise<SchemaValidationReport> {
    const name = databaseName || databaseId;
    logger.info(`🔍 Validating specific database: ${name}`);
    
    return await this.schemaValidationService.validateDatabaseSchema(databaseId, name);
  }

  /**
   * Get property mappings for database
   */
  getPropertyMappings(databaseId: string): DatabasePropertyMappings | null {
    return this.schemaValidationService.getCachedPropertyMappings(databaseId);
  }

  /**
   * Export all validation data
   */
  async exportValidationData(outputDir: string = './validation-exports'): Promise<void> {
    logger.info(`📤 Exporting validation data to: ${outputDir}`);

    // Ensure output directory exists
    await import('fs').then(fs => fs.promises.mkdir(outputDir, { recursive: true }));

    // Export property mappings
    const propertyMappingsPath = `${outputDir}/property-mappings-${Date.now()}.json`;
    await this.schemaValidationService.exportPropertyMappingsToConfig(propertyMappingsPath);

    // Export configuration consistency report
    if (!this.config.configManager) {
      throw new Error('Configuration manager not provided');
    }
    const config = await this.config.configManager.loadAndProcessConfig(process.cwd());
    if (config) {
      const consistencyResult = await this.configValidationService.validateConfigurationConsistency();
      
      // Create basic consistency object (simplified for export)
      const consistency: ConfigurationConsistency = {
        globalConfig: '~/.deplink-config.json',
        projectConfig: './deplink.config.json',
        schemaExport: './data/schema-setup-export.json',
        conflicts: [],
        missingProperties: [],
        recommendations: []
      };

      const consistencyPath = `${outputDir}/configuration-consistency-${Date.now()}.json`;
      await this.configValidationService.exportConsistencyReport(consistency, consistencyPath);
    }

    logger.success(`✅ Validation data exported successfully`);
  }

  /**
   * Auto-fix validation issues
   */
  async autoFixIssues(dryRun: boolean = true): Promise<{
    fixable: number;
    fixed: number;
    failed: number;
    details: string[];
  }> {
    logger.info(`🔧 ${dryRun ? 'Analyzing' : 'Applying'} auto-fixes...`);

    const results = {
      fixable: 0,
      fixed: 0,
      failed: 0,
      details: [] as string[]
    };

    if (!this.config.enableAutoFix && !dryRun) {
      results.details.push('Auto-fix is disabled in configuration');
      return results;
    }

    // Validate system to find fixable issues
    const validation = await this.validateSystem();

    // Count and apply fixes
    for (const report of Object.values(validation.schemaReports)) {
      const allSuggestions = [
        ...report.schemaConsistency.suggestions,
        ...report.propertyMappings.suggestions,
        ...report.configurationSync.suggestions,
        ...report.runtimeValidation.suggestions
      ];

      for (const suggestion of allSuggestions) {
        if (suggestion.autoFixable) {
          results.fixable++;
          
          if (!dryRun && suggestion.autoFix) {
            try {
              await suggestion.autoFix();
              results.fixed++;
              results.details.push(`Fixed: ${suggestion.message}`);
            } catch (error) {
              results.failed++;
              results.details.push(`Failed to fix: ${suggestion.message} - ${error}`);
            }
          } else {
            results.details.push(`Fixable: ${suggestion.message}`);
          }
        }
      }
    }

    logger.info(`🔧 Auto-fix ${dryRun ? 'analysis' : 'execution'} completed - ${results.fixable} fixable, ${results.fixed} fixed, ${results.failed} failed`);

    return results;
  }

  /**
   * Clear all validation caches
   */
  clearCache(): void {
    this.schemaValidationService.clearValidationCache();
    logger.info('🧹 All validation caches cleared');
  }

  /**
   * Get validation history for database
   */
  getValidationHistory(databaseId: string): SchemaValidationReport[] {
    return this.schemaValidationService.getValidationHistory(databaseId);
  }

  /**
   * Create error validation result
   */
  private createErrorResult(message: string): ValidationResult {
    return {
      valid: false,
      errors: [{
        code: 'VALIDATION_ERROR',
        name: 'VALIDATION_ERROR',
        message,
        severity: 'critical'
      }],
      warnings: [],
      suggestions: [],
      timestamp: new Date(),
      validatedBy: 'schema'
    };
  }

  /**
   * Calculate system summary statistics
   */
  private calculateSystemSummary(
    schemaReports: Record<string, SchemaValidationReport>,
    configConsistency: ValidationResult
  ) {
    const reports = Object.values(schemaReports);
    
    return {
      totalDatabases: reports.length,
      healthyDatabases: reports.filter(r => r.overallStatus === 'healthy').length,
      warningDatabases: reports.filter(r => r.overallStatus === 'warning').length,
      criticalDatabases: reports.filter(r => r.overallStatus === 'critical').length,
      totalErrors: reports.reduce((total, r) => 
        total + r.schemaConsistency.errors.length + 
        r.propertyMappings.errors.length + 
        r.configurationSync.errors.length + 
        r.runtimeValidation.errors.length, 0) + configConsistency.errors.length,
      totalWarnings: reports.reduce((total, r) => 
        total + r.schemaConsistency.warnings.length + 
        r.propertyMappings.warnings.length + 
        r.configurationSync.warnings.length + 
        r.runtimeValidation.warnings.length, 0) + configConsistency.warnings.length
    };
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(summary: any): 'healthy' | 'warning' | 'critical' {
    if (summary.criticalDatabases > 0 || summary.totalErrors > 0) {
      return 'critical';
    }
    if (summary.warningDatabases > 0 || summary.totalWarnings > 0) {
      return 'warning';
    }
    return 'healthy';
  }
}

// Export all validation services
export { SchemaValidationService } from './SchemaValidationService.js';
export { ConfigurationValidationService } from './ConfigurationValidationService.js';
export type * from '../../shared/types/index.js';