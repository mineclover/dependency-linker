/**
 * Notion Data Migrator - Migration System Component
 * 데이터베이스 간 페이지 데이터 마이그레이션 및 메타데이터 정리
 */

import { NotionApiService } from '../../infrastructure/notion/core/NotionApiService.js';
import { logger } from '../../shared/utils/index.js';
import type { DatabaseSchema } from '../../shared/utils/schemaManager.js';

export interface MigrationRequest {
  sourceDatabaseId: string;
  targetDatabaseId: string;
  targetSchema: DatabaseSchema;
  options?: MigrationOptions;
}

export interface MigrationOptions {
  batchSize?: number;           // 배치 크기 (기본: 10)
  cleanupMetadata?: boolean;    // 메타데이터 정리 여부 (기본: true)
  validateData?: boolean;       // 데이터 검증 여부 (기본: true)
  dryRun?: boolean;            // 실제 실행 없이 테스트 (기본: false)
  skipExisting?: boolean;       // 기존 페이지 건너뛰기 (기본: false)
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  summary: {
    totalPages: number;
    processedPages: number;
    successfulPages: number;
    failedPages: number;
    skippedPages: number;
  };
  details: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    errors: MigrationError[];
    processedPageIds: string[];
  };
  message: string;
}

export interface MigrationError {
  pageId: string;
  pageTitle?: string;
  error: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retryable: boolean;
}

export interface TransformedPage {
  originalPageId: string;
  title: string;
  properties: Record<string, any>;
  content?: any[];
  metadata: {
    sourceDatabase: string;
    migrationId: string;
    migrationDate: Date;
    originalData: any;
  };
}

export interface PageValidationResult {
  isValid: boolean;
  issues: Array<{
    property: string;
    issue: string;
    severity: 'WARNING' | 'ERROR';
  }>;
  suggestions: string[];
}

/**
 * Notion Data Migrator
 * ETL 파이프라인을 통한 데이터 마이그레이션
 */
export class NotionDataMigrator {
  private notionApi: NotionApiService;
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor(notionApi: NotionApiService) {
    this.notionApi = notionApi;
  }

