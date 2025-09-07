/**
 * BaseValidationService - Base class for all validation services
 * Refactored to use dependency injection instead of direct imports
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  WorkspaceConfig
} from '../../shared/types/index.js';
import type { ConfigurationService } from '../config/ConfigurationService.js';

/**
 * Notion client factory interface
 */
export interface INotionClientFactory {
  createClient(apiKey: string): Client;
}

/**
 * Database operations interface
 */
export interface IDatabaseOperationsManager {
  validateDatabase(databaseId: string): Promise<boolean>;
}

/**
 * BaseValidationService - Business Logic Layer
 * Provides common functionality for all validation services
 */
export abstract class BaseValidationService {
  protected configService: ConfigurationService;
  protected notionClientFactory: INotionClientFactory;
  protected dbManager: IDatabaseOperationsManager | null = null;
  protected config: WorkspaceConfig | null = null;

  constructor(
    configService: ConfigurationService,
    notionClientFactory: INotionClientFactory,
    dbManager?: IDatabaseOperationsManager
  ) {
    this.configService = configService;
    this.notionClientFactory = notionClientFactory;
    this.dbManager = dbManager || null;
    
    this.initializeServices();
  }

  /**
   * Initialize services with dependency injection
   */
  private initializeServices(): void {
    try {
      // Get cached config first
      const cachedConfig = this.configService.getCachedConfig();
      if (cachedConfig?.apiKey) {
        this.config = cachedConfig;
        logger.info('✅ BaseValidationService initialized with cached config');
      } else {
        logger.info('ℹ️ BaseValidationService created, waiting for configuration');
      }
    } catch (error) {
      logger.warning(`⚠️ BaseValidationService initialization warning: ${error}`);
    }
  }

