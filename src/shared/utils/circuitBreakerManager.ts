/**
 * Circuit Breaker Manager for Enhanced Resilience
 * Provides centralized circuit breaker management and graceful degradation
 */

import { EnhancedNotionApiQueue } from './apiQueue.js';

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeoutMs: number;
  successThreshold: number;
  maxRetries: number;
  baseDelayMs: number;
}

export interface GracefulDegradationOptions {
  enableOfflineMode: boolean;
  cacheFallback: boolean;
  partialOperations: boolean;
  userNotifications: boolean;
}

export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private apiQueues: Map<string, EnhancedNotionApiQueue> = new Map();
  private config: CircuitBreakerConfig;
  private degradationOptions: GracefulDegradationOptions;
  private offlineOperations: any[] = [];

  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    degradationOptions: Partial<GracefulDegradationOptions> = {}
  ) {
    this.config = {
      enabled: true,
      failureThreshold: 10,
      resetTimeoutMs: 30000,
      successThreshold: 3,
      maxRetries: 5,
      baseDelayMs: 350,
      ...config
    };

    this.degradationOptions = {
      enableOfflineMode: true,
      cacheFallback: true,
      partialOperations: true,
      userNotifications: true,
      ...degradationOptions
    };
  }

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create API queue for specific service
   */
  getApiQueue(serviceName: string = 'notion'): EnhancedNotionApiQueue {
    if (!this.apiQueues.has(serviceName)) {
      const queue = new EnhancedNotionApiQueue(
        this.config.baseDelayMs,
        this.config.maxRetries
      );
      this.apiQueues.set(serviceName, queue);
    }
    return this.apiQueues.get(serviceName)!;
  }

  /**
   * Execute operation with circuit breaker protection and graceful degradation
   */
  async executeWithProtection<T>(
    operation: () => Promise<T>,
    options: {
      serviceName?: string;
      fallback?: () => Promise<T | null>;
      allowPartial?: boolean;
      cacheKey?: string;
      retryable?: boolean;
    } = {}
  ): Promise<T | null> {
    const {
      serviceName = 'notion',
      fallback,
      allowPartial = true,
      cacheKey,
      retryable = true
    } = options;

    const queue = this.getApiQueue(serviceName);
    const health = queue.getHealthStatus();

    // Check if we should attempt the operation
    if (health.status === 'critical' && !this.degradationOptions.enableOfflineMode) {
      throw new Error('🚨 Service is critically degraded and offline mode is disabled');
    }

    try {
      // Try main operation
      if (retryable) {
        return await queue.add(operation);
      } else {
        return await operation();
      }

    } catch (error: any) {
      console.log(`⚠️ Operation failed: ${error.message}`);

      // Attempt graceful degradation
      if (fallback && this.degradationOptions.cacheFallback) {
        console.log('🔄 Attempting fallback operation...');
        try {
          return await fallback();
        } catch (fallbackError) {
          console.log(`❌ Fallback also failed: ${fallbackError}`);
        }
      }

      // Store for offline processing if enabled
      if (this.degradationOptions.enableOfflineMode) {
        this.storeOfflineOperation(operation, cacheKey);
        
        if (this.degradationOptions.userNotifications) {
          this.notifyUser('offline_queued', {
            message: '📱 Operation queued for retry when service recovers',
            serviceName
          });
        }
        
        return null;
      }

      // Re-throw with user-friendly message
      throw this.createUserFriendlyError(error, health);
    }
  }

  /**
   * Store operation for offline processing
   */
  private storeOfflineOperation(operation: () => Promise<any>, cacheKey?: string): void {
    this.offlineOperations.push({
      id: Date.now() + Math.random(),
      operation,
      cacheKey,
      timestamp: Date.now(),
      retryCount: 0
    });

    console.log(`📱 Stored operation for offline processing. Queue size: ${this.offlineOperations.length}`);
  }

  /**
   * Process queued offline operations
   */
  async processOfflineOperations(maxOperations: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log(`🔄 Processing ${Math.min(maxOperations, this.offlineOperations.length)} offline operations...`);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;

    while (processed < maxOperations && this.offlineOperations.length > 0) {
      const operation = this.offlineOperations.shift()!;
      processed++;

      try {
        await this.executeWithProtection(operation.operation, {
          retryable: false // Don't double-queue
        });
        successful++;
        console.log(`✅ Offline operation ${operation.id} completed successfully`);
      } catch (error) {
        failed++;
        operation.retryCount++;
        
        // Re-queue if retry limit not reached
        if (operation.retryCount < 3) {
          this.offlineOperations.push(operation);
          console.log(`🔄 Re-queued operation ${operation.id} (retry ${operation.retryCount}/3)`);
        } else {
          console.log(`❌ Operation ${operation.id} permanently failed after 3 retries`);
        }
      }
    }

    const result = { processed, successful, failed };
    console.log(`📊 Offline processing results:`, result);
    
    if (this.degradationOptions.userNotifications) {
      this.notifyUser('offline_processed', {
        message: `✅ Processed ${successful}/${processed} queued operations`,
        ...result
      });
    }

    return result;
  }

  /**
   * Create user-friendly error message
   */
  private createUserFriendlyError(error: any, health: any): Error {
    let message = '';
    
    if (health.status === 'critical') {
      message = `🚨 Service is temporarily unavailable due to high error rates. `;
    } else if (error.message?.includes('rate limit')) {
      message = `⏱️ Rate limit reached. Please wait a moment before trying again. `;
    } else if (error.message?.includes('network')) {
      message = `🌐 Network connection issue. Please check your internet connection. `;
    } else if (error.message?.includes('timeout')) {
      message = `⏰ Request timed out. The service may be slow to respond. `;
    } else {
      message = `⚠️ Temporary service issue. `;
    }

    // Add recovery information
    if (health.recommendations.length > 0) {
      message += `\n💡 Suggestions: ${health.recommendations.join('; ')}`;
    }

    // Add automatic recovery info
    message += `\n🔄 The system will automatically retry when conditions improve.`;
    
    const userError = new Error(message);
    userError.cause = error; // Preserve original error for debugging
    return userError;
  }

  /**
   * Send user notifications
   */
  private notifyUser(type: string, data: any): void {
    // This could be enhanced to send actual notifications
    // For now, just console log with timestamp
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📢 User Notification (${type}):`, data);
    
    // Future enhancements could include:
    // - Browser notifications
    // - Toast messages
    // - Status bar updates
    // - Email notifications for critical issues
  }

  /**
   * Get comprehensive system health
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'critical';
    services: Map<string, any>;
    offlineQueue: {
      size: number;
      oldestOperation: number;
    };
    recommendations: string[];
  } {
    const services = new Map();
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    // Check all registered services
    for (const [serviceName, queue] of this.apiQueues) {
      const health = queue.getHealthStatus();
      services.set(serviceName, health);

      if (health.status === 'critical') {
        overallStatus = 'critical';
      } else if (health.status === 'degraded' && overallStatus !== 'critical') {
        overallStatus = 'degraded';
      }

      recommendations.push(...health.recommendations);
    }

    // Check offline queue
    const offlineQueue = {
      size: this.offlineOperations.length,
      oldestOperation: this.offlineOperations.length > 0 
        ? Date.now() - this.offlineOperations[0].timestamp 
        : 0
    };

    if (offlineQueue.size > 0) {
      recommendations.push(`📱 ${offlineQueue.size} operations queued for retry`);
      
      if (offlineQueue.oldestOperation > 300000) { // 5 minutes
        recommendations.push('⏰ Some operations have been queued for over 5 minutes');
      }
    }

    return {
      overall: overallStatus,
      services,
      offlineQueue,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }

  /**
   * Reset all circuit breakers (emergency use)
   */
  resetAll(reason?: string): void {
    console.log(`🔧 Resetting all circuit breakers${reason ? ` - ${reason}` : ''}`);
    
    for (const [serviceName, queue] of this.apiQueues) {
      queue.forceCircuitBreakerState('closed', reason);
      queue.reset();
    }

    // Clear offline operations if requested
    if (reason === 'emergency') {
      this.offlineOperations = [];
      console.log('🗑️ Cleared offline operation queue');
    }
  }
}