  /**
   * 데이터베이스 마이그레이션 실행
   */
  async migrateDatabase(request: MigrationRequest): Promise<MigrationResult> {
    const migrationId = this.generateMigrationId();
    const startTime = new Date();

    logger.info(`Starting migration: ${migrationId}`, '🚚');
    logger.info(`Source: ${request.sourceDatabaseId}`);
    logger.info(`Target: ${request.targetDatabaseId}`);

    try {
      // 1. Extract: 원본 데이터베이스에서 페이지 추출
      const extractResult = await this.extractPages(request.sourceDatabaseId);
      
      if (!extractResult.success) {
        return this.createFailureResult(migrationId, startTime, `Data extraction failed: ${extractResult.error}`);
      }

      const pages = extractResult.pages;
      logger.info(`Extracted ${pages.length} pages from source database`);

      // 2. Transform: 데이터 변환 및 정리
      const transformedPages: TransformedPage[] = [];
      const transformErrors: MigrationError[] = [];

      for (const page of pages) {
        try {
          const transformedPage = await this.transformPage(page, request.targetSchema, migrationId, request.options);
          
          // 데이터 검증
          if (request.options?.validateData !== false) {
            const validation = this.validateTransformedPage(transformedPage, request.targetSchema);
            if (!validation.isValid) {
              const criticalIssues = validation.issues.filter(i => i.severity === 'ERROR');
              if (criticalIssues.length > 0) {
                transformErrors.push({
                  pageId: page.id,
                  pageTitle: this.extractPageTitle(page),
                  error: `Validation failed: ${criticalIssues.map(i => i.issue).join('; ')}`,
                  severity: 'HIGH',
                  retryable: false
                });
                continue;
              }
            }
          }

          transformedPages.push(transformedPage);

        } catch (error) {
          transformErrors.push({
            pageId: page.id,
            pageTitle: this.extractPageTitle(page),
            error: `Transform failed: ${error}`,
            severity: 'HIGH',
            retryable: true
          });
        }
      }

      logger.info(`Transformed ${transformedPages.length} pages successfully`);
      if (transformErrors.length > 0) {
        logger.warning(`${transformErrors.length} pages failed transformation`);
      }

      // Dry run인 경우 여기서 중단
      if (request.options?.dryRun) {
        return this.createDryRunResult(migrationId, startTime, pages.length, transformedPages.length, transformErrors);
      }

      // 3. Load: 대상 데이터베이스로 로드
      const loadResult = await this.loadPages(transformedPages, request.targetDatabaseId, request.options);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: MigrationResult = {
        success: loadResult.errors.length === 0,
        migrationId,
        summary: {
          totalPages: pages.length,
          processedPages: transformedPages.length,
          successfulPages: loadResult.successfulPages,
          failedPages: loadResult.failedPages,
          skippedPages: pages.length - transformedPages.length
        },
        details: {
          startTime,
          endTime,
          duration,
          errors: [...transformErrors, ...loadResult.errors],
          processedPageIds: loadResult.processedPageIds
        },
        message: `Migration completed: ${loadResult.successfulPages}/${pages.length} pages migrated successfully`
      };

      logger.success(`Migration ${migrationId} completed in ${Math.round(duration / 1000)}s`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Migration ${migrationId} failed: ${errorMessage}`);

      return this.createFailureResult(migrationId, startTime, errorMessage);
    }
  }

  /**
   * Extract: 페이지 데이터 추출
   */
  private async extractPages(databaseId: string): Promise<{
    success: boolean;
    pages: any[];
    error?: string;
  }> {
    try {
      const queryResult = await this.notionApi.queryDatabase(databaseId);
      
      if (!queryResult.success) {
        return {
          success: false,
          pages: [],
          error: queryResult.message
        };
      }

      return {
        success: true,
        pages: queryResult.data.results || []
      };

    } catch (error) {
      return {
        success: false,
        pages: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Transform: 페이지 데이터 변환 및 정리
   */
  private async transformPage(
    page: any,
    targetSchema: DatabaseSchema,
    migrationId: string,
    options?: MigrationOptions
  ): Promise<TransformedPage> {
    const transformedPage: TransformedPage = {
      originalPageId: page.id,
      title: this.extractPageTitle(page),
      properties: {},
      metadata: {
        sourceDatabase: page.parent?.database_id || '',
        migrationId,
        migrationDate: new Date(),
        originalData: page
      }
    };

    // 속성 변환 및 정리
    const sourceProperties = page.properties || {};
    const targetProperties = this.extractPropertiesFromSchema(targetSchema);

    for (const [targetPropName, targetPropDef] of Object.entries(targetProperties)) {
      // 소스에서 해당 속성 찾기 (정확한 이름 매칭)
      let sourceValue = sourceProperties[targetPropName];

      if (sourceValue) {
        // 메타데이터 정리 옵션이 활성화된 경우
        if (options?.cleanupMetadata !== false) {
          sourceValue = this.cleanupPropertyMetadata(sourceValue, targetPropDef);
        }

        transformedPage.properties[targetPropName] = sourceValue;
      } else {
        // 속성이 없는 경우 기본값 설정
        const defaultValue = this.getDefaultValueForProperty(targetPropDef);
        if (defaultValue !== null) {
          transformedPage.properties[targetPropName] = defaultValue;
        }
      }
    }

    return transformedPage;
  }

  /**
   * Load: 변환된 페이지를 대상 데이터베이스에 로드
   */
  private async loadPages(
    pages: TransformedPage[],
    targetDatabaseId: string,
    options?: MigrationOptions
  ): Promise<{
    successfulPages: number;
    failedPages: number;
    errors: MigrationError[];
    processedPageIds: string[];
  }> {
    const batchSize = options?.batchSize || this.DEFAULT_BATCH_SIZE;
    const errors: MigrationError[] = [];
    const processedPageIds: string[] = [];
    let successfulPages = 0;
    let failedPages = 0;

    logger.info(`Loading ${pages.length} pages in batches of ${batchSize}`);

    // 배치 처리
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pages.length/batchSize)}`);

      for (const page of batch) {
        try {
          const createResult = await this.notionApi.createPage({
            parent: {
              type: 'database_id',
              database_id: targetDatabaseId
            },
            properties: page.properties
          });

          if (createResult.success) {
            successfulPages++;
            processedPageIds.push(createResult.data.id);
            logger.debug(`✅ Created page: ${page.title}`);
          } else {
            failedPages++;
            errors.push({
              pageId: page.originalPageId,
              pageTitle: page.title,
              error: `Page creation failed: ${createResult.message}`,
              severity: 'MEDIUM',
              retryable: true
            });
          }

        } catch (error) {
          failedPages++;
          errors.push({
            pageId: page.originalPageId,
            pageTitle: page.title,
            error: `Page creation error: ${error}`,
            severity: 'HIGH',
            retryable: true
          });
        }

        // Rate limiting
        await this.delay(200);
      }

      // 배치 간 지연
      await this.delay(500);
    }

    return {
      successfulPages,
      failedPages,
      errors,
      processedPageIds
    };
  }

