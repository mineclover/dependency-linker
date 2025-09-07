/**
 * Service Container - Simple Dependency Injection Container
 * Manages service registration and resolution for Clean Architecture
 * 
 * Following the refactoring design plan for dependency injection standardization
 */

import { logger } from '../../shared/utils/index.js';

/**
 * Service factory function type
 */
type ServiceFactory<T = any> = (container: ServiceContainer) => T;

/**
 * Service registration options
 */
interface ServiceOptions {
  singleton?: boolean;
  tags?: string[];
}

/**
 * Service registration entry
 */
interface ServiceRegistration<T = any> {
  factory: ServiceFactory<T>;
  options: ServiceOptions;
  instance?: T;
}

/**
 * Simple Service Container for Dependency Injection
 * Replaces direct imports with constructor injection pattern
 */
export class ServiceContainer {
  private services: Map<string, ServiceRegistration> = new Map();
  private singletonInstances: Map<string, any> = new Map();

  /**
   * Register a service with the container
   */
  register<T>(
    token: string, 
    factory: ServiceFactory<T>, 
    options: ServiceOptions = {}
  ): void {
    this.services.set(token, {
      factory,
      options: {
        singleton: false,
        tags: [],
        ...options
      }
    });

    logger.debug(`Service registered: ${token} (singleton: ${options.singleton})`);
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string, 
    factory: ServiceFactory<T>, 
    tags: string[] = []
  ): void {
    this.register(token, factory, { singleton: true, tags });
  }

  /**
   * Register an instance as a singleton
   */
  registerInstance<T>(token: string, instance: T, tags: string[] = []): void {
    this.singletonInstances.set(token, instance);
    this.services.set(token, {
      factory: () => instance,
      options: { singleton: true, tags },
      instance
    });

    logger.debug(`Instance registered: ${token}`);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: string): T {
    const registration = this.services.get(token);
    if (!registration) {
      throw new Error(`Service '${token}' not registered`);
    }

    // Return singleton instance if it exists
    if (registration.options.singleton) {
      if (registration.instance) {
        return registration.instance;
      }

      if (this.singletonInstances.has(token)) {
        return this.singletonInstances.get(token);
      }

      // Create and cache singleton instance
      const instance = registration.factory(this);
      this.singletonInstances.set(token, instance);
      registration.instance = instance;
      return instance;
    }

    // Create new instance for non-singletons
    return registration.factory(this);
  }

  /**
   * Check if service is registered
   */
  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Get all services by tag
   */
  getServicesByTag(tag: string): string[] {
    const services: string[] = [];
    
    for (const [token, registration] of this.services) {
      if (registration.options.tags?.includes(tag)) {
        services.push(token);
      }
    }
    
    return services;
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletonInstances.clear();
    logger.debug('Service container cleared');
  }

  /**
   * Bootstrap common services with proper dependencies
   */
  bootstrap(): void {
    logger.info('🏗️ Bootstrapping services with dependency injection...', '⚙️');

    // Use centralized service registration
    const { registerCoreServices } = require('./serviceRegistration.js');
    registerCoreServices(this);
    
    // Infrastructure layer services (non-config)
    this.registerInfrastructureServices();
    
    // Service layer services (non-config)
    this.registerBusinessServices();
    
    // Application layer services
    this.registerApplicationServices();
    
    // Debug: log registered services
    logger.debug(`Registered services: ${Array.from(this.services.keys()).join(', ')}`);
    
    logger.success('✅ Service container bootstrapped');
  }

