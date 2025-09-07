/**
 * Base Application Service - Service Layer Foundation
 * Provides standardized patterns for application services in Clean Architecture
 */

import { logger } from '../../shared/utils/index.js';
import type { NotionApiService } from '../../infrastructure/notion/core/NotionApiService.js';
import type { ConfigurationService } from '../config/ConfigurationService.js';
import type { ProcessedConfig } from '../../shared/types/index.js';

export interface ServiceDependencies {
  configService: ConfigurationService;
  config: ProcessedConfig;
  notionApiService?: NotionApiService;
}

export interface ServiceOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

/**
 * Base class for application services with standardized patterns
 */
export abstract class BaseApplicationService {
  protected dependencies: ServiceDependencies;
  protected options: ServiceOptions;
  protected serviceName: string;
  private metrics: Map<string, any> = new Map();

  constructor(
    dependencies: ServiceDependencies,
    serviceName: string,
    options: ServiceOptions = {}
  ) {
    this.dependencies = dependencies;
    this.serviceName = serviceName;
    this.options = {
      enableLogging: true,
      enableMetrics: false,
      enableCaching: false,
      ...options
    };

    if (this.options.enableLogging) {
      logger.debug(`${this.serviceName} initialized`);
    }
  }

  /**
   * Execute an operation with standardized error handling and metrics
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      enableRetry?: boolean;
      maxRetries?: number;
      logResult?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    const { enableRetry = false, maxRetries = 3, logResult = false } = options;

    if (this.options.enableLogging) {
      logger.debug(`${this.serviceName}.${operationName} started`);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    do {
      try {
        const result = await operation();
        
        // Record metrics
        if (this.options.enableMetrics) {
          const duration = Date.now() - startTime;
          this.recordMetric(operationName, {
            success: true,
            duration,
            attempt: attempt + 1
          });
        }

        if (this.options.enableLogging) {
          const duration = Date.now() - startTime;
          logger.debug(`${this.serviceName}.${operationName} completed in ${duration}ms`);
          
          if (logResult && result) {
            logger.debug(`${this.serviceName}.${operationName} result:`, result);
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (this.options.enableLogging) {
          logger.warning(`${this.serviceName}.${operationName} attempt ${attempt} failed: ${lastError.message}`);
        }

        if (!enableRetry || attempt >= maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        await this.delay(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
      }
    } while (attempt < maxRetries);

    // Record failed metrics
    if (this.options.enableMetrics) {
      const duration = Date.now() - startTime;
      this.recordMetric(operationName, {
        success: false,
        duration,
        attempt,
        error: lastError?.message
      });
    }

    if (this.options.enableLogging) {
      logger.error(`${this.serviceName}.${operationName} failed after ${attempt} attempts: ${lastError?.message}`);
    }

    throw new ServiceOperationError(
      `${this.serviceName}.${operationName} failed`,
      lastError,
      this.serviceName,
      operationName,
      attempt
    );
  }

  /**
   * Validate prerequisites for an operation
   */
  protected validatePrerequisites(checks: Array<{
    condition: boolean;
    message: string;
  }>): void {
    const failures = checks.filter(check => !check.condition);
    
    if (failures.length > 0) {
      const messages = failures.map(f => f.message).join(', ');
      throw new ServiceValidationError(
        `Prerequisites not met for ${this.serviceName}: ${messages}`,
        this.serviceName,
        failures
      );
    }
  }

  /**
   * Get service configuration safely
   */
  protected getConfig<T = any>(path: string, defaultValue?: T): T {
    try {
      const keys = path.split('.');
      let value: any = this.dependencies.config;
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      return value ?? defaultValue;
    } catch (error) {
      if (this.options.enableLogging) {
        logger.warning(`Failed to get config path '${path}' in ${this.serviceName}:`, error);
      }
      return defaultValue as T;
    }
  }

  /**
   * Record operation metrics
   */
  private recordMetric(operationName: string, data: any): void {
    const key = `${this.serviceName}.${operationName}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key).push({
      timestamp: new Date().toISOString(),
      ...data
    });

    // Keep only last 100 entries per operation
    const entries = this.metrics.get(key);
    if (entries.length > 100) {
      entries.splice(0, entries.length - 100);
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): Record<string, any[]> {
    const result: Record<string, any[]> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      result[key] = [...value];
    }
    
    return result;
  }

  /**
   * Clear service metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get service status
   */
  public getStatus(): {
    serviceName: string;
    healthy: boolean;
    lastActivity?: string;
    metricsCount: number;
    configValid: boolean;
  } {
    const metricsCount = Array.from(this.metrics.values())
      .reduce((total, entries) => total + entries.length, 0);
    
    const lastActivity = this.getLastActivity();
    
    return {
      serviceName: this.serviceName,
      healthy: true, // Override in subclasses for specific health checks
      lastActivity,
      metricsCount,
      configValid: !!this.dependencies.config
    };
  }

  /**
   * Get last activity timestamp
   */
  private getLastActivity(): string | undefined {
    let latestTimestamp: string | undefined;
    
    for (const entries of this.metrics.values()) {
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        if (!latestTimestamp || lastEntry.timestamp > latestTimestamp) {
          latestTimestamp = lastEntry.timestamp;
        }
      }
    }
    
    return latestTimestamp;
  }

  /**
   * Utility method for delays
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Abstract method for service-specific health checks
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Abstract method for service cleanup
   */
  protected abstract cleanup(): Promise<void>;
}

/**
 * Custom error classes for service operations
 */
export class ServiceOperationError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error | null,
    public readonly serviceName: string,
    public readonly operationName: string,
    public readonly attempts: number
  ) {
    super(message);
    this.name = 'ServiceOperationError';
  }
}

export class ServiceValidationError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly failures: Array<{ condition: boolean; message: string }>
  ) {
    super(message);
    this.name = 'ServiceValidationError';
  }
}

/**
 * Service factory pattern for standardized service creation
 */
export class ServiceFactory {
  private static serviceInstances: Map<string, BaseApplicationService> = new Map();

  static createService<T extends BaseApplicationService>(
    ServiceClass: new (deps: ServiceDependencies, ...args: any[]) => T,
    dependencies: ServiceDependencies,
    ...args: any[]
  ): T {
    const serviceName = ServiceClass.name;
    
    if (this.serviceInstances.has(serviceName)) {
      return this.serviceInstances.get(serviceName) as T;
    }

    const service = new ServiceClass(dependencies, ...args);
    this.serviceInstances.set(serviceName, service);
    
    return service;
  }

  static getService<T extends BaseApplicationService>(serviceName: string): T | null {
    return (this.serviceInstances.get(serviceName) as T) || null;
  }

  static async cleanupAllServices(): Promise<void> {
    const cleanupPromises = Array.from(this.serviceInstances.values())
      .map(service => service.cleanup().catch(error => 
        logger.error(`Failed to cleanup service ${service['serviceName']}: ` + (error instanceof Error ? error.message : String(error)))
      ));
    
    await Promise.all(cleanupPromises);
    this.serviceInstances.clear();
  }
}