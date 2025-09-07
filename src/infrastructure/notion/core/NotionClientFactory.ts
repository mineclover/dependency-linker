/**
 * Notion Client Factory - Infrastructure Layer
 * Standardized factory for creating Notion client instances with consistent configuration
 */

import { Client } from '@notionhq/client';
import { logger } from '../../../shared/utils/index.js';
import { EnhancedNotionApiQueue } from '../../../shared/utils/apiQueue.js';
import { CircuitBreakerManager } from '../../../shared/utils/circuitBreakerManager.js';
import type { NotionConfig } from '../../../shared/types/index.js';

export interface NotionClientConfig {
  apiKey: string;
  projectPath?: string;
  workspaceUrl?: string;
  parentPageId?: string;
  rateLimitDelay?: number;
  maxRetries?: number;
  enableCircuitBreaker?: boolean;
  timeoutMs?: number;
}

export interface INotionClientInstance {
  client: Client;
  apiQueue: EnhancedNotionApiQueue;
  circuitBreaker?: CircuitBreakerManager;
  config: NotionClientConfig;
  
  // Standard methods
  isHealthy(): Promise<boolean>;
  validateAccess(): Promise<boolean>;
  getWorkspaceInfo(): Promise<any>;
  resetConnection(): Promise<void>;
}

/**
 * Standardized Notion Client Instance
 */
export class NotionClientInstance implements INotionClientInstance {
  public readonly client: Client;
  public readonly apiQueue: EnhancedNotionApiQueue;
  public readonly circuitBreaker?: CircuitBreakerManager;
  public readonly config: NotionClientConfig;
  private connectionValidated: boolean = false;

  constructor(config: NotionClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
    
    this.client = new Client({
      auth: this.config.apiKey,
      timeoutMs: this.config.timeoutMs,
      notionVersion: '2025-09-03'
    });

    this.apiQueue = new EnhancedNotionApiQueue(
      this.config.rateLimitDelay!,
      this.config.maxRetries!
    );

    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreakerManager({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringInterval: 60000
      });
    }

    logger.debug(`Notion client instance created for project: ${this.config.projectPath || 'unknown'}`);
  }

  /**
   * Check if client is healthy and API is accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (this.circuitBreaker) {
        const health = this.circuitBreaker.getSystemHealth();
        if (health.overall === 'critical') {
          return false;
        }
      }

      const response = await this.client.users.me();
      return !!response.id;
    } catch (error) {
      logger.debug(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Validate API access and permissions
   */
  async validateAccess(): Promise<boolean> {
    try {
      if (this.connectionValidated) {
        return true;
      }

      // Test basic API access
      const response = await this.client.users.me();
      if (!response.id) {
        return false;
      }

      // Test search capability (required for most operations)
      await this.client.search({
        query: '',
        page_size: 1
      });

      this.connectionValidated = true;
      logger.debug('Notion API access validated successfully');
      return true;

    } catch (error) {
      logger.warning(`API validation failed: ${error}`);
      
      if (this.circuitBreaker) {
        // Failure is automatically recorded by the API queue
        // No direct recordFailure method needed
      }
      
      return false;
    }
  }

  /**
   * Get workspace information
   */
  async getWorkspaceInfo(): Promise<any> {
    try {
      const user = await this.client.users.me();
      
      return {
        user: {
          id: user.id,
          name: user.name,
          type: user.type
        },
        workspace: {
          url: this.config.workspaceUrl,
          parentPageId: this.config.parentPageId
        }
      };
    } catch (error) {
      logger.error(`Failed to get workspace info: ${error}`);
      throw new Error(`Workspace info retrieval failed: ${error}`);
    }
  }

  /**
   * Reset connection and validation state
   */
  async resetConnection(): Promise<void> {
    this.connectionValidated = false;
    
    if (this.circuitBreaker) {
      // Reset the API queue's circuit breaker state
      const queue = this.circuitBreaker.getApiQueue('notion');
      queue.reset();
    }
    
    logger.debug('Notion client connection reset');
  }
}

/**
 * Default client configuration
 */
const DEFAULT_CLIENT_CONFIG: Partial<NotionClientConfig> = {
  rateLimitDelay: 350,
  maxRetries: 5,
  enableCircuitBreaker: true,
  timeoutMs: 30000
};

/**
 * Notion Client Factory
 * Creates standardized client instances with consistent configuration
 */
export class NotionClientFactory {
  private static instances: Map<string, NotionClientInstance> = new Map();

  /**
   * Create a new Notion client instance
   */
  static createClient(config: NotionClientConfig): NotionClientInstance {
    if (!config.apiKey) {
      throw new Error('Notion API key is required');
    }

    return new NotionClientInstance(config);
  }

  /**
   * Get or create a cached client instance
   */
  static getOrCreateClient(
    instanceKey: string, 
    config: NotionClientConfig
  ): NotionClientInstance {
    if (!this.instances.has(instanceKey)) {
      const instance = this.createClient(config);
      this.instances.set(instanceKey, instance);
      logger.debug(`Created cached Notion client instance: ${instanceKey}`);
    }

    return this.instances.get(instanceKey)!;
  }

  /**
   * Create client from NotionConfig
   */
  static createFromConfig(notionConfig: NotionConfig): NotionClientInstance {
    const config: NotionClientConfig = {
      apiKey: notionConfig.apiKey,
      workspaceUrl: notionConfig.workspaceUrl,
      parentPageId: notionConfig.parentPageId,
      rateLimitDelay: 350,
      maxRetries: 5,
      enableCircuitBreaker: true
    };

    return this.createClient(config);
  }

  /**
   * Validate client configuration
   */
  static validateConfig(config: NotionClientConfig): { 
    isValid: boolean; 
    errors: string[]; 
  } {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.apiKey.startsWith('secret_')) {
      errors.push('API key must start with "secret_"');
    }

    if (config.rateLimitDelay && config.rateLimitDelay < 100) {
      errors.push('Rate limit delay should be at least 100ms');
    }

    if (config.maxRetries && config.maxRetries < 1) {
      errors.push('Max retries should be at least 1');
    }

    if (config.timeoutMs && config.timeoutMs < 5000) {
      errors.push('Timeout should be at least 5000ms');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all cached instances
   */
  static getCachedInstances(): Map<string, NotionClientInstance> {
    return new Map(this.instances);
  }

  /**
   * Remove cached instance
   */
  static removeCachedInstance(instanceKey: string): boolean {
    return this.instances.delete(instanceKey);
  }

  /**
   * Clear all cached instances
   */
  static clearCachedInstances(): void {
    this.instances.clear();
    logger.debug('All cached Notion client instances cleared');
  }

  /**
   * Health check for all cached instances
   */
  static async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [key, instance] of this.instances) {
      const isHealthy = await instance.isHealthy();
      results.set(key, isHealthy);
    }
    
    return results;
  }
}