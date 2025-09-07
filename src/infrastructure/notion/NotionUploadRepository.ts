/**
 * Notion Upload Repository - Pure Infrastructure Layer
 * ONLY handles Notion API operations, NO business logic
 * 
 * This replaces the mixed-concern NotionUploadOrchestrator with pure infrastructure adapter
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import type { NotionConfig } from '../../shared/types/index.js';
import type { IUploadRepository, ProjectUploadOptions } from '../../services/upload/ProjectUploadService.js';

// Import infrastructure components
import { NotionTableManager } from '../../services/notion/NotionTableManager.js';
import { NotionDataManager } from '../../services/notion/NotionDataManager.js';
import { NotionContentManager } from '../../services/notion/NotionContentManager.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Notion Upload Repository - Pure data access implementation
 */
export class NotionUploadRepository implements IUploadRepository {
  private notion: Client;
  private tableManager: NotionTableManager;
  private dataManager: NotionDataManager;
  private contentManager: NotionContentManager;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.notion = new Client({ auth: config.apiKey });
    
    // Initialize infrastructure managers
    this.tableManager = new NotionTableManager(this.notion, config.parentPageId);
    this.dataManager = new NotionDataManager(this.notion);
    this.contentManager = new NotionContentManager(this.notion);
    
    logger.info('NotionUploadRepository initialized', '🏗️');
  }

  /**
   * Create databases - pure infrastructure operation
   */
  async createDatabases(schemaPath: string): Promise<Record<string, { id: string; success: boolean }>> {
    try {
      return await this.tableManager.createDatabasesFromSchema(schemaPath);
    } catch (error) {
      logger.error(`Database creation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Upload files - pure data operation
   */
  async uploadFiles(
    databaseId: string,
    options: ProjectUploadOptions
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    try {
      const fileData = await this.loadFileIndexData();
      if (!fileData || Object.keys(fileData).length === 0) {
        logger.warning('No file data found for upload');
        return { created: 0, updated: 0, failed: 0, errors: [] };
      }

      const pages = Object.entries(fileData).map(([filePath, data]) => ({
        uniqueProperty: 'File Path',
        uniqueValue: filePath,
        data: {
          properties: this.formatFileProperties(filePath, data)
        }
      }));

      const result = await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });

      return {
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors
      };
    } catch (error) {
      logger.error(`File upload failed: ${error}`);
      throw error;
    }
  }

  /**
   * Upload documents - pure data operation
   */
  async uploadDocuments(
    databaseId: string,
    options: ProjectUploadOptions
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    try {
      const docData = await this.loadDocumentIndexData();
      if (!docData || Object.keys(docData).length === 0) {
        logger.warning('No document data found for upload');
        return { created: 0, updated: 0, failed: 0, errors: [] };
      }

      const pages = Object.entries(docData).map(([filePath, data]) => ({
        uniqueProperty: 'Name',
        uniqueValue: data.title,
        data: {
          properties: this.formatDocumentProperties(filePath, data)
        }
      }));

      const result = await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });

      return {
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors
      };
    } catch (error) {
      logger.error(`Document upload failed: ${error}`);
      throw error;
    }
  }

  /**
   * Upload functions - pure data operation
   */
  async uploadFunctions(
    databaseId: string,
    options: ProjectUploadOptions
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    try {
      const functionData = await this.loadFunctionIndexData();
      if (!functionData || Object.keys(functionData).length === 0) {
        logger.warning('No function data found for upload');
        return { created: 0, updated: 0, failed: 0, errors: [] };
      }

      const pages = Object.entries(functionData).map(([funcName, data]) => ({
        uniqueProperty: 'Name',
        uniqueValue: funcName,
        data: {
          properties: this.formatFunctionProperties(funcName, data)
        }
      }));

      const result = await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });

      return {
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors
      };
    } catch (error) {
      logger.error(`Function upload failed: ${error}`);
      throw error;
    }
  }

  /**
   * Add content to pages - pure content operation
   */
  async addContentToPages(
    pageIds: string[],
    options: ProjectUploadOptions
  ): Promise<{ pagesWithContent: number; contentBlocks: number; errors: string[] }> {
    const result = {
      pagesWithContent: 0,
      contentBlocks: 0,
      errors: []
    };

    for (const pageId of pageIds) {
      try {
        await this.addContentToPage(pageId);
        result.pagesWithContent++;
      } catch (error) {
        const errorMsg = `Failed to add content to page ${pageId}: ${error}`;
        result.errors.push(errorMsg);
      }
    }

    return result;
  }

  /**
   * Validate API access - pure infrastructure check
   */
  async validateAccess(config: NotionConfig): Promise<boolean> {
    try {
      await this.notion.users.me();
      return true;
    } catch (error) {
      logger.warning(`API access validation failed: ${error}`);
      return false;
    }
  }

  // ===== Private Infrastructure Methods =====

  /**
   * Add content to individual page - pure content operation
   */
  private async addContentToPage(pageId: string): Promise<void> {
    try {
      const page = await this.dataManager.getPage(pageId);
      const properties = (page as any).properties;

      // Determine page type and add appropriate content
      if (properties['File Path']) {
        await this.contentManager.appendContent(
          pageId, 
          '# Code Analysis\n\nCode content will be added here.', 
          'markdown'
        );
      } else if (properties['Document Type']) {
        await this.contentManager.appendContent(
          pageId, 
          '# Document Content\n\nDocument content will be added here.', 
          'markdown'
        );
      }
    } catch (error) {
      logger.warning(`Failed to add content to page ${pageId}: ${error}`);
    }
  }

  /**
   * Load file index data - pure data loading
   */
  private async loadFileIndexData(): Promise<any | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-db.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return data.files || null;
    } catch (error) {
      logger.debug(`File index data load failed: ${error}`);
      return null;
    }
  }

  /**
   * Load document index data - pure data loading
   */
  private async loadDocumentIndexData(): Promise<any | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-document-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      logger.debug(`Document index data load failed: ${error}`);
      return null;
    }
  }

  /**
   * Load function index data - pure data loading
   */
  private async loadFunctionIndexData(): Promise<any | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-function-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      logger.debug(`Function index data load failed: ${error}`);
      return null;
    }
  }

  /**
   * Format file properties - pure data transformation
   */
  private formatFileProperties(filePath: string, fileData: any): Record<string, any> {
    return {
      'Name': { title: [{ text: { content: filePath.split('/').pop() || filePath } }] },
      'File Path': { rich_text: [{ text: { content: filePath } }] },
      'Extension': { select: { name: this.getFileExtension(filePath) } },
      'Size (bytes)': { number: fileData.size || 0 },
      'Last Modified': { date: { start: new Date(fileData.lastModified).toISOString().split('T')[0] } },
      'Status': { select: { name: 'Uploaded' } },
      'Project': { select: { name: 'dependency-linker' } }
    };
  }

  /**
   * Format document properties - pure data transformation
   */
  private formatDocumentProperties(filePath: string, docData: any): Record<string, any> {
    return {
      'Name': { title: [{ text: { content: docData.title || filePath } }] },
      'Document Type': { select: { name: docData.type || 'Documentation' } },
      'Content': { rich_text: [{ text: { content: (docData.content || '').substring(0, 2000) } }] },
      'Last Updated': { date: { start: new Date(docData.lastModified).toISOString().split('T')[0] } },
      'Status': { select: { name: 'Published' } },
      'Word Count': { number: docData.wordCount || 0 }
    };
  }

  /**
   * Format function properties - pure data transformation
   */
  private formatFunctionProperties(funcName: string, funcData: any): Record<string, any> {
    return {
      'Name': { title: [{ text: { content: funcName } }] },
      'Type': { select: { name: funcData.type || 'Function' } },
      'Parameters': { rich_text: [{ text: { content: funcData.parameters || '' } }] },
      'Return Type': { rich_text: [{ text: { content: funcData.returnType || '' } }] },
      'Description': { rich_text: [{ text: { content: funcData.description || '' } }] },
      'Complexity': { select: { name: funcData.complexity || 'Medium' } }
    };
  }

  /**
   * Get file extension - pure utility
   */
  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop();
    return ext ? `.${ext}` : 'Other';
  }
}