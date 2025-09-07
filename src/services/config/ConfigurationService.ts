/**
 * Configuration Service - Business Logic Layer
 * Handles configuration workflows and business rules
 * 
 * Extracted from ConfigNormalizer to separate concerns:
 * - ConfigNormalizer: Pure data transformation (Infrastructure)
 * - ConfigurationService: Business workflows and validation (Services)
 */

import { logger } from '../../shared/utils/index.js';
import { PureConfigNormalizer, type NormalizedConfig, type ConfigSource } from '../../infrastructure/config/PureConfigNormalizer.js';
import type { 
  IConfigurationService, 
  ConfigProcessingOptions, 
  ProcessedConfig 
} from '../../domain/interfaces/IConfigurationService.js';

// Configuration types are now imported from domain interfaces

/**
 * Configuration repository interface
 */
export interface IConfigRepository {
  loadSources(projectPath: string): Promise<ConfigSource[]>;
  saveMergedConfig(config: NormalizedConfig, projectPath: string): Promise<void>;
  validateEnvironmentAccess(apiKey: string): Promise<boolean>;
}

/**
 * Configuration Service - Business workflow orchestration
 * Implements IConfigurationService interface for dependency injection
 */
export class ConfigurationService implements IConfigurationService {
  private cachedConfig: ProcessedConfig | null = null;

  constructor(
    private configNormalizer: PureConfigNormalizer,
    private configRepository: IConfigRepository
  ) {}

  /**
   * Load and process configuration with business rules
   */
  async loadAndProcessConfig(
    projectPath: string,
    options: ConfigProcessingOptions = {}
  ): Promise<ProcessedConfig> {
    const {
      validateIds = true,
      autoDiscover = false,
      updateMissingIds = false
    } = options;

    logger.info('🔧 Loading configuration with business rules...', '⚙️');

    // 1. Load configuration sources (delegated to repository)
    const sources = await this.configRepository.loadSources(projectPath);
    if (sources.length === 0) {
      logger.warning('No configuration sources found, using defaults');
    }

    // 2. Normalize configuration (delegated to infrastructure)
    const normalized = this.configNormalizer.normalize(sources);

    // 3. Apply business rules and validation
    const processed = await this.applyBusinessRulesInternal(normalized);

    // 4. Handle auto-discovery and updates (business logic)
    if (autoDiscover && !processed.isValid) {
      logger.info('🔍 Auto-discovering missing configuration...', '🔍');
      await this.autoDiscoverMissingConfig(processed);
    }

    // 5. Update configuration if requested (business workflow)
    if (updateMissingIds && processed.validationErrors.length > 0) {
      logger.info('🔄 Attempting to update missing IDs...', '🔄');
      await this.updateMissingIds(processed);
    }

    // 6. Save merged configuration (business workflow)
    if (processed.isValid) {
      await this.configRepository.saveMergedConfig(processed, projectPath);
    }

    logger.success(`Configuration processed: ${processed.isValid ? 'Valid' : 'Invalid'}`);
    return processed;
  }

  /**
   * Apply business rules and validation (internal method)
   */
  private async applyBusinessRulesInternal(config: NormalizedConfig): Promise<ProcessedConfig> {
    const validationErrors: string[] = [];
    const warnings: string[] = [];
    
    // Security rule: API key format validation
    if (!config.apiKey) {
      validationErrors.push('Notion API key is required');
    } else {
      // Validate API key format (Notion keys start with specific prefixes)
      const validPrefixes = ['secret_', 'ntn_'];
      const hasValidPrefix = validPrefixes.some(prefix => config.apiKey.startsWith(prefix));
      if (!hasValidPrefix) {
        warnings.push('API key format appears invalid - should start with secret_ or ntn_');
      }
      
      // Check if API key is properly secured (not in config files)
      if (config._metadata.source === 'project' || config._metadata.source === 'global') {
        warnings.push('API key should be stored in environment variables, not configuration files');
      }
    }

    // Business rule: Parent page required for database creation
    if (!config.parentPageId && Object.keys(config.databases).length === 0) {
      validationErrors.push('Parent page ID or existing databases required');
    }

    // Security rule: ID format validation
    const invalidIds: string[] = [];
    for (const [dbName, dbId] of Object.entries(config.databases)) {
      if (dbId && !this.isValidNotionId(dbId)) {
        invalidIds.push(`${dbName}: ${dbId}`);
      }
    }
    if (invalidIds.length > 0) {
      validationErrors.push(`Invalid database ID format: ${invalidIds.join(', ')}`);
    }
    
    if (config.parentPageId && !this.isValidNotionId(config.parentPageId)) {
      validationErrors.push('Invalid parent page ID format');
    }

    // Business rule: Environment validation
    if (config.apiKey && !await this.configRepository.validateEnvironmentAccess(config.apiKey)) {
      validationErrors.push('API key validation failed - check permissions');
    }

    // Business rule: Minimum database requirements
    const requiredDatabases = ['files'];
    const missingDatabases = requiredDatabases.filter(db => !config.databases[db]);
    if (missingDatabases.length > 0) {
      validationErrors.push(`Missing required databases: ${missingDatabases.join(', ')}`);
    }

    // Update validation metadata
    const validatedIds: Record<string, boolean> = {};
    for (const [dbName, dbId] of Object.entries(config.databases)) {
      validatedIds[dbName] = dbId && this.isValidNotionId(dbId);
    }

    const businessRules = {
      requiresParentPage: !config.parentPageId && Object.keys(config.databases).length === 0,
      minimumDatabases: requiredDatabases.length,
      environmentSpecific: config.environment !== 'development',
      securityCompliant: !warnings.some(w => w.includes('environment variables'))
    };

    return {
      ...config,
      isValid: validationErrors.length === 0,
      validationErrors,
      warnings,
      businessRules,
      _metadata: {
        ...config._metadata,
        validatedIds,
        lastValidated: new Date(),
        securityCheck: 'completed'
      }
    };
  }

