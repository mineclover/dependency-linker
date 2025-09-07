/**
 * DatabaseOperationsManager - Centralized database operations management
 * Consolidates all Notion database operations with proper error handling and type safety
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import type { 
  DatabaseInfo, 
  DatabaseCreateOptions, 
  DatabaseQueryOptions,
  DatabaseQueryResult 
} from '../../shared/types/index.js';

interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
  responseTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * DatabaseOperationsManager - Data Access Layer
 * Provides consistent, type-safe operations for all Notion database interactions
 */
export class DatabaseOperationsManager {
  private client: Client;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Safely retrieve a database with proper error handling and type guards
   */
  async safeRetrieve(databaseId: string): Promise<DatabaseOperationResult<DatabaseInfo>> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        const database = await this.client.databases.retrieve({
          database_id: databaseId
        });

        // Type-safe property access
        const dbInfo: DatabaseInfo = {
          id: database.id,
          name: this.extractDatabaseName(database),
          properties: this.extractDatabaseProperties(database),
          lastEditedTime: 'last_edited_time' in database ? database.last_edited_time : new Date().toISOString(),
          createdTime: 'created_time' in database ? database.created_time : new Date().toISOString()
        };

        logger.info(`✅ Retrieved database: ${dbInfo.name} (${databaseId})`);

        return {
          success: true,
          data: dbInfo,
          retryCount,
          responseTime: Date.now() - startTime
        };

      } catch (error: any) {
        retryCount++;
        
        if (retryCount > this.retryConfig.maxRetries) {
          logger.error(`❌ Failed to retrieve database ${databaseId} after ${retryCount} attempts: ${error.message}`);
          
          return {
            success: false,
            error: error.message,
            retryCount,
            responseTime: Date.now() - startTime
          };
        }

        // Wait before retry
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1),
          this.retryConfig.maxDelay
        );
        
        logger.warning(`⚠️ Database retrieve failed (attempt ${retryCount}), retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }

    // This should never be reached due to the logic above, but TypeScript needs it
    return {
      success: false,
      error: 'Unexpected error in retry logic',
      retryCount,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Safely query a database with pagination support
   */
  async safeQuery(
    databaseId: string, 
    options: DatabaseQueryOptions = {}
  ): Promise<DatabaseOperationResult<DatabaseQueryResult>> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        const queryParams: any = {
          database_id: databaseId
        };

        if (options.filter) {
          queryParams.filter = options.filter;
        }

        if (options.sorts) {
          queryParams.sorts = options.sorts;
        }

        if (options.pageSize) {
          queryParams.page_size = Math.min(options.pageSize, 100); // Notion limit
        }

        if (options.startCursor) {
          queryParams.start_cursor = options.startCursor;
        }

        const response = await this.client.dataSources.query({
          data_source_id: queryParams.database_id,
          filter: queryParams.filter,
          sorts: queryParams.sorts,
          start_cursor: queryParams.start_cursor,
          page_size: queryParams.page_size
        });

        const result: DatabaseQueryResult = {
          results: response.results,
          hasMore: response.has_more,
          nextCursor: response.next_cursor,
          totalCount: response.results.length
        };

        logger.info(`🔍 Queried database ${databaseId}: ${result.totalCount} results`);

        return {
          success: true,
          data: result,
          retryCount,
          responseTime: Date.now() - startTime
        };

      } catch (error: any) {
        retryCount++;
        
        // Some queries might not be supported in all API versions
        if (error.code === 'invalid_request' && error.message.includes('query')) {
          logger.warning(`⚠️ Database query not supported for ${databaseId}, returning empty results`);
          
          return {
            success: true,
            data: {
              results: [],
              hasMore: false,
              nextCursor: null,
              totalCount: 0
            },
            retryCount,
            responseTime: Date.now() - startTime
          };
        }

        if (retryCount > this.retryConfig.maxRetries) {
          logger.error(`❌ Failed to query database ${databaseId} after ${retryCount} attempts: ${error.message}`);
          
          return {
            success: false,
            error: error.message,
            retryCount,
            responseTime: Date.now() - startTime
          };
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1),
          this.retryConfig.maxDelay
        );
        
        logger.warning(`⚠️ Database query failed (attempt ${retryCount}), retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: 'Unexpected error in retry logic',
      retryCount,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Safely create a database
   */
  async safeCreate(
    parentId: string, 
    options: DatabaseCreateOptions
  ): Promise<DatabaseOperationResult<DatabaseInfo>> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        const createParams: any = {
          parent: {
            type: 'page_id',
            page_id: parentId
          },
          title: options.title || [{ type: 'text', text: { content: 'New Database' } }],
          properties: options.properties || {
            'Name': { title: {} }
          }
        };

        if (options.description) {
          createParams.description = options.description;
        }

        const database = await this.client.databases.create(createParams);

        const dbInfo: DatabaseInfo = {
          id: database.id,
          name: this.extractDatabaseName(database),
          properties: this.extractDatabaseProperties(database),
          lastEditedTime: 'last_edited_time' in database ? database.last_edited_time : new Date().toISOString(),
          createdTime: 'created_time' in database ? database.created_time : new Date().toISOString()
        };

        logger.success(`✅ Created database: ${dbInfo.name} (${database.id})`);

        return {
          success: true,
          data: dbInfo,
          retryCount,
          responseTime: Date.now() - startTime
        };

      } catch (error: any) {
        retryCount++;
        
        if (retryCount > this.retryConfig.maxRetries) {
          logger.error(`❌ Failed to create database after ${retryCount} attempts: ${error.message}`);
          
          return {
            success: false,
            error: error.message,
            retryCount,
            responseTime: Date.now() - startTime
          };
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1),
          this.retryConfig.maxDelay
        );
        
        logger.warning(`⚠️ Database create failed (attempt ${retryCount}), retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: 'Unexpected error in retry logic',
      retryCount,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Validate database exists and is accessible
   */
  async validateDatabase(databaseId: string): Promise<boolean> {
    const result = await this.safeRetrieve(databaseId);
    return result.success;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(databaseId: string): Promise<{
    exists: boolean;
    pageCount?: number;
    propertyCount?: number;
    lastModified?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    // First, check if database exists
    const dbResult = await this.safeRetrieve(databaseId);
    
    if (!dbResult.success) {
      return {
        exists: false,
        responseTime: Date.now() - startTime
      };
    }

    // Get page count via query
    const queryResult = await this.safeQuery(databaseId, { pageSize: 1 });
    
    return {
      exists: true,
      pageCount: queryResult.success ? (queryResult.data?.totalCount || 0) : undefined,
      propertyCount: dbResult.data ? Object.keys(dbResult.data.properties).length : undefined,
      lastModified: dbResult.data?.lastEditedTime,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Extract database name from API response
   */
  private extractDatabaseName(database: any): string {
    if ('title' in database && Array.isArray(database.title) && database.title.length > 0) {
      const titleObj = database.title[0];
      if ('plain_text' in titleObj) {
        return titleObj.plain_text;
      }
    }
    return 'Untitled Database';
  }

  /**
   * Extract database properties from API response with type safety
   */
  private extractDatabaseProperties(database: any): Record<string, any> {
    if ('properties' in database && database.properties) {
      return database.properties;
    }
    return {};
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info('🔧 DatabaseOperationsManager retry config updated');
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }
}