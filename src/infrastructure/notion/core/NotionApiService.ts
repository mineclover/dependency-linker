/**
 * Notion API Service - Infrastructure Layer
 * Unified service for all Notion API operations with standardized patterns
 */

import type { Client } from '@notionhq/client';
import { logger } from '../../../shared/utils/index.js';
import { NotionRequestHandler } from './NotionRequestHandler.js';
import type { 
  INotionClientInstance,
  NotionClientConfig 
} from './NotionClientFactory.js';
import type { NotionRequestResult } from './NotionRequestHandler.js';

export interface DatabaseQueryOptions {
  filter?: any;
  sorts?: any[];
  startCursor?: string;
  pageSize?: number;
}

export interface DatabaseCreateOptions {
  parent: { type: 'page_id'; page_id: string } | { type: 'workspace'; workspace: boolean };
  title: Array<{ type: 'text'; text: { content: string } }>;
  properties: Record<string, any>;
  description?: Array<{ type: 'text'; text: { content: string } }>;
}

export interface PageCreateOptions {
  parent: { database_id: string } | { page_id: string };
  properties?: Record<string, any>;
  children?: any[];
}

export interface PageUpdateOptions {
  properties?: Record<string, any>;
  archived?: boolean;
}

export interface BlockAppendOptions {
  children: any[];
}

/**
 * Standardized Notion API Service
 * Provides unified interface for all Notion operations
 */
export class NotionApiService {
  private requestHandler: NotionRequestHandler;
  private client: Client;

  constructor(private clientInstance: INotionClientInstance) {
    this.client = clientInstance.client;
    this.requestHandler = new NotionRequestHandler(clientInstance);
  }

