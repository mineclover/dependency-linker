/**
 * NotionUploadOrchestrator - 업로드 프로세스 조합 관리 서비스
 * 
 * 역할:
 * - 테이블, 데이터, 컨텐츠 업로드 전체 워크플로우 조합
 * - 각 매니저 서비스 초기화 및 설정
 * - 복합 업로드 작업 관리
 * - 진행 상황 추적 및 에러 복구
 */

import { logger } from '../../shared/utils/index.js';
import { NotionTableManager, DatabaseSchema, TableCreationResult } from './NotionTableManager.js';
import { NotionDataManager, BatchUploadResult, PageCreateOptions } from './NotionDataManager.js';
import { NotionContentManager, DocumentContent, ContentTemplate } from './NotionContentManager.js';
import type { IConfigurationService } from '../../domain/interfaces/IConfigurationService.js';
import type { INotionApiService } from '../../domain/interfaces/INotionApiService.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileIndexData {
  [filePath: string]: {
    notionPageId?: string;
    lastModified: string;
    hash: string;
    size?: number;
    lines?: number;
    extension?: string;
    content?: string;
  };
}

export interface DocumentIndexData {
  [filePath: string]: {
    notionPageId?: string;
    title: string;
    type: string;
    lastModified: string;
    wordCount?: number;
    content?: string;
  };
}

export interface FunctionIndexData {
  [functionName: string]: {
    notionPageId?: string;
    type: string;
    parameters?: string;
    returnType?: string;
    description?: string;
    complexity?: string;
    filePath: string;
    lineNumber?: number;
  };
}

export interface NotionClientConfig {
  apiKey: string;
  parentPageId?: string;
  workspaceUrl?: string;
  projectPath?: string;
}

export interface UploadWorkflowOptions {
  skipExisting?: boolean;
  updateExisting?: boolean;
  includeContent?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface ProjectUploadOptions extends UploadWorkflowOptions {
  schemaPath?: string;
  filePattern?: string[];
  documentPattern?: string[];
  maxFileSize?: number;
  maxContentLength?: number;
}

export interface WorkflowResult {
  success: boolean;
  tablesCreated?: Record<string, TableCreationResult>;
  dataResults?: {
    files?: BatchUploadResult;
    documents?: BatchUploadResult;
    functions?: BatchUploadResult;
  };
  contentResults?: {
    pagesWithContent: number;
    contentBlocks: number;
    errors: string[];
  };
  errors: string[];
  duration: number;
}

export class NotionUploadOrchestrator {
  private notionApiService: INotionApiService;
  private tableManager: NotionTableManager;
  private dataManager: NotionDataManager;
  private contentManager: NotionContentManager;
  private config: NotionClientConfig;

  constructor(
    config: NotionClientConfig,
    notionApiService: INotionApiService,
    tableManager?: NotionTableManager,
    dataManager?: NotionDataManager,
    contentManager?: NotionContentManager
  ) {
    this.config = config;
    this.notionApiService = notionApiService;
    
    // 매니저 초기화 (의존성 주입 또는 기본 생성)
    this.tableManager = tableManager || this.createTableManager();
    this.dataManager = dataManager || this.createDataManager();
    this.contentManager = contentManager || this.createContentManager();
    
    logger.info('🚀 NotionUploadOrchestrator initialized', 'ORCHESTRATOR');
  }

  /**
   * Factory methods using dependency injection
   */
  private createTableManager(): NotionTableManager {
    // Use INotionApiService instead of direct Client instantiation
    return new NotionTableManager(this.notionApiService, this.config.parentPageId);
  }

  private createDataManager(): NotionDataManager {
    // Use INotionApiService instead of direct Client instantiation
    return new NotionDataManager(this.notionApiService);
  }

  private createContentManager(): NotionContentManager {
    // Use INotionApiService instead of direct Client instantiation
    return new NotionContentManager(this.notionApiService);
  }

