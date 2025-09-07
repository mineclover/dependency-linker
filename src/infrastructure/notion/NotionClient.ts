import { Client } from '@notionhq/client';
import type { ProjectFile, UploadResult, DependencyGraph, NotionConfig } from '../../shared/types/index.js';
import { logger } from '../../shared/utils/index.js';

// Import infrastructure components
import { DatabaseManager } from './managers/DatabaseManager.js';
import { PageManager } from './managers/PageManager.js';
import { SchemaManager } from './managers/SchemaManager.js';
import { NotionDataMapper } from './mappers/NotionDataMapper.js';

/**
 * Infrastructure Error for Notion operations
 */
export class InfrastructureError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'InfrastructureError';
  }
}

/**
 * Enhanced Notion Client - Clean Architecture Facade Pattern
 * Single source of truth for all Notion operations
 * 
 * Replaces multiple client implementations with unified interface
 * Following Clean Architecture principles with dependency injection
 */
export class NotionClient {
  private notion: Client;
  private databaseManager: DatabaseManager;
  private pageManager: PageManager;
  private schemaManager: SchemaManager;
  private mapper: NotionDataMapper;
  private config: NotionConfig;

  constructor(
    apiKey: string,
    databaseManager: DatabaseManager,
    pageManager: PageManager,
    schemaManager: SchemaManager,
    config: NotionConfig
  ) {
    this.notion = new Client({ auth: apiKey });
    this.databaseManager = databaseManager;
    this.pageManager = pageManager;
    this.schemaManager = schemaManager;
    this.mapper = new NotionDataMapper(config.schemaVersion || '1.0');
    this.config = config;
    
    logger.info('NotionClient initialized with enhanced architecture', '🏗️');
  }

  // ===== Factory Pattern for Clean Instantiation =====
  
  static create(config: NotionConfig): NotionClient {
    const databaseManager = new DatabaseManager(config.apiKey);
    const pageManager = new PageManager(config.apiKey);
    const schemaManager = new SchemaManager(config.schemaPath || './schemas');
    
    return new NotionClient(
      config.apiKey,
      databaseManager,
      pageManager,
      schemaManager,
      config
    );
  }

  // ===== Domain Interface Implementation =====
  
  /**
   * Create database following domain schema
   */
  async createDatabase(schema: any): Promise<{ success: boolean; data?: string; error?: InfrastructureError }> {
    try {
      const notionSchema = this.mapper.toNotionSchema(schema);
      const response = await this.notion.databases.create(notionSchema);
      logger.success(`Database created: ${response.id}`);
      
      return { success: true, data: response.id };
    } catch (error) {
      const infraError = new InfrastructureError(
        `Notion API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      logger.error(`Database creation failed: ${infraError.message}`);
      
      return { success: false, error: infraError };
    }
  }
  
  /**
   * Upload document to Notion
   */
  async uploadDocument(
    document: ProjectFile, 
    databaseId: string
  ): Promise<{ success: boolean; data?: string; error?: InfrastructureError }> {
    try {
      const pageData = this.mapper.documentToNotionPage(document);
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: pageData.properties,
        children: pageData.children
      });
      
      logger.success(`Document uploaded: ${response.id}`);
      return { success: true, data: response.id };
    } catch (error) {
      const infraError = new InfrastructureError(
        `Page upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      logger.error(`Document upload failed: ${infraError.message}`);
      
      return { success: false, error: infraError };
    }
  }
  
  /**
   * Query database with filters
   */
  async queryDatabase(
    databaseId: string, 
    query: any
  ): Promise<{ success: boolean; data?: any; error?: InfrastructureError }> {
    try {
      const response = await this.notion.dataSources.query({
        data_source_id: databaseId,
        ...query
      });
      
      logger.info(`Database query completed: ${response.results.length} results`);
      return { success: true, data: response };
    } catch (error) {
      const infraError = new InfrastructureError(
        `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      logger.error(`Database query failed: ${infraError.message}`);
      
      return { success: false, error: infraError };
    }
  }

  // ===== Legacy Compatibility Layer =====
  
  /**
   * Legacy method - use createDatabase instead
   * @deprecated Use createDatabase with schema parameter
   */
  async createDatabaseLegacy(title?: string, type?: 'files' | 'docs'): Promise<string> {
    logger.warning('Using deprecated createDatabaseLegacy method', '⚠️');
    
    const result = await this.databaseManager.create({
      title: title || 'Project Files',
      type: type || 'files'
    });
    
    return result.id;
  }
  
  /**
   * Legacy method - use uploadDocument instead
   * @deprecated Use uploadDocument method
   */
  async uploadFile(
    file: any, 
    databaseId: string, 
    dependencyGraph?: any
  ): Promise<any> {
    logger.warning('Using deprecated uploadFile method', '⚠️');
    
    const document = this.mapper.legacyFileToProjectFile(file);
    const result = await this.uploadDocument(document, databaseId);
    
    return {
      file,
      notionId: result.data || '',
      success: result.success,
      error: result.error?.message
    };
  }
  
  // ===== Utility Methods =====
  
  /**
   * Get API client statistics
   */
  getStats() {
    return {
      databases: this.databaseManager.getStats(),
      pages: this.pageManager.getStats(),
      schemas: this.schemaManager.getStats()
    };
  }
  
  /**
   * Test connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.notion.users.me();
      logger.success('Notion API connection successful');
      return true;
    } catch (error) {
      logger.error(`Notion API connection failed: ${error}`);
      return false;
    }
  }
}

/**
 * Notion Client Factory - Clean Architecture Factory Pattern
 * Replaces multiple factory implementations with single source
 */
export class NotionClientFactory {
  /**
   * Create NotionClient instance with dependency injection
   */
  static createClient(config: NotionConfig): NotionClient {
    return NotionClient.create(config);
  }
  
  /**
   * Create client with automatic configuration loading
   */
  static async createFromEnvironment(projectPath?: string): Promise<NotionClient> {
    const { configManager } = await import('../config/configManager.js');
    
    const config = configManager.getNotionConfig();
    if (!config.apiKey) {
      throw new Error('Notion API key not found in configuration');
    }
    
    return this.createClient(config);
  }
  
  /**
   * Create client with legacy compatibility
   * @deprecated Use createClient instead
   */
  static createLegacyClient(apiKey: string, projectPath: string): NotionClient {
    logger.warning('Using deprecated createLegacyClient method', '⚠️');
    
    return this.createClient({
      apiKey,
      projectPath,
      schemaPath: './schemas',
      schemaVersion: '1.0'
    });
  }
}