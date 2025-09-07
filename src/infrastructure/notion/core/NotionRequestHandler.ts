/**
 * Notion Request Handler - Infrastructure Layer
 * Standardized request handling with error handling, retry logic, and rate limiting
 */

import { logger } from '../../../shared/utils/index.js';
import { EnhancedNotionApiQueue } from '../../../shared/utils/apiQueue.js';
import { CircuitBreakerManager } from '../../../shared/utils/circuitBreakerManager.js';
import type { INotionClientInstance } from './NotionClientFactory.js';

export type NotionRequestType = 
  | 'database.query'
  | 'database.create'
  | 'database.update'
  | 'database.retrieve'
  | 'data_source.retrieve'
  | 'page.create'
  | 'page.update'
  | 'page.retrieve'
  | 'block.children.list'
  | 'block.children.append'
  | 'users.me'
  | 'search';

export interface NotionRequestOptions {
  retries?: number;
  timeout?: number;
  skipQueue?: boolean;
  skipCircuitBreaker?: boolean;
  metadata?: Record<string, any>;
}

export interface NotionRequestResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  requestType: NotionRequestType;
  duration: number;
  retryCount: number;
  fromCache?: boolean;
}

/**
 * Standardized error types for Notion API operations
 */
export class NotionApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestType: NotionRequestType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NotionApiError';
  }
}

export class NotionRateLimitError extends NotionApiError {
  constructor(requestType: NotionRequestType, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${requestType}${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
      'rate_limited',
      429,
      requestType
    );
    this.name = 'NotionRateLimitError';
  }
}

export class NotionUnauthorizedError extends NotionApiError {
  constructor(requestType: NotionRequestType) {
    super(
      `Unauthorized access for ${requestType}`,
      'unauthorized',
      401,
      requestType
    );
    this.name = 'NotionUnauthorizedError';
  }
}

export class NotionNotFoundError extends NotionApiError {
  constructor(requestType: NotionRequestType, resourceId?: string) {
    super(
      `Resource not found for ${requestType}${resourceId ? ` (ID: ${resourceId})` : ''}`,
      'object_not_found',
      404,
      requestType
    );
    this.name = 'NotionNotFoundError';
  }
}

/**
 * Notion Request Handler
 * Provides standardized request execution with error handling
 */
export class NotionRequestHandler {
  constructor(
    private clientInstance: INotionClientInstance
  ) {}

  /**
   * Execute a Notion API request with standardized error handling
   */
  async executeRequest<T = any>(
    requestType: NotionRequestType,
    requestFn: () => Promise<T>,
    options: NotionRequestOptions = {}
  ): Promise<NotionRequestResult<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options.retries ?? 3;

    // Check circuit breaker
    if (!options.skipCircuitBreaker && this.clientInstance.circuitBreaker) {
      const health = this.clientInstance.circuitBreaker.getSystemHealth();
      if (health.overall === 'critical') {
        return {
          success: false,
          error: new NotionApiError(
            'Circuit breaker is open - API temporarily unavailable',
            'circuit_breaker_open',
            503,
            requestType
          ),
          requestType,
          duration: Date.now() - startTime,
          retryCount: 0
        };
      }
    }

