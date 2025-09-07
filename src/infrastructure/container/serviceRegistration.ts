/**
 * Service Registration - Dependency Injection Setup
 * 
 * Centralized service registration for Clean Architecture compliance.
 * This replaces the scattered ConfigManager imports with a unified DI approach.
 */

import { ServiceContainer } from './ServiceContainer.js';
import { ConfigurationService } from '../../services/config/ConfigurationService.js';
import { ConfigRepository } from '../config/ConfigRepository.js';
import { PureConfigNormalizer } from '../config/PureConfigNormalizer.js';
import type { IConfigurationService } from '../../domain/interfaces/IConfigurationService.js';

/**
 * Register all core services with the container
 */
export function registerCoreServices(container: ServiceContainer): void {
  // Infrastructure Layer
  container.registerSingleton(
    'PureConfigNormalizer',
    () => new PureConfigNormalizer(),
    ['infrastructure', 'config']
  );

  container.registerSingleton(
    'ConfigRepository',
    () => new ConfigRepository(),
    ['infrastructure', 'config']
  );

  // Services Layer
  container.registerSingleton(
    'configurationService',
    (container) => new ConfigurationService(
      container.resolve('PureConfigNormalizer'),
      container.resolve('ConfigRepository')
    ),
    ['services', 'config']
  );
  
  // Also register with interface name for type compatibility
  container.registerSingleton(
    'IConfigurationService',
    (container) => container.resolve('configurationService'),
    ['services', 'config']
  );
}

/**
 * Get a pre-configured service container with all core services
 */
export function createServiceContainer(): ServiceContainer {
  const container = new ServiceContainer();
  registerCoreServices(container);
  return container;
}

/**
 * Global service container instance (singleton)
 */
let globalContainer: ServiceContainer | null = null;

/**
 * Get the global service container (creates if doesn't exist)
 */
export function getServiceContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = createServiceContainer();
  }
  return globalContainer;
}

/**
 * Reset the global container (useful for testing)
 */
export function resetServiceContainer(): void {
  globalContainer = null;
}