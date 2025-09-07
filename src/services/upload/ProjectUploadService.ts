/**
 * Project Upload Service - Business Workflow Layer
 * Handles project upload workflows and business rules
 * 
 * Extracted from NotionUploadOrchestrator to separate concerns:
 * - NotionUploadOrchestrator: Notion-specific operations (Infrastructure)
 * - ProjectUploadService: Business workflows and validation (Services)
 */

import { logger } from '../../shared/utils/index.js';
import type { 
  ProjectFile, 
  UploadResult, 
  NotionConfig 
} from '../../shared/types/index.js';
import type {
  IProjectUploadService,
  IUploadRepository,
  ProjectUploadOptions,
  ProjectUploadResult
} from '../../domain/interfaces/IUploadService.js';

/**
 * Upload workflow options
 */
export interface ProjectUploadOptions {
  skipExisting?: boolean;
  updateExisting?: boolean;
  includeContent?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
  schemaPath?: string;
  filePattern?: string[];
  documentPattern?: string[];
  maxFileSize?: number;
  maxContentLength?: number;
}

/**
 * Upload workflow result with business context
 */
export interface ProjectUploadResult {
  success: boolean;
  tablesCreated?: Record<string, { id: string; success: boolean }>;
  dataResults?: {
    files?: { created: number; updated: number; failed: number; errors: string[] };
    documents?: { created: number; updated: number; failed: number; errors: string[] };
    functions?: { created: number; updated: number; failed: number; errors: string[] };
  };
  contentResults?: {
    pagesWithContent: number;
    contentBlocks: number;
    errors: string[];
  };
  errors: string[];
  duration: number;
  businessRules: {
    validationPassed: boolean;
    rulesApplied: string[];
    warnings: string[];
  };
}

/**
 * Upload repository interface
 */
export interface IUploadRepository {
  createDatabases(schemaPath: string): Promise<Record<string, { id: string; success: boolean }>>;
  uploadFiles(databaseId: string, options: ProjectUploadOptions): Promise<{ created: number; updated: number; failed: number; errors: string[] }>;
  uploadDocuments(databaseId: string, options: ProjectUploadOptions): Promise<{ created: number; updated: number; failed: number; errors: string[] }>;
  uploadFunctions(databaseId: string, options: ProjectUploadOptions): Promise<{ created: number; updated: number; failed: number; errors: string[] }>;
  addContentToPages(pageIds: string[], options: ProjectUploadOptions): Promise<{ pagesWithContent: number; contentBlocks: number; errors: string[] }>;
  validateAccess(config: NotionConfig): Promise<boolean>;
}

/**
 * Project Upload Service - Business workflow orchestration
 * Note: Uses local interfaces that extend the domain interfaces
 */
export class ProjectUploadService {
  constructor(
    private uploadRepository: IUploadRepository
  ) {}

  /**
   * Upload entire project with business rules
   */
  async uploadProject(
    config: NotionConfig,
    options: ProjectUploadOptions = {}
  ): Promise<ProjectUploadResult> {
    const startTime = Date.now();
    logger.info('🎯 Starting project upload with business validation...', '⚙️');

    const result: ProjectUploadResult = {
      success: false,
      errors: [],
      duration: 0,
      businessRules: {
        validationPassed: false,
        rulesApplied: [],
        warnings: []
      }
    };

    try {
      // 1. Apply business rules and validation
      const validation = await this.validateUploadRequest(config, options);
      result.businessRules = validation;
      
      if (!validation.validationPassed) {
        result.errors.push('Business validation failed');
        result.duration = Date.now() - startTime;
        return result;
      }

      // 2. Execute upload workflow (delegated to repository)
      const uploadResult = await this.executeUploadWorkflow(config, options);
      
      // 3. Apply post-upload business rules
      const postValidation = await this.validateUploadResult(uploadResult);
      if (!postValidation.success) {
        result.businessRules.warnings.push(...postValidation.warnings);
      }

      // 4. Combine results
      Object.assign(result, uploadResult);
      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      logger.success(`Project upload completed: ${result.success ? 'Success' : 'Failed'}`, '✅');
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;
      
      logger.error(`Project upload failed: ${errorMsg} ❌`);
      return result;
    }
  }

