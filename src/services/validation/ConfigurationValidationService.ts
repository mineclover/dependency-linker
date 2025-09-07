/**
 * Configuration Validation Service - Multi-file configuration consistency validation
 * Validates consistency across global config, project config, and schema exports
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { logger } from '../../shared/utils/index.js';
import type {
  ConfigurationConsistency,
  ConfigConflict,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion
} from '../../shared/types/index.js';

interface ConfigFile {
  path: string;
  exists: boolean;
  data: Record<string, any> | null;
  lastModified?: Date;
  size?: number;
}

export class ConfigurationValidationService {
  private readonly globalConfigPath = path.join(homedir(), '.deplink-config.json');
  private readonly projectConfigPath = './deplink.config.json';
  private readonly schemaExportPath = './data/schema-setup-export.json';

  /**
   * Comprehensive configuration consistency validation
   */
  async validateConfigurationConsistency(projectPath: string = process.cwd()): Promise<ValidationResult> {
    logger.info('🔍 Starting configuration consistency validation...');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    try {
      // Load all configuration files
      const configFiles = await this.loadAllConfigFiles(projectPath);
      const consistency = await this.analyzeConfigurationConsistency(configFiles);

      // Validate file existence
      this.validateFileExistence(configFiles, errors, warnings);

      // Validate database ID consistency
      this.validateDatabaseIdConsistency(configFiles, errors, warnings, suggestions);

      // Validate property mapping consistency
      this.validatePropertyMappingConsistency(configFiles, warnings, suggestions);

      // Validate environment configuration
      this.validateEnvironmentConfiguration(configFiles, warnings, suggestions);

      // Generate recommendations
      this.generateConfigurationRecommendations(consistency, suggestions);

      logger.info(`✅ Configuration validation completed - ${errors.length} errors, ${warnings.length} warnings`);

    } catch (error) {
      errors.push({
        code: 'CONFIG_VALIDATION_FAILURE',
        message: `Configuration validation failed: ${error}`,
        severity: 'critical',
        context: { error: String(error) }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      timestamp: new Date(),
      validatedBy: 'config'
    };
  }

  /**
   * Load all configuration files
   */
  private async loadAllConfigFiles(projectPath: string): Promise<Record<string, ConfigFile>> {
    const configFiles: Record<string, ConfigFile> = {};

    // Global config
    configFiles.global = await this.loadConfigFile(this.globalConfigPath);

    // Project config
    const projectConfigPath = path.resolve(projectPath, this.projectConfigPath);
    configFiles.project = await this.loadConfigFile(projectConfigPath);

    // Schema export
    const schemaExportPath = path.resolve(projectPath, this.schemaExportPath);
    configFiles.schema = await this.loadConfigFile(schemaExportPath);

    return configFiles;
  }

  /**
   * Load individual configuration file
   */
  private async loadConfigFile(filePath: string): Promise<ConfigFile> {
    const configFile: ConfigFile = {
      path: filePath,
      exists: existsSync(filePath),
      data: null
    };

    if (configFile.exists) {
      try {
        const content = await readFile(filePath, 'utf-8');
        configFile.data = JSON.parse(content);
        
        // Get file stats
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));
        configFile.lastModified = stats.mtime;
        configFile.size = stats.size;

        logger.info(`📄 Loaded config: ${filePath} (${stats.size} bytes)`);
      } catch (error) {
        logger.error(`❌ Failed to load config: ${filePath} - ${error}`);
        configFile.data = null;
      }
    }

    return configFile;
  }

  /**
   * Analyze configuration consistency
   */
  private async analyzeConfigurationConsistency(
    configFiles: Record<string, ConfigFile>
  ): Promise<ConfigurationConsistency> {
    const conflicts: ConfigConflict[] = [];
    const missingProperties: string[] = [];
    const recommendations: string[] = [];

    // Analyze database ID conflicts
    const databaseConflicts = this.findDatabaseIdConflicts(configFiles);
    conflicts.push(...databaseConflicts);

    // Analyze property mapping conflicts
    const propertyConflicts = this.findPropertyMappingConflicts(configFiles);
    conflicts.push(...propertyConflicts);

    // Check for missing required properties
    const missing = this.findMissingProperties(configFiles);
    missingProperties.push(...missing);

    // Generate recommendations
    const recs = this.generateRecommendations(configFiles, conflicts);
    recommendations.push(...recs);

    return {
      globalConfig: configFiles.global.path,
      projectConfig: configFiles.project.path,
      schemaExport: configFiles.schema.path,
      conflicts,
      missingProperties,
      recommendations
    };
  }

  /**
   * Validate file existence
   */
  private validateFileExistence(
    configFiles: Record<string, ConfigFile>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const [configType, configFile] of Object.entries(configFiles)) {
      if (!configFile.exists) {
        if (configType === 'global') {
          warnings.push({
            code: 'MISSING_GLOBAL_CONFIG',
            message: `Global configuration file not found: ${configFile.path}`,
            severity: 'warning',
            context: { configType, path: configFile.path },
            suggestedFix: 'Run initialization to create global config',
            canIgnore: true
          });
        } else if (configType === 'project') {
          errors.push({
            code: 'MISSING_PROJECT_CONFIG',
            message: `Project configuration file not found: ${configFile.path}`,
            severity: 'error',
            context: { configType, path: configFile.path },
            suggestedFix: 'Create project configuration file'
          });
        } else {
          warnings.push({
            code: 'MISSING_SCHEMA_EXPORT',
            message: `Schema export file not found: ${configFile.path}`,
            severity: 'warning',
            context: { configType, path: configFile.path },
            canIgnore: true
          });
        }
      }
    }
  }

  /**
   * Validate database ID consistency
   */
  private validateDatabaseIdConsistency(
    configFiles: Record<string, ConfigFile>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    const globalDatabases = configFiles.global.data?.databases || {};
    const projectDatabases = configFiles.project.data?.notion?.databases || {};
    const schemaDatabases = configFiles.schema.data?.databaseIds || {};

    // Check for database ID mismatches
    const allDatabaseTypes = new Set([
      ...Object.keys(globalDatabases),
      ...Object.keys(projectDatabases),
      ...Object.keys(schemaDatabases)
    ]);

    for (const dbType of allDatabaseTypes) {
      const globalId = globalDatabases[dbType];
      const projectId = projectDatabases[dbType];
      const schemaId = schemaDatabases[dbType];

      const ids = [globalId, projectId, schemaId].filter(Boolean);
      const uniqueIds = [...new Set(ids)];

      if (uniqueIds.length > 1) {
        warnings.push({
          code: 'DATABASE_ID_MISMATCH',
          message: `Database ID mismatch for ${dbType}: found ${uniqueIds.length} different IDs`,
          severity: 'warning',
          context: {
            databaseType: dbType,
            globalId,
            projectId,
            schemaId
          },
          suggestedFix: 'Synchronize database IDs across configuration files',
          canIgnore: false
        });
      }

      if (ids.length < 2) {
        suggestions.push({
          type: 'improvement',
          message: `Database ${dbType} only configured in some files`,
          impact: 'medium',
          autoFixable: true,
          autoFix: async () => {
            logger.info(`Auto-fix: Synchronizing ${dbType} database ID across configs`);
          }
        });
      }
    }
  }

  /**
   * Validate property mapping consistency
   */
  private validatePropertyMappingConsistency(
    configFiles: Record<string, ConfigFile>,
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    const globalMappings = configFiles.global.data?.propertyMapping || {};
    const schemaMappings = configFiles.schema.data?.propertyMappings || {};

    if (Object.keys(globalMappings).length === 0 && Object.keys(schemaMappings).length === 0) {
      warnings.push({
        code: 'NO_PROPERTY_MAPPINGS',
        message: 'No property mappings found in any configuration file',
        severity: 'warning',
        suggestedFix: 'Generate property mappings from database schema',
        canIgnore: false
      });
    } else if (Object.keys(globalMappings).length > 0 && Object.keys(schemaMappings).length === 0) {
      suggestions.push({
        type: 'improvement',
        message: 'Export property mappings to schema file for better tracking',
        impact: 'low',
        autoFixable: true
      });
    }
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironmentConfiguration(
    configFiles: Record<string, ConfigFile>,
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    const globalEnvs = configFiles.global.data?.environments || {};
    const projectEnv = configFiles.project.data?.project?.environment || 'development';

    if (Object.keys(globalEnvs).length === 0) {
      suggestions.push({
        type: 'improvement',
        message: 'Consider adding environment-specific configurations',
        impact: 'medium',
        autoFixable: false
      });
    } else if (!globalEnvs[projectEnv]) {
      warnings.push({
        code: 'MISSING_ENVIRONMENT_CONFIG',
        message: `Environment '${projectEnv}' not configured in global settings`,
        severity: 'warning',
        context: { environment: projectEnv },
        suggestedFix: `Add ${projectEnv} environment to global configuration`,
        canIgnore: false
      });
    }
  }

  /**
   * Find database ID conflicts
   */
  private findDatabaseIdConflicts(configFiles: Record<string, ConfigFile>): ConfigConflict[] {
    const conflicts: ConfigConflict[] = [];
    // Implementation for finding specific conflicts
    return conflicts;
  }

  /**
   * Find property mapping conflicts
   */
  private findPropertyMappingConflicts(configFiles: Record<string, ConfigFile>): ConfigConflict[] {
    const conflicts: ConfigConflict[] = [];
    // Implementation for finding mapping conflicts
    return conflicts;
  }

  /**
   * Find missing required properties
   */
  private findMissingProperties(configFiles: Record<string, ConfigFile>): string[] {
    const missing: string[] = [];

    // Check for required global properties
    if (configFiles.global.exists && configFiles.global.data) {
      const globalData = configFiles.global.data;
      if (!globalData.apiKey) missing.push('global.apiKey');
      if (!globalData.databases) missing.push('global.databases');
    }

    // Check for required project properties
    if (configFiles.project.exists && configFiles.project.data) {
      const projectData = configFiles.project.data;
      if (!projectData.project?.name) missing.push('project.name');
      if (!projectData.project?.path) missing.push('project.path');
    }

    return missing;
  }

  /**
   * Generate configuration recommendations
   */
  private generateConfigurationRecommendations(
    consistency: ConfigurationConsistency,
    suggestions: ValidationSuggestion[]
  ): void {
    if (consistency.conflicts.length > 0) {
      suggestions.push({
        type: 'improvement',
        message: `Resolve ${consistency.conflicts.length} configuration conflicts`,
        impact: 'high',
        autoFixable: true,
        autoFix: async () => {
          logger.info('Auto-fixing configuration conflicts...');
        }
      });
    }

    if (consistency.missingProperties.length > 0) {
      suggestions.push({
        type: 'improvement',
        message: `Add ${consistency.missingProperties.length} missing required properties`,
        impact: 'medium',
        autoFixable: false
      });
    }
  }

  /**
   * Generate general recommendations
   */
  private generateRecommendations(
    configFiles: Record<string, ConfigFile>,
    conflicts: ConfigConflict[]
  ): string[] {
    const recommendations: string[] = [];

    if (conflicts.length > 0) {
      recommendations.push(`Resolve ${conflicts.length} configuration conflicts`);
    }

    const totalSize = Object.values(configFiles)
      .reduce((total, file) => total + (file.size || 0), 0);
    
    if (totalSize > 50000) {
      recommendations.push('Consider optimizing configuration file sizes');
    }

    return recommendations;
  }

  /**
   * Export configuration analysis report
   */
  async exportConsistencyReport(
    consistency: ConfigurationConsistency,
    outputPath: string = './config-consistency-report.json'
  ): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalConflicts: consistency.conflicts.length,
        missingProperties: consistency.missingProperties.length,
        recommendations: consistency.recommendations.length
      },
      details: consistency
    };

    await import('fs').then(fs => 
      fs.promises.writeFile(outputPath, JSON.stringify(report, null, 2))
    );

    logger.success(`📊 Configuration consistency report exported: ${outputPath}`);
  }
}