/**
 * Validation Service Interfaces
 * Defines contracts for validation business logic
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  WorkspaceConfig
} from '../../shared/types/index.js';

/**
 * Validation options
 */
export interface ValidationOptions {
  includeWarnings?: boolean;
  includeSuggestions?: boolean;
  validateSchema?: boolean;
  validateAccess?: boolean;
  validateData?: boolean;
  timeout?: number;
}

/**
 * Remediation result
 */
export interface RemediationResult {
  attempted: number;
  successful: number;
  failed: number;
  details: string[];
}

/**
 * Base Validation Service Interface
 * Common contract for all validation services
 */
export interface IValidationService {
  /**
   * Perform validation with options
   */
  validate(...args: any[]): Promise<ValidationResult>;

  /**
   * Get validation capabilities
   */
  getCapabilities(): {
    canValidateSchema: boolean;
    canValidateAccess: boolean;
    canValidateData: boolean;
    canAutoRemediate: boolean;
  };

  /**
   * Execute automatic remediation if supported
   */
  executeAutoRemediation(dryRun: boolean): Promise<RemediationResult>;
}

/**
 * Configuration Validation Service Interface
 */
export interface IConfigurationValidationService extends IValidationService {
  /**
   * Validate configuration structure and content
   */
  validateConfiguration(
    config: WorkspaceConfig,
    options?: ValidationOptions
  ): Promise<ValidationResult>;

  /**
   * Validate environment setup
   */
  validateEnvironment(
    config: WorkspaceConfig
  ): Promise<ValidationResult>;

  /**
   * Validate API connectivity
   */
  validateApiConnectivity(
    apiKey: string
  ): Promise<ValidationResult>;
}

/**
 * Database Access Validation Service Interface
 */
export interface IDatabaseAccessValidationService extends IValidationService {
  /**
   * Validate database access permissions
   */
  validateDatabaseAccess(
    databaseId: string,
    databaseName?: string
  ): Promise<ValidationResult>;

  /**
   * Validate all configured databases
   */
  validateAllDatabaseAccess(): Promise<ValidationResult>;

  /**
   * Get access issues for reporting
   */
  getAccessIssues(): Array<{
    databaseName: string;
    databaseId: string;
    issueType: string;
    severity: 'critical' | 'error' | 'warning';
    errorMessage: string;
    autoFixable: boolean;
    suggestedActions: Array<{
      description: string;
      priority: number;
      autoExecutable: boolean;
    }>;
  }>;
}

/**
 * Schema Validation Service Interface
 */
export interface ISchemaValidationService extends IValidationService {
  /**
   * Validate database schema against expected structure
   */
  validateDatabaseSchema(
    databaseId: string,
    expectedSchema: any
  ): Promise<ValidationResult>;

  /**
   * Validate schema compatibility
   */
  validateSchemaCompatibility(
    sourceSchema: any,
    targetSchema: any
  ): Promise<ValidationResult>;

  /**
   * Generate schema migration plan
   */
  generateMigrationPlan(
    currentSchema: any,
    targetSchema: any
  ): Promise<{
    migrations: Array<{
      type: 'add' | 'remove' | 'modify';
      property: string;
      description: string;
      risk: 'low' | 'medium' | 'high';
    }>;
    estimatedDuration: number;
    warnings: string[];
  }>;
}