  /**
   * Upload only database schemas (business workflow)
   */
  async uploadSchemasOnly(
    config: NotionConfig,
    schemaPath: string
  ): Promise<ProjectUploadResult> {
    logger.info('📋 Schema-only upload workflow', '📋');

    const validation = await this.validateSchemaUpload(config, schemaPath);
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
        duration: 0,
        businessRules: {
          validationPassed: false,
          rulesApplied: ['schema-validation'],
          warnings: validation.warnings
        }
      };
    }

    const tablesCreated = await this.uploadRepository.createDatabases(schemaPath);
    
    return {
      success: true,
      tablesCreated,
      errors: [],
      duration: Date.now(),
      businessRules: {
        validationPassed: true,
        rulesApplied: ['schema-validation', 'database-creation'],
        warnings: []
      }
    };
  }

  /**
   * Upload only data to existing databases (business workflow)
   */
  async uploadDataOnly(
    config: NotionConfig,
    databaseIds: { files?: string; docs?: string; functions?: string },
    options: ProjectUploadOptions = {}
  ): Promise<ProjectUploadResult> {
    logger.info('📦 Data-only upload workflow', '📦');

    // Business rule: Validate database access before upload
    for (const [type, dbId] of Object.entries(databaseIds)) {
      if (dbId && !await this.uploadRepository.validateAccess(config)) {
        return {
          success: false,
          errors: [`Access validation failed for ${type} database: ${dbId}`],
          duration: 0,
          businessRules: {
            validationPassed: false,
            rulesApplied: ['access-validation'],
            warnings: []
          }
        };
      }
    }

    const dataResults: ProjectUploadResult['dataResults'] = {};
    
    if (databaseIds.files) {
      dataResults.files = await this.uploadRepository.uploadFiles(databaseIds.files, options);
    }
    
    if (databaseIds.docs) {
      dataResults.documents = await this.uploadRepository.uploadDocuments(databaseIds.docs, options);
    }
    
    if (databaseIds.functions) {
      dataResults.functions = await this.uploadRepository.uploadFunctions(databaseIds.functions, options);
    }

    return {
      success: true,
      dataResults,
      errors: [],
      duration: Date.now(),
      businessRules: {
        validationPassed: true,
        rulesApplied: ['access-validation', 'data-upload'],
        warnings: []
      }
    };
  }

  /**
   * Apply business rules and validation
   */
  private async validateUploadRequest(
    config: NotionConfig,
    options: ProjectUploadOptions
  ): Promise<ProjectUploadResult['businessRules']> {
    const validation: ProjectUploadResult['businessRules'] = {
      validationPassed: false,
      rulesApplied: [],
      warnings: []
    };

    // Business rule: API key is required
    if (!config.apiKey) {
      validation.warnings.push('Notion API key is required');
      return validation;
    }

    // Business rule: Access validation
    validation.rulesApplied.push('access-validation');
    if (!await this.uploadRepository.validateAccess(config)) {
      validation.warnings.push('API access validation failed');
      return validation;
    }

    // Business rule: Schema path validation
    if (options.schemaPath && !options.schemaPath.endsWith('.json')) {
      validation.warnings.push('Schema path should point to a JSON file');
    } else if (options.schemaPath) {
      validation.rulesApplied.push('schema-validation');
    }

    // Business rule: File size limits
    if (options.maxFileSize && options.maxFileSize > 25 * 1024 * 1024) { // 25MB Notion limit
      validation.warnings.push('File size limit exceeds Notion maximum (25MB)');
      return validation;
    } else if (options.maxFileSize) {
      validation.rulesApplied.push('file-size-validation');
    }

    // Business rule: Content length limits
    if (options.maxContentLength && options.maxContentLength > 2000) { // Notion text property limit
      validation.warnings.push('Content length limit exceeds Notion text property maximum (2000 chars)');
    } else if (options.maxContentLength) {
      validation.rulesApplied.push('content-length-validation');
    }

    validation.validationPassed = validation.warnings.length === 0;
    return validation;
  }

  /**
   * Execute upload workflow (business orchestration)
   */
  private async executeUploadWorkflow(
    config: NotionConfig,
    options: ProjectUploadOptions
  ): Promise<Partial<ProjectUploadResult>> {
    const result: Partial<ProjectUploadResult> = {};

    // Step 1: Create databases if schema provided
    if (options.schemaPath) {
      logger.info('📋 Step 1: Creating databases from schema', '1️⃣');
      result.tablesCreated = await this.uploadRepository.createDatabases(options.schemaPath);
      logger.success(`✅ Created ${Object.keys(result.tablesCreated).length} databases`);
    }

    // Step 2: Upload file data
    if (result.tablesCreated?.files) {
      logger.info('📁 Step 2: Uploading file data', '2️⃣');
      result.dataResults = result.dataResults || {};
      result.dataResults.files = await this.uploadRepository.uploadFiles(
        result.tablesCreated.files.id,
        options
      );
      logger.success(`✅ Files: ${result.dataResults.files.created} created, ${result.dataResults.files.updated} updated`);
    }

    // Step 3: Upload document data
    if (result.tablesCreated?.docs) {
      logger.info('📚 Step 3: Uploading document data', '3️⃣');
      result.dataResults = result.dataResults || {};
      result.dataResults.documents = await this.uploadRepository.uploadDocuments(
        result.tablesCreated.docs.id,
        options
      );
      logger.success(`✅ Documents: ${result.dataResults.documents.created} created, ${result.dataResults.documents.updated} updated`);
    }

    // Step 4: Add content to pages if requested
    if (options.includeContent && result.dataResults) {
      logger.info('📝 Step 4: Adding page content', '4️⃣');
      const pageIds = this.extractPageIds(result.dataResults);
      result.contentResults = await this.uploadRepository.addContentToPages(pageIds, options);
      logger.success(`✅ Content added to ${result.contentResults.pagesWithContent} pages`);
    }

    return result;
  }

  /**
   * Validate schema upload request (business rule)
   */
  private async validateSchemaUpload(
    config: NotionConfig,
    schemaPath: string
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const result = { success: false, errors: [], warnings: [] };

    if (!config.apiKey) {
      result.errors.push('Notion API key is required');
      return result;
    }

    if (!schemaPath) {
      result.errors.push('Schema path is required');
      return result;
    }

    if (!schemaPath.endsWith('.json')) {
      result.warnings.push('Schema path should point to a JSON file');
    }

    if (!await this.uploadRepository.validateAccess(config)) {
      result.errors.push('API access validation failed');
      return result;
    }

    result.success = true;
    return result;
  }

  /**
   * Validate upload results (business rule)
   */
  private async validateUploadResult(result: Partial<ProjectUploadResult>): Promise<{
    success: boolean;
    warnings: string[];
  }> {
    const validation = { success: true, warnings: [] };

    // Business rule: Check for high failure rates
    if (result.dataResults?.files && result.dataResults.files.failed > result.dataResults.files.created) {
      validation.warnings.push('High file upload failure rate detected');
    }

    if (result.dataResults?.documents && result.dataResults.documents.failed > result.dataResults.documents.created) {
      validation.warnings.push('High document upload failure rate detected');
    }

    // Business rule: Check content addition success
    if (result.contentResults && result.contentResults.errors.length > result.contentResults.pagesWithContent) {
      validation.warnings.push('Content addition had high error rate');
    }

    return validation;
  }

  /**
   * Extract page IDs from upload results (utility)
   */
  private extractPageIds(dataResults: ProjectUploadResult['dataResults']): string[] {
    const pageIds: string[] = [];
    
    // Implementation would extract page IDs from upload results
    // This is a placeholder for the actual extraction logic
    
    return pageIds;
  }

  /**
   * Get upload progress summary for reporting
   */
  getUploadSummary(result: ProjectUploadResult): {
    status: 'complete' | 'partial' | 'failed';
    summary: string;
    recommendations: string[];
  } {
    if (result.success && result.businessRules.validationPassed) {
      return {
        status: 'complete',
        summary: `Upload completed successfully with ${Object.keys(result.tablesCreated || {}).length} databases`,
        recommendations: []
      };
    }

    if (result.dataResults && Object.keys(result.dataResults).length > 0) {
      return {
        status: 'partial',
        summary: 'Partial upload completed with some errors',
        recommendations: result.errors.concat(result.businessRules.warnings)
      };
    }

    return {
      status: 'failed',
      summary: 'Upload failed - check configuration and permissions',
      recommendations: result.errors.concat(result.businessRules.warnings)
    };
  }
}