  /**
   * Validate Notion ID format (UUID v4 or Notion-specific format)
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
   * Auto-discover missing configuration (business workflow)
   */
  private async autoDiscoverMissingConfig(config: ProcessedConfig): Promise<void> {
    if (!config.apiKey) {
      logger.warning('Cannot auto-discover without API key');
      return;
    }

    // Business logic: Try to discover parent page from existing databases
    if (!config.parentPageId && Object.keys(config.databases).length > 0) {
      logger.info('🔍 Attempting to discover parent page from existing databases...');
      // Implementation would query Notion API through repository
    }

    // Business logic: Try to discover missing databases
    if (config.businessRules.requiresParentPage) {
      logger.info('🔍 Attempting to discover existing databases...');
      // Implementation would search Notion workspace through repository
    }
  }

  /**
   * Update missing IDs (business workflow)
   */
  private async updateMissingIds(config: ProcessedConfig): Promise<void> {
    logger.info('🔄 Executing missing ID update workflow...');
    
    // Business workflow: Create missing databases if parent page exists
    if (config.parentPageId && config.businessRules.minimumDatabases > Object.keys(config.databases).length) {
      logger.info('Creating missing required databases...');
      // Implementation would create databases through Notion client
    }

    // Business workflow: Update configuration files
    logger.info('Updating configuration files with discovered IDs...');
    // Implementation would update project configuration files
  }

  /**
   * Validate configuration completeness (business rule)
   */
  validateConfigCompleteness(config: ProcessedConfig): boolean {
    return config.isValid && 
           config.apiKey !== undefined && 
           Object.keys(config.databases).length >= config.businessRules.minimumDatabases;
  }

  /**
   * Get configuration summary for reporting
   */
  getConfigurationSummary(config: ProcessedConfig): {
    status: 'complete' | 'partial' | 'invalid';
    summary: string;
    recommendations: string[];
  } {
    if (config.isValid && this.validateConfigCompleteness(config)) {
      return {
        status: 'complete',
        summary: `Configuration complete with ${Object.keys(config.databases).length} databases`,
        recommendations: []
      };
    }

    if (config.apiKey && Object.keys(config.databases).length > 0) {
      return {
        status: 'partial',
        summary: 'Partial configuration - some components missing',
        recommendations: config.validationErrors
      };
    }

    return {
      status: 'invalid',
      summary: 'Invalid configuration - missing critical components',
      recommendations: config.validationErrors
    };
  }

  /**
   * Validate configuration against business rules
   */
  async validateConfig(config: NormalizedConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate API key
    if (!config.apiKey) {
      errors.push('API key is required for Notion integration');
    }

    // Validate databases
    if (!config.databases || Object.keys(config.databases).length === 0) {
      errors.push('At least one database configuration is required');
    }

    // Validate parent page ID
    if (!config.parentPageId) {
      warnings.push('Parent page ID not set - databases will be created at workspace root');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get cached configuration if available
   */
  getCachedConfig(): ProcessedConfig | null {
    return this.cachedConfig;
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cachedConfig = null;
    logger.debug('Configuration cache cleared');
  }

  /**
   * Apply business rules to configuration (public method)
   */
  applyBusinessRules(config: NormalizedConfig): ProcessedConfig {
    const validationErrors: string[] = [];
    
    // Business rule: API key is required
    if (!config.apiKey) {
      validationErrors.push('API key is required for Notion integration');
    }

    // Business rule: At least one database is required
    const databaseCount = Object.keys(config.databases || {}).length;
    if (databaseCount === 0) {
      validationErrors.push('At least one database must be configured');
    }

    // Business rule: Parent page recommended for organization
    if (!config.parentPageId) {
      validationErrors.push('Parent page ID recommended for organized database structure');
    }

    const processed: ProcessedConfig = {
      ...config,
      isValid: validationErrors.length === 0,
      validationErrors,
      businessRules: {
        requiresParentPage: true,
        minimumDatabases: 1,
        environmentSpecific: !!process.env.NODE_ENV
      }
    };

    // Cache the processed config
    this.cachedConfig = processed;

    return processed;
  }
}