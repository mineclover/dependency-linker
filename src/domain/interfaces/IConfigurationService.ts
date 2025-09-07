/**
 * Configuration Service Interface
 * Defines the contract for configuration management business logic
 */

import type { NormalizedConfig } from '../../infrastructure/config/PureConfigNormalizer.js';

export interface ConfigProcessingOptions {
  validateIds?: boolean;
  autoDiscover?: boolean;
  updateMissingIds?: boolean;
  projectPath?: string;
}

export interface ProcessedConfig extends NormalizedConfig {
  isValid: boolean;
  validationErrors: string[];
  warnings?: string[];
  businessRules: {
    requiresParentPage: boolean;
    minimumDatabases: number;
    environmentSpecific: boolean;
    securityCompliant?: boolean;
  };
}

/**
 * Configuration Service Interface
 * Business layer contract for configuration management
 */
export interface IConfigurationService {
  /**
   * Load and process configuration with business rules
   */
  loadAndProcessConfig(
    projectPath: string,
    options?: ConfigProcessingOptions
  ): Promise<ProcessedConfig>;

  /**
   * Validate configuration against business rules
   */
  validateConfig(config: NormalizedConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Get cached configuration if available
   */
  getCachedConfig(): ProcessedConfig | null;

  /**
   * Clear configuration cache
   */
  clearCache(): void;

  /**
   * Apply business rules to configuration
   */
  applyBusinessRules(config: NormalizedConfig): ProcessedConfig;
}