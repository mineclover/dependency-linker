/**
 * Enhanced API Queue for Clean Architecture
 * Moved from legacy src/utils/enhancedApiQueue.ts
 */

import type { ApiQueue } from '../types/index.js';

export interface QueueItem<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number;
  createdAt: number;
}

export interface QueueMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  queueSize: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastError?: string;
  uptime: number;
}

export enum ErrorType {
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export class EnhancedNotionApiQueue implements ApiQueue {
  private queue: QueueItem<any>[] = [];
  private isProcessing = false;
  private readonly delayMs: number;
  private readonly maxRetries: number;
  
  // Circuit breaker properties with intelligent recovery
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private readonly failureThreshold = 10; // Increased from 5 to 10
  private readonly resetTimeoutMs = 30000; // Reduced from 60s to 30s
  private lastFailureTime = 0;
  private consecutiveSuccesses = 0;
  private readonly successThreshold = 3; // Require 3 successes to fully close
  
  // Metrics and health monitoring
  private metrics: QueueMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    queueSize: 0,
    circuitBreakerState: 'closed',
    uptime: Date.now()
  };
  
  // Rate limiting with adaptive backoff
  private requestHistory: number[] = [];
  private adaptiveDelay = 0;
  
  constructor(delayMs: number = 350, maxRetries: number = 5) {
    this.delayMs = delayMs;
    this.maxRetries = maxRetries;
    this.adaptiveDelay = delayMs;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: QueueItem<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operation,
        resolve,
        reject,
        retryCount: 0,
        priority: 0,
        createdAt: Date.now()
      };

      this.queue.push(item);
      this.metrics.queueSize = this.queue.length;
      