    while (retryCount <= maxRetries) {
      try {
        let result: T;

        if (options.skipQueue) {
          result = await requestFn();
        } else {
          // Use API queue for rate limiting
          result = await this.clientInstance.apiQueue.add(requestFn);
        }

        // Record success in circuit breaker
        if (this.clientInstance.circuitBreaker) {
          // Success is automatically recorded by the API queue
          // No direct recordSuccess method needed
        }

        return {
          success: true,
          data: result,
          requestType,
          duration: Date.now() - startTime,
          retryCount
        };

      } catch (error) {
        const notionError = this.standardizeError(error, requestType);
        
        // Record failure in circuit breaker
        if (this.clientInstance.circuitBreaker) {
          // Failure is automatically recorded by the API queue
          // No direct recordFailure method needed
        }

        // Check if we should retry
        if (retryCount < maxRetries && this.isRetryableError(notionError)) {
          retryCount++;
          const delay = this.calculateRetryDelay(retryCount, notionError);
          
          logger.debug(`Retrying ${requestType} (attempt ${retryCount}/${maxRetries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // No more retries or non-retryable error
        logger.error(`Request failed for ${requestType}: ${notionError.message}`);
        
        return {
          success: false,
          error: notionError,
          requestType,
          duration: Date.now() - startTime,
          retryCount
        };
      }
    }

    // Should never reach here, but TypeScript requires it
    return {
      success: false,
      error: new NotionApiError(
        'Unexpected error - max retries exceeded',
        'unknown',
        500,
        requestType
      ),
      requestType,
      duration: Date.now() - startTime,
      retryCount
    };
  }

  /**
   * Execute multiple requests with batching support
   */
  async executeBatch<T = any>(
    requests: Array<{
      type: NotionRequestType;
      fn: () => Promise<T>;
      options?: NotionRequestOptions;
    }>,
    batchOptions: {
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<NotionRequestResult<T>[]> {
    const { concurrency = 3, failFast = false } = batchOptions;
    const results: NotionRequestResult<T>[] = [];

    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(request => 
        this.executeRequest(request.type, request.fn, request.options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Check for failures if failFast is enabled
      if (failFast && batchResults.some(result => !result.success)) {
        logger.warning(`Batch execution stopped due to failure (failFast enabled)`);
        break;
      }
    }

    return results;
  }

  /**
   * Standardize errors into consistent types
   */
  private standardizeError(error: any, requestType: NotionRequestType): NotionApiError {
    if (error instanceof NotionApiError) {
      return error;
    }

    // Handle Notion SDK errors
    if (error.code) {
      switch (error.code) {
        case 'rate_limited':
          return new NotionRateLimitError(requestType, error.retryAfter);
        case 'unauthorized':
          return new NotionUnauthorizedError(requestType);
        case 'object_not_found':
          return new NotionNotFoundError(requestType);
        default:
          return new NotionApiError(
            error.message || 'Unknown Notion API error',
            error.code,
            error.status || 500,
            requestType,
            error
          );
      }
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new NotionApiError(
        'Network error - check connection and API endpoint',
        'network_error',
        0,
        requestType,
        error
      );
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return new NotionApiError(
        'Request timeout',
        'timeout',
        408,
        requestType,
        error
      );
    }

    // Generic error
    return new NotionApiError(
      error.message || 'Unknown error',
      'unknown',
      500,
      requestType,
      error
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: NotionApiError): boolean {
    // Rate limit errors are retryable
    if (error instanceof NotionRateLimitError) {
      return true;
    }

    // Network errors are retryable
    if (error.code === 'network_error') {
      return true;
    }

    // Timeout errors are retryable
    if (error.code === 'timeout') {
      return true;
    }

    // Server errors (5xx) are retryable
    if (error.status >= 500) {
      return true;
    }

    // Client errors (4xx) are generally not retryable
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number, error: NotionApiError): number {
    // For rate limit errors, use the retry-after header if available
    if (error instanceof NotionRateLimitError) {
      return Math.max(1000, retryCount * 2000); // At least 1s, increasing by 2s per retry
    }

    // Exponential backoff for other errors
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.floor(delay + jitter);
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    queueSize: number;
    isCircuitBreakerOpen: boolean;
    lastError?: NotionApiError;
  } {
    const isCritical = this.clientInstance.circuitBreaker ? 
      this.clientInstance.circuitBreaker.getSystemHealth().overall === 'critical' : false;
    
    return {
      queueSize: this.clientInstance.apiQueue.size || 0,
      isCircuitBreakerOpen: isCritical
    };
  }
}