import { Client } from '@notionhq/client';

/**
 * Notion API error handling and retry logic
 * Centralized error management with structured logging and recovery strategies
 */
export class NotionErrorHandler {
  private static readonly MAX_RETRIES = 5;
  private static readonly BASE_DELAY = 350; // ms

  /**
   * Handle Notion API errors with context and recovery suggestions
   */
  static handleApiError(error: any, context: string): never {
    console.error(`❌ Notion API Error in ${context}:`, error);

    if (error?.code) {
      switch (error.code) {
        case 'unauthorized':
          throw new Error(`Authentication failed: Invalid Notion API key. Check your .env file.`);
        
        case 'restricted_resource':
          throw new Error(`Access denied: The integration doesn't have permission to access this resource.`);
        
        case 'object_not_found':
          throw new Error(`Resource not found: The requested page or database doesn't exist or isn't accessible.`);
        
        case 'rate_limited':
          throw new Error(`Rate limited: Too many requests. The system should automatically retry.`);
        
        case 'invalid_request':
          throw new Error(`Invalid request: ${error.message || 'Check the request parameters.'}`);
        
        case 'internal_server_error':
          throw new Error(`Notion server error: ${error.message || 'Please try again later.'}`);
        
        case 'service_unavailable':
          throw new Error(`Notion service unavailable: ${error.message || 'Please try again later.'}`);
        
        default:
          throw new Error(`Notion API error (${error.code}): ${error.message || 'Unknown error'}`);
      }
    }

    // Handle network errors
    if (error?.errno || error?.code === 'ENOTFOUND') {
      throw new Error(`Network error: Unable to connect to Notion API. Check your internet connection.`);
    }

    // Generic error handling
    throw new Error(`Unknown error in ${context}: ${error?.message || error}`);
  }

  /**
   * Retry logic with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = NotionErrorHandler.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on authentication or permission errors
        if (error?.code === 'unauthorized' || error?.code === 'restricted_resource') {
          this.handleApiError(error, context);
        }

        // Don't retry on client errors (4xx) except rate limiting
        if (error?.code && error.code !== 'rate_limited' && error?.status >= 400 && error?.status < 500) {
          this.handleApiError(error, context);
        }

        if (attempt === maxRetries) {
          console.error(`❌ Max retries (${maxRetries}) exceeded for ${context}`);
          this.handleApiError(lastError, context);
        }

        const delay = this.calculateBackoffDelay(attempt);
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${context}. Retrying in ${delay}ms...`);
        console.warn(`   Error: ${error?.message || error}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    this.handleApiError(lastError, context);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private static calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 100; // Add random jitter up to 100ms
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Validate API response structure
   */
  static validateResponse(response: any, expectedFields: string[], context: string): void {
    if (!response) {
      throw new Error(`${context}: Empty response received`);
    }

    for (const field of expectedFields) {
      if (!(field in response)) {
        console.warn(`⚠️ ${context}: Missing expected field '${field}' in response`);
      }
    }
  }

  /**
   * Log API operation for debugging
   */
  static logOperation(operation: string, details: any): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_NOTION) {
      console.log(`🔧 Notion API: ${operation}`, details);
    }
  }

  /**
   * Handle rate limiting with intelligent backoff
   */
  static async handleRateLimit(error: any): Promise<void> {
    if (error?.code === 'rate_limited') {
      const retryAfter = error?.headers?.['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      
      console.warn(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error?.errno || error?.code === 'ENOTFOUND' || error?.code === 'ECONNRESET') {
      return true;
    }

    // Notion API errors that are retryable
    if (error?.code) {
      switch (error.code) {
        case 'rate_limited':
        case 'internal_server_error':
        case 'service_unavailable':
        case 'timeout':
          return true;
        
        // 5xx server errors are retryable
        default:
          return error?.status >= 500;
      }
    }

    return false;
  }

  /**
   * Format error for user display
   */
  static formatUserError(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case 'unauthorized':
          return 'Authentication failed. Please check your Notion API key.';
        
        case 'restricted_resource':
          return 'Access denied. Please ensure the integration has permission to access this resource.';
        
        case 'object_not_found':
          return 'The requested page or database was not found.';
        
        case 'rate_limited':
          return 'Too many requests. Please wait a moment and try again.';
        
        default:
          return error.message || 'An unexpected error occurred.';
      }
    }

    return error?.message || 'An unknown error occurred.';
  }
}