  /**
   * Load and validate configuration
   */
  protected async loadConfiguration(): Promise<WorkspaceConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      this.config = await this.configService.loadAndProcessConfig(process.cwd()) as WorkspaceConfig;
      logger.info('✅ Configuration loaded in BaseValidationService');
      return this.config;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Configuration loading failed: ${message}`);
      throw new Error(`Configuration loading failed: ${message}`);
    }
  }

  /**
   * Validate that a database exists and is accessible
   */
  protected async validateDatabaseExists(databaseId: string): Promise<boolean> {
    if (!this.dbManager) {
      logger.warning('Database manager not available for validation');
      return false;
    }
    
    try {
      const result = await this.dbManager.validateDatabase(databaseId);
      return result;
    } catch (error) {
      logger.error(`❌ Database validation failed for ${databaseId}: ${error}`);
      return false;
    }
  }

  /**
   * Create a standardized validation error
   */
  protected createValidationError(
    code: string, 
    message: string, 
    context: any = {},
    severity: 'critical' | 'error' | 'warning' = 'error'
  ): ValidationError {
    return {
      code,
      message,
      severity,
      context,
      name: code,
      suggestedFix: this.getSuggestedFix(code)
    };
  }

  /**
   * Create a standardized validation warning
   */
  protected createValidationWarning(
    code: string, 
    message: string, 
    context: any = {},
    canIgnore: boolean = false
  ): ValidationWarning {
    return {
      code,
      message,
      severity: 'warning' as const,
      context,
      name: code,
      canIgnore,
      suggestedFix: this.getSuggestedFix(code)
    };
  }

  /**
   * Create a standardized validation suggestion
   */
  protected createValidationSuggestion(
    type: 'improvement' | 'optimization' | 'performance' | 'security',
    message: string,
    impact: 'low' | 'medium' | 'high',
    autoFixable: boolean = false,
    autoFix?: () => Promise<void>
  ): ValidationSuggestion {
    return {
      type,
      message,
      impact,
      autoFixable,
      autoFix
    };
  }

  /**
   * Get suggested fix for common error codes
   */
  private getSuggestedFix(code: string): string | undefined {
    const fixes: Record<string, string> = {
      'DATABASE_NOT_FOUND': 'Verify database ID in configuration or recreate database',
      'NO_CONFIG_FOUND': 'Run initialization command to create configuration',
      'INVALID_API_KEY': 'Check API key format and permissions in Notion',
      'PROPERTY_MAPPING_ERROR': 'Review database schema and property mappings',
      'CONFIG_VALIDATION_ERROR': 'Check configuration file syntax and required fields',
      'RUNTIME_VALIDATION_ERROR': 'Verify network connectivity and API permissions',
      'NO_PROPERTIES': 'Add properties to database schema definition',
      'NO_TITLE_PROPERTY': 'Add a title property to the database',
      'NOTION_API_ERROR': 'Check API key, network connectivity, and rate limits'
    };

    return fixes[code];
  }

  /**
   * Create a successful validation result
   */
  protected createSuccessResult(): ValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      timestamp: new Date(),
      validatedBy: 'runtime'
    };
  }

  /**
   * Create a failed validation result
   */
  protected createFailureResult(
    errors: ValidationError[],
    warnings: ValidationWarning[] = [],
    suggestions: ValidationSuggestion[] = []
  ): ValidationResult {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      timestamp: new Date(),
      validatedBy: 'runtime'
    };
  }

  /**
   * Validate basic configuration structure
   */
  protected validateBasicConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check API key
    if (!config.apiKey) {
      errors.push(this.createValidationError(
        'NO_API_KEY',
        'API key is required for Notion integration',
        { config },
        'critical'
      ));
    } else if (!config.apiKey.startsWith('ntn_') && !config.apiKey.startsWith('secret_')) {
      warnings.push(this.createValidationWarning(
        'UNUSUAL_API_KEY_FORMAT',
        'API key format is unusual - verify it is correct',
        { apiKey: config.apiKey.substring(0, 8) + '...' },
        true
      ));
    }

    // Check databases configuration
    if (!config.databases || Object.keys(config.databases).length === 0) {
      errors.push(this.createValidationError(
        'NO_DATABASES',
        'At least one database configuration is required',
        { config },
        'critical'
      ));
    }

    return this.createFailureResult(errors, warnings);
  }

  /**
   * Handle common API errors
   */
  protected handleApiError(error: any, context: string): ValidationError {
    const errorContext = {
      context,
      error: String(error),
      message: error.message || 'Unknown error'
    };

    if (error.code === 'unauthorized') {
      return this.createValidationError(
        'UNAUTHORIZED',
        'API key is invalid or lacks required permissions',
        errorContext,
        'critical'
      );
    }

    if (error.code === 'object_not_found') {
      return this.createValidationError(
        'OBJECT_NOT_FOUND',
        'Database or page not found - check ID and permissions',
        errorContext,
        'error'
      );
    }

    if (error.code === 'rate_limited') {
      return this.createValidationError(
        'RATE_LIMITED',
        'API rate limit exceeded - reduce request frequency',
        errorContext,
        'warning'
      );
    }

    // Generic API error
    return this.createValidationError(
      'API_ERROR',
      `API request failed: ${error.message || error}`,
      errorContext,
      'error'
    );
  }

  /**
   * Log validation summary
   */
  protected logValidationSummary(
    validationName: string,
    result: ValidationResult,
    additionalInfo?: any
  ): void {
    const statusEmoji = {
      true: '✅',
      false: result.errors.some(e => e.severity === 'critical') ? '🚨' : '⚠️'
    };

    const status = result.valid ? 'PASSED' : 'FAILED';
    
    logger.info(`${statusEmoji[String(result.valid) as keyof typeof statusEmoji]} ${validationName} validation: ${status}`);
    
    if (result.errors.length > 0) {
      logger.error(`   Errors: ${result.errors.length}`);
      result.errors.forEach(error => 
        logger.error(`     - ${error.code}: ${error.message}`)
      );
    }

    if (result.warnings.length > 0) {
      logger.warning(`   Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warning => 
        logger.warning(`     - ${warning.code}: ${warning.message}`)
      );
    }

    if (result.suggestions.length > 0) {
      logger.info(`   Suggestions: ${result.suggestions.length}`);
      result.suggestions.forEach(suggestion => 
        logger.info(`     - ${suggestion.type}: ${suggestion.message}`)
      );
    }

    if (additionalInfo) {
      logger.info(`   Additional: ${JSON.stringify(additionalInfo, null, 2)}`);
    }
  }

  /**
   * Abstract method that must be implemented by subclasses
   */
  abstract validate(...args: any[]): Promise<ValidationResult>;
}