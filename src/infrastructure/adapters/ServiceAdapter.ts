/**
 * Service Adapter - Legacy Compatibility Layer
 * Provides factory functions for backward compatibility with direct imports
 * 
 * This allows existing code to gradually migrate to dependency injection
 * while maintaining functionality during the transition period.
 */

import { getServiceContainer } from '../container/ServiceContainer.js';
import type { IConfigurationService } from '../../domain/interfaces/IConfigurationService.js';
import type { IProjectUploadService } from '../../domain/interfaces/IUploadService.js';
import { logger } from '../../shared/utils/index.js';

/**
 * Configuration Service Adapter
 * Provides legacy-compatible access to ConfigurationService
 */
export class ConfigurationServiceAdapter {
  private static instance: IConfigurationService | null = null;

  /**
   * Get configuration service instance (legacy compatibility)
   */
  static getInstance(): IConfigurationService {
    if (!this.instance) {
      try {
        const container = getServiceContainer();
        this.instance = container.resolve<IConfigurationService>('configurationService');
        logger.debug('ConfigurationService resolved through adapter');
      } catch (error) {
        logger.warning(`Failed to resolve ConfigurationService through DI: ${error}`);
        throw new Error('ConfigurationService not available - ensure service container is initialized');
      }
    }
    return this.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Upload Service Adapter
 * Provides legacy-compatible access to ProjectUploadService
 */
export class UploadServiceAdapter {
  private static instance: IProjectUploadService | null = null;

  /**
   * Get upload service instance (legacy compatibility)
   */
  static getInstance(): IProjectUploadService {
    if (!this.instance) {
      // ProjectUploadService moved to services layer for Clean Architecture compliance
      throw new Error('ProjectUploadService not available - use direct dependency injection instead of adapter');
    }
    return this.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Legacy Factory Functions
 * Provides direct function access for backward compatibility
 */

/**
 * Get configuration service instance
 * @deprecated Use dependency injection instead
 */
export function getConfigurationService(): IConfigurationService {
  logger.warning('⚠️ Using deprecated getConfigurationService() - migrate to dependency injection');
  return ConfigurationServiceAdapter.getInstance();
}

/**
 * Get upload service instance
 * @deprecated Use dependency injection instead
 */
export function getUploadService(): IProjectUploadService {
  logger.warning('⚠️ Using deprecated getUploadService() - migrate to dependency injection');
  return UploadServiceAdapter.getInstance();
}

/**
 * Initialize legacy adapters
 * Called automatically when adapters are first used
 */
export function initializeLegacyAdapters(): void {
  logger.info('🔄 Initializing legacy service adapters for backward compatibility');
  
  // Ensure service container is bootstrapped
  try {
    const container = getServiceContainer();
    logger.info('✅ Legacy service adapters ready');
  } catch (error) {
    logger.error(`❌ Failed to initialize legacy adapters: ${error}`);
    throw error;
  }
}

/**
 * Reset all legacy adapters (useful for testing)
 */
export function resetLegacyAdapters(): void {
  ConfigurationServiceAdapter.reset();
  UploadServiceAdapter.reset();
  logger.debug('Legacy service adapters reset');
}