  /**
   * 전체 프로젝트 업로드 워크플로우
   */
  async uploadProject(options: ProjectUploadOptions = {}): Promise<WorkflowResult> {
    const startTime = Date.now();
    logger.info('🎯 Starting complete project upload workflow', 'ORCHESTRATOR');
    
    const result: WorkflowResult = {
      success: false,
      errors: [],
      duration: 0
    };
    
    try {
      // 1. 스키마 기반 테이블 생성
      if (options.schemaPath) {
        logger.info('📋 Step 1: Creating databases from schema', 'ORCHESTRATOR');
        result.tablesCreated = await this.tableManager.createDatabasesFromSchema(
          options.schemaPath
        );
        logger.success(`✅ Created ${Object.keys(result.tablesCreated).length} databases`);
      }
      
      // 2. 파일 데이터 업로드
      if (result.tablesCreated?.files) {
        logger.info('📁 Step 2: Uploading file data', 'ORCHESTRATOR');
        result.dataResults = result.dataResults || {};
        result.dataResults.files = await this.uploadFileData(
          result.tablesCreated.files.id,
          options
        );
        logger.success(`✅ File upload: ${result.dataResults.files.created} created, ${result.dataResults.files.updated} updated`);
      }
      
      // 3. 문서 데이터 업로드
      if (result.tablesCreated?.docs) {
        logger.info('📚 Step 3: Uploading document data', 'ORCHESTRATOR');
        result.dataResults = result.dataResults || {};
        result.dataResults.documents = await this.uploadDocumentData(
          result.tablesCreated.docs.id,
          options
        );
        logger.success(`✅ Document upload: ${result.dataResults.documents.created} created, ${result.dataResults.documents.updated} updated`);
      }
      
      // 4. 페이지 컨텐츠 업로드
      if (options.includeContent && result.dataResults) {
        logger.info('📝 Step 4: Adding page content', 'ORCHESTRATOR');
        result.contentResults = await this.addContentToPages(result.dataResults, options);
        logger.success(`✅ Content added to ${result.contentResults.pagesWithContent} pages`);
      }
      
      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;
      
      logger.success(`🎉 Project upload completed in ${result.duration}ms`);
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;
      
      logger.error(`❌ Project upload failed: ${errorMsg} ORCHESTRATOR`);
      return result;
    }
  }

  /**
   * 스키마만 생성 (테이블만)
   */
  async createTablesOnly(schemaPath: string): Promise<Record<string, TableCreationResult>> {
    logger.info('📋 Creating tables only from schema', 'ORCHESTRATOR');
    return await this.tableManager.createDatabasesFromSchema(schemaPath);
  }

  /**
   * 데이터만 업로드 (기존 테이블에)
   */
  async uploadDataOnly(
    databaseIds: { files?: string; docs?: string; functions?: string },
    options: UploadWorkflowOptions = {}
  ): Promise<WorkflowResult['dataResults']> {
    logger.info('📦 Uploading data to existing tables', 'ORCHESTRATOR');
    
    const results: WorkflowResult['dataResults'] = {};
    
    if (databaseIds.files) {
      results.files = await this.uploadFileData(databaseIds.files, options);
    }
    
    if (databaseIds.docs) {
      results.documents = await this.uploadDocumentData(databaseIds.docs, options);
    }
    
    if (databaseIds.functions) {
      results.functions = await this.uploadFunctionData(databaseIds.functions, options);
    }
    
    return results;
  }