  /**
   * 속성 메타데이터 정리
   */
  private cleanupPropertyMetadata(sourceValue: any, targetPropertyDef: any): any {
    if (!sourceValue || typeof sourceValue !== 'object') {
      return sourceValue;
    }

    // 공통 메타데이터 필드 제거
    const cleaned = { ...sourceValue };
    delete cleaned.id;
    delete cleaned.created_time;
    delete cleaned.last_edited_time;
    delete cleaned.created_by;
    delete cleaned.last_edited_by;

    // 타입별 정리
    switch (targetPropertyDef.type) {
      case 'select':
        if (cleaned.select && cleaned.select.id) {
          // ID 제거, name만 유지
          cleaned.select = {
            name: cleaned.select.name
          };
        }
        break;

      case 'multi_select':
        if (cleaned.multi_select && Array.isArray(cleaned.multi_select)) {
          cleaned.multi_select = cleaned.multi_select.map((item: any) => ({
            name: item.name
          }));
        }
        break;

      case 'relation':
        if (cleaned.relation && Array.isArray(cleaned.relation)) {
          // Relation은 ID만 유지
          cleaned.relation = cleaned.relation.map((item: any) => ({
            id: item.id
          }));
        }
        break;
    }

    return cleaned;
  }

  /**
   * 속성별 기본값 생성
   */
  private getDefaultValueForProperty(propertyDef: any): any {
    switch (propertyDef.type) {
      case 'title':
        return { title: [{ text: { content: 'Untitled' } }] };
        
      case 'rich_text':
        return { rich_text: [] };
        
      case 'number':
        return null; // 숫자는 기본값 없음
        
      case 'select':
        return null; // Select는 기본값 없음
        
      case 'multi_select':
        return { multi_select: [] };
        
      case 'date':
        return null;
        
      case 'checkbox':
        return { checkbox: false };
        
      case 'url':
        return null;
        
      case 'relation':
        return { relation: [] };
        
      default:
        return null;
    }
  }

  /**
   * 변환된 페이지 검증
   */
  private validateTransformedPage(page: TransformedPage, schema: DatabaseSchema): PageValidationResult {
    const issues: Array<{ property: string; issue: string; severity: 'WARNING' | 'ERROR' }> = [];
    const suggestions: string[] = [];

    const targetProperties = this.extractPropertiesFromSchema(schema);

    // 필수 속성 검증
    for (const [propName, propDef] of Object.entries(targetProperties)) {
      if (propDef.type === 'title' && !page.properties[propName]) {
        issues.push({
          property: propName,
          issue: 'Title property is missing',
          severity: 'ERROR'
        });
      }
    }

    // 속성값 유효성 검증
    for (const [propName, value] of Object.entries(page.properties)) {
      if (value === null || value === undefined) {
        issues.push({
          property: propName,
          issue: 'Property has null/undefined value',
          severity: 'WARNING'
        });
      }
    }

    // 제안사항 생성
    if (issues.length > 0) {
      suggestions.push('Review and fix property validation issues');
    }

    return {
      isValid: issues.filter(i => i.severity === 'ERROR').length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 페이지 제목 추출
   */
  private extractPageTitle(page: any): string {
    const properties = page.properties || {};
    
    // Title 속성 찾기
    for (const [propName, propValue] of Object.entries(properties)) {
      if (propValue && (propValue as any).type === 'title') {
        const titleContent = (propValue as any).title;
        if (titleContent && titleContent.length > 0) {
          return titleContent[0]?.text?.content || 'Untitled';
        }
      }
    }

    return 'Untitled';
  }

  /**
   * 스키마에서 properties 추출
   */
  private extractPropertiesFromSchema(schema: DatabaseSchema): Record<string, any> {
    const typedSchema = schema as any;
    
    if (typedSchema.properties) {
      return typedSchema.properties;
    }
    
    if (typedSchema.initial_data_source?.properties) {
      return typedSchema.initial_data_source.properties;
    }
    
    return {};
  }

  /**
   * Migration ID 생성
   */
  private generateMigrationId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `migration-${timestamp}-${random}`;
  }

  /**
   * 실패 결과 생성
   */
  private createFailureResult(migrationId: string, startTime: Date, errorMessage: string): MigrationResult {
    return {
      success: false,
      migrationId,
      summary: {
        totalPages: 0,
        processedPages: 0,
        successfulPages: 0,
        failedPages: 0,
        skippedPages: 0
      },
      details: {
        startTime,
        endTime: new Date(),
        duration: new Date().getTime() - startTime.getTime(),
        errors: [{
          pageId: '',
          error: errorMessage,
          severity: 'CRITICAL',
          retryable: false
        }],
        processedPageIds: []
      },
      message: `Migration failed: ${errorMessage}`
    };
  }

  /**
   * Dry run 결과 생성
   */
  private createDryRunResult(
    migrationId: string, 
    startTime: Date,
    totalPages: number,
    transformedPages: number,
    errors: MigrationError[]
  ): MigrationResult {
    return {
      success: true,
      migrationId,
      summary: {
        totalPages,
        processedPages: transformedPages,
        successfulPages: 0,
        failedPages: errors.length,
        skippedPages: totalPages - transformedPages
      },
      details: {
        startTime,
        endTime: new Date(),
        duration: new Date().getTime() - startTime.getTime(),
        errors,
        processedPageIds: []
      },
      message: `Dry run completed: ${transformedPages}/${totalPages} pages would be migrated`
    };
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}