      if (!this.isProcessing) {
        this.process();
      }
    });
  }

  async process(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      // Check circuit breaker with intelligent recovery
      if (this.circuitBreakerState === 'open') {
        if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
          this.circuitBreakerState = 'half-open';
          this.consecutiveSuccesses = 0;
          console.log('🔄 Circuit breaker transitioning to half-open state');
        } else {
          // Circuit breaker is open - implement graceful degradation
          const item = this.queue.shift();
          if (item) {
            const waitTime = Math.max(0, this.resetTimeoutMs - (Date.now() - this.lastFailureTime));
            const friendlyError = new Error(
              `🚧 API temporarily unavailable due to rate limits. Retrying in ${Math.ceil(waitTime / 1000)}s. This is normal during heavy usage.`
            );
            item.reject(friendlyError);
            this.metrics.failedRequests++;
          }
          continue;
        }
      }
      
      const item = this.queue.shift();
      if (!item) break;
      
      try {
        // Apply adaptive delay
        await this.applyDelay();
        
        const startTime = Date.now();
        const result = await item.operation();
        const endTime = Date.now();
        
        // Update metrics
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.updateAverageResponseTime(endTime - startTime);
        
        // Intelligent circuit breaker recovery
        if (this.circuitBreakerState === 'half-open') {
          this.consecutiveSuccesses++;
          if (this.consecutiveSuccesses >= this.successThreshold) {
            this.circuitBreakerState = 'closed';
            this.failureCount = 0;
            this.consecutiveSuccesses = 0;
            console.log('✅ Circuit breaker fully recovered and closed');
          } else {
            console.log(`🔄 Circuit breaker recovery progress: ${this.consecutiveSuccesses}/${this.successThreshold} successes`);
          }
        } else if (this.circuitBreakerState === 'closed') {
          // Reset failure count on successful requests
          this.failureCount = Math.max(0, this.failureCount - 1);
        }
        
        item.resolve(result);
        
      } catch (error: any) {
        await this.handleError(error, item);
      }
      
      this.metrics.queueSize = this.queue.length;
      this.metrics.circuitBreakerState = this.circuitBreakerState;
    }
    
    this.isProcessing = false;
  }

  private async handleError(error: any, item: QueueItem<any>): Promise<void> {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastError = error.message;
    
    const errorType = this.classifyError(error);
    
    // Enhanced rate limiting handling
    if (errorType === ErrorType.RATE_LIMIT) {
      this.metrics.rateLimitHits++;
      this.adaptiveDelay = Math.min(this.adaptiveDelay * 1.5, 15000); // More gradual increase, max 15 seconds
      console.log(`⚠️ Rate limit detected. Increasing delay to ${this.adaptiveDelay}ms`);
    }
    
    // Retry logic
    if (item.retryCount < this.maxRetries && this.shouldRetry(errorType)) {
      item.retryCount++;
      const backoffDelay = this.calculateBackoff(item.retryCount);
      
      setTimeout(() => {
        this.queue.unshift(item); // Put back at front for retry
        if (!this.isProcessing) {
          this.process();
        }
      }, backoffDelay);
      
      return;
    }
    
    // Enhanced circuit breaker logic
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.circuitBreakerState = 'open';
      console.log(`🚨 Circuit breaker opened after ${this.failureCount} failures. Will retry in ${this.resetTimeoutMs/1000}s`);
    } else if (this.failureCount >= this.failureThreshold * 0.7) {
      console.log(`⚠️ Circuit breaker warning: ${this.failureCount}/${this.failureThreshold} failures`);
    }
    
    item.reject(error);
  }

  private classifyError(error: any): ErrorType {
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.code;
    
    if (status === 429 || message.includes('rate limit')) {
      return ErrorType.RATE_LIMIT;
    }
    
    if (status >= 500 && status < 600) {
      return ErrorType.SERVER_ERROR;
    }
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    return ErrorType.UNKNOWN;
  }

  private shouldRetry(errorType: ErrorType): boolean {
    switch (errorType) {
      case ErrorType.RATE_LIMIT:
      case ErrorType.SERVER_ERROR:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT:
        return true;
      default:
        return false;
    }
  }

  private calculateBackoff(retryCount: number): number {
    const baseDelay = this.delayMs;
    // More conservative exponential backoff
    const exponentialDelay = baseDelay * Math.pow(1.5, retryCount - 1);
    const jitter = Math.random() * 2000; // Add up to 2 seconds jitter
    const backoff = Math.min(exponentialDelay + jitter, 45000); // Max 45 seconds
    
    console.log(`🔄 Retry ${retryCount} with backoff: ${Math.round(backoff)}ms`);
    return backoff;
  }

  private async applyDelay(): Promise<void> {
    const now = Date.now();
    
    // Clean old entries (older than 1 minute)
    this.requestHistory = this.requestHistory.filter(time => now - time < 60000);
    
    // Calculate current rate (requests per minute)
    const currentRate = this.requestHistory.length;
    
    // Enhanced adaptive delay based on current load and circuit breaker state
    let delay = this.adaptiveDelay;
    
    // More conservative rate limiting during recovery
    if (this.circuitBreakerState === 'half-open') {
      delay = Math.max(delay, 3000); // Minimum 3 seconds during recovery
    } else if (currentRate > 25) { // If more than 25 requests per minute (reduced from 30)
      delay = Math.max(delay, 2500); // Increased minimum delay
    } else if (currentRate > 15) {
      delay = Math.max(delay, 1500); // Progressive delay increase
    }
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Record this request
    this.requestHistory.push(now);
    
    // Gradually reduce adaptive delay on successful requests
    if (this.adaptiveDelay > this.delayMs) {
      this.adaptiveDelay = Math.max(this.adaptiveDelay * 0.9, this.delayMs);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.successfulRequests;
  }

  size(): number {
    return this.queue.length;
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed health status with recommendations
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: QueueMetrics;
    recommendations: string[];
    alerts: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    const alerts: string[] = [];
    
    // Determine overall health
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (metrics.circuitBreakerState === 'open') {
      status = 'critical';
      alerts.push(`🚨 Circuit breaker is OPEN - API requests are blocked`);
      recommendations.push('Wait for automatic recovery or check API service status');
    } else if (metrics.circuitBreakerState === 'half-open') {
      status = 'degraded';
      alerts.push('🔄 Circuit breaker is recovering - requests are throttled');
      recommendations.push('Monitor success rate for full recovery');
    }
    
    if (metrics.rateLimitHits > 0) {
      const hitRate = (metrics.rateLimitHits / metrics.totalRequests) * 100;
      if (hitRate > 10) {
        status = 'degraded';
        alerts.push(`⚠️ High rate limit hit rate: ${hitRate.toFixed(1)}%`);
        recommendations.push('Consider reducing request frequency');
      }
    }
    
    if (metrics.failedRequests > 0) {
      const failureRate = (metrics.failedRequests / metrics.totalRequests) * 100;
      if (failureRate > 20) {
        status = 'critical';
        alerts.push(`🚨 High failure rate: ${failureRate.toFixed(1)}%`);
        recommendations.push('Check network connectivity and API service status');
      } else if (failureRate > 10) {
        status = 'degraded';
        alerts.push(`⚠️ Elevated failure rate: ${failureRate.toFixed(1)}%`);
      }
    }
    
    if (metrics.queueSize > 50) {
      status = 'degraded';
      alerts.push(`⚠️ Large queue size: ${metrics.queueSize} items`);
      recommendations.push('Queue is backing up - consider increasing delays');
    }
    
    if (metrics.averageResponseTime > 5000) {
      alerts.push(`⚠️ Slow response times: ${metrics.averageResponseTime.toFixed(0)}ms`);
      recommendations.push('API response times are elevated');
    }
    
    // Add positive recommendations for healthy state
    if (status === 'healthy' && recommendations.length === 0) {
      recommendations.push('✅ API queue is operating normally');
    }
    
    return { status, metrics, recommendations, alerts };
  }

  /**
   * Force circuit breaker to specific state (for testing/emergency)
   */
  forceCircuitBreakerState(state: 'closed' | 'open' | 'half-open', reason?: string): void {
    console.log(`🔧 Manually setting circuit breaker to ${state}${reason ? ` - ${reason}` : ''}`);
    this.circuitBreakerState = state;
    if (state === 'closed') {
      this.failureCount = 0;
      this.consecutiveSuccesses = 0;
    } else if (state === 'half-open') {
      this.consecutiveSuccesses = 0;
    }
  }

  reset(): void {
    this.queue = [];
    this.circuitBreakerState = 'closed';
    this.failureCount = 0;
    this.adaptiveDelay = this.delayMs;
    this.requestHistory = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      queueSize: 0,
      circuitBreakerState: 'closed',
      uptime: Date.now()
    };
  }
}