  /**
   * 컨텐츠만 업로드 (기존 페이지에)
   */
  async uploadContentOnly(pageIds: string[], options: UploadWorkflowOptions = {}): Promise<void> {
    logger.info('📝 Adding content to existing pages', 'ORCHESTRATOR');
    
    for (const pageId of pageIds) {
      try {
        // 페이지 타입에 따라 적절한 컨텐츠 생성
        await this.addContentToPage(pageId, options);
      } catch (error) {
        logger.error(`❌ Failed to add content to page ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  /**
   * 특정 데이터베이스 스키마 업데이트
   */
  async updateTableSchema(
    databaseId: string,
    schemaUpdates: Partial<DatabaseSchema>
  ): Promise<void> {
    logger.info(`🔄 Updating table schema: ${databaseId}`, 'ORCHESTRATOR');
    return await this.tableManager.updateDatabaseSchema(databaseId, schemaUpdates);
  }

  /**
   * 페이지 내용 템플릿 적용
   */
  async applyContentTemplate(
    pageIds: string[],
    template: ContentTemplate,
    variables: Record<string, string> = {}
  ): Promise<void> {
    logger.info(`📋 Applying template "${template.name}" to ${pageIds.length} pages`, 'ORCHESTRATOR');
    
    for (const pageId of pageIds) {
      try {
        await this.contentManager.createFromTemplate(pageId, template, variables);
      } catch (error) {
        logger.error(`❌ Failed to apply template to page ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  /**
   * 워크플로우 진행 상황 조회
   */
  async getWorkflowStatus(databaseIds: string[]): Promise<{
    [databaseId: string]: {
      totalPages: number;
      createdToday: number;
      updatedToday: number;
      hasContent: number;
    };
  }> {
    const status: any = {};
    
    for (const databaseId of databaseIds) {
      try {
        const stats = await this.dataManager.getDatabaseStats(databaseId);
        const pages = await this.dataManager.getAllPages(databaseId);
        
        // 컨텐츠가 있는 페이지 수 계산
        const hasContent = await this.countPagesWithContent(pages);
        
        status[databaseId] = {
          ...stats,
          hasContent
        };
      } catch (error) {
        logger.error(`❌ Failed to get status for database ${databaseId}: ` + (error instanceof Error ? error.message : String(error)));
        status[databaseId] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
    
    return status;
  }

  // === Private Methods ===

  private async uploadFileData(
    databaseId: string,
    options: UploadWorkflowOptions
  ): Promise<BatchUploadResult> {
    try {
      const fileData = await this.loadFileIndexData();
      if (!fileData || Object.keys(fileData).length === 0) {
        logger.warning('No file data found for upload');
        return this.createEmptyBatchResult();
      }
      
      const pages = Object.entries(fileData).map(([filePath, data]) => ({
        uniqueProperty: 'File Path',
        uniqueValue: filePath,
        data: {
          properties: this.formatFileProperties(filePath, data)
        }
      }));
      
      return await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });
    } catch (error) {
      logger.error('❌ Failed to upload file data: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async uploadDocumentData(
    databaseId: string,
    options: UploadWorkflowOptions
  ): Promise<BatchUploadResult> {
    try {
      const docData = await this.loadDocumentIndexData();
      if (!docData || Object.keys(docData).length === 0) {
        logger.warning('No document data found for upload');
        return this.createEmptyBatchResult();
      }
      
      const pages = Object.entries(docData).map(([filePath, data]) => ({
        uniqueProperty: 'Name',
        uniqueValue: data.title,
        data: {
          properties: this.formatDocumentProperties(filePath, data)
        }
      }));
      
      return await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });
    } catch (error) {
      logger.error('❌ Failed to upload document data: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async uploadFunctionData(
    databaseId: string,
    options: UploadWorkflowOptions
  ): Promise<BatchUploadResult> {
    try {
      const functionData = await this.loadFunctionIndexData();
      if (!functionData || Object.keys(functionData).length === 0) {
        logger.warning('No function data found for upload');
        return this.createEmptyBatchResult();
      }
      
      const pages = Object.entries(functionData).map(([funcName, data]) => ({
        uniqueProperty: 'Name',
        uniqueValue: funcName,
        data: {
          properties: this.formatFunctionProperties(funcName, data)
        }
      }));
      
      return await this.dataManager.batchUpload(databaseId, pages, {
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        skipExisting: options.skipExisting,
        updateExisting: options.updateExisting
      });
    } catch (error) {
      logger.error('❌ Failed to upload function data: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async addContentToPages(
    dataResults: WorkflowResult['dataResults'],
    options: UploadWorkflowOptions
  ): Promise<WorkflowResult['contentResults']> {
    const result = {
      pagesWithContent: 0,
      contentBlocks: 0,
      errors: []
    };
    
    try {
      // 파일 페이지에 코드 컨텐츠 추가
      if (dataResults?.files?.results) {
        for (const fileResult of dataResults.files.results) {
          if (fileResult.success && fileResult.pageId) {
            try {
              await this.addCodeContentToPage(fileResult.pageId);
              result.pagesWithContent++;
            } catch (error) {
              const errorMsg = `Failed to add content to file page ${fileResult.pageId}: ${error}`;
              result.errors.push(errorMsg);
            }
          }
        }
      }
      
      // 문서 페이지에 문서 컨텐츠 추가
      if (dataResults?.documents?.results) {
        for (const docResult of dataResults.documents.results) {
          if (docResult.success && docResult.pageId) {
            try {
              await this.addDocumentContentToPage(docResult.pageId);
              result.pagesWithContent++;
            } catch (error) {
              const errorMsg = `Failed to add content to document page ${docResult.pageId}: ${error}`;
              result.errors.push(errorMsg);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
    
    return result;
  }

  private async addContentToPage(pageId: string, options: UploadWorkflowOptions): Promise<void> {
    // 페이지 타입 확인하고 적절한 컨텐츠 추가
    try {
      const page = await this.dataManager.getPage(pageId);
      const properties = (page as any).properties;
      
      // 파일 경로가 있으면 코드 페이지로 간주
      if (properties['File Path']) {
        await this.addCodeContentToPage(pageId);
      }
      // 문서 타입이 있으면 문서 페이지로 간주
      else if (properties['Document Type']) {
        await this.addDocumentContentToPage(pageId);
      }
    } catch (error) {
      logger.error(`❌ Failed to determine page type for ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
    }
  }

  private async addCodeContentToPage(pageId: string): Promise<void> {
    // 구현 예정: 코드 파일 내용 기반 컨텐츠 생성
    await this.contentManager.appendContent(pageId, '# Code Analysis\n\nCode content will be added here.', 'markdown');
  }

  private async addDocumentContentToPage(pageId: string): Promise<void> {
    // 구현 예정: 문서 파일 내용 기반 컨텐츠 생성
    await this.contentManager.appendContent(pageId, '# Document Content\n\nDocument content will be added here.', 'markdown');
  }

  private async countPagesWithContent(pages: any[]): Promise<number> {
    let count = 0;
    for (const page of pages.slice(0, 10)) { // 샘플링으로 성능 최적화
      try {
        const blocks = await this.contentManager.getPageBlocks(page.id);
        if (blocks.length > 0) count++;
      } catch {
        // 접근 권한 없음 등의 이유로 실패할 수 있음
      }
    }
    return Math.round((count / Math.min(pages.length, 10)) * pages.length);
  }

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

  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop();
    return ext ? `.${ext}` : 'Other';
  }

  private createEmptyBatchResult(): BatchUploadResult {
    return {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      results: []
    };
  }

  private async loadFileIndexData(): Promise<FileIndexData | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-db.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return data.files || null;
    } catch (error) {
      logger.warning(`파일 인덱스 데이터 로드 실패: ${error}`);
      return null;
    }
  }

  private async loadDocumentIndexData(): Promise<DocumentIndexData | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-document-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      logger.warning(`문서 인덱스 데이터 로드 실패: ${error}`);
      return null;
    }
  }

  private async loadFunctionIndexData(): Promise<FunctionIndexData | null> {
    try {
      const projectPath = this.config.projectPath || process.cwd();
      const indexPath = path.join(projectPath, '.deplink-function-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      logger.debug(`함수 인덱스 데이터 로드 실패: ${error}`);
      return null;
    }
  }
}