  /**
   * Get the underlying Notion client for advanced operations
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Database Operations
   */
  async queryDatabase(
    databaseId: string, 
    options: DatabaseQueryOptions = {}
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'database.query',
      () => this.client.dataSources.query({
        data_source_id: databaseId,
        filter: options.filter,
        sorts: options.sorts,
        start_cursor: options.startCursor,
        page_size: options.pageSize || 100
      })
    );
  }

  async createDatabase(
    options: DatabaseCreateOptions
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'database.create',
      () => this.client.databases.create({
        parent: options.parent,
        title: options.title,
        properties: options.properties,
        description: options.description
      })
    );
  }

  async retrieveDatabase(
    databaseId: string
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'database.retrieve',
      () => this.client.databases.retrieve({ database_id: databaseId })
    );
  }

  async updateDatabase(
    databaseId: string,
    updates: {
      title?: Array<{ type: 'text'; text: { content: string } }>;
      properties?: Record<string, any>;
      description?: Array<{ type: 'text'; text: { content: string } }>;
    }
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'database.update',
      () => this.client.databases.update({
        database_id: databaseId,
        ...updates
      })
    );
  }

  async retrieveDataSource(
    dataSourceId: string
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'data_source.retrieve',
      // Note: This endpoint might not be available in current @notionhq/client
      // We'll use a direct HTTP call as fallback
      () => this.makeDirectApiCall(`/v1/data_sources/${dataSourceId}`, 'GET')
    );
  }

  private async makeDirectApiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const apiKey = (this.client as any).auth;
    const response = await fetch(`https://api.notion.com${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2025-09-03'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Page Operations
   */
  async createPage(
    options: PageCreateOptions
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'page.create',
      () => this.client.pages.create({
        parent: options.parent,
        properties: options.properties || {},
        children: options.children
      })
    );
  }

  async retrievePage(
    pageId: string
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'page.retrieve',
      () => this.client.pages.retrieve({ page_id: pageId })
    );
  }

  async updatePage(
    pageId: string,
    options: PageUpdateOptions
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'page.update',
      () => this.client.pages.update({
        page_id: pageId,
        properties: options.properties,
        archived: options.archived
      })
    );
  }

  /**
   * Block Operations
   */
  async listBlockChildren(
    blockId: string,
    startCursor?: string,
    pageSize: number = 100
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'block.children.list',
      () => this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: startCursor,
        page_size: pageSize
      })
    );
  }

  async appendBlockChildren(
    blockId: string,
    options: BlockAppendOptions
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'block.children.append',
      () => this.client.blocks.children.append({
        block_id: blockId,
        children: options.children
      })
    );
  }

  /**
   * Search Operations
   */
  async search(
    query: string = '',
    filter?: {
      value: 'database' | 'page';
      property: 'object';
    },
    sort?: {
      direction: 'ascending' | 'descending';
      timestamp: 'last_edited_time';
    },
    startCursor?: string,
    pageSize: number = 100
  ): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'search',
      () => this.client.search({
        query,
        filter,
        sort,
        start_cursor: startCursor,
        page_size: pageSize
      })
    );
  }

  /**
   * User Operations
   */
  async getCurrentUser(): Promise<NotionRequestResult<any>> {
    return this.requestHandler.executeRequest(
      'users.me',
      () => this.client.users.me()
    );
  }

  /**
   * Batch Operations
   */
  async batchQueryDatabases(
    databaseIds: string[],
    options: DatabaseQueryOptions = {}
  ): Promise<NotionRequestResult<any>[]> {
    const requests = databaseIds.map(id => ({
      type: 'database.query' as const,
      fn: () => this.client.dataSources.query({
        data_source_id: id,
        filter: options.filter,
        sorts: options.sorts,
        start_cursor: options.startCursor,
        page_size: options.pageSize || 100
      })
    }));

    return this.requestHandler.executeBatch(requests);
  }

  async batchCreatePages(
    pagesData: PageCreateOptions[],
    options: { concurrency?: number; failFast?: boolean } = {}
  ): Promise<NotionRequestResult<any>[]> {
    const requests = pagesData.map(pageData => ({
      type: 'page.create' as const,
      fn: () => this.client.pages.create({
        parent: pageData.parent,
        properties: pageData.properties || {},
        children: pageData.children
      })
    }));

    return this.requestHandler.executeBatch(requests, options);
  }

  /**
   * Utility Operations
   */
  async validateConnection(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const result = await this.getCurrentUser();
      
      if (result.success) {
        return { isValid: true };
      } else {
        return { 
          isValid: false, 
          error: result.error?.message || 'Unknown validation error' 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Connection validation failed' 
      };
    }
  }

  async getWorkspaceInfo(): Promise<NotionRequestResult<{
    user: any;
    workspace: any;
    databases: any[];
    pages: any[];
  }>> {
    try {
      // Get current user
      const userResult = await this.getCurrentUser();
      if (!userResult.success) {
        return userResult as NotionRequestResult<any>;
      }

      // Search for databases and pages
      const [databasesResult, pagesResult] = await Promise.all([
        this.search('', { value: 'database', property: 'object' }),
        this.search('', { value: 'page', property: 'object' })
      ]);

      return {
        success: true,
        data: {
          user: userResult.data,
          workspace: {
            url: this.clientInstance.config.workspaceUrl,
            parentPageId: this.clientInstance.config.parentPageId
          },
          databases: databasesResult.success ? databasesResult.data?.results || [] : [],
          pages: pagesResult.success ? pagesResult.data?.results || [] : []
        },
        requestType: 'search',
        duration: 0,
        retryCount: 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get workspace info'),
        requestType: 'search',
        duration: 0,
        retryCount: 0
      };
    }
  }

  /**
   * Health and monitoring
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      apiConnection: boolean;
      circuitBreakerOpen: boolean;
      queueSize: number;
    };
  }> {
    const connectionCheck = await this.clientInstance.isHealthy();
    const stats = this.requestHandler.getRequestStats();

    return {
      healthy: connectionCheck && !stats.isCircuitBreakerOpen,
      details: {
        apiConnection: connectionCheck,
        circuitBreakerOpen: stats.isCircuitBreakerOpen,
        queueSize: stats.queueSize
      }
    };
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    clientConfig: NotionClientConfig;
    connectionStatus: 'healthy' | 'unhealthy' | 'unknown';
    requestStats: {
      queueSize: number;
      circuitBreakerOpen: boolean;
    };
  } {
    const stats = this.requestHandler.getRequestStats();
    
    return {
      clientConfig: this.clientInstance.config,
      connectionStatus: 'unknown', // Would need to implement connection tracking
      requestStats: {
        queueSize: stats.queueSize,
        circuitBreakerOpen: stats.isCircuitBreakerOpen
      }
    };
  }
}