  /**
   * Register infrastructure layer services (non-config services)
   * Config services are handled by registerCoreServices()
   */
  private registerInfrastructureServices(): void {
    logger.debug('Registering infrastructure services...');

    // Notion Infrastructure Services
    try {
      this.registerSingleton('notionClientFactory', (container) => {
        const { NotionClientFactory } = require('../../infrastructure/notion/core/NotionClientFactory.js');
        return NotionClientFactory;
      }, ['infrastructure', 'notion']);
      logger.debug('Registered notionClientFactory');
    } catch (error) {
      logger.error('Failed to register notionClientFactory: ' + (error instanceof Error ? error.message : String(error)));
    }

    // Register Notion Client from factory
    try {
      this.register('notionClient', (container) => {
        const configService = container.resolve('configurationService');
        const notionClientFactory = container.resolve('notionClientFactory');
        return notionClientFactory.createClient({ apiKey: process.env.NOTION_API_KEY });
      }, ['infrastructure', 'notion']);
      logger.debug('Registered notionClient');
    } catch (error) {
      logger.error('Failed to register notionClient: ' + (error instanceof Error ? error.message : String(error)));
    }

    // Register NotionApiService
    try {
      this.register('notionApiService', (container) => {
        const { NotionApiService } = require('../../infrastructure/notion/core/NotionApiService.js');
        const notionClient = container.resolve('notionClient');
        return new NotionApiService(notionClient);
      }, ['infrastructure', 'notion']);
      logger.debug('Registered notionApiService');
    } catch (error) {
      logger.error('Failed to register notionApiService: ' + (error instanceof Error ? error.message : String(error)));
    }

    // Remove direct environment access - this should come through configuration service
    // This service will be resolved dynamically when needed

    this.register('databaseOperationsManager', (container) => {
      const { DatabaseOperationsManager } = require('../../infrastructure/notion/DatabaseOperationsManager.js');
      const notionClient = container.resolve('notionClient');
      return new DatabaseOperationsManager(notionClient);
    }, ['infrastructure', 'notion']);

    // Upload Repository - will be instantiated with config when needed
    this.register('notionUploadRepository', (container) => {
      const { NotionUploadRepository } = require('../../infrastructure/notion/NotionUploadRepository.js');
      // Configuration will be injected when the service is instantiated by the application
      return NotionUploadRepository;
    }, ['infrastructure', 'upload']);
  }

  /**
   * Register business service layer services (non-config services)
   * Config services are handled by registerCoreServices()
   */
  private registerBusinessServices(): void {
    // Upload Service
    // Note: Moved to services layer to avoid Clean Architecture violations
    // Infrastructure layer should not import from services layer
    
    // Validation Services  
    // Note: Moved to services layer to avoid Clean Architecture violations
    // Infrastructure layer should not import from services layer
    
    logger.debug('Business services registration (config services handled by registerCoreServices)');
  }

  /**
   * Register application layer services
   */
  private registerApplicationServices(): void {
    // CLI Commands and other application services would be registered here
    logger.debug('Application services registration (placeholder)');
  }

  /**
   * Create Notion client for given API key
   */
  createNotionClient(apiKey: string): any {
    const notionClientFactory = this.resolve<any>('notionClientFactory');
    return notionClientFactory.createClient({ apiKey });
  }

  /**
   * Get container statistics
   */
  getStats(): {
    totalServices: number;
    singletons: number;
    instances: number;
    servicesByTag: Record<string, number>;
  } {
    const servicesByTag: Record<string, number> = {};
    
    for (const [, registration] of this.services) {
      for (const tag of registration.options.tags || []) {
        servicesByTag[tag] = (servicesByTag[tag] || 0) + 1;
      }
    }

    return {
      totalServices: this.services.size,
      singletons: Array.from(this.services.values()).filter(r => r.options.singleton).length,
      instances: this.singletonInstances.size,
      servicesByTag
    };
  }
}

/**
 * Global service container instance
 */
let globalContainer: ServiceContainer | null = null;

/**
 * Get or create global service container
 */
export function getServiceContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = new ServiceContainer();
    globalContainer.bootstrap();
  }
  return globalContainer;
}

/**
 * Reset global container (useful for testing)
 */
export function resetServiceContainer(): void {
  globalContainer = null;
}