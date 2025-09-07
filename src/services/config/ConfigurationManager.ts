/**
 * Configuration Manager - Enhanced Security and ID Management
 * Centralized configuration management with security best practices
 */

import { logger } from '../../shared/utils/index.js';
import { ConfigurationService, type IConfigRepository } from './ConfigurationService.js';
import { PureConfigNormalizer } from '../../infrastructure/config/PureConfigNormalizer.js';
import { ConfigRepository } from '../../infrastructure/config/ConfigRepository.js';
import type { ProcessedConfig, ConfigProcessingOptions } from '../../domain/interfaces/IConfigurationService.js';

export interface ConfigurationSecurityReport {
  overall: 'secure' | 'warning' | 'critical';
  findings: {
    type: 'security' | 'validation' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation?: string;
  }[];
  recommendations: string[];
}

/**
 * Enhanced Configuration Manager with security and ID validation
 */
export class ConfigurationManager {
  private configService: ConfigurationService;
  private static instance: ConfigurationManager;

  constructor(
    configNormalizer: PureConfigNormalizer = new PureConfigNormalizer(),
    configRepository: IConfigRepository = new ConfigRepository()
  ) {
    this.configService = new ConfigurationService(configNormalizer, configRepository);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load configuration with enhanced security validation
   */
  async loadSecureConfiguration(
    projectPath: string,
    options: ConfigProcessingOptions & { performSecurityAudit?: boolean } = {}
  ): Promise<{ config: ProcessedConfig; securityReport?: ConfigurationSecurityReport }> {
    logger.info('🔒 Loading configuration with enhanced security validation...', '⚙️');

    // Load configuration
    const config = await this.configService.loadAndProcessConfig(projectPath, options);

    // Perform security audit if requested
    let securityReport: ConfigurationSecurityReport | undefined;
    if (options.performSecurityAudit !== false) {
      securityReport = await this.performSecurityAudit(config);
      
      // Log critical security issues
      const criticalFindings = securityReport.findings.filter(f => f.severity === 'critical');
      if (criticalFindings.length > 0) {
        logger.warning('🚨 Critical security issues detected in configuration');
        criticalFindings.forEach(finding => logger.error(`- ${finding.message}`));
      }
    }

    return { config, securityReport };
  }

  /**
   * Perform comprehensive security audit
   */
  async performSecurityAudit(config: ProcessedConfig): Promise<ConfigurationSecurityReport> {
    const findings: ConfigurationSecurityReport['findings'] = [];
    const recommendations: string[] = [];

    // Check API key security
    if (!config.apiKey) {
      findings.push({
        type: 'security',
        severity: 'critical',
        message: 'API key is missing',
        recommendation: 'Set NOTION_API_KEY environment variable'
      });
    } else if (!config.businessRules.securityCompliant) {
      findings.push({
        type: 'security',
        severity: 'high',
        message: 'API key stored in configuration file instead of environment variable',
        recommendation: 'Move API key to .env file and remove from configuration files'
      });
    }

    // Check ID validation
    const invalidIds = Object.entries(config._metadata.validatedIds || {})
      .filter(([_, isValid]) => !isValid)
      .map(([name]) => name);

    if (invalidIds.length > 0) {
      findings.push({
        type: 'validation',
        severity: 'medium',
        message: `Invalid ID formats detected: ${invalidIds.join(', ')}`,
        recommendation: 'Verify database IDs are correct Notion database identifiers'
      });
    }

    // Check configuration completeness
    if (!config.parentPageId && Object.keys(config.databases).length === 0) {
      findings.push({
        type: 'validation',
        severity: 'high',
        message: 'Neither parent page ID nor database IDs are configured',
        recommendation: 'Set NOTION_PARENT_PAGE_ID or configure database IDs'
      });
    }

    // Check environment consistency
    if (config.environment === 'production' && config._metadata.source !== 'env') {
      findings.push({
        type: 'security',
        severity: 'high',
        message: 'Production environment using non-environment configuration source',
        recommendation: 'Use environment variables in production environments'
      });
    }

    // Generate overall security rating
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    
    let overall: ConfigurationSecurityReport['overall'];
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (highCount > 0) {
      overall = 'warning';
    } else {
      overall = 'secure';
    }

    // Generate recommendations
    if (findings.length === 0) {
      recommendations.push('Configuration security looks good!');
    } else {
      recommendations.push('Review and address the security findings above');
      if (criticalCount > 0) {
        recommendations.push('Address critical security issues immediately');
      }
      if (!config.businessRules.securityCompliant) {
        recommendations.push('Migrate sensitive data to environment variables');
      }
    }

    return {
      overall,
      findings,
      recommendations
    };
  }

  /**
   * Validate and fix ID formats
   */
  async validateAndFixIds(config: ProcessedConfig): Promise<{
    fixes: Array<{ database: string; oldId: string; newId: string; action: string }>;
    validationResults: Record<string, boolean>;
  }> {
    const fixes: Array<{ database: string; oldId: string; newId: string; action: string }> = [];
    const validationResults: Record<string, boolean> = {};

    for (const [dbName, dbId] of Object.entries(config.databases)) {
      if (dbId) {
        const isValid = this.isValidNotionId(dbId);
        validationResults[dbName] = isValid;

        if (!isValid) {
          // Attempt to fix common ID format issues
          let fixedId = dbId;
          
          // Remove common prefixes/suffixes
          fixedId = fixedId.replace(/^(https?:\/\/.*\/|notion:\/\/)/g, '');
          fixedId = fixedId.replace(/(\?.*|\#.*)$/g, '');
          
          // Try to extract UUID from URL
          const uuidMatch = fixedId.match(/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})/i);
          if (uuidMatch) {
            fixedId = uuidMatch[1];
          } else {
            // Try to extract hex ID
            const hexMatch = fixedId.match(/([a-f0-9]{32})/i);
            if (hexMatch) {
              fixedId = hexMatch[1];
            }
          }

          if (this.isValidNotionId(fixedId) && fixedId !== dbId) {
            fixes.push({
              database: dbName,
              oldId: dbId,
              newId: fixedId,
              action: 'format_correction'
            });
            validationResults[dbName] = true;
          } else {
            logger.warning(`Cannot auto-fix invalid ID for ${dbName}: ${dbId}`);
          }
        }
      } else {
        validationResults[dbName] = false;
      }
    }

    return { fixes, validationResults };
  }

  /**
   * Validate Notion ID format
   */
  private isValidNotionId(id: string): boolean {
    if (!id) return false;
    
    // Remove dashes for validation
    const cleanId = id.replace(/-/g, '');
    
    // Notion IDs are either 32-character hex strings or UUIDs
    const hexPattern = /^[a-f0-9]{32}$/i;
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    
    return hexPattern.test(cleanId) || uuidPattern.test(id);
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(config: ProcessedConfig): {
    status: string;
    security: string;
    databases: number;
    validatedIds: number;
    issues: string[];
    nextSteps: string[];
  } {
    const databaseCount = Object.keys(config.databases).length;
    const validatedCount = Object.values(config._metadata.validatedIds || {})
      .filter(Boolean).length;

    const issues: string[] = [];
    const nextSteps: string[] = [];

    if (config.validationErrors && config.validationErrors.length > 0) {
      issues.push(...config.validationErrors);
    }

    if (config.warnings && config.warnings.length > 0) {
      issues.push(...config.warnings);
    }

    if (!config.businessRules.securityCompliant) {
      nextSteps.push('Move API key to environment variables');
    }

    if (validatedCount < databaseCount) {
      nextSteps.push('Fix invalid database ID formats');
    }

    if (issues.length === 0) {
      nextSteps.push('Configuration is ready for use');
    }

    return {
      status: config.isValid ? 'valid' : 'invalid',
      security: config.businessRules.securityCompliant ? 'secure' : 'needs-attention',
      databases: databaseCount,
      validatedIds: validatedCount,
      issues,
      nextSteps
    };
  }

  /**
   * Get underlying configuration service
   */
  getConfigurationService(): ConfigurationService {
    return this.configService;
  }
}